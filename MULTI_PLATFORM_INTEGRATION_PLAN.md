# Multi-Platform Integration Plan
## Claude Workflow Engine Integration: Claude Code + Codex + Gemini

**Date**: 2025-10-27
**Status**: Planning Phase
**Target Platforms**: 3 (Claude Code, GitHub Copilot/Codex, Google Gemini)

---

## 🎯 Overview

The Claude Workflow Engine needs to provide **automatic agent and skill selection** across THREE AI platforms:

1. **Claude Code** - Anthropic's Claude in terminal/VSCode
2. **Codex/GitHub Copilot** - OpenAI's Codex via GitHub Copilot
3. **Gemini** - Google's Gemini AI

**Current State**: System installed at `~/.workflow-engine` but NOT integrated with any platform
**Goal**: Unified integration that works across all three platforms
**Expected Outcome**: Any AI platform automatically gets skill/agent recommendations

---

## 🏗️ Architecture Strategy

### Unified Integration Approach

```
┌─────────────────────────────────────────────────────┐
│         User Prompt (Any Platform)                  │
└───────────────┬─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────┐
│     Platform Detection Layer                        │
│  (Detects: Claude Code | Copilot | Gemini)         │
└───────────────┬─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────┐
│     Auto-Behavior System (Unified Core)             │
│  - Skill Detection (SkillRouter)                    │
│  - Agent Selection (EnhancedAgentDispatcher)        │
│  - MCP Service Routing                              │
└───────────────┬─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────┐
│     Platform-Specific Injection                     │
│  ┌────────────┬──────────────┬──────────────┐      │
│  │ Claude Code│ Copilot Chat │ Gemini API   │      │
│  │ Slash Cmds │ Chat Partcpt │ Custom Instr │      │
│  └────────────┴──────────────┴──────────────┘      │
└─────────────────────────────────────────────────────┘
```

---

## 📋 Platform-Specific Integration Strategies

### Platform 1: Claude Code ✅

**Integration Method**: Slash Commands + User Prompt Hooks

**Files to Create**:
```
~/.claude/commands/
├── auto-select.md        # Auto agent/skill selection
├── skill.md              # Manual skill invocation
├── agent.md              # Manual agent selection
└── mcp.md                # MCP service management
```

**Hook Configuration** (`~/.claude/settings.local.json`):
```json
{
  "hooks": {
    "user-prompt-submit": "node ~/.workflow-engine/integrations/claude-hook.js"
  },
  "permissions": {
    "allow": [
      "Bash(node ~/.workflow-engine/**)",
      "Read(~/.workflow-engine/**)"
    ]
  }
}
```

**Implementation Status**: ❌ Not Started

---

### Platform 2: GitHub Copilot (Codex) 🆕

**Integration Method**: VSCode Chat Participant + Workspace Context

**VSCode Extension Approach**:
```json
// In VSCode settings.json or workspace .vscode/settings.json
{
  "github.copilot.chat.codeGeneration.instructions": [
    {
      "file": "~/.workflow-engine/integrations/copilot-instructions.md"
    }
  ],
  "github.copilot.chat.welcomeMessage": "Auto-behavior system active. Available skills: {{skills}}",
  "workspace.codex.autoSelect": true
}
```

**Alternative: VSCode Tasks Integration**:
```json
// .vscode/tasks.json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Auto-Behavior Analysis",
      "type": "shell",
      "command": "node ~/.workflow-engine/integrations/analyze-prompt.js '${input:userPrompt}'",
      "presentation": {
        "reveal": "always",
        "panel": "dedicated"
      }
    }
  ]
}
```

**Custom Extension Option**:
- Create VSCode extension: `workflow-engine-copilot`
- Registers as Copilot chat participant: `@workflow`
- Usage: `@workflow analyze this code for tech debt`

**Files to Create**:
```
~/.workflow-engine/integrations/
├── copilot-instructions.md   # Instructions for Copilot
├── copilot-hook.js           # Copilot chat interceptor
└── vscode-extension/         # Optional VSCode extension
    ├── package.json
    ├── extension.js
    └── chat-participant.js
```

