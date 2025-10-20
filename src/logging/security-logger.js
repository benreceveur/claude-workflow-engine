/**
 * Security Audit Logger
 *
 * Logs all security-sensitive operations for audit and forensics:
 * - Skill executions
 * - File access attempts
 * - Git command executions
 * - Validation failures
 * - Authentication/authorization events
 *
 * @module logging/security-logger
 */

const fs = require('fs');
const path = require('path');

/**
 * Security event types
 */
const SecurityEventType = {
    SKILL_EXECUTION: 'SKILL_EXECUTION',
    SKILL_EXECUTION_FAILED: 'SKILL_EXECUTION_FAILED',
    VALIDATION_FAILURE: 'VALIDATION_FAILURE',
    PATH_TRAVERSAL_ATTEMPT: 'PATH_TRAVERSAL_ATTEMPT',
    COMMAND_INJECTION_ATTEMPT: 'COMMAND_INJECTION_ATTEMPT',
    FILE_ACCESS: 'FILE_ACCESS',
    FILE_ACCESS_DENIED: 'FILE_ACCESS_DENIED',
    GIT_COMMAND: 'GIT_COMMAND',
    UNAUTHORIZED_OPERATION: 'UNAUTHORIZED_OPERATION',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY'
};

/**
 * Security audit logger
 */
class SecurityAuditLog {
    constructor() {
        this.logDir = path.join(process.env.HOME, '.claude', 'logs');
        this.securityLogPath = path.join(this.logDir, 'security.log');
        this.alertLogPath = path.join(this.logDir, 'security-alerts.log');
        this.maxLogSize = 50 * 1024 * 1024; // 50MB
        this.ensureLogDirectory();
    }

    /**
     * Ensure log directory exists
     * @private
     */
    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    /**
     * Log a security event
     *
     * @param {string} eventType - Type of security event (use SecurityEventType)
     * @param {Object} details - Event details
     * @param {string} [severity='INFO'] - Event severity (INFO, WARN, ERROR, CRITICAL)
     *
     * @example
     * SecurityAuditLog.log('SKILL_EXECUTION', {
     *     skill: 'tech-debt-tracker',
     *     user: 'alice',
     *     success: true
     * }, 'INFO');
     */
    log(eventType, details = {}, severity = 'INFO') {
        const entry = {
            timestamp: new Date().toISOString(),
            eventType: eventType,
            severity: severity,
            user: process.env.USER || 'unknown',
            pid: process.pid,
            hostname: require('os').hostname(),
            details: details
        };

        // Write to main security log
        this.writeToLog(this.securityLogPath, entry);

        // Write critical events to alert log
        if (severity === 'CRITICAL' || severity === 'ERROR') {
            this.writeToLog(this.alertLogPath, entry);
        }

        // Console output for development (can be disabled in production)
        if (process.env.DEBUG_SECURITY === 'true') {
            console.error(`[SECURITY ${severity}] ${eventType}:`, JSON.stringify(details));
        }
    }

    /**
     * Write entry to log file with rotation
     * @private
     */
    writeToLog(logPath, entry) {
        try {
            // Check if log rotation is needed
            if (fs.existsSync(logPath)) {
                const stats = fs.statSync(logPath);
                if (stats.size > this.maxLogSize) {
                    this.rotateLog(logPath);
                }
            }

            // Append log entry (one JSON object per line)
            fs.appendFileSync(logPath, JSON.stringify(entry) + '\n');
        } catch (error) {
            // Fail gracefully - don't crash application if logging fails
            console.error('Failed to write security log:', error.message);
        }
    }

    /**
     * Rotate log file when it exceeds max size
     * @private
     */
    rotateLog(logPath) {
        try {
            const timestamp = new Date().toISOString().replace(/:/g, '-');
            const rotatedPath = `${logPath}.${timestamp}`;
            fs.renameSync(logPath, rotatedPath);

            // Compress old logs (optional - requires gzip)
            // execSync(`gzip "${rotatedPath}"`);
        } catch (error) {
            console.error('Failed to rotate log:', error.message);
        }
    }

    /**
     * Log skill execution
     */
    logSkillExecution(skillName, context, success, executionTimeMs, error = null) {
        this.log(
            success ? SecurityEventType.SKILL_EXECUTION : SecurityEventType.SKILL_EXECUTION_FAILED,
            {
                skill: skillName,
                operation: context.operation || 'unknown',
                executionTimeMs: executionTimeMs,
                success: success,
                error: error ? error.message : null
            },
            success ? 'INFO' : 'WARN'
        );
    }

    /**
     * Log validation failure (potential attack)
     */
    logValidationFailure(validationType, value, reason) {
        this.log(
            SecurityEventType.VALIDATION_FAILURE,
            {
                validationType: validationType,
                value: value,
                reason: reason
            },
            'WARN'
        );
    }

