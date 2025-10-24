const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DIRECTORIES, DEFAULT_MODEL, FEATURE_FLAGS } = require('./config.js');
const { runPythonCommand } = require('./python-runner.js');

function ensureDir(target) {
    if (!fs.existsSync(target)) {
        fs.mkdirSync(target, { recursive: true });
    }
}

function sanitizeScope(scope) {
    return scope.replace(/[^a-zA-Z0-9_-]/g, '-');
}

class PersistentVectorIndex {
    constructor(options = {}) {
        this.enabled = FEATURE_FLAGS.persistentIndex;
        this.model = options.model || DEFAULT_MODEL;
        this.scope = sanitizeScope(options.scope || 'global');
        this.indexPath = path.join(DIRECTORIES.indexRoot, this.model.replace(/[\/]/g, '_'), this.scope);
        this.available = false;
        this.lastError = null;

        if (this.enabled) {
            try {
                ensureDir(this.indexPath);
                const response = runPythonCommand('status', {
                    indexPath: this.indexPath,
                    model: this.model,
                });
                this.available = response?.status === 'ok';
            } catch (error) {
                this.available = false;
                this.lastError = error;
            }
        }
    }

    isAvailable() {
        return this.enabled && this.available;
    }

    recordFailure(error) {
        this.available = false;
        this.lastError = error;
    }

    upsertDocuments(documents = []) {
        if (!this.isAvailable()) {
            return false;
        }

        if (!Array.isArray(documents) || documents.length === 0) {
            return true;
        }

        const payload = {
            indexPath: this.indexPath,
            model: this.model,
            documents: documents.map(doc => ({
                id: doc.id,
                text: doc.text,
                metadata: doc.metadata || {},
                hash: doc.hash || hashDocument(doc.text, this.model),
            })),
        };

        try {
            const result = runPythonCommand('upsert', payload);
            this.available = result?.status === 'ok';
            return this.available;
        } catch (error) {
            this.recordFailure(error);
            return false;
        }
    }

    search(query, options = {}) {
        if (!this.isAvailable()) {
            return [];
        }

        const payload = {
            indexPath: this.indexPath,
            model: this.model,
            query,
            limit: options.limit || 8,
            minScore: options.minScore || 0,
        };

        try {
            const result = runPythonCommand('search', payload);
            if (result?.status !== 'ok' || !Array.isArray(result.results)) {
                return [];
            }
            return result.results;
        } catch (error) {
            this.recordFailure(error);
            return [];
        }
    }

    getStats() {
        if (!this.isAvailable()) {
            return { status: 'disabled', error: this.lastError?.message };
        }

        try {
            const response = runPythonCommand('stats', {
                indexPath: this.indexPath,
                model: this.model,
            });
            return response;
        } catch (error) {
            this.recordFailure(error);
            return { status: 'error', error: error.message };
        }
    }
}

function hashDocument(text, model) {
    const hash = crypto.createHash('sha1');
    hash.update(model);
    hash.update('|');
    hash.update(text || '');
    return hash.digest('hex');
}

module.exports = {
    PersistentVectorIndex,
    hashDocument,
};
