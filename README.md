# Claude Workflow Engine 🤖

> **Intelligent CLI-enhanced workflow engine with 93.8% routing accuracy** - Automatically routes tasks to 19 specialized skills and 10 expert agents

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Routing Accuracy: 93.8%](https://img.shields.io/badge/Routing-93.8%25-green)](./docs/current)
[![Skills: 19](https://img.shields.io/badge/Skills-19-blue)](./skills)
[![Agents: 10](https://img.shields.io/badge/Agents-10-orange)](./agents.json)

---

## 🎯 What Is This?

Claude Workflow Engine is an **intelligent routing and automation system** for Claude Code CLI that:

- **93.8% routing accuracy** for automatic skill/agent selection
- **19 specialized skills** for deterministic operations (<100ms execution)
- **10 expert agents** for complex reasoning tasks (via --agents flag)
- **CLI-enhanced architecture** using native Claude Code flags
- **Maintains context** across sessions with repository-scoped memory
- **Token savings: 95%+** through skills vs. agents for routine tasks

**Architecture:**
```
User Input → Routing (93.8%) → Skill/Agent Selection → Claude CLI → Result
```

---

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/benreceveur/claude-workflow-engine.git
cd claude-workflow-engine

# Install dependencies (optional - for development)
npm install

# Deploy to ~/.workflow-engine
cp -r . ~/.workflow-engine/

# Load enhanced shell hook
source ~/.workflow-engine/memory/auto-behavior-hook-v2.sh
```

### Basic Usage

```bash
# Check status
routing_status

# Test routing with a prompt
test_routing "analyze technical debt in the codebase"

# Use enhanced Claude CLI with routing
claude_with_routing "create a React component"

# Use with CLI flags
claude_enhanced --print "fix TypeScript errors"
```

### Activation

Add to your `~/.zshrc` (or `~/.bashrc`):

```bash
# Claude Workflow Engine - Auto-load
source ~/.workflow-engine/memory/auto-behavior-hook-v2.sh
```

See [ACTIVATION_GUIDE.md](./ACTIVATION_GUIDE.md) for detailed setup instructions.

---

## ⚡ Features

### 1. **Intelligent Routing (93.8% Accuracy)**

Automatically routes tasks to optimal execution mode:
- **Skill Mode**: Deterministic operations (tech debt, formatting, testing)
- **Agent Mode**: Complex reasoning (architecture, debugging, code review)
- **Direct Mode**: General queries

**Test Results:**
- Skill detection: 100% (10/10 tests)
- Agent detection: 100% (10/10 tests)
- Overall accuracy: 93.8% (30/32 tests)

### 2. **19 Specialized Skills**

**Development & Quality:**
- `tech-debt-tracker` - Analyze and prioritize technical debt
- `code-formatter` - Format code with Prettier/ESLint
- `test-first-change` - Find and run relevant tests
- `security-scanner` - SAST, secrets, OWASP scanning
- `dependency-guardian` - Dependency auditing and updates

**Documentation & Release:**
- `api-documentor` - Generate OpenAPI/Swagger docs
- `release-orchestrator` - Semantic versioning and changelogs
- `documentation-sync` - Detect code/docs drift

**Infrastructure:**
- `container-validator` - Validate Dockerfiles and K8s manifests
- `database-migrator` - Generate safe database migrations
- `performance-profiler` - Profile and identify bottlenecks

**Operations:**
- `incident-triage` - On-call handoffs and postmortems
- `finops-optimizer` - Cloud cost optimization

**Development Tools:**
- `semantic-search` - Natural language code search
- `memory-hygiene` - Memory cleanup and validation
- `codebase-navigator` - Repository structure analysis

See [skills/](./skills) for full skill catalog.

### 3. **10 Expert Agents**

Injected via Claude CLI `--agents` flag:
- `frontend-developer` - React, TypeScript, UI components
- `backend-architect` - API design, microservices, databases
- `typescript-pro` - Advanced TypeScript types and patterns
- `devops-engineer` - CI/CD, infrastructure, deployments
- `database-optimizer` - Query optimization, indexing
- `security-engineer` - Security architecture, compliance
- `test-automator` - Test strategy, automation
- `debugger` - Error analysis, troubleshooting
- `code-reviewer` - Code quality, best practices
- `ai-engineer` - LLM integration, RAG systems

See [agents.json](./agents.json) for agent definitions.

### 4. **CLI Integration**

Enhanced shell functions for Claude Code CLI:

```bash
# Enhanced Claude with routing
claude_with_routing "your prompt"

# Alias
claude_enhanced "your prompt"

# Test routing decision
test_routing "your prompt"

# Check system status
routing_status
```

**CLI flags supported:**
- `--print` - Non-interactive output
- `--model` - Model selection (sonnet/opus/haiku)
- `--agents` - Agent definitions (auto-injected)
- `--append-system-prompt` - Routing context (auto-added)
- All other Claude CLI flags pass through

---

## 📁 Project Structure

```
claude-workflow-engine/
├── README.md                    # This file
├── ACTIVATION_GUIDE.md          # Setup and usage guide
├── agents.json                  # 10 CLI agent definitions
├── package.json                 # Dependencies
│
├── docs/                        # Documentation
│   ├── current/                 # Current architecture
│   │   ├── CLI_INTEGRATION_STRATEGY.md
│   │   ├── PHASE2_CLI_INTEGRATION.md
│   │   ├── DEPLOYMENT_SUMMARY_93_8.md
│   │   └── SDK_INTEGRATION_NOTE.md
│   │
│   ├── decisions/               # Architecture decisions
│   │   └── OPENAI_INTEGRATION_DECISION.md
│   │
│   └── archive/                 # Historical reference
│       ├── CLAUDE_SDK_RESEARCH_REPORT.md
│       ├── OPENAI_CODEX_INTEGRATION_RESEARCH.md
│       └── MASTER_IMPROVEMENT_PLAN.md
│
├── memory/                      # Shell hooks & routing
│   ├── auto-behavior-hook-v2.sh       # Enhanced CLI integration
│   ├── auto-behavior-system.js        # Routing logic (93.8%)
│   ├── enhanced-agent-dispatcher.js   # Agent detection
│   └── skill-router.js                # Skill detection
│
├── scripts/                     # Utility scripts
│   └── generate-cli-agents.js   # Generate agents.json
│
├── skills/                      # 19 specialized skills
│   └── skill-manifest.json      # Skill definitions
│
└── integrations/                # Tests & integrations
    ├── test-e2e-workflow-chooser.js   # 93.8% test suite
    └── claude-sdk/              # SDK modules (reference)
```

---

## 🎓 How It Works

### Routing System (93.8% Accurate)

```javascript
// 1. User input analyzed
const routing = await system.processPrompt(prompt);

// 2. Skill detection (keyword matching + TF-IDF)
if (routing.skill_confidence >= 0.45) {
  mode = 'skill';
  winner = routing.skill_recommendation.skill;
}

// 3. Agent detection (mandatory triggers + scoring)
if (routing.agent_confidence >= 0.45) {
  mode = 'agent';
  winner = routing.agent_recommendation.recommended_agent;
}

// 4. Routing rules (8 rules, skill preference when close)
if (skillConf >= 0.65 && agentConf - skillConf <= 0.35) {
  mode = 'skill'; // Prefer specific tool over general agent
}
```

### CLI Integration

```bash
# Behind the scenes when you use claude_with_routing:

1. Analyze prompt → Detect mode (skill/agent/direct)
2. Build CLI flags:
   --agents "$(cat ~/.workflow-engine/agents.json)"
   --append-system-prompt "Routing context: Use tech-debt-tracker skill"
3. Execute: claude [flags] "your prompt"
4. Log routing decision for learning
```

### Skills vs Agents

| Feature | Skills | Agents |
|---------|--------|--------|
| **Speed** | <100ms | 3-8 seconds |
| **Tokens** | ~750 | ~15,000 |
| **Cost** | ~$0.001 | ~$0.05 |
| **Deterministic** | Yes | No |
| **Best For** | Routine operations | Complex reasoning |

**Example:**
- "Format code" → `code-formatter` skill (100ms)
- "Design database schema" → `backend-architect` agent (5s)

---

## 📊 Performance

### Routing Accuracy

| Test Category | Accuracy | Tests |
|--------------|----------|-------|
| Skill Detection | 100% | 10/10 |
| Agent Detection | 100% | 10/10 |
| Overall Routing | 93.8% | 30/32 |

### Speed Comparison

| Operation | Skills | Agents | Speedup |
|-----------|--------|--------|---------|
| Tech Debt Analysis | <100ms | 5-8s | 50-80x |
| Code Formatting | <50ms | 3-5s | 60-100x |
| Test Discovery | <200ms | 4-6s | 20-30x |

### Token Savings

| Task | Skills | Agents | Savings |
|------|--------|--------|---------|
| Format 100 files | 750 tokens | 1.5M tokens | 99.95% |
| Analyze tech debt | 1K tokens | 20K tokens | 95% |
| Generate docs | 2K tokens | 15K tokens | 87% |

---

## 🏗️ Architecture Decisions

### Why CLI-based (Not API)?

✅ **Current (Claude CLI):**
- Already authenticated
- Simple shell integration
- No API key management
- Lower latency
- Best-in-class code model (Claude 4: 72.7% SWE-bench)

❌ **Alternative (OpenAI API):**
- API key management
- Rate limiting complexity
- Network dependency
- Inferior code model (GPT-4: 54.6% SWE-bench)
- Negative ROI (-164%)

See [docs/decisions/OPENAI_INTEGRATION_DECISION.md](./docs/decisions/OPENAI_INTEGRATION_DECISION.md) for full analysis.

### Why Skills + Agents?

**Skills** for deterministic operations:
- 95%+ token savings
- 30-80x faster
- Deterministic results
- Local execution

**Agents** for complex reasoning:
- Architecture decisions
- Code review
- Debugging
- Creative solutions

**Routing** chooses optimal mode automatically with 93.8% accuracy.

---

## 📚 Documentation

### Getting Started
- [ACTIVATION_GUIDE.md](./ACTIVATION_GUIDE.md) - Setup and usage

### Current Architecture
- [CLI Integration Strategy](./docs/current/CLI_INTEGRATION_STRATEGY.md) - Overall approach
- [Phase 2 CLI Integration](./docs/current/PHASE2_CLI_INTEGRATION.md) - Implementation details
- [Deployment Summary](./docs/current/DEPLOYMENT_SUMMARY_93_8.md) - Current status (93.8%)
- [SDK vs CLI Decision](./docs/current/SDK_INTEGRATION_NOTE.md) - Architecture choice

### Architecture Decisions
- [OpenAI Integration Decision](./docs/decisions/OPENAI_INTEGRATION_DECISION.md) - Why we don't use OpenAI

### Research & Reference
- [Claude SDK Research](./docs/archive/CLAUDE_SDK_RESEARCH_REPORT.md) - SDK capabilities (reference)
- [OpenAI Codex Research](./docs/archive/OPENAI_CODEX_INTEGRATION_RESEARCH.md) - Codex analysis
- [Master Improvement Plan](./docs/archive/MASTER_IMPROVEMENT_PLAN.md) - 8-week roadmap
- [ML Agent Selection](./docs/archive/ML_AGENT_SELECTION_RECOMMENDATION.md) - ML enhancements

---

## 🧪 Testing

Run the comprehensive test suite:

```bash
cd ~/.workflow-engine/integrations
node test-e2e-workflow-chooser.js

# Expected output:
# Pass Rate: 93.8% (30/32 tests)
# - Skill detection: 10/10 (100%)
# - Agent detection: 10/10 (100%)
# - Edge cases: 10/12 (83%)
```

---

## 🛠️ Development

### Generate CLI Agents

```bash
node ~/.workflow-engine/scripts/generate-cli-agents.js
# Creates: ~/.workflow-engine/agents.json
```

### Add New Skill

1. Create skill directory: `skills/my-new-skill/`
2. Add to `skills/skill-manifest.json`
3. Define keywords, phrases, operations
4. Test with `test_routing "skill trigger phrase"`

### Add New Agent

1. Edit `scripts/generate-cli-agents.js`
2. Add agent definition with description and prompt
3. Run: `node scripts/generate-cli-agents.js`
4. Test with `claude --agents "$(cat agents.json)" "agent task"`

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Test your changes (93.8%+ routing accuracy)
4. Submit a pull request

---

## 📄 License

MIT License - see LICENSE file for details

---

## 🔗 Links

- **Repository**: https://github.com/benreceveur/claude-workflow-engine
- **Issues**: https://github.com/benreceveur/claude-workflow-engine/issues
- **Claude Code**: https://claude.ai/code

---

## 📈 Status

**Current Version**: v2.0 (CLI-Enhanced)
**Routing Accuracy**: 93.8%
**Skills**: 19
**Agents**: 10
**Architecture**: CLI-based with intelligent routing
**Status**: Production-ready ✅

---

**Built with [Claude Code](https://claude.ai/code)**
