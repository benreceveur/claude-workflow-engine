#!/bin/bash

# Auto Behavior Hook V2 - CLI-Enhanced
# Integrates workflow engine routing with Claude CLI --agents flag
# Version: 2.0 (CLI-optimized)

# Configuration
WORKFLOW_ENGINE_HOME="${WORKFLOW_ENGINE_HOME:-$HOME/.workflow-engine}"
if [ ! -d "$WORKFLOW_ENGINE_HOME" ] && [ -d "$HOME/.claude" ]; then
    WORKFLOW_ENGINE_HOME="$HOME/.claude"
fi

AUTO_BEHAVIOR_DIR="$WORKFLOW_ENGINE_HOME/memory"
mkdir -p "$AUTO_BEHAVIOR_DIR"
AUTO_BEHAVIOR_SYSTEM="$AUTO_BEHAVIOR_DIR/auto-behavior-system.js"
AGENTS_JSON="$WORKFLOW_ENGINE_HOME/agents.json"
TEMP_DIR="/tmp/claude-auto-behavior"
SESSION_ID="claude-session-$(date +%s)"

# Ensure temp directory exists
mkdir -p "$TEMP_DIR"

# Function to get routing decision from auto-behavior system
get_routing_decision() {
    local user_input="$1"

    if [ ! -f "$AUTO_BEHAVIOR_SYSTEM" ]; then
        echo "{}"
        return
    fi

    # Get routing decision
    node -e "
const AutoBehaviorSystem = require('$AUTO_BEHAVIOR_SYSTEM');
const system = new AutoBehaviorSystem();

system.processPrompt('$user_input', {}).then(result => {
  const output = {
    mode: result.execution_mode,
    skill: result.skill_recommendation?.skill || null,
    agent: result.agent_recommendation?.recommended_agent || null,
    skillConfidence: result.skill_recommendation?.confidence || 0,
    agentConfidence: result.agent_recommendation?.confidence || 0
  };
  console.log(JSON.stringify(output));
}).catch(() => {
  console.log('{}');
});
    " 2>/dev/null || echo "{}"
}

# Function to build system prompt based on routing
build_system_prompt() {
    local routing="$1"
    local mode=$(echo "$routing" | jq -r '.mode // "direct"')
    local skill=$(echo "$routing" | jq -r '.skill // ""')
    local agent=$(echo "$routing" | jq -r '.agent // ""')
    local skill_conf=$(echo "$routing" | jq -r '.skillConfidence // 0')
    local agent_conf=$(echo "$routing" | jq -r '.agentConfidence // 0')

    local prompt_parts=()

    # Add routing context
    if [ "$mode" = "skill" ] && [ -n "$skill" ]; then
        prompt_parts+=("🎯 Workflow Engine Recommendation: Use '$skill' skill (confidence: $skill_conf)")
        prompt_parts+=("This task is best handled by executing the '$skill' skill from the workflow engine.")
    elif [ "$mode" = "agent" ] && [ -n "$agent" ]; then
        prompt_parts+=("🎯 Workflow Engine Recommendation: Route to '$agent' agent (confidence: $agent_conf)")
        prompt_parts+=("This task requires the specialized expertise of the '$agent' agent.")
    fi

    # Join parts with newlines
    printf "%s\n" "${prompt_parts[@]}"
}

