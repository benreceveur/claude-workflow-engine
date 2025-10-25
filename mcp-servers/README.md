# Standard MCP Servers

This directory contains standard Model Context Protocol (MCP) servers that can be automatically installed with the Claude Workflow Engine.

## Available MCP Servers

### 1. Filesystem MCP Server
**Purpose:** Secure file system access with configurable allowed directories
**Package:** `@modelcontextprotocol/server-filesystem`
**Tools:**
- `read_file` - Read file contents
- `write_file` - Write to files
- `list_directory` - List directory contents
- `search_files` - Search for files

### 2. Git MCP Server
**Purpose:** Git repository operations
**Package:** `@modelcontextprotocol/server-git`
**Tools:**
- `git_status` - Get repository status
- `git_diff` - View changes
- `git_log` - View commit history
- `git_commit` - Create commits
- `git_branch` - Manage branches

### 3. GitHub MCP Server
**Purpose:** GitHub API integration
**Package:** `@modelcontextprotocol/server-github`
**Tools:**
- `create_issue` - Create GitHub issues
- `create_pr` - Create pull requests
- `search_repositories` - Search for repos
- `get_file_contents` - Read files from repos

### 4. Brave Search MCP Server
**Purpose:** Web search integration
**Package:** `@modelcontextprotocol/server-brave-search`
**Tools:**
- `brave_web_search` - Search the web
- `brave_local_search` - Search local businesses

### 5. PostgreSQL MCP Server
**Purpose:** Database operations
**Package:** `@modelcontextprotocol/server-postgres`
**Tools:**
- `query` - Execute SQL queries
- `list_tables` - List database tables
- `describe_table` - Get table schema

### 6. Memory MCP Server
**Purpose:** Persistent key-value storage
**Package:** `@modelcontextprotocol/server-memory`
**Tools:**
- `store_memory` - Save data
- `retrieve_memory` - Load data
- `search_memory` - Search stored data

## Installation

MCP servers are installed automatically during workflow engine setup if Node.js is available.

### Manual Installation

```bash
# Install all standard MCP servers
npm install -g @modelcontextprotocol/server-filesystem
npm install -g @modelcontextprotocol/server-git
npm install -g @modelcontextprotocol/server-github
npm install -g @modelcontextprotocol/server-brave-search
npm install -g @modelcontextprotocol/server-postgres
npm install -g @modelcontextprotocol/server-memory
```

### Selective Installation

```bash
# Install only specific servers
./scripts/install-mcp-servers.sh --servers filesystem,git,github
```

## Configuration

MCP servers are configured in `~/.workflow-engine/mcp-config.json`:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/allowed/path"],
      "enabled": true
    },
    "git": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-git"],
      "enabled": true
    }
  }
}
```

## Security Considerations

### Filesystem Server
- **IMPORTANT:** Configure allowed directories carefully
- Default: Only allows access to current working directory
- Production: Restrict to specific project directories

### GitHub Server
- Requires GitHub personal access token
- Set via environment variable: `GITHUB_TOKEN`
- Scope: Limit to minimum required permissions

### PostgreSQL Server
- Requires database credentials
- Use read-only credentials for safety
- Never expose in version control

## Usage with Workflow Engine

MCP servers are automatically detected and made available to:
1. **Skills** - Can invoke MCP tools directly
2. **Agents** - Have access to all configured MCP servers
3. **Auto-behavior system** - Routes to appropriate MCP tools

Example usage:
```javascript
// In a skill
const result = await mcp.call('filesystem', 'read_file', {
  path: '/path/to/file'
});

// Auto-detected by agent dispatcher
"Search GitHub for React components" → Uses github MCP server
```

## Troubleshooting

### MCP Server Not Found
```bash
# Check if server is installed
npm list -g @modelcontextprotocol/server-filesystem

# Reinstall if needed
npm install -g @modelcontextprotocol/server-filesystem
```

### Permission Errors (Filesystem)
Update allowed directories in `~/.workflow-engine/mcp-config.json`

### Authentication Errors (GitHub, PostgreSQL)
Set required environment variables:
```bash
export GITHUB_TOKEN="your_token_here"
export DATABASE_URL="postgresql://user:pass@host:5432/db"
```

## Extending with Custom MCP Servers

Create custom MCP servers using the `mcp-builder` skill:
```bash
# Use the mcp-builder skill
"Create an MCP server for Slack integration"
```

Or manually:
1. Create server using MCP SDK
2. Add configuration to `mcp-config.json`
3. Restart workflow engine

## Resources

- MCP Documentation: https://modelcontextprotocol.io
- MCP Server SDK: https://github.com/modelcontextprotocol/servers
- MCP Builder Skill: `~/.workflow-engine/skills/mcp-builder/`
