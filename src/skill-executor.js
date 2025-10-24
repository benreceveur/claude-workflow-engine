#!/usr/bin/env node

/**
 * @fileoverview Skill Executor v2.0 - Executes Anthropic Skills with context and error handling.
 * Provides secure execution of Skills with validation, caching, and comprehensive logging.
 * @module skill-executor
 * @author Claude Workflow Engine Team
 * @version 2.0.0
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const InputValidator = require('./validators/input-validator');
const { logSkillExecution, logValidationFailure, logPathTraversalAttempt } = require('./logging/security-logger');
const {
    SkillError,
    SkillErrorCode,
    ConcurrencyError,
    wrapError
} = require('./errors/skill-error');
const { getSkillsDir, getMemoryDir } = require('./utils/runtime-paths.js');

/**
 * Executes Anthropic Skills with security validations and caching.
 *
 * @class SkillExecutor
 * @classdesc Main executor class for running Skills. Handles skill discovery, validation,
 * execution, caching, and logging. Includes security measures to prevent path traversal,
 * command injection, and resource exhaustion.
 *
 * @property {string} skillsDir - Directory containing all Skills
 * @property {string} cacheDir - Directory for cached results
 * @property {string[]} allowedExtensions - Permitted script file extensions
 * @property {number} maxConcurrentExecutions - Maximum parallel executions allowed
 * @property {Set<string>} activeExecutions - Currently running execution IDs
 * @property {number} maxExecutionTime - Maximum execution time in milliseconds
 *
 * @example
 * const executor = new SkillExecutor();
 * const result = await executor.execute('tech-debt-tracker', {
 *   operation: 'scan',
 *   repository: '/path/to/repo'
 * }, { useCache: true });
 * console.log(result.success ? result.result : result.error);
 */
class SkillExecutor {
    /**
     * Creates a new SkillExecutor instance.
     * Initializes directories and security settings.
     *
     * @constructor
     */
    constructor() {
        /**
         * @type {string}
         * @description Directory containing all Skills
         */
        this.skillsDir = getSkillsDir();

        /**
         * @type {string}
         * @description Directory for cached execution results
         */
        this.cacheDir = path.join(getMemoryDir(), '.skill-cache');
        this.ensureCacheDir();

        /**
         * @type {string[]}
         * @description Security: Allowed script extensions
         */
        this.allowedExtensions = ['.py', '.js', '.sh'];

        /**
         * @type {number}
         * @description Security: Maximum number of concurrent executions
         */
        this.maxConcurrentExecutions = 5;

        /**
         * @type {Set<string>}
         * @description Tracking set for active executions
         */
        this.activeExecutions = new Set();

        /**
         * @type {number}
         * @description Security: Maximum execution time (60 seconds)
         */
        this.maxExecutionTime = 60000;
    }

    /**
     * Ensures the cache directory exists, creating it if necessary.
     *
     * @private
     * @returns {void}
     */
    ensureCacheDir() {
        if (!fs.existsSync(this.cacheDir)) {
            fs.mkdirSync(this.cacheDir, { recursive: true });
        }
    }

    /**
     * Validate script path for security
     *
     * Ensures:
     * - Script is within skills directory
     * - Extension is allowed (.py, .js, .sh)
     * - No path traversal attempts
     * - File exists and is readable
     *
     * @param {string} scriptPath - Path to script file
     * @returns {string} Validated absolute path
     * @throws {Error} If path is invalid or insecure
     * @private
     */
    validateScriptPath(scriptPath) {
        try {
            // Security: Validate file extension
            InputValidator.validateFileExtension(scriptPath, this.allowedExtensions);

            // Security: Ensure script is within skills directory
            const resolved = path.resolve(scriptPath);
            const skillsDirResolved = path.resolve(this.skillsDir);

            if (!resolved.startsWith(skillsDirResolved)) {
                // Security: Log path traversal attempt
                logPathTraversalAttempt(scriptPath, { resolved, skillsDirResolved });
                throw new Error(
                    `Script path outside skills directory. ` +
                    `Path: ${resolved}, Required prefix: ${skillsDirResolved}`
                );
            }

            // Security: Check for path traversal
            if (scriptPath.includes('..')) {
                // Security: Log path traversal attempt
                logPathTraversalAttempt(scriptPath, { reason: 'Contains ..' });
                throw new Error('Path traversal detected: ".." not allowed');
            }

            // Verify file exists
            if (!fs.existsSync(resolved)) {
                throw new Error(`Script file not found: ${resolved}`);
            }

            // Verify it's a file, not a directory
            const stats = fs.statSync(resolved);
            if (!stats.isFile()) {
                throw new Error(`Script path is not a file: ${resolved}`);
            }

            return resolved;
        } catch (error) {
            // Security: Log validation failure
            logValidationFailure('script_path', scriptPath, error.message);
            throw error;
        }
    }

