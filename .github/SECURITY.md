# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 3.x     | :white_check_mark: |
| < 3.0   | :x:                |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please follow these steps:

### 1. **Do Not** Open a Public Issue

Security vulnerabilities should not be disclosed publicly until they have been addressed.

### 2. Report Privately

Please report security vulnerabilities by emailing the repository owner or using GitHub's private vulnerability reporting:

- **GitHub Security Advisory:** https://github.com/benreceveur/claude-workflow-engine/security/advisories/new
- **Email:** Create a private security advisory on GitHub

### 3. Provide Details

Include the following information:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### 4. Response Time

- **Initial Response:** Within 48 hours
- **Status Update:** Within 7 days
- **Fix Timeline:** Depends on severity
  - Critical: Within 7 days
  - High: Within 14 days
  - Medium: Within 30 days
  - Low: Next release cycle

## Security Best Practices

### For Users

1. **Keep Dependencies Updated**
   ```bash
   # Check for updates
   npm outdated
   pip list --outdated
   ```

2. **Review Permissions**
   - MCP servers have filesystem access - configure allowed paths
   - Review `~/.workflow-engine/mcp-config.json`

3. **Secure Credentials**
   - Never commit tokens or API keys
   - Use environment variables for sensitive data
   - GitHub tokens should have minimum required scopes

4. **Validate Skills**
   - Review skill code before execution
   - Skills run with your user permissions
   - Disable untrusted skills in config

### For Contributors

1. **No Hardcoded Secrets**
   - Use environment variables
   - Add secrets to `.env.example` (without values)
   - Never commit `.env` files

2. **Input Validation**
   - Validate all user input
   - Sanitize file paths
   - Escape shell commands

3. **Dependency Security**
   - Review dependency changes
   - Use `npm audit` before committing
   - Keep Python dependencies minimal

4. **Code Review**
   - All PRs require review
   - Security-sensitive changes need extra scrutiny
   - Automated security scans via Dependabot

## Known Security Considerations

### MCP Filesystem Server

**Risk:** Provides file system access to AI agents
**Mitigation:**
- Configure allowed paths in `mcp-config.json`
- Default: Current directory only
- Production: Restrict to specific project directories

### Python Dependency Installation

**Risk:** Downloads packages from PyPI
**Mitigation:**
- Pin versions in installation script
- Use version constraints
- Regular Dependabot updates

### Shell Script Execution

**Risk:** Bash scripts run with user permissions
**Mitigation:**
- Scripts use `set -euo pipefail` for safety
- Input validation on all parameters
- No `eval` of user input

### Vector Memory Index

**Risk:** Stores embeddings and metadata locally
**Mitigation:**
- Data stored in user's home directory
- No network transmission
- Regular cleanup via memory-hygiene skill

## Security Updates

We use:
- **Dependabot:** Automated dependency updates
- **npm audit:** JavaScript dependency scanning
- **GitHub Security Advisories:** Vulnerability tracking

## Vulnerability Disclosure Policy

We follow responsible disclosure:

1. **Report** → Researcher reports privately
2. **Acknowledge** → We respond within 48 hours
3. **Fix** → We develop and test a patch
4. **Release** → We release the fix
5. **Disclose** → We publish advisory with credit

## Security Hall of Fame

We recognize security researchers who help us:

<!-- Security researchers will be listed here -->

Thank you for helping keep Claude Workflow Engine secure!

---

**Last Updated:** October 25, 2025
**Security Contact:** Create a GitHub Security Advisory
