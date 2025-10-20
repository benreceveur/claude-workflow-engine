#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const { logGitCommand, logCommandInjectionAttempt } = require('./logging/security-logger');

class RepositoryDetector {
    constructor() {
        this.repoIndexPath = path.join(process.env.HOME, '.claude', 'memory', 'repositories', 'index.json');
        this.ensureDirectories();

        // Security: Allowlist of permitted git commands
        this.allowedGitCommands = [
            'rev-parse',
            'remote',
            'status',
            'branch',
            'config'
        ];

        // Security: Command execution limits
        this.commandTimeout = 5000; // 5 seconds
        this.maxBuffer = 1024 * 1024; // 1MB
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

    ensureDirectories() {
        const repoDir = path.dirname(this.repoIndexPath);
        if (!fs.existsSync(repoDir)) {
            fs.mkdirSync(repoDir, { recursive: true });
        }
        
        if (!fs.existsSync(this.repoIndexPath)) {
            fs.writeFileSync(this.repoIndexPath, JSON.stringify({}, null, 2));
        }
    }

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

    updateRepositoryIndex(hash, repoInfo) {
        const index = JSON.parse(fs.readFileSync(this.repoIndexPath, 'utf8'));
        index[hash] = repoInfo;
        fs.writeFileSync(this.repoIndexPath, JSON.stringify(index, null, 2));
    }

    getRepositoryPath(hash) {
        return path.join(
            process.env.HOME, 
            '.claude', 
            'memory', 
            'repositories', 
            hash
        );
    }

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