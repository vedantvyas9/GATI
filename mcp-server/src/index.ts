#!/usr/bin/env node

/**
 * GATI MCP Server
 *
 * Model Context Protocol server for querying GATI traces from AI assistants
 * like Claude Desktop and GitHub Copilot.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { loadConfig, validateConfig } from './config/config.js';
import { setBackendConfig } from './api/client.js';
import { allTools } from './tools/tools.js';
import { initTelemetry, trackQuery, shutdownTelemetry } from './telemetry/client.js';

/**
 * Main server initialization
 */
async function main() {
  // Load and validate configuration
  const config = loadConfig();
  validateConfig(config);

  // Set backend configuration for API client
  setBackendConfig({ backendUrl: config.backendUrl });

  // Create MCP server
  const server = new Server(
    {
      name: 'gati-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  /**
   * Handler: List available tools
   */
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: allTools.map(tool => {
        const shape = tool.inputSchema.shape as Record<string, any>;
        return {
          name: tool.name,
          description: tool.description,
          inputSchema: {
            type: 'object' as const,
            properties: shape,
            required: Object.keys(shape).filter(
              key => !shape[key].isOptional?.()
            ),
          },
        };
      }),
    };
  });

  /**
   * Handler: Call a tool
   */
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    console.error(`[GATI MCP] Tool called: ${name}`);

    // Track telemetry
    await trackQuery();

    // Find the tool
    const tool = allTools.find(t => t.name === name);

    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }

    try {
      // Validate arguments
      const validatedArgs = tool.inputSchema.parse(args || {});

      // Execute tool handler
      const result = await tool.handler(validatedArgs as any);

      return {
        content: [
          {
            type: 'text',
            text: result,
          },
        ],
      };
    } catch (error: any) {
      console.error(`[GATI MCP] Error executing tool ${name}:`, error);

      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message || 'An unexpected error occurred'}`,
          },
        ],
        isError: true,
      };
    }
  });

  // Handle shutdown
  process.on('SIGINT', async () => {
    console.error('[GATI MCP] Shutting down...');
    await shutdownTelemetry();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.error('[GATI MCP] Shutting down...');
    await shutdownTelemetry();
    process.exit(0);
  });

  // Connect to transport IMMEDIATELY (before any async initialization)
  // This allows VS Code to send initialize request right away
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('[GATI MCP] Server started successfully');
  console.error(`[GATI MCP] Available tools: ${allTools.map(t => t.name).join(', ')}`);

  // Test backend connection asynchronously AFTER connecting to transport
  // This will log warnings but won't prevent the server from starting
  (async () => {
    try {
      console.error('[GATI MCP] Testing backend connection...');
      const response = await fetch(`${config.backendUrl}/health`);
      if (!response.ok) {
        throw new Error(`Backend health check failed: ${response.status}`);
      }
      const health = await response.json() as { status: string };
      console.error(`[GATI MCP] Backend connection successful (${health.status})`);
    } catch (error: any) {
      console.error(`[GATI MCP] Warning: Backend not available at ${config.backendUrl}`);
      console.error(`[GATI MCP] Error: ${error.message || String(error)}`);
      console.error('[GATI MCP] MCP server will start, but tools may not work until backend is running.');
      console.error('[GATI MCP] Start backend with: gati start');
      // Don't exit - let the server start anyway
    }
  })();

  // Initialize telemetry asynchronously (don't block server startup)
  const telemetryEnabled = process.env.GATI_TELEMETRY !== 'false';
  initTelemetry(telemetryEnabled).catch((error) => {
    console.error('[GATI MCP] Telemetry initialization failed:', error);
    // Don't exit - telemetry is optional
  });
}

// Run the server
main().catch((error) => {
  console.error('[GATI MCP] Fatal error:', error);
  process.exit(1);
});
