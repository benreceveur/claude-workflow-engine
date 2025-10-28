#!/usr/bin/env node

/**
 * Auto Behavior System v3.0 - With Skills Orchestration
 * Enforces consistent behavior patterns and intelligently routes to Skills or Agents
 * Integrates with memory system, agent dispatcher, and Skills executor
 */

const fs = require('fs');
const path = require('path');
const { getMemoryDir } = require('./utils/runtime-paths.js');
const SkillRouter = require('./skill-router.js');

// Phase 4: Task Classifier Integration
let TaskClassifier = null;
try {
    TaskClassifier = require('../integrations/task-classifier.js');
} catch (error) {
    // Task classifier not available
}

class AutoBehaviorSystemWithSkills {
    constructor() {
        this.memoryDir = getMemoryDir();
        this.configPath = path.join(this.memoryDir, 'auto-behavior-config.json');
        this.config = this.loadConfig();
        this.agentDispatcher = null;
        this.memoryManager = null;
        this.skillExecutor = null;
        this.skillRouter = null;
        this.taskClassifier = null;  // Phase 4
        this.initializeIntegrations();
    }

    loadConfig() {
        const defaultConfig = {
            enableAutoDispatch: true,
            enableMemoryIntegration: true,
            enableProactiveSuggestions: true,
            enableSkillsOrchestration: true,      // NEW
            enableStrictMode: false,
            confidenceThreshold: 0.45,            // PHASE 3: Tuned from 0.5 to 0.45 for better agent detection
            skillConfidenceThreshold: 0.45,       // PHASE 3: Balanced to match agent threshold for fair competition
            memoryContextLimit: 6,
            memorySummarySections: 3,
            mandatoryAgents: true,
            logInteractions: true
        };

        try {
            if (fs.existsSync(this.configPath)) {
                const savedConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
                return { ...defaultConfig, ...savedConfig };
            }
        } catch (error) {
            console.warn('Failed to load auto-behavior config, using defaults');
        }

        return defaultConfig;
    }

