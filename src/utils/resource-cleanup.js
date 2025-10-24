/**
 * @fileoverview Resource cleanup utilities for Skill execution
 * @module utils/resource-cleanup
 * @author Claude Workflow Engine
 */

const fs = require('fs');
const path = require('path');
const { getMemoryDir } = require('./runtime-paths');

/**
 * Resource cleanup manager for Skill execution environment
 * Handles cleanup of temporary files, cache, and execution resources
 *
 * @class ResourceCleanup
 */
class ResourceCleanup {
    /**
     * Create a new ResourceCleanup instance
     *
     * @param {Object} options - Cleanup options
     * @param {string} options.cacheDir - Cache directory path
     * @param {number} options.maxCacheAge - Maximum cache age in milliseconds
     * @param {number} options.maxCacheSize - Maximum cache size in bytes
     */
    constructor(options = {}) {
        this.cacheDir = options.cacheDir || path.join(getMemoryDir(), '.skill-cache');
        this.maxCacheAge = options.maxCacheAge || 24 * 60 * 60 * 1000; // 24 hours
        this.maxCacheSize = options.maxCacheSize || 100 * 1024 * 1024; // 100MB
        this.cleanupHandlers = [];
        this.isShuttingDown = false;
    }

    /**
     * Register a cleanup handler to be called during shutdown
     *
     * @param {Function} handler - Cleanup function to execute
     *
     * @example
     * cleanup.registerCleanupHandler(() => {
     *   console.log('Cleaning up resources...');
     * });
     */
    registerCleanupHandler(handler) {
        if (typeof handler === 'function') {
            this.cleanupHandlers.push(handler);
        }
    }

    /**
     * Clean up old cache files based on age
     *
     * @returns {Object} Cleanup statistics
     *
     * @example
     * const stats = await cleanup.cleanOldCache();
     * console.log(`Removed ${stats.filesRemoved} old cache files`);
     */
    async cleanOldCache() {
        const stats = {
            filesRemoved: 0,
            bytesFreed: 0,
            filesScanned: 0,
            errors: []
        };

        if (!fs.existsSync(this.cacheDir)) {
            return stats;
        }

        const now = Date.now();

        try {
            const entries = fs.readdirSync(this.cacheDir, { withFileTypes: true });

            for (const entry of entries) {
                if (!entry.isDirectory()) {
                    stats.filesScanned++;
                    continue;
                }

                const dirPath = path.join(this.cacheDir, entry.name);

                try {
                    const stat = fs.statSync(dirPath);
                    const age = now - stat.mtimeMs;

                    if (age > this.maxCacheAge) {
                        const size = this.getDirectorySize(dirPath);
                        fs.rmSync(dirPath, { recursive: true, force: true });
                        stats.filesRemoved++;
                        stats.bytesFreed += size;
                    }
                } catch (error) {
                    stats.errors.push({
                        path: dirPath,
                        error: error.message
                    });
                }
            }
        } catch (error) {
            stats.errors.push({
                path: this.cacheDir,
                error: error.message
            });
        }

        return stats;
    }

    /**
     * Clean up cache to stay under size limit
     *
     * @returns {Object} Cleanup statistics
     *
     * @example
     * const stats = await cleanup.enforceSize Limit();
     * console.log(`Cache reduced from ${stats.sizeBefore} to ${stats.sizeAfter} bytes`);
     */
    async enforceSizeLimit() {
        const stats = {
            sizeBefore: 0,
            sizeAfter: 0,
            filesRemoved: 0,
            errors: []
        };

        if (!fs.existsSync(this.cacheDir)) {
            return stats;
        }

        try {
            stats.sizeBefore = this.getDirectorySize(this.cacheDir);

            if (stats.sizeBefore <= this.maxCacheSize) {
                stats.sizeAfter = stats.sizeBefore;
                return stats;
            }

            // Get all cache directories with their access times
            const cacheEntries = [];
            const entries = fs.readdirSync(this.cacheDir, { withFileTypes: true });

            for (const entry of entries) {
                if (!entry.isDirectory()) continue;

                const dirPath = path.join(this.cacheDir, entry.name);

                try {
                    const stat = fs.statSync(dirPath);
                    const size = this.getDirectorySize(dirPath);

                    cacheEntries.push({
                        path: dirPath,
                        atime: stat.atimeMs,
                        size: size
                    });
                } catch (error) {
                    stats.errors.push({
                        path: dirPath,
                        error: error.message
                    });
                }
            }

            // Sort by access time (oldest first)
            cacheEntries.sort((a, b) => a.atime - b.atime);

            // Remove oldest entries until under limit
            let currentSize = stats.sizeBefore;

            for (const entry of cacheEntries) {
                if (currentSize <= this.maxCacheSize) {
                    break;
                }

                try {
                    fs.rmSync(entry.path, { recursive: true, force: true });
                    currentSize -= entry.size;
                    stats.filesRemoved++;
                } catch (error) {
                    stats.errors.push({
                        path: entry.path,
                        error: error.message
                    });
                }
            }

            stats.sizeAfter = this.getDirectorySize(this.cacheDir);
        } catch (error) {
            stats.errors.push({
                path: this.cacheDir,
                error: error.message
            });
        }

        return stats;
    }

    /**
     * Get total size of a directory recursively
     *
     * @param {string} dirPath - Directory path
     * @returns {number} Total size in bytes
     * @private
     */
    getDirectorySize(dirPath) {
        let totalSize = 0;

        try {
            const entries = fs.readdirSync(dirPath, { withFileTypes: true });

            for (const entry of entries) {
                const entryPath = path.join(dirPath, entry.name);

                try {
                    if (entry.isDirectory()) {
                        totalSize += this.getDirectorySize(entryPath);
                    } else {
                        const stat = fs.statSync(entryPath);
                        totalSize += stat.size;
                    }
                } catch (error) {
                    // Skip files that can't be accessed
                }
            }
        } catch (error) {
            // Return what we have
        }

        return totalSize;
    }

    /**
     * Execute all registered cleanup handlers
     *
     * @returns {Promise<void>}
     *
     * @example
     * await cleanup.shutdown();
     */
    async shutdown() {
        if (this.isShuttingDown) {
            return;
        }

        this.isShuttingDown = true;

        for (const handler of this.cleanupHandlers) {
            try {
                await handler();
            } catch (error) {
                console.error('Cleanup handler error:', error);
            }
        }
    }

    /**
     * Setup process signal handlers for graceful shutdown
     *
     * @example
     * cleanup.setupSignalHandlers();
     */
    setupSignalHandlers() {
        const signals = ['SIGINT', 'SIGTERM', 'SIGHUP'];

        for (const signal of signals) {
            process.on(signal, async () => {
                console.log(`\nReceived ${signal}, cleaning up...`);
                await this.shutdown();
                process.exit(0);
            });
        }

        // Handle uncaught exceptions
        process.on('uncaughtException', async (error) => {
            console.error('Uncaught exception:', error);
            await this.shutdown();
            process.exit(1);
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', async (reason, promise) => {
            console.error('Unhandled rejection at:', promise, 'reason:', reason);
            await this.shutdown();
            process.exit(1);
        });
    }
}

module.exports = ResourceCleanup;
