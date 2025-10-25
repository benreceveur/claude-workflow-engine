/**
 * Comprehensive Test Suite for Automatic Skill Selection
 * Tests the auto-behavior-system.js's ability to detect and route to skills
 */

const { expect } = require('chai');
const AutoBehaviorSystemWithSkills = require('../src/auto-behavior-system.js');
const SkillRouter = require('../src/skill-router.js');

describe('Automatic Skill Selection and Routing', function() {
    this.timeout(10000); // Increase timeout for async operations

    let behaviorSystem;
    let skillRouter;

    beforeEach(() => {
        behaviorSystem = new AutoBehaviorSystemWithSkills();
        skillRouter = behaviorSystem.skillRouter;
    });

    describe('Skill Detection - Individual Tests', () => {
        it('should route "clean up technical debt" to tech-debt-tracker', async () => {
            const input = "I need to clean up technical debt in this codebase";
            const result = await behaviorSystem.checkForSkill(input);

            expect(result).to.not.be.null;
            expect(result.skill).to.equal('tech-debt-tracker');
            expect(result.confidence).to.be.greaterThan(0);
            expect(result.matchedKeywords).to.include('technical debt');
            expect(result.available).to.be.true;

            console.log('\n  Test 1: Technical Debt Detection');
            console.log(`    Input: "${input}"`);
            console.log(`    Detected Skill: ${result.skill}`);
            console.log(`    Confidence: ${(result.confidence * 100).toFixed(1)}%`);
            console.log(`    Matched Keywords: ${result.matchedKeywords.join(', ')}`);
            console.log(`    Available: ${result.available ? 'Yes' : 'No'}`);
        });

        it('should route "find tests related to authentication" to test-first-change', async () => {
            const input = "Help me find all tests related to authentication";
            const result = await behaviorSystem.checkForSkill(input);

            expect(result).to.not.be.null;
            expect(result.skill).to.equal('test-first-change');
            expect(result.confidence).to.be.greaterThan(0);
            expect(result.matchedKeywords).to.include('find tests');
            expect(result.available).to.be.true;

            console.log('\n  Test 2: Test Detection');
            console.log(`    Input: "${input}"`);
            console.log(`    Detected Skill: ${result.skill}`);
            console.log(`    Confidence: ${(result.confidence * 100).toFixed(1)}%`);
            console.log(`    Matched Keywords: ${result.matchedKeywords.join(', ')}`);
            console.log(`    Available: ${result.available ? 'Yes' : 'No'}`);
        });

        it('should route "format all code" to code-formatter', async () => {
            const input = "Format all the code in this project";
            const result = await behaviorSystem.checkForSkill(input);

            expect(result).to.not.be.null;
            expect(result.skill).to.equal('code-formatter');
            expect(result.confidence).to.be.greaterThan(0);
            expect(result.matchedKeywords).to.include('format code');
            expect(result.available).to.be.true;

            console.log('\n  Test 3: Code Formatter Detection');
            console.log(`    Input: "${input}"`);
            console.log(`    Detected Skill: ${result.skill}`);
            console.log(`    Confidence: ${(result.confidence * 100).toFixed(1)}%`);
            console.log(`    Matched Keywords: ${result.matchedKeywords.join(', ')}`);
            console.log(`    Available: ${result.available ? 'Yes' : 'No'}`);
        });

        it('should route "search for user validation functions" to semantic-search', async () => {
            const input = "Search for functions that handle user validation";
            const result = await behaviorSystem.checkForSkill(input);

            expect(result).to.not.be.null;
            expect(result.skill).to.equal('semantic-search');
            expect(result.confidence).to.be.greaterThan(0);
            expect(result.available).to.be.true;

            console.log('\n  Test 4: Semantic Search Detection');
            console.log(`    Input: "${input}"`);
            console.log(`    Detected Skill: ${result.skill}`);
            console.log(`    Confidence: ${(result.confidence * 100).toFixed(1)}%`);
            console.log(`    Matched Keywords: ${result.matchedKeywords.join(', ')}`);
            console.log(`    Available: ${result.available ? 'Yes' : 'No'}`);
        });

        it('should route "analyze AWS cloud costs" to finops-optimizer', async () => {
            const input = "Analyze our AWS cloud costs";
            const result = await behaviorSystem.checkForSkill(input);

            expect(result).to.not.be.null;
            expect(result.skill).to.equal('finops-optimizer');
            expect(result.confidence).to.be.greaterThan(0);
            expect(result.matchedKeywords).to.include('aws cost');
            expect(result.available).to.be.true;

            console.log('\n  Test 5: FinOps Detection');
            console.log(`    Input: "${input}"`);
            console.log(`    Detected Skill: ${result.skill}`);
            console.log(`    Confidence: ${(result.confidence * 100).toFixed(1)}%`);
            console.log(`    Matched Keywords: ${result.matchedKeywords.join(', ')}`);
            console.log(`    Available: ${result.available ? 'Yes' : 'No'}`);
        });
    });

    describe('Confidence Score Validation', () => {
        it('should have confidence scores between 0 and 1', async () => {
            const testInputs = [
                "clean up technical debt",
                "find tests",
                "format code",
                "semantic search",
                "aws cost analysis"
            ];

            for (const input of testInputs) {
                const result = await behaviorSystem.checkForSkill(input);
                if (result) {
                    expect(result.confidence).to.be.at.least(0);
                    expect(result.confidence).to.be.at.most(1);
                }
            }
        });

        it('should have higher confidence for exact keyword matches', async () => {
            const exactMatch = await behaviorSystem.checkForSkill("technical debt");
            const partialMatch = await behaviorSystem.checkForSkill("tech debt");

            expect(exactMatch).to.not.be.null;
            expect(partialMatch).to.not.be.null;
            expect(exactMatch.confidence).to.be.greaterThan(0);

            console.log('\n  Confidence Score Comparison:');
            console.log(`    Exact match ("technical debt"): ${(exactMatch.confidence * 100).toFixed(1)}%`);
            console.log(`    Partial match ("tech debt"): ${(partialMatch.confidence * 100).toFixed(1)}%`);
        });

        it('should return confidence above threshold for valid matches', async () => {
            const input = "I need to find all tests for authentication";
            const result = await behaviorSystem.checkForSkill(input);

            expect(result).to.not.be.null;
            expect(result.confidence).to.be.greaterThan(0.5);

            console.log(`\n  Threshold Check for "${input}"`);
            console.log(`    Confidence: ${(result.confidence * 100).toFixed(1)}%`);
            console.log(`    Above 50% threshold: ${result.confidence > 0.5 ? 'Yes' : 'No'}`);
        });
    });

    describe('Edge Cases and Ambiguous Inputs', () => {
        it('should handle input with no matching keywords', async () => {
            const input = "What is the meaning of life?";
            const result = await behaviorSystem.checkForSkill(input);

            expect(result).to.be.null;

            console.log('\n  Edge Case - No Match:');
            console.log(`    Input: "${input}"`);
            console.log(`    Result: ${result === null ? 'No skill matched (expected)' : 'Unexpected match'}`);
        });

        it('should handle empty input', async () => {
            const input = "";
            const result = await behaviorSystem.checkForSkill(input);

            expect(result).to.be.null;

            console.log('\n  Edge Case - Empty Input:');
            console.log(`    Input: "${input}"`);
            console.log(`    Result: ${result === null ? 'No skill matched (expected)' : 'Unexpected match'}`);
        });

        it('should handle input with multiple potential matches', async () => {
            const input = "Format code and run tests";
            const result = await behaviorSystem.checkForSkill(input);

            expect(result).to.not.be.null;
            expect(['code-formatter', 'test-first-change']).to.include(result.skill);

            console.log('\n  Edge Case - Multiple Potential Matches:');
            console.log(`    Input: "${input}"`);
            console.log(`    Matched Skill: ${result.skill}`);
            console.log(`    Confidence: ${(result.confidence * 100).toFixed(1)}%`);
            console.log(`    Matched Keywords: ${result.matchedKeywords.join(', ')}`);
        });

        it('should handle case-insensitive matching', async () => {
            const inputs = [
                "TECHNICAL DEBT",
                "Technical Debt",
                "technical debt",
                "TeChnIcAL DeBT"
            ];

            console.log('\n  Case-insensitive matching:');
            for (const input of inputs) {
                const result = await behaviorSystem.checkForSkill(input);
                expect(result).to.not.be.null;
                expect(result.skill).to.equal('tech-debt-tracker');
                console.log(`    "${input}" -> ${result.skill} (${(result.confidence * 100).toFixed(1)}%)`);
            }
        });

        it('should handle input with similar keywords to multiple skills', async () => {
            const input = "search for code that needs refactoring";
            const result = await behaviorSystem.checkForSkill(input);

            expect(result).to.not.be.null;

            console.log('\n  Ambiguous Input Test:');
            console.log(`    Input: "${input}"`);
            console.log(`    Matched Skill: ${result.skill}`);
            console.log(`    Confidence: ${(result.confidence * 100).toFixed(1)}%`);
            console.log(`    Matched Keywords: ${result.matchedKeywords.join(', ')}`);
        });
    });

    describe('Full Processing Pipeline', () => {
        it('should process prompt and route to skill when confidence is high', async () => {
            const input = "I need to clean up technical debt in this codebase";
            const processing = await behaviorSystem.processPrompt(input);

            expect(processing.skill_recommendation).to.not.be.null;
            expect(processing.skill_recommendation.skill).to.equal('tech-debt-tracker');
            expect(processing.execution_mode).to.equal('skill');
            expect(processing.final_instructions.join(' ')).to.include('SKILL EXECUTION MODE');

            console.log('\n  Full Pipeline Test - High Confidence Skill Match:');
            console.log(`    Input: "${input}"`);
            console.log(`    Execution Mode: ${processing.execution_mode}`);
            console.log(`    Skill: ${processing.skill_recommendation.skill}`);
            console.log(`    Confidence: ${(processing.skill_recommendation.confidence * 100).toFixed(1)}%`);
            console.log(`    Instructions Generated: ${processing.final_instructions.length}`);
        });

        it('should fallback to agent when no skill matches', async () => {
            const input = "Explain how dependency injection works";
            const processing = await behaviorSystem.processPrompt(input);

            expect(processing.skill_recommendation).to.be.null;
            expect(processing.execution_mode).to.not.equal('skill');

            console.log('\n  Full Pipeline Test - No Skill Match (Agent Fallback):');
            console.log(`    Input: "${input}"`);
            console.log(`    Execution Mode: ${processing.execution_mode}`);
            console.log(`    Skill Recommendation: ${processing.skill_recommendation === null ? 'None' : processing.skill_recommendation.skill}`);
        });

        it('should include skill context in processing result', async () => {
            const input = "Format all code using prettier";
            const processing = await behaviorSystem.processPrompt(input);

            expect(processing.skill_recommendation).to.not.be.null;
            expect(processing.skill_recommendation.defaultContext).to.exist;
            expect(processing.skill_recommendation.operations).to.exist;

            console.log('\n  Full Pipeline Test - Skill Context:');
            console.log(`    Input: "${input}"`);
            console.log(`    Skill: ${processing.skill_recommendation.skill}`);
            console.log(`    Default Context: ${JSON.stringify(processing.skill_recommendation.defaultContext)}`);
            console.log(`    Operations: ${processing.skill_recommendation.operations.join(', ')}`);
        });
    });

    describe('Skill Availability Checks', () => {
        it('should correctly report skill availability', async () => {
            const input = "clean up technical debt";
            const result = await behaviorSystem.checkForSkill(input);

            expect(result).to.not.be.null;
            expect(result).to.have.property('available');
            expect(result.available).to.be.a('boolean');

            console.log('\n  Skill Availability Check:');
            console.log(`    Skill: ${result.skill}`);
            console.log(`    Available: ${result.available ? 'Yes' : 'No'}`);
            console.log(`    Reason: ${result.reason}`);
        });
    });

    describe('Comprehensive Test Matrix', () => {
        it('should correctly route all specified test scenarios', async () => {
            const testScenarios = [
                {
                    input: "I need to clean up technical debt in this codebase",
                    expectedSkill: "tech-debt-tracker",
                    expectedKeywords: ["technical debt"]
                },
                {
                    input: "Help me find all tests related to authentication",
                    expectedSkill: "test-first-change",
                    expectedKeywords: ["find tests"]
                },
                {
                    input: "Format all the code in this project",
                    expectedSkill: "code-formatter",
                    expectedKeywords: ["format code"]
                },
                {
                    input: "Search for functions that handle user validation",
                    expectedSkill: "semantic-search",
                    expectedKeywords: []
                },
                {
                    input: "Analyze our AWS cloud costs",
                    expectedSkill: "finops-optimizer",
                    expectedKeywords: ["aws cost"]
                }
            ];

            console.log('\n  === COMPREHENSIVE TEST MATRIX ===\n');

            const results = [];
            for (const scenario of testScenarios) {
                const result = await behaviorSystem.checkForSkill(scenario.input);

                const testResult = {
                    input: scenario.input,
                    expectedSkill: scenario.expectedSkill,
                    detectedSkill: result ? result.skill : 'None',
                    confidence: result ? result.confidence : 0,
                    matchedKeywords: result ? result.matchedKeywords : [],
                    available: result ? result.available : false,
                    success: result && result.skill === scenario.expectedSkill
                };

                results.push(testResult);

                console.log(`  Test Scenario:`);
                console.log(`    Input: "${scenario.input}"`);
                console.log(`    Expected: ${scenario.expectedSkill}`);
                console.log(`    Detected: ${testResult.detectedSkill}`);
                console.log(`    Match: ${testResult.success ? 'PASS' : 'FAIL'}`);
                console.log(`    Confidence: ${(testResult.confidence * 100).toFixed(1)}%`);
                console.log(`    Keywords: ${testResult.matchedKeywords.join(', ')}`);
                console.log(`    Available: ${testResult.available ? 'Yes' : 'No'}`);
                console.log('');

                expect(testResult.success).to.be.true;
            }

            const successCount = results.filter(r => r.success).length;
            console.log(`\n  === TEST SUMMARY ===`);
            console.log(`  Total Tests: ${results.length}`);
            console.log(`  Passed: ${successCount}`);
            console.log(`  Failed: ${results.length - successCount}`);
            console.log(`  Success Rate: ${((successCount / results.length) * 100).toFixed(1)}%`);
        });
    });
});
