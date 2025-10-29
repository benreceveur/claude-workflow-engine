// Stub for historical booster - provides basic functionality
// This module is optional and provides historical context boosting

class HistoricalBooster {
    constructor(options = {}) {
        this.debug = options.debug || false;
        this.history = [];
        this.config = {
            weights: {
                keyword: 1.0,
                historical: 0.0
            }
        };
    }

    isReady() {
        // Stub implementation - always ready
        return false; // Return false to skip historical boosting
    }

    boost(candidates) {
        // No-op implementation - returns candidates unchanged
        return candidates;
    }

    recordSelection(skill, context) {
        // No-op implementation - for future use
        this.history.push({ skill, context, timestamp: Date.now() });
    }

    logSelection(data) {
        // No-op implementation - for logging skill selections
        if (this.debug) {
            console.log('Historical booster: logged selection', data);
        }
    }
}

module.exports = HistoricalBooster;
