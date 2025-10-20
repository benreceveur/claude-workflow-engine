# Technical Debt Tracker - Usage Examples

## Example 1: Initial Codebase Scan

### Scenario
You want to understand the current technical debt in your project.

### Command
```bash
node ~/.claude/memory/skill-executor.js execute tech-debt-tracker '{"operation":"scan","project_dir":"."}'
```

### Expected Output
```json
{
  "success": true,
  "project_path": "/Users/dev/my-project",
  "scan_timestamp": "2025-10-20T12:00:00Z",
  "debt_items": [
    {
      "file": "src/services/PaymentProcessor.js",
      "line": 45,
      "type": "high_complexity",
      "metric": "cognitive_complexity",
      "score": 32,
      "threshold": 15,
      "severity": "high",
      "description": "Function 'processPayment' has cognitive complexity of 32 (threshold: 15)",
      "recommendation": "Extract nested conditionals into separate functions",
      "effort_estimate": "4-8 hours"
    }
  ],
  "summary": {
    "total_debt_items": 87,
    "by_severity": {
      "critical": 3,
      "high": 12,
      "medium": 45,
      "low": 27
    },
    "by_type": {
      "high_complexity": 15,
      "code_duplication": 23,
      "outdated_patterns": 18,
      "missing_tests": 12,
      "code_smells": 19
    },
    "total_estimated_effort": "120-180 hours"
  },
  "sqale_index": {
    "total_debt_minutes": 7200,
    "total_debt_days": 15,
    "debt_ratio": "5.2%",
    "rating": "B"
  }
}
```

---

## Example 2: Prioritize for Sprint Planning

### Scenario
Your team has 20 hours capacity this sprint and wants to know what debt to tackle.

### Command
```bash
node ~/.claude/memory/skill-executor.js execute tech-debt-tracker '{
  "operation": "prioritize",
  "project_dir": ".",
  "prioritization_strategy": "impact_effort_ratio",
  "business_context": {
    "critical_modules": ["src/payments", "src/auth"],
    "team_capacity": "20 hours"
  }
}'
```

### Expected Output
```json
{
  "success": true,
  "prioritized_debt": [
    {
      "rank": 1,
      "file": "src/payments/PaymentProcessor.js",
      "issue": "Function 'processPayment' has cognitive complexity of 32 (threshold: 15)",
      "impact_score": 12.0,
      "effort_estimate": "4-8 hours",
      "priority": "critical",
      "impact_effort_ratio": 3.0
    },
    {
      "rank": 2,
      "file": "src/auth/SessionManager.js",
      "issue": "Test coverage is 35% (threshold: 80%)",
      "impact_score": 10.5,
      "effort_estimate": "2-4 hours",
      "priority": "high",
      "impact_effort_ratio": 5.25
    }
  ],
  "quick_wins": [
    {
      "file": "src/utils/formatters.js",
      "issue": "10 lines duplicated across 2 files",
      "effort_estimate": "1-2 hours",
      "impact_score": 3.0
    }
  ]
}
```

---

## Example 3: Focus on Complexity Only

### Scenario
You want to scan only for high complexity issues.

### Command
```bash
node ~/.claude/memory/skill-executor.js execute tech-debt-tracker '{
  "operation": "scan",
  "project_dir": ".",
  "metrics": ["complexity"]
}'
```

### Expected Output
```json
{
  "success": true,
  "debt_items": [
    {
      "file": "src/services/UserService.js",
      "line": 120,
      "type": "high_complexity",
      "metric": "cognitive_complexity",
      "score": 28,
      "severity": "high",
      "description": "Function 'validateUser' has cognitive complexity of 28 (threshold: 15)"
    }
  ],
  "summary": {
    "total_debt_items": 15,
    "by_severity": {"high": 8, "medium": 7},
    "by_type": {"high_complexity": 15}
  }
}
```

---

## Example 4: Calculate SQALE Metrics

### Scenario
You need to report technical debt metrics to stakeholders.

### Command
```bash
node ~/.claude/memory/skill-executor.js execute tech-debt-tracker '{
  "operation": "calculate-metrics",
  "project_dir": ".",
  "metric_types": ["sqale", "complexity", "coverage"]
}'
```

### Expected Output
```json
{
  "success": true,
  "metrics": {
    "sqale_index": {
      "total_debt_minutes": 7200,
      "total_debt_days": 15,
      "debt_ratio": "5.2%",
      "rating": "B",
      "remediation_cost": "$36,000"
    }
  }
}
```

---

## Integration with Claude

### Natural Language Usage

**User**: "Analyze our codebase for technical debt"

**Claude**: I'll scan your project for technical debt using the tech-debt-tracker Skill.

[Executes: tech-debt-tracker scan]

**Result**:
```
Found 87 technical debt items:
  Critical: 3 (payment processing complexity)
  High: 12 (missing test coverage in auth)
  Medium: 45 (code duplication, code smells)
  Low: 27 (minor issues)

SQALE Index: 15 days of remediation effort
Debt Ratio: 5.2% (Rating: B)

Top Priority Items:
1. src/payments/PaymentProcessor.js - Complexity 32 (4-8h effort)
2. src/auth/SessionManager.js - Missing tests (2-4h effort)
3. src/api/UserController.js - Code duplication (1-2h effort)

Recommendation: Address top 3 items this sprint for 12% debt reduction.
```

---

## Advanced Usage

### Custom Configuration

Create `.techdebtrc.json`:
```json
{
  "thresholds": {
    "complexity": {
      "cyclomatic": 20,
      "cognitive": 25
    },
    "test_coverage": {
      "min_line_coverage": 85
    }
  },
  "critical_modules": [
    "src/payments",
    "src/auth",
    "src/core"
  ],
  "exclude": [
    "**/*.test.js",
    "**/__mocks__/**",
    "node_modules/**"
  ]
}
```

Then run scan with custom config:
```bash
node ~/.claude/memory/skill-executor.js execute tech-debt-tracker '{"operation":"scan"}'
```

---

## CI/CD Integration

### GitHub Actions
```yaml
name: Tech Debt Check

on: [pull_request]

jobs:
  debt-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Scan for new debt
        run: |
          node ~/.claude/memory/skill-executor.js execute tech-debt-tracker '{
            "operation": "scan",
            "metrics": ["complexity", "duplication"]
          }' > debt-report.json

      - name: Comment on PR
        run: |
          # Parse and comment results
```
