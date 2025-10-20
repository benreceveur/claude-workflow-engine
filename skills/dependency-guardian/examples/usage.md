# Dependency Guardian Skill - Usage Examples

## Example 1: Scan Node.js Project for Vulnerabilities

### Command
```bash
node ~/.claude/memory/skill-executor.js execute dependency-guardian '{
  "operation": "scan",
  "project_dir": "/path/to/node-project"
}'
```

### Output
```json
{
  "success": true,
  "project_type": "npm",
  "vulnerabilities": [
    {
      "package": "lodash",
      "version": "4.17.15",
      "severity": "high",
      "cve": "CVE-2020-8203",
      "title": "Prototype Pollution",
      "recommendation": "Update to lodash@4.17.19 or higher"
    }
  ],
  "summary": {
    "critical": 0,
    "high": 1,
    "medium": 0,
    "low": 0,
    "total": 1
  }
}
```

## Example 2: Check for Outdated Dependencies

### Command
```bash
node ~/.claude/memory/skill-executor.js execute dependency-guardian '{
  "operation": "check-updates",
  "project_dir": "."
}'
```

### Output
```json
{
  "success": true,
  "project_type": "npm",
  "updates": {
    "patch": [
      {"package": "express", "current": "4.17.1", "to": "4.17.3", "type": "patch"}
    ],
    "minor": [
      {"package": "react", "current": "17.0.2", "to": "17.2.0", "type": "minor"}
    ],
    "major": [
      {"package": "webpack", "current": "4.46.0", "to": "5.75.0", "type": "major", "breaking_changes": true}
    ]
  },
  "summary": {
    "total": 15,
    "patch": 8,
    "minor": 5,
    "major": 2
  }
}
```

## Example 3: Update Patch Dependencies

### Command
```bash
node ~/.claude/memory/skill-executor.js execute dependency-guardian '{
  "operation": "update",
  "type": "patch",
  "dry_run": false
}'
```

### Output
```json
{
  "success": true,
  "updates_applied": 8,
  "tests_run": true,
  "tests_passed": true,
  "pr_created": true,
  "pr_url": "https://github.com/user/repo/pull/123"
}
```

## Example 4: Dependency Audit

### Command
```bash
node ~/.claude/memory/skill-executor.js execute dependency-guardian '{
  "operation": "audit",
  "project_dir": "."
}'
```

### Output
```json
{
  "success": true,
  "project_type": "npm",
  "dependencies": {
    "production": 87,
    "development": 160,
    "total": 247
  },
  "depth": {
    "direct": 42,
    "transitive": 205
  }
}
```

## Integration with Claude

### Prompt
```
Scan my project for security vulnerabilities using the dependency-guardian Skill
```

### Response
```
I'll scan your project for security vulnerabilities.

[Skill execution: dependency-guardian]
⚠️  Found 2 vulnerabilities:
- HIGH: lodash@4.17.15 (CVE-2020-8203) - Prototype Pollution
  → Update to lodash@4.17.19 or higher
- MEDIUM: axios@0.19.0 (CVE-2020-28168) - SSRF vulnerability
  → Update to axios@0.21.1 or higher

Recommendation: Run `operation: update, type: patch` to apply security fixes.
```
