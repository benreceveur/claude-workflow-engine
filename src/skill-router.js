#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getSkillsDir } = require('./utils/runtime-paths.js');

function safeReadJson(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            return null;
        }
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        return null;
    }
}

function normalize(text) {
    return (text || '')
        .toString()
        .toLowerCase();
}

class SkillRouter {
    constructor(options = {}) {
        this.skillsDir = getSkillsDir();
        this.manifestPath = path.join(this.skillsDir, 'skill-manifest.json');
        this.skillExecutor = options.skillExecutor || null;
        this.manifest = this.loadManifest();
    }

    loadManifest() {
        const manifest = safeReadJson(this.manifestPath) || {};

        // Auto-discover skills when no manifest entry is present
        try {
            const dirEntries = fs.readdirSync(this.skillsDir, { withFileTypes: true });
            dirEntries
                .filter(entry => entry.isDirectory() && entry.name !== 'common')
                .forEach(entry => {
                    if (!manifest[entry.name]) {
                        manifest[entry.name] = {
                            description: `${entry.name} skill (auto-discovered)`
                        };
                    }
                });
        } catch (error) {
            // ignore discovery errors
        }

        return manifest;
    }

    listManifestSkills() {
        return Object.entries(this.manifest).map(([skill, data]) => ({
            name: skill,
            description: data.description,
            keywords: data.keywords || [],
        }));
    }

    detectSkill(userInput, options = {}) {
        const input = normalize(userInput);
        if (!input || !Object.keys(this.manifest).length) {
            return null;
        }

        let bestMatch = null;
        let bestScore = 0;

        Object.entries(this.manifest).forEach(([skill, data]) => {
            const keywords = (data.keywords || []).map(normalize);
            if (keywords.length === 0) {
                return;
            }

            const matches = keywords.filter(keyword => keyword && input.includes(keyword));
            if (matches.length === 0) {
                return;
            }

            const keywordScore = matches.length / keywords.length;
            const weight = data.confidence || 0.85;
            const confidence = Number((keywordScore * weight).toFixed(3));

            if (confidence > bestScore) {
                bestScore = confidence;
                bestMatch = {
                    skill,
                    confidence,
                    matchedKeywords: matches,
                    description: data.description,
                    defaultContext: data.defaultContext || null,
                    operations: data.operations || [],
                };
            }
        });

        if (!bestMatch) {
            return null;
        }

        if (this.skillExecutor && typeof this.skillExecutor.getSkillPath === 'function') {
            const pathExists = this.skillExecutor.getSkillPath(bestMatch.skill);
            if (!pathExists) {
                bestMatch.available = false;
                bestMatch.reason = 'Skill manifest entry found but skill is not installed';
                bestMatch.confidence = 0;
                return bestMatch;
            }
        }

        bestMatch.available = true;
        bestMatch.reason = bestMatch.reason || `Matched ${bestMatch.matchedKeywords.length} keywords`;
        return bestMatch;
    }
}

module.exports = SkillRouter;
