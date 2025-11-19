/**
 * MCP Tool implementations for GATI traces
 */
import { z } from 'zod';
import * as api from '../api/client.js';
import * as formatters from '../utils/formatters.js';

/**
 * Tool: list_agents
 * Lists all agents with their statistics
 */
export const listAgentsTool = {
  name: 'list_agents',
  description: 'List all agents being tracked with their statistics including total runs, events, and costs',
  inputSchema: z.object({}),
  handler: async () => {
    const agents = await api.listAgents();
    return formatters.formatAgentsList(agents);
  },
};

/**
 * Tool: get_agent_stats
 * Get detailed statistics for a specific agent
 */
export const getAgentStatsTool = {
  name: 'get_agent_stats',
  description: 'Get detailed statistics for a specific agent including total runs, events, costs, and averages',
  inputSchema: z.object({
    agent_name: z.string().describe('Name of the agent to get statistics for'),
  }),
  handler: async (args: { agent_name: string }) => {
    const agent = await api.getAgentStats(args.agent_name);

    if (!agent) {
      return `Agent "${args.agent_name}" not found. Use list_agents to see available agents.`;
    }

    return formatters.formatAgentStats(agent);
  },
};

/**
 * Tool: list_runs
 * List runs for a specific agent
 */
export const listRunsTool = {
  name: 'list_runs',
  description: 'List all runs for a specific agent with their basic metrics',
  inputSchema: z.object({
    agent_name: z.string().describe('Name of the agent to list runs for'),
    limit: z.number().optional().default(20).describe('Maximum number of runs to return (default: 20)'),
    offset: z.number().optional().default(0).describe('Number of runs to skip (for pagination)'),
  }),
  handler: async (args: { agent_name: string; limit?: number; offset?: number }) => {
    const runs = await api.listRuns(args.agent_name, args.limit || 20, args.offset || 0);
    return formatters.formatRunsList(runs);
  },
};

/**
 * Tool: get_run_details
 * Get detailed information about a specific run
 */
export const getRunDetailsTool = {
  name: 'get_run_details',
  description: 'Get detailed information about a specific run including all metrics and metadata',
  inputSchema: z.object({
    agent_name: z.string().describe('Name of the agent'),
    run_name: z.string().describe('Name of the run (e.g., "run 1", "run 2")'),
  }),
  handler: async (args: { agent_name: string; run_name: string }) => {
    const run = await api.getRunByName(args.agent_name, args.run_name);

    if (!run) {
      return `Run "${args.run_name}" not found for agent "${args.agent_name}". Use list_runs to see available runs.`;
    }

    return formatters.formatRunDetails(run);
  },
};

/**
 * Tool: get_run_timeline
 * Get chronological timeline of events for a run
 */
export const getRunTimelineTool = {
  name: 'get_run_timeline',
  description: 'Get a chronological timeline of all events in a run, ordered by timestamp',
  inputSchema: z.object({
    agent_name: z.string().describe('Name of the agent'),
    run_name: z.string().describe('Name of the run'),
  }),
  handler: async (args: { agent_name: string; run_name: string }) => {
    const events = await api.getRunTimeline(args.agent_name, args.run_name);

    if (events.length === 0) {
      return `No events found for run "${args.run_name}" of agent "${args.agent_name}". The run may not exist.`;
    }

    return formatters.formatTimeline(events);
  },
};

/**
 * Tool: get_execution_trace
 * Get hierarchical execution trace showing parent-child relationships
 */
export const getExecutionTraceTool = {
  name: 'get_execution_trace',
  description: 'Get a hierarchical execution trace showing the tree structure of events with parent-child relationships',
  inputSchema: z.object({
    agent_name: z.string().describe('Name of the agent'),
    run_name: z.string().describe('Name of the run'),
  }),
  handler: async (args: { agent_name: string; run_name: string }) => {
    const events = await api.getExecutionTrace(args.agent_name, args.run_name);

    if (events.length === 0) {
      return `No events found for run "${args.run_name}" of agent "${args.agent_name}". The run may not exist.`;
    }

    return formatters.formatExecutionTrace(events);
  },
};

