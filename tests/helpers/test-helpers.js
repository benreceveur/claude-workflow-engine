/**
 * Test Helpers
 *
 * Shared utilities for test suites
 */

const path = require('path');
const fs = require('fs');

/**
 * Create temporary test file
 */
function createTempFile(filename, content) {
    const tempDir = path.join('/tmp', 'claude-test-' + Date.now());
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }
    const filepath = path.join(tempDir, filename);
    fs.writeFileSync(filepath, content);
    return filepath;
}

/**
 * Cleanup temporary files
 */
function cleanupTempFiles(dir) {
    if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

/**
 * Mock context object for Skills
 */
function createMockContext(overrides = {}) {
    return {
        operation: 'test',
        timestamp: new Date().toISOString(),
        ...overrides
    };
}

/**
 * Assert that function throws specific error
 */
async function assertThrows(fn, expectedMessage) {
    let thrown = false;
    let error = null;

    try {
        await fn();
    } catch (e) {
        thrown = true;
        error = e;
    }

    if (!thrown) {
        throw new Error(`Expected function to throw, but it didn't`);
    }

    if (expectedMessage && !error.message.includes(expectedMessage)) {
        throw new Error(
            `Expected error message to include "${expectedMessage}", ` +
            `but got "${error.message}"`
        );
    }

    return error;
}

module.exports = {
    createTempFile,
    cleanupTempFiles,
    createMockContext,
    assertThrows
};
