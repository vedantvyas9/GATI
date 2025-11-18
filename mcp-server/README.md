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

- Node.js 18+ installed
- GATI SDK installed and collecting traces
- GATI backend running (via `gati start`)

### Setup

**Easy Setup (Recommended):**

1. **Start the GATI services**:

```bash
gati start
```

2. **Run the setup command**:

For VS Code:
```bash
gati mcp setup
```

For Claude Desktop:
```bash
gati mcp setup claude --write-claude
```

For both:
```bash
gati mcp setup both
```

This automatically:
- Finds the MCP server path
- Creates/updates the configuration files
- Sets everything up correctly

3. **Restart your AI assistant** (VS Code or Claude Desktop)

4. **Start querying your traces!**

**Manual Setup (Alternative):**

If you prefer to set it up manually:

1. **Start the GATI services**:
```bash
gati start
```

2. **Build the MCP server** (if not already built):
```bash
cd mcp-server
npm install
npm run build
```

3. **Run the setup command to see the configuration**:
```bash
gati mcp setup claude  # Shows Claude Desktop config
gati mcp setup vscode  # Creates mcp.json for VS Code
```

4. **Copy the configuration** to your AI assistant's config file

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
│  ~/.gati/data/gati.db   │
└───────────┬─────────────┘
            │
┌───────────▼─────────────┐
│  GATI MCP Server        │ ← Exposes traces via MCP
│  (Node.js process)      │ ← Reads from SQLite (read-only)
│  (stdio/stdout)         │
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

The MCP server connects to the local SQLite database used by the GATI backend.

**Environment Variables:**
- `DATABASE_PATH` - Path to SQLite database (default: `~/.gati/data/gati.db`)
- `BACKEND_URL` - Backend API URL (default: `http://localhost:8000`)

The MCP server reads from the same database as the backend but operates independently as a separate process.

---

## Development

### Local Development (without Docker)

1. Install dependencies:
```bash
cd mcp-server
npm install
```

2. Set environment variables:
```bash
export DATABASE_PATH="~/.gati/data/gati.db"
export BACKEND_URL="http://localhost:8000"
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

1. Check if backend is running:
```bash
gati status
curl http://localhost:8000/health
```

2. Verify database path is correct:
```bash
ls ~/.gati/data/gati.db
```

3. Test MCP server manually:
```bash
node /path/to/gati/mcp-server/dist/index.js
```

4. Check MCP server logs (if running as service):
```bash
gati logs mcp-server
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
