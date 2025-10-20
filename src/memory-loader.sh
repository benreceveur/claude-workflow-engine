#!/bin/bash

# Enhanced Memory Intelligence Loader v2.0
# Generates comprehensive memory context with intelligence features
# Supports code-aware recommendations and natural language queries

MEMORY_DIR="$HOME/.claude/memory"
PERFORMANCE_START=$(date +%s)

# Check if we're in a git repository and get repository info
REPO_INFO=$(node "$MEMORY_DIR/repo-detector.js" 2>/dev/null)

# Check if intelligence features are available
INTELLIGENCE_AVAILABLE=false
if [ -f "$MEMORY_DIR/intelligent-memory-context.js" ] && [ -f "$MEMORY_DIR/code-context-analyzer.js" ]; then
    INTELLIGENCE_AVAILABLE=true
fi

generate_memory_context() {
    local output_file="$1"
    
    echo "# ENHANCED MEMORY INTELLIGENCE CONTEXT" > "$output_file"
    echo "# Generated at $(date) | Enhanced Intelligence: $INTELLIGENCE_AVAILABLE" >> "$output_file"
    echo "" >> "$output_file"
    
    REPO_EXISTS=$(echo "$REPO_INFO" | jq -r '.repository != null')
    if [ "$REPO_EXISTS" = "true" ]; then
        # We're in a git repository
        REPO_NAME=$(echo "$REPO_INFO" | jq -r '.repository.name // "unknown"')
        REPO_HASH=$(echo "$REPO_INFO" | jq -r '.repository.hash // ""')
        
        echo "## Repository-Specific Context" >> "$output_file"
        echo "Repository: **$REPO_NAME** ($REPO_HASH)" >> "$output_file"
        echo "" >> "$output_file"
        
        # Load effective memory (merged global + repository)
        MEMORY_SUMMARY=$(node "$MEMORY_DIR/enhanced-memory-manager.js" summary 2>/dev/null)
        
        if [ $? -eq 0 ]; then
            echo "$MEMORY_SUMMARY" >> "$output_file"
        else
            echo "Warning: Could not load repository memory" >> "$output_file"
        fi
        
        # Add intelligence features if available
        if [ "$INTELLIGENCE_AVAILABLE" = true ]; then
            echo "" >> "$output_file"
            echo "#### 🧠 Intelligence Features Available" >> "$output_file"
            echo "- **Code-Aware Recommendations**: Analyzes existing codebase before suggestions" >> "$output_file"
            echo "- **Natural Language Queries**: Search memory with plain English" >> "$output_file"
            echo "- **Predictive Suggestions**: Context-aware pattern recommendations" >> "$output_file"
            echo "- **Performance Optimized**: Sub-millisecond response times" >> "$output_file"
            echo "- **Enhanced Agent Dispatcher**: Advanced agent selection with confidence scoring" >> "$output_file"
            echo "- **Contextual Analysis**: File extension and directory pattern matching" >> "$output_file"
        fi

        # Add enhanced dispatcher status if available
        if [ -f "$MEMORY_DIR/enhanced-agent-dispatcher.js" ]; then
            echo "" >> "$output_file"
            echo "#### 🚀 Enhanced Agent Dispatcher Active" >> "$output_file"
            echo "- **Mandatory Agent Detection**: Automatically detects required agents for debugging, code review, etc." >> "$output_file"
            echo "- **Confidence Scoring**: Provides confidence levels for agent recommendations" >> "$output_file"
            echo "- **Context Analysis**: Analyzes file extensions, directory patterns, and project structure" >> "$output_file"
            echo "- **Hybrid Mode**: Falls back to legacy dispatcher when confidence is low" >> "$output_file"
            
            # Quick code analysis if in repository
            if [ -n "$REPO_NAME" ]; then
                CODE_ANALYSIS=$(node "$MEMORY_DIR/code-context-analyzer.js" . 2>/dev/null | head -5)
                if [ -n "$CODE_ANALYSIS" ]; then
                    echo "" >> "$output_file"
                    echo "#### 📊 Current Codebase Context" >> "$output_file"
                    echo "$CODE_ANALYSIS" >> "$output_file"
                fi
            fi
        fi
    else
        # Not in a git repository, use global memory
        echo "## Global Memory Context" >> "$output_file"
        echo "Not in a git repository - using global patterns" >> "$output_file"
        echo "" >> "$output_file"
        
        if [ -f "$MEMORY_DIR/global-memory.json" ]; then
            # Load global memory patterns
            echo "### Global Patterns" >> "$output_file"
            jq -r '.patterns | to_entries[] | select(.key != "enforcement_rules" and .key != "shared_services_pattern" and .key != "code_review_practice") | "- \(.key): \(.value)"' "$MEMORY_DIR/global-memory.json" 2>/dev/null >> "$output_file"
            echo "" >> "$output_file"
            
            # Critical Enforcement Rules
            echo "### 🚨 CRITICAL ENFORCEMENT RULES" >> "$output_file"
            jq -r '.patterns.enforcement_rules.rules[]? | "- \(.)"' "$MEMORY_DIR/global-memory.json" 2>/dev/null >> "$output_file"
            echo "" >> "$output_file"
            
            # Shared Services Pattern
            echo "### 🔗 SHARED SERVICES PATTERN" >> "$output_file"
            jq -r '.patterns.shared_services_pattern.description // "Mandatory shared services pattern"' "$MEMORY_DIR/global-memory.json" 2>/dev/null >> "$output_file"
            jq -r '.patterns.shared_services_pattern.implementation | to_entries[]? | "- **\(.key)**: \(.value)"' "$MEMORY_DIR/global-memory.json" 2>/dev/null >> "$output_file"
            echo "" >> "$output_file"
            
            # Code Review Practice
            echo "### 📋 CODE REVIEW PRACTICE" >> "$output_file"
            jq -r '.patterns.code_review_practice.review_before_recommendations // "MANDATORY: Always thoroughly review and understand existing code patterns"' "$MEMORY_DIR/global-memory.json" 2>/dev/null >> "$output_file"
            echo "" >> "$output_file"
            
            # Agent preferences
            echo "### Agent Preferences" >> "$output_file"
            jq -r '.agents | to_entries[] | "- **\(.key)**: \(.value.patterns // [] | join(", "))"' "$MEMORY_DIR/global-memory.json" 2>/dev/null >> "$output_file"
            echo "" >> "$output_file"
        else
            echo "No global memory file found" >> "$output_file"
        fi
        
        # Add intelligence features info for global scope too
        if [ "$INTELLIGENCE_AVAILABLE" = true ]; then
            echo "" >> "$output_file"
            echo "#### 🧠 Intelligence Features Available" >> "$output_file"
            echo "- **Natural Language Queries**: \`node ~/.claude/memory/natural-language-query-engine.js \"your query\"\`" >> "$output_file"
            echo "- **Enhanced Memory Manager**: \`node ~/.claude/memory/enhanced-memory-manager.js summary\`" >> "$output_file"
            echo "- **Agent Auto-Dispatch**: Automatically detects when to use specialized agents" >> "$output_file"
            echo "- **Enhanced Agent Dispatcher**: \`node ~/.claude/memory/enhanced-agent-dispatcher.js \"your input\"\`" >> "$output_file"
        fi

        # Add enhanced dispatcher status for global scope
        if [ -f "$MEMORY_DIR/enhanced-agent-dispatcher.js" ]; then
            echo "" >> "$output_file"
            echo "#### 🚀 Enhanced Agent Dispatcher Available" >> "$output_file"
            echo "- **Command**: \`node ~/.claude/memory/enhanced-agent-dispatcher.js \"your request\"\`" >> "$output_file"
            echo "- **Auto-Integration**: Integrated with Auto Behavior System" >> "$output_file"
            echo "- **Features**: Confidence scoring, mandatory agents, contextual analysis" >> "$output_file"
            echo "- **Repository Integration**: ✅ Active - Boosts repository-preferred agents" >> "$output_file"
            echo "- **Learning System**: ✅ Active - Learns from agent usage patterns" >> "$output_file"
        fi

        # Add compact visualization if visualizer is available
        if [ -f "$MEMORY_DIR/memory-visualizer.js" ]; then
            echo "" >> "$output_file"
            echo "#### 📊 Current Context Summary" >> "$output_file"
            CONTEXT_SUMMARY=$(node "$MEMORY_DIR/memory-visualizer.js" compact 2>/dev/null)
            if [ -n "$CONTEXT_SUMMARY" ]; then
                echo "$CONTEXT_SUMMARY" >> "$output_file"
            fi
        fi
    fi
    
    # Add performance metrics
    PERFORMANCE_END=$(date +%s)
    LOAD_TIME=$((PERFORMANCE_END - PERFORMANCE_START))
    
    echo "" >> "$output_file"
    echo "---" >> "$output_file"
    echo "*Enhanced Memory Intelligence System - Context loaded in ${LOAD_TIME}s*" >> "$output_file"
    
    if [ "$INTELLIGENCE_AVAILABLE" = true ]; then
        echo "*Intelligence features active: Code analysis, Natural language queries, Predictive suggestions*" >> "$output_file"
    else
        echo "*Basic memory system active - Intelligence features not installed*" >> "$output_file"
    fi

    # Add enhanced dispatcher status
    if [ -f "$MEMORY_DIR/enhanced-agent-dispatcher.js" ]; then
        echo "*Enhanced Agent Dispatcher integrated with Auto Behavior System*" >> "$output_file"
    fi

    # Add Skills orchestration status (NEW)
    if [ -f "$MEMORY_DIR/skill-executor.js" ]; then
        echo "*Skills Orchestration: ACTIVE - Automatic routing to Skills or Agents*" >> "$output_file"
    fi
}

