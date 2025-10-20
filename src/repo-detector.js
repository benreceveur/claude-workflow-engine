#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

class RepositoryDetector {
    constructor() {
        this.repoIndexPath = path.join(process.env.HOME, '.claude', 'memory', 'repositories', 'index.json');
        this.ensureDirectories();
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
            // Get the git root directory
            const gitRoot = execSync('git rev-parse --show-toplevel', { 
                encoding: 'utf8',
                stdio: 'pipe'
            }).trim();

            // Get remote URL for unique identification
            let remoteUrl = '';
            try {
                remoteUrl = execSync('git remote get-url origin', { 
                    encoding: 'utf8',
                    stdio: 'pipe'
                }).trim();
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