#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const RepositoryDetector = require('./repo-detector.js');
const VectorMemoryIndex = require('./vector-memory-index.js');
const { PersistentVectorIndex, hashDocument } = require('./index/persistent-index.js');
const { FEATURE_FLAGS } = require('./index/config.js');
const { getMemoryDir } = require('./utils/runtime-paths.js');

const MAX_PREVIEW_LENGTH = 280;

class EnhancedMemoryManager {
    constructor() {
        this.detector = new RepositoryDetector();
        this.memoryDir = getMemoryDir();
        this.globalMemoryPath = path.join(this.memoryDir, 'global-memory.json');
        this.currentRepo = this.detector.getCurrentRepository();
        this.repoPaths = this.currentRepo ? this.detector.ensureRepositoryMemory(this.currentRepo) : null;
        this.scopeKey = this.currentRepo ? `repo-${this.currentRepo.hash}` : 'global';
        this.persistentIndex = null;
        this.lastPersistentVersion = null;
        this.cache = {
            version: null,
            effective: null,
            entries: null,
            index: null
        };

        if (FEATURE_FLAGS.persistentIndex) {
            try {
                this.persistentIndex = new PersistentVectorIndex({ scope: this.scopeKey });
            } catch (error) {
                this.persistentIndex = null;
                this.lastPersistentVersion = null;
            }
        }
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

    getMemoryVersion() {
        const markers = [];

        try {
            const stats = fs.statSync(this.globalMemoryPath);
            markers.push(`g:${stats.mtimeMs}`);
        } catch {
            markers.push('g:missing');
        }

        if (this.repoPaths) {
            ['memoryPath', 'overridesPath', 'metadataPath'].forEach(key => {
                const target = this.repoPaths[key];
                try {
                    const stats = fs.statSync(target);
                    markers.push(`${key}:${stats.mtimeMs}`);
                } catch {
                    markers.push(`${key}:missing`);
                }
            });
        } else {
            markers.push('repo:none');
        }

        return markers.join('|');
    }

    buildEffectiveMemory() {
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

    getCachedData() {
        const version = this.getMemoryVersion();
        if (this.cache.version === version && this.cache.effective && this.cache.index) {
            return this.cache;
        }

        const effective = this.buildEffectiveMemory();
        const entries = this.flattenMemoryEntries(effective.memory);
        const index = new VectorMemoryIndex(entries);

        if (this.persistentIndex && this.persistentIndex.isAvailable()) {
            if (this.lastPersistentVersion !== version) {
                const docs = entries.map(entry => ({
                    id: `${this.scopeKey}:${entry.id}`,
                    text: entry.text,
                    metadata: {
                        path: entry.payload?.path,
                        preview: entry.payload?.preview,
                        type: entry.payload?.type,
                        source: effective.source,
                    },
                    hash: hashDocument(entry.text, this.persistentIndex.model),
                }));

                this.persistentIndex.upsertDocuments(docs);
                this.lastPersistentVersion = version;
            }
        }

        this.cache = { version, effective, entries, index };
        return this.cache;
    }

    getEffectiveMemory() {
        return this.getCachedData().effective;
    }

    invalidateCache() {
        this.cache = {
            version: null,
            effective: null,
            entries: null,
            index: null
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

    summarizeValue(value, depth = 0) {
        if (value === null || value === undefined) return String(value);
        if (typeof value === 'string') {
            if (value.length <= MAX_PREVIEW_LENGTH) return value;
            return `${value.slice(0, MAX_PREVIEW_LENGTH)}…`;
        }

        if (typeof value === 'number' || typeof value === 'boolean') {
            return String(value);
        }

        if (Array.isArray(value)) {
            if (depth > 1) {
                return `[array(${value.length})]`;
            }
            const previewItems = value.slice(0, 4).map(item => this.summarizeValue(item, depth + 1));
            const suffix = value.length > 4 ? '…' : '';
            return `[${previewItems.join(', ')}${suffix}]`;
        }

        if (typeof value === 'object') {
            if (depth > 1) {
                return '{…}';
            }
            const keys = Object.keys(value);
            const previewEntries = keys.slice(0, 4).map(key => `${key}: ${this.summarizeValue(value[key], depth + 1)}`);
            const suffix = keys.length > 4 ? ', …' : '';
            return `{${previewEntries.join(', ')}${suffix}}`;
        }

        return '';
    }

    flattenMemoryEntries(memory) {
        const entries = [];
        const visit = (node, pathSegments = []) => {
            if (node === null || node === undefined) {
                return;
            }

            const pathString = pathSegments.join('.');
            const shouldRecord = pathSegments.length > 0;

            if (typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') {
                if (shouldRecord) {
                    const preview = this.summarizeValue(node);
                    entries.push({
                        id: pathString,
                        text: `${pathString}: ${preview}`,
                        payload: {
                            path: pathString,
                            preview,
                            type: typeof node
                        }
                    });
                }
                return;
            }

            if (Array.isArray(node)) {
                if (shouldRecord && node.length > 0) {
                    const preview = this.summarizeValue(node);
                    entries.push({
                        id: pathString,
                        text: `${pathString}: ${preview}`,
                        payload: {
                            path: pathString,
                            preview,
                            type: 'array'
                        }
                    });
                }

                node.forEach((item, index) => {
                    visit(item, [...pathSegments, index.toString()]);
                });
                return;
            }

            if (typeof node === 'object') {
                if (shouldRecord && Object.keys(node).length > 0) {
                    const preview = this.summarizeValue(node);
                    entries.push({
                        id: pathString,
                        text: `${pathString}: ${preview}`,
                        payload: {
                            path: pathString,
                            preview,
                            type: 'object'
                        }
                    });
                }

                Object.entries(node).forEach(([key, value]) => {
                    visit(value, [...pathSegments, key]);
                });
            }
        };

        visit(memory, []);
        return entries;
    }

    buildLinesFromValue(value, limit = 3) {
        if (value === null || value === undefined) {
            return [];
        }

        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            return [`- ${this.summarizeValue(value)}`];
        }

        if (Array.isArray(value)) {
            const lines = value.slice(0, limit).map(item => `- ${this.summarizeValue(item)}`);
            if (value.length > limit) {
                lines.push(`- ... ${value.length - limit} more`);
            }
            return lines;
        }

        if (typeof value === 'object') {
            const entries = Object.entries(value);
            const lines = entries.slice(0, limit).map(([key, val]) => `- ${key}: ${this.summarizeValue(val)}`);
            if (entries.length > limit) {
                lines.push(`- ... ${entries.length - limit} more`);
            }
            return lines;
        }

        return [];
    }

    filterPatternBasics(patterns) {
        if (!patterns || typeof patterns !== 'object') {
            return null;
        }

        const filtered = {};
        Object.entries(patterns).forEach(([key, value]) => {
            if (!['enforcement_rules', 'shared_services_pattern', 'code_review_practice'].includes(key)) {
                filtered[key] = value;
            }
        });

        return Object.keys(filtered).length > 0 ? filtered : null;
    }

    getRelevantContext(query, options = {}) {
        if (!query || typeof query !== 'string') {
            return [];
        }

        const cache = this.getCachedData();
        const entries = cache.entries;
        if (entries.length === 0) {
            return [];
        }

        const limit = options.limit || 6;
        let results = [];

        if (this.persistentIndex && this.persistentIndex.isAvailable()) {
            results = this.persistentIndex.search(query, { limit });
        }

        if (!results || results.length === 0) {
            results = cache.index.query(query, { limit });
            return results.map(result => ({
                path: result.payload.path,
                preview: result.payload.preview,
                score: Number(result.score.toFixed(3)),
                type: result.payload.type
            }));
        }

        return results.map(item => ({
            path: item.metadata?.path || item.id,
            preview: item.metadata?.preview,
            score: Number(item.score.toFixed(3)),
            type: item.metadata?.type || 'unknown',
        }));
    }

    parseSummaryArguments(args = []) {
        const options = {};
        for (let i = 0; i < args.length; i += 1) {
            const arg = args[i];
            if (arg === '--query' && i + 1 < args.length) {
                options.query = args[i + 1] || '';
                i += 1;
                continue;
            }

            if (arg === '--max-matches' && i + 1 < args.length) {
                const parsed = parseInt(args[i + 1], 10);
                if (Number.isFinite(parsed) && parsed > 0) {
                    options.maxMatches = parsed;
                }
                i += 1;
                continue;
            }

            if (arg === '--max-entries' && i + 1 < args.length) {
                const parsed = parseInt(args[i + 1], 10);
                if (Number.isFinite(parsed) && parsed > 0) {
                    options.maxSectionEntries = parsed;
                }
                i += 1;
                continue;
            }

            if (arg === '--max-sections' && i + 1 < args.length) {
                const parsed = parseInt(args[i + 1], 10);
                if (Number.isFinite(parsed) && parsed >= 0) {
                    options.maxOptionalSections = parsed;
                }
                i += 1;
            }
        }

        return options;
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
        this.invalidateCache();
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
        this.invalidateCache();
    }

    createOverride(globalKey, newValue) {
        if (!this.repoPaths) return false;

        const overrides = JSON.parse(fs.readFileSync(this.repoPaths.overridesPath, 'utf8'));
        overrides[globalKey] = newValue;
        fs.writeFileSync(this.repoPaths.overridesPath, JSON.stringify(overrides, null, 2));
        this.invalidateCache();
        return true;
    }

    getMemoryInfo() {
        const effective = this.getCachedData().effective;
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

    generateContextSummary(options = {}) {
        const {
            query = null,
            maxMatches = 5,
            maxSectionEntries = 3,
            maxOptionalSections = 4
        } = options;

        const cache = this.getCachedData();
        const effective = cache.effective;
        const info = this.getMemoryInfo();

        let summary = `## Memory Context\n`;
        summary += `Repository: ${info.currentRepository}\n`;
        summary += `Source: ${info.memorySource} (${info.totalPatterns} patterns)\n\n`;

        const sections = [];

        if (query) {
            const matches = this.getRelevantContext(query, { limit: maxMatches });
            if (matches.length > 0) {
                const lines = matches.map(match => `- ${match.path} (${(match.score * 100).toFixed(0)}%): ${match.preview}`);
                sections.push({
                    title: `Top Matches for "${query}"`,
                    lines,
                    priority: true
                });
            }
        }

        const enforcementRules = effective.memory.patterns?.enforcement_rules;
        if (enforcementRules?.rules?.length) {
            const lines = enforcementRules.rules.slice(0, maxSectionEntries).map(rule => `- ${rule}`);
            if (enforcementRules.rules.length > maxSectionEntries) {
                lines.push(`- ... ${enforcementRules.rules.length - maxSectionEntries} more rules`);
            }
            sections.push({
                title: 'Critical Enforcement Rules',
                lines,
                priority: true
            });
        }

        const sharedPattern = effective.memory.patterns?.shared_services_pattern;
        if (sharedPattern) {
            const lines = [];
            if (sharedPattern.description) {
                lines.push(`- ${this.summarizeValue(sharedPattern.description)}`);
            }
            if (sharedPattern.implementation && typeof sharedPattern.implementation === 'object') {
                const implEntries = Object.entries(sharedPattern.implementation);
                implEntries.slice(0, maxSectionEntries).forEach(([key, value]) => {
                    lines.push(`- ${key}: ${this.summarizeValue(value)}`);
                });
                if (implEntries.length > maxSectionEntries) {
                    lines.push(`- ... ${implEntries.length - maxSectionEntries} more details`);
                }
            }
            sections.push({
                title: 'Shared Services Pattern',
                lines,
                priority: true
            });
        }

        const codeReview = effective.memory.patterns?.code_review_practice;
        if (codeReview) {
            const lines = [];
            if (codeReview.review_before_recommendations) {
                lines.push(`- Requirement: ${this.summarizeValue(codeReview.review_before_recommendations)}`);
            }
            if (codeReview.rationale) {
                lines.push(`- Rationale: ${this.summarizeValue(codeReview.rationale)}`);
            }
            sections.push({
                title: 'Code Review Practice',
                lines,
                priority: true
            });
        }

        const standards = effective.memory.standards?.global_enforcement;
        if (standards) {
            const lines = [];
            Object.entries(standards).slice(0, maxSectionEntries).forEach(([category, value]) => {
                if (typeof value === 'object' && value !== null) {
                    const subEntries = Object.entries(value)
                        .slice(0, maxSectionEntries)
                        .map(([key, val]) => `${key.replace(/_/g, ' ')}: ${this.summarizeValue(val)}`)
                        .join('; ');
                    lines.push(`- ${category.replace(/_/g, ' ')} → ${subEntries}`);
                } else {
                    lines.push(`- ${category.replace(/_/g, ' ')}: ${this.summarizeValue(value)}`);
                }
            });
            sections.push({
                title: 'Global Standards',
                lines,
                priority: true
            });
        }

        const optionalSections = [];

        const filteredPatterns = this.filterPatternBasics(effective.memory.patterns);
        if (filteredPatterns) {
            optionalSections.push({
                title: 'Patterns',
                lines: this.buildLinesFromValue(filteredPatterns, maxSectionEntries)
            });
        }

        if (effective.memory.decisions) {
            optionalSections.push({
                title: 'Decisions',
                lines: this.buildLinesFromValue(effective.memory.decisions, maxSectionEntries)
            });
        }

        if (effective.memory.libraries) {
            optionalSections.push({
                title: 'Libraries',
                lines: this.buildLinesFromValue(effective.memory.libraries, maxSectionEntries)
            });
        }

        if (effective.memory.agents) {
            optionalSections.push({
                title: 'Agents',
                lines: this.buildLinesFromValue(effective.memory.agents, maxSectionEntries)
            });
        }

        optionalSections
            .filter(section => section.lines.length > 0)
            .slice(0, maxOptionalSections)
            .forEach(section => sections.push(section));

        sections.forEach(section => {
            if (section.lines.length === 0) return;
            summary += `### ${section.title}\n`;
            section.lines.forEach(line => {
                summary += `${line}\n`;
            });
            summary += '\n';
        });

        return summary.trimEnd();
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

module.exports = EnhancedMemoryManager;

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
        case 'summary': {
            const summaryOptions = manager.parseSummaryArguments(process.argv.slice(3));
            console.log(manager.generateContextSummary(summaryOptions));
            break;
        }
        case 'update': {
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
        }
        case 'override': {
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
        }
        case 'setup-eslint': {
            const result = manager.setupESLintForCurrentRepo();
            console.log(result.message);
            process.exit(result.success ? 0 : 1);
            break;
        }
        case 'rules': {
            try {
                const RulesManager = require('./rules-manager.js');
                const rulesManager = new RulesManager();
                console.log(rulesManager.generateRulesSummary());
            } catch (error) {
                console.error('Error loading rules:', error.message);
            }
            break;
        }
        case 'query': {
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
        }
        case 'relevant': {
            const searchQuery = process.argv[3];
            const limitArg = process.argv[4] ? parseInt(process.argv[4], 10) : undefined;
            if (!searchQuery) {
                console.log('Usage: node enhanced-memory-manager.js relevant "search terms" [limit]');
                process.exit(1);
            }
            try {
                const matches = manager.getRelevantContext(searchQuery, {
                    limit: Number.isFinite(limitArg) ? limitArg : 5
                });
                console.log(JSON.stringify({ query: searchQuery, matches }, null, 2));
            } catch (error) {
                console.error('Error searching memory:', error.message);
            }
            break;
        }
        case 'predict': {
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
        }
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
            console.log('  relevant "..." [limit] - Vector search for top memory entries');
            console.log('  predict <context> <intent> - Predict next patterns');
    }
}
