# GATI MCP Server

Model Context Protocol (MCP) server for querying GATI traces directly from AI assistants like Claude Desktop and GitHub Copilot.

---

## Overview

The GATI MCP Server exposes your local trace data through a set of tools that AI assistants can use to help you analyze and understand your agent's behavior, costs, and performance.

---

## Features

### Available Tools

1. **list_agents** - List all tracked agents with statistics
2. **get_agent_stats** - Get detailed statistics for a specific agent
3. **list_runs** - List all runs for an agent
4. **get_run_details** - Get detailed information about a specific run
5. **get_run_timeline** - Get chronological timeline of events
6. **get_execution_trace** - Get hierarchical execution tree
7. **compare_runs** - Compare metrics across multiple runs
8. **search_events** - Search events by various criteria
9. **get_cost_breakdown** - Analyze costs by LLM model
10. **get_global_metrics** - Get global metrics across all agents

---

## Quick Start

### Prerequisites

- Docker installed
- GATI SDK installed and collecting traces

### Setup

1. Start the GATI services (including MCP server):

```bash
gati start
```

This starts the backend, dashboard, and MCP server via Docker.

2. Configure your AI assistant:

**For Claude Desktop:**

Open your Claude Desktop configuration file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

Add the GATI MCP server configuration:
```json
{
  "mcpServers": {
    "gati": {
      "command": "docker",
      "args": [
        "exec",
        "-i",
        "gati_mcp_server",
        "node",
        "/app/dist/index.js"
      ]
    }
  }
}
```

**For VS Code with GitHub Copilot:**

Open your MCP server configuration file (`mcp.json` or `mcp_config.json` in your project root) and add:
```json
{
  "mcp.servers": {
    "gati": {
      "command": "docker",
      "args": [
        "exec",
        "-i",
        "gati_mcp_server",
        "node",
        "/app/dist/index.js"
      ]
    }
  }
}
```

3. Restart your AI assistant

4. Start querying your traces!

---

## Usage Examples

### With Claude Desktop

```
You: "Show me all my agents"
Claude: [Uses list_agents tool automatically]

You: "What was the cost for my chatbot agent's last 5 runs?"
Claude: [Uses list_runs and analyzes the data]

You: "Show me the execution trace for run 3"
Claude: [Uses get_execution_trace to show the hierarchical flow]

You: "Why was run 5 so expensive compared to run 4?"
Claude: [Uses compare_runs and get_run_details to analyze]
```

### With GitHub Copilot in VS Code

```
You: @gati show me all agents
Copilot: [Invokes list_agents tool and shows results]

You: @gati compare the last 3 runs for my-agent
Copilot: [Uses compare_runs tool]
```

---

## Architecture

```
GATI Stack (via `gati start`):
┌─────────────────────────┐
│  Backend (FastAPI)      │ ← Receives trace events
│  SQLite Database        │ ← Stores trace data locally
│  (localhost:8000)       │
└───────────┬─────────────┘
            │
┌───────────▼─────────────┐
│  GATI MCP Server        │ ← Exposes traces via MCP
│  (Docker container)     │ ← Reads from SQLite (read-only)
└───────────┬─────────────┘
            │
┌───────────▼─────────────┐
│  Claude Desktop /       │ ← AI assistant
│  GitHub Copilot /       │
│  Cursor                 │
└─────────────────────────┘
```

---

## Configuration

The MCP server is automatically configured when you run `gati start`. It connects to the local SQLite database used by the GATI backend.

The MCP server runs in a Docker container and has read-only access to the trace database.

---

## Development

### Local Development (without Docker)

1. Install dependencies:
```bash
cd mcp-server
npm install
```

2. Set database URL:
```bash
export DATABASE_URL="postgresql://gati_user:gati_password@localhost:5434/gati_db"
```

3. Run in development mode:
```bash
npm run dev
```

4. Build:
```bash
npm run build
```

---

## Troubleshooting

### MCP server not connecting

1. Check if services are running:
```bash
gati status
```

2. Check MCP server logs:
```bash
gati logs mcp-server
```

3. Verify MCP container is running:
```bash
docker ps | grep gati_mcp_server
```

### Tools not appearing in AI assistant

1. Verify configuration file location:
   - Claude Desktop: `~/Library/Application Support/Claude/claude_desktop_config.json` (Mac)
   - VS Code: Settings → Extensions → GitHub Copilot → MCP Servers

2. Restart the AI assistant completely

3. Check MCP server is in the config:
```bash
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | grep gati
```

### No trace data showing up

1. Verify backend is receiving events:
```bash
curl http://localhost:8000/health
```

2. Check that your SDK is initialized correctly:
```python
from gati import observe

observe.init(
    name="my_agent",
    backend_url="http://localhost:8000"  # Default, can be omitted
)
```

3. Verify events are being sent by checking backend logs:
```bash
gati logs backend
```

---

## License

MIT
