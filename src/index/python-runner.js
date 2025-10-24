const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { PYTHON_EXECUTABLE } = require('./config.js');

const SCRIPT_PATH = path.join(__dirname, '..', '..', 'scripts', 'memory-index.py');

function ensureScriptExists() {
    if (!fs.existsSync(SCRIPT_PATH)) {
        throw new Error(`memory-index script missing at ${SCRIPT_PATH}`);
    }
}

function runPythonCommand(command, payload = {}) {
    ensureScriptExists();

    const input = JSON.stringify(payload);
    const result = spawnSync(PYTHON_EXECUTABLE, [SCRIPT_PATH, command], {
        input,
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
    });

    if (result.error) {
        throw new Error(`Failed to launch Python (${PYTHON_EXECUTABLE}): ${result.error.message}`);
    }

    if (result.status !== 0) {
        const stderr = result.stderr?.trim();
        const stdout = result.stdout?.trim();
        const message = stderr || stdout || `python exited with code ${result.status}`;
        const error = new Error(message);
        error.stderr = stderr;
        error.stdout = stdout;
        error.code = result.status;
        throw error;
    }

    const stdout = result.stdout?.trim();
    if (!stdout) {
        return null;
    }

    try {
        return JSON.parse(stdout);
    } catch (error) {
        const parseError = new Error(`Failed to parse Python output: ${stdout}`);
        parseError.cause = error;
        throw parseError;
    }
}

module.exports = {
    runPythonCommand,
    SCRIPT_PATH,
};
