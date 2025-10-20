---
name: code-formatter
description: Multi-language code formatting and style enforcement with automatic linting fixes
version: 1.0.0
author: Claude Memory System
tags: [formatting, linting, code-quality, style, automation]
---

# Code Formatter Skill

## Purpose
Automatically format and lint code across multiple languages, enforcing consistent style and fixing common issues without manual intervention.

## When to Use
- Before committing code
- During PR preparation
- After code generation
- When enforcing team standards
- Batch formatting of legacy code

## Supported Languages

### JavaScript/TypeScript
- **Formatter**: Prettier
- **Linter**: ESLint
- **Auto-fix**: Import sorting, semicolons, quotes

### Python
- **Formatter**: Black
- **Linter**: isort, autopep8
- **Auto-fix**: Import sorting, line length, indentation

### Go
- **Formatter**: gofmt, goimports
- **Auto-fix**: Import organization, formatting

### Rust
- **Formatter**: rustfmt
- **Auto-fix**: Clippy suggestions

### Other Languages
- **JSON**: Prettier
- **YAML**: Prettier
- **Markdown**: Prettier
- **CSS/SCSS**: Prettier
- **HTML**: Prettier

## Operations

### 1. Detect Language and Style
- Auto-detect language from file extension
- Load project-specific configuration
- Identify style guide (Standard, Airbnb, Google, etc.)

### 2. Format Code
- Apply formatter rules
- Preserve semantics (no behavior changes)
- Handle edge cases (strings, comments, etc.)

### 3. Fix Linting Issues
- Run linter with auto-fix enabled
- Apply safe automated fixes
- Report remaining manual fixes needed

### 4. Generate Report
- List files modified
- Show statistics (lines changed, issues fixed)
- Output diff for review

## Scripts

### main.py
```bash
# Execute formatting
python scripts/main.py format <file_or_dir> [--language=auto] [--check-only]

# Check formatting without modifying
python scripts/main.py check <file_or_dir>

# Show supported languages
python scripts/main.py languages

# Generate configuration
python scripts/main.py init --language=javascript
```

### Language-Specific Formatters
- `format_javascript.js` - ESLint + Prettier
- `format_python.py` - Black + isort
- `format_go.sh` - gofmt + goimports
- `format_rust.sh` - rustfmt + clippy

## Configuration

### Project-Specific Settings
The Skill checks for configuration in this order:
1. `.prettierrc`, `.eslintrc` (JavaScript)
2. `pyproject.toml`, `setup.cfg` (Python)
3. `.rustfmt.toml` (Rust)
4. Memory-stored preferences
5. Sensible defaults

### Memory Integration
Stores formatting preferences:
```json
{
  "topic": "code-formatter-preferences",
  "scope": "repository",
  "value": {
    "javascript": {
      "formatter": "prettier",
      "semi": false,
      "singleQuote": true,
      "tabWidth": 2
    },
    "python": {
      "formatter": "black",
      "lineLength": 88,
      "importSorter": "isort"
    }
  }
}
```

## Integration Points

### With PR Author/Reviewer Skill
- Auto-format before creating PR
- Include formatting changes in PR description
- Validate formatting in PR checks

### With Memory Hygiene Skill
- Track formatting statistics
- Record team preferences
- Monitor adoption rates

### With Test-First Change Skill
- Format test files
- Maintain consistent test style
- Preserve test semantics

## Examples

### Format Single File
```bash
# Auto-detect language and format
python scripts/main.py format src/index.js

# Output:
# ✅ Formatted src/index.js (JavaScript)
# - Fixed 3 ESLint issues
# - Reformatted 127 lines
```

### Format Directory
```bash
# Format all files in directory
python scripts/main.py format src/ --language=auto

# Output:
# ✅ Formatted 47 files
# - JavaScript: 23 files
# - TypeScript: 18 files
# - JSON: 6 files
```

### Check Only Mode
```bash
# Check without modifying (CI/CD)
python scripts/main.py check src/

# Output:
# ❌ 3 files need formatting:
# - src/app.js
# - src/utils.js
# - src/config.json
```

### Initialize Configuration
```bash
# Create project configuration
python scripts/main.py init --language=javascript

# Output:
# ✅ Created .prettierrc
# ✅ Created .eslintrc.json
# Configuration stored in memory
```

## Token Economics

**Without Skill** (Agent formatting):
- Parse file: 2,000 tokens
- Analyze style: 3,000 tokens
- Generate formatted code: 5,000 tokens
- Explain changes: 2,000 tokens
- **Total**: 12,000 tokens

**With Skill** (Code execution):
- Metadata: 50 tokens
- SKILL.md: 350 tokens
- Script execution: 0 tokens (returns result)
- Result parsing: 100 tokens
- **Total**: 500 tokens

**Savings**: 95.8% (11,500 tokens saved per operation)

## Success Metrics

### Performance
- Formatting time: <1 second per file
- Batch processing: >100 files/minute
- Memory usage: <100MB

### Quality
- Code consistency: 100%
- Semantic preservation: 100%
- False positives: <1%

### Adoption
- Developer usage: >90%
- CI/CD integration: 100% of projects
- Satisfaction rating: >4.5/5

## Safety Checks

Before formatting:
1. ✅ Backup original file (in-memory)
2. ✅ Validate syntax (no broken code)
3. ✅ Preserve file permissions
4. ✅ Maintain git history

After formatting:
1. ✅ Verify file integrity
2. ✅ Check for unintended changes
3. ✅ Run syntax validation
4. ✅ Generate diff for review

## Error Handling

### Syntax Errors
```
❌ Cannot format src/broken.js: Syntax error at line 42
Recommendation: Fix syntax errors before formatting
```

### Missing Dependencies
```
⚠️  Prettier not found. Install with: npm install -g prettier
Falling back to basic formatting
```

### Configuration Conflicts
```
⚠️  Multiple configurations found (.prettierrc and package.json)
Using .prettierrc (higher priority)
```

## Limitations

- Does not fix logic errors
- Cannot resolve complex linting issues requiring human judgment
- May conflict with custom editor settings
- Large files (>10,000 lines) may be slow

## References

See `references/` for:
- `style-guides.md` - Popular style guides by language
- `configuration-examples/` - Sample configs for common setups
- `troubleshooting.md` - Common issues and solutions

---

*Code Formatter Skill v1.0.0 - Write code once, format it everywhere*
