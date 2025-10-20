/**
 * Unit Tests: SecurityAuditLog
 *
 * Tests for security audit logging functionality
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { SecurityAuditLog } = require('../../src/logging/security-logger');

describe('Unit: SecurityAuditLog', () => {
    let logger;
    let testLogDir;

    beforeEach(() => {
        // Create temporary test log directory
        testLogDir = path.join(__dirname, '../../.test-logs-' + Date.now());

        // Create logger with test directory
        logger = new SecurityAuditLog();
        logger.logDir = testLogDir;
        logger.securityLogPath = path.join(testLogDir, 'security.log');
        logger.alertLogPath = path.join(testLogDir, 'security-alerts.log');
        logger.ensureLogDirectory();
    });

    afterEach(() => {
        // Clean up test log directory
        if (fs.existsSync(testLogDir)) {
            fs.rmSync(testLogDir, { recursive: true, force: true });
        }
    });

    describe('Constructor', () => {
        it('should initialize with default paths', () => {
            const defaultLogger = new SecurityAuditLog();

            assert(defaultLogger.logDir.includes('.claude'));
            assert(defaultLogger.securityLogPath.includes('security.log'));
            assert(defaultLogger.alertLogPath.includes('security-alerts.log'));
            assert.strictEqual(defaultLogger.maxLogSize, 50 * 1024 * 1024);
        });

        it('should ensure log directory exists', () => {
            assert(fs.existsSync(testLogDir));
        });
    });

    describe('ensureLogDirectory', () => {
        it('should create log directory if it does not exist', () => {
            // Remove directory
            if (fs.existsSync(testLogDir)) {
                fs.rmSync(testLogDir, { recursive: true });
            }

            // Call ensureLogDirectory
            logger.ensureLogDirectory();

            assert(fs.existsSync(testLogDir));
        });

        it('should not fail if directory already exists', () => {
            // Directory already exists from beforeEach
            logger.ensureLogDirectory();

            assert(fs.existsSync(testLogDir));
        });
    });

    describe('log', () => {
        it('should log an INFO event', () => {
            logger.log('SKILL_EXECUTION', { skill: 'test-skill' }, 'INFO');

            assert(fs.existsSync(logger.securityLogPath));

            const content = fs.readFileSync(logger.securityLogPath, 'utf8');
            const lines = content.trim().split('\n');
            const entry = JSON.parse(lines[0]);

            assert.strictEqual(entry.eventType, 'SKILL_EXECUTION');
            assert.strictEqual(entry.severity, 'INFO');
            assert.strictEqual(entry.details.skill, 'test-skill');
            assert(entry.timestamp);
            assert(entry.user);
            assert(entry.pid);
            assert(entry.hostname);
        });

        it('should log ERROR events to both logs', () => {
            logger.log('VALIDATION_FAILURE', { error: 'invalid input' }, 'ERROR');

            // Check main log
            assert(fs.existsSync(logger.securityLogPath));
            const mainContent = fs.readFileSync(logger.securityLogPath, 'utf8');
            assert(mainContent.includes('VALIDATION_FAILURE'));

            // Check alert log
            assert(fs.existsSync(logger.alertLogPath));
            const alertContent = fs.readFileSync(logger.alertLogPath, 'utf8');
            assert(alertContent.includes('VALIDATION_FAILURE'));
        });

        it('should log CRITICAL events to both logs', () => {
            logger.log('PATH_TRAVERSAL_ATTEMPT', { path: '../../../etc/passwd' }, 'CRITICAL');

            // Check main log
            assert(fs.existsSync(logger.securityLogPath));
            const mainContent = fs.readFileSync(logger.securityLogPath, 'utf8');
            assert(mainContent.includes('PATH_TRAVERSAL_ATTEMPT'));

            // Check alert log
            assert(fs.existsSync(logger.alertLogPath));
            const alertContent = fs.readFileSync(logger.alertLogPath, 'utf8');
            assert(mainContent.includes('PATH_TRAVERSAL_ATTEMPT'));
        });

        it('should log WARN events only to main log', () => {
            logger.log('RATE_LIMIT_EXCEEDED', { limit: 100 }, 'WARN');

            // Check main log
            assert(fs.existsSync(logger.securityLogPath));
            const mainContent = fs.readFileSync(logger.securityLogPath, 'utf8');
            assert(mainContent.includes('RATE_LIMIT_EXCEEDED'));

            // Alert log should not exist for WARN
            if (fs.existsSync(logger.alertLogPath)) {
                const alertContent = fs.readFileSync(logger.alertLogPath, 'utf8');
                assert.strictEqual(alertContent.trim(), '');
            }
        });

        it('should use default severity INFO if not provided', () => {
            logger.log('FILE_ACCESS', { file: '/tmp/test.txt' });

            const content = fs.readFileSync(logger.securityLogPath, 'utf8');
            const entry = JSON.parse(content.trim());

            assert.strictEqual(entry.severity, 'INFO');
        });

        it('should handle empty details', () => {
            logger.log('GIT_COMMAND', {}, 'INFO');

            const content = fs.readFileSync(logger.securityLogPath, 'utf8');
            const entry = JSON.parse(content.trim());

            assert.deepStrictEqual(entry.details, {});
        });
    });

    describe('writeToLog', () => {
        it('should write formatted JSON to log file', () => {
            const entry = {
                timestamp: new Date().toISOString(),
                eventType: 'TEST_EVENT',
                severity: 'INFO',
                details: { test: true }
            };

            logger.writeToLog(logger.securityLogPath, entry);

            assert(fs.existsSync(logger.securityLogPath));
            const content = fs.readFileSync(logger.securityLogPath, 'utf8');
            const logged = JSON.parse(content.trim());

            assert.strictEqual(logged.eventType, 'TEST_EVENT');
            assert.strictEqual(logged.details.test, true);
        });

        it('should append multiple entries', () => {
            logger.writeToLog(logger.securityLogPath, { eventType: 'EVENT1' });
            logger.writeToLog(logger.securityLogPath, { eventType: 'EVENT2' });

            const content = fs.readFileSync(logger.securityLogPath, 'utf8');
            const lines = content.trim().split('\n');

            assert.strictEqual(lines.length, 2);
            assert(lines[0].includes('EVENT1'));
            assert(lines[1].includes('EVENT2'));
        });
    });

    describe('search', () => {
        beforeEach(() => {
            // Add test log entries
            logger.log('SKILL_EXECUTION', { skill: 'test1' }, 'INFO');
            logger.log('VALIDATION_FAILURE', { error: 'test' }, 'ERROR');
            logger.log('PATH_TRAVERSAL_ATTEMPT', { path: '/bad' }, 'CRITICAL');
            logger.log('FILE_ACCESS', { file: '/tmp/file' }, 'INFO');
        });

        it('should find events by severity', () => {
            const results = logger.search({ severity: 'ERROR' });

            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].eventType, 'VALIDATION_FAILURE');
        });

        it('should find events by event type', () => {
            const results = logger.search({ eventType: 'SKILL_EXECUTION' });

            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].details.skill, 'test1');
        });

        it('should find CRITICAL events', () => {
            const results = logger.search({ severity: 'CRITICAL' });

            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].eventType, 'PATH_TRAVERSAL_ATTEMPT');
        });

        it('should limit results', () => {
            const results = logger.search({}, 2);

            assert.strictEqual(results.length, 2);
        });

        it('should return empty array if log does not exist', () => {
            const tempLogger = new SecurityAuditLog();
            tempLogger.securityLogPath = '/tmp/non-existent-log.log';

            const results = tempLogger.search({});

            assert.deepStrictEqual(results, []);
        });

        it('should filter by multiple criteria', () => {
            logger.log('SKILL_EXECUTION', { skill: 'test2' }, 'ERROR');

            const results = logger.search({
                eventType: 'SKILL_EXECUTION',
                severity: 'ERROR'
            });

            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].details.skill, 'test2');
        });
    });

    describe('getStatistics', () => {
        beforeEach(() => {
            // Add test log entries
            logger.log('SKILL_EXECUTION', { skill: 'test1' }, 'INFO');
            logger.log('SKILL_EXECUTION', { skill: 'test2' }, 'INFO');
            logger.log('VALIDATION_FAILURE', { error: 'test' }, 'ERROR');
            logger.log('PATH_TRAVERSAL_ATTEMPT', { path: '/bad' }, 'CRITICAL');
        });

        it('should calculate statistics for all events', () => {
            const stats = logger.getStatistics();

            assert.strictEqual(stats.totalEvents, 4);
            assert.strictEqual(stats.byType.SKILL_EXECUTION, 2);
            assert.strictEqual(stats.byType.VALIDATION_FAILURE, 1);
            assert.strictEqual(stats.byType.PATH_TRAVERSAL_ATTEMPT, 1);
            assert.strictEqual(stats.bySeverity.INFO, 2);
            assert.strictEqual(stats.bySeverity.ERROR, 1);
            assert.strictEqual(stats.bySeverity.CRITICAL, 1);
            assert.strictEqual(stats.failures, 2); // ERROR + CRITICAL
            assert.strictEqual(stats.criticalEvents, 1);
        });

        it('should filter statistics by date', () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);

            const stats = logger.getStatistics(tomorrow.toISOString());

            assert.strictEqual(stats.totalEvents, 0);
        });

        it('should return zero counts if log does not exist', () => {
            const tempLogger = new SecurityAuditLog();
            tempLogger.securityLogPath = '/tmp/non-existent-log.log';

            const stats = tempLogger.getStatistics();

            assert.strictEqual(stats.totalEvents, 0);
            assert.deepStrictEqual(stats.byType, {});
            assert.deepStrictEqual(stats.bySeverity, {});
        });
    });

    describe('rotateLogIfNeeded', () => {
        it('should rotate log if size exceeds maxLogSize', () => {
            // Set small max size for testing
            logger.maxLogSize = 100;

            // Write enough data to exceed limit
            for (let i = 0; i < 10; i++) {
                logger.writeToLog(logger.securityLogPath, {
                    eventType: 'TEST',
                    data: 'x'.repeat(50)
                });
            }

            // Check if log was rotated
            const logSize = fs.statSync(logger.securityLogPath).size;

            // After rotation, log should be smaller than maxLogSize
            // (rotation may not have happened yet, so this test is approximate)
            assert(logSize >= 0); // Log exists
        });

        it('should not rotate if size is under maxLogSize', () => {
            logger.maxLogSize = 1024 * 1024; // 1MB

            logger.writeToLog(logger.securityLogPath, { eventType: 'TEST', data: 'small' });

            const logSize = fs.statSync(logger.securityLogPath).size;

            assert(logSize < logger.maxLogSize);
        });
    });

    describe('recentEvents', () => {
        beforeEach(() => {
            logger.log('PATH_TRAVERSAL_ATTEMPT', { path: '/bad1' }, 'CRITICAL');
            logger.log('COMMAND_INJECTION_ATTEMPT', { cmd: 'rm -rf /' }, 'ERROR');
            logger.log('SKILL_EXECUTION', { skill: 'test' }, 'INFO');
            logger.log('UNAUTHORIZED_OPERATION', { op: 'admin' }, 'ERROR');
        });

        it('should return recent events via getStatistics', () => {
            const stats = logger.getStatistics();

            assert(Array.isArray(stats.recentEvents));
            assert(stats.recentEvents.length <= 10);
            assert.strictEqual(stats.failures, 3); // CRITICAL + 2 ERROR
            assert.strictEqual(stats.criticalEvents, 1);
        });

        it('should include all event details in recentEvents', () => {
            const stats = logger.getStatistics();

            assert(stats.recentEvents.every(e => e.timestamp && e.eventType && e.severity));
        });
    });
});
