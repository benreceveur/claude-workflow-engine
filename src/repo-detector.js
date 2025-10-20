#!/usr/bin/env node

/**
 * @fileoverview Repository Detector - Identifies and tracks Git repositories.
 * Provides secure Git operations and repository memory management.
 * @module repo-detector
 * @author Claude Workflow Engine Team
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const { logGitCommand, logCommandInjectionAttempt } = require('./logging/security-logger');

/**
 * Detects and manages Git repository information with secure command execution.
 *
 * @class RepositoryDetector
 * @classdesc Identifies Git repositories, creates unique identifiers, and manages
 * repository-specific memory. Includes security measures to prevent command injection
 * and unauthorized Git operations.
 *
 * @property {string} repoIndexPath - Path to repository index JSON file
 * @property {string[]} allowedGitCommands - Whitelist of permitted Git commands
 * @property {number} commandTimeout - Maximum execution time for Git commands
 * @property {number} maxBuffer - Maximum buffer size for command output
 *
 * @example
 * const detector = new RepositoryDetector();
 * const repo = detector.getCurrentRepository();
 * if (repo) {
 *   console.log(`Detected: ${repo.name} at ${repo.path}`);
 *   detector.ensureRepositoryMemory(repo);
 * }
 */
class RepositoryDetector {
    /**
     * Creates a new RepositoryDetector instance.
     * Initializes paths and security settings.
     *
     * @constructor
     */
    constructor() {
        /**
         * @type {string}
         * @description Path to repository index file
         */
        this.repoIndexPath = path.join(process.env.HOME, '.claude', 'memory', 'repositories', 'index.json');
        this.ensureDirectories();

        /**
         * @type {string[]}
         * @description Security: Allowlist of permitted git commands
         */
        this.allowedGitCommands = [
            'rev-parse',
            'remote',
            'status',
            'branch',
            'config'
        ];

        /**
         * @type {number}
         * @description Security: Command execution timeout (5 seconds)
         */
        this.commandTimeout = 5000;

        /**
         * @type {number}
         * @description Security: Maximum buffer size (1MB)
         */
        this.maxBuffer = 1024 * 1024;
    }

