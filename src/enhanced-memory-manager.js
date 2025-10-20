#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const RepositoryDetector = require('./repo-detector.js');

class EnhancedMemoryManager {
    constructor() {
        this.detector = new RepositoryDetector();
        this.globalMemoryPath = path.join(process.env.HOME, '.claude', 'memory', 'global-memory.json');
        this.currentRepo = this.detector.getCurrentRepository();
        this.repoPaths = this.currentRepo ? this.detector.ensureRepositoryMemory(this.currentRepo) : null;
    }

    loadGlobalMemory() {
        if (!fs.existsSync(this.globalMemoryPath)) {
            return { patterns: {}, decisions: {}, libraries: {}, standards: {}, agents: {} };
        }
        const rawMemory = JSON.parse(fs.readFileSync(this.globalMemoryPath, 'utf8'));
        
        // Convert old format to new format if needed
        if (rawMemory.global_patterns) {
            return {
                patterns: rawMemory.global_patterns.code_style || {},
                decisions: rawMemory.global_patterns.architecture_decisions || [],
                libraries: rawMemory.global_patterns.common_libraries || {},
                standards: rawMemory.global_patterns.testing_preferences || {},
                agents: rawMemory.agent_specializations || {}
            };
        }
        
        return rawMemory;
    }

    loadRepositoryMemory() {
        if (!this.repoPaths) return null;
        
        const memory = JSON.parse(fs.readFileSync(this.repoPaths.memoryPath, 'utf8'));
        const metadata = JSON.parse(fs.readFileSync(this.repoPaths.metadataPath, 'utf8'));
        const overrides = JSON.parse(fs.readFileSync(this.repoPaths.overridesPath, 'utf8'));

        return { memory, metadata, overrides };
    }

    getEffectiveMemory() {
        const globalMemory = this.loadGlobalMemory();
        
        if (!this.currentRepo) {
            return {
                source: 'global',
                repository: null,
                memory: globalMemory
            };
        }

        const repoData = this.loadRepositoryMemory();
        if (!repoData.metadata.inheritsFromGlobal) {
            return {
                source: 'repository',
                repository: this.currentRepo,
                memory: repoData.memory
            };
        }

        // Merge global and repository memory with overrides
        const effectiveMemory = this.mergeMemories(globalMemory, repoData.memory, repoData.overrides);
        
        return {
            source: 'merged',
            repository: this.currentRepo,
            memory: effectiveMemory,
            globalCount: this.countPatterns(globalMemory),
            repoCount: this.countPatterns(repoData.memory),
            overrideCount: Object.keys(repoData.overrides).length
        };
    }

    mergeMemories(global, repo, overrides) {
        const merged = JSON.parse(JSON.stringify(global)); // Deep clone

        // Apply repository-specific additions
        Object.keys(repo).forEach(category => {
            if (typeof repo[category] === 'object' && repo[category] !== null) {
                merged[category] = { ...merged[category], ...repo[category] };
            }
        });

        // Apply overrides (repository patterns override global ones)
        Object.keys(overrides).forEach(key => {
            const [category, patternKey] = key.split('.');
            if (merged[category] && overrides[key] === null) {
                delete merged[category][patternKey]; // null means delete global pattern
            } else if (merged[category]) {
                merged[category][patternKey] = overrides[key];
            }
        });

        return merged;
    }

    countPatterns(memory) {
        return Object.values(memory).reduce((count, category) => {
            if (Array.isArray(category)) {
                return count + category.length;
            } else if (typeof category === 'object' && category !== null) {
                return count + Object.keys(category).length;
            }
            return count;
        }, 0);
    }

    updateMemory(category, key, value, scope = 'auto') {
        if (scope === 'global' || !this.currentRepo) {
            this.updateGlobalMemory(category, key, value);
        } else if (scope === 'repository' && this.currentRepo) {
            this.updateRepositoryMemory(category, key, value);
        } else if (scope === 'auto') {
            // Auto-determine scope based on context
            if (this.currentRepo) {
                this.updateRepositoryMemory(category, key, value);
            } else {
                this.updateGlobalMemory(category, key, value);
            }
        }
    }

