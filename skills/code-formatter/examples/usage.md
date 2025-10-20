# Code Formatter Skill - Usage Examples

## Example 1: Format JavaScript Project

### Before
```javascript
// src/app.js - poorly formatted
const x={name:"test",value:42}
function hello(name){
console.log("Hello, "+name)
}
export {hello}
```

### Command
```bash
node ~/.claude/memory/skill-executor.js execute code-formatter '{
  "operation": "format",
  "target": "src/app.js",
  "language": "javascript"
}'
```

### After
```javascript
// src/app.js - beautifully formatted
const x = { name: 'test', value: 42 }

function hello(name) {
  console.log('Hello, ' + name)
}

export { hello }
```

### Output
```json
{
  "success": true,
  "summary": {
    "total_files": 1,
    "formatted": 1,
    "changes": 5
  }
}
```

## Example 2: Format Python Package

### Command
```bash
node ~/.claude/memory/skill-executor.js execute code-formatter '{
  "operation": "format",
  "target": "src/",
  "language": "python"
}'
```

### Output
```json
{
  "success": true,
  "summary": {
    "total_files": 12,
    "formatted": 12,
    "linted": 12,
    "changes": 47
  },
  "by_language": {
    "python": 12
  }
}
```

## Example 3: Check Formatting in CI/CD

### Command (Check Only)
```bash
node ~/.claude/memory/skill-executor.js execute code-formatter '{
  "operation": "check",
  "target": "src/",
  "language": "auto"
}'
```

### Output (Formatting Needed)
```json
{
  "success": false,
  "needs_formatting": 3,
  "total_files": 47,
  "files": [
    "src/app.js",
    "src/utils.js",
    "src/config.json"
  ]
}
```

## Example 4: Initialize Project Configuration

### Command
```bash
node ~/.claude/memory/skill-executor.js execute code-formatter '{
  "operation": "init",
  "language": "javascript",
  "target": "."
}'
```

### Output
```json
{
  "success": true,
  "language": "javascript",
  "configs_created": [
    ".prettierrc",
    ".eslintrc.json"
  ]
}
```

## Example 5: List Supported Languages

### Command
```bash
node ~/.claude/memory/skill-executor.js execute code-formatter '{
  "operation": "languages"
}'
```

### Output
```json
{
  "success": true,
  "languages": {
    "javascript": {
      "formatter": "prettier",
      "formatter_available": true,
      "linter": "eslint",
      "linter_available": true
    },
    "python": {
      "formatter": "black",
      "formatter_available": true,
      "linter": "isort",
      "linter_available": true
    },
    "go": {
      "formatter": "gofmt",
      "formatter_available": false,
      "linter": null,
      "linter_available": false
    }
  },
  "total": 11,
  "available": 5
}
```

## Example 6: Batch Format Multiple Languages

### Project Structure
```
my-project/
├── src/
│   ├── app.js
│   ├── utils.ts
│   └── api.py
├── config.json
└── README.md
```

### Command
```bash
node ~/.claude/memory/skill-executor.js execute code-formatter '{
  "operation": "format",
  "target": "my-project/",
  "language": "auto"
}'
```

### Output
```json
{
  "success": true,
  "summary": {
    "total_files": 5,
    "formatted": 5,
    "changes": 23
  },
  "by_language": {
    "javascript": 1,
    "typescript": 1,
    "python": 1,
    "json": 1,
    "markdown": 1
  }
}
```

## Integration with Claude

### Prompt
```
Format all JavaScript files in the src/ directory using the code-formatter Skill
```

### Response
```
I'll use the Code Formatter Skill to format your JavaScript files.

[Skill execution: code-formatter]
✅ Formatted 23 JavaScript files
- Fixed 147 ESLint issues
- Applied Prettier formatting
- Total changes: 389 lines

All files are now consistently formatted according to your project's style guide.
```

## Common Use Cases

### Pre-commit Hook
```bash
# .git/hooks/pre-commit
node ~/.claude/memory/skill-executor.js execute code-formatter '{
  "operation": "check",
  "target": ".",
  "language": "auto"
}'
```

### CI/CD Pipeline
```yaml
# .github/workflows/format.yml
- name: Check code formatting
  run: |
    node ~/.claude/memory/skill-executor.js execute code-formatter '{
      "operation": "check",
      "target": "src/",
      "language": "auto"
    }'
```

### VS Code Task
```json
{
  "label": "Format with Skill",
  "type": "shell",
  "command": "node ~/.claude/memory/skill-executor.js execute code-formatter '{\"operation\":\"format\",\"target\":\"${file}\"}'"
}
```
