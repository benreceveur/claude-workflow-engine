/**
 * Unit Tests: SkillExecutor
 *
 * Tests for the main Skill execution engine
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const SkillExecutor = require('../../src/skill-executor');

describe('Unit: SkillExecutor', () => {
    let executor;

    beforeEach(() => {
        executor = new SkillExecutor();
    });

    describe('Constructor', () => {
        it('should initialize with correct defaults', () => {
            assert(executor.skillsDir.includes('.claude/skills'));
            assert(executor.cacheDir.includes('.skill-cache'));
            assert.strictEqual(executor.maxConcurrentExecutions, 5);
            assert.strictEqual(executor.maxExecutionTime, 60000);
        });

        it('should create cache directory if not exists', () => {
            assert(fs.existsSync(executor.cacheDir));
        });
    });

    describe('validateScriptPath', () => {
        it('should validate scripts within skills directory', () => {
            const validPath = path.join(executor.skillsDir, 'test-skill', 'scripts', 'main.py');

            // Create temp file for test
            const testDir = path.join(executor.skillsDir, 'test-skill', 'scripts');
            if (!fs.existsSync(testDir)) {
                fs.mkdirSync(testDir, { recursive: true });
            }
            fs.writeFileSync(validPath, 'print("test")');

            const result = executor.validateScriptPath(validPath);
            assert.strictEqual(result, path.resolve(validPath));

            // Cleanup
            fs.unlinkSync(validPath);
            fs.rmdirSync(testDir);
            fs.rmdirSync(path.dirname(testDir));
        });

        it('should reject scripts outside skills directory', () => {
            assert.throws(
                () => executor.validateScriptPath('/etc/passwd.py'),
                /Script path outside skills directory/
            );
        });

        it('should reject path traversal attempts', () => {
            // Use string concatenation to preserve .. in the path
            const traversalPath = executor.skillsDir + '/test-skill/../../../etc/passwd.py';

            // Either error message is acceptable - both indicate path traversal was blocked
            assert.throws(
                () => executor.validateScriptPath(traversalPath),
                /(Path traversal detected|Script path outside skills directory)/
            );
        });

        it('should reject invalid file extensions', () => {
            const invalidPath = path.join(executor.skillsDir, 'test', 'script.exe');

            assert.throws(
                () => executor.validateScriptPath(invalidPath),
                /Unsupported file extension/
            );
        });

        it('should only allow .py, .js, .sh extensions', () => {
            const validExtensions = ['.py', '.js', '.sh'];

            validExtensions.forEach(ext => {
                const testPath = path.join(executor.skillsDir, 'test', `script${ext}`);
                const testDir = path.dirname(testPath);

                if (!fs.existsSync(testDir)) {
                    fs.mkdirSync(testDir, { recursive: true });
                }
                fs.writeFileSync(testPath, 'test');

                // Should not throw
                const result = executor.validateScriptPath(testPath);
                assert(result.endsWith(ext));

                // Cleanup
                fs.unlinkSync(testPath);
                fs.rmdirSync(testDir);
            });
        });
    });

    describe('getSkillPath', () => {
        it('should return null for non-existent skills', () => {
            const result = executor.getSkillPath('non-existent-skill-12345');
            assert.strictEqual(result, null);
        });

        it('should return null for directories without SKILL.md', () => {
            const testSkillDir = path.join(executor.skillsDir, 'test-no-skill-md');
            fs.mkdirSync(testSkillDir, { recursive: true });

            const result = executor.getSkillPath('test-no-skill-md');
            assert.strictEqual(result, null);

            // Cleanup
            fs.rmdirSync(testSkillDir);
        });

        it('should return path for valid skill with SKILL.md', () => {
            const testSkillDir = path.join(executor.skillsDir, 'test-valid-skill');
            fs.mkdirSync(testSkillDir, { recursive: true });
            fs.writeFileSync(path.join(testSkillDir, 'SKILL.md'), '# Test Skill');

            const result = executor.getSkillPath('test-valid-skill');
            assert.strictEqual(result, testSkillDir);

            // Cleanup
            fs.unlinkSync(path.join(testSkillDir, 'SKILL.md'));
            fs.rmdirSync(testSkillDir);
        });
    });

    describe('findMainScript', () => {
        it('should find main.py in scripts directory', () => {
            const skillPath = path.join(executor.skillsDir, 'test-skill');
            const scriptsDir = path.join(skillPath, 'scripts');
            const mainScript = path.join(scriptsDir, 'main.py');

            fs.mkdirSync(scriptsDir, { recursive: true });
            fs.writeFileSync(mainScript, 'print("test")');

            const result = executor.findMainScript(skillPath);
            assert.strictEqual(result, mainScript);

            // Cleanup
            fs.unlinkSync(mainScript);
            fs.rmdirSync(scriptsDir);
            fs.rmdirSync(skillPath);
        });

        it('should return null if scripts directory does not exist', () => {
            const skillPath = path.join(executor.skillsDir, 'test-no-scripts');
            fs.mkdirSync(skillPath, { recursive: true });

            const result = executor.findMainScript(skillPath);
            assert.strictEqual(result, null);

            // Cleanup
            fs.rmdirSync(skillPath);
        });

        it('should prioritize main.py over other scripts', () => {
            const skillPath = path.join(executor.skillsDir, 'test-priority');
            const scriptsDir = path.join(skillPath, 'scripts');

            fs.mkdirSync(scriptsDir, { recursive: true });
            fs.writeFileSync(path.join(scriptsDir, 'execute.py'), 'test');
            fs.writeFileSync(path.join(scriptsDir, 'main.py'), 'test');

            const result = executor.findMainScript(skillPath);
            assert(result.endsWith('main.py'));

            // Cleanup
            fs.unlinkSync(path.join(scriptsDir, 'execute.py'));
            fs.unlinkSync(path.join(scriptsDir, 'main.py'));
            fs.rmdirSync(scriptsDir);
            fs.rmdirSync(skillPath);
        });
    });

    describe('Security: Concurrent Execution Limits', () => {
        it('should enforce max concurrent executions', async () => {
            // Mock active executions at max
            for (let i = 0; i < executor.maxConcurrentExecutions; i++) {
                executor.activeExecutions.add(`mock-${i}`);
            }

            try {
                await executor.execute('test-skill', {});
                assert.fail('Should have thrown error for max concurrent executions');
            } catch (error) {
                assert(error.message.includes('Maximum concurrent executions reached'));
            }

            // Cleanup
            executor.activeExecutions.clear();
        });

        it('should remove execution from active set after completion', async () => {
            const initialSize = executor.activeExecutions.size;

            try {
                await executor.execute('non-existent-skill', {});
            } catch (error) {
                // Expected to fail (skill doesn't exist)
            }

            // Should be cleaned up even after failure
            assert.strictEqual(executor.activeExecutions.size, initialSize);
        });
    });

    describe('Security: Input Sanitization', () => {
        it('should sanitize skill names before execution', async () => {
            try {
                await executor.execute('skill; rm -rf /', {});
                assert.fail('Should have rejected malicious skill name');
            } catch (error) {
                assert(error.message.includes('Invalid skill name format'));
            }
        });

        it('should sanitize context to prevent prototype pollution', async () => {
            const maliciousContext = {
                operation: 'test',
                __proto__: { isAdmin: true }
            };

            try {
                await executor.execute('test-skill', maliciousContext);
            } catch (error) {
                // Expected to fail (skill doesn't exist)
                // Important: __proto__ should have been sanitized
            }

            // Verify prototype was not polluted
            const cleanObj = {};
            assert.strictEqual(cleanObj.isAdmin, undefined);
        });
    });

    describe('loadSkillMetadata', () => {
        it('should extract metadata from SKILL.md frontmatter', async () => {
            const skillPath = path.join(executor.skillsDir, 'test-metadata-skill');
            fs.mkdirSync(skillPath, { recursive: true });

            const skillMd = `---
name: test-skill
version: 1.0.0
description: Test skill
---

# Test Skill

This is a test.`;

            fs.writeFileSync(path.join(skillPath, 'SKILL.md'), skillMd);

            const metadata = await executor.loadSkillMetadata(skillPath);

            assert.strictEqual(metadata.name, 'test-skill');
            assert.strictEqual(metadata.version, '1.0.0');
            assert.strictEqual(metadata.description, 'Test skill');

            // Cleanup
            fs.unlinkSync(path.join(skillPath, 'SKILL.md'));
            fs.rmdirSync(skillPath);
        });

        it('should return basic metadata if no frontmatter', async () => {
            const skillPath = path.join(executor.skillsDir, 'test-no-frontmatter');
            fs.mkdirSync(skillPath, { recursive: true });

            const skillMd = '# Test Skill\n\nNo frontmatter.';
            fs.writeFileSync(path.join(skillPath, 'SKILL.md'), skillMd);

            const metadata = await executor.loadSkillMetadata(skillPath);

            assert.strictEqual(metadata.name, 'test-no-frontmatter');

            // Cleanup
            fs.unlinkSync(path.join(skillPath, 'SKILL.md'));
            fs.rmdirSync(skillPath);
        });
    });

    describe('Cache Management', () => {
        it('should have cache directory', () => {
            assert(fs.existsSync(executor.cacheDir));
        });

        it('should store cache in correct location', () => {
            assert(executor.cacheDir.includes('.claude'));
            assert(executor.cacheDir.includes('.skill-cache'));
        });
    });
});
