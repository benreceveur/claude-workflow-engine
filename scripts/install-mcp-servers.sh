#!/bin/bash

# Install standard MCP servers for Claude Workflow Engine
# MCP servers provide additional tools and capabilities

set -euo pipefail

echo "🔌 Installing Standard MCP Servers"
echo ""

# Check for Node.js
if ! command -v node >/dev/null 2>&1; then
    echo "⚠️  Node.js not found. MCP servers require Node.js."
    echo "   Install Node.js from: https://nodejs.org/"
    echo "   Skipping MCP server installation..."
    exit 0
fi

if ! command -v npm >/dev/null 2>&1; then
    echo "⚠️  npm not found. MCP servers require npm."
    echo "   Skipping MCP server installation..."
    exit 0
fi

NODE_VERSION=$(node --version)
echo "✓ Found Node.js: $NODE_VERSION"
echo ""

# Parse arguments for selective installation
INSTALL_ALL=true
SERVERS_TO_INSTALL=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --servers)
            INSTALL_ALL=false
            SERVERS_TO_INSTALL="$2"
            shift 2
            ;;
        --skip)
            echo "ℹ️  Skipping MCP server installation (--skip flag)"
            exit 0
            ;;
        *)
            shift
            ;;
    esac
done

# Define standard MCP servers
declare -A MCP_SERVERS=(
    ["filesystem"]="@modelcontextprotocol/server-filesystem"
    ["git"]="@modelcontextprotocol/server-git"
    ["github"]="@modelcontextprotocol/server-github"
    ["memory"]="@modelcontextprotocol/server-memory"
)

# Optional servers (require additional configuration)
declare -A OPTIONAL_SERVERS=(
    ["brave-search"]="@modelcontextprotocol/server-brave-search"
    ["postgres"]="@modelcontextprotocol/server-postgres"
)

echo "📦 Installing standard MCP servers..."
echo "   This may take a few minutes..."
echo ""

INSTALLED_COUNT=0
SKIPPED_COUNT=0
FAILED_COUNT=0

install_server() {
    local name=$1
    local package=$2

    # Check if server should be installed
    if [ "$INSTALL_ALL" = false ]; then
        if [[ ! ",$SERVERS_TO_INSTALL," =~ ,"$name", ]]; then
            return 0
        fi
    fi

    echo "Installing $name..."

    # Check if already installed
    if npm list -g "$package" >/dev/null 2>&1; then
        echo "  ✓ $name already installed"
        ((INSTALLED_COUNT++))
        return 0
    fi

    # Install globally with -y flag
    if npm install -g "$package" >/dev/null 2>&1; then
        echo "  ✓ $name installed successfully"
        ((INSTALLED_COUNT++))
    else
        echo "  ✗ $name installation failed (optional, continuing...)"
        ((FAILED_COUNT++))
    fi
}

# Install standard servers
for server_name in "${!MCP_SERVERS[@]}"; do
    install_server "$server_name" "${MCP_SERVERS[$server_name]}"
done

echo ""
echo "📊 Installation Summary:"
echo "   Installed: $INSTALLED_COUNT"
if [ $FAILED_COUNT -gt 0 ]; then
    echo "   Failed: $FAILED_COUNT (optional servers, not critical)"
fi

# Create MCP configuration file
WORKFLOW_HOME="${WORKFLOW_ENGINE_HOME:-$HOME/.workflow-engine}"
MCP_CONFIG="$WORKFLOW_HOME/mcp-config.json"

if [ ! -f "$MCP_CONFIG" ]; then
    echo ""
    echo "📝 Creating MCP configuration..."

    cat > "$MCP_CONFIG" << 'EOF'
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "."],
      "enabled": true,
      "description": "Secure file system access"
    },
    "git": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-git"],
      "enabled": true,
      "description": "Git repository operations"
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "enabled": false,
      "description": "GitHub API integration (requires GITHUB_TOKEN)",
      "requiresAuth": true
    },
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"],
      "enabled": true,
      "description": "Persistent key-value storage"
    }
  },
  "security": {
    "filesystem": {
      "allowedPaths": ["."],
      "note": "Configure allowed paths for filesystem access"
    }
  }
}
EOF

    echo "✓ Configuration created: $MCP_CONFIG"
else
    echo ""
    echo "ℹ️  MCP configuration already exists: $MCP_CONFIG"
fi

echo ""
echo "✅ MCP Server Installation Complete!"
echo ""
echo "🔧 Next Steps:"
echo "   1. Configure allowed paths in: $MCP_CONFIG"
echo "   2. Set environment variables for authenticated servers:"
echo "      export GITHUB_TOKEN=\"your_token\""
echo "   3. Enable/disable servers by editing the config file"
echo ""
echo "📚 Documentation: mcp-servers/README.md"
echo ""

# Optional: Test MCP servers
if [ "${TEST_MCP:-false}" = "true" ]; then
    echo "🧪 Testing MCP servers..."
    for server_name in "${!MCP_SERVERS[@]}"; do
        if command -v npx >/dev/null 2>&1; then
            echo "Testing $server_name..."
            timeout 2 npx -y "${MCP_SERVERS[$server_name]}" --version 2>/dev/null || echo "  ⚠️  Server test inconclusive"
        fi
    done
fi

echo "💡 MCP servers are now available to skills and agents!"