    updateGlobalMemory(category, key, value) {
        const memory = this.loadGlobalMemory();
        if (!memory[category]) memory[category] = {};
        memory[category][key] = value;
        fs.writeFileSync(this.globalMemoryPath, JSON.stringify(memory, null, 2));
    }

    updateRepositoryMemory(category, key, value) {
        if (!this.repoPaths) return;

        const memory = JSON.parse(fs.readFileSync(this.repoPaths.memoryPath, 'utf8'));
        if (!memory[category]) memory[category] = {};
        memory[category][key] = value;
        
        fs.writeFileSync(this.repoPaths.memoryPath, JSON.stringify(memory, null, 2));
        
        // Update metadata timestamp
        const metadata = JSON.parse(fs.readFileSync(this.repoPaths.metadataPath, 'utf8'));
        metadata.lastUpdated = new Date().toISOString();
        fs.writeFileSync(this.repoPaths.metadataPath, JSON.stringify(metadata, null, 2));
    }

    createOverride(globalKey, newValue) {
        if (!this.repoPaths) return false;

        const overrides = JSON.parse(fs.readFileSync(this.repoPaths.overridesPath, 'utf8'));
        overrides[globalKey] = newValue;
        fs.writeFileSync(this.repoPaths.overridesPath, JSON.stringify(overrides, null, 2));
        return true;
    }

    getMemoryInfo() {
        const effective = this.getEffectiveMemory();
        return {
            currentRepository: this.currentRepo?.name || 'None (global scope)',
            repositoryHash: this.currentRepo?.hash || null,
            repositoryPath: this.currentRepo?.path || null,
            memorySource: effective.source,
            totalPatterns: this.countPatterns(effective.memory),
            ...(effective.globalCount !== undefined && {
                breakdown: {
                    global: effective.globalCount,
                    repository: effective.repoCount,
                    overrides: effective.overrideCount
                }
            })
        };
    }

