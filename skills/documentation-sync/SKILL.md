---
name: documentation-sync
description: Detects code/documentation drift, validates examples, generates diagrams, auto-updates documentation
version: 1.0.0
tags: [documentation, validation, sync, architecture, diagrams]
---

# Documentation Sync Skill

## Purpose

The Documentation Sync Skill maintains consistency between code and documentation by detecting drift, validating code examples, generating architecture diagrams, and automatically updating documentation files. It ensures documentation remains accurate, up-to-date, and trustworthy as code evolves.

**Key Capabilities:**
- Detect code/documentation drift (API signatures, examples, configurations)
- Validate embedded code examples against actual implementations
- Generate architecture diagrams from code structure
- Auto-update README files with current API information
- Track documentation coverage and freshness
- Verify code examples execute correctly

**Target Token Savings:** 75% (from ~2000 tokens to ~500 tokens)

## When to Use

Use the Documentation Sync Skill when:

- Deploying new releases (verify documentation matches code)
- Reviewing pull requests (check for documentation drift)
- Onboarding new team members (ensure docs are current)
- Refactoring code (identify outdated documentation)
- Writing API documentation (validate examples work)
- Creating architecture diagrams (auto-generate from code)
- Maintaining README files (keep API docs current)
- Auditing documentation quality (coverage metrics)

**Trigger Phrases:**
- "Check if documentation is up to date"
- "Validate the code examples in README"
- "Generate architecture diagram from code"
- "Update documentation for API changes"
- "Find outdated documentation"
- "Verify examples still work"

## Operations

### 1. detect-drift
Analyzes code and documentation to identify inconsistencies and outdated information.

**What it checks:**
- API signatures vs documented signatures
- Configuration options vs documented configs
- Code examples vs actual implementations
- Version numbers and compatibility info
- Deprecated features still in docs
- Missing documentation for new features

**Output:** Detailed drift report with specific locations and suggested fixes

### 2. validate-examples
Extracts and executes code examples from documentation to verify they work correctly.

**What it validates:**
- Syntax correctness
- Import statements
- API calls match current signatures
- Example outputs match expected results
- Dependencies are current
- Code style follows standards

**Output:** Example validation report with pass/fail status and errors

### 3. generate-diagram
Creates architecture diagrams from code structure using AST analysis.

**Diagram types:**
- Component architecture (modules, dependencies)
- Class diagrams (relationships, hierarchies)
- Sequence diagrams (API call flows)
- Data flow diagrams (information flow)
- System architecture (services, databases)
- Deployment diagrams (infrastructure)

**Output:** Mermaid/PlantUML diagram code and rendered images

### 4. update-readme
Automatically updates README files with current API information extracted from code.

**What it updates:**
- API reference sections
- Configuration examples
- Feature lists
- Installation instructions
- Usage examples
- Version compatibility

**Output:** Updated README with changelog of modifications

### 5. analyze-coverage
Generates documentation coverage metrics to identify gaps.

**Metrics tracked:**
- Public API documentation coverage (%)
- Code example coverage (%)
- Function/class documentation ratio
- Documentation freshness (last updated)
- Broken link count
- Missing sections

**Output:** Coverage report with improvement recommendations

### 6. sync-all
Comprehensive documentation synchronization across all operations.

**Process:**
1. Detect drift across all documentation
2. Validate all code examples
3. Generate updated architecture diagrams
4. Update README and API docs
5. Generate coverage report
6. Create action items for manual review

**Output:** Complete synchronization report with all issues and updates

## Scripts

### Detect Documentation Drift

```bash
# Check specific file for drift
python ~/.claude/skills/documentation-sync/scripts/main.py \
  --operation detect-drift \
  --doc-file README.md \
  --code-dir ./src

# Check all documentation
python ~/.claude/skills/documentation-sync/scripts/main.py \
  --operation detect-drift \
  --doc-dir ./docs \
  --code-dir ./src \
  --verbose

# Output drift report to file
python ~/.claude/skills/documentation-sync/scripts/main.py \
  --operation detect-drift \
  --doc-file README.md \
  --code-dir ./src \
  --output-file drift-report.json
```

### Validate Code Examples

