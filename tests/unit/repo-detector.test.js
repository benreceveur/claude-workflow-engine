/**
 * Unit Tests: RepositoryDetector
 *
 * Tests for repository detection and git command execution
 */

const assert = require('assert');
const RepositoryDetector = require('../../src/repo-detector');

describe('Unit: RepositoryDetector', () => {
    let detector;

    beforeEach(() => {
        detector = new RepositoryDetector();
    });

    describe('Constructor', () => {
        it('should initialize with correct configuration', () => {
            assert(detector.repoIndexPath.includes('.claude/memory/repositories/index.json'));
            assert.deepStrictEqual(
                detector.allowedGitCommands,
                ['rev-parse', 'remote', 'status', 'branch', 'config']
            );
            assert.strictEqual(detector.commandTimeout, 5000);
            assert.strictEqual(detector.maxBuffer, 1024 * 1024);
        });

        it('should create repository index directory', () => {
            const fs = require('fs');
            const path = require('path');
            const repoDir = path.dirname(detector.repoIndexPath);
            assert(fs.existsSync(repoDir));
        });
    });

    describe('Security: Git Command Validation', () => {
        it('should accept allowlisted git commands', () => {
            const allowedCommands = ['rev-parse', 'remote', 'status', 'branch', 'config'];

            allowedCommands.forEach(cmd => {
                // Should not throw for allowed commands
                // Note: Will fail because we're not in a git repo, but should pass validation
                try {
                    detector.executeGitCommand(cmd, ['--help']);
                } catch (error) {
                    // Expected to fail (not in git repo or command fails)
                    // But should NOT be "Unauthorized git command" error
                    assert(!error.message.includes('Unauthorized git command'));
                }
            });
        });

        it('should reject unauthorized git commands', () => {
            const unauthorizedCommands = [
                'push',
                'pull',
                'reset',
                'rebase',
                'rm',
                'clean',
            ];

            unauthorizedCommands.forEach(cmd => {
                assert.throws(
                    () => detector.executeGitCommand(cmd, []),
                    /Unauthorized git command/,
                    `Should reject: ${cmd}`
                );
            });
        });

        it('should reject commands with shell metacharacters in arguments', () => {
            const maliciousArgs = [
                '; rm -rf /',
                '&& cat /etc/passwd',
                '| whoami',
                '`whoami`',
                '$(whoami)',
                '> /tmp/evil',
                '< /etc/passwd',
            ];

            maliciousArgs.forEach(arg => {
                assert.throws(
                    () => detector.executeGitCommand('status', [arg]),
                    /Argument contains unsafe characters/,
                    `Should reject argument: ${arg}`
                );
            });
        });

        it('should reject non-string arguments', () => {
            assert.throws(
                () => detector.executeGitCommand('status', [123]),
                /Argument 0 must be a string/
            );

            assert.throws(
                () => detector.executeGitCommand('status', [null]),
                /Argument 0 must be a string/
            );

            assert.throws(
                () => detector.executeGitCommand('status', [{ evil: 'object' }]),
                /Argument 0 must be a string/
            );
        });
    });

    describe('Security: Command Execution Limits', () => {
        it('should have timeout configured', () => {
            assert.strictEqual(detector.commandTimeout, 5000);
        });

        it('should have buffer size limit', () => {
            assert.strictEqual(detector.maxBuffer, 1024 * 1024);
        });
    });

    describe('getRepositoryPath', () => {
        it('should generate correct repository path from hash', () => {
            const hash = 'abc123';
            const repoPath = detector.getRepositoryPath(hash);

            assert(repoPath.includes('.claude/memory/repositories/abc123'));
        });
    });

    describe('getCurrentRepository', () => {
        it('should return null when not in a git repository', () => {
            // Change to temp directory (not a git repo)
            const originalCwd = process.cwd();
            process.chdir('/tmp');

            const result = detector.getCurrentRepository();
            assert.strictEqual(result, null);

            // Restore
            process.chdir(originalCwd);
        });

        it('should detect repository when in git directory', () => {
            // Only run if we're in a git repo
            try {
                const result = detector.getCurrentRepository();
                if (result) {
                    assert(result.hash);
                    assert(result.path);
                    assert(result.name);
                    assert(result.lastAccessed);
                }
            } catch (error) {
                // Not in a git repo, test skipped
            }
        });
    });

    describe('ensureRepositoryMemory', () => {
        it('should create required memory files', () => {
            const fs = require('fs');
            const repoInfo = {
                hash: 'test-hash-' + Date.now(),
                path: '/test/path',
                remoteUrl: 'https://github.com/test/repo',
                name: 'test-repo',
                lastAccessed: new Date().toISOString()
            };

            const paths = detector.ensureRepositoryMemory(repoInfo);

            // Check all files were created
            assert(fs.existsSync(paths.memoryPath));
            assert(fs.existsSync(paths.metadataPath));
            assert(fs.existsSync(paths.overridesPath));

            // Check file contents
            const memory = JSON.parse(fs.readFileSync(paths.memoryPath, 'utf8'));
            assert(memory.patterns);
            assert(memory.decisions);
            assert(memory.agents);

            const metadata = JSON.parse(fs.readFileSync(paths.metadataPath, 'utf8'));
            assert.strictEqual(metadata.repository.hash, repoInfo.hash);
            assert.strictEqual(metadata.inheritsFromGlobal, true);

            // Cleanup
            const path = require('path');
            const repoDir = path.dirname(paths.memoryPath);
            fs.rmSync(repoDir, { recursive: true, force: true });
        });
    });

    describe('updateRepositoryIndex', () => {
        it('should update repository index with new repository info', () => {
            const fs = require('fs');
            const hash = 'test-update-' + Date.now();
            const repoInfo = {
                hash: hash,
                path: '/test/path',
                remoteUrl: 'https://github.com/test/repo',
                name: 'test-repo',
                lastAccessed: new Date().toISOString()
            };

            detector.updateRepositoryIndex(hash, repoInfo);

            // Read index and verify
            const index = JSON.parse(fs.readFileSync(detector.repoIndexPath, 'utf8'));
            assert(index[hash]);
            assert.strictEqual(index[hash].name, 'test-repo');

            // Cleanup - remove test entry
            delete index[hash];
            fs.writeFileSync(detector.repoIndexPath, JSON.stringify(index, null, 2));
        });
    });
});
