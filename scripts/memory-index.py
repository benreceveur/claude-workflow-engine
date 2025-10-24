#!/usr/bin/env python3

"""
Persistent memory index utility.
Commands are provided via argv[1] and payload as JSON on stdin.
Outputs JSON responses for Node clients.
"""

import json
import os
import sqlite3
import sys
import time
import hashlib
from contextlib import closing

try:
    import numpy as np
except ImportError as exc:  # pragma: no cover - dependency hint
    print(json.dumps({
        "status": "error",
        "error": "numpy is required: pip install numpy",
    }))
    sys.exit(1)

try:  # pragma: no cover - optional heavy dependency
    from sentence_transformers import SentenceTransformer
except ImportError:
    SentenceTransformer = None

MODEL_CACHE = {}


def load_payload():
    raw = sys.stdin.read() or '{}'
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise SystemExit(json.dumps({
            "status": "error",
            "error": f"Invalid JSON payload: {exc}",
        }))


def ensure_dir(path: str):
    if not os.path.exists(path):
        os.makedirs(path, exist_ok=True)


def get_db_path(index_path: str) -> str:
    ensure_dir(index_path)
    return os.path.join(index_path, 'index.sqlite3')


def with_connection(db_path: str):
    conn = sqlite3.connect(db_path)
    conn.execute('PRAGMA journal_mode=WAL;')
    conn.execute('PRAGMA synchronous=NORMAL;')
    conn.execute('PRAGMA temp_store=MEMORY;')
    return conn


def ensure_schema(conn: sqlite3.Connection):
    conn.execute(
        '''CREATE TABLE IF NOT EXISTS documents (
               id TEXT PRIMARY KEY,
               content_hash TEXT NOT NULL,
               metadata TEXT,
               vector BLOB NOT NULL,
               updated_at REAL NOT NULL
           )'''
    )
    conn.execute(
        '''CREATE TABLE IF NOT EXISTS meta (
               key TEXT PRIMARY KEY,
               value TEXT NOT NULL
           )'''
    )
    conn.commit()


def get_model(model_name: str):
    if SentenceTransformer is None:
        raise RuntimeError(
            'sentence-transformers missing. Install with: pip install "sentence-transformers<3"'
        )
    if model_name not in MODEL_CACHE:
        MODEL_CACHE[model_name] = SentenceTransformer(model_name)
    return MODEL_CACHE[model_name]


def serialize_vector(vector) -> bytes:
    array = np.asarray(vector, dtype=np.float32)
    return array.tobytes()


def deserialize_vector(blob: bytes):
    return np.frombuffer(blob, dtype=np.float32)


def ensure_model_meta(conn: sqlite3.Connection, model: str, dimension: int):
    cur = conn.execute('SELECT value FROM meta WHERE key = ?', ('model',))
    row = cur.fetchone()
    if row is None:
        conn.execute('INSERT OR REPLACE INTO meta(key, value) VALUES (?, ?)', ('model', model))
        conn.execute('INSERT OR REPLACE INTO meta(key, value) VALUES (?, ?)', ('dimension', str(dimension)))
        conn.commit()
        return

    existing_model = row[0]
    if existing_model != model:
        # Reset index for new model
        conn.execute('DELETE FROM documents')
        conn.execute('INSERT OR REPLACE INTO meta(key, value) VALUES (?, ?)', ('model', model))
        conn.execute('INSERT OR REPLACE INTO meta(key, value) VALUES (?, ?)', ('dimension', str(dimension)))
        conn.commit()
        return

    conn.execute('INSERT OR REPLACE INTO meta(key, value) VALUES (?, ?)', ('dimension', str(dimension)))
    conn.commit()


def command_status(payload):
    index_path = payload.get('indexPath')
    model = payload.get('model')
    if not index_path or not model:
        return {"status": "error", "error": "indexPath and model required"}

    db_path = get_db_path(index_path)
    ensure_dir(index_path)

    try:
        with closing(with_connection(db_path)) as conn:
            ensure_schema(conn)
    except Exception as exc:  # pragma: no cover - IO errors
        return {"status": "error", "error": str(exc)}

    return {"status": "ok", "indexPath": index_path, "model": model}


def compute_hash(text: str, model: str) -> str:
    sha = hashlib.sha1()
    sha.update(model.encode('utf-8'))
    sha.update(b'|')
    sha.update((text or '').encode('utf-8'))
    return sha.hexdigest()


