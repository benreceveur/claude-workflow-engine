#!/bin/bash

# Claude Workflow Engine - Installation Script
# Installs the workflow engine to ~/.claude/

set -e

echo "🚀 Installing Claude Workflow Engine..."
echo ""

# Determine installation directory
CLAUDE_DIR="${CLAUDE_DIR:-$HOME/.claude}"
MEMORY_DIR="$CLAUDE_DIR/memory"
SKILLS_DIR="$CLAUDE_DIR/skills"

# Create directories
echo "📁 Creating directories..."
mkdir -p "$MEMORY_DIR"
mkdir -p "$SKILLS_DIR"

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REPO_DIR="$(dirname "$SCRIPT_DIR")"

# Copy core system files
echo "📦 Installing core system..."
cp "$REPO_DIR/src/"*.js "$MEMORY_DIR/" 2>/dev/null || true
cp "$REPO_DIR/src/"*.sh "$MEMORY_DIR/" 2>/dev/null || true
chmod +x "$MEMORY_DIR/"*.sh 2>/dev/null || true

# Copy Skills
echo "🎯 Installing Skills..."
cp -r "$REPO_DIR/skills/"* "$SKILLS_DIR/" 2>/dev/null || true

# Make Python scripts executable
find "$SKILLS_DIR" -name "*.py" -type f -exec chmod +x {} \; 2>/dev/null || true

# Count installed Skills
SKILL_COUNT=$(ls -1 "$SKILLS_DIR" 2>/dev/null | wc -l | tr -d ' ')

echo ""
echo "✅ Installation complete!"
echo ""
echo "📊 Summary:"
echo "   - Core system: $MEMORY_DIR"
echo "   - Skills installed: $SKILL_COUNT"
echo "   - Skills directory: $SKILLS_DIR"
echo ""
echo "🎯 Quick Start:"
echo "   List Skills:    node $MEMORY_DIR/skill-executor.js list"
echo "   Test Skill:     node $MEMORY_DIR/skill-executor.js execute tech-debt-tracker '{\"operation\":\"scan\",\"project_dir\":\".\"}'"
echo ""
echo "📖 Documentation: https://github.com/benreceveur/claude-workflow-engine"
echo ""
echo "🌟 Give us a star: https://github.com/benreceveur/claude-workflow-engine"
echo ""
