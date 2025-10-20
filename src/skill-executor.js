#!/usr/bin/env node

/**
 * Skill Executor v2.0
 * Executes Anthropic Skills with context and error handling
 * Enhanced with security validations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const InputValidator = require('./validators/input-validator');
const { logSkillExecution, logValidationFailure, logPathTraversalAttempt } = require('./logging/security-logger');

class SkillExecutor {
    constructor() {
        this.skillsDir = path.join(process.env.HOME, '.claude', 'skills');
        this.cacheDir = path.join(process.env.HOME, '.claude', 'memory', '.skill-cache');
        this.ensureCacheDir();

        // Security: Allowed script extensions
        this.allowedExtensions = ['.py', '.js', '.sh'];

        // Security: Execution limits
        this.maxConcurrentExecutions = 5;
        this.activeExecutions = new Set();
        this.maxExecutionTime = 60000; // 60 seconds
    }

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
            throw new Error(
                `Maximum concurrent executions reached (${this.maxConcurrentExecutions}). ` +
                `Please wait for other Skills to complete.`
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
                throw new Error(`Skill '${sanitizedSkillName}' not found in ${this.skillsDir}`);
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
            execution.error = {
                message: error.message,
                stack: error.stack
            };
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
     * Get path to Skill directory
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
     * Load Skill metadata from SKILL.md
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
     * Find main executable script in Skill
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
     * Execute script with context
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
     * Get cached result if available
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
     * Cache Skill result
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
     * Generate cache key from Skill name and context
     */
    generateCacheKey(skillName, context) {
        const crypto = require('crypto');
        const contextStr = JSON.stringify(context, Object.keys(context).sort());
        const hash = crypto.createHash('md5').update(skillName + contextStr).digest('hex');
        return `${skillName}-${hash}`;
    }

    /**
     * Log Skill execution
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
     * List available Skills
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
     * Load Skill metadata synchronously
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
        case 'execute':
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

        case 'list':
            const skills = executor.listSkills();
            console.log(JSON.stringify(skills, null, 2));
            break;

        case 'clear-cache':
            const cacheFiles = fs.readdirSync(executor.cacheDir);
            cacheFiles.forEach(file => {
                fs.unlinkSync(path.join(executor.cacheDir, file));
            });
            console.log(`Cleared ${cacheFiles.length} cached results`);
            break;

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