def command_upsert(payload):
    index_path = payload.get('indexPath')
    model_name = payload.get('model')
    documents = payload.get('documents', [])
    if not index_path or not model_name:
        return {"status": "error", "error": "indexPath and model required"}

    if not documents:
        return {"status": "ok", "updated": 0}

    model = get_model(model_name)
    db_path = get_db_path(index_path)

    with closing(with_connection(db_path)) as conn:
        ensure_schema(conn)

        existing = {}
        cursor = conn.execute('SELECT id, content_hash FROM documents WHERE id IN (%s)' %
                              ','.join('?' for _ in documents), [doc['id'] for doc in documents])
        for row in cursor.fetchall():
            existing[row[0]] = row[1]

        to_embed = []
        for doc in documents:
            content_hash = doc.get('hash') or compute_hash(doc.get('text', ''), model_name)
            if existing.get(doc['id']) == content_hash:
                continue
            to_embed.append((doc['id'], doc.get('text', ''), content_hash, doc.get('metadata', {})))

        if not to_embed:
            return {"status": "ok", "updated": 0}

        texts = [item[1] for item in to_embed]
        embeddings = model.encode(texts, batch_size=payload.get('batchSize', 8), normalize_embeddings=True)

        dimension = len(embeddings[0]) if embeddings else 0
        ensure_model_meta(conn, model_name, dimension)

        now = time.time()
        for (doc_id, _, content_hash, metadata), embedding in zip(to_embed, embeddings):
            vector_blob = serialize_vector(embedding)
            conn.execute(
                'INSERT OR REPLACE INTO documents(id, content_hash, metadata, vector, updated_at) VALUES (?, ?, ?, ?, ?)',
                (doc_id, content_hash, json.dumps(metadata), vector_blob, now)
            )

        conn.commit()

        return {"status": "ok", "updated": len(to_embed)}


def command_search(payload):
    index_path = payload.get('indexPath')
    model_name = payload.get('model')
    query = payload.get('query')
    limit = int(payload.get('limit') or 8)
    min_score = float(payload.get('minScore') or 0)

    if not index_path or not model_name or not query:
        return {"status": "error", "error": "indexPath, model, and query required"}

    model = get_model(model_name)
    db_path = get_db_path(index_path)

    with closing(with_connection(db_path)) as conn:
        ensure_schema(conn)
        cursor = conn.execute('SELECT id, metadata, vector FROM documents')
        rows = cursor.fetchall()
        if not rows:
            return {"status": "ok", "results": []}

    query_vector = model.encode([query], normalize_embeddings=True)[0]
    query_vec = np.asarray(query_vector, dtype=np.float32)

    results = []
    for doc_id, metadata_json, vector_blob in rows:
        vector = deserialize_vector(vector_blob)
        score = float(np.dot(query_vec, vector))
        if score < min_score:
            continue
        try:
            metadata = json.loads(metadata_json) if metadata_json else {}
        except json.JSONDecodeError:
            metadata = {"raw": metadata_json}
        results.append({
            "id": doc_id,
            "score": score,
            "metadata": metadata,
        })

    results.sort(key=lambda item: item['score'], reverse=True)
    return {"status": "ok", "results": results[:limit]}


def command_stats(payload):
    index_path = payload.get('indexPath')
    model_name = payload.get('model')
    if not index_path or not model_name:
        return {"status": "error", "error": "indexPath and model required"}

    db_path = get_db_path(index_path)
    with closing(with_connection(db_path)) as conn:
        ensure_schema(conn)
        cur = conn.execute('SELECT COUNT(*), MAX(updated_at) FROM documents')
        count, updated_at = cur.fetchone()
        meta = dict(conn.execute('SELECT key, value FROM meta'))

    return {
        "status": "ok",
        "documents": int(count),
        "last_updated": updated_at,
        "model": meta.get('model'),
        "dimension": meta.get('dimension'),
        "indexPath": index_path,
    }


COMMANDS = {
    'status': command_status,
    'upsert': command_upsert,
    'search': command_search,
    'stats': command_stats,
}


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"status": "error", "error": "command required"}))
        return

    command = sys.argv[1]
    handler = COMMANDS.get(command)
    if handler is None:
        print(json.dumps({"status": "error", "error": f"unknown command: {command}"}))
        return

    payload = load_payload()
    try:
        result = handler(payload)
    except RuntimeError as exc:
        print(json.dumps({"status": "error", "error": str(exc)}))
        return
    except Exception as exc:  # pragma: no cover - general guard
        print(json.dumps({"status": "error", "error": str(exc)}))
        return

    print(json.dumps(result))


if __name__ == '__main__':
    main()
