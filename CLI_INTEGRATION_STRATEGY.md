# Claude CLI Integration Strategy

**Date**: October 28, 2025
**Claude Code Version**: 2.0.28
**Architecture**: CLI-based (not API key-based)

---

## Current Architecture

### Claude Code CLI Capabilities

The workflow engine operates **WITHIN** Claude Code CLI, not as a separate API client:

```bash
# Current setup
claude --version
# → 2.0.28 (Claude Code)

# Shell integration
source ~/.zshrc
# → 🤖 Auto Behavior Hook loaded
```

### Key CLI Features for Integration

| CLI Flag | Purpose | Workflow Engine Use |
|----------|---------|---------------------|
| `--system-prompt` | Inject system prompt | Pass agent/skill context |
| `--append-system-prompt` | Append to system prompt | Add routing instructions |
| `--agents <json>` | Define custom agents | Pass 79 agent definitions |
| `--mcp-config` | MCP server config | Integrate MCP servers |
| `--model` | Select model | Dynamically choose model |
| `--print` | Non-interactive output | Batch processing |
| `--output-format json` | JSON output | Structured responses |
| `--session-id` | Session tracking | Maintain context |

---

## Integration Points

### 1. Shell Hook Enhancement (Current)

**File**: `~/.workflow-engine/memory/auto-behavior-hook.sh`

**Current Behavior**:
```bash
# User types in terminal
auto_process_input "analyze technical debt"

# System processes through auto-behavior-system.js
# → Detects: tech-debt-tracker skill
# → Routes: skill mode
```

**Enhancement Opportunity**:
```bash
# Enhanced with CLI flags
claude_with_auto_behavior() {
    local prompt="$1"

    # Process through workflow engine
    local routing=$(node $AUTO_BEHAVIOR_SYSTEM prompt "$prompt")

    # Extract skill/agent recommendation
    local recommended_agent=$(echo "$routing" | jq -r '.agent')
    local system_context=$(echo "$routing" | jq -r '.system_prompt')

    # Call Claude CLI with enhancements
    claude \
        --append-system-prompt "$system_context" \
        --agents "$(cat ~/.workflow-engine/agents.json)" \
        "$prompt"
}
```

### 2. Agent Definition Injection

**Current**: 79 agents in `enhanced-agent-dispatcher.js`
**Enhancement**: Pass to CLI via `--agents` flag

```json
{
  "frontend-developer": {
    "description": "Frontend development specialist for React applications",
    "prompt": "You are a frontend developer specializing in React, TypeScript, and modern UI patterns..."
  },
  "backend-architect": {
    "description": "Backend system architecture and API design specialist",
    "prompt": "You are a backend architect specializing in RESTful APIs, microservices..."
  }
  // ... all 79 agents
}
```

**Implementation**:
```bash
# Generate agents.json from current dispatcher
node ~/.workflow-engine/scripts/generate-cli-agents.js

# Use in CLI calls
claude --agents "$(cat ~/.workflow-engine/agents.json)" "your prompt"
```

### 3. System Prompt Optimization

**Current**: Auto-behavior system builds context
**Enhancement**: Use `--system-prompt` for skill context

```javascript
// auto-behavior-system.js enhancement
buildSystemPromptForCLI(skillRecommendation, agentRecommendation) {
  const parts = [];

  // Add skill context if recommended
  if (skillRecommendation) {
    parts.push(`
You have access to the ${skillRecommendation.skill} skill.
Operation: ${skillRecommendation.operation}
Confidence: ${skillRecommendation.confidence}
    `);
  }

  // Add agent context if recommended
  if (agentRecommendation) {
    parts.push(`
Recommended specialist: ${agentRecommendation.recommended_agent}
Expertise: ${agentRecommendation.reasoning}
    `);
  }

  return parts.join('\n\n');
}
```

---

## CLI-Applicable Features from SDK Research

### ✅ Features We CAN Use (CLI-Compatible)

1. **Prompt Engineering & Context Management**
   - Use `--system-prompt` to inject agent context
   - Use `--append-system-prompt` for skill documentation
   - Leverage conversation history with `--continue` and `--resume`

2. **Agent Definitions**
   - Pass all 79 agents via `--agents` JSON flag
   - Claude CLI will automatically dispatch to appropriate agent
   - Complements our 93.8% routing system

3. **MCP Server Integration**
   - Use `--mcp-config` to load MCP servers
   - Integrate external tools and data sources
   - Extend skill capabilities

4. **Session Management**
   - Use `--session-id` for tracking
   - Use `--resume` for context continuity
   - Already have session management in `session-cli.js`

5. **Batch Processing**
   - Use `--print` for non-interactive mode
   - Process multiple prompts in scripts
   - Useful for historical analysis

6. **Model Selection**
   - Use `--model` to switch models dynamically
   - Choose Sonnet vs Opus based on task complexity
   - Cost optimization through model selection

### ❌ Features We CANNOT Use (API-Only)

1. **Direct SDK Features** (require API keys):
   - Prompt caching (API-level feature)
   - Token counting API
   - Streaming API
   - Batch API (50% cost savings)

2. **Workarounds**:
   - Prompt caching: Use `--continue` for context reuse
   - Token counting: Estimate with local tool
   - Streaming: CLI already streams by default
   - Batch processing: Use `--print` with shell scripts

---

## Enhanced Workflow Engine Architecture

### CLI-Optimized Flow