    /**
     * Execute a Skill
     *
     * @param {string} skillName - Name of the Skill to execute
     * @param {object} context - Context object to pass to Skill
     * @param {object} options - Execution options
     * @returns {Promise<object>} Skill execution result
     */
    async execute(skillName, context = {}, options = {}) {
        const startTime = Date.now();

        // Security: Validate and sanitize skill name
        const sanitizedSkillName = InputValidator.sanitizeSkillName(skillName);

        // Security: Sanitize context to prevent prototype pollution
        const sanitizedContext = InputValidator.sanitizeContext(context);

        // Security: Check concurrent execution limit
        if (this.activeExecutions.size >= this.maxConcurrentExecutions) {
            throw new ConcurrencyError(
                this.maxConcurrentExecutions,
                this.activeExecutions.size
            );
        }

        const executionId = `${sanitizedSkillName}-${Date.now()}`;
        this.activeExecutions.add(executionId);

        const execution = {
            skill: sanitizedSkillName,
            context: sanitizedContext,
            timestamp: new Date().toISOString(),
            success: false,
            result: null,
            error: null,
            executionTimeMs: 0
        };

        try {
            // 1. Validate Skill exists
            const skillPath = this.getSkillPath(sanitizedSkillName);
            if (!skillPath) {
                throw new SkillError(
                    `Skill '${sanitizedSkillName}' not found`,
                    SkillErrorCode.SKILL_NOT_FOUND,
                    {
                        skillName: sanitizedSkillName,
                        searchPath: this.skillsDir
                    }
                );
            }

            // 2. Load Skill metadata
            const metadata = await this.loadSkillMetadata(skillPath);
            execution.metadata = metadata;

            // 3. Check cache if enabled
            if (options.useCache) {
                const cached = this.getCachedResult(sanitizedSkillName, sanitizedContext);
                if (cached) {
                    execution.success = true;
                    execution.result = cached;
                    execution.cached = true;
                    execution.executionTimeMs = Date.now() - startTime;
                    return execution;
                }
            }

            // 4. Find and validate Skill script
            const scriptPath = this.findMainScript(skillPath);
            if (!scriptPath) {
                throw new Error(`No executable script found in ${skillPath}/scripts/`);
            }

            // Security: Validate script path before execution
            const validatedScriptPath = this.validateScriptPath(scriptPath);

            // 5. Execute Skill script with sanitized context
            const result = await this.executeScript(validatedScriptPath, sanitizedContext, options);

            // 6. Cache result if successful
            if (options.useCache && result) {
                this.cacheResult(sanitizedSkillName, sanitizedContext, result);
            }

            execution.success = true;
            execution.result = result;
            execution.scriptPath = validatedScriptPath;

        } catch (error) {
            execution.success = false;

            // Wrap error in SkillError if not already
            const skillError = wrapError(error, {
                skill: sanitizedSkillName,
                operation: 'execute'
            });

            execution.error = skillError.toJSON().error;
        } finally {
            // Security: Always remove from active executions
            this.activeExecutions.delete(executionId);

            // Security: Log skill execution
            execution.executionTimeMs = Date.now() - startTime;
            logSkillExecution(
                sanitizedSkillName,
                sanitizedContext,
                execution.success,
                execution.executionTimeMs,
                execution.error
            );
        }

        // Log execution (internal logging)
        this.logExecution(execution);

        return execution;
    }