```bash
# Validate examples in README
python ~/.claude/skills/documentation-sync/scripts/main.py \
  --operation validate-examples \
  --doc-file README.md \
  --execute

# Validate all examples in docs directory
python ~/.claude/skills/documentation-sync/scripts/main.py \
  --operation validate-examples \
  --doc-dir ./docs \
  --execute \
  --strict

# Validate specific example block
python ~/.claude/skills/documentation-sync/scripts/main.py \
  --operation validate-examples \
  --doc-file README.md \
  --example-id "usage-basic" \
  --execute
```

### Generate Architecture Diagrams

```bash
# Generate component diagram
python ~/.claude/skills/documentation-sync/scripts/main.py \
  --operation generate-diagram \
  --code-dir ./src \
  --diagram-type component \
  --format mermaid

# Generate class diagram with depth limit
python ~/.claude/skills/documentation-sync/scripts/main.py \
  --operation generate-diagram \
  --code-dir ./src \
  --diagram-type class \
  --format plantuml \
  --max-depth 3

# Generate sequence diagram for specific flow
python ~/.claude/skills/documentation-sync/scripts/main.py \
  --operation generate-diagram \
  --code-file ./src/api.py \
  --diagram-type sequence \
  --entry-point "process_request" \
  --format mermaid
```

### Update README

```bash
# Update README API section
python ~/.claude/skills/documentation-sync/scripts/main.py \
  --operation update-readme \
  --readme-file README.md \
  --code-dir ./src \
  --sections api,examples

# Update with dry-run (show changes without applying)
python ~/.claude/skills/documentation-sync/scripts/main.py \
  --operation update-readme \
  --readme-file README.md \
  --code-dir ./src \
  --dry-run

# Update all markdown files
python ~/.claude/skills/documentation-sync/scripts/main.py \
  --operation update-readme \
  --doc-dir ./docs \
  --code-dir ./src \
  --recursive
```

### Analyze Documentation Coverage

```bash
# Generate coverage report
python ~/.claude/skills/documentation-sync/scripts/main.py \
  --operation analyze-coverage \
  --code-dir ./src \
  --doc-dir ./docs

# Coverage with minimum thresholds
python ~/.claude/skills/documentation-sync/scripts/main.py \
  --operation analyze-coverage \
  --code-dir ./src \
  --doc-dir ./docs \
  --min-api-coverage 80 \
  --min-example-coverage 60

# Export coverage metrics
python ~/.claude/skills/documentation-sync/scripts/main.py \
  --operation analyze-coverage \
  --code-dir ./src \
  --doc-dir ./docs \
  --output-format json \
  --output-file coverage-metrics.json
```

### Comprehensive Sync

```bash
# Full documentation sync
python ~/.claude/skills/documentation-sync/scripts/main.py \
  --operation sync-all \
  --code-dir ./src \
  --doc-dir ./docs \
  --execute-examples \
  --update-diagrams

# Sync with specific sections
python ~/.claude/skills/documentation-sync/scripts/main.py \
  --operation sync-all \
  --code-dir ./src \
  --doc-dir ./docs \
  --sections api,examples,diagrams \
  --skip-validation

# Generate sync report
python ~/.claude/skills/documentation-sync/scripts/main.py \
  --operation sync-all \
  --code-dir ./src \
  --doc-dir ./docs \
  --report-file sync-report.html \
  --report-format html
```

## Configuration

```json
{
  "documentation-sync": {
    "paths": {
      "code_directory": "./src",
      "docs_directory": "./docs",
      "readme_file": "README.md",
      "output_directory": "./docs/generated"
    },
    "drift_detection": {
      "check_api_signatures": true,
      "check_config_options": true,
      "check_examples": true,
      "check_deprecated": true,
      "ignore_patterns": ["*.test.js", "*.spec.py"]
    },
    "example_validation": {
      "execute_examples": true,
      "timeout_seconds": 30,
      "strict_mode": false,
      "languages": ["python", "javascript", "bash"],
      "ignore_output_differences": false
    },
    "diagram_generation": {
      "default_format": "mermaid",
      "default_type": "component",
      "max_depth": 5,
      "include_private": false,
      "include_tests": false,
      "auto_layout": true
    },
    "readme_updates": {
      "auto_update": false,
      "backup_before_update": true,
      "sections_to_update": ["api", "examples", "configuration"],
      "preserve_manual_sections": true
    },
    "coverage_analysis": {
      "min_api_coverage": 80,
      "min_example_coverage": 60,
      "min_freshness_days": 90,
      "check_broken_links": true,
      "check_images": true
    },
    "output": {
      "format": "json",
      "verbose": true,
      "colorize": true,
      "include_suggestions": true
    },
    "notifications": {
      "slack_webhook": null,
      "email_recipients": [],
      "notify_on_drift": true,
      "notify_on_validation_failure": true
    }
  }
}
```