**Implementation Status**: ❌ Not Started

---

### Platform 3: Google Gemini 🆕

**Integration Method**: Custom Instructions + API Wrapper

**Approach A: Gemini API Wrapper**
```javascript
// ~/.workflow-engine/integrations/gemini-wrapper.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const AutoBehavior = require('../memory/auto-behavior-system.js');

async function geminiWithAutoSelect(prompt, apiKey) {
  // 1. Analyze prompt with auto-behavior
  const behavior = new AutoBehavior();
  const analysis = await behavior.processPrompt(prompt);

  // 2. Inject recommendations into system instruction
  const systemInstruction = `
${analysis.skill_recommendation ? `🎯 SKILL: Use ${analysis.skill_recommendation.skill}` : ''}
${analysis.agent_recommendation ? `🤖 AGENT: Act as ${analysis.agent_recommendation.recommended_agent}` : ''}

Available Skills: ${analysis.available_skills.map(s => s.name).join(', ')}
  `;

  // 3. Call Gemini with enhanced prompt
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-pro",
    systemInstruction
  });

  const result = await model.generateContent(prompt);
  return result.response.text();
}
```

**Approach B: Browser Extension (Chrome/Firefox)**
```javascript
// Intercept Gemini chat interface
chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    if (details.url.includes('gemini.google.com')) {
      // Inject auto-behavior analysis
      const prompt = extractPrompt(details);
      const analysis = analyzeWithWorkflowEngine(prompt);
      modifyRequest(details, analysis);
    }
  },
  {urls: ["https://gemini.google.com/*"]},
  ["blocking", "requestBody"]
);
```

**Approach C: CLI Wrapper**
```bash
#!/bin/bash
# ~/.workflow-engine/bin/gemini
# Wrapper that adds auto-behavior to Gemini CLI

prompt="$*"
analysis=$(node ~/.workflow-engine/memory/auto-behavior-system.js prompt "$prompt")

# Add analysis to prompt
enhanced_prompt="$analysis\n\nUser request: $prompt"

# Call actual Gemini CLI/API
gemini-cli "$enhanced_prompt"
```

**Files to Create**:
```
~/.workflow-engine/integrations/
├── gemini-wrapper.js         # API wrapper with auto-select
├── gemini-cli.sh            # CLI wrapper
├── gemini-instructions.md    # System instructions
└── browser-extension/        # Optional browser extension
    ├── manifest.json
    ├── content-script.js
    └── background.js
```

**Implementation Status**: ❌ Not Started

---

## 🔧 Unified Core Components (Platform-Agnostic)

These components work across ALL platforms:

### 1. Platform Detection Service
```javascript
// ~/.workflow-engine/integrations/platform-detector.js
class PlatformDetector {
  detect() {
    if (process.env.CLAUDE_CODE) return 'claude';
    if (process.env.GITHUB_COPILOT) return 'copilot';
    if (process.env.GEMINI_API_KEY) return 'gemini';

    // Fallback detection
    if (isRunningInClaudeCode()) return 'claude';
    if (isRunningInVSCode()) return 'copilot';
    return 'unknown';
  }
}
```

### 2. Universal Prompt Analyzer
```javascript
// ~/.workflow-engine/integrations/universal-analyzer.js
class UniversalAnalyzer {
  async analyze(prompt, platform) {
    const behavior = new AutoBehaviorSystem();
    const analysis = await behavior.processPrompt(prompt);

    // Format for specific platform
    return this.formatForPlatform(analysis, platform);
  }

  formatForPlatform(analysis, platform) {
    switch(platform) {
      case 'claude':
        return this.formatForClaude(analysis);
      case 'copilot':
        return this.formatForCopilot(analysis);
      case 'gemini':
        return this.formatForGemini(analysis);
    }
  }
}
```

