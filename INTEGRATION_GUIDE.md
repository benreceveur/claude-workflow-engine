# Claude Workflow Engine - Integration Guide

**Version:** 3.0
**Date:** October 25, 2025
**Status:** Production Ready

---

## Overview

The Claude Workflow Engine now includes an **automatic discovery and integration system** that:

1. **Discovers all skills** installed on your machine (30+ skills)
2. **Discovers all Claude Code agents** available in your session (77+ agents)
3. **Detects MCP servers** in Claude Code (session-based)
4. **Merges local configurations** with repo defaults during installation
5. **Preserves user customizations** while adding new capabilities

This ensures that when someone installs the workflow engine, **all resources are automatically integrated** and available for intelligent routing.

---

## What Gets Discovered

### 1. Skills (30+ Available)

**Location:** `~/.workflow-engine/skills/`
**Manifest:** `~/.workflow-engine/skills/skill-manifest.json`

#### Core Skills
- `tech-debt-tracker` - Analyze technical debt
- `finops-optimizer` - Cloud cost optimization
- `code-formatter` - Multi-language formatting
- `test-first-change` - Test discovery and execution
- `semantic-search` - Natural language code search
- `memory-hygiene` - Memory validation and cleanup
- `documentation-sync` - Documentation drift detection
- `release-orchestrator` - Release notes generation

#### Document Processing Skills
- `pdf`, `pdf-processing-pro` - PDF manipulation and extraction
- `docx` - Word document processing
- `xlsx`, `excel-analysis` - Excel file processing
- `pptx` - PowerPoint presentations

#### Development Skills
- `ai-code-generator` - AI-powered code generation
- `api-documentor` - API documentation
- `database-migrator` - Database migrations
- `dependency-guardian` - Dependency management
- `container-validator` - Docker/K8s validation
- `security-scanner` - Security scanning
- `performance-profiler` - Performance profiling
- `git-commit-helper` - Conventional commits

#### Specialized Skills
- `mcp-builder` - MCP server builder
- `skill-creator` - Create new skills
- `webapp-testing` - Web app testing (Playwright)
- `artifacts-builder` - Build deployment artifacts
- `canvas-design` - UI mockups and wireframes
- `incident-triage` - On-call and postmortems
- `pr-author-reviewer` - PR quality improvements
- `codebase-navigator` - Codebase analysis

**Total:** 30 skills automatically detected and integrated

### 2. Claude Code Agents (77+ Available)

**Configuration:** `~/.workflow-engine/memory/enhanced-agent-dispatcher.js`
**Inventory:** `SYSTEM_INVENTORY.json`

#### Currently Mapped (6 agents)
- `frontend-engineer` - React, Vue, Angular, UI development
- `backend-engineer` - APIs, servers, databases
- `devops-engineer` - Docker, Kubernetes, CI/CD
- `security-engineer` - Security audits, vulnerabilities
- `data-engineer` - ETL, data pipelines, warehouses
- `data-scientist` - ML models, analytics, visualization

#### Available for Mapping (73+ agents)
Including but not limited to:
- Development: `typescript-pro`, `python-pro`, `rust-pro`, `javascript-pro`, `c-pro`
- Infrastructure: `cloud-architect`, `terraform-specialist`, `network-engineer`
- Testing: `test-engineer`, `test-automator`, `debugger`
- Research: `technical-researcher`, `academic-researcher`, `data-analyst`
- Security: `penetration-tester`, `compliance-specialist`, `ai-ethics-advisor`
- Specialized: `graphql-architect`, `mcp-expert`, `performance-engineer`
- And 50+ more...

**Agent mappings are generated automatically** during installation with intelligent confidence boosters based on agent descriptions.

### 3. MCP Servers (Session-Based)

**Available in Claude Code:**
- `mcp__ide__getDiagnostics` - VS Code language diagnostics
- `mcp__ide__executeCode` - Jupyter kernel execution

**Note:** MCP servers are provided by Claude Code and don't require workflow engine integration. They're accessed directly by Claude.

---

## How Discovery Works

### Installation Flow

```
1. User runs ./install.sh
2. Core files deployed to ~/.workflow-engine
3. Skills deployed to ~/.workflow-engine/skills/
4. Discovery script runs automatically:
   ├── Scans skills directory
   ├── Loads existing skill-manifest.json
   ├── Loads expanded manifest from repo
   ├── Merges all three sources
   ├── Generates agent mappings
   └── Saves integrated configuration
5. Shell profile updated
6. System ready to use
```

### Discovery Script

**Location:** `scripts/discover-and-integrate.js`

**What it does:**
1. Scans `~/.workflow-engine/skills/` for all skill directories
2. Reads existing `skill-manifest.json` (preserves user edits)
3. Loads `skills/skill-manifest-expanded.json` from repo
4. Merges all three sources (priority: user > expanded > auto-discovered)
5. Generates 73+ new agent mappings automatically
6. Saves integrated manifest
7. Creates integration report

**Manual execution:**
```bash
node scripts/discover-and-integrate.js
```

---

## Configuration Files

### 1. Skill Manifest

