#!/bin/bash

# Script to configure GitHub Copilot (VS Code) to use GATI MCP Server
set -e

echo "🚀 Configuring GitHub Copilot / VS Code for GATI MCP Server..."
echo ""
echo "⚠️  Note: MCP support in VS Code requires:"
echo "   - VS Code 1.99 or later"
echo "   - GitHub Copilot extension"
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
VSCODE_DIR="$PROJECT_ROOT/.vscode"
MCP_CONFIG="$VSCODE_DIR/mcp.json"

echo "📝 Project root: $PROJECT_ROOT"
echo "📝 Creating workspace MCP configuration..."

# Create .vscode directory if it doesn't exist
mkdir -p "$VSCODE_DIR"

# Create or update mcp.json
cat > "$MCP_CONFIG" << 'EOF'
{
  "servers": {
    "gati": {
      "type": "stdio",
      "command": "docker",
      "args": [
        "exec",
        "-i",
        "gati_mcp_server",
        "node",
        "dist/index.js"
      ]
    }
  }
}
EOF

echo "✅ Created MCP configuration at: $MCP_CONFIG"
echo ""
echo "📋 Next steps:"
echo ""
echo "   1. Make sure GATI containers are running:"
echo "      docker-compose up -d"
echo ""
echo "   2. Verify MCP server is running:"
echo "      docker-compose ps gati_mcp_server"
echo ""
echo "   3. Open this project in VS Code:"
echo "      code $PROJECT_ROOT"
echo ""
echo "   4. Reload VS Code window:"
echo "      Press Cmd/Ctrl + Shift + P"
echo "      Type 'Developer: Reload Window'"
echo "      Or just restart VS Code"
echo ""
echo "   5. Check MCP SERVERS section in Extensions panel"
echo "      You should see 'gati' listed"
echo ""
echo "   6. Start querying your traces in Copilot Chat!"
echo "      - Open Chat (Cmd/Ctrl + Shift + I)"
echo "      - Try: '@gati show me all my agents'"
echo "      - Or: 'Use #list_agents to show agents'"
echo ""
echo "📄 Config file: $MCP_CONFIG"
echo ""
echo "⚠️  If GATI doesn't appear:"
echo "   - Make sure you're opening THIS workspace in VS Code"
echo "   - Check VS Code version (needs 1.99+)"
echo "   - Ensure GitHub Copilot extension is installed"
echo "   - Try completely closing and reopening VS Code"