    /**
     * Gets the absolute path to a Skill's directory and validates it exists.
     *
     * @param {string} skillName - Name of the Skill
     * @returns {string|null} Absolute path to Skill directory, or null if not found
     *
     * @example
     * const skillPath = executor.getSkillPath('tech-debt-tracker');
     * // Returns: '/Users/user/.claude/skills/tech-debt-tracker' or null
     */
    getSkillPath(skillName) {
        const skillPath = path.join(this.skillsDir, skillName);

        if (!fs.existsSync(skillPath)) {
            return null;
        }

        // Verify it's a valid Skill (has SKILL.md)
        const skillMdPath = path.join(skillPath, 'SKILL.md');
        if (!fs.existsSync(skillMdPath)) {
            return null;
        }

        return skillPath;
    }

    /**
     * Loads and parses Skill metadata from SKILL.md frontmatter.
     *
     * @async
     * @param {string} skillPath - Absolute path to Skill directory
     * @returns {Promise<Object>} Parsed metadata object with Skill information
     *
     * @example
     * const metadata = await executor.loadSkillMetadata('/path/to/skill');
     * // Returns: { name: 'tech-debt-tracker', version: '1.0', category: 'analysis', ... }
     */
    async loadSkillMetadata(skillPath) {
        const skillMdPath = path.join(skillPath, 'SKILL.md');
        const content = fs.readFileSync(skillMdPath, 'utf8');

        // Extract YAML frontmatter
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (!frontmatterMatch) {
            return { name: path.basename(skillPath) };
        }

        const yaml = frontmatterMatch[1];
        const metadata = {};

        yaml.split('\n').forEach(line => {
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
                const key = line.substring(0, colonIndex).trim();
                const value = line.substring(colonIndex + 1).trim();
                metadata[key] = value;
            }
        });

