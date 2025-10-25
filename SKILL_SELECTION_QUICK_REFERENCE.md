# Skill Selection Quick Reference

## Tested Keyword Phrases (Use These for Best Results)

### Tech Debt Tracker
```
✓ technical debt
✓ tech debt
✓ refactor
✓ code quality
✓ code smell
✓ sqale
```
**Example:** "I need to clean up technical debt in this codebase"

### Test First Change
```
✓ find tests
✓ run tests
✓ test plan
✓ testing strategy
```
**Example:** "Help me find tests for authentication"

### Code Formatter
```
✓ format code
✓ reformat
✓ run formatter
✓ prettier
✓ black
✓ clang-format
```
**Example:** "Please format code in this project"

### Semantic Search
```
✓ semantic search
✓ code search
✓ natural language search
✓ find function
```
**Example:** "Use semantic search to find validation functions"

### FinOps Optimizer
```
✓ cloud cost
✓ finops
✓ aws cost
✓ gcp cost
✓ azure cost
✓ spend optimization
```
**Example:** "Analyze our AWS cost and spending"

### Memory Hygiene
```
✓ memory cleanup
✓ validate memory
✓ clean memory
✓ deduplicate memory
```
**Example:** "Clean memory and validate schema"

### Documentation Sync
```
✓ documentation drift
✓ sync docs
✓ update docs
✓ doc alignment
```
**Example:** "Check for documentation drift"

### Release Orchestrator
```
✓ release plan
✓ version bump
✓ changelog
✓ release notes
```
**Example:** "Generate release notes"

---

## CLI Usage Examples

### Test Skill Detection
```bash
# Test a specific input
node src/auto-behavior-system.js prompt "technical debt"

# Run built-in test suite
node src/auto-behavior-system.js test-skill

# Run comprehensive tests
node test-skill-detection.js

# Run mocha test suite
npm test -- tests/skill-selection.test.js
```

### Check System Status
```bash
# View configuration
node src/auto-behavior-system.js status

# View banner
node src/auto-behavior-system.js banner

# View configuration details
node src/auto-behavior-system.js config show
```

### Update Configuration
```bash
# Lower confidence threshold (recommended)
node src/auto-behavior-system.js config update '{"skillConfidenceThreshold": 0.15}'

# Disable skills orchestration
node src/auto-behavior-system.js config update '{"enableSkillsOrchestration": false}'
```

---

## Test Results Summary

| Scenario | Input | Expected Skill | Status | Confidence |
|----------|-------|----------------|--------|------------|
| Tech Debt | "technical debt cleanup" | tech-debt-tracker | PASS | 14.2% |
| Testing | "find tests" | test-first-change | PASS | 21.2% |
| Formatting | "format code" | code-formatter | PASS | 14.2% |
| Search | "semantic search" | semantic-search | PASS | 21.2% |
| FinOps | "aws cost" | finops-optimizer | PASS | 14.2% |

---

## Current Limitations

1. **Word Order Matters**
   - "find tests" matches
   - "find all tests" does NOT match

2. **Exact Substring Required**
   - "format code" matches
   - "code formatting" does NOT match

3. **Confidence Threshold**
   - Current: 80% (too high)
   - Actual scores: 14-21%
   - Recommended: 15%

---

## Recommended Configuration

```json
{
  "enableAutoDispatch": true,
  "enableMemoryIntegration": true,
  "enableProactiveSuggestions": true,
  "enableSkillsOrchestration": true,
  "enableStrictMode": false,
  "confidenceThreshold": 0.7,
  "skillConfidenceThreshold": 0.15,
  "memoryContextLimit": 6,
  "memorySummarySections": 3,
  "mandatoryAgents": true,
  "logInteractions": true
}
```

**Key Change:** `skillConfidenceThreshold: 0.15` (was 0.8)

---

## Tips for Best Results

1. Use exact keyword phrases from the lists above
2. Keep inputs simple and direct
3. Use lowercase for consistency
4. Include the exact skill keyword in your request
5. Test with `node src/auto-behavior-system.js prompt "your input"` first

---

## Common Pitfalls

AVOID:
- "I need to find all the tests" (word insertion)
- "code formatting" (wrong word order)
- "AWS costs" (plural vs singular)
- "discover tests" (synonym not in keywords)

USE INSTEAD:
- "find tests"
- "format code"
- "aws cost"
- "find tests"

---

## Files Reference

| File | Purpose |
|------|---------|
| `/Users/llmlite/.workflow-engine/skills/skill-manifest.json` | Skill keyword definitions |
| `/Users/llmlite/Documents/GitHub/claude-workflow-engine/src/auto-behavior-system.js` | Main routing logic |
| `/Users/llmlite/Documents/GitHub/claude-workflow-engine/src/skill-router.js` | Skill detection engine |
| `/Users/llmlite/Documents/GitHub/claude-workflow-engine/tests/skill-selection.test.js` | Test suite |
| `/Users/llmlite/Documents/GitHub/claude-workflow-engine/SKILL_SELECTION_TEST_REPORT.md` | Full test report |

---

**Last Updated:** 2025-10-25
