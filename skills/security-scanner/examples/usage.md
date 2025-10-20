# Security Scanner Skill - Usage Examples

## Example 1: Scan for Exposed Secrets

```bash
python ~/.claude/skills/security-scanner/scripts/main.py \
  --operation scan-secrets \
  --path .
```

**Output:**
```json
{
  "success": true,
  "operation": "scan-secrets",
  "secrets_found": 3,
  "secrets": [
    {
      "type": "aws_access_key",
      "location": "config/settings.py:45",
      "severity": "critical",
      "remediation": "Use AWS IAM roles or environment variables"
    }
  ],
  "execution_time_ms": 234
}
```

## Example 2: SAST Vulnerability Scan

```bash
python ~/.claude/skills/security-scanner/scripts/main.py \
  --operation scan-vulnerabilities \
  --path ./src \
  --language python
```

**Output:**
```json
{
  "success": true,
  "operation": "scan-vulnerabilities",
  "vulnerabilities_found": 5,
  "by_severity": {
    "critical": 1,
    "high": 2,
    "medium": 2
  },
  "execution_time_ms": 456
}
```

## Example 3: OWASP Top 10 Compliance

```bash
python ~/.claude/skills/security-scanner/scripts/main.py \
  --operation scan-owasp \
  --path ./src
```

**Output:**
```json
{
  "success": true,
  "operation": "scan-owasp",
  "compliance_score": 65,
  "categories_checked": 10,
  "categories_failed": 4,
  "execution_time_ms": 678
}
```

## Example 4: Comprehensive Security Scan

```bash
python ~/.claude/skills/security-scanner/scripts/main.py \
  --operation scan-all \
  --path .
```

**Output:**
```json
{
  "success": true,
  "operation": "scan-all",
  "summary": {
    "total_issues": 18,
    "secrets": 3,
    "vulnerabilities": 5,
    "owasp_score": 65,
    "vulnerable_deps": 3
  },
  "execution_time_ms": 2145
}
```
