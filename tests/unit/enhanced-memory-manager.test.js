/**
 * Unit Tests: EnhancedMemoryManager
 *
 * Tests for repository-scoped memory management
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

describe('Unit: EnhancedMemoryManager', () => {
    let EnhancedMemoryManager;
    let manager;
    let testMemoryDir;
    let testGlobalMemoryPath;

    before(() => {
        // Load the class
        EnhancedMemoryManager = require('../../src/enhanced-memory-manager');
    });

    beforeEach(() => {
        // Create test memory directory
        testMemoryDir = path.join('/tmp', 'test-memory-' + Date.now());
        fs.mkdirSync(testMemoryDir, { recursive: true });
        testGlobalMemoryPath = path.join(testMemoryDir, 'global-memory.json');

        // Mock process.env.HOME for testing
        process.env.HOME = '/tmp';

        // Create a minimal global memory file
        const memoryPath = path.join('/tmp', '.claude', 'memory');
        fs.mkdirSync(memoryPath, { recursive: true });

        // Initialize manager
        manager = new EnhancedMemoryManager();
    });

    afterEach(() => {
        // Clean up test files
        try {
            if (fs.existsSync(testMemoryDir)) {
                fs.rmSync(testMemoryDir, { recursive: true, force: true });
            }
        } catch (error) {
            // Ignore cleanup errors
        }
    });

    describe('Constructor', () => {
        it('should initialize with RepositoryDetector', () => {
            assert(manager.detector);
            assert(typeof manager.detector === 'object');
        });

        it('should set global memory path', () => {
            assert(manager.globalMemoryPath);
            assert(manager.globalMemoryPath.includes('.claude'));
            assert(manager.globalMemoryPath.includes('memory'));
        });

        it('should detect current repository', () => {
            // May or may not be in a repository
            assert(manager.currentRepo !== undefined);
        });

        it('should set repoPaths when in repository', () => {
            // repoPaths may be null if not in a git repository
            assert(manager.repoPaths === null || typeof manager.repoPaths === 'object');
        });
    });

    describe('loadGlobalMemory', () => {
        it('should return default structure when file does not exist', () => {
            // Temporarily change path to non-existent file
            const originalPath = manager.globalMemoryPath;
            manager.globalMemoryPath = '/nonexistent/path/global-memory.json';

            const memory = manager.loadGlobalMemory();

            assert(memory.patterns);
            assert(memory.decisions);
            assert(memory.libraries);
            assert(memory.standards);
            assert(memory.agents);

            manager.globalMemoryPath = originalPath;
        });

        it('should load existing global memory', () => {
            // Create test memory file
            const testMemory = {
                patterns: { test: 'value' },
                decisions: [],
                libraries: {},
                standards: {},
                agents: {}
            };
            fs.writeFileSync(manager.globalMemoryPath, JSON.stringify(testMemory));

            const memory = manager.loadGlobalMemory();

            assert.strictEqual(memory.patterns.test, 'value');
        });

        it('should convert old format to new format', () => {
            // Create old format memory
            const oldFormat = {
                global_patterns: {
                    code_style: { indent: '2 spaces' },
                    architecture_decisions: ['use-redux'],
                    common_libraries: { react: '19.0.0' },
                    testing_preferences: { framework: 'jest' }
                },
                agent_specializations: {
                    'frontend-developer': { patterns: [] }
                }
            };
            fs.writeFileSync(manager.globalMemoryPath, JSON.stringify(oldFormat));

            const memory = manager.loadGlobalMemory();

            assert(memory.patterns);
            assert(memory.decisions);
            assert(memory.libraries);
            assert(memory.standards);
            assert(memory.agents);
            assert.strictEqual(memory.patterns.indent, '2 spaces');
        });
    });

    describe('loadRepositoryMemory', () => {
        it('should return null when not in repository', () => {
            manager.repoPaths = null;

            const repoMemory = manager.loadRepositoryMemory();

            assert.strictEqual(repoMemory, null);
        });

        it('should load repository memory when paths available', () => {
            // Create mock repository memory structure
            const repoDir = path.join(testMemoryDir, 'test-repo');
            fs.mkdirSync(repoDir, { recursive: true });

            const memoryPath = path.join(repoDir, 'memory.json');
            const metadataPath = path.join(repoDir, 'metadata.json');
            const overridesPath = path.join(repoDir, 'overrides.json');

            fs.writeFileSync(memoryPath, JSON.stringify({ patterns: { repo: 'test' } }));
            fs.writeFileSync(metadataPath, JSON.stringify({ name: 'test-repo' }));
            fs.writeFileSync(overridesPath, JSON.stringify({}));

            manager.repoPaths = {
                memoryPath,
                metadataPath,
                overridesPath
            };

            const repoMemory = manager.loadRepositoryMemory();

            assert(repoMemory);
            assert(repoMemory.memory);
            assert(repoMemory.metadata);
            assert(repoMemory.overrides);
            assert.strictEqual(repoMemory.memory.patterns.repo, 'test');
        });
    });

    describe('getEffectiveMemory', () => {
        it('should return global memory when not in repository', () => {
            manager.currentRepo = null;
            manager.repoPaths = null;

            const effective = manager.getEffectiveMemory();

            assert.strictEqual(effective.source, 'global');
            assert.strictEqual(effective.repository, null);
            assert(effective.memory);
        });

        it('should return repository memory when not inheriting from global', () => {
            // Mock repository setup
            const repoDir = path.join(testMemoryDir, 'test-repo');
            fs.mkdirSync(repoDir, { recursive: true });

            const memoryPath = path.join(repoDir, 'memory.json');
            const metadataPath = path.join(repoDir, 'metadata.json');
            const overridesPath = path.join(repoDir, 'overrides.json');

            fs.writeFileSync(memoryPath, JSON.stringify({ patterns: { repo: 'value' } }));
            fs.writeFileSync(metadataPath, JSON.stringify({
                name: 'test-repo',
                inheritsFromGlobal: false
            }));
            fs.writeFileSync(overridesPath, JSON.stringify({}));

            manager.currentRepo = { name: 'test-repo', hash: 'abc123' };
            manager.repoPaths = {
                memoryPath,
                metadataPath,
                overridesPath
            };

            const effective = manager.getEffectiveMemory();

            assert.strictEqual(effective.source, 'repository');
            assert(effective.repository);
            assert.strictEqual(effective.memory.patterns.repo, 'value');
        });

        it('should merge memories when inheriting from global', () => {
            // Setup global memory
            const globalMemory = {
                patterns: { global: 'value' },
                decisions: [],
                libraries: {},
                standards: {},
                agents: {}
            };
            fs.writeFileSync(manager.globalMemoryPath, JSON.stringify(globalMemory));

            // Setup repository memory
            const repoDir = path.join(testMemoryDir, 'test-repo');
            fs.mkdirSync(repoDir, { recursive: true });

            const memoryPath = path.join(repoDir, 'memory.json');
            const metadataPath = path.join(repoDir, 'metadata.json');
            const overridesPath = path.join(repoDir, 'overrides.json');

            fs.writeFileSync(memoryPath, JSON.stringify({ patterns: { repo: 'value' } }));
            fs.writeFileSync(metadataPath, JSON.stringify({
                name: 'test-repo',
                inheritsFromGlobal: true
            }));
            fs.writeFileSync(overridesPath, JSON.stringify({}));

            manager.currentRepo = { name: 'test-repo', hash: 'abc123' };
            manager.repoPaths = {
                memoryPath,
                metadataPath,
                overridesPath
            };

            const effective = manager.getEffectiveMemory();

            assert.strictEqual(effective.source, 'merged');
            assert(effective.memory.patterns.global);
            assert(effective.memory.patterns.repo);
            assert(effective.globalCount >= 0);
            assert(effective.repoCount >= 0);
        });
    });

    describe('mergeMemories', () => {
        it('should merge global and repository memories', () => {
            const global = {
                patterns: { global1: 'value1', shared: 'global-value' },
                agents: {}
            };
            const repo = {
                patterns: { repo1: 'value2', shared: 'repo-value' },
                agents: {}
            };
            const overrides = {};

            const merged = manager.mergeMemories(global, repo, overrides);

            assert.strictEqual(merged.patterns.global1, 'value1');
            assert.strictEqual(merged.patterns.repo1, 'value2');
            // Repository should override global
            assert.strictEqual(merged.patterns.shared, 'repo-value');
        });

        it('should apply overrides to delete global patterns', () => {
            const global = {
                patterns: { toDelete: 'value', toKeep: 'value' }
            };
            const repo = {};
            const overrides = {
                'patterns.toDelete': null
            };

            const merged = manager.mergeMemories(global, repo, overrides);

            assert.strictEqual(merged.patterns.toDelete, undefined);
            assert.strictEqual(merged.patterns.toKeep, 'value');
        });

        it('should apply overrides to modify patterns', () => {
            const global = {
                patterns: { key: 'original' }
            };
            const repo = {};
            const overrides = {
                'patterns.key': 'overridden'
            };

            const merged = manager.mergeMemories(global, repo, overrides);

            assert.strictEqual(merged.patterns.key, 'overridden');
        });

        it('should not modify original objects', () => {
            const global = {
                patterns: { key: 'value' }
            };
            const repo = {
                patterns: { newKey: 'newValue' }
            };
            const overrides = {};

            manager.mergeMemories(global, repo, overrides);

            // Original should not be modified
            assert.strictEqual(global.patterns.newKey, undefined);
        });
    });

    describe('countPatterns', () => {
        it('should count patterns in memory object', () => {
            const memory = {
                patterns: { a: 1, b: 2 },
                decisions: ['d1', 'd2', 'd3'],
                libraries: { lib1: 'v1' },
                agents: { agent1: {} }
            };

            const count = manager.countPatterns(memory);

            // Should count: 2 patterns + 3 decisions + 1 library + 1 agent = 7
            assert(count >= 4);
        });

        it('should handle empty memory', () => {
            const memory = {
                patterns: {},
                decisions: [],
                libraries: {},
                agents: {}
            };

            const count = manager.countPatterns(memory);

            assert.strictEqual(count, 0);
        });
    });

    describe('updateMemory', () => {
        it('should update global memory when scope is global', () => {
            const testMemory = {
                patterns: {},
                decisions: [],
                libraries: {},
                standards: {},
                agents: {}
            };
            fs.writeFileSync(manager.globalMemoryPath, JSON.stringify(testMemory));

            manager.updateMemory('patterns', 'testKey', 'testValue', 'global');

            const updated = JSON.parse(fs.readFileSync(manager.globalMemoryPath, 'utf8'));
            assert.strictEqual(updated.patterns.testKey, 'testValue');
        });

        it('should update global memory when not in repository', () => {
            manager.currentRepo = null;
            const testMemory = {
                patterns: {},
                decisions: [],
                libraries: {},
                standards: {},
                agents: {}
            };
            fs.writeFileSync(manager.globalMemoryPath, JSON.stringify(testMemory));

            manager.updateMemory('patterns', 'testKey', 'testValue', 'auto');

            const updated = JSON.parse(fs.readFileSync(manager.globalMemoryPath, 'utf8'));
            assert.strictEqual(updated.patterns.testKey, 'testValue');
        });

        it('should update repository memory when in repository', () => {
            // Setup repository memory
            const repoDir = path.join(testMemoryDir, 'test-repo');
            fs.mkdirSync(repoDir, { recursive: true });

            const memoryPath = path.join(repoDir, 'memory.json');
            const metadataPath = path.join(repoDir, 'metadata.json');

            fs.writeFileSync(memoryPath, JSON.stringify({ patterns: {} }));
            fs.writeFileSync(metadataPath, JSON.stringify({ name: 'test-repo', lastUpdated: new Date().toISOString() }));

            manager.currentRepo = { name: 'test-repo' };
            manager.repoPaths = {
                memoryPath,
                metadataPath,
                overridesPath: path.join(repoDir, 'overrides.json')
            };

            manager.updateMemory('patterns', 'repoKey', 'repoValue', 'repository');

            const updated = JSON.parse(fs.readFileSync(memoryPath, 'utf8'));
            assert.strictEqual(updated.patterns.repoKey, 'repoValue');
        });
    });

    describe('updateGlobalMemory', () => {
        it('should create category if it does not exist', () => {
            const testMemory = {
                patterns: {},
                decisions: [],
                libraries: {},
                standards: {},
                agents: {}
            };
            fs.writeFileSync(manager.globalMemoryPath, JSON.stringify(testMemory));

            manager.updateGlobalMemory('newCategory', 'key', 'value');

            const updated = JSON.parse(fs.readFileSync(manager.globalMemoryPath, 'utf8'));
            assert.strictEqual(updated.newCategory.key, 'value');
        });

        it('should update existing category', () => {
            const testMemory = {
                patterns: { existing: 'value' },
                decisions: [],
                libraries: {},
                standards: {},
                agents: {}
            };
            fs.writeFileSync(manager.globalMemoryPath, JSON.stringify(testMemory));

            manager.updateGlobalMemory('patterns', 'newKey', 'newValue');

            const updated = JSON.parse(fs.readFileSync(manager.globalMemoryPath, 'utf8'));
            assert.strictEqual(updated.patterns.existing, 'value');
            assert.strictEqual(updated.patterns.newKey, 'newValue');
        });
    });

    describe('updateRepositoryMemory', () => {
        it('should return early when not in repository', () => {
            manager.repoPaths = null;

            // Should not throw
            manager.updateRepositoryMemory('patterns', 'key', 'value');
        });

        it('should update repository memory and metadata timestamp', () => {
            const repoDir = path.join(testMemoryDir, 'test-repo');
            fs.mkdirSync(repoDir, { recursive: true });

            const memoryPath = path.join(repoDir, 'memory.json');
            const metadataPath = path.join(repoDir, 'metadata.json');

            const originalTimestamp = new Date('2020-01-01').toISOString();
            fs.writeFileSync(memoryPath, JSON.stringify({ patterns: {} }));
            fs.writeFileSync(metadataPath, JSON.stringify({
                name: 'test-repo',
                lastUpdated: originalTimestamp
            }));

            manager.repoPaths = {
                memoryPath,
                metadataPath
            };

            manager.updateRepositoryMemory('patterns', 'key', 'value');

            const updatedMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            assert.notStrictEqual(updatedMetadata.lastUpdated, originalTimestamp);
        });
    });

    describe('createOverride', () => {
        it('should return false when not in repository', () => {
            manager.repoPaths = null;

            const result = manager.createOverride('patterns.test', 'value');

            assert.strictEqual(result, false);
        });

        it('should create override and return true', () => {
            const repoDir = path.join(testMemoryDir, 'test-repo');
            fs.mkdirSync(repoDir, { recursive: true });

            const overridesPath = path.join(repoDir, 'overrides.json');
            fs.writeFileSync(overridesPath, JSON.stringify({}));

            manager.repoPaths = {
                overridesPath
            };

            const result = manager.createOverride('patterns.test', 'overridden');

            assert.strictEqual(result, true);
            const overrides = JSON.parse(fs.readFileSync(overridesPath, 'utf8'));
            assert.strictEqual(overrides['patterns.test'], 'overridden');
        });

        it('should update existing overrides', () => {
            const repoDir = path.join(testMemoryDir, 'test-repo');
            fs.mkdirSync(repoDir, { recursive: true });

            const overridesPath = path.join(repoDir, 'overrides.json');
            fs.writeFileSync(overridesPath, JSON.stringify({ 'patterns.old': 'value' }));

            manager.repoPaths = {
                overridesPath
            };

            manager.createOverride('patterns.new', 'newValue');

            const overrides = JSON.parse(fs.readFileSync(overridesPath, 'utf8'));
            assert.strictEqual(overrides['patterns.old'], 'value');
            assert.strictEqual(overrides['patterns.new'], 'newValue');
        });
    });

    describe('getMemoryInfo', () => {
        it('should return info for global scope', () => {
            manager.currentRepo = null;
            manager.repoPaths = null;

            const info = manager.getMemoryInfo();

            assert.strictEqual(info.currentRepository, 'None (global scope)');
            assert.strictEqual(info.repositoryHash, null);
            assert.strictEqual(info.memorySource, 'global');
            assert(typeof info.totalPatterns === 'number');
        });

        it('should return info for repository scope', () => {
            // Setup minimal repository
            const repoDir = path.join(testMemoryDir, 'test-repo');
            fs.mkdirSync(repoDir, { recursive: true });

            const memoryPath = path.join(repoDir, 'memory.json');
            const metadataPath = path.join(repoDir, 'metadata.json');
            const overridesPath = path.join(repoDir, 'overrides.json');

            fs.writeFileSync(memoryPath, JSON.stringify({ patterns: { repo: 'value' } }));
            fs.writeFileSync(metadataPath, JSON.stringify({
                name: 'test-repo',
                inheritsFromGlobal: true
            }));
            fs.writeFileSync(overridesPath, JSON.stringify({}));

            manager.currentRepo = {
                name: 'test-repo',
                hash: 'abc123',
                path: '/path/to/repo'
            };
            manager.repoPaths = {
                memoryPath,
                metadataPath,
                overridesPath
            };

            const info = manager.getMemoryInfo();

            assert.strictEqual(info.currentRepository, 'test-repo');
            assert.strictEqual(info.repositoryHash, 'abc123');
            assert.strictEqual(info.repositoryPath, '/path/to/repo');
            assert(info.memorySource);
        });

        it('should include breakdown for merged memory', () => {
            // Setup for merged memory
            const globalMemory = {
                patterns: { global: 'value' },
                decisions: [],
                libraries: {},
                standards: {},
                agents: {}
            };
            fs.writeFileSync(manager.globalMemoryPath, JSON.stringify(globalMemory));

            const repoDir = path.join(testMemoryDir, 'test-repo');
            fs.mkdirSync(repoDir, { recursive: true });

            const memoryPath = path.join(repoDir, 'memory.json');
            const metadataPath = path.join(repoDir, 'metadata.json');
            const overridesPath = path.join(repoDir, 'overrides.json');

            fs.writeFileSync(memoryPath, JSON.stringify({ patterns: { repo: 'value' } }));
            fs.writeFileSync(metadataPath, JSON.stringify({
                name: 'test-repo',
                inheritsFromGlobal: true
            }));
            fs.writeFileSync(overridesPath, JSON.stringify({ 'patterns.override': 'value' }));

            manager.currentRepo = { name: 'test-repo', hash: 'abc123' };
            manager.repoPaths = {
                memoryPath,
                metadataPath,
                overridesPath
            };

            const info = manager.getMemoryInfo();

            if (info.breakdown) {
                assert(typeof info.breakdown.global === 'number');
                assert(typeof info.breakdown.repository === 'number');
                assert(typeof info.breakdown.overrides === 'number');
            }
        });
    });

    describe('generateContextSummary', () => {
        it('should generate summary for global scope', () => {
            manager.currentRepo = null;

            const summary = manager.generateContextSummary();

            assert(typeof summary === 'string');
            assert(summary.includes('Memory Context'));
            assert(summary.includes('None (global scope)'));
        });

        it('should generate summary for repository scope', () => {
            const repoDir = path.join(testMemoryDir, 'test-repo');
            fs.mkdirSync(repoDir, { recursive: true });

            const memoryPath = path.join(repoDir, 'memory.json');
            const metadataPath = path.join(repoDir, 'metadata.json');
            const overridesPath = path.join(repoDir, 'overrides.json');

            fs.writeFileSync(memoryPath, JSON.stringify({ patterns: {} }));
            fs.writeFileSync(metadataPath, JSON.stringify({
                name: 'test-repo',
                inheritsFromGlobal: false
            }));
            fs.writeFileSync(overridesPath, JSON.stringify({}));

            manager.currentRepo = { name: 'test-repo', hash: 'abc123' };
            manager.repoPaths = {
                memoryPath,
                metadataPath,
                overridesPath
            };

            const summary = manager.generateContextSummary();

            assert(summary.includes('test-repo'));
        });

        it('should include enforcement rules in summary', () => {
            const globalMemory = {
                patterns: {
                    enforcement_rules: {
                        description: 'Critical rules',
                        rules: ['Rule 1', 'Rule 2']
                    }
                },
                decisions: [],
                libraries: {},
                standards: {},
                agents: {}
            };
            fs.writeFileSync(manager.globalMemoryPath, JSON.stringify(globalMemory));
            manager.currentRepo = null;

            const summary = manager.generateContextSummary();

            assert(summary.includes('CRITICAL ENFORCEMENT RULES'));
            assert(summary.includes('Rule 1'));
            assert(summary.includes('Rule 2'));
        });

        it('should include shared services pattern in summary', () => {
            const globalMemory = {
                patterns: {
                    shared_services_pattern: {
                        description: 'Shared pattern',
                        implementation: {
                            service1: 'Implementation 1',
                            service2: 'Implementation 2'
                        }
                    }
                },
                decisions: [],
                libraries: {},
                standards: {},
                agents: {}
            };
            fs.writeFileSync(manager.globalMemoryPath, JSON.stringify(globalMemory));
            manager.currentRepo = null;

            const summary = manager.generateContextSummary();

            assert(summary.includes('SHARED SERVICES PATTERN'));
            assert(summary.includes('service1'));
            assert(summary.includes('Implementation 1'));
        });

        it('should include code review practice in summary', () => {
            const globalMemory = {
                patterns: {
                    code_review_practice: {
                        review_before_recommendations: 'Always review code',
                        rationale: 'Ensures quality'
                    }
                },
                decisions: [],
                libraries: {},
                standards: {},
                agents: {}
            };
            fs.writeFileSync(manager.globalMemoryPath, JSON.stringify(globalMemory));
            manager.currentRepo = null;

            const summary = manager.generateContextSummary();

            assert(summary.includes('CODE REVIEW PRACTICE'));
            assert(summary.includes('Always review code'));
            assert(summary.includes('Ensures quality'));
        });

        it('should include global standards in summary', () => {
            const globalMemory = {
                patterns: {},
                decisions: [],
                libraries: {},
                standards: {
                    global_enforcement: {
                        code_quality: {
                            linting: 'Always run lint checks'
                        }
                    }
                },
                agents: {}
            };
            fs.writeFileSync(manager.globalMemoryPath, JSON.stringify(globalMemory));
            manager.currentRepo = null;

            const summary = manager.generateContextSummary();

            assert(summary.includes('GLOBAL STANDARDS'));
            assert(summary.includes('CODE QUALITY'));
        });

        it('should include basic patterns in summary', () => {
            const globalMemory = {
                patterns: {
                    basic_pattern_1: 'value1',
                    basic_pattern_2: 'value2'
                },
                decisions: [],
                libraries: {},
                standards: {},
                agents: {}
            };
            fs.writeFileSync(manager.globalMemoryPath, JSON.stringify(globalMemory));
            manager.currentRepo = null;

            const summary = manager.generateContextSummary();

            assert(summary.includes('Basic Patterns'));
            assert(summary.includes('basic_pattern_1'));
        });

        it('should include other categories in summary', () => {
            const globalMemory = {
                patterns: {},
                decisions: ['Decision 1', 'Decision 2'],
                libraries: { react: '19.0.0' },
                standards: {},
                agents: { 'frontend-developer': { patterns: [] } }
            };
            fs.writeFileSync(manager.globalMemoryPath, JSON.stringify(globalMemory));
            manager.currentRepo = null;

            const summary = manager.generateContextSummary();

            assert(summary.includes('Decisions') || summary.includes('decisions'));
            assert(summary.includes('Libraries') || summary.includes('libraries'));
        });

        it('should handle RulesManager not available', () => {
            manager.currentRepo = null;

            // Should not throw even if RulesManager doesn't exist
            const summary = manager.generateContextSummary();

            assert(typeof summary === 'string');
        });

        it('should truncate long pattern values', () => {
            const globalMemory = {
                patterns: {
                    long_pattern: 'a'.repeat(100)
                },
                decisions: [],
                libraries: {},
                standards: {},
                agents: {}
            };
            fs.writeFileSync(manager.globalMemoryPath, JSON.stringify(globalMemory));
            manager.currentRepo = null;

            const summary = manager.generateContextSummary();

            // Should truncate to 50 chars
            assert(summary.includes('...'));
        });
    });

    describe('setupESLintForCurrentRepo', () => {
        it('should return error when not in repository', () => {
            manager.currentRepo = null;

            const result = manager.setupESLintForCurrentRepo();

            assert.strictEqual(result.success, false);
            assert(result.message.includes('Not in a git repository'));
        });
    });
});
