# Focused Implementation Plan - Multi-Platform Integration
**Date**: 2025-10-27
**Status**: Ready to Execute
**Completion Target**: 4-5 hours

---

## 🎯 Mission

Complete the **Integration Layer** to enable autoselection across Claude Code, GitHub Copilot, and Google Gemini.

**Current Status**: 40% Complete (Core + Platform layers done)
**Remaining**: 60% (Integration layer missing)

---

## 📋 Component Build Queue

### **Priority Tier 1: Foundation (90 minutes)**

#### 1. recommendation-injector.js ⭐ **CRITICAL**
**Agent**: backend-architect
**Duration**: 30-45 min
**Location**: `~/.workflow-engine/integrations/recommendation-injector.js`

**Requirements**:
- Takes analysis output from `universal-analyzer.js`
- Formats recommendations for each platform:
  - Claude: Markdown with slash command suggestions
  - Copilot: JSON/VSCode-friendly format
  - Gemini: System instruction format
- Reuses existing formatters from universal-analyzer.js (lines 240-362)

**Deliverable**:
```javascript
class RecommendationInjector {
  constructor() { this.analyzer = new UniversalAnalyzer(); }

  // Main methods:
  inject(prompt, analysis, platform)  // Injects formatted recommendation
  format(analysis, platform)          // Returns formatted string
  toMarkdown(analysis)                // Claude format
  toJSON(analysis)                    // Copilot format
  toSystemPrompt(analysis)            // Gemini format
}
```

**Dependencies**: universal-analyzer.js (exists ✅)

---

#### 2. Claude Code Slash Commands ⭐ **CRITICAL**
**Agent**: fullstack-developer
**Duration**: 45-60 min
**Location**: `~/.claude/commands/`

**Requirements**:
Create 4 markdown files with frontmatter:

**File 1: auto-select.md**
```markdown
---
description: Automatically analyze prompt and recommend skills/agents
---

{{exec:node ~/.workflow-engine/integrations/claude-hook.js "{{prompt}}"}}
```

**File 2: skill.md**
```markdown
---
description: Execute a workflow engine skill manually
---

Execute skill: {{input:skillName}}

{{exec:node ~/.workflow-engine/memory/skill-executor.js execute {{input:skillName}} '{{input:context}}'}}
```

**File 3: agent.md** - Similar pattern for agent selection
**File 4: mcp.md** - List/manage MCP services

**Deliverables**: 4 .md files in `~/.claude/commands/`

**Dependencies**: recommendation-injector.js (built in step 1)

---

### **Priority Tier 2: Hooks & Automation (90 minutes)**

#### 3. claude-hook.js
**Agent**: fullstack-developer
**Duration**: 30 min
**Location**: `~/.workflow-engine/integrations/claude-hook.js`

**Requirements**:
```javascript
#!/usr/bin/env node
const UniversalAnalyzer = require('./universal-analyzer.js');
const RecommendationInjector = require('./recommendation-injector.js');

// Get prompt from command line
const prompt = process.argv[2];

// Analyze and format for Claude
const analyzer = new UniversalAnalyzer();
const analysis = await analyzer.analyze(prompt);

const injector = new RecommendationInjector();
const formatted = injector.format(analysis, 'claude');

console.log(formatted); // Output for Claude Code to display
```

**Deliverable**: Executable Node.js script
**Dependencies**: recommendation-injector.js (step 1)

---

#### 4. copilot-hook.js
**Agent**: frontend-developer
**Duration**: 30 min
**Location**: `~/.workflow-engine/integrations/copilot-hook.js`

**Requirements**:
Same pattern as claude-hook.js but formats for Copilot:
- Outputs VSCode-friendly JSON or markdown
- Can be called from VSCode tasks
- Returns analysis with code examples

**Deliverable**: Executable Node.js script
**Dependencies**: recommendation-injector.js (step 1)

---

### **Priority Tier 3: Gemini Integration (90 minutes)**

#### 5. gemini-wrapper.js
**Agent**: backend-architect
**Duration**: 45 min
**Location**: `~/.workflow-engine/integrations/gemini-wrapper.js`

