# Release Orchestrator Skill - Usage Examples

## Example 1: Calculate Next Version

### Current State
- Current version: v1.2.5
- Recent commits:
  - `feat(api): add user authentication`
  - `fix(ui): button alignment`
  - `chore: update dependencies`

### Command
```bash
node ~/.claude/memory/skill-executor.js execute release-orchestrator '{
  "operation": "version"
}'
```

### Output
```json
{
  "success": true,
  "current": "v1.2.5",
  "next": "v1.3.0",
  "bump": "minor",
  "commits": {
    "total": 23,
    "breaking": 0,
    "features": 1,
    "fixes": 1,
    "by_type": {
      "feat": 1,
      "fix": 1,
      "chore": 21
    }
  },
  "reason": "New features detected"
}
```

## Example 2: Generate Changelog

### Command
```bash
node ~/.claude/memory/skill-executor.js execute release-orchestrator '{
  "operation": "changelog",
  "from": "v1.2.0",
  "to": "HEAD",
  "output": "CHANGELOG.md"
}
'
```

### Output (CHANGELOG.md)
```markdown
# Changelog

## [v1.3.0] - 2025-10-20

### Features
- **api**: add user authentication (a1b2c3d) @johndoe
- **ui**: implement dark mode (e4f5g6h) @janedoe

### Bug Fixes
- **ui**: button alignment issue (i7j8k9l) @johndoe
- **api**: rate limiting fix (m0n1o2p) @janedoe
```

## Example 3: Create Release (Dry Run)

### Command
```bash
node ~/.claude/memory/skill-executor.js execute release-orchestrator '{
  "operation": "release",
  "type": "minor",
  "dry_run": true
}'
```

### Output
```json
{
  "success": true,
  "version": "v1.3.0",
  "bump": "minor",
  "dry_run": true,
  "steps": [
    {"step": "generate_changelog", "status": "skipped"},
    {"step": "create_tag", "status": "skipped", "tag": "v1.3.0"},
    {"step": "push_tag", "status": "skipped"}
  ]
}
```

## Example 4: Create Actual Release

### Command
```bash
node ~/.claude/memory/skill-executor.js execute release-orchestrator '{
  "operation": "release",
  "type": "minor",
  "dry_run": false
}'
```

### Output
```json
{
  "success": true,
  "version": "v1.3.0",
  "bump": "minor",
  "dry_run": false,
  "steps": [
    {"step": "generate_changelog", "status": "success"},
    {"step": "create_tag", "status": "success", "tag": "v1.3.0"},
    {"step": "push_tag", "status": "success"}
  ]
}
```

## Example 5: Deploy to Staging

### Command
```bash
node ~/.claude/memory/skill-executor.js execute release-orchestrator '{
  "operation": "deploy",
  "environment": "staging",
  "version": "v1.3.0"
}'
```

### Output
```json
{
  "success": true,
  "environment": "staging",
  "version": "v1.3.0",
  "message": "Deployment to staging would happen here",
  "health_checks": {
    "placeholder": "passed"
  }
}
```

## Integration with Claude

### Prompt
```
Create a new minor release using the release-orchestrator Skill
```

### Response
```
I'll create a new minor release for you.

[Skill execution: release-orchestrator]
✅ Release v1.3.0 created successfully
- Bump type: minor (new features)
- Changelog generated with 23 commits
- Git tag created and pushed
- Ready for deployment

Next steps:
1. Deploy to staging: `operation: deploy, environment: staging`
2. Run integration tests
3. Deploy to production after approval
```