**Path:** `~/.workflow-engine/skills/skill-manifest.json`

**Structure:**
```json
{
  "skill-name": {
    "description": "What this skill does",
    "keywords": ["keyword1", "keyword2"],
    "operations": ["operation1", "operation2"],
    "defaultContext": {},
    "confidence": 0.85
  }
}
```

**Precedence:**
1. User's local edits (highest priority)
2. Expanded manifest from repo
3. Auto-discovered skills (basic metadata)

### 2. Agent Dispatcher

**Path:** `~/.workflow-engine/memory/enhanced-agent-dispatcher.js`

**Structure:**
```javascript
roleMapping = {
  'agent-name': {
    confidence_boosters: ['keyword1', 'keyword2'],
    mandatory_triggers: ['pattern.*regex'],
    context_indicators: ['file/path', '.ext']
  }
}
```

**Configuration:**
```javascript
{
  confidenceThreshold: 0.3,  // 30% minimum for agent routing
  skillConfidenceThreshold: 0.14  // 14% minimum for skill routing
}
```

### 3. System Inventory

**Path:** `SYSTEM_INVENTORY.json`

Complete catalog of:
- All 30 skills with metadata
- All 77 Claude Code agents
- MCP servers available
- Integration recommendations

---

## Customization

### Adding New Skills

1. **Create skill directory:**
```bash
mkdir ~/.workflow-engine/skills/my-new-skill
```

2. **Add skill implementation:**
```bash
# Create index.js with skill logic
vim ~/.workflow-engine/skills/my-new-skill/index.js
```

3. **Re-run discovery:**
```bash
node scripts/discover-and-integrate.js
```

Your skill is now automatically integrated!

### Customizing Skill Metadata

Edit `~/.workflow-engine/skills/skill-manifest.json`:

```json
{
  "my-skill": {
    "description": "Custom description",
    "keywords": ["custom", "keywords"],
    "operations": ["execute"],
    "defaultContext": {},
    "confidence": 0.9
  }
}
```

**User edits are preserved** during future installations.

### Adding Agent Mappings

Edit `~/.workflow-engine/memory/enhanced-agent-dispatcher.js`:

```javascript
'my-custom-agent': {
  confidence_boosters: [
    'specific', 'keywords', 'that', 'trigger', 'this', 'agent'
  ],
  mandatory_triggers: [
    'exact.*pattern', 'another.*pattern'
  ],
  context_indicators: [
    'file/paths', '.extensions'
  ]
}
```

---

## Testing Integration

### Test Skill Detection

```bash
# Test individual skill routing
node ~/.workflow-engine/memory/auto-behavior-system.js prompt "test query"

# Test with different inputs
node ~/.workflow-engine/memory/auto-behavior-system.js prompt "analyze technical debt"
node ~/.workflow-engine/memory/auto-behavior-system.js prompt "format my code"
node ~/.workflow-engine/memory/auto-behavior-system.js prompt "extract PDF data"
```

### Test Agent Selection

```bash
# Test agent routing
node ~/.workflow-engine/memory/enhanced-agent-dispatcher.js analyze "create a React component"
node ~/.workflow-engine/memory/enhanced-agent-dispatcher.js analyze "deploy to AWS"
node ~/.workflow-engine/memory/enhanced-agent-dispatcher.js analyze "security audit"
```

### Check System Status

```bash
# View configuration
node ~/.workflow-engine/memory/auto-behavior-system.js status

# List all skills
node ~/.workflow-engine/memory/skill-executor.js list

# View agents
node ~/.workflow-engine/memory/enhanced-agent-dispatcher.js agents
```

---

## Integration Report

After running discovery, check `integration-report.json`:

```json
{
  "timestamp": "2025-10-25T15:58:29.320Z",
  "skills": {
    "total": 30,
    "documented": 8,
    "expanded": 30,
    "discovered": 30
  },
  "agents": {
    "available": 77,
    "mapped": 6,
    "new_mappings": 73
  }
}
```

This shows:
- **30 skills** fully integrated
- **77 agents** available
- **73 new agent mappings** generated

---

## Troubleshooting

### Skills Not Detected

```bash
# Check skills directory
ls -la ~/.workflow-engine/skills/

# Re-run discovery manually
node scripts/discover-and-integrate.js

# Check manifest
cat ~/.workflow-engine/skills/skill-manifest.json | jq .
```

### Agent Routing Issues

```bash
# Check agent dispatcher configuration
node ~/.workflow-engine/memory/enhanced-agent-dispatcher.js test

# View current mappings
grep -A 5 "roleMapping" ~/.workflow-engine/memory/enhanced-agent-dispatcher.js
```

### Skill Not Routing

Common issues:
1. **Keywords don't match** - Add more keyword variations
2. **Confidence too low** - Lower `skillConfidenceThreshold`
3. **Skill not in manifest** - Run discovery script

### Preserve Custom Changes

Your customizations are preserved in:
- `~/.workflow-engine/skills/skill-manifest.json` (user edits)
- `~/.workflow-engine/memory/enhanced-agent-dispatcher.js` (custom mappings)
- Configuration overrides in auto-behavior-config.json

