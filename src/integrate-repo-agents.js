#!/usr/bin/env node

const RepositoryDetector = require('./repo-detector.js');

class RepoAgentIntegrator {
    constructor(options = {}) {
        this.detector = options.detector || new RepositoryDetector();
    }

    getCurrentRepository() {
        return this.detector.getCurrentRepository();
    }

    enhanceAgentScores(input, scores) {
        if (!scores || typeof scores !== 'object') {
            return scores;
        }

        const repository = this.getCurrentRepository();
        if (!repository) {
            return scores;
        }

        const adjustments = { ...scores };
        const repoName = repository.name.toLowerCase();
        const keywords = [`/${repoName}/`, repoName];
        const boost = (agent, amount = 0.05) => {
            if (typeof adjustments[agent] === 'number') {
                adjustments[agent] = Math.min(1, adjustments[agent] + amount);
            }
        };

        if (keywords.some(token => /front|ui|web/.test(token))) {
            boost('frontend-engineer', 0.1);
        }

        if (keywords.some(token => /api|service|backend/.test(token))) {
            boost('backend-engineer', 0.1);
        }

        if (keywords.some(token => /ops|deploy|infra/.test(token))) {
            boost('devops-engineer', 0.1);
        }

        return adjustments;
    }
}

module.exports = RepoAgentIntegrator;
