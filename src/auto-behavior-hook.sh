#!/bin/bash

# Auto Behavior Hook
# Automatically integrates behavior enforcement into Claude sessions
# This script is sourced to provide seamless automation

# Configuration
WORKFLOW_ENGINE_HOME="${WORKFLOW_ENGINE_HOME:-$HOME/.workflow-engine}"
if [ ! -d "$WORKFLOW_ENGINE_HOME" ] && [ -d "$HOME/.claude" ]; then
    WORKFLOW_ENGINE_HOME="$HOME/.claude"
fi

AUTO_BEHAVIOR_DIR="$WORKFLOW_ENGINE_HOME/memory"
mkdir -p "$AUTO_BEHAVIOR_DIR"
AUTO_BEHAVIOR_SYSTEM="$AUTO_BEHAVIOR_DIR/auto-behavior-system.js"
TEMP_DIR="/tmp/claude-auto-behavior"
SESSION_ID="claude-session-$(date +%s)"
AUTO_BEHAVIOR_TARGETS="${AUTO_BEHAVIOR_TARGETS:-claude codex chatgpt}"

# Ensure temp directory exists
mkdir -p "$TEMP_DIR"

# Function to process user input automatically
auto_process_input() {
    local user_input="$1"
    
    # Ensure TEMP_DIR is set
    TEMP_DIR="${TEMP_DIR:-/tmp/claude-auto-behavior}"
    mkdir -p "$TEMP_DIR"
    
    local output_file="$TEMP_DIR/processed-input.txt"
    
    if [ -f "$AUTO_BEHAVIOR_SYSTEM" ]; then
        # Process through auto behavior system
        node "$AUTO_BEHAVIOR_SYSTEM" prompt "$user_input" > "$output_file" 2>/dev/null
        
        if [ $? -eq 0 ] && [ -s "$output_file" ]; then
            echo "# AUTOMATIC BEHAVIOR SYSTEM OUTPUT"
            echo "# Generated at $(date)"
            echo ""
            cat "$output_file"
            echo ""
            echo "# Original Input: $user_input"
        else
            echo "# Auto behavior system unavailable, proceeding normally"
        fi
    fi
}

# Function to show system banner
show_auto_behavior_banner() {
    if [ -f "$AUTO_BEHAVIOR_SYSTEM" ]; then
        node "$AUTO_BEHAVIOR_SYSTEM" banner 2>/dev/null
    fi
}

# Function to validate if we're in a directory where auto behavior should run
should_auto_activate() {
    # Check if we're in a git repository or have relevant files
    if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        return 0  # In git repo, activate
    fi
    
    # Check for common development files
    local dev_indicators=(
        "package.json"
        "requirements.txt" 
        "Cargo.toml"
        "go.mod"
        "pom.xml"
        "build.gradle"
        "Dockerfile"
        "docker-compose.yml"
        ".eslintrc"
        "tsconfig.json"
    )
    
    for indicator in "${dev_indicators[@]}"; do
        if [ -f "$indicator" ]; then
            return 0  # Found dev file, activate
        fi
    done
    
    return 1  # No indicators found
}

# Function to check if input suggests agent usage
suggests_agent_usage() {
    local input="$1"
    local input_lower=$(echo "$input" | tr '[:upper:]' '[:lower:]')
    
    # Agent trigger patterns
    local patterns=(
        "create.*component"
        "build.*api"
        "setup.*test"
        "deploy.*docker"
        "fix.*bug"
        "optimize.*performance" 
        "implement.*feature"
        "configure.*eslint"
        "write.*test"
        "design.*database"
    )
    
    for pattern in "${patterns[@]}"; do
        if echo "$input_lower" | grep -E "$pattern" >/dev/null 2>&1; then
            return 0
        fi
    done
    
    return 1
}

# Function to auto-suggest agents based on context
auto_suggest_agents() {
    if [ -f "$AUTO_BEHAVIOR_DIR/proactive-agent-suggester.js" ]; then
        local suggestions=$(node "$AUTO_BEHAVIOR_DIR/proactive-agent-suggester.js" periodic 2>/dev/null)
        
        if [ "$suggestions" != "null" ] && [ "$suggestions" != "No periodic suggestions available." ]; then
            echo "💡 PROACTIVE AGENT SUGGESTIONS:"
            echo "$suggestions" | jq -r '.message' 2>/dev/null || echo "$suggestions"
            echo ""
        fi
    fi
}

