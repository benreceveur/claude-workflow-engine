#!/bin/bash

# Memory context loader (compact)
# Emits a trimmed summary tailored to the caller input

WORKFLOW_ENGINE_HOME="${WORKFLOW_ENGINE_HOME:-$HOME/.workflow-engine}"
if [ ! -d "$WORKFLOW_ENGINE_HOME" ] && [ -d "$HOME/.claude" ]; then
    WORKFLOW_ENGINE_HOME="$HOME/.claude"
fi

MEMORY_DIR="$WORKFLOW_ENGINE_HOME/memory"
MATCH_LIMIT="${MEMORY_SUMMARY_MATCHES:-6}"
ENTRY_LIMIT="${MEMORY_SUMMARY_ENTRIES:-2}"
SECTION_LIMIT="${MEMORY_SUMMARY_SECTIONS:-3}"

mkdir -p "$MEMORY_DIR"

USER_QUERY="$1"
PERFORMANCE_START=$(date +%s)

generate_summary() {
    local summary_cmd=(
        node
        "$MEMORY_DIR/enhanced-memory-manager.js"
        summary
        --max-entries "$ENTRY_LIMIT"
        --max-sections "$SECTION_LIMIT"
    )

    if [ -n "$USER_QUERY" ]; then
        summary_cmd+=(--query "$USER_QUERY" --max-matches "$MATCH_LIMIT")
    fi

    "${summary_cmd[@]}" 2>/dev/null
}

summary_output=$(generate_summary)

echo "# MEMORY CONTEXT SNAPSHOT"
echo "# Generated at $(date)"
if [ -n "$USER_QUERY" ]; then
    echo "# Query focus: $USER_QUERY"
fi
echo ""

if [ -n "$summary_output" ]; then
    echo "$summary_output"
else
    echo "Memory summary unavailable."
fi

PERFORMANCE_END=$(date +%s)
LOAD_TIME=$((PERFORMANCE_END - PERFORMANCE_START))

echo ""
echo "---"
echo "*Context generated in ${LOAD_TIME}s · Matches: ${MATCH_LIMIT} · Entries/section: ${ENTRY_LIMIT}*"