```
User Input
    ↓
Auto-Behavior Hook (shell function)
    ↓
Auto-Behavior System (Node.js)
    ├─→ Skill Detection (93.8% accurate)
    ├─→ Agent Detection (93.8% accurate)
    └─→ Build CLI Flags
        ├─→ --system-prompt (context)
        ├─→ --agents (79 agents JSON)
        ├─→ --append-system-prompt (skill docs)
        └─→ --model (dynamic selection)
    ↓
Claude CLI Execution
    ↓
Response to User
```

### Example Enhanced Command

```bash
# Before (current)
claude "create a React component with TypeScript"

# After (enhanced)
claude \
    --agents "$(cat ~/.workflow-engine/agents.json)" \
    --append-system-prompt "$(node ~/.workflow-engine/memory/skill-router.js "$prompt" | jq -r '.system_context')" \
    --model "sonnet" \
    "create a React component with TypeScript"

# Claude CLI automatically:
# 1. Routes to frontend-developer agent (from our 79 agents)
# 2. Has context about available skills
# 3. Uses optimal model for task
```

---

## Implementation Roadmap (CLI-Focused)

### Phase 1: Agent JSON Generation (Week 1)
- [ ] Create `generate-cli-agents.js` script
- [ ] Export all 79 agents to `~/.workflow-engine/agents.json`
- [ ] Test with `--agents` flag
- [ ] Validate agent routing works

### Phase 2: Shell Hook Enhancement (Week 2)
- [ ] Update `claude_with_auto_behavior()` to use CLI flags
- [ ] Add `--system-prompt` injection
- [ ] Add `--agents` loading
- [ ] Test end-to-end workflow

### Phase 3: Skill Context Injection (Week 3)
- [ ] Update `buildSystemPromptForCLI()` in auto-behavior-system.js
- [ ] Generate skill documentation for `--append-system-prompt`
- [ ] Test skill detection accuracy
- [ ] Verify 93.8% routing maintained

### Phase 4: MCP Server Integration (Week 4)
- [ ] Research MCP servers for skills
- [ ] Configure `--mcp-config` for external tools
- [ ] Integrate with existing skill execution
- [ ] Test MCP tool availability

### Phase 5: Session & Model Management (Week 5)
- [ ] Enhance session tracking with `--session-id`
- [ ] Implement dynamic model selection
- [ ] Add cost tracking (model-based)
- [ ] Optimize for cost vs performance

### Phase 6: Batch Processing (Week 6)
- [ ] Create batch scripts using `--print`
- [ ] Process historical interactions
- [ ] Generate reports with `--output-format json`
- [ ] Analyze patterns and improvements

---

## Cost Optimization (CLI-Based)

### Model Selection Strategy

```javascript
// Dynamic model selection based on task
function selectModel(prompt, routing) {
  const complexity = analyzeComplexity(prompt);
  const isCreative = routing.mode === 'agent' && routing.agent.includes('developer');

  if (complexity === 'high' || isCreative) {
    return 'opus';  // More expensive, more capable
  } else if (complexity === 'low') {
    return 'haiku'; // Fastest, cheapest
  } else {
    return 'sonnet'; // Balanced (default)
  }
}

// Usage
claude --model "$(select_model "$prompt")" "$prompt"
```

### Estimated Savings

| Strategy | Current | Optimized | Savings |
|----------|---------|-----------|---------|
| Model selection | All Sonnet | 60% Haiku, 30% Sonnet, 10% Opus | ~40% |
| Context reuse | Fresh each time | `--continue` for sessions | ~20% |
| Batch processing | Interactive | `--print` scripts | ~15% |
| **Total** | Baseline | Combined strategies | **~75%** |

---

## Key Differences from API Approach

| Feature | API Approach (❌ Not Applicable) | CLI Approach (✅ Our Reality) |
|---------|--------------------------------|-------------------------------|
| Authentication | API keys, SDK initialization | Already authenticated via CLI |
| Prompt caching | SDK `cache_control` headers | `--continue` for context reuse |
| Agent dispatch | Tool use / function calling | `--agents` JSON flag |
| Streaming | SDK streaming API | CLI streams by default |
| Batch processing | Batch API (50% off) | `--print` + shell scripts |
| Cost tracking | Token usage API | Estimate via model selection |
| Rate limiting | SDK rate limiter | CLI handles automatically |
| Error handling | SDK retry logic | CLI handles automatically |

---

## Next Steps

1. **Immediate** (This Week):
   - Generate `agents.json` from current dispatcher
   - Test `--agents` flag with sample agent
   - Validate routing still works

2. **Short Term** (Next 2 Weeks):
   - Update `claude_with_auto_behavior()` to use CLI flags
   - Add system prompt injection
   - Maintain 93.8% routing accuracy

3. **Medium Term** (Month):
   - MCP server integration
   - Dynamic model selection
   - Batch processing scripts

4. **Long Term** (Quarter):
   - Full CLI optimization
   - Cost tracking dashboard
   - Performance analytics

---

## Summary

**Current State**: Workflow engine operates as shell hooks, analyzing prompts and routing with 93.8% accuracy.

**Enhancement Strategy**: Leverage Claude CLI flags (`--agents`, `--system-prompt`, `--mcp-config`) to inject our routing intelligence directly into CLI calls.

**Key Insight**: We're not bypassing Claude Code CLI with API keys - we're **enhancing it** with intelligent context injection and agent routing.

**Result**: Maintain 93.8% routing accuracy while gaining CLI features like agent dispatch, MCP integration, and dynamic model selection.

---

**Architecture Principle**: Work WITH the CLI, not around it.
