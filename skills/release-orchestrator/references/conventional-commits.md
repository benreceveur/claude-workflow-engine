# Conventional Commits Specification

## Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

## Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **build**: Build system changes
- **ci**: CI/CD changes
- **chore**: Other changes (dependencies, etc.)
- **revert**: Revert previous commit

## Examples

### Feature
```
feat(auth): add OAuth2 authentication

Implements OAuth2 flow for GitHub and Google providers.
Includes token refresh and revocation.
```

### Bug Fix
```
fix(api): prevent rate limit errors

Add retry logic with exponential backoff for rate-limited requests.

Fixes #123
```

### Breaking Change
```
feat(api)!: change response format to JSON:API spec

BREAKING CHANGE: All API responses now follow JSON:API specification.
Migration guide: docs/migration-v2.md
```

## Version Bumps

- **MAJOR** (1.0.0 → 2.0.0): Breaking changes
- **MINOR** (1.0.0 → 1.1.0): New features
- **PATCH** (1.0.0 → 1.0.1): Bug fixes
