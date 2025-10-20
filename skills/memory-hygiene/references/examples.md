# Memory Entry Examples

## Good Examples

### Example 1: Simple Pattern
```json
{
  "topic": "react-state-management",
  "scope": "global",
  "value": "Prefer useState for component state, useReducer for complex state",
  "source": "user",
  "confidence": 0.95,
  "metadata": {
    "tags": ["react", "state", "hooks"],
    "created": "2025-10-20T10:00:00Z"
  }
}
```
**Why it's good**:
- Clear, concise topic
- Actionable value
- High confidence with user verification
- Relevant tags for discoverability

### Example 2: Repository-Specific Decision
```json
{
  "topic": "api-authentication",
  "scope": "repository",
  "value": {
    "method": "OAuth2",
    "provider": "Auth0",
    "scopes": ["read:users", "write:profile"]
  },
  "source": "agent",
  "confidence": 0.9,
  "TTL": "2026-06-01T00:00:00Z",
  "metadata": {
    "repository": "abc123def456",
    "tags": ["auth", "api", "security"],
    "created": "2025-10-20T10:15:00Z",
    "provenance": "Architecture decision record ADR-005"
  }
}
```
**Why it's good**:
- Structured value (object) with details
- Repository-scoped with hash
- TTL set for review in 6 months
- Linked to ADR for provenance

### Example 3: Temporary Incident Note
```json
{
  "topic": "incident-2025-10-database-spike",
  "scope": "global",
  "value": "Database CPU spiked due to missing index on users.email. Added index, monitoring.",
  "source": "system",
  "confidence": 1.0,
  "TTL": "2025-11-20T00:00:00Z",
  "metadata": {
    "tags": ["incident", "database", "performance"],
    "created": "2025-10-20T11:30:00Z",
    "provenance": "Auto-generated from incident triage"
  }
}
```
**Why it's good**:
- Time-bound with 30-day TTL (will auto-expire)
- Captures incident resolution
- High confidence (verified fix)
- Tagged for searchability

### Example 4: Code Pattern with Examples
```json
{
  "topic": "error-handling-pattern",
  "scope": "global",
  "value": {
    "pattern": "Always use custom error classes",
    "example": "class ValidationError extends Error { constructor(field) { super(`Invalid ${field}`); this.field = field; } }",
    "rationale": "Enables type-specific error handling"
  },
  "source": "user",
  "confidence": 0.85,
  "metadata": {
    "tags": ["error-handling", "typescript", "best-practice"],
    "created": "2025-10-20T09:00:00Z"
  }
}
```
**Why it's good**:
- Structured value with pattern, example, rationale
- Actionable guidance
- Moderate confidence (team consensus)

### Example 5: Library Choice
```json
{
  "topic": "date-library",
  "scope": "global",
  "value": "date-fns",
  "source": "user",
  "confidence": 0.9,
  "metadata": {
    "tags": ["dependencies", "date-handling"],
    "created": "2025-10-15T14:00:00Z",
    "provenance": "Team decision - smaller bundle than moment.js"
  }
}
```
**Why it's good**:
- Clear decision
- Rationale in provenance
- High confidence

---

## Bad Examples (Anti-Patterns)

### Bad Example 1: Vague Topic
```json
{
  "topic": "stuff",
  "scope": "global",
  "value": "things we talked about",
  "source": "user",
  "confidence": 0.5
}
```
**Problems**:
- ❌ Topic is too vague ("stuff")
- ❌ Value is meaningless ("things we talked about")
- ❌ Low confidence suggests uncertainty
- ❌ No context or actionable information

**Fix**: Be specific
```json
{
  "topic": "meeting-2025-10-architecture-review",
  "scope": "global",
  "value": "Decided to migrate from monolith to microservices. Start with user service.",
  "source": "user",
  "confidence": 0.9,
  "metadata": {
    "tags": ["architecture", "meeting-notes"],
    "provenance": "Weekly architecture meeting 2025-10-20"
  }
}
```

### Bad Example 2: Missing Required Fields
```json
{
  "topic": "test-framework",
  "value": "Jest"
}
```
**Problems**:
- ❌ Missing scope
- ❌ Missing source
- ❌ Missing confidence
- ❌ Won't pass validation