        return metadata;
    }

    /**
     * Finds the main executable script in a Skill's scripts directory.
     * Searches for common script names and falls back to first executable file.
     *
     * @param {string} skillPath - Absolute path to Skill directory
     * @returns {string|null} Absolute path to main script, or null if not found
     *
     * @example
     * const scriptPath = executor.findMainScript('/path/to/skill');
     * // Returns: '/path/to/skill/scripts/main.py' or null
     */
    findMainScript(skillPath) {
        const scriptsDir = path.join(skillPath, 'scripts');

        if (!fs.existsSync(scriptsDir)) {
            return null;
        }

        // Look for common script names
        const candidates = [
            'main.py',
            'main.js',
            'main.sh',
            'execute.py',
            'run.py',
            path.basename(skillPath) + '.py'
        ];

        for (const candidate of candidates) {
            const scriptPath = path.join(scriptsDir, candidate);
            if (fs.existsSync(scriptPath)) {
                return scriptPath;
            }
        }

        // Fallback: first executable file
        const files = fs.readdirSync(scriptsDir);
        for (const file of files) {
            const fullPath = path.join(scriptsDir, file);
            const stats = fs.statSync(fullPath);

            if (stats.isFile() && (stats.mode & 0o111)) {
                return fullPath;
            }
        }

        return null;
    }

    /**
     * Executes a script with provided context and options.
     * Determines interpreter based on file extension and passes context via environment variables.
     *
     * @async
     * @param {string} scriptPath - Absolute path to script file
     * @param {Object} context - Context object to pass to script
     * @param {Object} [options={}] - Execution options
     * @param {number} [options.timeout=30000] - Execution timeout in milliseconds
     * @returns {Promise<Object>} Script execution result (parsed JSON or plain output)
     * @throws {Error} If script execution fails or times out
     *
     * @example
     * const result = await executor.executeScript(
     *   '/path/to/script.py',
     *   { operation: 'scan', target: '/repo' },
     *   { timeout: 60000 }
     * );
     */
    async executeScript(scriptPath, context, options = {}) {
        const ext = path.extname(scriptPath);
        let command;
        let interpreter;

        // Determine interpreter
        if (ext === '.py') {
            interpreter = 'python3';
        } else if (ext === '.js') {
            interpreter = 'node';
        } else if (ext === '.sh') {
            interpreter = 'bash';
        } else {
            // Try to execute directly
            interpreter = null;
        }

        // Prepare context as JSON
        const contextJson = JSON.stringify(context);
        const contextFile = path.join(this.cacheDir, `context-${Date.now()}.json`);
        fs.writeFileSync(contextFile, contextJson);

        try {
            // Build command
            if (interpreter) {
                command = `${interpreter} "${scriptPath}"`;
            } else {
                command = `"${scriptPath}"`;
            }

            // Execute with environment variables
            const output = execSync(command, {
                encoding: 'utf8',
                stdio: 'pipe',
                env: {
                    ...process.env,
                    SKILL_CONTEXT: contextJson,
                    SKILL_CONTEXT_FILE: contextFile,
                    SKILL_CACHE_DIR: this.cacheDir
                },
                timeout: options.timeout || 30000, // 30 second default timeout
                maxBuffer: 10 * 1024 * 1024 // 10MB buffer
            });

            // Try to parse as JSON
            try {
                return JSON.parse(output);
            } catch {
                // Return as string if not JSON
                return { output: output.trim() };
            }

        } finally {
            // Cleanup context file
            if (fs.existsSync(contextFile)) {
                fs.unlinkSync(contextFile);
            }
        }
    }

    /**
     * Retrieves a cached Skill result if available and not expired.
     *
     * @param {string} skillName - Name of the Skill
     * @param {Object} context - Context object used for cache key generation
     * @returns {Object|null} Cached result if available and valid, null otherwise
     *
     * @example
     * const cached = executor.getCachedResult('tech-debt-tracker', { operation: 'scan' });
     * if (cached) {
     *   console.log('Using cached result:', cached);
     * }
     */
    getCachedResult(skillName, context) {
        const cacheKey = this.generateCacheKey(skillName, context);
        const cachePath = path.join(this.cacheDir, `${cacheKey}.json`);

        if (!fs.existsSync(cachePath)) {
            return null;
        }

        try {
            const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
            const age = Date.now() - cached.timestamp;
            const maxAge = cached.ttl || 300000; // 5 minutes default

            if (age < maxAge) {
                return cached.result;
            } else {
                // Cache expired, delete it
                fs.unlinkSync(cachePath);
                return null;
            }
        } catch {
            return null;
        }
    }

    /**
     * Caches a Skill execution result with TTL (time-to-live).
     *
     * @param {string} skillName - Name of the Skill
     * @param {Object} context - Context object used for cache key generation
     * @param {Object} result - Result to cache
     * @param {number} [ttl=300000] - Time-to-live in milliseconds (default: 5 minutes)
     * @returns {void}
     *
     * @example
     * executor.cacheResult('tech-debt-tracker', { operation: 'scan' }, resultData, 600000);
     */
    cacheResult(skillName, context, result, ttl = 300000) {
        const cacheKey = this.generateCacheKey(skillName, context);
        const cachePath = path.join(this.cacheDir, `${cacheKey}.json`);

        const cached = {
            skill: skillName,
            context: context,
            result: result,
            timestamp: Date.now(),
            ttl: ttl
        };

        fs.writeFileSync(cachePath, JSON.stringify(cached, null, 2));
    }

    /**
     * Generates a unique cache key from Skill name and context.
     * Uses MD5 hash of sorted context for consistency.
     *
     * @param {string} skillName - Name of the Skill
     * @param {Object} context - Context object
     * @returns {string} Cache key in format: skillName-hash
     *
     * @example
     * const key = executor.generateCacheKey('tech-debt-tracker', { operation: 'scan' });
     * // Returns: 'tech-debt-tracker-a1b2c3d4e5f6g7h8'
     */
    generateCacheKey(skillName, context) {
        const crypto = require('crypto');
        const contextStr = JSON.stringify(context, Object.keys(context).sort());
        const hash = crypto.createHash('md5').update(skillName + contextStr).digest('hex');
        return `${skillName}-${hash}`;
    }

    /**
     * Logs Skill execution details to persistent log file.
     *
     * @private
     * @param {Object} execution - Execution object with details
     * @param {string} execution.timestamp - ISO timestamp
     * @param {string} execution.skill - Skill name
     * @param {boolean} execution.success - Whether execution succeeded
     * @param {number} execution.executionTimeMs - Execution duration
     * @param {boolean} [execution.cached] - Whether result was from cache
     * @param {Object} [execution.error] - Error details if failed
     * @returns {void}
     */
    logExecution(execution) {
        const logPath = path.join(
            process.env.HOME,
            '.claude',
            'memory',
            'skill-execution.log'
        );

        const logEntry = {
            timestamp: execution.timestamp,
            skill: execution.skill,
            success: execution.success,
            executionTimeMs: execution.executionTimeMs,
            cached: execution.cached || false,
            error: execution.error?.message || null
        };

        try {
            fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
        } catch (error) {
            console.warn('Failed to log Skill execution:', error.message);
        }
    }

    /**
     * Lists all available Skills with their metadata.
     *
     * @returns {Array<Object>} Array of Skill objects with name, path, and metadata
     *
     * @example
     * const skills = executor.listSkills();
     * skills.forEach(skill => {
     *   console.log(`${skill.name}: ${skill.version || 'unknown'}`);
     * });
     */
    listSkills() {
        if (!fs.existsSync(this.skillsDir)) {
            return [];
        }

        const skills = [];
        const skillDirs = fs.readdirSync(this.skillsDir);

        for (const skillDir of skillDirs) {
            const skillPath = path.join(this.skillsDir, skillDir);
            const skillMdPath = path.join(skillPath, 'SKILL.md');

            if (fs.existsSync(skillMdPath) && fs.statSync(skillPath).isDirectory()) {
                try {
                    const metadata = this.loadSkillMetadataSync(skillMdPath);
                    skills.push({
                        name: skillDir,
                        path: skillPath,
                        ...metadata
                    });
                } catch (error) {
                    skills.push({
                        name: skillDir,
                        path: skillPath,
                        error: `Failed to load metadata: ${error.message}`
                    });
                }
            }
        }

        return skills;
    }

    /**
     * Loads Skill metadata synchronously from SKILL.md file.
     * Used by listSkills() for efficient batch loading.
     *
     * @param {string} skillMdPath - Absolute path to SKILL.md file
     * @returns {Object} Parsed metadata object
     *
     * @example
     * const metadata = executor.loadSkillMetadataSync('/path/to/skill/SKILL.md');
     */
    loadSkillMetadataSync(skillMdPath) {
        const content = fs.readFileSync(skillMdPath, 'utf8');
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

        if (!frontmatterMatch) {
            return {};
        }

        const yaml = frontmatterMatch[1];
        const metadata = {};

        yaml.split('\n').forEach(line => {
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
                const key = line.substring(0, colonIndex).trim();
                const value = line.substring(colonIndex + 1).trim();
                metadata[key] = value;
            }
        });

        return metadata;
    }
}

