/**
 * @fileoverview Input Validation Framework - Comprehensive validation for security.
 * Prevents command injection, path traversal, prototype pollution, and other vulnerabilities.
 * @module validators/input-validator
 * @author Claude Workflow Engine Team
 * @version 1.0.0
 */

const path = require('path');
const fs = require('fs');
const { resolveBaseDir } = require('../utils/runtime-paths.js');

/**
 * Provides comprehensive input validation for all user-provided data.
 *
 * @class InputValidator
 * @classdesc Static utility class for validating and sanitizing inputs to prevent
 * security vulnerabilities including command injection, path traversal, prototype
 * pollution, and malformed data. All methods are static and throw descriptive errors
 * on validation failure.
 *
 * @example
 * // Validate skill name
 * const skillName = InputValidator.sanitizeSkillName('my-skill');
 *
 * // Validate file path
 * const safePath = InputValidator.sanitizeFilePath('/path/to/file');
 *
 * // Sanitize context object
 * const safeContext = InputValidator.sanitizeContext({ operation: 'scan' });
 */
class InputValidator {
    /**
     * Validate and sanitize skill name
     *
     * Skill names must:
     * - Contain only lowercase letters, numbers, and hyphens
     * - Start with a letter
     * - Be between 3 and 50 characters
     *
     * @param {string} name - Skill name to validate
     * @returns {string} Sanitized skill name
     * @throws {Error} If skill name format is invalid
     *
     * @example
     * InputValidator.sanitizeSkillName('tech-debt-tracker'); // Returns: 'tech-debt-tracker'
     * InputValidator.sanitizeSkillName('skill; rm -rf /'); // Throws: Invalid skill name format
     */
    static sanitizeSkillName(name) {
        if (!name || typeof name !== 'string') {
            throw new Error('Skill name must be a non-empty string');
        }

        // Check format: lowercase letters, numbers, hyphens only
        const validFormat = /^[a-z][a-z0-9-]{2,49}$/;
        if (!validFormat.test(name)) {
            throw new Error(
                `Invalid skill name format: "${name}". ` +
                'Must contain only lowercase letters, numbers, and hyphens, ' +
                'start with a letter, and be 3-50 characters long.'
            );
        }

        // Prevent reserved names
        const reserved = ['system', 'admin', 'root', 'config'];
        if (reserved.includes(name)) {
            throw new Error(`Skill name "${name}" is reserved`);
        }

        return name;
    }

    /**
     * Validate and sanitize file path to prevent path traversal
     *
     * Ensures:
     * - Path is within allowed directory (default: ~/.claude)
     * - No path traversal patterns (../)
     * - Path is absolute
     *
     * @param {string} filepath - File path to validate
     * @param {string} [allowedRoot] - Root directory to restrict access (default: ~/.claude)
     * @param {boolean} [mustExist=false] - Whether file must exist
     * @returns {string} Resolved absolute path
     * @throws {Error} If path is invalid or outside allowed directory
     *
     * @example
     * InputValidator.sanitizeFilePath('/home/user/.claude/skills/test');
     * // Returns: '/home/user/.claude/skills/test'
     *
     * InputValidator.sanitizeFilePath('../../../etc/passwd');
     * // Throws: Path outside allowed directory
     */
    static sanitizeFilePath(filepath, allowedRoot = null, mustExist = false) {
        if (!filepath || typeof filepath !== 'string') {
            throw new Error('File path must be a non-empty string');
        }

        // Default allowed root is ~/.claude
        const defaultRoot = resolveBaseDir();
        const allowed = path.resolve(allowedRoot || defaultRoot);

        // Resolve to absolute path
        const resolved = path.resolve(filepath);

        // Check if path is within allowed directory
        if (!resolved.startsWith(allowed)) {
            throw new Error(
                `Path outside allowed directory. ` +
                `Path: ${resolved}, Allowed: ${allowed}`
            );
        }

        // Check for path traversal patterns
        if (filepath.includes('..')) {
            throw new Error('Path traversal detected: ".." not allowed');
        }

        // Optionally check if file exists
        if (mustExist && !fs.existsSync(resolved)) {
            throw new Error(`Path does not exist: ${resolved}`);
        }

        return resolved;
    }

    /**
     * Sanitize context object to prevent prototype pollution
     *
     * Removes dangerous properties:
     * - __proto__
     * - constructor
     * - prototype
     *
     * @param {Object} context - Context object to sanitize
     * @returns {Object} Sanitized context object
     * @throws {Error} If context is not a plain object
     *
     * @example
     * const ctx = { operation: 'scan', __proto__: { isAdmin: true } };
     * const safe = InputValidator.sanitizeContext(ctx);
     * // Returns: { operation: 'scan' }
     */
    static sanitizeContext(context) {
        if (!context || typeof context !== 'object' || Array.isArray(context)) {
            throw new Error('Context must be a plain object');
        }

        // Deep clone to avoid mutation
        const sanitized = JSON.parse(JSON.stringify(context));

        // Remove dangerous properties at all levels
        const dangerous = ['__proto__', 'constructor', 'prototype'];

        const removeDangerous = (obj) => {
            if (!obj || typeof obj !== 'object') return;

            dangerous.forEach(key => {
                delete obj[key];
            });

            // Recursively clean nested objects
            Object.keys(obj).forEach(key => {
                if (typeof obj[key] === 'object' && obj[key] !== null) {
                    removeDangerous(obj[key]);
                }
            });
        };

        removeDangerous(sanitized);
        return sanitized;
    }

