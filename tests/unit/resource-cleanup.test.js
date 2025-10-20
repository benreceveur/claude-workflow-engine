/**
 * Unit Tests: ResourceCleanup
 *
 * Tests for resource cleanup and cache management
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ResourceCleanup = require('../../src/utils/resource-cleanup');

describe('Unit: ResourceCleanup', () => {
    let testCacheDir;
    let cleanup;

    beforeEach(() => {
        // Create temporary test cache directory
        testCacheDir = path.join(__dirname, '../../.test-cache-' + Date.now());
        if (!fs.existsSync(testCacheDir)) {
            fs.mkdirSync(testCacheDir, { recursive: true });
        }

        cleanup = new ResourceCleanup({
            cacheDir: testCacheDir,
            maxCacheAge: 1000, // 1 second for testing
            maxCacheSize: 1024 // 1KB for testing
        });
    });

    afterEach(() => {
        // Clean up test cache directory
        if (fs.existsSync(testCacheDir)) {
            fs.rmSync(testCacheDir, { recursive: true, force: true });
        }
    });

    describe('Constructor', () => {
        it('should initialize with default options', () => {
            const defaultCleanup = new ResourceCleanup();

            assert(defaultCleanup.cacheDir.includes('.claude'));
            assert.strictEqual(defaultCleanup.maxCacheAge, 24 * 60 * 60 * 1000);
            assert.strictEqual(defaultCleanup.maxCacheSize, 100 * 1024 * 1024);
            assert.deepStrictEqual(defaultCleanup.cleanupHandlers, []);
            assert.strictEqual(defaultCleanup.isShuttingDown, false);
        });

        it('should initialize with custom options', () => {
            assert.strictEqual(cleanup.cacheDir, testCacheDir);
            assert.strictEqual(cleanup.maxCacheAge, 1000);
            assert.strictEqual(cleanup.maxCacheSize, 1024);
        });
    });

    describe('registerCleanupHandler', () => {
        it('should register a cleanup handler function', () => {
            const handler = () => console.log('cleanup');

            cleanup.registerCleanupHandler(handler);

            assert.strictEqual(cleanup.cleanupHandlers.length, 1);
            assert.strictEqual(cleanup.cleanupHandlers[0], handler);
        });

        it('should register multiple cleanup handlers', () => {
            const handler1 = () => {};
            const handler2 = () => {};

            cleanup.registerCleanupHandler(handler1);
            cleanup.registerCleanupHandler(handler2);

            assert.strictEqual(cleanup.cleanupHandlers.length, 2);
        });

        it('should ignore non-function handlers', () => {
            cleanup.registerCleanupHandler('not a function');
            cleanup.registerCleanupHandler(null);
            cleanup.registerCleanupHandler(undefined);

            assert.strictEqual(cleanup.cleanupHandlers.length, 0);
        });
    });

    describe('cleanOldCache', () => {
        it('should return empty stats if cache directory does not exist', async () => {
            const nonExistentCleanup = new ResourceCleanup({
                cacheDir: '/tmp/non-existent-cache-dir'
            });

            const stats = await nonExistentCleanup.cleanOldCache();

            assert.strictEqual(stats.filesRemoved, 0);
            assert.strictEqual(stats.bytesFreed, 0);
            assert.strictEqual(stats.filesScanned, 0);
            assert.strictEqual(stats.errors.length, 0);
        });

        it('should remove cache directories older than maxCacheAge', async () => {
            // Create old directory
            const oldDir = path.join(testCacheDir, 'old-cache');
            fs.mkdirSync(oldDir, { recursive: true });
            fs.writeFileSync(path.join(oldDir, 'file.txt'), 'old data');

            // Set modified time to 2 seconds ago (older than maxCacheAge of 1s)
            const oldTime = Date.now() - 2000;
            fs.utimesSync(oldDir, new Date(oldTime), new Date(oldTime));

            const stats = await cleanup.cleanOldCache();

            assert.strictEqual(stats.filesRemoved, 1);
            assert(stats.bytesFreed > 0);
            assert(!fs.existsSync(oldDir));
        });

        it('should keep cache directories newer than maxCacheAge', async () => {
            // Create recent directory
            const recentDir = path.join(testCacheDir, 'recent-cache');
            fs.mkdirSync(recentDir, { recursive: true });
            fs.writeFileSync(path.join(recentDir, 'file.txt'), 'recent data');

            const stats = await cleanup.cleanOldCache();

            assert.strictEqual(stats.filesRemoved, 0);
            assert.strictEqual(stats.bytesFreed, 0);
            assert(fs.existsSync(recentDir));
        });

        it('should skip non-directory entries', async () => {
            // Create a file in cache directory
            fs.writeFileSync(path.join(testCacheDir, 'file.txt'), 'data');

            const stats = await cleanup.cleanOldCache();

            assert.strictEqual(stats.filesScanned, 1);
            assert.strictEqual(stats.filesRemoved, 0);
        });

        it('should handle errors gracefully', async () => {
            // Create directory
            const dir = path.join(testCacheDir, 'test-dir');
            fs.mkdirSync(dir, { recursive: true });

            // Set old time
            const oldTime = Date.now() - 2000;
            fs.utimesSync(dir, new Date(oldTime), new Date(oldTime));

            // Make directory read-only to cause permission error on some systems
            // Note: This might not work on all platforms
            try {
                fs.chmodSync(dir, 0o444);
            } catch (e) {
                // Platform doesn't support chmod, skip this test scenario
            }

            const stats = await cleanup.cleanOldCache();

            // Should either succeed or have an error logged
            assert(stats.filesRemoved >= 0);
            assert(Array.isArray(stats.errors));
        });
    });

    describe('enforceSizeLimit', () => {
        it('should return empty stats if cache directory does not exist', async () => {
            const nonExistentCleanup = new ResourceCleanup({
                cacheDir: '/tmp/non-existent-cache-dir'
            });

            const stats = await nonExistentCleanup.enforceSizeLimit();

            assert.strictEqual(stats.sizeBefore, 0);
            assert.strictEqual(stats.sizeAfter, 0);
            assert.strictEqual(stats.filesRemoved, 0);
        });

        it('should not remove files if under size limit', async () => {
            // Create small cache directory (under 1KB limit)
            const smallDir = path.join(testCacheDir, 'small-cache');
            fs.mkdirSync(smallDir, { recursive: true });
            fs.writeFileSync(path.join(smallDir, 'small.txt'), 'small');

            const stats = await cleanup.enforceSizeLimit();

            assert(stats.sizeBefore < 1024);
            assert.strictEqual(stats.sizeAfter, stats.sizeBefore);
            assert.strictEqual(stats.filesRemoved, 0);
        });

        it('should remove oldest files when over size limit', async () => {
            // Create multiple directories to exceed size limit
            const dir1 = path.join(testCacheDir, 'cache-1');
            const dir2 = path.join(testCacheDir, 'cache-2');

            fs.mkdirSync(dir1, { recursive: true });
            fs.mkdirSync(dir2, { recursive: true });

            // Create files larger than 1KB total
            fs.writeFileSync(path.join(dir1, 'file1.txt'), 'x'.repeat(600));
            fs.writeFileSync(path.join(dir2, 'file2.txt'), 'x'.repeat(600));

            // Make dir1 older (accessed earlier)
            const oldTime = Date.now() - 5000;
            fs.utimesSync(dir1, new Date(oldTime), new Date(oldTime));

            const stats = await cleanup.enforceSizeLimit();

            assert(stats.sizeBefore > 1024);
            assert(stats.sizeAfter <= 1024);
            assert.strictEqual(stats.filesRemoved, 1);
            assert(!fs.existsSync(dir1)); // Oldest should be removed
            assert(fs.existsSync(dir2)); // Newest should remain
        });

        it('should handle errors when accessing files', async () => {
            // Create a directory
            const dir = path.join(testCacheDir, 'test-dir');
            fs.mkdirSync(dir, { recursive: true });

            const stats = await cleanup.enforceSizeLimit();

            // Should complete without throwing
            assert(stats.sizeBefore >= 0);
            assert(Array.isArray(stats.errors));
        });
    });

    describe('getDirectorySize', () => {
        it('should calculate size of empty directory', () => {
            const emptyDir = path.join(testCacheDir, 'empty');
            fs.mkdirSync(emptyDir, { recursive: true });

            const size = cleanup.getDirectorySize(emptyDir);

            assert.strictEqual(size, 0);
        });

        it('should calculate size of directory with files', () => {
            const dir = path.join(testCacheDir, 'with-files');
            fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(path.join(dir, 'file1.txt'), 'hello');
            fs.writeFileSync(path.join(dir, 'file2.txt'), 'world');

            const size = cleanup.getDirectorySize(dir);

            assert.strictEqual(size, 10); // 'hello' + 'world' = 10 bytes
        });

        it('should calculate size recursively', () => {
            const dir = path.join(testCacheDir, 'nested');
            const subdir = path.join(dir, 'sub');
            fs.mkdirSync(subdir, { recursive: true });
            fs.writeFileSync(path.join(dir, 'top.txt'), 'top');
            fs.writeFileSync(path.join(subdir, 'sub.txt'), 'sub');

            const size = cleanup.getDirectorySize(dir);

            assert.strictEqual(size, 6); // 'top' + 'sub' = 6 bytes
        });

        it('should return 0 for non-existent directory', () => {
            const size = cleanup.getDirectorySize('/tmp/non-existent-dir');

            assert.strictEqual(size, 0);
        });
    });

    describe('shutdown', () => {
        it('should execute all registered cleanup handlers', async () => {
            let handler1Called = false;
            let handler2Called = false;

            cleanup.registerCleanupHandler(() => {
                handler1Called = true;
            });
            cleanup.registerCleanupHandler(() => {
                handler2Called = true;
            });

            await cleanup.shutdown();

            assert.strictEqual(handler1Called, true);
            assert.strictEqual(handler2Called, true);
            assert.strictEqual(cleanup.isShuttingDown, true);
        });

        it('should execute async cleanup handlers', async () => {
            let asyncHandlerCalled = false;

            cleanup.registerCleanupHandler(async () => {
                await new Promise(resolve => setTimeout(resolve, 10));
                asyncHandlerCalled = true;
            });

            await cleanup.shutdown();

            assert.strictEqual(asyncHandlerCalled, true);
        });

        it('should handle handler errors gracefully', async () => {
            let handler2Called = false;

            cleanup.registerCleanupHandler(() => {
                throw new Error('Handler error');
            });
            cleanup.registerCleanupHandler(() => {
                handler2Called = true;
            });

            await cleanup.shutdown();

            // Should continue despite error in first handler
            assert.strictEqual(handler2Called, true);
        });

        it('should not execute handlers twice if already shutting down', async () => {
            let callCount = 0;

            cleanup.registerCleanupHandler(() => {
                callCount++;
            });

            await cleanup.shutdown();
            await cleanup.shutdown(); // Call again

            assert.strictEqual(callCount, 1);
            assert.strictEqual(cleanup.isShuttingDown, true);
        });
    });

    describe('setupSignalHandlers', () => {
        it('should register signal handlers', () => {
            // Count existing listeners
            const initialSigintListeners = process.listenerCount('SIGINT');
            const initialSigtermListeners = process.listenerCount('SIGTERM');
            const initialSighupListeners = process.listenerCount('SIGHUP');

            cleanup.setupSignalHandlers();

            // Verify new listeners were added
            assert(process.listenerCount('SIGINT') > initialSigintListeners);
            assert(process.listenerCount('SIGTERM') > initialSigtermListeners);
            assert(process.listenerCount('SIGHUP') > initialSighupListeners);

            // Clean up - remove our listeners
            process.removeAllListeners('SIGINT');
            process.removeAllListeners('SIGTERM');
            process.removeAllListeners('SIGHUP');
            process.removeAllListeners('uncaughtException');
            process.removeAllListeners('unhandledRejection');
        });

        it('should register uncaught exception handler', () => {
            const initialListeners = process.listenerCount('uncaughtException');

            cleanup.setupSignalHandlers();

            assert(process.listenerCount('uncaughtException') > initialListeners);

            // Clean up
            process.removeAllListeners('SIGINT');
            process.removeAllListeners('SIGTERM');
            process.removeAllListeners('SIGHUP');
            process.removeAllListeners('uncaughtException');
            process.removeAllListeners('unhandledRejection');
        });

        it('should register unhandled rejection handler', () => {
            const initialListeners = process.listenerCount('unhandledRejection');

            cleanup.setupSignalHandlers();

            assert(process.listenerCount('unhandledRejection') > initialListeners);

            // Clean up
            process.removeAllListeners('SIGINT');
            process.removeAllListeners('SIGTERM');
            process.removeAllListeners('SIGHUP');
            process.removeAllListeners('uncaughtException');
            process.removeAllListeners('unhandledRejection');
        });
    });
});
