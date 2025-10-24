# Security Overview

This summary captures the core security practices implemented in the Claude Workflow Engine.

## Identity & Secrets
- No secrets are committed; `security-scanner` and `dependency-guardian` skills enforce periodic scans.
- Memory files stored under `~/.workflow-engine/memory/` are repository-scoped and never transmitted.

## Execution Sandbox
- Skills execute through `skill-executor.js` with:
  - Path traversal checks (`InputValidator.validateFileExtension`, `logPathTraversalAttempt`).
  - Per-skill cache directory with sanitized names.
  - Concurrent execution caps (`maxConcurrentExecutions`), timeout enforcement, and logging.

## Auto-Behavior Controls
- `auto-behavior-system.js` ensures:
  - Skills required for deterministic operations.
  - Agent dispatcher involvement for higher-risk tasks.
  - Audit trail of interactions via `auto-behavior.log`.
- Skill routing uses the manifest + repository context to avoid ad-hoc command execution.

## Memory & Index Hardening
- Vector index writes occur via `persistent-index.js` → `memory-index.py` with hash-based deduplication and SQLite WAL mode.
- Access paths sanitized (`sanitizeScope`, `hashDocument`) to prevent directory escapes.

## Dependency Hygiene
- `dependency-guardian` skill runs `npm audit` (and equivalents) with structured output, preventing reliance on manual reviews.
- Security phase completion reports (see `docs/reports/PHASE_1_SECURITY_COMPLETE.md`) document hardening milestones.

## Recommended Operational Checks
1. Run `node src/skill-executor.js execute security-scanner '{"operation":"scan-secrets"}'` before commits.
2. Schedule `dependency-guardian` scans (CI) to catch new CVEs.
3. Review the reports in `docs/reports/` each release for regression indicators.