# Function to create pre-prompt that enforces behavior
create_behavior_prompt() {
    local user_input="$1"
    
    # Ensure TEMP_DIR is set
    TEMP_DIR="${TEMP_DIR:-/tmp/claude-auto-behavior}"
    mkdir -p "$TEMP_DIR"
    
    local pre_prompt_file="$TEMP_DIR/behavior-prompt.txt"
    
    # Always show memory context
    echo "# AUTOMATIC MEMORY & BEHAVIOR CONTEXT" > "$pre_prompt_file"
    echo "# This context is automatically loaded for every interaction" >> "$pre_prompt_file"
    echo "" >> "$pre_prompt_file"
    
    # Load memory context
    if [ -f "$AUTO_BEHAVIOR_DIR/memory-loader.sh" ]; then
        bash "$AUTO_BEHAVIOR_DIR/memory-loader.sh" "$user_input" >> "$pre_prompt_file" 2>/dev/null
        echo "" >> "$pre_prompt_file"
    fi
    
    # Process through behavior system if input provided
    if [ -n "$user_input" ] && [ -f "$AUTO_BEHAVIOR_SYSTEM" ]; then
        echo "# AUTOMATIC BEHAVIOR ENFORCEMENT" >> "$pre_prompt_file"
        node "$AUTO_BEHAVIOR_SYSTEM" prompt "$user_input" >> "$pre_prompt_file" 2>/dev/null
        echo "" >> "$pre_prompt_file"
    fi
    
    # Add periodic suggestions
    auto_suggest_agents >> "$pre_prompt_file"
    
    echo "# BEHAVIOR ENFORCEMENT ACTIVE" >> "$pre_prompt_file"
    echo "# - Memory context is automatically loaded" >> "$pre_prompt_file"
    echo "# - Agent usage is required for specialized tasks" >> "$pre_prompt_file"
    echo "# - Repository patterns are automatically applied" >> "$pre_prompt_file"
    echo "# - All file paths must be absolute" >> "$pre_prompt_file"
    echo "" >> "$pre_prompt_file"
    
    cat "$pre_prompt_file"
}

# Function to intercept and process Claude commands
claude_with_auto_behavior() {
    local user_input="$*"
    
    # Ensure TEMP_DIR is set
    TEMP_DIR="${TEMP_DIR:-/tmp/claude-auto-behavior}"
    mkdir -p "$TEMP_DIR"
    
    # Show banner on first use
    if [ ! -f "$TEMP_DIR/banner-shown" ]; then
        show_auto_behavior_banner
        touch "$TEMP_DIR/banner-shown"
    fi
    
    # Check if we should activate auto behavior
    if should_auto_activate; then
        echo "🤖 Auto Behavior System Active - Processing input..."
        
        # Create behavior enforcement prompt
        create_behavior_prompt "$user_input"
        
        # Log the interaction
        if [ -f "$AUTO_BEHAVIOR_DIR/auto-behavior-system.js" ]; then
            echo "$(date): $user_input" >> "$AUTO_BEHAVIOR_DIR/auto-behavior-usage.log"
        fi
    else
        echo "ℹ️  Auto behavior available - activate with 'auto-behavior enable'"
    fi
}

# Function to enable auto behavior for current session
enable_auto_behavior() {
    echo "🤖 Enabling Auto Behavior System..."
    
    # Create aliases for configured targets if not present
    for target in $AUTO_BEHAVIOR_TARGETS; do
        if ! alias "$target" >/dev/null 2>&1; then
            alias "$target"='claude_with_auto_behavior'
        fi
    done
    
    # Show system status
    if [ -f "$AUTO_BEHAVIOR_SYSTEM" ]; then
        node "$AUTO_BEHAVIOR_SYSTEM" status | jq -r '.config | "Auto Dispatch: \(.enableAutoDispatch), Memory Integration: \(.enableMemoryIntegration), Proactive Suggestions: \(.enableProactiveSuggestions)"'
    fi
    
    echo "✅ Auto Behavior System enabled for this session"
}

# Function to disable auto behavior
disable_auto_behavior() {
    # Ensure TEMP_DIR is set
    TEMP_DIR="${TEMP_DIR:-/tmp/claude-auto-behavior}"
    
    for target in $AUTO_BEHAVIOR_TARGETS; do
        unalias "$target" 2>/dev/null
    done
    rm -f "$TEMP_DIR/banner-shown"
    echo "❌ Auto Behavior System disabled"
}

# Function to configure auto behavior
configure_auto_behavior() {
    local setting="$1"
    local value="$2"
    
    if [ -z "$setting" ]; then
        echo "Usage: configure_auto_behavior <setting> <value>"
        echo "Settings: enableAutoDispatch, enableMemoryIntegration, enableProactiveSuggestions"
        echo "Values: true, false"
        return 1
    fi
    
    if [ -f "$AUTO_BEHAVIOR_SYSTEM" ]; then
        local update_json="{\"$setting\": $value}"
        node "$AUTO_BEHAVIOR_SYSTEM" config update "$update_json"
        echo "✅ Configuration updated: $setting = $value"
    fi
}