// CLI interface
if (require.main === module) {
    const executor = new SkillExecutor();
    const command = process.argv[2];

    switch (command) {
        case 'execute': {
            const skillName = process.argv[3];
            const contextArg = process.argv[4];

            if (!skillName) {
                console.error('Usage: skill-executor execute <skill-name> [context-json]');
                process.exit(1);
            }

            const context = contextArg ? JSON.parse(contextArg) : {};

            executor.execute(skillName, context, { useCache: true })
                .then(result => {
                    console.log(JSON.stringify(result, null, 2));
                    process.exit(result.success ? 0 : 1);
                })
                .catch(error => {
                    console.error('Execution error:', error);
                    process.exit(1);
                });
            break;
        }

        case 'list': {
            const skills = executor.listSkills();
            console.log(JSON.stringify(skills, null, 2));
            break;
        }

        case 'clear-cache': {
            const cacheFiles = fs.readdirSync(executor.cacheDir);
            cacheFiles.forEach(file => {
                fs.unlinkSync(path.join(executor.cacheDir, file));
            });
            console.log(`Cleared ${cacheFiles.length} cached results`);
            break;
        }

        default:
            console.log(`
Skill Executor v1.0

Usage:
  node skill-executor.js execute <skill-name> [context-json]
  node skill-executor.js list
  node skill-executor.js clear-cache

Examples:
  node skill-executor.js execute repo-detection
  node skill-executor.js execute memory-hygiene '{"mode":"compact"}'
  node skill-executor.js list
  node skill-executor.js clear-cache
            `);
    }
}

module.exports = SkillExecutor;
