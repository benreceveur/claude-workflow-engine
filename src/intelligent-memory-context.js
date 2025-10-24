#!/usr/bin/env node

const EnhancedMemoryManager = require('./enhanced-memory-manager.js');

class IntelligentMemoryContext {
    constructor(options = {}) {
        this.memoryManager = options.memoryManager || new EnhancedMemoryManager();
        this.limit = options.limit || 5;
    }

    async predictNextPattern(context = {}, intent = '') {
        const focus = intent || context.intent || context.topic || '';
        const query = focus || 'general';
        const matches = this.memoryManager.getRelevantContext(query, { limit: this.limit });

        if (!matches.length) {
            return [];
        }

        return matches.map((match, index) => ({
            pattern: {
                name: match.path,
                preview: match.preview
            },
            confidence: Math.max(0.1, (matches.length - index) / matches.length),
            reasoning: `Memory match for "${query}" scored ${(match.score * 100).toFixed(0)}%.`
        }));
    }
}

module.exports = IntelligentMemoryContext;
