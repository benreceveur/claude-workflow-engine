/**
 * @fileoverview Security Audit Logger - Comprehensive logging for security events.
 * Tracks all security-sensitive operations with structured logging and alerting.
 * @module logging/security-logger
 * @author Claude Workflow Engine Team
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const { getLogsDir } = require('../utils/runtime-paths.js');

/**
 * Enumeration of security event types for categorizing log entries.
 *
 * @enum {string}
 * @readonly
 *
 * @property {string} SKILL_EXECUTION - Successful skill execution
 * @property {string} SKILL_EXECUTION_FAILED - Failed skill execution
 * @property {string} VALIDATION_FAILURE - Input validation failure
 * @property {string} PATH_TRAVERSAL_ATTEMPT - Detected path traversal attempt
 * @property {string} COMMAND_INJECTION_ATTEMPT - Detected command injection attempt
 * @property {string} FILE_ACCESS - File system access
 * @property {string} FILE_ACCESS_DENIED - Denied file access
 * @property {string} GIT_COMMAND - Git command execution
 * @property {string} UNAUTHORIZED_OPERATION - Unauthorized operation attempt
 * @property {string} RATE_LIMIT_EXCEEDED - Rate limit violation
 * @property {string} SUSPICIOUS_ACTIVITY - Generic suspicious activity
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
 * Manages security audit logging with automatic rotation and alerting.
 *
 * @class SecurityAuditLog
 * @classdesc Singleton logger for security events. Writes structured JSON logs
 * with automatic rotation, separate alert logs for critical events, and search
 * capabilities. All timestamps are in ISO 8601 format.
 *
 * @property {string} logDir - Directory for log files
 * @property {string} securityLogPath - Path to main security log
 * @property {string} alertLogPath - Path to high-priority alert log
 * @property {number} maxLogSize - Maximum log size before rotation (50MB)
 *
 * @example
 * const logger = new SecurityAuditLog();
 * logger.log('SKILL_EXECUTION', { skill: 'test', success: true }, 'INFO');
 *
 * // Search logs
 * const events = logger.search({ severity: 'CRITICAL' }, 10);
 *
 * // Get statistics
 * const stats = logger.getStatistics('2025-01-01');
 */
class SecurityAuditLog {
    /**
     * Creates a new SecurityAuditLog instance.
     * Initializes log directories and file paths.
     *
     * @constructor
     */
    constructor() {
        /**
         * @type {string}
         * @description Directory for all log files
         */
        this.logDir = getLogsDir();

        /**
         * @type {string}
         * @description Path to main security log file
         */
        this.securityLogPath = path.join(this.logDir, 'security.log');

        /**
         * @type {string}
         * @description Path to high-priority alert log
         */
        this.alertLogPath = path.join(this.logDir, 'security-alerts.log');

        /**
         * @type {number}
         * @description Maximum log size before rotation (50MB)
         */
        this.maxLogSize = 50 * 1024 * 1024;

        this.ensureLogDirectory();
    }

    /**
     * Ensures the log directory exists, creating it if necessary.
     *
     * @private
     * @returns {void}
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
     * Writes a log entry to file with automatic rotation when size limit is reached.
     *
     * @private
     * @param {string} logPath - Absolute path to log file
     * @param {Object} entry - Log entry object (will be stringified)
     * @returns {void}
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
            if (process.env.DEBUG_SECURITY === 'true') {
                console.error('Failed to write security log:', error.message);
            }
        }
    }

    /**
     * Rotates a log file by renaming it with a timestamp.
     * Called automatically when log file exceeds maxLogSize.
     *
     * @private
     * @param {string} logPath - Absolute path to log file to rotate
     * @returns {void}
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
     * Logs a Skill execution event with performance metrics.
     *
     * @param {string} skillName - Name of the executed Skill
     * @param {Object} context - Execution context object
     * @param {boolean} success - Whether execution succeeded
     * @param {number} executionTimeMs - Execution duration in milliseconds
     * @param {Object|null} [error=null] - Error object if execution failed
     * @returns {void}
     *
     * @example
     * logSkillExecution('tech-debt-tracker', { operation: 'scan' }, true, 1234);
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
     * Logs an input validation failure (potential security threat).
     *
     * @param {string} validationType - Type of validation that failed
     * @param {string} value - The invalid value that was rejected
     * @param {string} reason - Reason for validation failure
     * @returns {void}
     *
     * @example
     * logValidationFailure('skill_name', 'invalid; name', 'Contains illegal characters');
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
     * Logs a path traversal attempt (CRITICAL security event).
     *
     * @param {string} path - The path that triggered the security alert
     * @param {Object} [context={}] - Additional context about the attempt
     * @returns {void}
     *
     * @example
     * logPathTraversalAttempt('../../../etc/passwd', { operation: 'file_read' });
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
     * Logs a command injection attempt (CRITICAL security event).
     *
     * @param {string} command - The command that triggered the security alert
     * @param {Object} [context={}] - Additional context about the attempt
     * @returns {void}
     *
     * @example
     * logCommandInjectionAttempt('ls; rm -rf /', { source: 'user_input' });
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
     * Logs a file system access attempt.
     *
     * @param {string} filePath - Path to the file being accessed
     * @param {string} operation - Type of operation (read, write, delete, etc.)
     * @param {boolean} [allowed=true] - Whether access was permitted
     * @returns {void}
     *
     * @example
     * logFileAccess('/path/to/file', 'read', true);
     * logFileAccess('/restricted/file', 'write', false);
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
     * Logs a Git command execution for audit trail.
     *
     * @param {string} command - Git command name (e.g., 'rev-parse', 'remote')
     * @param {string[]} args - Command arguments
     * @param {boolean} success - Whether command executed successfully
     * @returns {void}
     *
     * @example
     * logGitCommand('rev-parse', ['--show-toplevel'], true);
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
     * Logs an unauthorized operation attempt.
     *
     * @param {string} operation - Name of the unauthorized operation
     * @param {Object} [context={}] - Additional context about the attempt
     * @returns {void}
     *
     * @example
     * logUnauthorizedOperation('delete_system_file', { user: 'guest', file: '/etc/hosts' });
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
     * Logs a rate limit violation.
     *
     * @param {string} resource - Resource being rate-limited (e.g., 'skill_execution')
     * @param {number} limit - The rate limit threshold
     * @param {number} current - Current usage count
     * @returns {void}
     *
     * @example
     * logRateLimitExceeded('skill_execution', 5, 6);
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
     * Generates security statistics from logged events.
     *
     * @param {string|null} [since=null] - Start date in ISO format (e.g., '2025-01-01')
     * @returns {Object} Statistics summary with event counts and breakdowns
     * @returns {number} return.totalEvents - Total number of events
     * @returns {Object} return.byType - Event counts grouped by type
     * @returns {Object} return.bySeverity - Event counts grouped by severity
     * @returns {number} return.failures - Count of ERROR/CRITICAL events
     * @returns {number} return.criticalEvents - Count of CRITICAL events only
     * @returns {Array} return.recentEvents - Last 10 events
     *
     * @example
     * const stats = securityLog.getStatistics('2025-01-01');
     * console.log(`Total events: ${stats.totalEvents}`);
     * console.log(`Critical: ${stats.criticalEvents}`);
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
