/**
 * Security Tests: Input Validation
 *
 * Tests for InputValidator to ensure all validation methods work correctly
 * and block malicious inputs.
 */

const assert = require('assert');
const InputValidator = require('../../src/validators/input-validator');

describe('Security: Input Validation', () => {
    describe('Skill Name Validation', () => {
        it('should accept valid skill names', () => {
            const validNames = [
                'tech-debt-tracker',
                'finops-optimizer',
                'api-documentor',
                'abc',
                'a',  // Single letter (min 3 chars required, should fail)
            ];

            // Valid names (3+ chars)
            assert.strictEqual(
                InputValidator.sanitizeSkillName('tech-debt-tracker'),
                'tech-debt-tracker'
            );

            assert.strictEqual(
                InputValidator.sanitizeSkillName('abc'),
                'abc'
            );
        });

        it('should reject skill names with command injection attempts', () => {
            const maliciousNames = [
                'skill; rm -rf /',
                'skill && ls',
                'skill | cat /etc/passwd',
                'skill`whoami`',
                'skill$(whoami)',
            ];

            maliciousNames.forEach(name => {
                assert.throws(
                    () => InputValidator.sanitizeSkillName(name),
                    /Invalid skill name format/,
                    `Should reject: ${name}`
                );
            });
        });

        it('should reject skill names with invalid characters', () => {
            const invalidNames = [
                'Skill-Name',  // Uppercase
                'skill_name',  // Underscore
                'skill.name',  // Dot
                'skill name',  // Space
                'skill@name',  // Special char
            ];

            invalidNames.forEach(name => {
                assert.throws(
                    () => InputValidator.sanitizeSkillName(name),
                    /Invalid skill name format/,
                    `Should reject: ${name}`
                );
            });
        });

        it('should reject skill names that are too short or too long', () => {
            assert.throws(
                () => InputValidator.sanitizeSkillName('ab'),  // Too short
                /Invalid skill name format/
            );

            const tooLong = 'a'.repeat(51);  // 51 chars
            assert.throws(
                () => InputValidator.sanitizeSkillName(tooLong),
                /Invalid skill name format/
            );
        });

        it('should reject reserved skill names', () => {
            const reserved = ['system', 'admin', 'root', 'config'];

            reserved.forEach(name => {
                assert.throws(
                    () => InputValidator.sanitizeSkillName(name),
                    /reserved/,
                    `Should reject reserved name: ${name}`
                );
            });
        });
    });

    describe('File Path Validation', () => {
        it('should accept valid paths within allowed directory', () => {
            const validPath = InputValidator.sanitizeFilePath(
                process.env.HOME + '/.claude/skills/test'
            );

            assert(validPath.includes('.claude'));
        });

        it('should reject path traversal attempts', () => {
            const traversalAttempts = [
                '../../../etc/passwd',
                '../../.ssh/id_rsa',
                '../../../../../../../etc/shadow',
                './../../../var/log',
            ];

            traversalAttempts.forEach(path => {
                assert.throws(
                    () => InputValidator.sanitizeFilePath(path),
                    /Path (outside allowed directory|traversal detected)/,
                    `Should reject path traversal: ${path}`
                );
            });
        });

        it('should reject paths outside allowed directory', () => {
            assert.throws(
                () => InputValidator.sanitizeFilePath('/etc/passwd'),
                /Path outside allowed directory/
            );

            assert.throws(
                () => InputValidator.sanitizeFilePath('/var/log/system.log'),
                /Path outside allowed directory/
            );
        });
    });

    describe('Context Sanitization (Prototype Pollution Prevention)', () => {
        it('should remove dangerous properties from context', () => {
            const maliciousContext = {
                operation: 'scan',
                __proto__: { isAdmin: true },
                constructor: { admin: true },
                prototype: { elevated: true }
            };

            const sanitized = InputValidator.sanitizeContext(maliciousContext);

            // Check dangerous properties removed (they should not exist as own properties)
            assert.strictEqual(Object.prototype.hasOwnProperty.call(sanitized, '__proto__'), false);
            assert.strictEqual(Object.prototype.hasOwnProperty.call(sanitized, 'constructor'), false);
            assert.strictEqual(Object.prototype.hasOwnProperty.call(sanitized, 'prototype'), false);

            // Check valid properties preserved
            assert.strictEqual(sanitized.operation, 'scan');
        });

        it('should handle nested objects', () => {
            const nestedContext = {
                operation: 'scan',
                options: {
                    __proto__: { evil: true },
                    valid: 'data'
                }
            };

            const sanitized = InputValidator.sanitizeContext(nestedContext);

            assert.strictEqual(sanitized.operation, 'scan');
            assert.strictEqual(sanitized.options.valid, 'data');
            assert.strictEqual(Object.prototype.hasOwnProperty.call(sanitized.options, '__proto__'), false);
        });

        it('should reject non-object contexts', () => {
            assert.throws(
                () => InputValidator.sanitizeContext(null),
                /must be a plain object/
            );

            assert.throws(
                () => InputValidator.sanitizeContext([1, 2, 3]),
                /must be a plain object/
            );

            assert.throws(
                () => InputValidator.sanitizeContext('string'),
                /must be a plain object/
            );
        });
    });

    describe('Operation Validation', () => {
        it('should accept valid operations', () => {
            const result = InputValidator.validateOperation(
                'scan',
                ['scan', 'analyze', 'report']
            );

            assert.strictEqual(result, 'scan');
        });

        it('should reject invalid operations', () => {
            assert.throws(
                () => InputValidator.validateOperation(
                    'delete',
                    ['scan', 'analyze']
                ),
                /Invalid operation/
            );
        });

        it('should reject empty or non-string operations', () => {
            assert.throws(
                () => InputValidator.validateOperation('', ['scan']),
                /must be a non-empty string/
            );

            assert.throws(
                () => InputValidator.validateOperation(null, ['scan']),
                /must be a non-empty string/
            );
        });
    });

    describe('File Extension Validation', () => {
        it('should accept valid file extensions', () => {
            const ext = InputValidator.validateFileExtension(
                'script.py',
                ['.py', '.js', '.sh']
            );

            assert.strictEqual(ext, '.py');
        });

        it('should reject dangerous file extensions', () => {
            const dangerousFiles = [
                'malware.exe',
                'script.bat',
                'payload.dll',
                'trojan.com',
            ];

            dangerousFiles.forEach(file => {
                assert.throws(
                    () => InputValidator.validateFileExtension(file, ['.py', '.js']),
                    /Unsupported file extension/,
                    `Should reject dangerous file: ${file}`
                );
            });
        });

        it('should reject files without extensions', () => {
            assert.throws(
                () => InputValidator.validateFileExtension('script', ['.py']),
                /has no extension/
            );
        });
    });

    describe('Pattern Validation', () => {
        it('should accept strings matching pattern', () => {
            const result = InputValidator.validatePattern(
                'abc123',
                /^[a-z0-9]+$/,
                'username'
            );

            assert.strictEqual(result, 'abc123');
        });

        it('should reject strings not matching pattern', () => {
            assert.throws(
                () => InputValidator.validatePattern(
                    'abc@123',
                    /^[a-z0-9]+$/,
                    'username'
                ),
                /Invalid username format/
            );
        });
    });

    describe('Integer Range Validation', () => {
        it('should accept integers within range', () => {
            const result = InputValidator.validateInteger(5, 1, 10, 'timeout');
            assert.strictEqual(result, 5);
        });

        it('should reject integers outside range', () => {
            assert.throws(
                () => InputValidator.validateInteger(15, 1, 10, 'timeout'),
                /must be between 1 and 10/
            );

            assert.throws(
                () => InputValidator.validateInteger(0, 1, 10, 'timeout'),
                /must be between 1 and 10/
            );
        });

        it('should reject non-integers', () => {
            assert.throws(
                () => InputValidator.validateInteger(5.5, 1, 10, 'timeout'),
                /must be an integer/
            );

            assert.throws(
                () => InputValidator.validateInteger('5', 1, 10, 'timeout'),
                /must be an integer/
            );
        });
    });

    describe('Array Validation', () => {
        it('should accept valid arrays', () => {
            const result = InputValidator.validateArray(
                ['aws', 'azure'],
                ['aws', 'azure', 'gcp'],
                'providers'
            );

            assert.deepStrictEqual(result, ['aws', 'azure']);
        });

        it('should reject arrays with invalid values', () => {
            assert.throws(
                () => InputValidator.validateArray(
                    ['aws', 'invalid'],
                    ['aws', 'azure', 'gcp'],
                    'providers'
                ),
                /Invalid value in providers/
            );
        });

        it('should reject non-arrays', () => {
            assert.throws(
                () => InputValidator.validateArray(
                    'not-array',
                    ['aws'],
                    'providers'
                ),
                /must be an array/
            );
        });
    });

    describe('Required Fields Validation', () => {
        it('should accept objects with all required fields', () => {
            const obj = {
                name: 'test',
                age: 30,
                email: 'test@example.com'
            };

            const result = InputValidator.validateRequiredFields(
                obj,
                ['name', 'age']
            );

            assert.strictEqual(result, obj);
        });

        it('should reject objects missing required fields', () => {
            const obj = {
                name: 'test'
            };

            assert.throws(
                () => InputValidator.validateRequiredFields(
                    obj,
                    ['name', 'age', 'email']
                ),
                /Missing required field\(s\): age, email/
            );
        });
    });
});