    generateContextSummary() {
        const effective = this.getEffectiveMemory();
        const info = this.getMemoryInfo();
        
        let summary = `## Memory Context\n`;
        summary += `Repository: ${info.currentRepository}\n`;
        summary += `Source: ${info.memorySource} (${info.totalPatterns} patterns)\n\n`;
        
        // PRIORITY: Show Critical Enforcement Rules First
        if (effective.memory.patterns?.enforcement_rules) {
            summary += `### 🚨 CRITICAL ENFORCEMENT RULES (MANDATORY)\n`;
            summary += `Description: ${effective.memory.patterns.enforcement_rules.description || 'Critical rules that MUST be enforced'}\n`;
            if (effective.memory.patterns.enforcement_rules.rules) {
                effective.memory.patterns.enforcement_rules.rules.forEach(rule => {
                    summary += `- ${rule}\n`;
                });
            }
            summary += '\n';
        }
        
        // Show Shared Services Pattern
        if (effective.memory.patterns?.shared_services_pattern) {
            summary += `### 🔗 SHARED SERVICES PATTERN (MANDATORY)\n`;
            summary += `Description: ${effective.memory.patterns.shared_services_pattern.description || 'Mandatory shared services pattern'}\n`;
            if (effective.memory.patterns.shared_services_pattern.implementation) {
                Object.entries(effective.memory.patterns.shared_services_pattern.implementation).forEach(([key, value]) => {
                    summary += `- **${key}**: ${value}\n`;
                });
            }
            summary += '\n';
        }
        
        // Show Code Review Practice
        if (effective.memory.patterns?.code_review_practice) {
            summary += `### 📋 CODE REVIEW PRACTICE (MANDATORY)\n`;
            summary += `Review Requirement: ${effective.memory.patterns.code_review_practice.review_before_recommendations || 'Always review existing code before changes'}\n`;
            summary += `Rationale: ${effective.memory.patterns.code_review_practice.rationale || 'Ensures recommendations align with existing patterns'}\n\n`;
        }
        
        // Show Global Standards
        if (effective.memory.standards?.global_enforcement) {
            summary += `### 🎯 GLOBAL STANDARDS (ALL REPOSITORIES)\n`;
            Object.entries(effective.memory.standards.global_enforcement).forEach(([category, standards]) => {
                if (typeof standards === 'object' && standards !== null) {
                    summary += `**${category.replace(/_/g, ' ').toUpperCase()}**:\n`;
                    Object.entries(standards).forEach(([key, value]) => {
                        if (typeof value === 'string') {
                            summary += `  - ${key.replace(/_/g, ' ')}: ${value}\n`;
                        }
                    });
                }
            });
            summary += '\n';
        }
        
        // Add comprehensive rules summary using RulesManager
        try {
            const RulesManager = require('./rules-manager.js');
            const rulesManager = new RulesManager();
            const rulesSummary = rulesManager.generateRulesSummary();
            summary += rulesSummary + '\n';
        } catch (error) {
            // Fallback to basic ESLint config if RulesManager fails
            if (effective.memory.standards?.eslint_config) {
                summary += `### ESLint Configuration\n`;
                summary += `- Global ESLint config available at: ${effective.memory.standards.eslint_config.config_path}\n`;
                summary += `- Plugins: ${effective.memory.standards.eslint_config.plugins.join(', ')}\n`;
                summary += `- Setup command: \`node ~/.claude/memory/eslint-setup.js setup\`\n\n`;
            }
        }
        
        // Add other patterns summary (excluding the critical ones shown above)
        Object.entries(effective.memory).forEach(([category, patterns]) => {
            if (category !== 'standards' && category !== 'patterns' && typeof patterns === 'object' && patterns !== null) {
                const count = Array.isArray(patterns) ? patterns.length : Object.keys(patterns).length;
                if (count > 0) {
                    summary += `### ${category.charAt(0).toUpperCase() + category.slice(1)}\n`;
                    if (Array.isArray(patterns)) {
                        patterns.slice(0, 3).forEach(item => {
                            summary += `- ${typeof item === 'string' ? item : JSON.stringify(item)}\n`;
                        });
                    } else {
                        Object.entries(patterns).slice(0, 3).forEach(([key, value]) => {
                            summary += `- ${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}\n`;
                        });
                    }
                    if (count > 3) summary += `- ... and ${count - 3} more\n`;
                    summary += '\n';
                }
            }
        });
        
        // Show basic patterns that aren't critical enforcement rules
        if (effective.memory.patterns) {
            const basicPatterns = Object.entries(effective.memory.patterns).filter(([key]) => 
                !['enforcement_rules', 'shared_services_pattern', 'code_review_practice'].includes(key)
            );
            
            if (basicPatterns.length > 0) {
                summary += `### Basic Patterns\n`;
                basicPatterns.slice(0, 5).forEach(([key, value]) => {
                    summary += `- ${key}: ${typeof value === 'string' ? value : JSON.stringify(value).substring(0, 50)}...\n`;
                });
                if (basicPatterns.length > 5) {
                    summary += `- ... and ${basicPatterns.length - 5} more basic patterns\n`;
                }
                summary += '\n';
            }
        }
        
        return summary;
    }

