#!/usr/bin/env node

const DEFAULT_MIN_SCORE = 0.05;

class VectorMemoryIndex {
    constructor(documents = []) {
        this.documents = [];
        this.termDocumentFrequency = new Map();
        this.vocabularySize = 0;

        if (documents.length > 0) {
            this.addDocuments(documents);
            this.finalize();
        }
    }

    static tokenize(text) {
        if (!text) return [];
        return text
            .toString()
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(Boolean);
    }

    addDocuments(documents) {
        documents.forEach(doc => this.addDocument(doc));
    }

    addDocument({ id, text, payload }) {
        const tokens = VectorMemoryIndex.tokenize(text);
        if (tokens.length === 0) {
            return;
        }

        const termFrequency = new Map();
        tokens.forEach(token => {
            termFrequency.set(token, (termFrequency.get(token) || 0) + 1);
        });

        const uniqueTokens = new Set(tokens);
        uniqueTokens.forEach(token => {
            this.termDocumentFrequency.set(
                token,
                (this.termDocumentFrequency.get(token) || 0) + 1
            );
        });

        this.documents.push({
            id,
            text,
            payload,
            termFrequency,
            tokenCount: tokens.length,
            vector: null,
            norm: 0
        });
    }

    finalize() {
        const totalDocuments = this.documents.length;
        if (totalDocuments === 0) {
            return;
        }

        this.vocabularySize = this.termDocumentFrequency.size;
        this.inverseDocumentFrequency = new Map();

        this.termDocumentFrequency.forEach((docCount, token) => {
            const idf = Math.log(1 + totalDocuments / (1 + docCount));
            this.inverseDocumentFrequency.set(token, idf);
        });

        this.documents.forEach(doc => {
            const vector = new Map();
            let normSquared = 0;
            const maxFrequency = Math.max(...doc.termFrequency.values());

            doc.termFrequency.forEach((frequency, token) => {
                const idf = this.inverseDocumentFrequency.get(token);
                if (!idf) return;

                const tf = 0.5 + (0.5 * frequency) / maxFrequency;
                const weight = tf * idf;
                vector.set(token, weight);
                normSquared += weight * weight;
            });

            doc.vector = vector;
            doc.norm = Math.sqrt(normSquared);
        });
    }

    query(queryText, options = {}) {
        const { limit = 5, minScore = DEFAULT_MIN_SCORE } = options;
        if (!this.documents.length) {
            return [];
        }

        const tokens = VectorMemoryIndex.tokenize(queryText);
        if (tokens.length === 0) {
            return [];
        }

        const termFrequency = new Map();
        tokens.forEach(token => {
            termFrequency.set(token, (termFrequency.get(token) || 0) + 1);
        });

        const maxFrequency = Math.max(...termFrequency.values());
        const queryVector = new Map();
        let queryNormSquared = 0;

        termFrequency.forEach((frequency, token) => {
            const idf = this.inverseDocumentFrequency.get(token);
            if (!idf) return;

            const tf = 0.5 + (0.5 * frequency) / maxFrequency;
            const weight = tf * idf;
            queryVector.set(token, weight);
            queryNormSquared += weight * weight;
        });

        const queryNorm = Math.sqrt(queryNormSquared);
        if (queryNorm === 0) {
            return [];
        }

        const results = [];

        this.documents.forEach(doc => {
            if (!doc.vector || doc.norm === 0) {
                return;
            }

            let dotProduct = 0;
            queryVector.forEach((weight, token) => {
                const docWeight = doc.vector.get(token);
                if (docWeight) {
                    dotProduct += weight * docWeight;
                }
            });

            if (dotProduct === 0) {
                return;
            }

            const score = dotProduct / (doc.norm * queryNorm);
            if (score >= minScore) {
                results.push({
                    id: doc.id,
                    score,
                    text: doc.text,
                    payload: doc.payload
                });
            }
        });

        return results
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }
}

module.exports = VectorMemoryIndex;
