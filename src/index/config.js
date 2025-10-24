const path = require('path');
const os = require('os');
const { resolveBaseDir } = require('../utils/runtime-paths.js');

const DEFAULT_MODEL = process.env.WORKFLOW_ENGINE_EMBED_MODEL || 'BAAI/bge-small-en-v1.5';
const DEFAULT_EMBED_BATCH = Number(process.env.WORKFLOW_ENGINE_EMBED_BATCH || 8);
const BASE_DIR = resolveBaseDir();
const INDEX_ROOT = process.env.WORKFLOW_ENGINE_INDEX_ROOT
    ? path.resolve(process.env.WORKFLOW_ENGINE_INDEX_ROOT)
    : path.join(BASE_DIR, 'index');

const PYTHON_EXECUTABLE = process.env.WORKFLOW_ENGINE_PYTHON || 'python3';

const FEATURE_FLAGS = {
    persistentIndex: process.env.WORKFLOW_ENGINE_PERSISTENT_INDEX !== '0',
    hybridSearch: process.env.WORKFLOW_ENGINE_HYBRID_SEARCH !== '0'
};

const DIRECTORIES = {
    base: BASE_DIR,
    indexRoot: INDEX_ROOT,
    sockets: path.join(os.tmpdir(), 'workflow-engine'),
};

module.exports = {
    DEFAULT_MODEL,
    DEFAULT_EMBED_BATCH,
    PYTHON_EXECUTABLE,
    FEATURE_FLAGS,
    DIRECTORIES,
};