    /**
     * Execute git command safely with validation
     *
     * @param {string} command - Git command to execute (e.g., 'rev-parse')
     * @param {string[]} args - Arguments for the command
     * @returns {string} Command output
     * @throws {Error} If command is not in allowlist or execution fails
     *
     * @private
     */
    executeGitCommand(command, args = []) {
        // Security: Validate command is in allowlist
        if (!this.allowedGitCommands.includes(command)) {
            // Security: Log unauthorized command attempt
            logCommandInjectionAttempt(command, { args, type: 'unauthorized_git_command' });
            throw new Error(
                `Unauthorized git command: "${command}". ` +
                `Allowed: ${this.allowedGitCommands.join(', ')}`
            );
        }

        // Security: Validate arguments don't contain injection attempts
        args.forEach((arg, index) => {
            if (typeof arg !== 'string') {
                throw new Error(`Argument ${index} must be a string`);
            }
            // Check for shell metacharacters
            if (/[;&|`$(){}[\]<>]/.test(arg)) {
                // Security: Log command injection attempt
                logCommandInjectionAttempt(arg, { command, args, index, type: 'shell_metacharacters' });
                throw new Error(
                    `Argument contains unsafe characters: "${arg}"`
                );
            }
        });

        const fullCommand = ['git', command, ...args].join(' ');
        let success = false;

        try {
            const result = execSync(fullCommand, {
                encoding: 'utf8',
                stdio: 'pipe',
                timeout: this.commandTimeout,
                maxBuffer: this.maxBuffer
            }).trim();

            success = true;
            // Security: Log successful git command
            logGitCommand(command, args, success);
            return result;
        } catch (error) {
            // Security: Log failed git command
            logGitCommand(command, args, success);
            // Don't expose raw error details that might leak system info
            throw new Error(`Git command failed: ${command}`);
        }
    }

    /**
     * Ensures required directories and index file exist.
     * Creates repository directory structure if needed.
     *
     * @private
     * @returns {void}
     */
    ensureDirectories() {
        const repoDir = path.dirname(this.repoIndexPath);
        if (!fs.existsSync(repoDir)) {
            fs.mkdirSync(repoDir, { recursive: true });
        }

        if (!fs.existsSync(this.repoIndexPath)) {
            fs.writeFileSync(this.repoIndexPath, JSON.stringify({}, null, 2));
        }
    }

    /**
     * Gets information about the current Git repository.
     * Detects repository root, remote URL, and creates unique identifier.
     *
     * @returns {Object|null} Repository info object, or null if not in a Git repository
     * @returns {string} return.hash - Unique 16-character hash identifier
     * @returns {string} return.path - Absolute path to repository root
     * @returns {string} return.remoteUrl - Git remote URL (or local path if no remote)
     * @returns {string} return.name - Repository name (basename of path)
     * @returns {string} return.lastAccessed - ISO timestamp of last access
     *
     * @example
     * const repo = detector.getCurrentRepository();
     * if (repo) {
     *   console.log(`Repository: ${repo.name}`);
     *   console.log(`Hash: ${repo.hash}`);
     *   console.log(`Path: ${repo.path}`);
     * } else {
     *   console.log('Not in a Git repository');
     * }
     */
    getCurrentRepository() {
        try {
            // Get the git root directory (using secure command execution)
            const gitRoot = this.executeGitCommand('rev-parse', ['--show-toplevel']);

            // Get remote URL for unique identification
            let remoteUrl = '';
            try {
                remoteUrl = this.executeGitCommand('remote', ['get-url', 'origin']);
            } catch {
                // Use local path if no remote
                remoteUrl = gitRoot;
            }

            // Create unique hash for repository
            const repoHash = crypto.createHash('sha256')
                .update(remoteUrl)
                .digest('hex')
                .substring(0, 16);

            const repoInfo = {
                hash: repoHash,
                path: gitRoot,
                remoteUrl: remoteUrl,
                name: path.basename(gitRoot),
                lastAccessed: new Date().toISOString()
            };

            this.updateRepositoryIndex(repoHash, repoInfo);
            return repoInfo;

        } catch (error) {
            return null; // Not in a git repository
        }
    }

    /**
     * Updates the repository index with new or updated repository information.
     *
     * @param {string} hash - Unique repository hash identifier
     * @param {Object} repoInfo - Repository information object
     * @returns {void}
     *
     * @example
     * detector.updateRepositoryIndex('abc123def456', repoInfo);
     */
    updateRepositoryIndex(hash, repoInfo) {
        const index = JSON.parse(fs.readFileSync(this.repoIndexPath, 'utf8'));
        index[hash] = repoInfo;
        fs.writeFileSync(this.repoIndexPath, JSON.stringify(index, null, 2));
    }

    /**
     * Gets the filesystem path for a repository's memory directory.
     *
     * @param {string} hash - Unique repository hash identifier
     * @returns {string} Absolute path to repository memory directory
     *
     * @example
     * const repoPath = detector.getRepositoryPath('abc123def456');
     * // Returns: '/Users/user/.claude/memory/repositories/abc123def456'
     */
    getRepositoryPath(hash) {
        return path.join(
            process.env.HOME,
            '.claude',
            'memory',
            'repositories',
            hash
        );
    }

    /**
     * Ensures repository memory structure exists with all required files.
     * Creates memory.json, metadata.json, and overrides.json if they don't exist.
     *
     * @param {Object} repoInfo - Repository information object
     * @param {string} repoInfo.hash - Repository hash identifier
     * @returns {Object} Paths to memory files
     * @returns {string} return.memoryPath - Path to memory.json
     * @returns {string} return.metadataPath - Path to metadata.json
     * @returns {string} return.overridesPath - Path to overrides.json
     *
     * @example
     * const paths = detector.ensureRepositoryMemory(repoInfo);
     * console.log('Memory file:', paths.memoryPath);
     * console.log('Metadata file:', paths.metadataPath);
     */
    ensureRepositoryMemory(repoInfo) {
        const repoPath = this.getRepositoryPath(repoInfo.hash);
        
        if (!fs.existsSync(repoPath)) {
            fs.mkdirSync(repoPath, { recursive: true });
        }

        const memoryFile = path.join(repoPath, 'memory.json');
        const metadataFile = path.join(repoPath, 'metadata.json');
        const overridesFile = path.join(repoPath, 'overrides.json');

        if (!fs.existsSync(memoryFile)) {
            fs.writeFileSync(memoryFile, JSON.stringify({
                patterns: {},
                decisions: {},
                libraries: {},
                standards: {},
                agents: {}
            }, null, 2));
        }

        if (!fs.existsSync(metadataFile)) {
            fs.writeFileSync(metadataFile, JSON.stringify({
                repository: repoInfo,
                inheritsFromGlobal: true,
                created: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
            }, null, 2));
        }

        if (!fs.existsSync(overridesFile)) {
            fs.writeFileSync(overridesFile, JSON.stringify({}, null, 2));
        }

        return {
            memoryPath: memoryFile,
            metadataPath: metadataFile,
            overridesPath: overridesFile
        };
    }
}

// CLI interface
if (require.main === module) {
    const detector = new RepositoryDetector();
    const repo = detector.getCurrentRepository();
    
    if (repo) {
        const paths = detector.ensureRepositoryMemory(repo);
        console.log(JSON.stringify({
            repository: repo,
            paths: paths
        }, null, 2));
    } else {
        console.log(JSON.stringify({ repository: null }, null, 2));
    }
}

module.exports = RepositoryDetector;