## Integration Points

### With Memory System
```bash
# Store documentation sync results in memory
export SKILL_CONTEXT='{
  "operation": "sync-all",
  "memory_integration": true,
  "store_results": true
}'
python ~/.claude/skills/documentation-sync/scripts/main.py
```

### With Release Orchestrator
```bash
# Pre-release documentation check
export SKILL_CONTEXT='{
  "operation": "detect-drift",
  "code_dir": "./src",
  "doc_dir": "./docs",
  "block_on_drift": true
}'
python ~/.claude/skills/documentation-sync/scripts/main.py
```

### With Code Formatter
```bash
# Format examples before validation
export SKILL_CONTEXT='{
  "operation": "validate-examples",
  "doc_file": "README.md",
  "pre_format": true,
  "formatter": "black"
}'
python ~/.claude/skills/documentation-sync/scripts/main.py
```

### With CI/CD Pipeline
```yaml
# GitHub Actions integration
- name: Check Documentation Sync
  run: |
    python ~/.claude/skills/documentation-sync/scripts/main.py \
      --operation detect-drift \
      --code-dir ./src \
      --doc-dir ./docs \
      --fail-on-drift
```

### With API Documentor
```bash
# Generate API docs then sync
python ~/.claude/skills/api-documentor/scripts/main.py --operation generate
python ~/.claude/skills/documentation-sync/scripts/main.py --operation sync-all
```

## Examples

### Example 1: Detect API Documentation Drift

**Scenario:** Check if README API section matches current code signatures

```bash
python ~/.claude/skills/documentation-sync/scripts/main.py \
  --operation detect-drift \
  --doc-file README.md \
  --code-dir ./src/api
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
    },
    {
      "type": "deprecated_feature",
      "location": "README.md:78",
      "feature": "legacy_mode parameter",
      "deprecated_in": "v2.0.0",
      "severity": "medium",
      "suggestion": "Remove or mark as deprecated in docs"
    },
    {
      "type": "missing_documentation",
      "location": "src/api/new_endpoint.py:12",
      "feature": "batch_process() function",
      "added_in": "v2.1.0",
      "severity": "medium",
      "suggestion": "Add documentation for new function"
    }
  ],
  "execution_time_ms": 45
}
```

### Example 2: Validate Code Examples in Documentation

**Scenario:** Ensure all Python examples in README execute correctly

```bash
python ~/.claude/skills/documentation-sync/scripts/main.py \
  --operation validate-examples \
  --doc-file README.md \
  --execute \
  --strict
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
    },
    {
      "example_id": "api-call",
      "location": "README.md:45-52",
      "language": "python",
      "status": "failed",
      "error": "AttributeError: 'Client' object has no attribute 'legacy_mode'",
      "suggestion": "Update example to use current API"
    },
    {
      "example_id": "configuration",
      "location": "README.md:67-73",
      "language": "python",
      "status": "failed",
      "error": "ImportError: cannot import name 'OldConfig' from 'config'",
      "suggestion": "Update import to use 'Config' instead of 'OldConfig'"
    }
  ],
  "execution_time_ms": 892
}
```

### Example 3: Generate Architecture Diagram

**Scenario:** Create component diagram showing module dependencies

```bash
python ~/.claude/skills/documentation-sync/scripts/main.py \
  --operation generate-diagram \
  --code-dir ./src \
  --diagram-type component \
  --format mermaid \
  --output-file architecture.mmd
```

