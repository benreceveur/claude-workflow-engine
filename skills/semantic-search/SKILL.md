---
name: semantic-search
description: Natural language code search, pattern detection, semantic code analysis
version: 1.0.0
tags: [search, semantic, nlp, code-search, pattern-detection]
---

# Semantic Search Skill

## Purpose

The Semantic Search Skill enables natural language searching of codebases, detecting patterns, finding similar code, and understanding code semantics. It goes beyond text matching to understand code meaning and relationships.

**Key Capabilities:**
- Natural language code search ("find database connection functions")
- Semantic similarity detection
- Code pattern recognition
- Cross-reference analysis
- API usage discovery
- Duplicate code detection

**Target Token Savings:** 75% (from ~2600 tokens to ~650 tokens)

## When to Use

- Finding code by description
- Discovering similar implementations
- Locating API usage patterns
- Detecting code duplication
- Understanding code relationships
- Refactoring analysis

## Operations

### 1. search
Natural language code search.

### 2. find-similar
Finds semantically similar code.

### 3. detect-patterns
Detects common code patterns.

### 4. find-duplicates
Identifies duplicate or similar code blocks.

### 5. analyze-usage
Analyzes API usage patterns.

## Scripts

```bash
# Natural language search
python ~/.claude/skills/semantic-search/scripts/main.py \
  --operation search \
  --query "database connection functions" \
  --path ./src

# Find similar code
python ~/.claude/skills/semantic-search/scripts/main.py \
  --operation find-similar \
  --file ./src/utils.py \
  --function process_data

# Detect patterns
python ~/.claude/skills/semantic-search/scripts/main.py \
  --operation detect-patterns \
  --path ./src

# Find duplicates
python ~/.claude/skills/semantic-search/scripts/main.py \
  --operation find-duplicates \
  --path ./src \
  --threshold 0.8
```

## Configuration

```json
{
  "semantic-search": {
    "search": {
      "max_results": 10,
      "similarity_threshold": 0.7,
      "include_comments": true
    },
    "patterns": {
      "min_occurrences": 3,
      "min_pattern_lines": 5
    },
    "duplicates": {
      "similarity_threshold": 0.85,
      "min_lines": 10
    }
  }
}
```

## Examples

### Example 1: Natural Language Search

```bash
python ~/.claude/skills/semantic-search/scripts/main.py \
  --operation search \
  --query "error handling functions" \
  --path ./src
```

**Output:**
```json
{
  "success": true,
  "operation": "search",
  "query": "error handling functions",
  "results": [
    {
      "file": "src/utils.py",
      "function": "handle_error",
      "line": 45,
      "relevance": 0.92,
      "snippet": "def handle_error(error, context):"
    },
    {
      "file": "src/api.py",
      "function": "process_exception",
      "line": 123,
      "relevance": 0.87,
      "snippet": "def process_exception(exc):"
    }
  ],
  "execution_time_ms": 234
}
```

### Example 2: Find Similar Code

```bash
python ~/.claude/skills/semantic-search/scripts/main.py \
  --operation find-similar \
  --file ./src/utils.py \
  --function process_data
```

**Output:**
```json
{
  "success": true,
  "operation": "find-similar",
  "target": "utils.py:process_data",
  "similar_functions": [
    {
      "file": "src/handlers.py",
      "function": "transform_data",
      "similarity": 0.89,
      "reason": "Similar data processing logic"
    },
    {
      "file": "src/processors.py",
      "function": "format_data",
      "similarity": 0.76,
      "reason": "Common transformation patterns"
    }
  ],
  "execution_time_ms": 345
}
```

### Example 3: Detect Code Patterns

```bash
python ~/.claude/skills/semantic-search/scripts/main.py \
  --operation detect-patterns \
  --path ./src
```

**Output:**
```json
{
  "success": true,
  "operation": "detect-patterns",
  "patterns_found": 5,
  "patterns": [
    {
      "type": "try_except_pattern",
      "occurrences": 12,
      "description": "Try-except with logging",
      "example_location": "src/api.py:45"
    },
    {
      "type": "context_manager",
      "occurrences": 8,
      "description": "Database connection with context manager",
      "example_location": "src/db.py:23"
    }
  ],
  "execution_time_ms": 456
}
```

### Example 4: Find Duplicate Code

```bash
python ~/.claude/skills/semantic-search/scripts/main.py \
  --operation find-duplicates \
  --path ./src \
  --threshold 0.85
```

**Output:**
```json
{
  "success": true,
  "operation": "find-duplicates",
  "duplicates_found": 3,
  "duplicates": [
    {
      "files": ["src/utils.py:45-60", "src/helpers.py:123-138"],
      "similarity": 0.94,
      "lines": 15,
      "recommendation": "Extract to shared function"
    },
    {
      "files": ["src/api.py:78-92", "src/handlers.py:45-59"],
      "similarity": 0.87,
      "lines": 14,
      "recommendation": "Consider refactoring to common utility"
    }
  ],
  "execution_time_ms": 567
}
```

## Token Economics

**Without Skill:** ~2600 tokens
**With Skill:** ~650 tokens (75% savings)

## Success Metrics

- Search accuracy: >85% relevance
- Pattern detection: >90% accuracy
- Duplicate detection: >95% precision
- Execution time: <500ms for search

---

**Semantic Search Skill v1.0.0** - Understanding code through semantics
