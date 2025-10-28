# SDK Integration Note

**Date**: October 28, 2025

## Context

During development, we explored integrating the Anthropic SDK (`@anthropic-ai/sdk`) for direct API access.

## Decision: CLI-Based Architecture

**We chose to use Claude CLI (not API keys)** because:

1. **Already Authenticated**: Claude Code CLI is already set up
2. **Shell Integration**: Workflow engine operates as shell hooks
3. **CLI Features**: `--agents`, `--system-prompt`, `--mcp-config` provide needed capabilities
4. **Simpler Architecture**: Work WITH the CLI, not around it

## Files in This Repository

### Strategy Documents
- `CLI_INTEGRATION_STRATEGY.md` - **Current approach** (CLI-based)
- `CLAUDE_SDK_RESEARCH_REPORT.md` - Research reference (educational)

### Implementation
- `scripts/generate-cli-agents.js` - Generate CLI-compatible agents.json
- `agents.json` - Generated agent definitions for `--agents` flag

### Reference Only (Not Used)
The following were created during API exploration but are NOT part of the current implementation:
- `integrations/claude-sdk/` directory (in ~/.workflow-engine)
  - `anthropic-client.js`
  - `rate-limiter.js`
  - `error-handler.js`
  - `token-manager.js`

These files remain for future reference if we ever need direct API integration.

## Current Architecture

```
User Input
    ↓
Shell Hook (auto-behavior-hook.sh)
    ↓
Routing System (93.8% accurate)
    ├─→ Skill Detection
    └─→ Agent Detection
    ↓
Claude CLI with Flags
    --agents agents.json
    --system-prompt "context"
    --model "sonnet"
    ↓
Response
```

## Benefits of CLI Approach

1. **No API Key Management**: Already authenticated
2. **Simpler Code**: Use CLI flags, not SDK
3. **Better Integration**: Shell hooks work naturally
4. **Cost Efficient**: Model selection, context reuse
5. **Feature Rich**: MCP servers, session management

## Next Steps

See `CLI_INTEGRATION_STRATEGY.md` for implementation roadmap:
- Phase 1: Agent JSON generation ✅ DONE
- Phase 2: Shell hook enhancement (in progress)
- Phase 3: Skill context injection
- Phase 4: MCP server integration
- Phase 5: Session & model management
- Phase 6: Batch processing

---

**TL;DR**: We use Claude CLI with intelligent routing, not direct API access.
