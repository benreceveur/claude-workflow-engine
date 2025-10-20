# Documentation Sync Skill - Usage Examples

## Example 1: Detect API Documentation Drift

Check if README documentation matches current code signatures:

```bash
python ~/.claude/skills/documentation-sync/scripts/main.py \
  --operation detect-drift \
  --doc-file README.md \
  --code-dir ./src
```

**Output:**
```json
{
  "success": true,
  "operation": "detect-drift",
  "drift_detected": true,
  "drift_count": 3,
  "issues": [
    {
      "type": "signature_mismatch",
      "location": "README.md:45",
      "documented": "process_data(data, format='json')",
      "actual": "process_data(data, format='json', validate=True)",
      "severity": "high",
      "suggestion": "Add 'validate' parameter to documentation"
    }
  ],
  "execution_time_ms": 45
}
```

## Example 2: Validate Code Examples

Validate all Python examples in README execute correctly:

```bash
python ~/.claude/skills/documentation-sync/scripts/main.py \
  --operation validate-examples \
  --doc-file README.md \
  --execute
```

**Output:**
```json
{
  "success": true,
  "operation": "validate-examples",
  "examples_found": 8,
  "examples_passed": 6,
  "examples_failed": 2,
  "results": [
    {
      "example_id": "basic-usage",
      "location": "README.md:23-28",
      "language": "python",
      "status": "passed",
      "execution_time_ms": 145
    }
  ],
  "execution_time_ms": 892
}
```

## Example 3: Generate Architecture Diagram

Create component diagram showing module dependencies:

```bash
python ~/.claude/skills/documentation-sync/scripts/main.py \
  --operation generate-diagram \
  --code-dir ./src \
  --diagram-type component
```

**Output:**
```json
{
  "success": true,
  "operation": "generate-diagram",
  "diagram_type": "component",
  "format": "mermaid",
  "diagram": "graph TD\n  A[API Module] --> B[Auth Service]\n  A --> C[Data Layer]",
  "execution_time_ms": 234
}
```

## Example 4: Comprehensive Documentation Sync

Run full synchronization before release:

```bash
python ~/.claude/skills/documentation-sync/scripts/main.py \
  --operation sync-all \
  --code-dir ./src \
  --doc-dir ./docs
```

**Output:**
```json
{
  "success": true,
  "operation": "sync-all",
  "timestamp": "2025-10-20T14:30:00Z",
  "summary": {
    "drift_issues": 3,
    "example_failures": 2,
    "coverage_score": 76
  },
  "execution_time_ms": 1456
}
```