/**
 * Tool: compare_runs
 * Compare metrics across multiple runs
 */
export const compareRunsTool = {
  name: 'compare_runs',
  description: 'Compare metrics across multiple runs side-by-side',
  inputSchema: z.object({
    agent_name: z.string().describe('Name of the agent'),
    run_names: z.array(z.string()).describe('Array of run names to compare (e.g., ["run 1", "run 2", "run 3"])'),
  }),
  handler: async (args: { agent_name: string; run_names: string[] }) => {
    if (args.run_names.length === 0) {
      return 'Please provide at least one run name to compare.';
    }

    // Get all runs
    const runPromises = args.run_names.map(name =>
      api.getRunByName(args.agent_name, name)
    );

    const runs = await Promise.all(runPromises);
    const validRuns = runs.filter(r => r !== null) as api.RunDetails[];

    if (validRuns.length === 0) {
      return `No runs found with the provided names for agent "${args.agent_name}".`;
    }

    if (validRuns.length < runs.length) {
      const missing = args.run_names.filter((name, i) => runs[i] === null);
      return `Warning: Some runs not found: ${missing.join(', ')}\n\n` +
        formatters.formatRunComparison(validRuns);
    }

    return formatters.formatRunComparison(validRuns);
  },
};

/**
 * Tool: search_events
 * Search events by various criteria
 */
export const searchEventsTool = {
  name: 'search_events',
  description: 'Search for events by agent name, event type, or time range',
  inputSchema: z.object({
    agent_name: z.string().optional().describe('Filter by agent name'),
    event_type: z.string().optional().describe('Filter by event type (e.g., llm_call, tool_call, agent_start, agent_end)'),
    start_time: z.string().optional().describe('Filter events after this ISO 8601 timestamp'),
    end_time: z.string().optional().describe('Filter events before this ISO 8601 timestamp'),
    limit: z.number().optional().default(100).describe('Maximum number of events to return'),
  }),
  handler: async (args: {
    agent_name?: string;
    event_type?: string;
    start_time?: string;
    end_time?: string;
    limit?: number;
  }) => {
    const startTime = args.start_time ? new Date(args.start_time) : undefined;
    const endTime = args.end_time ? new Date(args.end_time) : undefined;

    const events = await api.searchEvents(
      args.agent_name,
      args.event_type,
      startTime,
      endTime,
      args.limit
    );

    return formatters.formatTimeline(events);
  },
};

/**
 * Tool: get_cost_breakdown
 * Get cost breakdown by model
 */
export const getCostBreakdownTool = {
  name: 'get_cost_breakdown',
  description: 'Get a breakdown of costs by LLM model, showing total costs, token usage, and call counts',
  inputSchema: z.object({
    agent_name: z.string().optional().describe('Filter by specific agent (optional, shows all agents if not provided)'),
  }),
  handler: async (args: { agent_name?: string }) => {
    const breakdown = await api.getCostBreakdown(args.agent_name);
    return formatters.formatCostBreakdown(breakdown);
  },
};

/**
 * Tool: get_global_metrics
 * Get global metrics across all agents
 */
export const getGlobalMetricsTool = {
  name: 'get_global_metrics',
  description: 'Get global metrics aggregated across all agents, including total costs, tokens, and event counts',
  inputSchema: z.object({}),
  handler: async () => {
    const metrics = await api.getGlobalMetrics();
    return formatters.formatGlobalMetrics(metrics);
  },
};

/**
 * Tool: get_event_details
 * Get full details of events including prompts and completions
 */
