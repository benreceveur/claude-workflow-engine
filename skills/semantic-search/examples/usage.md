# Semantic Search Skill - Usage Examples

## Example 1: Natural Language Search

```bash
python ~/.claude/skills/semantic-search/scripts/main.py \
  --operation search \
  --query "error handling functions" \
  --path ./src
```

**Output:** Relevant functions ranked by semantic similarity

## Example 2: Find Similar Code

```bash
python ~/.claude/skills/semantic-search/scripts/main.py \
  --operation find-similar \
  --file ./src/utils.py \
  --function process_data
```

**Output:** Functions with similar implementation patterns

## Example 3: Detect Code Patterns

```bash
python ~/.claude/skills/semantic-search/scripts/main.py \
  --operation detect-patterns \
  --path ./src
```

**Output:** Common patterns with occurrence counts

## Example 4: Find Duplicate Code

```bash
python ~/.claude/skills/semantic-search/scripts/main.py \
  --operation find-duplicates \
  --path ./src \
  --threshold 0.85
```

**Output:** Duplicate code blocks with refactoring recommendations
