#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { getSkillsDir } = require('./utils/runtime-paths.js');
const HistoricalBooster = require('./historical-booster.js');

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

        // Phase 2: Historical boosting
        this.enableHistorical = options.enableHistorical !== false;
        this.historicalBooster = null;
        if (this.enableHistorical) {
            try {
                this.historicalBooster = new HistoricalBooster({ debug: options.debug || false });
            } catch (error) {
                console.warn('Historical booster not available:', error.message);
                this.historicalBooster = null;
            }
        }
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

    /**
     * Calculate weighted score for new keyword format
     * Supports both old (array) and new (weighted object) formats
     */
    calculateWeightedScore(input, keywords, phrases, baseConfidence) {
        let totalScore = 0;
        let maxScore = 0;
        const matchedKeywords = [];

        // New format: { primary: [], secondary: [], context: [] }
        if (keywords && typeof keywords === 'object' && !Array.isArray(keywords)) {
            // Primary keywords (weight: 1.0)
            if (keywords.primary) {
                keywords.primary.forEach(keyword => {
                    const normalized = normalize(keyword);
                    maxScore += 1.0;
                    if (normalized && input.includes(normalized)) {
                        totalScore += 1.0;
                        matchedKeywords.push(normalized);
                    }
                });
            }

            // Secondary keywords (weight: 0.5)
            if (keywords.secondary) {
                keywords.secondary.forEach(keyword => {
                    const normalized = normalize(keyword);
                    maxScore += 0.5;
                    if (normalized && input.includes(normalized)) {
                        totalScore += 0.5;
                        matchedKeywords.push(normalized);
                    }
                });
            }

            // Context keywords (weight: 0.3)
            if (keywords.context) {
                keywords.context.forEach(keyword => {
                    const normalized = normalize(keyword);
                    maxScore += 0.3;
                    if (normalized && input.includes(normalized)) {
                        totalScore += 0.3;
                        matchedKeywords.push(normalized);
                    }
                });
            }

            // Phrase bonuses (bonus: 0.2 each, doesn't affect maxScore)
            if (phrases && Array.isArray(phrases)) {
                phrases.forEach(phrase => {
                    const normalized = normalize(phrase);
                    if (normalized && input.includes(normalized)) {
                        totalScore += 0.2;
                        matchedKeywords.push(normalized);
                    }
                });
            }

            // Avoid division by zero
            if (maxScore === 0) {
                return { score: 0, matches: [] };
            }

            const rawScore = totalScore / maxScore;
            const confidence = Number((rawScore * baseConfidence).toFixed(3));

            return {
                score: confidence,
                matches: matchedKeywords
            };
        }

        // Old format: simple array of keywords (backwards compatible)
        if (Array.isArray(keywords)) {
            const normalizedKeywords = keywords.map(normalize);
            const matches = normalizedKeywords.filter(keyword => keyword && input.includes(keyword));

            if (matches.length === 0) {
                return { score: 0, matches: [] };
            }

            const keywordScore = matches.length / normalizedKeywords.length;
            const confidence = Number((keywordScore * baseConfidence).toFixed(3));

            return {
                score: confidence,
                matches: matches
            };
        }

        return { score: 0, matches: [] };
    }

    /**
     * Combine keyword score and historical boost (Phase 2)
     */
    combineScores(keywordScore, historicalScore) {
        if (!this.historicalBooster) {
            return keywordScore;
        }

        const config = this.historicalBooster.config;
        const keywordWeight = config.weights.keyword;
        const historicalWeight = config.weights.historical;

        const combined = (keywordScore * keywordWeight) + (historicalScore * historicalWeight);
        return Number(combined.toFixed(3));
    }

    /**
     * Count how many primary keywords matched (Phase 3 - Strong match detection)
     */
    countPrimaryKeywordMatches(input, keywords) {
        if (!keywords || typeof keywords !== 'object' || !keywords.primary) {
            return 0;
        }

        let count = 0;
        keywords.primary.forEach(keyword => {
            const normalized = normalize(keyword);
            if (normalized && input.includes(normalized)) {
                count++;
            }
        });

        return count;
    }

    detectSkill(userInput, options = {}) {
        const input = normalize(userInput);
        if (!input || !Object.keys(this.manifest).length) {
            return null;
        }

        let bestMatch = null;
        let bestScore = 0;

        Object.entries(this.manifest).forEach(([skill, data]) => {
            const keywords = data.keywords;
            const phrases = data.phrases || [];
            const baseConfidence = data.confidence || 0.85;

            // Phase 1: Keyword matching
            const keywordResult = this.calculateWeightedScore(input, keywords, phrases, baseConfidence);
            const keywordScore = keywordResult.score;

            if (keywordScore === 0 || keywordResult.matches.length === 0) {
                return;
            }

            // Phase 2: Historical boosting
            let historicalScore = 0;
            if (this.enableHistorical && this.historicalBooster && this.historicalBooster.isReady()) {
                historicalScore = this.historicalBooster.queryHistoricalBoost(userInput, 'skill', skill);
            }

            // Combine scores
            let finalScore = this.combineScores(keywordScore, historicalScore);

            // Phase 3: Strong match boost (helps skills compete with high-confidence agents)
            const matchCount = keywordResult.matches.length;
            const primaryKeywordCount = this.countPrimaryKeywordMatches(input, keywords);

            // Apply boost for strong matches
            let boost = 0;
            if (matchCount >= 5 || primaryKeywordCount >= 2) {
                boost = 0.15;  // 15% boost for very strong matches
            } else if (matchCount >= 3 || primaryKeywordCount >= 1) {
                boost = 0.10;  // 10% boost for strong matches
            }

            if (boost > 0) {
                finalScore = Math.min(1.0, finalScore + boost);
            }

            if (finalScore > bestScore) {
                bestScore = finalScore;
                bestMatch = {
                    skill,
                    confidence: finalScore,
                    keywordScore: keywordScore,
                    historicalScore: historicalScore,
                    matchedKeywords: keywordResult.matches,
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

        // Phase 2: Log selection for future learning
        if (this.historicalBooster && bestMatch.confidence > 0) {
            this.historicalBooster.logSelection({
                type: 'skill',
                prompt: userInput,
                selected: bestMatch.skill,
                confidence: bestMatch.confidence,
                keywordScore: bestMatch.keywordScore,
                historicalScore: bestMatch.historicalScore
            });
        }

        return bestMatch;
    }
}

module.exports = SkillRouter;