**Fix**: Include all required fields
```json
{
  "topic": "test-framework",
  "scope": "global",
  "value": "Jest",
  "source": "user",
  "confidence": 0.95
}
```

### Bad Example 3: Incorrect Types
```json
{
  "topic": "api-pattern",
  "scope": "team",
  "value": "REST",
  "source": "developer",
  "confidence": "high"
}
```
**Problems**:
- ❌ Scope must be "global" or "repository", not "team"
- ❌ Source must be "user", "agent", or "system", not "developer"
- ❌ Confidence must be numeric 0.0-1.0, not string "high"

**Fix**: Use correct types and values
```json
{
  "topic": "api-pattern",
  "scope": "global",
  "value": "REST",
  "source": "user",
  "confidence": 0.9
}
```

### Bad Example 4: Topic Too Long
```json
{
  "topic": "this-is-an-extremely-long-topic-name-that-exceeds-the-maximum-allowed-length-of-one-hundred-characters-and-will-fail-validation",
  "scope": "global",
  "value": "test",
  "source": "user",
  "confidence": 0.5
}
```
**Problems**:
- ❌ Topic exceeds 100 character limit
- ❌ Won't pass validation

**Fix**: Shorten topic, add details to value
```json
{
  "topic": "long-topic-handling",
  "scope": "global",
  "value": "When topics need more context, keep topic brief and add details to value or metadata",
  "source": "user",
  "confidence": 0.8
}
```

### Bad Example 5: Duplicate Information
```json
{
  "topic": "eslint-config",
  "scope": "global",
  "value": "Use eslint with prettier",
  "source": "user",
  "confidence": 0.9
}

// Later, duplicate:
{
  "topic": "eslint-prettier",
  "scope": "global",
  "value": "ESLint configuration with Prettier integration",
  "source": "user",
  "confidence": 0.85
}
```
**Problems**:
- ❌ Two entries for the same concept
- ❌ Wastes memory
- ❌ Creates confusion

**Fix**: Merge duplicates (memory-hygiene skill does this automatically)
```json
{
  "topic": "eslint-config",
  "scope": "global",
  "value": {
    "linter": "ESLint",
    "formatter": "Prettier",
    "integration": true
  },
  "source": "user",
  "confidence": 0.9,
  "metadata": {
    "tags": ["linting", "formatting", "code-quality"]
  }
}
```

### Bad Example 6: Invalid TTL Format
```json
{
  "topic": "temp-note",
  "scope": "global",
  "value": "Test this next week",
  "TTL": "next week",
  "source": "user",
  "confidence": 0.5
}
```
**Problems**:
- ❌ TTL must be ISO8601 format, not plain text
- ❌ Won't pass validation

**Fix**: Use proper ISO8601 format
```json
{
  "topic": "temp-note",
  "scope": "global",
  "value": "Test this next week",
  "TTL": "2025-10-27T00:00:00Z",
  "source": "user",
  "confidence": 0.5
}
```

### Bad Example 7: Confidence Out of Range
```json
{
  "topic": "api-design",
  "scope": "global",
  "value": "Use GraphQL",
  "source": "user",
  "confidence": 1.5
}
```
**Problems**:
- ❌ Confidence must be 0.0-1.0, not 1.5
- ❌ Won't pass validation

**Fix**: Use valid range
```json
{
  "topic": "api-design",
  "scope": "global",
  "value": "Use GraphQL",
  "source": "user",
  "confidence": 1.0
}
```

---

## Best Practices Summary

### Do's ✅
- Use clear, concise topics (< 100 chars)
- Provide structured values when appropriate
- Set appropriate confidence levels
- Add tags for discoverability
- Use TTL for temporary entries
- Link to provenance (ADRs, docs)
- Scope appropriately (global vs repository)

### Don'ts ❌
- Don't create vague entries
- Don't skip required fields
- Don't use incorrect types
- Don't exceed character limits
- Don't create duplicates
- Don't use plain text for timestamps
- Don't set confidence outside 0.0-1.0 range

### Maintenance
- Run `memory-hygiene` skill weekly
- Review low-confidence entries monthly
- Expire temporary entries with TTL
- Merge duplicates regularly
- Validate before writing

---

*Examples v1.0 - Memory Hygiene Skill*
