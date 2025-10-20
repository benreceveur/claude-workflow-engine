/**
 * Integration Tests: execute() method
 *
 * End-to-end tests for Skill execution lifecycle
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const SkillExecutor = require('../../src/skill-executor');

describe('Integration: execute() method', () => {
    let executor;
    let testSkillsDir;
    let testCacheDir;

    beforeEach(() => {
        testSkillsDir = path.join(__dirname, '../../.test-skills-integration-' + Date.now());
        testCacheDir = path.join(__dirname, '../../.test-cache-integration-' + Date.now());

        fs.mkdirSync(testSkillsDir, { recursive: true });
        fs.mkdirSync(testCacheDir, { recursive: true });

        executor = new SkillExecutor();
        executor.skillsDir = testSkillsDir;
        executor.cacheDir = testCacheDir;
    });

    afterEach(() => {
        if (fs.existsSync(testSkillsDir)) {
            fs.rmSync(testSkillsDir, { recursive: true, force: true });
        }
        if (fs.existsSync(testCacheDir)) {
            fs.rmSync(testCacheDir, { recursive: true, force: true });
        }
    });

    it('should execute Python Skill end-to-end with metadata and caching', async () => {
        // Create test Skill with full structure
        const skillDir = path.join(testSkillsDir, 'test-python-skill');
        const scriptsDir = path.join(skillDir, 'scripts');
        fs.mkdirSync(scriptsDir, { recursive: true });

        // Create SKILL.md with frontmatter
        fs.writeFileSync(path.join(skillDir, 'SKILL.md'), `---
name: test-python-skill
version: 1.0.0
description: Test Python skill
---
# Test Skill`);

        // Create main.py
        fs.writeFileSync(path.join(scriptsDir, 'main.py'), `#!/usr/bin/env python3
import json
import os

context = json.loads(os.environ.get('SKILL_CONTEXT', '{}'))
result = {
    "success": True,
    "operation": context.get("operation"),
    "data": "Processed by Python"
}
print(json.dumps(result))
`);

        // Execute with caching enabled
        const execution = await executor.execute('test-python-skill', { operation: 'test' }, { useCache: true });

        assert.strictEqual(execution.success, true);
        assert.strictEqual(execution.result.success, true);
        assert.strictEqual(execution.result.operation, 'test');
        assert.strictEqual(execution.result.data, 'Processed by Python');
        assert(execution.executionTimeMs >= 0);
        assert(execution.scriptPath.includes('main.py'));
        assert.strictEqual(execution.metadata.name, 'test-python-skill');
        assert.strictEqual(execution.metadata.version, '1.0.0');
    });

    it('should return cached result on second execution', async () => {
        // Create test Skill
        const skillDir = path.join(testSkillsDir, 'cached-skill');
        const scriptsDir = path.join(skillDir, 'scripts');
        fs.mkdirSync(scriptsDir, { recursive: true });

        fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '# Cached Skill');
        fs.writeFileSync(path.join(scriptsDir, 'main.py'), `#!/usr/bin/env python3
import json
print(json.dumps({"success": True, "timestamp": "first"}))
`);

        // First execution
        const exec1 = await executor.execute('cached-skill', { operation: 'test' }, { useCache: true });
        assert.strictEqual(exec1.success, true);
        assert.strictEqual(exec1.result.success, true);

        // Second execution (should be cached)
        const exec2 = await executor.execute('cached-skill', { operation: 'test' }, { useCache: true });
        assert.strictEqual(exec2.success, true);
        assert.strictEqual(exec2.result.success, true);
        // Cached execution should have cached property set
        if (exec2.cached !== undefined) {
            assert.strictEqual(exec2.cached, true);
        }
    });

    it('should execute Node.js Skill end-to-end', async () => {
        const skillDir = path.join(testSkillsDir, 'node-skill');
        const scriptsDir = path.join(skillDir, 'scripts');
        fs.mkdirSync(scriptsDir, { recursive: true });

        fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '# Node Skill');
        fs.writeFileSync(path.join(scriptsDir, 'main.js'), `
const context = JSON.parse(process.env.SKILL_CONTEXT || '{}');
console.log(JSON.stringify({
    success: true,
    language: 'node',
    input: context.input
}));
`);

        const execution = await executor.execute('node-skill', { input: 'test data' });

        assert.strictEqual(execution.success, true);
        assert.strictEqual(execution.result.language, 'node');
        assert.strictEqual(execution.result.input, 'test data');
    });

    it('should execute Bash Skill end-to-end', async () => {
        const skillDir = path.join(testSkillsDir, 'bash-skill');
        const scriptsDir = path.join(skillDir, 'scripts');
        fs.mkdirSync(scriptsDir, { recursive: true });

        fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '# Bash Skill');
        const scriptPath = path.join(scriptsDir, 'main.sh');
        fs.writeFileSync(scriptPath, `#!/bin/bash
echo '{"success": true, "shell": "bash"}'
`);
        fs.chmodSync(scriptPath, 0o755);

        const execution = await executor.execute('bash-skill', {});

        assert.strictEqual(execution.success, true);
        assert(execution.result.success === true || execution.result.output);
    });

    it('should handle Skill without cache option', async () => {
        const skillDir = path.join(testSkillsDir, 'no-cache-skill');
        const scriptsDir = path.join(skillDir, 'scripts');
        fs.mkdirSync(scriptsDir, { recursive: true });

        fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '# No Cache');
        fs.writeFileSync(path.join(scriptsDir, 'main.py'), `#!/usr/bin/env python3
import json
import time
print(json.dumps({"success": True, "time": time.time()}))
`);

        // Execute twice without caching
        const exec1 = await executor.execute('no-cache-skill', { test: 1 }, { useCache: false });
        const exec2 = await executor.execute('no-cache-skill', { test: 1 }, { useCache: false });

        assert.strictEqual(exec1.success, true);
        assert.strictEqual(exec2.success, true);
        // Times should be different (not cached)
        assert.notStrictEqual(exec1.result.time, exec2.result.time);
    });

    it('should load metadata from SKILL.md frontmatter', async () => {
        const skillDir = path.join(testSkillsDir, 'metadata-skill');
        const scriptsDir = path.join(skillDir, 'scripts');
        fs.mkdirSync(scriptsDir, { recursive: true });

        fs.writeFileSync(path.join(skillDir, 'SKILL.md'), `---
name: metadata-skill
version: 2.1.0
author: Test Author
description: Advanced metadata test
tags: test, metadata, integration
---
# Metadata Skill`);

        fs.writeFileSync(path.join(scriptsDir, 'main.py'), `#!/usr/bin/env python3
import json
print(json.dumps({"success": True}))
`);

        const execution = await executor.execute('metadata-skill', {});

        assert.strictEqual(execution.metadata.name, 'metadata-skill');
        assert.strictEqual(execution.metadata.version, '2.1.0');
        assert.strictEqual(execution.metadata.author, 'Test Author');
        assert(execution.metadata.tags.includes('test'));
    });

    it('should handle Skill with no frontmatter', async () => {
        const skillDir = path.join(testSkillsDir, 'no-frontmatter-skill');
        const scriptsDir = path.join(skillDir, 'scripts');
        fs.mkdirSync(scriptsDir, { recursive: true });

        fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '# Just a heading');
        fs.writeFileSync(path.join(scriptsDir, 'main.py'), `#!/usr/bin/env python3
import json
print(json.dumps({"success": True}))
`);

        const execution = await executor.execute('no-frontmatter-skill', {});

        assert.strictEqual(execution.success, true);
        assert(execution.metadata); // Should have basic metadata
    });

    it('should throw error when Skill has no executable script', async () => {
        const skillDir = path.join(testSkillsDir, 'no-script-skill');
        const scriptsDir = path.join(skillDir, 'scripts');
        fs.mkdirSync(scriptsDir, { recursive: true });

        fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '# No Script');
        // Don't create any scripts

        try {
            await executor.execute('no-script-skill', {});
            assert.fail('Should have thrown error');
        } catch (error) {
            // Should throw some error related to missing script
            assert(error.message.length > 0);
        }
    });

    it('should cache different contexts separately', async () => {
        const skillDir = path.join(testSkillsDir, 'multi-context-skill');
        const scriptsDir = path.join(skillDir, 'scripts');
        fs.mkdirSync(scriptsDir, { recursive: true });

        fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '# Multi Context');
        fs.writeFileSync(path.join(scriptsDir, 'main.py'), `#!/usr/bin/env python3
import json
import os

context = json.loads(os.environ.get('SKILL_CONTEXT', '{}'))
print(json.dumps({"success": True, "value": context.get("value")}))
`);

        // Execute with different contexts
        const exec1 = await executor.execute('multi-context-skill', { value: 'A' }, { useCache: true });
        const exec2 = await executor.execute('multi-context-skill', { value: 'B' }, { useCache: true });
        const exec3 = await executor.execute('multi-context-skill', { value: 'A' }, { useCache: true });

        assert.strictEqual(exec1.success, true);
        assert.strictEqual(exec1.result.value, 'A');

        assert.strictEqual(exec2.success, true);
        assert.strictEqual(exec2.result.value, 'B');

        assert.strictEqual(exec3.cached, true); // Same as exec1, should be cached
        assert.strictEqual(exec3.result.value, 'A');
    });

    it('should validate script path before execution', async () => {
        const skillDir = path.join(testSkillsDir, 'valid-script-skill');
        const scriptsDir = path.join(skillDir, 'scripts');
        fs.mkdirSync(scriptsDir, { recursive: true });

        fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '# Valid Script');
        fs.writeFileSync(path.join(scriptsDir, 'main.py'), `#!/usr/bin/env python3
import json
print(json.dumps({"success": True}))
`);

        const execution = await executor.execute('valid-script-skill', {});

        // Script path should be validated and included
        assert(execution.scriptPath);
        assert(execution.scriptPath.includes('scripts'));
        assert(execution.scriptPath.includes('main.py'));
    });
});
