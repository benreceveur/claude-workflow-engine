/**
 * @fileoverview Standardized error handling for Skill execution
 * @module errors/skill-error
 * @author Claude Workflow Engine
 */

/**
 * Error codes for Skill execution failures
 * @enum {string}
 */
const SkillErrorCode = {
    SKILL_NOT_FOUND: 'SKILL_NOT_FOUND',
    INVALID_SKILL_NAME: 'INVALID_SKILL_NAME',
    INVALID_CONTEXT: 'INVALID_CONTEXT',
    SCRIPT_NOT_FOUND: 'SCRIPT_NOT_FOUND',
    EXECUTION_FAILED: 'EXECUTION_FAILED',
    EXECUTION_TIMEOUT: 'EXECUTION_TIMEOUT',
    CONCURRENT_LIMIT_REACHED: 'CONCURRENT_LIMIT_REACHED',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    PATH_TRAVERSAL_ATTEMPT: 'PATH_TRAVERSAL_ATTEMPT',
    UNAUTHORIZED_OPERATION: 'UNAUTHORIZED_OPERATION',
    RESOURCE_LIMIT_EXCEEDED: 'RESOURCE_LIMIT_EXCEEDED',
    INTERNAL_ERROR: 'INTERNAL_ERROR'
};

/**
 * Base error class for Skill execution errors
 * Provides structured error responses with consistent formatting
 *
 * @class SkillError
 * @extends Error
 */
class SkillError extends Error {
    /**
     * Create a new SkillError
     *
     * @param {string} message - Human-readable error message
     * @param {string} code - Error code from SkillErrorCode enum
     * @param {Object} [details={}] - Additional error context
     * @param {Error} [cause=null] - Original error that caused this error
     *
     * @example
     * throw new SkillError(
     *   'Skill not found',
     *   SkillErrorCode.SKILL_NOT_FOUND,
     *   { skillName: 'invalid-skill' }
     * );
     */
    constructor(message, code, details = {}, cause = null) {
        super(message);

        this.name = 'SkillError';
        this.code = code;
        this.details = details;
        this.cause = cause;
        this.timestamp = new Date().toISOString();

        // Maintain proper stack trace for debugging
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, SkillError);
        }
    }

    /**
     * Convert error to JSON-serializable object
     *
     * @returns {Object} Error object suitable for JSON serialization
     *
     * @example
     * const error = new SkillError('Test', SkillErrorCode.INTERNAL_ERROR);
     * console.log(JSON.stringify(error.toJSON()));
     */
    toJSON() {
        return {
            success: false,
            error: {
                name: this.name,
                message: this.message,
                code: this.code,
                details: this.details,
                timestamp: this.timestamp,
                stack: this.stack
            }
        };
    }

    /**
     * Check if error is recoverable (can retry operation)
     *
     * @returns {boolean} True if error is recoverable
     */
    isRecoverable() {
        const recoverableCodes = [
            SkillErrorCode.EXECUTION_TIMEOUT,
            SkillErrorCode.CONCURRENT_LIMIT_REACHED,
            SkillErrorCode.RESOURCE_LIMIT_EXCEEDED
        ];

        return recoverableCodes.includes(this.code);
    }

    /**
     * Check if error is a security violation
     *
     * @returns {boolean} True if error is security-related
     */
    isSecurityViolation() {
        const securityCodes = [
            SkillErrorCode.PATH_TRAVERSAL_ATTEMPT,
            SkillErrorCode.UNAUTHORIZED_OPERATION,
            SkillErrorCode.INVALID_SKILL_NAME
        ];

        return securityCodes.includes(this.code);
    }
}

/**
 * Validation error for invalid input
 * @class ValidationError
 * @extends SkillError
 */
class ValidationError extends SkillError {
    /**
     * Create a new ValidationError
     *
     * @param {string} message - Validation error message
     * @param {Object} [details={}] - Validation details (field, value, etc.)
     */
    constructor(message, details = {}) {
        super(message, SkillErrorCode.VALIDATION_ERROR, details);
        this.name = 'ValidationError';
    }
}

/**
 * Security violation error
 * @class SecurityError
 * @extends SkillError
 */
class SecurityError extends SkillError {
    /**
     * Create a new SecurityError
     *
     * @param {string} message - Security error message
     * @param {string} violationType - Type of security violation
     * @param {Object} [details={}] - Security incident details
     */
    constructor(message, violationType, details = {}) {
        const code = violationType === 'path_traversal'
            ? SkillErrorCode.PATH_TRAVERSAL_ATTEMPT
            : SkillErrorCode.UNAUTHORIZED_OPERATION;

        super(message, code, { violationType, ...details });
        this.name = 'SecurityError';
    }
}

/**
 * Execution timeout error
 * @class TimeoutError
 * @extends SkillError
 */
class TimeoutError extends SkillError {
    /**
     * Create a new TimeoutError
     *
     * @param {string} skillName - Name of skill that timed out
     * @param {number} timeout - Timeout duration in milliseconds
     */
    constructor(skillName, timeout) {
        super(
            `Skill execution timed out after ${timeout}ms`,
            SkillErrorCode.EXECUTION_TIMEOUT,
            { skillName, timeout }
        );
        this.name = 'TimeoutError';
    }
}

/**
 * Concurrent execution limit error
 * @class ConcurrencyError
 * @extends SkillError
 */
class ConcurrencyError extends SkillError {
    /**
     * Create a new ConcurrencyError
     *
     * @param {number} maxConcurrent - Maximum allowed concurrent executions
     * @param {number} current - Current number of executions
     */
    constructor(maxConcurrent, current) {
        super(
            `Maximum concurrent executions reached (${maxConcurrent})`,
            SkillErrorCode.CONCURRENT_LIMIT_REACHED,
            { maxConcurrent, current }
        );
        this.name = 'ConcurrencyError';
    }
}

/**
 * Wrap an unknown error in a SkillError
 *
 * @param {Error} error - Original error
 * @param {Object} [context={}] - Additional context
 * @returns {SkillError} Wrapped error
 *
 * @example
 * try {
 *   // risky operation
 * } catch (err) {
 *   throw wrapError(err, { operation: 'loadSkill' });
 * }
 */
function wrapError(error, context = {}) {
    if (error instanceof SkillError) {
        return error;
    }

    return new SkillError(
        error.message || 'Unknown error',
        SkillErrorCode.INTERNAL_ERROR,
        { originalError: error.name, ...context },
        error
    );
}

module.exports = {
    SkillError,
    SkillErrorCode,
    ValidationError,
    SecurityError,
    TimeoutError,
    ConcurrencyError,
    wrapError
};