**Requirements**:
```javascript
const { GoogleGenerativeAI } = require("@google/generative-ai");
const UniversalAnalyzer = require('./universal-analyzer.js');
const RecommendationInjector = require('./recommendation-injector.js');

class GeminiWithWorkflowEngine {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.analyzer = new UniversalAnalyzer();
  }

  async generateWithAutoSelect(prompt, options = {}) {
    // 1. Analyze prompt with workflow engine
    const analysis = await this.analyzer.analyze(prompt);

    // 2. Build system instruction with recommendations
    const injector = new RecommendationInjector();
    const systemInstruction = injector.format(analysis, 'gemini');

    // 3. Call Gemini with enhanced prompt
    const model = this.genAI.getGenerativeModel({
      model: options.model || "gemini-pro",
      systemInstruction
    });

    const result = await model.generateContent(prompt);
    return {
      response: result.response.text(),
      workflow_analysis: analysis
    };
  }
}

module.exports = GeminiWithWorkflowEngine;
```

**Deliverable**: Node.js module with exports
**Dependencies**: @google/generative-ai (installed ✅), recommendation-injector.js

---

#### 6. Gemini CLI
**Agent**: backend-architect
**Duration**: 30 min
**Location**: `~/.workflow-engine/bin/gemini`

**Requirements**:
```bash
#!/usr/bin/env node

const GeminiWithWorkflowEngine = require('../integrations/gemini-wrapper.js');

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
if (!apiKey) {
  console.error('Error: GEMINI_API_KEY not set');
  process.exit(1);
}

const prompt = process.argv.slice(2).join(' ');
const gemini = new GeminiWithWorkflowEngine(apiKey);

gemini.generateWithAutoSelect(prompt).then(result => {
  console.log(result.response);

  if (process.env.WORKFLOW_DEBUG) {
    console.log('\n--- Workflow Analysis ---');
    console.log(JSON.stringify(result.workflow_analysis, null, 2));
  }
}).catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
```

**Deliverable**: Executable CLI script with shebang
**Dependencies**: gemini-wrapper.js (step 5)

---

### **Priority Tier 4: Templates & Documentation (60 minutes)**

#### 7. VSCode Templates
**Agent**: frontend-developer
**Duration**: 30 min
**Location**: `~/.workflow-engine/templates/.vscode/`

**Requirements**:

**File 1: settings.json**
```json
{
  "github.copilot.chat.codeGeneration.instructions": [
    {
      "file": "~/.workflow-engine/integrations/copilot-instructions.md"
    }
  ],
  "github.copilot.chat.welcomeMessage": "Workflow Engine active. Type @workspace for intelligent skill/agent selection.",
  "workflowEngine.enabled": true
}
```

**File 2: tasks.json**
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Workflow: Analyze Prompt",
      "type": "shell",
      "command": "node ~/.workflow-engine/integrations/copilot-hook.js '${input:userPrompt}'",
      "presentation": { "reveal": "always" }
    },
    {
      "label": "Workflow: Execute Skill",
      "type": "shell",
      "command": "node ~/.workflow-engine/memory/skill-executor.js execute '${input:skillName}' '{}'",
      "presentation": { "reveal": "always" }
    }
  ],
  "inputs": [
    {
      "id": "userPrompt",
      "type": "promptString",
      "description": "Enter your prompt for analysis"
    },
    {
      "id": "skillName",
      "type": "promptString",
      "description": "Enter skill name to execute"
    }
  ]
}
```

**Deliverables**: 2 template files
**Dependencies**: copilot-hook.js (step 4)

---

#### 8. Integration README
**Agent**: fullstack-developer
**Duration**: 15 min
**Location**: `~/.workflow-engine/integrations/README.md`

**Requirements**:
- Overview of integration architecture
- How each platform integration works
- Usage examples for each hook/CLI
- Troubleshooting guide

**Deliverable**: Comprehensive README.md

---

#### 9. User Setup Script
**Agent**: devops-engineer
**Duration**: 15 min
**Location**: `~/.workflow-engine/bin/setup-integration`

**Requirements**:
```bash
#!/bin/bash
# Interactive setup for choosing which platforms to integrate

echo "Workflow Engine Integration Setup"
echo ""
echo "Which platforms do you want to integrate?"
echo "1) Claude Code"
echo "2) GitHub Copilot"
echo "3) Google Gemini"
echo "4) All platforms"
read -p "Selection: " choice