    /**
     * Log path traversal attempt (CRITICAL)
     */
    logPathTraversalAttempt(path, context = {}) {
        this.log(
            SecurityEventType.PATH_TRAVERSAL_ATTEMPT,
            {
                attemptedPath: path,
                context: context
            },
            'CRITICAL'
        );
    }

    /**
     * Log command injection attempt (CRITICAL)
     */
    logCommandInjectionAttempt(command, context = {}) {
        this.log(
            SecurityEventType.COMMAND_INJECTION_ATTEMPT,
            {
                attemptedCommand: command,
                context: context
            },
            'CRITICAL'
        );
    }

    /**
     * Log file access
     */
    logFileAccess(filePath, operation, allowed = true) {
        this.log(
            allowed ? SecurityEventType.FILE_ACCESS : SecurityEventType.FILE_ACCESS_DENIED,
            {
                filePath: filePath,
                operation: operation,
                allowed: allowed
            },
            allowed ? 'INFO' : 'WARN'
        );
    }

    /**
     * Log git command execution
     */
    logGitCommand(command, args, success) {
        this.log(
            SecurityEventType.GIT_COMMAND,
            {
                command: command,
                args: args,
                success: success
            },
            'INFO'
        );
    }

    /**
     * Log unauthorized operation attempt
     */
    logUnauthorizedOperation(operation, context = {}) {
        this.log(
            SecurityEventType.UNAUTHORIZED_OPERATION,
            {
                operation: operation,
                context: context
            },
            'ERROR'
        );
    }

    /**
     * Log rate limit exceeded
     */
    logRateLimitExceeded(resource, limit, current) {
        this.log(
            SecurityEventType.RATE_LIMIT_EXCEEDED,
            {
                resource: resource,
                limit: limit,
                current: current
            },
            'WARN'
        );
    }

    /**
     * Search security logs for events
     *
     * @param {Object} filters - Search filters
     * @param {number} [limit=100] - Maximum number of results
     * @returns {Array} Matching log entries
     *
     * @example
     * const events = securityLog.search({
     *     eventType: 'PATH_TRAVERSAL_ATTEMPT',
     *     severity: 'CRITICAL',
     *     since: '2025-01-01'
     * });
     */
    search(filters = {}, limit = 100) {
        if (!fs.existsSync(this.securityLogPath)) {
            return [];
        }

        const lines = fs.readFileSync(this.securityLogPath, 'utf8').split('\n');
        const results = [];

        for (const line of lines) {
            if (!line.trim()) continue;

            try {
                const entry = JSON.parse(line);

                // Apply filters
                let matches = true;
                for (const [key, value] of Object.entries(filters)) {
                    if (key === 'since') {
                        matches = matches && new Date(entry.timestamp) >= new Date(value);
                    } else if (key === 'until') {
                        matches = matches && new Date(entry.timestamp) <= new Date(value);
                    } else {
                        matches = matches && entry[key] === value;
                    }
                }

                if (matches) {
                    results.push(entry);
                    if (results.length >= limit) break;
                }
            } catch (error) {
                // Skip malformed log lines
                continue;
            }
        }

        return results;
    }

    /**
     * Get security statistics
     *
     * @param {string} [since] - Start date (ISO format)
     * @returns {Object} Statistics summary
     */
    getStatistics(since = null) {
        const allEvents = this.search(since ? { since } : {}, Infinity);

        const stats = {
            totalEvents: allEvents.length,
            byType: {},
            bySeverity: {},
            failures: 0,
            criticalEvents: 0,
            recentEvents: allEvents.slice(-10)
        };

        for (const event of allEvents) {
            // Count by type
            stats.byType[event.eventType] = (stats.byType[event.eventType] || 0) + 1;

            // Count by severity
            stats.bySeverity[event.severity] = (stats.bySeverity[event.severity] || 0) + 1;

            // Count failures
            if (event.severity === 'ERROR' || event.severity === 'CRITICAL') {
                stats.failures++;
            }

            // Count critical events
            if (event.severity === 'CRITICAL') {
                stats.criticalEvents++;
            }
        }

        return stats;
    }
}

// Singleton instance
const securityLog = new SecurityAuditLog();

module.exports = {
    SecurityAuditLog,
    SecurityEventType,
    // Export singleton instance for convenience
    log: securityLog.log.bind(securityLog),
    logSkillExecution: securityLog.logSkillExecution.bind(securityLog),
    logValidationFailure: securityLog.logValidationFailure.bind(securityLog),
    logPathTraversalAttempt: securityLog.logPathTraversalAttempt.bind(securityLog),
    logCommandInjectionAttempt: securityLog.logCommandInjectionAttempt.bind(securityLog),
    logFileAccess: securityLog.logFileAccess.bind(securityLog),
    logGitCommand: securityLog.logGitCommand.bind(securityLog),
    logUnauthorizedOperation: securityLog.logUnauthorizedOperation.bind(securityLog),
    logRateLimitExceeded: securityLog.logRateLimitExceeded.bind(securityLog),
    search: securityLog.search.bind(securityLog),
    getStatistics: securityLog.getStatistics.bind(securityLog)
};