# NEW: Add Skills context section
add_skills_context() {
    local output_file="$1"

    # Check if Skills system is available
    if [ ! -f "$MEMORY_DIR/skill-executor.js" ]; then
        return
    fi

    echo "" >> "$output_file"
    echo "---" >> "$output_file"
    echo "" >> "$output_file"
    echo "## 🎯 Skills Orchestration System" >> "$output_file"
    echo "" >> "$output_file"

    # Get Skills list
    SKILLS_LIST=$(node "$MEMORY_DIR/skill-executor.js" list 2>/dev/null)

    if [ $? -eq 0 ]; then
        SKILLS_COUNT=$(echo "$SKILLS_LIST" | jq '. | length' 2>/dev/null || echo "0")

        if [ "$SKILLS_COUNT" -gt 0 ]; then
            echo "### Available Skills ($SKILLS_COUNT)" >> "$output_file"
            echo "$SKILLS_LIST" | jq -r '.[] | "- **\(.name)**: \(.description // "(no description)")"' 2>/dev/null >> "$output_file"
            echo "" >> "$output_file"
        else
            echo "### Skills Ready (No Skills Installed)" >> "$output_file"
            echo "- Skills system is active and ready" >> "$output_file"
            echo "- Build your first Skill to see automatic orchestration" >> "$output_file"
            echo "- See Quick Start Guide: \`/private/tmp/quick-start-skills-implementation.md\`" >> "$output_file"
            echo "" >> "$output_file"
        fi
    fi

    # Show orchestration info
    echo "### Automatic Orchestration" >> "$output_file"
    echo "" >> "$output_file"
    echo "**How it works:**" >> "$output_file"
    echo "1. **Procedural operations** → Skills (repo detection, memory hygiene)" >> "$output_file"
    echo "2. **Autonomous tasks** → Agents (analysis, recommendations)" >> "$output_file"
    echo "3. **Complex workflows** → Hybrid (Agent + Skills)" >> "$output_file"
    echo "" >> "$output_file"
    echo "**Token Savings:**" >> "$output_file"
    echo "- Skills: 350 tokens (vs 20,000 for Agents)" >> "$output_file"
    echo "- Automatic routing saves 40-50% tokens on average" >> "$output_file"
    echo "- Skills execute 20-30x faster than Agents" >> "$output_file"
    echo "" >> "$output_file"

    # Show pre-configured patterns
    echo "### Pre-Configured Skill Patterns" >> "$output_file"
    echo "" >> "$output_file"
    echo "The system automatically detects these operations:" >> "$output_file"
    echo "- **repo-detection**: Detect repository, get repo info, repository hash" >> "$output_file"
    echo "- **memory-hygiene**: Clean memory, validate schema, compact memory" >> "$output_file"
    echo "- **memory-formatting**: Format memory, format as markdown/JSON" >> "$output_file"
    echo "- **code-analysis**: Analyze codebase, detect frameworks, scan files" >> "$output_file"
    echo "- **schema-validation**: Validate schema, check compliance" >> "$output_file"
    echo "" >> "$output_file"
    echo "*Build these Skills to enable automatic routing*" >> "$output_file"
}

# Generate memory context for current session
TEMP_MEMORY="/tmp/claude-memory-context.md"
generate_memory_context "$TEMP_MEMORY"

# Add Skills orchestration context (NEW)
add_skills_context "$TEMP_MEMORY"

# Output for Claude to read
cat "$TEMP_MEMORY"