# Based on choice, copy templates, set up configs, etc.
```

**Deliverable**: Interactive setup script

---

## 🤖 Agent Assignment Matrix

| Agent | Components | Duration | Priority |
|-------|-----------|----------|----------|
| **backend-architect** | recommendation-injector.js, gemini-wrapper.js, gemini CLI | 105 min | **P0** |
| **fullstack-developer** | Claude slash commands, claude-hook.js, integration README | 90 min | **P0** |
| **frontend-developer** | copilot-hook.js, VSCode templates | 60 min | **P1** |
| **devops-engineer** | Setup script, testing | 30 min | **P2** |

**Total Parallel Work**: Can be done in 2-3 hours with agents working simultaneously

---

## 🚀 Execution Strategy

### Phase 1: Foundation (Run in Parallel)
**Time**: 60 minutes

**Agent 1 (backend-architect)**:
- Build recommendation-injector.js (45 min)

**Agent 2 (fullstack-developer)**:
- Start designing Claude slash commands (15 min planning)

**Output**: recommendation-injector.js complete, slash commands designed

---

### Phase 2: Platform Integration (Run in Parallel)
**Time**: 90 minutes

**Agent 1 (backend-architect)**:
- Build gemini-wrapper.js (45 min)
- Build gemini CLI (30 min)
- Test Gemini integration (15 min)

**Agent 2 (fullstack-developer)**:
- Create 4 Claude slash commands (45 min)
- Build claude-hook.js (30 min)
- Test Claude Code integration (15 min)

**Agent 3 (frontend-developer)**:
- Build copilot-hook.js (30 min)
- Create VSCode templates (30 min)
- Test Copilot integration (30 min)

**Output**: All 3 platforms integrated and tested

---

### Phase 3: Polish & Documentation (Run in Parallel)
**Time**: 30 minutes

**Agent 1 (fullstack-developer)**:
- Write integration README.md (15 min)
- Create usage examples (15 min)

**Agent 2 (devops-engineer)**:
- Build setup script (15 min)
- Run integration tests (15 min)

**Output**: Documentation complete, setup automated

---

## ✅ Success Criteria

**Each platform integration is complete when**:

### Claude Code:
- [ ] `/auto-select` command exists and works
- [ ] Running `/auto-select analyze tech debt` shows skill recommendation
- [ ] `/skill tech-debt-tracker` executes the skill
- [ ] Recommendations display in Claude Code UI

### GitHub Copilot:
- [ ] copilot-instructions.md is referenced in user's settings
- [ ] Typing a prompt triggers analysis (via copilot-hook.js)
- [ ] Recommendations appear in Copilot chat
- [ ] VSCode tasks can execute skills

### Google Gemini:
- [ ] `gemini "analyze tech debt"` CLI works
- [ ] Gemini API wrapper injects recommendations
- [ ] System instructions include workflow analysis
- [ ] Gemini responses acknowledge recommendations

---

## 📦 Deliverables Summary

### Files to Create: **13 files**

**Integrations** (5 files):
1. recommendation-injector.js
2. claude-hook.js
3. copilot-hook.js
4. gemini-wrapper.js
5. README.md

**Commands** (4 files):
6. ~/.claude/commands/auto-select.md
7. ~/.claude/commands/skill.md
8. ~/.claude/commands/agent.md
9. ~/.claude/commands/mcp.md

**Bin** (2 files):
10. ~/.workflow-engine/bin/gemini
11. ~/.workflow-engine/bin/setup-integration

**Templates** (2 files):
12. ~/.workflow-engine/templates/.vscode/settings.json
13. ~/.workflow-engine/templates/.vscode/tasks.json

---

## 🧪 Testing Plan

### Test 1: Claude Code
```bash
# In Claude Code:
/auto-select analyze our codebase for technical debt

# Expected:
# 🎯 SKILL RECOMMENDATION: tech-debt-tracker (95% confidence)
# Use /skill tech-debt-tracker to execute
```

### Test 2: GitHub Copilot
```bash
# In VSCode Copilot Chat:
@workspace analyze technical debt

# Expected:
# Workflow Engine: Skill detected
# tech-debt-tracker (95% match)
# [Recommendations display]
```

### Test 3: Google Gemini
```bash
# In terminal:
export GEMINI_API_KEY="your-key"
gemini "analyze our codebase for technical debt"

# Expected:
# [Gemini response with workflow engine recommendations integrated]
```

---

## 🔄 Rollback Plan

If integration fails:
1. All original files remain unchanged (new files only)
2. Can delete ~/.claude/commands/ files to disable
3. Can remove VSCode settings to disable Copilot integration
4. Can remove bin/gemini to disable Gemini integration

**Risk**: LOW - All changes are additive, no modifications to existing files

---

## 📝 Next Steps

1. **Review this plan** ✅
2. **Launch 3 agents in parallel** to build components
3. **Monitor progress** via agent reports
4. **Test each integration** as it completes
5. **Generate final integration report**

---

*Focused Implementation Plan - Ready for Execution*
*Total Time: 4-5 hours with parallel agent execution*
