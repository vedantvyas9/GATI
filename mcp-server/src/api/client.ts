/**
 * Backend API client for GATI MCP Server
 * 
 * This module provides HTTP client functions to interact with the GATI backend API
 * instead of direct database access. This eliminates the need for native SQLite bindings
 * and makes the MCP server work across all platforms.
 */

export interface BackendConfig {
  backendUrl: string;
}

let config: BackendConfig = {
  backendUrl: process.env.BACKEND_URL || 'http://localhost:8000',
};

/**
 * Set backend configuration
 */
export function setBackendConfig(newConfig: Partial<BackendConfig>): void {
  config = { ...config, ...newConfig };
}

/**
 * Get backend configuration
 */
export function getBackendConfig(): BackendConfig {
  return config;
}

/**
 * Make HTTP request to backend API
 */
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${config.backendUrl}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Backend API error (${response.status}): ${errorText}`);
    }

    return await response.json() as T;
  } catch (error: any) {
    if (error.message && error.message.includes('fetch')) {
      throw new Error(`Failed to connect to backend at ${config.backendUrl}. Is the backend running? Run 'gati start' to start it.`);
    }
    throw error;
  }
}

/**
 * Agent statistics from backend
 */
export interface AgentStats {
  name: string;
  description: string | null;
  total_runs: number;
  total_events: number;
  total_cost: number;
  avg_cost: number; // Backend returns this as avg_cost
  avg_cost_per_run?: number; // For compatibility with formatters
  created_at: string;
}

/**
 * Run details from backend
 */
export interface RunDetails {
  run_name: string;
  agent_name: string;
  environment: string;
  status: string;
  total_duration_ms: number;
  total_cost: number;
  tokens_in: number;
  tokens_out: number;
  metadata?: any;
  event_count?: number;
  created_at: string;
}

/**
 * Event from backend
 * Note: Timeline events may not include all fields (run_id, agent_name, parent_event_id, etc.)
 */
export interface Event {
  event_id: string;
  run_id?: string;
  agent_name?: string;
  event_type: string;
  timestamp: string;
  parent_event_id?: string | null;
  previous_event_id?: string | null;
  data: any;
}

/**
 * List all agents
 */
export async function listAgents(): Promise<AgentStats[]> {
  const agents = await apiRequest<any[]>('/api/agents');
  // Map backend response to our interface (backend uses avg_cost, formatters expect avg_cost_per_run)
  return agents.map(agent => ({
    ...agent,
    avg_cost_per_run: agent.avg_cost || 0,
  }));
}

/**
 * Get agent statistics
 */
export async function getAgentStats(agentName: string): Promise<AgentStats | null> {
  try {
    const agent = await apiRequest<any>(`/api/agents/${encodeURIComponent(agentName)}`);
    // Map backend response to our interface
    return {
      ...agent,
      avg_cost_per_run: agent.avg_cost || 0,
    };
  } catch (error: any) {
    if (error.message.includes('404')) {
      return null;
    }
    throw error;
  }
}

/**
 * Get runs for an agent
 */
export async function listRuns(
  agentName: string,
  limit: number = 20,
  offset: number = 0
): Promise<RunDetails[]> {
  return apiRequest<RunDetails[]>(
    `/api/agents/${encodeURIComponent(agentName)}/runs?limit=${limit}&offset=${offset}`
  );
}

/**
 * Get run details by agent name and run name
 */
export async function getRunByName(
  agentName: string,
  runName: string
): Promise<RunDetails | null> {
  try {
    const run = await apiRequest<any>(
      `/api/runs/${encodeURIComponent(agentName)}/${encodeURIComponent(runName)}`
    );
    // Ensure event_count is included
    return {
      ...run,
      event_count: run.event_count || 0,
    };
  } catch (error: any) {
    if (error.message && error.message.includes('404')) {
      return null;
    }
    throw error;
  }
}

/**
 * Get run timeline (chronological events)
 */
export async function getRunTimeline(
  agentName: string,
  runName: string
): Promise<Event[]> {
  try {
    const response = await apiRequest<{ events: Event[] }>(
      `/api/runs/${encodeURIComponent(agentName)}/${encodeURIComponent(runName)}/timeline`
    );
    return response.events || [];
  } catch (error: any) {
    if (error.message.includes('404')) {
      return [];
    }
    throw error;
  }
}

/**
 * Get execution trace (hierarchical events)
 */
export async function getExecutionTrace(
  agentName: string,
  runName: string
): Promise<Event[]> {
  try {
    const response = await apiRequest<{ events: Event[] }>(
      `/api/runs/${encodeURIComponent(agentName)}/${encodeURIComponent(runName)}/trace`
    );
    return response.events || [];
  } catch (error: any) {
    if (error.message.includes('404')) {
      return [];
    }
    throw error;
  }
}

/**
 * Get global metrics
 */
export async function getGlobalMetrics(): Promise<any> {
  return apiRequest<any>('/api/metrics/summary');
}

/**
 * Search events (using backend API if available, otherwise return empty)
 * Note: Backend may not have a search endpoint, so this is a placeholder
 */
export async function searchEvents(
  agentName?: string,
  eventType?: string,
  startTime?: Date,
  endTime?: Date,
  limit: number = 100
): Promise<Event[]> {
  // For now, if we need search, we can get all runs for an agent and filter
  // This is a simplified implementation
  if (!agentName) {
    // Get all agents and their runs - simplified for now
    const agents = await listAgents();
    const allEvents: Event[] = [];
    
    for (const agent of agents.slice(0, 10)) { // Limit to first 10 agents
      const runs = await listRuns(agent.name, 10, 0);
      for (const run of runs) {
        const events = await getRunTimeline(agent.name, run.run_name);
        allEvents.push(...events);
      }
    }
    
    return allEvents.slice(0, limit);
  }
  
  // Get runs for specific agent
  const runs = await listRuns(agentName, 50, 0);
  const allEvents: Event[] = [];
  
  for (const run of runs) {
    const events = await getRunTimeline(agentName, run.run_name);
    allEvents.push(...events);
  }
  
  // Filter by event type if provided
  let filtered = eventType 
    ? allEvents.filter(e => e.event_type === eventType)
    : allEvents;
  
  // Filter by time range if provided
  if (startTime) {
    filtered = filtered.filter(e => new Date(e.timestamp) >= startTime);
  }
  if (endTime) {
    filtered = filtered.filter(e => new Date(e.timestamp) <= endTime);
  }
  
  return filtered.slice(0, limit);
}

/**
 * Get cost breakdown by model
 * Note: This may need to be implemented in the backend or calculated from events
 */
export async function getCostBreakdown(agentName?: string): Promise<any[]> {
  // For now, get events and calculate cost breakdown
  // This is a simplified implementation
  const events = agentName
    ? await searchEvents(agentName, 'llm_call', undefined, undefined, 1000)
    : await searchEvents(undefined, 'llm_call', undefined, undefined, 1000);
  
  const breakdown: Record<string, any> = {};
  
  for (const event of events) {
    if (event.event_type === 'llm_call' && event.data?.model) {
      const model = event.data.model;
      if (!breakdown[model]) {
        breakdown[model] = {
          model,
          total_cost: 0,
          total_tokens_in: 0,
          total_tokens_out: 0,
          call_count: 0,
        };
      }
      
      breakdown[model].total_cost += event.data.cost || 0;
      breakdown[model].total_tokens_in += event.data.tokens_in || 0;
      breakdown[model].total_tokens_out += event.data.tokens_out || 0;
      breakdown[model].call_count += 1;
    }
  }
  
  return Object.values(breakdown);
}

