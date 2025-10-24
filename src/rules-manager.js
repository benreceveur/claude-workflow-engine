#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { getMemoryDir } = require('./utils/runtime-paths.js');

class RulesManager {
    constructor(options = {}) {
        this.memoryDir = getMemoryDir();
        this.rulesPath = options.rulesPath || path.join(this.memoryDir, 'rules.json');
    }

    loadRules() {
        if (!fs.existsSync(this.rulesPath)) {
            return [];
        }

        try {
            const contents = fs.readFileSync(this.rulesPath, 'utf8');
            const parsed = JSON.parse(contents);
            if (Array.isArray(parsed)) {
                return parsed;
            }
            if (parsed && typeof parsed === 'object') {
                return Object.entries(parsed).map(([name, rule]) => ({
                    name,
                    description: typeof rule === 'string' ? rule : JSON.stringify(rule)
                }));
            }
        } catch (error) {
            return [];
        }

        return [];
    }

    generateRulesSummary() {
        const rules = this.loadRules();
        if (!rules.length) {
            return '### Rules Summary\n- No explicit repository rules configured. Apply default standards and memory patterns.';
        }

        const lines = rules.slice(0, 10).map(rule => {
            const description = rule.description || rule.statement || 'Follow repository standards.';
            return `- ${rule.name || 'Rule'}: ${description}`;
        });

        if (rules.length > 10) {
            lines.push(`- ... ${rules.length - 10} additional rules in ${this.rulesPath}`);
        }

        return `### Rules Summary\n${lines.join('\n')}`;
    }
}

module.exports = RulesManager;