    /**
     * Validate operation name against allowed list
     *
     * @param {string} operation - Operation name to validate
     * @param {string[]} allowedOperations - List of allowed operations
     * @returns {string} Validated operation name
     * @throws {Error} If operation is not in allowed list
     *
     * @example
     * InputValidator.validateOperation('scan', ['scan', 'analyze']);
     * // Returns: 'scan'
     *
     * InputValidator.validateOperation('delete', ['scan', 'analyze']);
     * // Throws: Invalid operation
     */
    static validateOperation(operation, allowedOperations) {
        if (!operation || typeof operation !== 'string') {
            throw new Error('Operation must be a non-empty string');
        }

        if (!Array.isArray(allowedOperations) || allowedOperations.length === 0) {
            throw new Error('Allowed operations list is required');
        }

        if (!allowedOperations.includes(operation)) {
            throw new Error(
                `Invalid operation: "${operation}". ` +
                `Allowed: ${allowedOperations.join(', ')}`
            );
        }

        return operation;
    }

    /**
     * Validate file extension against allowed list
     *
     * @param {string} filename - Filename to check
     * @param {string[]} allowedExtensions - List of allowed extensions (e.g., ['.py', '.js'])
     * @returns {string} File extension
     * @throws {Error} If extension is not allowed
     *
     * @example
     * InputValidator.validateFileExtension('script.py', ['.py', '.js']);
     * // Returns: '.py'
     *
     * InputValidator.validateFileExtension('malicious.exe', ['.py', '.js']);
     * // Throws: Unsupported file extension
     */
    static validateFileExtension(filename, allowedExtensions) {
        if (!filename || typeof filename !== 'string') {
            throw new Error('Filename must be a non-empty string');
        }

        const ext = path.extname(filename);

        if (!ext) {
            throw new Error(`File has no extension: ${filename}`);
        }

        if (!allowedExtensions.includes(ext)) {
            throw new Error(
                `Unsupported file extension: "${ext}". ` +
                `Allowed: ${allowedExtensions.join(', ')}`
            );
        }

        return ext;
    }

    /**
     * Validate string against regex pattern
     *
     * @param {string} value - String to validate
     * @param {RegExp} pattern - Regular expression pattern
     * @param {string} fieldName - Name of field for error messages
     * @returns {string} Validated string
     * @throws {Error} If string doesn't match pattern
     *
     * @example
     * InputValidator.validatePattern('abc123', /^[a-z0-9]+$/, 'username');
     * // Returns: 'abc123'
     *
     * InputValidator.validatePattern('abc@123', /^[a-z0-9]+$/, 'username');
     * // Throws: Invalid username format
     */
    static validatePattern(value, pattern, fieldName = 'value') {
        if (!value || typeof value !== 'string') {
            throw new Error(`${fieldName} must be a non-empty string`);
        }

        if (!(pattern instanceof RegExp)) {
            throw new Error('Pattern must be a RegExp');
        }

        if (!pattern.test(value)) {
            throw new Error(
                `Invalid ${fieldName} format: "${value}". ` +
                `Must match pattern: ${pattern}`
            );
        }

        return value;
    }

    /**
     * Validate integer within range
     *
     * @param {number} value - Number to validate
     * @param {number} min - Minimum value (inclusive)
     * @param {number} max - Maximum value (inclusive)
     * @param {string} fieldName - Name of field for error messages
     * @returns {number} Validated integer
     * @throws {Error} If value is not an integer or outside range
     *
     * @example
     * InputValidator.validateInteger(5, 1, 10, 'timeout');
     * // Returns: 5
     *
     * InputValidator.validateInteger(15, 1, 10, 'timeout');
     * // Throws: timeout must be between 1 and 10
     */
    static validateInteger(value, min, max, fieldName = 'value') {
        if (typeof value !== 'number' || !Number.isInteger(value)) {
            throw new Error(`${fieldName} must be an integer`);
        }

        if (value < min || value > max) {
            throw new Error(
                `${fieldName} must be between ${min} and ${max}, got ${value}`
            );
        }

        return value;
    }

    /**
     * Validate array contains only allowed values
     *
     * @param {Array} array - Array to validate
     * @param {Array} allowedValues - List of allowed values
     * @param {string} fieldName - Name of field for error messages
     * @returns {Array} Validated array
     * @throws {Error} If array contains invalid values
     *
     * @example
     * InputValidator.validateArray(['aws', 'azure'], ['aws', 'azure', 'gcp'], 'providers');
     * // Returns: ['aws', 'azure']
     *
     * InputValidator.validateArray(['aws', 'invalid'], ['aws', 'azure'], 'providers');
     * // Throws: Invalid value in providers
     */
    static validateArray(array, allowedValues, fieldName = 'array') {
        if (!Array.isArray(array)) {
            throw new Error(`${fieldName} must be an array`);
        }

        const invalid = array.filter(val => !allowedValues.includes(val));

        if (invalid.length > 0) {
            throw new Error(
                `Invalid value in ${fieldName}: ${invalid.join(', ')}. ` +
                `Allowed: ${allowedValues.join(', ')}`
            );
        }

        return array;
    }

    /**
     * Validate required fields exist in object
     *
     * @param {Object} obj - Object to validate
     * @param {string[]} requiredFields - List of required field names
     * @returns {Object} Original object
     * @throws {Error} If any required field is missing
     *
     * @example
     * InputValidator.validateRequiredFields({ name: 'test', age: 30 }, ['name', 'age']);
     * // Returns: { name: 'test', age: 30 }
     *
     * InputValidator.validateRequiredFields({ name: 'test' }, ['name', 'age']);
     * // Throws: Missing required field: age
     */
    static validateRequiredFields(obj, requiredFields) {
        if (!obj || typeof obj !== 'object') {
            throw new Error('Object is required');
        }

        const missing = requiredFields.filter(field => !(field in obj));

        if (missing.length > 0) {
            throw new Error(`Missing required field(s): ${missing.join(', ')}`);
        }

        return obj;
    }
}

module.exports = InputValidator;