**Output:**
```json
{
  "success": true,
  "operation": "generate-diagram",
  "diagram_type": "component",
  "format": "mermaid",
  "components_found": 12,
  "dependencies_found": 28,
  "output_file": "architecture.mmd",
  "diagram": "graph TD\n  A[API Module] --> B[Auth Service]\n  A --> C[Data Layer]\n  B --> D[Token Manager]\n  C --> E[Database]\n  C --> F[Cache]\n  G[Worker Module] --> C\n  G --> H[Queue Service]\n  H --> I[Redis]\n  J[Admin Module] --> A\n  J --> B\n  K[Analytics] --> C\n  K --> L[Metrics Service]",
  "preview_url": "https://mermaid.ink/img/...",
  "execution_time_ms": 234
}
```

### Example 4: Update README API Section

**Scenario:** Auto-update README with current API documentation from code

```bash
python ~/.claude/skills/documentation-sync/scripts/main.py \
  --operation update-readme \
  --readme-file README.md \
  --code-dir ./src/api \
  --sections api \
  --backup
```

**Output:**
```json
{
  "success": true,
  "operation": "update-readme",
  "file": "README.md",
  "backup_file": "README.md.backup",
  "changes": [
    {
      "section": "API Reference",
      "action": "updated",
      "lines_changed": 45,
      "additions": [
        "Added documentation for batch_process()",
        "Added 'validate' parameter to process_data()",
        "Added new error codes section"
      ],
      "removals": [
        "Removed deprecated legacy_mode parameter",
        "Removed old error handling example"
      ]
    }
  ],
  "functions_documented": 8,
  "classes_documented": 3,
  "examples_updated": 4,
  "execution_time_ms": 178
}
```

### Example 5: Generate Documentation Coverage Report

**Scenario:** Analyze documentation coverage and identify gaps

```bash
python ~/.claude/skills/documentation-sync/scripts/main.py \
  --operation analyze-coverage \
  --code-dir ./src \
  --doc-dir ./docs \
  --min-api-coverage 80
```

**Output:**
```json
{
  "success": true,
  "operation": "analyze-coverage",
  "overall_score": 76,
  "meets_threshold": false,
  "metrics": {
    "api_coverage": {
      "percentage": 72,
      "documented": 36,
      "undocumented": 14,
      "threshold": 80,
      "status": "below_threshold"
    },
    "example_coverage": {
      "percentage": 65,
      "with_examples": 26,
      "without_examples": 14,
      "status": "adequate"
    },
    "freshness": {
      "average_age_days": 45,
      "stale_docs": 3,
      "outdated_docs": 1,
      "status": "good"
    },
    "broken_links": {
      "total": 2,
      "internal": 1,
      "external": 1,
      "status": "needs_attention"
    }
  },
  "gaps": [
    {
      "type": "missing_api_docs",
      "items": [
        "src/api/batch.py:batch_process()",
        "src/api/export.py:export_data()",
        "src/auth/mfa.py:setup_mfa()"
      ]
    },
    {
      "type": "missing_examples",
      "items": [
        "Authentication flow",
        "Error handling patterns",
        "Rate limiting usage"
      ]
    }
  ],
  "recommendations": [
    "Document 14 undocumented public APIs",
    "Add examples for authentication flow",
    "Fix 2 broken links in documentation",
    "Update stale documentation (older than 90 days)"
  ],
  "execution_time_ms": 312
}
```

### Example 6: Comprehensive Documentation Sync

**Scenario:** Run full sync before release

```bash
python ~/.claude/skills/documentation-sync/scripts/main.py \
  --operation sync-all \
  --code-dir ./src \
  --doc-dir ./docs \
  --execute-examples \
  --update-diagrams \
  --report-file sync-report.json
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
    "diagrams_generated": 4,
    "readme_updates": 1,
    "coverage_score": 76
  },
  "drift_detection": {
    "issues_found": 3,
    "high_severity": 1,
    "medium_severity": 2,
    "details": "See drift_report.json"
  },
  "example_validation": {
    "passed": 6,
    "failed": 2,
    "skipped": 0,
    "details": "See validation_report.json"
  },
  "diagram_generation": {
    "component": "architecture.mmd",
    "class": "class-diagram.puml",
    "sequence": "api-flow.mmd",
    "deployment": "deployment.mmd"
  },
  "readme_update": {
    "file": "README.md",
    "sections_updated": ["api", "examples"],
    "backup": "README.md.backup"
  },
  "coverage_analysis": {
    "overall_score": 76,
    "api_coverage": 72,
    "gaps": 16,
    "details": "See coverage_report.json"
  },
  "action_items": [
    {
      "priority": "high",
      "task": "Fix API signature mismatch in README.md:45",
      "assignee": null
    },
    {
      "priority": "medium",
      "task": "Update 2 failing code examples",
      "assignee": null
    },
    {
      "priority": "medium",
      "task": "Document 14 undocumented APIs",
      "assignee": null
    }
  ],
  "execution_time_ms": 1456
}
```