### 3. Recommendation Injector
```javascript
// ~/.workflow-engine/integrations/recommendation-injector.js
class RecommendationInjector {
  inject(prompt, analysis, platform) {
    const recommendation = this.buildRecommendation(analysis);

    switch(platform) {
      case 'claude':
        return this.injectViaSL ashCommand(prompt, recommendation);
      case 'copilot':
        return this.injectViaInstructions(prompt, recommendation);
      case 'gemini':
        return this.injectViaSystemPrompt(prompt, recommendation);
    }
  }
}
```

---

## 📊 Implementation Phases (Updated)

### Phase 1: Core Multi-Platform Infrastructure (CRITICAL)
**Duration**: 3-4 hours
**Priority**: P0

**Tasks**:
1. ✅ Create platform detection service
2. ✅ Create universal prompt analyzer
3. ✅ Create recommendation injector base
4. ✅ Set up integrations directory structure

**Deliverables**:
```
~/.workflow-engine/integrations/
├── platform-detector.js
├── universal-analyzer.js
├── recommendation-injector.js
└── README.md
```

---

### Phase 2A: Claude Code Integration (CRITICAL)
**Duration**: 2-3 hours
**Priority**: P0

**Tasks**:
1. ✅ Create slash commands in `~/.claude/commands/`
2. ✅ Set up user-prompt-submit hook
3. ✅ Configure permissions in settings.local.json
4. ✅ Create Claude-specific formatter
5. ✅ Test with sample prompts

**Deliverables**:
- `~/.claude/commands/auto-select.md`
- `~/.claude/commands/skill.md`
- `~/.claude/commands/agent.md`
- `~/.workflow-engine/integrations/claude-hook.js`

**Testing**:
```bash
# In Claude Code:
/auto-select analyze technical debt
# Expected: Shows skill recommendation
```

---

### Phase 2B: GitHub Copilot Integration (HIGH)
**Duration**: 3-4 hours
**Priority**: P1

**Tasks**:
1. ✅ Create Copilot instructions file
2. ✅ Configure VSCode settings
3. ✅ Create optional VSCode extension
4. ✅ Set up workspace-level integration
5. ✅ Test with Copilot chat

**Deliverables**:
- `~/.workflow-engine/integrations/copilot-instructions.md`
- `.vscode/settings.json` template
- Optional: VSCode extension package

**Testing**:
```
# In VSCode Copilot Chat:
@workspace analyze this code for tech debt
# Expected: Auto-behavior analysis appears
```

---

### Phase 2C: Gemini Integration (HIGH)
**Duration**: 3-4 hours
**Priority**: P1

**Tasks**:
1. ✅ Create Gemini API wrapper
2. ✅ Create CLI wrapper script
3. ✅ Optional: Browser extension for web UI
4. ✅ Set up API key management
5. ✅ Test with Gemini API

**Deliverables**:
- `~/.workflow-engine/integrations/gemini-wrapper.js`
- `~/.workflow-engine/bin/gemini` CLI
- Optional: Browser extension

**Testing**:
```bash
# Via CLI wrapper:
~/.workflow-engine/bin/gemini "analyze technical debt"
# Expected: Gemini with auto-behavior recommendations
```

---

### Phase 3: MCP Multi-Platform Integration (MEDIUM)
**Duration**: 2-3 hours
**Priority**: P2

**Tasks**:
1. ✅ Connect MCP servers to Claude Code
2. ✅ Make MCP tools available to Copilot (via extensions)
3. ✅ Create Gemini MCP adapter
4. ✅ Test cross-platform MCP usage

**Deliverables**:
- Claude Code MCP config
- VSCode extension with MCP tools
- Gemini MCP wrapper

---

### Phase 4: Unified Testing & Validation (HIGH)
**Duration**: 2-3 hours
**Priority**: P1

**Tasks**:
1. ✅ Test skill detection across all platforms
2. ✅ Test agent selection across all platforms
3. ✅ Test MCP services across all platforms
4. ✅ Create test suite for each platform
5. ✅ Document platform-specific behaviors

