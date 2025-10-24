#!/usr/bin/env node

const EnhancedMemoryManager = require('./enhanced-memory-manager.js');

class NaturalLanguageQueryEngine {
    constructor(options = {}) {
        this.memoryManager = options.memoryManager || new EnhancedMemoryManager();
        this.limit = options.limit || 6;
    }

    async queryNaturalLanguage(query) {
        if (!query || !query.trim()) {
            return {
                response: 'Provide search terms to query repository memory.',
                matches: []
            };
        }

        const trimmed = query.trim();
        const matches = this.memoryManager.getRelevantContext(trimmed, { limit: this.limit });

        if (!matches.length) {
            return {
                response: `No memory entries matched "${trimmed}".`,
                matches: []
            };
        }

        const lines = matches.map(match => {
            const score = (match.score * 100).toFixed(0);
            return `- ${match.path} (${score}%): ${match.preview}`;
        });

        return {
            response: `Top memory matches for "${trimmed}":\n${lines.join('\n')}`,
            matches
        };
    }
}

module.exports = NaturalLanguageQueryEngine;
