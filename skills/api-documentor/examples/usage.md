# API Documentor Skill - Usage Examples

## Example 1: Generate OpenAPI Specification

```bash
python ~/.claude/skills/api-documentor/scripts/main.py \
  --operation generate-openapi \
  --app-file app.py \
  --output openapi.yaml
```

**Output:** OpenAPI 3.0 YAML specification

## Example 2: Generate Python SDK

```bash
python ~/.claude/skills/api-documentor/scripts/main.py \
  --operation generate-sdk \
  --spec openapi.yaml \
  --language python \
  --output sdk/client.py
```

**Output:** Complete Python client SDK

## Example 3: Generate API Documentation

```bash
python ~/.claude/skills/api-documentor/scripts/main.py \
  --operation generate-docs \
  --spec openapi.yaml \
  --format html \
  --output api-docs.html
```

**Output:** Interactive HTML API documentation

## Example 4: Generate TypeScript SDK

```bash
python ~/.claude/skills/api-documentor/scripts/main.py \
  --operation generate-sdk \
  --spec openapi.yaml \
  --language typescript \
  --output sdk/client.ts
```

**Output:** TypeScript client SDK with type definitions
