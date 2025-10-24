#!/usr/bin/env node

class AgentLearningSystem {
    constructor(options = {}) {
        this.history = [];
        this.maxEntries = options.maxEntries || 50;
    }

    logDispatch(input, recommendation, context = {}) {
        if (!input || !recommendation) {
            return { recorded: false };
        }

        this.history.push({
            timestamp: new Date().toISOString(),
            input,
            recommendation,
            contextSummary: {
                fileCount: Array.isArray(context.filePaths) ? context.filePaths.length : 0
            }
        });

        if (this.history.length > this.maxEntries) {
            this.history.shift();
        }

        return { recorded: true };
    }
}

module.exports = AgentLearningSystem;