    saveConfig() {
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
        } catch (error) {
            console.error('Failed to save auto-behavior config:', error);
        }
    }

    initializeIntegrations() {
        // Initialize agent dispatcher
        try {
            const EnhancedAgentDispatcher = require('./enhanced-agent-dispatcher.js');
            this.agentDispatcher = new EnhancedAgentDispatcher();
        } catch (error) {
            console.warn('Enhanced agent dispatcher not available');
        }

        // Initialize memory manager
        try {
            const EnhancedMemoryManager = require('./enhanced-memory-manager.js');
            this.memoryManager = new EnhancedMemoryManager();
        } catch (error) {
            console.warn('Enhanced memory manager not available');
        }

        // Initialize Skill executor (NEW)
        try {
            const SkillExecutor = require('./skill-executor.js');
            this.skillExecutor = new SkillExecutor();
            this.skillRouter = new SkillRouter({ skillExecutor: this.skillExecutor });
        } catch (error) {
            console.warn('Skill executor not available');
        }

        // Phase 4: Initialize Task Classifier
        if (TaskClassifier) {
            try {
                this.taskClassifier = new TaskClassifier({ debug: false });
            } catch (error) {
                console.warn('Task classifier initialization failed:', error.message);
            }
        }
    }

    async processPrompt(userInput, context = {}) {
        const processing = {
            original_input: userInput,
            context: context,
            timestamp: new Date().toISOString(),
            memory_context: null,
            task_classification: null,        // Phase 4: Task Classifier result
            skill_recommendation: null,
            agent_recommendation: null,
            execution_mode: 'direct',         // 'skill', 'agent', 'hybrid', 'direct'
            available_skills: [],
            behavior_enforcement: [],
            final_instructions: []
        };

        // Load memory context if enabled
        if (this.config.enableMemoryIntegration && this.memoryManager) {
            try {
                const limit = this.config.memoryContextLimit || 6;
                const sectionLimit = this.config.memorySummarySections || 3;
                let matches = [];

                if (typeof this.memoryManager.getRelevantContext === 'function') {
                    matches = this.memoryManager.getRelevantContext(userInput, { limit });
                }

                processing.memory_context = {
                    query: userInput,
                    matches,
                    summary: this.memoryManager.generateContextSummary({
                        query: userInput,
                        maxMatches: limit,
                        maxSectionEntries: 2,
                        maxOptionalSections: sectionLimit
                    })
                };
            } catch (error) {
                console.warn('Failed to load memory context:', error.message);
            }
        }

        // Phase 4: Task Classification (before evaluation)
        if (this.taskClassifier) {
            try {
                processing.task_classification = await this.taskClassifier.classify(userInput, context);
            } catch (error) {
                console.warn('Task classification failed:', error.message);
            }
        }

        // PHASE 3: Parallel evaluation - check BOTH skills and agents
        // Check for Skill match
        if (this.config.enableSkillsOrchestration && this.skillRouter) {
            processing.skill_recommendation = await this.checkForSkill(userInput, context);
        }

        // Check for Agent match (always check, don't skip)
        if (this.config.enableAutoDispatch && this.agentDispatcher) {
            try {
                processing.agent_recommendation = await this.agentDispatcher.dispatch(userInput, context);

                // Load available Skills for Agent to use
                if (this.skillExecutor) {
                    processing.available_skills = this.skillExecutor.listSkills();
                }
            } catch (error) {
                console.warn('Failed to get agent recommendation:', error);
            }
        }

        // PHASE 3 + 4: Intelligent routing decision with task classification
        processing.execution_mode = this.makeRoutingDecision(processing);

        // Apply behavior enforcement rules
        processing.behavior_enforcement = this.applyBehaviorRules(userInput, processing);

        // Generate final instructions
        processing.final_instructions = this.generateFinalInstructions(processing);

        // Log interaction if enabled
        if (this.config.logInteractions) {
            this.logInteraction(processing);
        }

        return processing;
    }

    /**
     * Check if user input matches a Skill pattern
     */
    async checkForSkill(input, context = {}) {
        if (!this.skillRouter) {
            return null;
        }

        const result = this.skillRouter.detectSkill(input, context);
        if (result && result.available) {
            result.reason = result.reason || `Matched ${result.matchedKeywords.length} keywords`;
        }
        return result;
    }

    /**
     * PHASE 3 + 4: Intelligent routing decision with task classification
     * Compare skill and agent recommendations to decide execution mode
     * Phase 4: Uses task classification as tiebreaker and bias
     */
    makeRoutingDecision(processing) {
        const skillConf = processing.skill_recommendation?.confidence || 0;
        const agentConf = processing.agent_recommendation?.confidence || 0;
        const skillAvailable = processing.skill_recommendation?.available || false;

        const skillThreshold = this.config.skillConfidenceThreshold;
        const agentThreshold = this.config.confidenceThreshold;

        // Phase 4: Get task classification
        const classification = processing.task_classification;
        const classifiedAsSkill = classification && classification.type === 'SKILL';
        const classifiedAsAgent = classification && classification.type === 'AGENT';
        const classificationConf = classification?.confidence || 0;

        // Rule 1: High confidence skill match and skill is available
        if (skillConf >= skillThreshold && skillAvailable && skillConf > agentConf) {
            return 'skill';
        }

        // Rule 2: High confidence agent match
        if (agentConf >= agentThreshold && agentConf > skillConf) {
            return 'agent';
        }

        // Rule 3: Both above threshold - use skill preference when close, or classification as tiebreaker
        if (skillConf >= skillThreshold && agentConf >= agentThreshold) {
            const diff = Math.abs(skillConf - agentConf);

            // Sub-rule 3a: Close match - prefer skill (more specific/automated tool)
            // Skills with 0.7+ confidence get preference when agent is within 0.25
            if (diff <= 0.25 && skillConf >= 0.7 && skillAvailable) {
                return 'skill';
            }

            // Sub-rule 3b: Very close match - use classification if confident
            if (diff < 0.2 && classification && classificationConf > 0.7) {
                return classifiedAsSkill ? 'skill' : 'agent';
            }

            // Sub-rule 3c: Clear winner
            return skillConf > agentConf ? 'skill' : 'agent';
        }

        // Rule 4: Only skill above threshold and available
        if (skillConf >= skillThreshold && skillAvailable) {
            return 'skill';
        }

        // Rule 5: Only agent above threshold
        if (agentConf >= agentThreshold) {
            return 'agent';
        }

        // Rule 6: Neither above threshold - use classification if confident
        if (classification && classificationConf > 0.7) {
            if (classifiedAsAgent && agentConf > 0.3) {
                return 'agent';
            }
            if (classifiedAsSkill && skillConf > 0.3 && skillAvailable) {
                return 'skill';
            }
        }

        // Rule 7: Neither above threshold - compare what we have
        if (agentConf > 0 || skillConf > 0) {
            return agentConf >= skillConf ? 'agent' : 'direct';
        }

        // Rule 8: No matches at all
        return 'direct';
    }

    applyBehaviorRules(input, processing) {
        const rules = [];

        // Rule 1: Skill usage enforcement (NEW)
        if (processing.skill_recommendation && processing.skill_recommendation.confidence > this.config.skillConfidenceThreshold) {
            rules.push({
                type: 'skill_usage',
                skill: processing.skill_recommendation.skill,
                confidence: processing.skill_recommendation.confidence,
                mandatory: true,
                instruction: `Use the ${processing.skill_recommendation.skill} Skill for this procedural operation`
            });
        }

        // Rule 2: Agent usage enforcement
        if (processing.agent_recommendation && processing.agent_recommendation.confidence > this.config.confidenceThreshold) {
            rules.push({
                type: 'agent_usage',
                agent: processing.agent_recommendation.recommended_agent,
                confidence: processing.agent_recommendation.confidence,
                mandatory: processing.agent_recommendation.mandatory || this.config.mandatoryAgents,
                instruction: `Use the ${processing.agent_recommendation.recommended_agent} agent for this task`
            });
        }

        // Rule 3: Memory context integration
        if (processing.memory_context?.matches?.length) {
            rules.push({
                type: 'memory_integration',
                matches: processing.memory_context.matches,
                instruction: `Consider ${processing.memory_context.matches.length} high-signal memory entries`
            });
        }

        // Rule 4: Skills availability for Agents (NEW)
        if (processing.available_skills && processing.available_skills.length > 0 && processing.execution_mode === 'agent') {
            rules.push({
                type: 'skills_available',
                skills: processing.available_skills.map(s => s.name),
                instruction: `Agent has access to ${processing.available_skills.length} Skills for deterministic operations`
            });
        }

        // Rule 5: File path enforcement
        rules.push({
            type: 'file_paths',
            instruction: 'Always use absolute file paths, never relative paths'
        });

        // Rule 6: Backup before modification
        if (this.isModificationTask(input)) {
            rules.push({
                type: 'backup_safety',
                instruction: 'Read existing files before making modifications'
            });
        }

        return rules;
    }

    generateSkillInstructions(processing) {
        const instructions = [];

        instructions.push('🎯 SKILL EXECUTION MODE');
        instructions.push(`Skill: ${processing.skill_recommendation.skill}`);
        instructions.push(`Confidence: ${(processing.skill_recommendation.confidence * 100).toFixed(1)}%`);
        instructions.push(`Reason: ${processing.skill_recommendation.reason}`);
        instructions.push('');
        instructions.push('EXECUTION:');
        instructions.push(`1. Execute ${processing.skill_recommendation.skill} Skill`);
        instructions.push('2. Return result directly (no Agent needed)');
        instructions.push('3. This is a deterministic operation');

        return instructions;
    }

    generateFinalInstructions(processing) {
        const instructions = [];

        // Add memory context instruction
        if (processing.memory_context?.matches?.length) {
            const preview = processing.memory_context.matches
                .slice(0, 3)
                .map(match => `${match.path} (${(match.score * 100).toFixed(0)}%)`)
                .join('; ');
            instructions.push(`🧠 MEMORY CONTEXT: ${preview}`);
        } else if (processing.memory_context) {
            instructions.push('🧠 MEMORY CONTEXT LOADED');
        }

        // Add Skill instruction (NEW)
        if (processing.skill_recommendation && processing.skill_recommendation.confidence > this.config.skillConfidenceThreshold) {
            instructions.push(`🎯 SKILL RECOMMENDATION: Use ${processing.skill_recommendation.skill} Skill (${(processing.skill_recommendation.confidence * 100).toFixed(1)}% confidence)`);
        }

        // Add agent instruction
        if (processing.agent_recommendation && processing.agent_recommendation.confidence > this.config.confidenceThreshold) {
            const agentInstruction = processing.agent_recommendation.mandatory
                ? `🚨 MANDATORY AGENT: Use ${processing.agent_recommendation.recommended_agent} agent`
                : `💡 RECOMMENDED AGENT: ${processing.agent_recommendation.recommended_agent} (${(processing.agent_recommendation.confidence * 100).toFixed(1)}% confidence)`;

            instructions.push(agentInstruction);
        }

        // Add Skills availability (NEW)
        if (processing.available_skills && processing.available_skills.length > 0 && processing.execution_mode === 'agent') {
            instructions.push(`🔧 SKILLS AVAILABLE: ${processing.available_skills.length} Skills ready for Agent use`);
            instructions.push(`   Skills: ${processing.available_skills.map(s => s.name).join(', ')}`);
        }

        // Add behavior enforcement instructions
        processing.behavior_enforcement.forEach(rule => {
            if (rule.type !== 'skill_usage' && rule.type !== 'skills_available') {
                instructions.push(`📋 ${rule.type.toUpperCase()}: ${rule.instruction}`);
            }
        });

        return instructions;
    }

    isModificationTask(input) {
        const modificationKeywords = [
            'create', 'write', 'modify', 'update', 'edit', 'change', 'delete',
            'add', 'remove', 'refactor', 'implement', 'build', 'setup'
        ];

        const inputLower = input.toLowerCase();
        return modificationKeywords.some(keyword => inputLower.includes(keyword));
    }

    logInteraction(processing) {
        const logEntry = {
            timestamp: processing.timestamp,
            input_length: processing.original_input.length,
            execution_mode: processing.execution_mode,            // NEW
            skill_recommended: processing.skill_recommendation?.skill || null,  // NEW
            skill_confidence: processing.skill_recommendation?.confidence || null,  // NEW
            agent_recommended: processing.agent_recommendation?.recommended_agent || null,
            agent_confidence: processing.agent_recommendation?.confidence || null,
            memory_context_loaded: !!processing.memory_context,
            rules_applied: processing.behavior_enforcement.length,
            skills_available: processing.available_skills?.length || 0  // NEW
        };

        const logPath = path.join(this.memoryDir, 'auto-behavior.log');

        try {
            fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
        } catch (error) {
            console.warn('Failed to log interaction:', error);
        }
    }

    async handleCLI(args) {
        const command = args[0];

        switch (command) {
            case 'prompt': {
                const input = args.slice(1).join(' ');
                if (!input) {
                    console.error('Usage: auto-behavior-system prompt "your input"');
                    return;
                }

                const result = await this.processPrompt(input);
                this.outputPromptResult(result);
                break;
            }

            case 'status': {
                this.showStatus();
                break;
            }

            case 'config': {
                await this.handleConfigCommand(args.slice(1));
                break;
            }

            case 'banner': {
                this.showBanner();
                break;
            }

            case 'test-skill': {
                await this.testSkillDetection();
                break;
            }

            default:
                this.showHelp();
        }
    }

    outputPromptResult(result) {
        console.log('\n🤖 AUTO BEHAVIOR SYSTEM PROCESSING (v3.0 - With Skills)\n');

        console.log(`EXECUTION MODE: ${result.execution_mode.toUpperCase()}`);
        console.log('');

        if (result.skill_recommendation && result.execution_mode === 'skill') {
            console.log('SKILL EXECUTION:');
            console.log(`  Skill: ${result.skill_recommendation.skill}`);
            console.log(`  Confidence: ${(result.skill_recommendation.confidence * 100).toFixed(1)}%`);
            console.log(`  Reason: ${result.skill_recommendation.reason}`);
            console.log(`  Available: ${result.skill_recommendation.available ? 'Yes' : 'No (will fallback to Agent)'}`);
            console.log('');
        }

        if (result.agent_recommendation && result.execution_mode === 'agent') {
            console.log('AGENT ANALYSIS:');
            console.log(`  Recommended: ${result.agent_recommendation.recommended_agent}`);
            console.log(`  Confidence: ${(result.agent_recommendation.confidence * 100).toFixed(1)}%`);
            console.log(`  Reasoning: ${result.agent_recommendation.reasoning}`);
            if (result.agent_recommendation.alternatives && result.agent_recommendation.alternatives.length > 0) {
                console.log(`  Alternatives: ${result.agent_recommendation.alternatives.map(alt => alt.agent).join(', ')}`);
            }
            console.log('');
        }

        if (result.available_skills && result.available_skills.length > 0) {
            console.log('SKILLS AVAILABLE TO AGENT:');
            result.available_skills.forEach(skill => {
                console.log(`  - ${skill.name}: ${skill.description || '(no description)'}`);
            });
            console.log('');
        }

        if (result.final_instructions.length > 0) {
            console.log('BEHAVIOR INSTRUCTIONS:');
            result.final_instructions.forEach(instruction => {
                console.log(`  ${instruction}`);
            });
            console.log('');
        }

        console.log('ENFORCEMENT ACTIVE:');
        console.log('  ✅ Memory integration mandatory');
        console.log('  ✅ Skills orchestration enabled');
        console.log('  ✅ Agent usage enforced');
        console.log('  ✅ File path validation');
        console.log('  ✅ Safety checks enabled');
    }

    showStatus() {
        console.log(JSON.stringify({
            status: 'active',
            version: '3.0',
            config: this.config,
            integrations: {
                agent_dispatcher: !!this.agentDispatcher,
                memory_manager: !!this.memoryManager,
                skill_executor: !!this.skillExecutor
            },
            skills: this.skillExecutor ? this.skillExecutor.listSkills().map(s => s.name) : [],
            timestamp: new Date().toISOString()
        }, null, 2));
    }

    async testSkillDetection() {
        const testCases = [
            'Detect the current repository',
            'Clean up memory and remove duplicates',
            'Format memory as markdown',
            'Analyze the codebase structure',
            'Validate memory schema'
        ];

        console.log('🧪 Testing Skill Detection\n');

        for (const testCase of testCases) {
            const result = await this.checkForSkill(testCase);
            console.log(`Input: "${testCase}"`);
            if (result && result.skill) {
                const status = result.available ? '✅' : '⚠️';
                console.log(`  ${status} Skill: ${result.skill} (${(result.confidence * 100).toFixed(1)}% confidence)`);
                console.log(`  Reason: ${result.reason}`);
                console.log(`  Available: ${result.available ? 'Yes - Ready to use' : 'No - Build this Skill to enable'}`);
            } else {
                console.log('  ❌ No Skill pattern match');
            }
            console.log('');
        }
    }

    async handleConfigCommand(args) {
        const subcommand = args[0];

        switch (subcommand) {
            case 'show': {
                console.log(JSON.stringify(this.config, null, 2));
                break;
            }

            case 'update': {
                if (args[1]) {
                    try {
                        const updates = JSON.parse(args[1]);
                        Object.assign(this.config, updates);
                        this.saveConfig();
                        console.log('✅ Configuration updated');
                    } catch (error) {
                        console.error('❌ Invalid JSON for config update');
                    }
                }
                break;
            }

            default:
                console.log('Config subcommands: show, update');
        }
    }

    showBanner() {
        console.log(`
🤖 AUTO BEHAVIOR SYSTEM v3.0 - With Skills Orchestration

Status: ACTIVE
- Agent dispatch: ${this.config.enableAutoDispatch ? 'ON' : 'OFF'}
- Memory integration: ${this.config.enableMemoryIntegration ? 'ON' : 'OFF'}
- Skills orchestration: ${this.config.enableSkillsOrchestration ? 'ON' : 'OFF'}
- Strict mode: ${this.config.enableStrictMode ? 'ON' : 'OFF'}

Skills Available: ${this.skillExecutor ? this.skillExecutor.listSkills().length : 0}

Making Claude interactions consistent, agent-driven, and Skill-augmented.
        `);
    }

    showHelp() {
        console.log(`
Auto Behavior System v3.0 - With Skills Orchestration

Usage:
  node auto-behavior-system.js <command> [args]

Commands:
  prompt "input"     Process user input and apply behavior rules
  status             Show system status including Skills
  config show        Show current configuration
  config update      Update configuration with JSON
  banner             Show system banner
  test-skill         Test Skill detection with sample inputs
  help               Show this help

Examples:
  node auto-behavior-system.js prompt "Detect repository"
  node auto-behavior-system.js test-skill
  node auto-behavior-system.js config update '{"enableSkillsOrchestration": true}'
        `);
    }
}

// Export for use as module
module.exports = AutoBehaviorSystemWithSkills;

// CLI usage when run directly
if (require.main === module) {
    const system = new AutoBehaviorSystemWithSkills();
    system.handleCLI(process.argv.slice(2));
}
