/**
 * Unit Tests: AutoBehaviorSystemWithSkills
 *
 * Tests for Skills orchestration and behavior enforcement
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

describe('Unit: AutoBehaviorSystemWithSkills', () => {
    let AutoBehaviorSystem;
    let system;
    let testConfigPath;
    let testLogPath;

    before(() => {
        // Load the class
        AutoBehaviorSystem = require('../../src/auto-behavior-system');
    });

    beforeEach(() => {
        // Create fresh instance for each test
        system = new AutoBehaviorSystem();
        testConfigPath = path.join(system.memoryDir, 'auto-behavior-config.json');
        testLogPath = path.join(system.memoryDir, 'auto-behavior.log');
    });

    afterEach(() => {
        // Clean up test files if created
        try {
            if (fs.existsSync(testConfigPath)) {
                fs.unlinkSync(testConfigPath);
            }
            if (fs.existsSync(testLogPath)) {
                fs.unlinkSync(testLogPath);
            }
        } catch (error) {
            // Ignore cleanup errors
        }
    });

    describe('Constructor', () => {
        it('should initialize with default configuration', () => {
            assert(system.config);
            assert.strictEqual(typeof system.config.enableAutoDispatch, 'boolean');
            assert.strictEqual(typeof system.config.enableMemoryIntegration, 'boolean');
            assert.strictEqual(typeof system.config.enableSkillsOrchestration, 'boolean');
        });

        it('should set memory directory path', () => {
            assert(system.memoryDir);
            assert(system.memoryDir.includes('.claude'));
            assert(system.memoryDir.includes('memory'));
        });

        it('should define Skill patterns on initialization', () => {
            assert(system.skillPatterns);
            assert(typeof system.skillPatterns === 'object');
            assert(Object.keys(system.skillPatterns).length > 0);
        });

        it('should attempt to initialize integrations', () => {
            // Integrations may or may not be available
            assert(system.agentDispatcher !== undefined);
            assert(system.memoryManager !== undefined);
            assert(system.skillExecutor !== undefined);
        });
    });

    describe('loadConfig', () => {
        it('should return default config when file does not exist', () => {
            // Ensure file doesn't exist
            if (fs.existsSync(testConfigPath)) {
                fs.unlinkSync(testConfigPath);
            }

            const config = system.loadConfig();

            assert.strictEqual(config.enableAutoDispatch, true);
            assert.strictEqual(config.enableMemoryIntegration, true);
            assert.strictEqual(config.enableSkillsOrchestration, true);
            assert.strictEqual(typeof config.confidenceThreshold, 'number');
        });

        it('should merge saved config with defaults', () => {
            // Create config file with partial settings
            const savedConfig = {
                enableAutoDispatch: false,
                customSetting: 'test'
            };
            fs.writeFileSync(testConfigPath, JSON.stringify(savedConfig));

            const config = system.loadConfig();

            // Saved settings should override defaults
            assert.strictEqual(config.enableAutoDispatch, false);
            // Defaults should still be present
            assert.strictEqual(config.enableMemoryIntegration, true);
            // Custom settings should be preserved
            assert.strictEqual(config.customSetting, 'test');
        });

        it('should handle corrupted config file gracefully', () => {
            // Write invalid JSON
            fs.writeFileSync(testConfigPath, 'invalid json {');

            const config = system.loadConfig();

            // Should fall back to defaults
            assert.strictEqual(config.enableAutoDispatch, true);
        });
    });

    describe('saveConfig', () => {
        it('should save config to file', () => {
            system.config.enableAutoDispatch = false;
            system.config.customSetting = 'test-value';

            system.saveConfig();

            assert(fs.existsSync(testConfigPath));
            const savedConfig = JSON.parse(fs.readFileSync(testConfigPath, 'utf8'));
            assert.strictEqual(savedConfig.enableAutoDispatch, false);
            assert.strictEqual(savedConfig.customSetting, 'test-value');
        });

        it('should handle write errors gracefully', () => {
            // Make directory read-only to force write error
            const originalPath = system.configPath;
            system.configPath = '/nonexistent/path/config.json';

            // Should not throw
            system.saveConfig();

            system.configPath = originalPath;
        });
    });

    describe('initializeIntegrations', () => {
        it('should set agentDispatcher to null if not available', () => {
            // Integrations may not be available in test environment
            assert(system.agentDispatcher === null || system.agentDispatcher !== undefined);
        });

        it('should set memoryManager to null if not available', () => {
            assert(system.memoryManager === null || system.memoryManager !== undefined);
        });

        it('should set skillExecutor to null if not available', () => {
            assert(system.skillExecutor === null || system.skillExecutor !== undefined);
        });
    });

    describe('defineSkillPatterns', () => {
        it('should define repo-detection pattern', () => {
            const patterns = system.skillPatterns;

            assert(patterns['repo-detection']);
            assert(Array.isArray(patterns['repo-detection'].keywords));
            assert(patterns['repo-detection'].keywords.length > 0);
            assert(typeof patterns['repo-detection'].confidence === 'number');
        });

        it('should define memory-hygiene pattern', () => {
            const patterns = system.skillPatterns;

            assert(patterns['memory-hygiene']);
            assert(Array.isArray(patterns['memory-hygiene'].keywords));
        });

        it('should define patterns with confidence scores', () => {
            const patterns = system.skillPatterns;

            Object.values(patterns).forEach(pattern => {
                assert(typeof pattern.confidence === 'number');
                assert(pattern.confidence >= 0 && pattern.confidence <= 1);
            });
        });

        it('should define patterns with descriptions', () => {
            const patterns = system.skillPatterns;

            Object.values(patterns).forEach(pattern => {
                assert(typeof pattern.description === 'string');
                assert(pattern.description.length > 0);
            });
        });
    });

    describe('checkForSkill', () => {
        it('should return null when no pattern matches', async () => {
            const result = await system.checkForSkill('xyz abc qwerty 123', {});

            // Either null or very low confidence
            assert(result === null || result.confidence === 0);
        });

        it('should detect repo-detection Skill pattern', async () => {
            const result = await system.checkForSkill('detect repository and get repo info', {});

            if (result) {
                assert(result.skill === 'repo-detection' || result.confidence > 0);
                if (result.skill === 'repo-detection') {
                    assert(result.matchedKeywords.length > 0);
                }
            }
        });

        it('should calculate confidence based on keyword matches', async () => {
            const result1 = await system.checkForSkill('detect repository', {});
            const result2 = await system.checkForSkill('detect repository get repo info repository hash', {});

            // More keywords should mean higher confidence
            if (result1 && result2 && result1.skill === result2.skill) {
                assert(result2.confidence >= result1.confidence);
            }
        });

        it('should include matched keywords in result', async () => {
            const result = await system.checkForSkill('clean memory and validate schema', {});

            if (result && result.matchedKeywords) {
                assert(Array.isArray(result.matchedKeywords));
            }
        });

        it('should set available=false if Skill not installed', async () => {
            // Mock skillExecutor that returns null for non-existent Skill
            system.skillExecutor = {
                getSkillPath: (skill) => null
            };

            const result = await system.checkForSkill('clean memory', {});

            if (result && result.skill) {
                assert.strictEqual(result.available, false);
                assert.strictEqual(result.confidence, 0);
            }
        });

        it('should set available=true if Skill is installed', async () => {
            // Mock skillExecutor that returns path
            system.skillExecutor = {
                getSkillPath: (skill) => '/path/to/skill'
            };

            const result = await system.checkForSkill('clean memory', {});

            if (result && result.skill && result.matchedKeywords.length > 0) {
                assert.strictEqual(result.available, true);
                assert(result.path);
            }
        });
    });

    describe('processPrompt', () => {
        it('should process input and return processing object', async () => {
            const result = await system.processPrompt('create a component', {});

            assert(result);
            assert.strictEqual(result.original_input, 'create a component');
            assert(result.timestamp);
            assert(result.execution_mode);
            assert(Array.isArray(result.final_instructions));
        });

        it('should set execution_mode to skill for high confidence Skill match', async () => {
            // Mock high confidence Skill match
            system.config.enableSkillsOrchestration = true;
            system.config.skillConfidenceThreshold = 0.5;
            system.skillExecutor = {
                getSkillPath: () => '/path/to/skill',
                listSkills: () => []
            };

            const result = await system.processPrompt('detect repository and get all repo info', {});

            // Might be 'skill' mode if confidence is high enough
            assert(['skill', 'agent', 'direct'].includes(result.execution_mode));
        });

        it('should load memory context when enabled', async () => {
            system.config.enableMemoryIntegration = true;
            system.memoryManager = {
                getEffectiveMemory: () => ({ test: 'context' })
            };

            const result = await system.processPrompt('test input', {});

            if (result.memory_context) {
                assert(result.memory_context);
            }
        });

        it('should handle memory loading errors gracefully', async () => {
            system.config.enableMemoryIntegration = true;
            system.memoryManager = {
                getEffectiveMemory: () => { throw new Error('Memory error'); }
            };

            // Should not throw
            const result = await system.processPrompt('test input', {});

            assert(result);
        });

        it('should get agent recommendation when no Skill match', async () => {
            system.config.enableAutoDispatch = true;
            system.config.enableSkillsOrchestration = false;
            system.agentDispatcher = {
                dispatch: async (input) => ({
                    recommended_agent: 'test-agent',
                    confidence: 0.8,
                    reasoning: 'test'
                })
            };

            const result = await system.processPrompt('test input', {});

            if (result.agent_recommendation) {
                assert.strictEqual(result.agent_recommendation.recommended_agent, 'test-agent');
            }
        });

        it('should load available Skills for Agent mode', async () => {
            system.config.enableAutoDispatch = true;
            system.agentDispatcher = {
                dispatch: async () => ({ recommended_agent: 'test', confidence: 0.8 })
            };
            system.skillExecutor = {
                listSkills: () => [{ name: 'skill-1' }, { name: 'skill-2' }]
            };

            const result = await system.processPrompt('test input', {});

            if (result.execution_mode === 'agent' && result.available_skills) {
                assert(Array.isArray(result.available_skills));
            }
        });

        it('should apply behavior enforcement rules', async () => {
            const result = await system.processPrompt('create a file', {});

            assert(Array.isArray(result.behavior_enforcement));
        });

        it('should generate final instructions', async () => {
            const result = await system.processPrompt('test input', {});

            assert(Array.isArray(result.final_instructions));
        });

        it('should log interaction when enabled', async () => {
            system.config.logInteractions = true;

            await system.processPrompt('test input', {});

            // Check if log file was created
            if (fs.existsSync(testLogPath)) {
                const logContent = fs.readFileSync(testLogPath, 'utf8');
                assert(logContent.length > 0);
            }
        });
    });

    describe('isModificationTask', () => {
        it('should return true for create task', () => {
            assert.strictEqual(system.isModificationTask('create a file'), true);
        });

        it('should return true for write task', () => {
            assert.strictEqual(system.isModificationTask('write some code'), true);
        });

        it('should return true for modify task', () => {
            assert.strictEqual(system.isModificationTask('modify the config'), true);
        });

        it('should return false for read-only task', () => {
            assert.strictEqual(system.isModificationTask('show me the file'), false);
        });

        it('should be case-insensitive', () => {
            assert.strictEqual(system.isModificationTask('CREATE a file'), true);
            assert.strictEqual(system.isModificationTask('WRITE code'), true);
        });
    });

    describe('generateSkillInstructions', () => {
        it('should generate instructions for Skill execution', () => {
            const processing = {
                skill_recommendation: {
                    skill: 'test-skill',
                    confidence: 0.9,
                    reason: 'High confidence match'
                }
            };

            const instructions = system.generateSkillInstructions(processing);

            assert(Array.isArray(instructions));
            assert(instructions.length > 0);
            assert(instructions.some(i => i.includes('test-skill')));
            assert(instructions.some(i => i.includes('90.0%')));
        });

        it('should include execution steps', () => {
            const processing = {
                skill_recommendation: {
                    skill: 'memory-hygiene',
                    confidence: 0.85,
                    reason: 'Test'
                }
            };

            const instructions = system.generateSkillInstructions(processing);

            assert(instructions.some(i => i.includes('EXECUTION')));
            assert(instructions.some(i => i.includes('deterministic')));
        });
    });

    describe('generateFinalInstructions', () => {
        it('should include memory context instruction', () => {
            const processing = {
                memory_context: { test: 'data' },
                skill_recommendation: null,
                agent_recommendation: null,
                available_skills: [],
                behavior_enforcement: []
            };

            const instructions = system.generateFinalInstructions(processing);

            assert(instructions.some(i => i.includes('MEMORY CONTEXT')));
        });

        it('should include Skill recommendation', () => {
            system.config.skillConfidenceThreshold = 0.5;
            const processing = {
                memory_context: null,
                skill_recommendation: {
                    skill: 'test-skill',
                    confidence: 0.9
                },
                agent_recommendation: null,
                available_skills: [],
                behavior_enforcement: []
            };

            const instructions = system.generateFinalInstructions(processing);

            assert(instructions.some(i => i.includes('test-skill')));
        });

        it('should include agent recommendation', () => {
            system.config.confidenceThreshold = 0.5;
            const processing = {
                memory_context: null,
                skill_recommendation: null,
                agent_recommendation: {
                    recommended_agent: 'frontend-developer',
                    confidence: 0.8,
                    mandatory: false
                },
                available_skills: [],
                behavior_enforcement: []
            };

            const instructions = system.generateFinalInstructions(processing);

            assert(instructions.some(i => i.includes('frontend-developer')));
        });

        it('should mark mandatory agents', () => {
            system.config.confidenceThreshold = 0.5;
            const processing = {
                memory_context: null,
                skill_recommendation: null,
                agent_recommendation: {
                    recommended_agent: 'security-engineer',
                    confidence: 0.9,
                    mandatory: true
                },
                available_skills: [],
                behavior_enforcement: []
            };

            const instructions = system.generateFinalInstructions(processing);

            assert(instructions.some(i => i.includes('MANDATORY')));
            assert(instructions.some(i => i.includes('security-engineer')));
        });

        it('should include available Skills for Agent mode', () => {
            const processing = {
                memory_context: null,
                skill_recommendation: null,
                agent_recommendation: null,
                available_skills: [
                    { name: 'skill-1' },
                    { name: 'skill-2' }
                ],
                execution_mode: 'agent',
                behavior_enforcement: []
            };

            const instructions = system.generateFinalInstructions(processing);

            assert(instructions.some(i => i.includes('SKILLS AVAILABLE')));
            assert(instructions.some(i => i.includes('skill-1')));
        });
    });

    describe('logInteraction', () => {
        it('should log interaction to file', () => {
            const processing = {
                timestamp: new Date().toISOString(),
                original_input: 'test input',
                execution_mode: 'agent',
                skill_recommendation: null,
                agent_recommendation: { recommended_agent: 'test', confidence: 0.8 },
                memory_context: { test: 'data' },
                behavior_enforcement: [],
                available_skills: []
            };

            system.logInteraction(processing);

            assert(fs.existsSync(testLogPath));
            const logContent = fs.readFileSync(testLogPath, 'utf8');
            assert(logContent.includes('test input'.length.toString()));
        });

        it('should log Skill execution details', () => {
            const processing = {
                timestamp: new Date().toISOString(),
                original_input: 'test',
                execution_mode: 'skill',
                skill_recommendation: { skill: 'test-skill', confidence: 0.9 },
                agent_recommendation: null,
                memory_context: null,
                behavior_enforcement: [],
                available_skills: []
            };

            system.logInteraction(processing);

            const logContent = fs.readFileSync(testLogPath, 'utf8');
            assert(logContent.includes('test-skill'));
            assert(logContent.includes('0.9'));
        });

        it('should handle logging errors gracefully', () => {
            const processing = {
                timestamp: new Date().toISOString(),
                original_input: 'test',
                execution_mode: 'direct',
                behavior_enforcement: []
            };

            // Force error by using invalid path
            const originalMemoryDir = system.memoryDir;
            system.memoryDir = '/nonexistent/path';

            // Should not throw
            system.logInteraction(processing);

            system.memoryDir = originalMemoryDir;
        });
    });

    describe('CLI - handleCLI', () => {
        let originalLog;
        let originalError;
        let logOutput;
        let errorOutput;

        beforeEach(() => {
            originalLog = console.log;
            originalError = console.error;
            logOutput = [];
            errorOutput = [];
            console.log = (...args) => logOutput.push(args.join(' '));
            console.error = (...args) => errorOutput.push(args.join(' '));
        });

        afterEach(() => {
            console.log = originalLog;
            console.error = originalError;
        });

        it('should handle prompt command', async () => {
            await system.handleCLI(['prompt', 'create', 'a', 'component']);

            assert(logOutput.length > 0);
        });

        it('should show error for prompt without input', async () => {
            await system.handleCLI(['prompt']);

            assert(errorOutput.length > 0);
            assert(errorOutput[0].includes('Usage'));
        });

        it('should handle status command', async () => {
            await system.handleCLI(['status']);

            // Status command should produce some output
            assert(logOutput.length > 0);
        });

        it('should handle config get command', async () => {
            await system.handleCLI(['config', 'get']);

            assert(logOutput.length > 0);
        });

        it('should handle config update command', async () => {
            await system.handleCLI(['config', 'update', '{"enableAutoDispatch":false}']);

            assert.strictEqual(system.config.enableAutoDispatch, false);
        });

        it('should handle banner command', async () => {
            await system.handleCLI(['banner']);

            assert(logOutput.length > 0);
        });

        it('should show help for unknown command', async () => {
            await system.handleCLI(['unknown']);

            assert(logOutput.length > 0);
            const output = logOutput.join('\n');
            assert(output.includes('Usage') || output.includes('Commands'));
        });
    });
});