export const getEventDetailsTool = {
  name: 'get_event_details',
  description: 'Get complete details of events in a run, including full prompts, system prompts, completions, and all metadata. Useful for inspecting LLM calls in detail.',
  inputSchema: z.object({
    agent_name: z.string().describe('Name of the agent'),
    run_name: z.string().describe('Name of the run'),
    event_type: z.string().optional().describe('Filter by event type (e.g., llm_call, tool_call). If not provided, shows all events.'),
  }),
  handler: async (args: { agent_name: string; run_name: string; event_type?: string }) => {
    const events = await api.getRunTimeline(args.agent_name, args.run_name);

    if (events.length === 0) {
      return `No events found for run "${args.run_name}" of agent "${args.agent_name}". The run may not exist.`;
    }

    // Filter by event type if provided
    const filteredEvents = args.event_type
      ? events.filter(e => e.event_type === args.event_type)
      : events;

    if (filteredEvents.length === 0) {
      return `No events found${args.event_type ? ` of type "${args.event_type}"` : ''} for this run.`;
    }

    // Format detailed output with full data
    let output = `# Event Details for ${args.run_name}\n\n`;
    output += `Found ${filteredEvents.length} event(s)\n\n`;

    filteredEvents.forEach((event, index) => {
      output += `## Event ${index + 1}: ${event.event_type}\n`;
      output += `**Time:** ${new Date(event.timestamp).toISOString()}\n`;
      output += `**Event ID:** ${event.event_id}\n\n`;

      if (event.data) {
        // LLM calls - show full details
        if (event.event_type === 'llm_call') {
          if (event.data.model) output += `**Model:** ${event.data.model}\n`;
          if (event.data.latency_ms) output += `**Latency:** ${event.data.latency_ms}ms\n`;
          if (event.data.cost) output += `**Cost:** $${Number(event.data.cost).toFixed(6)}\n`;
          if (event.data.tokens_in) output += `**Tokens In:** ${event.data.tokens_in}\n`;
          if (event.data.tokens_out) output += `**Tokens Out:** ${event.data.tokens_out}\n`;

          // Handle system_prompt - check if it's empty and extract from prompt if needed
          const systemPrompt = event.data.system_prompt?.trim() || '';
          const fullPrompt = event.data.prompt || '';

          // If system_prompt is empty but prompt contains "System:", extract it
          if (!systemPrompt && fullPrompt.includes('System:')) {
            const systemMatch = fullPrompt.match(/System:\s*([\s\S]*?)(?:\nHuman:|$)/);
            const extractedSystem = systemMatch ? systemMatch[1].trim() : '';
            const humanMatch = fullPrompt.match(/Human:\s*([\s\S]*)/);
            const extractedHuman = humanMatch ? humanMatch[1].trim() : fullPrompt;

            output += `\n### System Prompt\n\`\`\`\n${extractedSystem || 'N/A'}\n\`\`\`\n\n`;
            output += `### User Prompt\n\`\`\`\n${extractedHuman || 'N/A'}\n\`\`\`\n\n`;
          } else {
            // Use separate fields as stored
            output += `\n### System Prompt\n\`\`\`\n${systemPrompt || 'N/A'}\n\`\`\`\n\n`;
            output += `### Prompt\n\`\`\`\n${fullPrompt || 'N/A'}\n\`\`\`\n\n`;
          }

          output += `### Completion\n\`\`\`\n${event.data.completion || 'N/A'}\n\`\`\`\n\n`;
        }

        // Tool calls
        else if (event.event_type === 'tool_call') {
          if (event.data.tool_name) output += `**Tool:** ${event.data.tool_name}\n`;
          if (event.data.latency_ms) output += `**Latency:** ${event.data.latency_ms}ms\n`;

          output += `\n### Input\n\`\`\`json\n${JSON.stringify(event.data.tool_input, null, 2)}\n\`\`\`\n\n`;
          output += `### Output\n\`\`\`json\n${JSON.stringify(event.data.tool_output, null, 2)}\n\`\`\`\n\n`;
        }

        // Other events - show raw data
        else {
          output += `\n### Data\n\`\`\`json\n${JSON.stringify(event.data, null, 2)}\n\`\`\`\n\n`;
        }
      }

      output += `---\n\n`;
    });

    return output;
  },
};

/**
 * Export all tools
 */
export const allTools = [
  listAgentsTool,
  getAgentStatsTool,
  listRunsTool,
  getRunDetailsTool,
  getRunTimelineTool,
  getExecutionTraceTool,
  compareRunsTool,
  searchEventsTool,
  getCostBreakdownTool,
  getGlobalMetricsTool,
  getEventDetailsTool,
];
