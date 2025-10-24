#!/bin/bash

set -euo pipefail

echo "🚀 Claude Workflow Engine Deployment"
echo ""

WORKFLOW_ENGINE_HOME="${WORKFLOW_ENGINE_HOME:-$HOME/.workflow-engine}"
LEGACY_ROOT="$HOME/.claude"
BACKUP_ROOT="$HOME/.claude-backups"
MEMORY_DIR="$WORKFLOW_ENGINE_HOME/memory"
SKILLS_DIR="$WORKFLOW_ENGINE_HOME/skills"
LOGS_DIR="$WORKFLOW_ENGINE_HOME/logs"

PACKAGE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_DIR="$PACKAGE_ROOT/src"
SKILLS_SRC="$PACKAGE_ROOT/skills"

PYTHON_BIN=""
if command -v python3 >/dev/null 2>&1; then
    PYTHON_BIN="python3"
elif command -v python >/dev/null 2>&1; then
    PYTHON_BIN="python"
fi

if [ ! -d "$SRC_DIR" ] || [ ! -d "$SKILLS_SRC" ]; then
    echo "❌ Unable to locate source directories. Ensure the package contents remain intact."
    exit 1
fi

echo "📁 Preparing directories under $WORKFLOW_ENGINE_HOME"
mkdir -p "$MEMORY_DIR" "$SKILLS_DIR" "$LOGS_DIR"

sync_tree() {
    local source_dir="$1"
    local target_dir="$2"

    if command -v rsync >/dev/null 2>&1; then
        rsync -a --delete "$source_dir/" "$target_dir/"
    else
        rm -rf "$target_dir"
        mkdir -p "$target_dir"
        cp -R "$source_dir/". "$target_dir/"
    fi
}

update_shell_profile() {
    local shell_rc="${SHELL_RC:-$HOME/.zshrc}"
    local created_rc=false

    if [ -z "$shell_rc" ]; then
        shell_rc="$HOME/.zshrc"
    fi

    if [ ! -e "$shell_rc" ]; then
        touch "$shell_rc"
        created_rc=true
    fi

    if [ -z "$PYTHON_BIN" ]; then
        echo "⚠️  Skipping shell profile update (Python interpreter not found)."
        return
    fi

    local block_content
    block_content=$(cat <<'EOF'
# >>> Claude Workflow Engine >>>
export WORKFLOW_ENGINE_HOME="$HOME/.workflow-engine"

if [ -f "$WORKFLOW_ENGINE_HOME/memory/auto-behavior-hook.sh" ]; then
    source "$WORKFLOW_ENGINE_HOME/memory/auto-behavior-hook.sh"
fi
# <<< Claude Workflow Engine <<<
EOF
)

    export BLOCK_CONTENT="$block_content"
    export ENGINE_BLOCK_START="# >>> Claude Workflow Engine >>>"
    export ENGINE_BLOCK_END="# <<< Claude Workflow Engine <<<"

    "$PYTHON_BIN" - "$shell_rc" <<'PY'
import os
import pathlib
import re
import sys

rc_path = pathlib.Path(sys.argv[1])
block = os.environ["BLOCK_CONTENT"].strip()
start = os.environ["ENGINE_BLOCK_START"]
end = os.environ["ENGINE_BLOCK_END"]

existing = rc_path.read_text() if rc_path.exists() else ""
pattern = re.compile(rf"{re.escape(start)}.*?{re.escape(end)}\n?", re.DOTALL)
updated = re.sub(pattern, "", existing).rstrip()

if updated:
    updated += "\n\n"

updated += block + "\n"
rc_path.write_text(updated)
PY

    unset BLOCK_CONTENT ENGINE_BLOCK_START ENGINE_BLOCK_END

    if [ "$created_rc" = true ]; then
        echo "🆕 Created shell profile: $shell_rc"
    fi

    echo "🛠️  Updated shell profile: $shell_rc"
    echo "   • Add/remove the block marked 'Claude Workflow Engine' to adjust loading behavior"
}

echo "📦 Installing core engine files"
sync_tree "$SRC_DIR" "$MEMORY_DIR"

echo "🎯 Installing skills"
sync_tree "$SKILLS_SRC" "$SKILLS_DIR"

if [ -e "$LEGACY_ROOT" ] && [ ! -L "$LEGACY_ROOT" ]; then
    mkdir -p "$BACKUP_ROOT"
    BACKUP_PATH="$BACKUP_ROOT/claude-$(date +%Y%m%d%H%M%S)"
    echo "🧳 Backing up legacy installation to $BACKUP_PATH"
    mv "$LEGACY_ROOT" "$BACKUP_PATH"
fi

if [ -L "$LEGACY_ROOT" ]; then
    rm -f "$LEGACY_ROOT"
elif [ -d "$LEGACY_ROOT" ]; then
    rm -rf "$LEGACY_ROOT"
fi

ln -s "$WORKFLOW_ENGINE_HOME" "$LEGACY_ROOT"
echo "🔄 Legacy path ~/.claude now points to $WORKFLOW_ENGINE_HOME"

echo "🔐 Setting executable permissions"
find "$MEMORY_DIR" -type f -name '*.sh' -exec chmod +x {} +
find "$MEMORY_DIR" -maxdepth 1 -type f -name '*.js' -exec chmod +x {} +

SKILL_COUNT=$(find "$SKILLS_DIR" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')

echo ""
echo "✅ Deployment complete"
echo "   Home directory : $WORKFLOW_ENGINE_HOME"
echo "   Skills installed: $SKILL_COUNT"
echo ""
echo "🧠 Memory loader     : $MEMORY_DIR/memory-loader.sh"
echo "🤖 Auto behavior hook: $MEMORY_DIR/auto-behavior-hook.sh"

update_shell_profile

echo ""
echo "To list skills run : node $MEMORY_DIR/skill-executor.js list"
echo "Reload your shell  : source $HOME/.zshrc"