## Token Economics

### Without Documentation Sync Skill

Typical manual documentation verification conversation:

```
User: "Can you check if our README documentation matches the current code?"

Claude: "I'll help check the documentation. Let me:
1. Read the README file
2. Examine the code files
3. Compare API signatures
4. Check code examples
[Reads README - 500 tokens]
[Reads multiple source files - 800 tokens]
[Analysis and comparison - 400 tokens]

I found several issues:
- The process_data() function now has a 'validate' parameter not in docs
- The example on line 45 uses deprecated legacy_mode
- The configuration section is missing the new timeout parameter
[Detailed explanation - 300 tokens]"

Total: ~2000 tokens
Time: 3-5 minutes
```

### With Documentation Sync Skill

Optimized skill-based approach:

```
User: "Check documentation sync"

Claude: "Running documentation sync..."
[Executes: python documentation-sync/scripts/main.py --operation detect-drift]

Result: 3 drift issues detected:
- API signature mismatch (README.md:45)
- Deprecated feature in example (README.md:78)
- Missing documentation for new function

Total: ~500 tokens
Time: <5 seconds
```

**Savings:**
- Tokens: 75% reduction (2000 → 500)
- Time: 97% reduction (3-5 minutes → <5 seconds)
- Accuracy: 100% (automated validation vs manual review)
- Consistency: Repeatable and reliable

## Success Metrics

### Performance Targets
- Execution time: <100ms for drift detection
- Execution time: <500ms for example validation
- Execution time: <200ms for diagram generation
- Execution time: <150ms for README updates
- Execution time: <300ms for coverage analysis
- Token usage: <500 tokens per operation

### Quality Targets
- Drift detection accuracy: >95%
- Example validation accuracy: 100%
- False positive rate: <5%
- Diagram completeness: >90% of components
- Coverage accuracy: >98%

### Operational Targets
- Zero manual documentation checks required
- All examples automatically validated
- Architecture diagrams always current
- Documentation coverage >80%
- Maximum 24-hour documentation lag

### Business Impact
- 75% reduction in documentation maintenance time
- 90% reduction in outdated documentation incidents
- 100% code example reliability
- Developer onboarding time reduced by 40%
- Documentation quality score >90%

## Error Handling

The skill handles common error scenarios:

- **Missing files:** Graceful handling with clear error messages
- **Parse errors:** Robust parsing with fallback strategies
- **Execution failures:** Isolated example execution with timeout
- **Permission issues:** Clear permission error reporting
- **Large codebases:** Efficient scanning with progress tracking
- **Complex diagrams:** Depth limits and simplification options

## Best Practices

1. **Run before releases:** Ensure documentation is current
2. **Integrate with CI/CD:** Automated drift detection
3. **Regular coverage checks:** Weekly documentation audits
4. **Validate examples:** Before documentation updates
5. **Version diagrams:** Track architectural changes
6. **Backup before updates:** Preserve manual edits
7. **Review auto-updates:** Human verification recommended
8. **Set coverage thresholds:** Enforce documentation standards

## Future Enhancements

- Multi-language support (Go, Rust, Java)
- Interactive diagram editing
- AI-powered documentation generation
- Real-time documentation preview
- Integration with documentation platforms (GitBook, ReadTheDocs)
- Automated pull request creation for doc updates
- Natural language documentation search
- Documentation diff visualization

---

**Documentation Sync Skill v1.0.0** - Maintaining perfect code-documentation harmony
