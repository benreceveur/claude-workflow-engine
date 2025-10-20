/**
 * Unit Tests: SkillError
 *
 * Tests for standardized error handling
 */

const assert = require('assert');
const {
    SkillError,
    SkillErrorCode,
    ValidationError,
    SecurityError,
    TimeoutError,
    ConcurrencyError,
    wrapError
} = require('../../src/errors/skill-error');

describe('Unit: SkillError', () => {
    describe('SkillError Base Class', () => {
        it('should create error with all properties', () => {
            const error = new SkillError(
                'Test error',
                SkillErrorCode.INTERNAL_ERROR,
                { key: 'value' }
            );

            assert.strictEqual(error.name, 'SkillError');
            assert.strictEqual(error.message, 'Test error');
            assert.strictEqual(error.code, SkillErrorCode.INTERNAL_ERROR);
            assert.deepStrictEqual(error.details, { key: 'value' });
            assert(error.timestamp);
            assert(error.stack);
        });

        it('should create error with cause', () => {
            const originalError = new Error('Original');
            const error = new SkillError(
                'Wrapped',
                SkillErrorCode.EXECUTION_FAILED,
                {},
                originalError
            );

            assert.strictEqual(error.cause, originalError);
        });

        it('should serialize to JSON correctly', () => {
            const error = new SkillError(
                'Test',
                SkillErrorCode.VALIDATION_ERROR,
                { field: 'name' }
            );

            const json = error.toJSON();

            assert.strictEqual(json.success, false);
            assert.strictEqual(json.error.name, 'SkillError');
            assert.strictEqual(json.error.message, 'Test');
            assert.strictEqual(json.error.code, SkillErrorCode.VALIDATION_ERROR);
            assert.deepStrictEqual(json.error.details, { field: 'name' });
            assert(json.error.timestamp);
            assert(json.error.stack);
        });

        it('should identify recoverable errors', () => {
            const timeoutError = new SkillError(
                'Timeout',
                SkillErrorCode.EXECUTION_TIMEOUT
            );
            const concurrencyError = new SkillError(
                'Concurrent',
                SkillErrorCode.CONCURRENT_LIMIT_REACHED
            );
            const notFoundError = new SkillError(
                'Not found',
                SkillErrorCode.SKILL_NOT_FOUND
            );

            assert.strictEqual(timeoutError.isRecoverable(), true);
            assert.strictEqual(concurrencyError.isRecoverable(), true);
            assert.strictEqual(notFoundError.isRecoverable(), false);
        });

        it('should identify security violations', () => {
            const pathTraversal = new SkillError(
                'Path traversal',
                SkillErrorCode.PATH_TRAVERSAL_ATTEMPT
            );
            const unauthorized = new SkillError(
                'Unauthorized',
                SkillErrorCode.UNAUTHORIZED_OPERATION
            );
            const notFound = new SkillError(
                'Not found',
                SkillErrorCode.SKILL_NOT_FOUND
            );

            assert.strictEqual(pathTraversal.isSecurityViolation(), true);
            assert.strictEqual(unauthorized.isSecurityViolation(), true);
            assert.strictEqual(notFound.isSecurityViolation(), false);
        });
    });

    describe('ValidationError', () => {
        it('should create validation error', () => {
            const error = new ValidationError('Invalid input', { field: 'email' });

            assert.strictEqual(error.name, 'ValidationError');
            assert.strictEqual(error.code, SkillErrorCode.VALIDATION_ERROR);
            assert.strictEqual(error.message, 'Invalid input');
            assert.deepStrictEqual(error.details, { field: 'email' });
        });
    });

    describe('SecurityError', () => {
        it('should create security error for path traversal', () => {
            const error = new SecurityError(
                'Path traversal detected',
                'path_traversal',
                { path: '../../../etc/passwd' }
            );

            assert.strictEqual(error.name, 'SecurityError');
            assert.strictEqual(error.code, SkillErrorCode.PATH_TRAVERSAL_ATTEMPT);
            assert.strictEqual(error.details.violationType, 'path_traversal');
            assert.strictEqual(error.isSecurityViolation(), true);
        });

        it('should create security error for unauthorized operation', () => {
            const error = new SecurityError(
                'Unauthorized git command',
                'unauthorized',
                { command: 'push' }
            );

            assert.strictEqual(error.name, 'SecurityError');
            assert.strictEqual(error.code, SkillErrorCode.UNAUTHORIZED_OPERATION);
            assert.strictEqual(error.isSecurityViolation(), true);
        });
    });

    describe('TimeoutError', () => {
        it('should create timeout error with skill details', () => {
            const error = new TimeoutError('test-skill', 60000);

            assert.strictEqual(error.name, 'TimeoutError');
            assert.strictEqual(error.code, SkillErrorCode.EXECUTION_TIMEOUT);
            assert(error.message.includes('60000ms'));
            assert.strictEqual(error.details.skillName, 'test-skill');
            assert.strictEqual(error.details.timeout, 60000);
            assert.strictEqual(error.isRecoverable(), true);
        });
    });

    describe('ConcurrencyError', () => {
        it('should create concurrency error with limits', () => {
            const error = new ConcurrencyError(5, 5);

            assert.strictEqual(error.name, 'ConcurrencyError');
            assert.strictEqual(error.code, SkillErrorCode.CONCURRENT_LIMIT_REACHED);
            assert(error.message.includes('5'));
            assert.strictEqual(error.details.maxConcurrent, 5);
            assert.strictEqual(error.details.current, 5);
            assert.strictEqual(error.isRecoverable(), true);
        });
    });

    describe('wrapError', () => {
        it('should wrap standard Error in SkillError', () => {
            const originalError = new Error('Original message');
            const wrapped = wrapError(originalError, { operation: 'test' });

            assert(wrapped instanceof SkillError);
            assert.strictEqual(wrapped.code, SkillErrorCode.INTERNAL_ERROR);
            assert.strictEqual(wrapped.message, 'Original message');
            assert.strictEqual(wrapped.details.operation, 'test');
            assert.strictEqual(wrapped.cause, originalError);
        });

        it('should not wrap SkillError (return as-is)', () => {
            const skillError = new SkillError('Test', SkillErrorCode.SKILL_NOT_FOUND);
            const wrapped = wrapError(skillError);

            assert.strictEqual(wrapped, skillError);
        });

        it('should handle errors without message', () => {
            const error = new Error();
            error.message = '';
            const wrapped = wrapError(error);

            assert.strictEqual(wrapped.message, 'Unknown error');
        });
    });

    describe('Error Code Enum', () => {
        it('should have all expected error codes', () => {
            const expectedCodes = [
                'SKILL_NOT_FOUND',
                'INVALID_SKILL_NAME',
                'INVALID_CONTEXT',
                'SCRIPT_NOT_FOUND',
                'EXECUTION_FAILED',
                'EXECUTION_TIMEOUT',
                'CONCURRENT_LIMIT_REACHED',
                'VALIDATION_ERROR',
                'PATH_TRAVERSAL_ATTEMPT',
                'UNAUTHORIZED_OPERATION',
                'RESOURCE_LIMIT_EXCEEDED',
                'INTERNAL_ERROR'
            ];

            expectedCodes.forEach(code => {
                assert(SkillErrorCode[code], `Missing code: ${code}`);
                assert.strictEqual(typeof SkillErrorCode[code], 'string');
            });
        });
    });
});