    setupESLintForCurrentRepo() {
        if (!this.currentRepo) {
            return { success: false, message: 'Not in a git repository' };
        }

        try {
            const ESLintSetup = require('./eslint-setup.js');
            const setup = new ESLintSetup();
            const success = setup.setupComplete();
            
            if (success) {
                // Record that ESLint was set up for this repo
                this.updateRepositoryMemory('standards', 'eslint_setup', {
                    timestamp: new Date().toISOString(),
                    config_applied: true,
                    global_config_used: true
                });
                
                return { success: true, message: 'ESLint configured successfully' };
            } else {
                return { success: false, message: 'ESLint setup failed' };
            }
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
}

// CLI interface
if (require.main === module) {
    const manager = new EnhancedMemoryManager();
    const command = process.argv[2];
    
    switch (command) {
        case 'info':
            console.log(JSON.stringify(manager.getMemoryInfo(), null, 2));
            break;
        case 'load':
            console.log(JSON.stringify(manager.getEffectiveMemory(), null, 2));
            break;
        case 'summary':
            console.log(manager.generateContextSummary());
            break;
        case 'update':
            const [category, key, value, scope] = process.argv.slice(3);
            try {
                const parsedValue = JSON.parse(value);
                manager.updateMemory(category, key, parsedValue, scope);
                console.log('Memory updated');
            } catch (e) {
                manager.updateMemory(category, key, value, scope);
                console.log('Memory updated');
            }
            break;
        case 'override':
            const [globalKey, newValue] = process.argv.slice(3);
            try {
                const parsedValue = JSON.parse(newValue);
                const success = manager.createOverride(globalKey, parsedValue);
                console.log(success ? 'Override created' : 'Failed to create override');
            } catch (e) {
                const success = manager.createOverride(globalKey, newValue);
                console.log(success ? 'Override created' : 'Failed to create override');
            }
            break;
        case 'setup-eslint':
            const result = manager.setupESLintForCurrentRepo();
            console.log(result.message);
            process.exit(result.success ? 0 : 1);
            break;
        case 'rules':
            try {
                const RulesManager = require('./rules-manager.js');
                const rulesManager = new RulesManager();
                console.log(rulesManager.generateRulesSummary());
            } catch (error) {
                console.error('Error loading rules:', error.message);
            }
            break;
        case 'query':
            const query = process.argv.slice(3).join(' ');
            if (!query) {
                console.log('Usage: node enhanced-memory-manager.js query "your natural language query"');
                process.exit(1);
            }
            try {
                const NaturalLanguageQueryEngine = require('./natural-language-query-engine.js');
                const queryEngine = new NaturalLanguageQueryEngine();
                queryEngine.queryNaturalLanguage(query).then(result => {
                    console.log(result.response);
                }).catch(console.error);
            } catch (error) {
                console.error('Error executing query:', error.message);
            }
            break;
        case 'predict':
            const context = JSON.parse(process.argv[3] || '{}');
            const intent = process.argv[4] || '';
            try {
                const IntelligentMemoryContext = require('./intelligent-memory-context.js');
                const intelligentMemory = new IntelligentMemoryContext();
                intelligentMemory.predictNextPattern(context, intent).then(predictions => {
                    console.log('Predicted patterns:');
                    predictions.forEach((pred, i) => {
                        console.log(`${i + 1}. ${pred.pattern.name || 'Pattern'} (${(pred.confidence * 100).toFixed(0)}%)`);
                        console.log(`   Reason: ${pred.reasoning}`);
                    });
                }).catch(console.error);
            } catch (error) {
                console.error('Error predicting patterns:', error.message);
            }
            break;
        default:
            console.log('Usage: node enhanced-memory-manager.js [info|load|summary|update|override|setup-eslint|rules|query|predict]');
            console.log('');
            console.log('Commands:');
            console.log('  info        - Show memory information');
            console.log('  load        - Load effective memory');
            console.log('  summary     - Generate context summary with rules');
            console.log('  rules       - Show comprehensive rules and standards');
            console.log('  setup-eslint - Setup ESLint for current repository');
            console.log('  update      - Update memory patterns');
            console.log('  override    - Create global pattern overrides');
            console.log('  query "..."  - Natural language memory search');
            console.log('  predict <context> <intent> - Predict next patterns');
    }
}

module.exports = EnhancedMemoryManager;