# Function to show session management status
session_status() {
    if [ -f "$AUTO_BEHAVIOR_DIR/session-cli.js" ]; then
        node "$AUTO_BEHAVIOR_DIR/session-cli.js" status
    else
        echo "Session management not available"
    fi
}

# Function to manage sessions
session_manage() {
    local command="$1"
    shift

    if [ ! -f "$AUTO_BEHAVIOR_DIR/session-cli.js" ]; then
        echo "❌ Session management not available"
        return 1
    fi

    case "$command" in
        status|list|current|recover|cleanup)
            node "$AUTO_BEHAVIOR_DIR/session-cli.js" "$command" "$@"
            ;;
        enable)
            node "$AUTO_BEHAVIOR_DIR/session-cli.js" enable
            echo "🔄 Restart Claude Code to activate session management"
            ;;
        disable)
            node "$AUTO_BEHAVIOR_DIR/session-cli.js" disable
            echo "🔄 Restart Claude Code to deactivate session management"
            ;;
        search)
            if [ $# -lt 2 ]; then
                echo "Usage: session search <sessionId> <query> [limit]"
                return 1
            fi
            node "$AUTO_BEHAVIOR_DIR/session-cli.js" search "$@"
            ;;
        export)
            if [ $# -lt 1 ]; then
                echo "Usage: session export <sessionId> [outputFile]"
                return 1
            fi
            node "$AUTO_BEHAVIOR_DIR/session-cli.js" export "$@"
            ;;
        help|--help|-h)
            node "$AUTO_BEHAVIOR_DIR/session-cli.js" help
            ;;
        *)
            echo "Unknown session command: $command"
            echo "Use 'session help' for available commands"
            ;;
    esac
}

# Function to show auto behavior help
auto_behavior_help() {
    cat << 'EOF'
🤖 AUTO BEHAVIOR SYSTEM COMMANDS

Usage:
  auto-behavior <command> [options]

Commands:
  enable                    Enable auto behavior for current session
  disable                   Disable auto behavior
  status                    Show system status
  config <setting> <value>  Update configuration
  banner                    Show startup banner
  test "input"             Test processing with sample input
  help                      Show this help

Session Management Commands:
  session <command>         Manage sessions (status|list|current|enable|disable|recover|cleanup|search|export)

Examples:
  auto-behavior enable
  auto-behavior config enableStrictMode true
  auto-behavior test "Create a React component"
  auto-behavior session status
  auto-behavior session recover

The system automatically:
- Loads memory context for every interaction
- Detects and suggests appropriate agents
- Enforces consistent behavior patterns
- Applies repository-specific preferences
- Manages session lifecycle with crash recovery

Agent usage and memory integration become automatic and mandatory.
EOF
}

# Main auto-behavior command
auto-behavior() {
    local command="$1"
    shift

    case "$command" in
        enable)
            enable_auto_behavior
            ;;
        disable)
            disable_auto_behavior
            ;;
        status)
            if [ -f "$AUTO_BEHAVIOR_SYSTEM" ]; then
                node "$AUTO_BEHAVIOR_SYSTEM" status
            fi
            # Also show session status if available
            echo ""
            session_status
            ;;
        config)
            configure_auto_behavior "$1" "$2"
            ;;
        banner)
            show_auto_behavior_banner
            ;;
        test)
            local test_input="$*"
            if [ -n "$test_input" ]; then
                create_behavior_prompt "$test_input"
            else
                echo "Usage: auto-behavior test \"your input here\""
            fi
            ;;
        session)
            session_manage "$@"
            ;;
        help|--help|-h)
            auto_behavior_help
            ;;
        "")
            echo "Auto Behavior System available. Use 'auto-behavior help' for commands."
            ;;
        *)
            echo "Unknown command: $command"
            echo "Use 'auto-behavior help' for available commands."
            ;;
    esac
}

# Add session command as standalone alias
session() {
    session_manage "$@"
}

# Auto-enable if in development context
if should_auto_activate && [ "${AUTO_BEHAVIOR_AUTO_ENABLE:-true}" = "true" ]; then
    enable_auto_behavior
fi

# Export functions for use in shell
export -f auto_process_input
export -f claude_with_auto_behavior
export -f create_behavior_prompt
export -f auto_suggest_agents

echo "🤖 Auto Behavior Hook loaded. Use 'auto-behavior help' for commands."
