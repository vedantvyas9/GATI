#!/bin/bash

# Script to configure Claude Desktop to use GATI MCP Server
set -e

echo "🚀 Configuring Claude Desktop for GATI MCP Server..."

# Detect OS
OS="$(uname -s)"
case "${OS}" in
    Darwin*)
        CONFIG_DIR="$HOME/Library/Application Support/Claude"
        ;;
    Linux*)
        CONFIG_DIR="$HOME/.config/Claude"
        ;;
    MINGW*|MSYS*|CYGWIN*)
        CONFIG_DIR="$APPDATA/Claude"
        ;;
    *)
        echo "❌ Unsupported operating system: ${OS}"
        exit 1
        ;;
esac

CONFIG_FILE="$CONFIG_DIR/claude_desktop_config.json"

# Create config directory if it doesn't exist
mkdir -p "$CONFIG_DIR"

# Check if config file exists
if [ -f "$CONFIG_FILE" ]; then
    echo "📝 Found existing Claude Desktop config at: $CONFIG_FILE"

    # Backup existing config
    BACKUP_FILE="${CONFIG_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
    cp "$CONFIG_FILE" "$BACKUP_FILE"
    echo "✅ Backed up existing config to: $BACKUP_FILE"

    # Check if gati is already configured
    if grep -q '"gati"' "$CONFIG_FILE"; then
        echo "⚠️  GATI MCP server is already configured in Claude Desktop"
        echo "   Config file: $CONFIG_FILE"
        echo ""
        echo "   To reconfigure, manually edit the file or delete the 'gati' entry and run this script again."
        exit 0
    fi

    # Parse existing JSON and add gati config
    # Use jq if available, otherwise use Python
    if command -v jq &> /dev/null; then
        jq '.mcpServers.gati = {
          "command": "docker",
          "args": ["exec", "-i", "gati_mcp_server", "node", "dist/index.js"]
        }' "$CONFIG_FILE" > "${CONFIG_FILE}.tmp" && mv "${CONFIG_FILE}.tmp" "$CONFIG_FILE"
    elif command -v python3 &> /dev/null; then
        python3 << EOF
import json
import sys

try:
    with open('$CONFIG_FILE', 'r') as f:
        config = json.load(f)
except:
    config = {}

if 'mcpServers' not in config:
    config['mcpServers'] = {}

config['mcpServers']['gati'] = {
    "command": "docker",
    "args": ["exec", "-i", "gati_mcp_server", "node", "dist/index.js"]
}

with open('$CONFIG_FILE', 'w') as f:
    json.dump(config, f, indent=2)
EOF
    else
        echo "❌ Neither jq nor python3 found. Please install one of them to continue."
        exit 1
    fi
else
    echo "📝 Creating new Claude Desktop config at: $CONFIG_FILE"

    # Create new config file
    cat > "$CONFIG_FILE" << 'EOF'
{
  "mcpServers": {
    "gati": {
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
fi

echo ""
echo "✅ Configuration complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Make sure GATI containers are running:"
echo "      docker-compose up -d"
echo ""
echo "   2. Verify MCP server is running:"
echo "      docker-compose ps gati_mcp_server"
echo ""
echo "   3. Restart Claude Desktop completely"
echo ""
echo "   4. Start asking questions about your traces!"
echo "      Example: 'Show me all my agents'"
echo ""
echo "📄 Config file location: $CONFIG_FILE"