Re-running installation or discovery **will not overwrite** these files.

---

## Advanced Usage

### Batch Integration for Teams

```bash
# Export configuration
cp ~/.workflow-engine/skills/skill-manifest.json team-skills.json

# Share with team
git add team-skills.json
git commit -m "Share team skill configuration"
git push

# Team members: import configuration
cp team-skills.json ~/.workflow-engine/skills/skill-manifest.json
```

### CI/CD Integration

```yaml
# .github/workflows/test.yml
- name: Install Workflow Engine
  run: |
    ./install.sh
    node scripts/discover-and-integrate.js

- name: Verify Integration
  run: |
    node ~/.workflow-engine/memory/skill-executor.js list
```

### Dynamic Skill Loading

Skills can be added at runtime:

```javascript
const SkillRouter = require('./skill-router.js');
const router = new SkillRouter();

// Reload manifest dynamically
router.manifest = router.loadManifest();

// Test new skill
const result = router.detectSkill('new skill query');
```

---

## Architecture

```
Installation
     │
     ├─> Deploy Core Files
     │    └─> ~/.workflow-engine/memory/
     │
     ├─> Deploy Skills
     │    └─> ~/.workflow-engine/skills/
     │
     ├─> Discovery & Integration
     │    │
     │    ├─> Scan Skills Directory (30 skills found)
     │    │
     │    ├─> Load Configurations
     │    │    ├─> User manifest (preserves edits)
     │    │    ├─> Expanded manifest (from repo)
     │    │    └─> Auto-discover new skills
     │    │
     │    ├─> Merge Manifests
     │    │    └─> Priority: User > Expanded > Auto
     │    │
     │    ├─> Generate Agent Mappings
     │    │    └─> 73 new mappings created
     │    │
     │    └─> Save Integrated Config
     │         ├─> skill-manifest.json (30 skills)
     │         └─> integration-report.json
     │
     └─> Shell Integration
          └─> Auto-load on terminal startup
```

---

## Benefits

### For Users
✅ **Zero configuration** - Everything works out of the box
✅ **30+ skills** immediately available
✅ **77+ agents** can be intelligently routed
✅ **Customizations preserved** across updates
✅ **New skills auto-detected** when added

### For Teams
✅ **Consistent configuration** across team members
✅ **Share custom skills** via version control
✅ **Team-specific workflows** automatically integrated
✅ **No manual manifest editing** required

### For CI/CD
✅ **Reproducible builds** with consistent skill sets
✅ **Automated testing** with full skill coverage
✅ **Version-controlled configurations**
✅ **Containerized deployments** with all skills

---

## Migration Guide

### Upgrading from Older Versions

```bash
# Backup existing configuration
cp ~/.workflow-engine/skills/skill-manifest.json ~/skill-manifest-backup.json

# Pull latest changes
cd ~/Documents/GitHub/claude-workflow-engine
git pull origin master

# Run installation (preserves your customizations)
./install.sh

# Verify integration
node scripts/discover-and-integrate.js
```

Your customizations are automatically preserved!

### Adding Repo to Existing Installation

```bash
# Clone repo
git clone https://github.com/your-org/claude-workflow-engine.git

# Run installation (merges with existing)
cd claude-workflow-engine
./install.sh

# Your existing skills and configurations are preserved
```

---

## Files Reference

| File | Purpose | User Editable |
|------|---------|---------------|
| `install.sh` | Installation script | No |
| `scripts/discover-and-integrate.js` | Discovery system | No |
| `skills/skill-manifest-expanded.json` | Repo skill catalog | No |
| `~/.workflow-engine/skills/skill-manifest.json` | Active skill config | ✅ Yes |
| `~/.workflow-engine/memory/enhanced-agent-dispatcher.js` | Agent mappings | ✅ Yes |
| `~/.workflow-engine/memory/auto-behavior-config.json` | System config | ✅ Yes |
| `SYSTEM_INVENTORY.json` | Complete catalog | No |
| `integration-report.json` | Integration results | No |

---

## Support

### Documentation
- **Installation:** `INSTALLATION_AND_TESTING_COMPLETE.md`
- **System Inventory:** `SYSTEM_INVENTORY.json`
- **Integration:** This file
- **README:** `README.md`

### Common Issues
See **Troubleshooting** section above

### Contributing
To add new skills or agents:
1. Create skill directory in `skills/`
2. Add metadata to `skill-manifest-expanded.json`
3. Submit PR

---

## Summary

The Claude Workflow Engine now provides **complete automatic integration** of:

- ✅ **30+ Skills** - All automatically detected and integrated
- ✅ **77+ Agents** - Intelligent routing with auto-generated mappings
- ✅ **MCP Servers** - Session-based integration
- ✅ **User Customizations** - Preserved across installations
- ✅ **Zero Configuration** - Works out of the box

**Total Installation Time:** ~30 seconds
**Manual Configuration Required:** None
**Skills Available:** 30+ immediately
**Agents Available:** 77+ with intelligent routing

---

**Last Updated:** October 25, 2025
**Version:** 3.0
**Status:** ✅ Production Ready
