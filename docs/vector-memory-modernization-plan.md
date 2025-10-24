# Vector Memory Modernization & Agent/Skill Orchestration Plan

## Goals
- Replace the ad-hoc TF-IDF memory search with a persistent, file-backed hybrid retrieval stack that keeps terminals fast.
- Share a single lightweight index across Claude CLI, Codex CLI, and the workflow engine skills/agents.
- Restore automatic skill/agent selection so requests route to the right execution path.
- Maintain offline usability and avoid long-running daemons unless explicitly enabled.

## Current State (2025-10)
- `VectorMemoryIndex` (src/vector-memory-index.js) builds an in-memory TF-IDF model per process; no disk cache.
- Memory data lives under `~/.workflow-engine/memory/*.json` but every query re-parses and re-indexes.
- Auto-behavior hook loads quickly, yet no skills are triggered automatically; routing relies on keyword heuristics.
- Claude/Codex CLIs read the same shell bootstrap but do not share a richer context service.

## Proposed Architecture
### Retrieval Stack
1. **Embeddings**: Use `bge-small-en-v1.5` (CPU) via a lightweight embedding runner (Python + sentence-transformers or ONNX). Cache vectors as `.npy` + metadata in SQLite.
2. **Index Storage**: LanceDB (preferred) or FAISS index persisted under `~/.workflow-engine/index/<model>/<scope>/`.
3. **Metadata DB**: SQLite file co-located with the index to store chunk metadata (path, hash, chunk id, tags, mtime, model version).
4. **Hybrid Search**: Combine BM25 (via `tantivy`/`meilisearch-lite` or a tiny inverted index) with vector KNN from the Lance index. Apply MMR and optional rerank (bge-reranker base) when latency budget allows.
5. **Lazy Load**: Client exposes fast constructor; loads index files on first query or via short async warm-up.
6. **Change Detection**: File watcher monitors repo + notes directories, enqueues re-embedding jobs (debounced) handled by a worker process.

### Multi-Tool Access
- Provide a small REST/Unix-socket microservice (`memory-indexd`) started on demand (per login) that manages the index lifecycle. CLI clients (Claude shell integration, Codex CLI, Skills) communicate via IPC with JSON RPC.
- If the daemon is not running, clients fall back to direct file access (safe offline mode).
- Optional MCP adapter that wraps `memory-indexd` for wider agent tool usage.

### Agent & Skill Orchestration
1. **Dispatcher Update**: Extend `enhanced-agent-dispatcher.js` to score both agents and skills. Introduce a skill catalog configuration (operation keywords → skill name) fed by `skills/<skill>/SKILL.json`.
2. **Skill Router**: New module `skill-router.js` to evaluate incoming requests, using:
   - Intent classification (keywords, embeddings, repository patterns) -> skill confidence.
   - Fallback to agent selection when skill confidence < threshold or skill not available.
3. **Execution Flow**:
   - Shell request -> `auto-behavior-hook` -> Router decides `skill` vs `agent` vs `hybrid`.
   - For skills, invoke `skill-executor` with structured payload.
   - For hybrid, agent crafts plan, skill executes core steps, agent validates.
4. **Telemetry**: Log dispatch decisions to `agent-learning-system` for future tuning.

## Implementation Phases
### Phase 1 – Foundations (Week 1)
- Add `src/index/config.js` to centralize model selection, cache paths, and thresholds.
- Scaffold embedding service (Python CLI `scripts/embed.py`) with caching logic.
- Implement LanceDB-based `PersistentVectorIndex` (Node wrapper around Python service or direct via wasm).
- Replace TF-IDF usage in `enhanced-memory-manager` with new persistent index (keep TF-IDF fallback behind feature flag).

### Phase 2 – Index Service & Watcher (Week 2)
- Build `memory-indexd` daemon (Node) with:
  - IPC (Unix socket) API: `search`, `upsertChunks`, `refreshRepo`, `status`.
  - Lazy loading of Lance indexes.
- Add file watcher (chokidar) + job queue to detect content changes and trigger `embed.py`.
- Extend installer to optionally launch daemon per login (configurable via `.workflow-engine/config.json`).

### Phase 3 – Agent/Skill Routing (Week 3)
- Create `skill-router.js` using shared heuristics + memory index queries for intent detection.
- Update `auto-behavior-hook.sh` to call router before prompting.
- Update `enhanced-agent-dispatcher.js` to consume router outputs and prefer skills when confidence >= `0.8`.
- Ensure `skill-executor` exposes metadata for availability and operations.

### Phase 4 – Multi-Tool Integration & Docs (Week 4)
- Provide CLI clients (`claude`, `codex`) wrappers to query `memory-indexd`.
- Add MCP adapter (optional) referencing the same IPC endpoints.
- Document configuration, troubleshooting, and performance expectations in `docs/memory-index.md`.
- Add tests (unit + integration) for router decisions and index persistence.

## Deliverables
- New modules: `src/index/persistent-index.js`, `src/index/search-service.js`, `src/skill-router.js`, `scripts/embed.py`, `daemon/memory-indexd.js`.
- Updated shell scripts and installer to manage daemon lifecycle.
- Documentation updates: README quick start, new memory index guide, and agent/skill routing guide.
- Integration tests covering skill dispatch and vector search matching.

## Risks & Mitigations
- **Performance regressions**: keep daemon optional; maintain TF-IDF fallback.
- **Dependency footprint**: package Python + minimal dependencies; vend small models or document download.
- **Shell startup latency**: ensure daemon start is async and non-blocking; only touch index on demand.
- **Cross-tool conflicts**: IPC API versioned; guard with file locks when multiple writers.

## Next Steps
1. Finalize dependency choices (LanceDB vs FAISS, embedding runtime).
2. Prototype `scripts/embed.py` + Lance index writer.
3. Implement `PersistentVectorIndex` and integrate into `enhanced-memory-manager`.
4. Draft router heuristics and wire into the auto behavior system.
5. Review with stakeholders before full rollout.