**Test Matrix**:
| Test Case | Claude | Copilot | Gemini | Status |
|-----------|--------|---------|--------|--------|
| Skill detection | ❌ | ❌ | ❌ | Pending |
| Agent selection | ❌ | ❌ | ❌ | Pending |
| MCP services | ❌ | ❌ | ❌ | Pending |
| Auto-routing | ❌ | ❌ | ❌ | Pending |

---

### Phase 5: Fix Test Suite (MEDIUM)
**Duration**: 1 hour
**Priority**: P2

**Tasks**:
1. ✅ Update path assertions (.workflow-engine)
2. ✅ Run full test suite
3. ✅ Achieve 100% test pass rate

**Expected**: 280/280 tests passing (currently 265/280)

---

## 🛠️ Agent Assignment Plan

### Agent 1: DevOps Engineer
**Responsibility**: Platform detection and core infrastructure
**Tasks**: Phase 1 (Core Multi-Platform Infrastructure)
**Deliverables**: Platform detector, universal analyzer, base injector

### Agent 2: Frontend Developer
**Responsibility**: VSCode/Copilot integration
**Tasks**: Phase 2B (GitHub Copilot Integration)
**Deliverables**: VSCode extension, Copilot chat participant

### Agent 3: Backend Architect
**Responsibility**: API wrappers and CLI tools
**Tasks**: Phase 2C (Gemini Integration)
**Deliverables**: Gemini API wrapper, CLI tools

### Agent 4: Fullstack Developer
**Responsibility**: Claude Code integration
**Tasks**: Phase 2A (Claude Code Integration)
**Deliverables**: Slash commands, hooks, formatters

### Agent 5: Test Engineer
**Responsibility**: Cross-platform testing
**Tasks**: Phase 4 (Unified Testing)
**Deliverables**: Test suites, validation reports

---

## 📈 Success Metrics

**Platform Coverage**:
- ✅ Claude Code: Full integration
- ✅ GitHub Copilot: Full integration
- ✅ Gemini: Full integration

**Functionality**:
- ✅ Skill autoselection works on all platforms
- ✅ Agent autoselection works on all platforms
- ✅ MCP services available on all platforms
- ✅ Unified experience across platforms

**Performance**:
- Autoselection < 100ms per platform
- 95%+ token savings maintained
- No platform-specific failures

**User Experience**:
- Same workflow engine features on all platforms
- Platform-appropriate UI/UX
- Seamless switching between platforms

---

## 🚀 Quick Start (After Implementation)

### For Claude Code:
```bash
# In Claude Code terminal:
/auto-select analyze our codebase
```

### For GitHub Copilot:
```
// In VSCode Copilot Chat:
@workflow analyze our codebase
```

### For Gemini:
```bash
# Via CLI:
gemini "analyze our codebase"
```

**All three will**:
1. Detect skill: `tech-debt-tracker` or `codebase-navigator`
2. Recommend agent: `architect-reviewer`
3. Show MCP services available
4. Provide consistent auto-behavior analysis

---

## 🔄 Rollout Strategy

### Week 1: Core + Claude Code
- Phase 1: Core infrastructure (Day 1-2)
- Phase 2A: Claude Code integration (Day 3-4)
- Testing and refinement (Day 5)

### Week 2: Copilot + Gemini
- Phase 2B: Copilot integration (Day 1-2)
- Phase 2C: Gemini integration (Day 3-4)
- Cross-platform testing (Day 5)

### Week 3: Polish + MCP
- Phase 3: MCP integration (Day 1-2)
- Phase 4: Full testing (Day 3-4)
- Documentation and rollout (Day 5)

---

## 📝 Next Steps

1. **Immediate**: Launch agents for Phase 1 (Core Infrastructure)
2. **Then**: Parallel execution of Phase 2A, 2B, 2C
3. **Finally**: Integration testing across all platforms

**Ready to launch agents**: 5 specialized agents assigned to parallel tracks

---

*Multi-Platform Integration Plan - Updated for Claude + Codex + Gemini*