# Enhanced Claude CLI wrapper with agent routing
claude_with_routing() {
    # Parse arguments to separate Claude flags from user input
    local claude_flags=()
    local user_input=""
    local parsing_flags=true

    while [ $# -gt 0 ]; do
        case "$1" in
            --print|--verbose|--debug|--continue|--ide)
                # Boolean flags
                claude_flags+=("$1")
                shift
                ;;
            --model|--output-format|--input-format|--system-prompt|--append-system-prompt|--session-id|--fallback-model)
                # Flags with arguments
                claude_flags+=("$1" "$2")
                shift 2
                ;;
            --*)
                # Other flags - pass through
                claude_flags+=("$1")
                shift
                ;;
            *)
                # First non-flag argument is the user input
                user_input="$*"
                break
                ;;
        esac
    done

    # If no user input, show error
    if [ -z "$user_input" ]; then
        echo "❌ Error: No prompt provided"
        echo "Usage: claude_with_routing [claude-flags] \"your prompt\""
        return 1
    fi

    # Check if agents.json exists
    if [ ! -f "$AGENTS_JSON" ]; then
        echo "⚠️  agents.json not found. Generating..."
        if [ -f "$WORKFLOW_ENGINE_HOME/scripts/generate-cli-agents.js" ]; then
            node "$WORKFLOW_ENGINE_HOME/scripts/generate-cli-agents.js" >/dev/null 2>&1
        fi
    fi

    # Get routing decision
    local routing=$(get_routing_decision "$user_input")

    # Build system prompt
    local system_prompt=$(build_system_prompt "$routing")

    # Build Claude CLI command
    local claude_args=("${claude_flags[@]}")

    # Add agents if available
    if [ -f "$AGENTS_JSON" ]; then
        claude_args+=("--agents" "$(cat "$AGENTS_JSON")")
    fi

    # Add system prompt if we have routing context
    if [ -n "$system_prompt" ]; then
        claude_args+=("--append-system-prompt" "$system_prompt")
    fi

    # Add user input
    claude_args+=("$user_input")

    # Log the interaction
    if [ -f "$AUTO_BEHAVIOR_DIR/auto-behavior-system.js" ]; then
        echo "[$(date)] Mode: $(echo "$routing" | jq -r '.mode'), Input: $user_input" >> "$AUTO_BEHAVIOR_DIR/auto-behavior-usage.log"
    fi

    # Execute Claude CLI with enhancements
    claude "${claude_args[@]}"
}

# Alias for convenience
claude_enhanced() {
    claude_with_routing "$@"
}

# Function to test the enhanced routing
test_routing() {
    local test_prompt="${1:-analyze technical debt in the codebase}"

    echo "🧪 Testing Routing System"
    echo "=========================="
    echo ""
    echo "Prompt: $test_prompt"
    echo ""

    local routing=$(get_routing_decision "$test_prompt")

    echo "Routing Decision:"
    echo "$routing" | jq '.'
    echo ""

    echo "System Prompt:"
    build_system_prompt "$routing"
    echo ""

    echo "Would call Claude with:"
    echo "  --agents: $([ -f "$AGENTS_JSON" ] && echo "✅ Loaded" || echo "❌ Missing")"
    echo "  --append-system-prompt: $([ -n "$(build_system_prompt "$routing")" ] && echo "✅ Context added" || echo "⚠️  No context")"
}

# Function to show routing status
routing_status() {
    echo "🤖 Workflow Engine - CLI Integration Status"
    echo "============================================"
    echo ""
    echo "Configuration:"
    echo "  Workflow Home: $WORKFLOW_ENGINE_HOME"
    echo "  Auto Behavior System: $([ -f "$AUTO_BEHAVIOR_SYSTEM" ] && echo "✅ Available" || echo "❌ Missing")"
    echo "  Agents JSON: $([ -f "$AGENTS_JSON" ] && echo "✅ Available" || echo "❌ Missing")"
    echo ""

    if [ -f "$AGENTS_JSON" ]; then
        local agent_count=$(cat "$AGENTS_JSON" | jq 'keys | length')
        echo "  Available Agents: $agent_count"
        echo ""
        echo "  Agent List:"
        cat "$AGENTS_JSON" | jq -r 'keys[]' | sed 's/^/    - /'
    fi

    echo ""
    echo "Usage:"
    echo "  claude_with_routing \"your prompt\"     - Use routing with Claude"
    echo "  claude_enhanced \"your prompt\"         - Alias for above"
    echo "  test_routing \"prompt\"                 - Test routing decision"
    echo "  routing_status                         - Show this status"
}

# Auto-load message
echo "🤖 Auto Behavior Hook V2 loaded (CLI-enhanced)"
echo "   Use 'routing_status' for info, 'test_routing' to test"

# Export functions
export -f claude_with_routing
export -f claude_enhanced
export -f test_routing
export -f routing_status
export -f get_routing_decision
export -f build_system_prompt
