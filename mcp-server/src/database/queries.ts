/**
 * Database queries for GATI traces
 */
import { getPool } from './connection.js';

/**
 * Agent with statistics
 */
export interface AgentStats {
  name: string;
  description: string | null;
  total_runs: number;
  total_events: number;
  total_cost: number;
  avg_cost_per_run: number;
  created_at: Date;
}

/**
 * Run details
 */
export interface RunDetails {
  run_id: string;
  run_name: string;
  agent_name: string;
  environment: string;
  status: string;
  total_duration_ms: number | null;
  total_cost: number | null;
  tokens_in: number | null;
  tokens_out: number | null;
  metadata: any;
  created_at: Date;
  event_count: number;
}

/**
 * Event data
 */
export interface Event {
  event_id: string;
  run_id: string;
  agent_name: string;
  event_type: string;
  timestamp: Date;
  parent_event_id: string | null;
  previous_event_id: string | null;
  data: any;
}

/**
 * List all agents with statistics
 */
export async function listAgents(): Promise<AgentStats[]> {
  const query = `
    SELECT
      a.name,
      a.description,
      COUNT(DISTINCT r.run_id) as total_runs,
      COUNT(e.event_id) as total_events,
      COALESCE(SUM(r.total_cost), 0) as total_cost,
      COALESCE(AVG(r.total_cost), 0) as avg_cost_per_run,
      a.created_at
    FROM agents a
    LEFT JOIN runs r ON a.name = r.agent_name
    LEFT JOIN events e ON r.run_id = e.run_id
    GROUP BY a.name, a.description, a.created_at
    ORDER BY a.created_at DESC
  `;

  const result = await getPool().query(query);
  return result.rows;
}

/**
 * Get agent statistics
 */
export async function getAgentStats(agentName: string): Promise<AgentStats | null> {
  const query = `
    SELECT
      a.name,
      a.description,
      COUNT(DISTINCT r.run_id) as total_runs,
      COUNT(e.event_id) as total_events,
      COALESCE(SUM(r.total_cost), 0) as total_cost,
      COALESCE(AVG(r.total_cost), 0) as avg_cost_per_run,
      a.created_at
    FROM agents a
    LEFT JOIN runs r ON a.name = r.agent_name
    LEFT JOIN events e ON r.run_id = e.run_id
    WHERE a.name = $1
    GROUP BY a.name, a.description, a.created_at
  `;

  const result = await getPool().query(query, [agentName]);
  return result.rows[0] || null;
}

/**
 * List runs for an agent
 */
export async function listRuns(
  agentName: string,
  limit: number = 20,
  offset: number = 0
): Promise<RunDetails[]> {
  const query = `
    SELECT
      r.run_id,
      r.run_name,
      r.agent_name,
      r.environment,
      r.status,
      r.total_duration_ms,
      r.total_cost,
      r.tokens_in,
      r.tokens_out,
      r.metadata,
      r.created_at,
      COUNT(e.event_id) as event_count
    FROM runs r
    LEFT JOIN events e ON r.run_id = e.run_id
    WHERE r.agent_name = $1
    GROUP BY r.run_id
    ORDER BY r.created_at DESC
    LIMIT $2 OFFSET $3
  `;

  const result = await getPool().query(query, [agentName, limit, offset]);
  return result.rows;
}

/**
 * Get run details by name
 */
export async function getRunByName(
  agentName: string,
  runName: string
): Promise<RunDetails | null> {
  const query = `
    SELECT
      r.run_id,
      r.run_name,
      r.agent_name,
      r.environment,
      r.status,
      r.total_duration_ms,
      r.total_cost,
      r.tokens_in,
      r.tokens_out,
      r.metadata,
      r.created_at,
      COUNT(e.event_id) as event_count
    FROM runs r
    LEFT JOIN events e ON r.run_id = e.run_id
    WHERE r.agent_name = $1 AND r.run_name = $2
    GROUP BY r.run_id
  `;

  const result = await getPool().query(query, [agentName, runName]);
  return result.rows[0] || null;
}

/**
 * Get timeline events for a run
 */
export async function getRunTimeline(runId: string): Promise<Event[]> {
  const query = `
    SELECT
      event_id,
      run_id,
      agent_name,
      event_type,
      timestamp,
      parent_event_id,
      previous_event_id,
      data
    FROM events
    WHERE run_id = $1
    ORDER BY timestamp ASC
  `;

  const result = await getPool().query(query, [runId]);
  return result.rows;
}

/**
 * Get execution trace (hierarchical tree)
 */
export async function getExecutionTrace(runId: string): Promise<Event[]> {
  const query = `
    SELECT
      event_id,
      run_id,
      agent_name,
      event_type,
      timestamp,
      parent_event_id,
      previous_event_id,
      data
    FROM events
    WHERE run_id = $1
    ORDER BY timestamp ASC
  `;

  const result = await getPool().query(query, [runId]);
  return result.rows;
}

/**
 * Search events by criteria
 */
export async function searchEvents(
  agentName?: string,
  eventType?: string,
  startTime?: Date,
  endTime?: Date,
  limit: number = 100
): Promise<Event[]> {
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (agentName) {
    conditions.push(`agent_name = $${paramIndex++}`);
    params.push(agentName);
  }

  if (eventType) {
    conditions.push(`event_type = $${paramIndex++}`);
    params.push(eventType);
  }

  if (startTime) {
    conditions.push(`timestamp >= $${paramIndex++}`);
    params.push(startTime);
  }

  if (endTime) {
    conditions.push(`timestamp <= $${paramIndex++}`);
    params.push(endTime);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT
      event_id,
      run_id,
      agent_name,
      event_type,
      timestamp,
      parent_event_id,
      previous_event_id,
      data
    FROM events
    ${whereClause}
    ORDER BY timestamp DESC
    LIMIT $${paramIndex}
  `;

  params.push(limit);

  const result = await getPool().query(query, params);
  return result.rows;
}

/**
 * Get global metrics across all agents
 */
export async function getGlobalMetrics(): Promise<any> {
  const query = `
    SELECT
      COUNT(DISTINCT a.name) as total_agents,
      COUNT(DISTINCT r.run_id) as total_runs,
      COUNT(e.event_id) as total_events,
      COALESCE(SUM(r.total_cost), 0) as total_cost,
      COALESCE(AVG(r.total_cost), 0) as avg_cost_per_run,
      COALESCE(SUM(r.tokens_in), 0) as total_tokens_in,
      COALESCE(SUM(r.tokens_out), 0) as total_tokens_out,
      COALESCE(SUM(r.total_duration_ms), 0) / 3600000.0 as total_duration_hours
    FROM agents a
    LEFT JOIN runs r ON a.name = r.agent_name
    LEFT JOIN events e ON r.run_id = e.run_id
  `;

  const result = await getPool().query(query);
  return result.rows[0];
}

/**
 * Get cost breakdown by model
 */
export async function getCostBreakdown(agentName?: string): Promise<any[]> {
  const agentFilter = agentName ? 'AND e.agent_name = $1' : '';
  const params = agentName ? [agentName] : [];

  const query = `
    SELECT
      e.data->>'model' as model,
      COUNT(*) as call_count,
      SUM((e.data->>'cost')::float) as total_cost,
      SUM((e.data->>'tokens_in')::float) as total_tokens_in,
      SUM((e.data->>'tokens_out')::float) as total_tokens_out,
      AVG((e.data->>'latency_ms')::float) as avg_latency_ms
    FROM events e
    WHERE e.event_type = 'llm_call'
      AND e.data->>'model' IS NOT NULL
      ${agentFilter}
    GROUP BY e.data->>'model'
    ORDER BY total_cost DESC
  `;

  const result = await getPool().query(query, params);
  return result.rows;
}

/**
 * Compare runs
 */
export async function compareRuns(runIds: string[]): Promise<RunDetails[]> {
  const query = `
    SELECT
      r.run_id,
      r.run_name,
      r.agent_name,
      r.environment,
      r.status,
      r.total_duration_ms,
      r.total_cost,
      r.tokens_in,
      r.tokens_out,
      r.metadata,
      r.created_at,
      COUNT(e.event_id) as event_count
    FROM runs r
    LEFT JOIN events e ON r.run_id = e.run_id
    WHERE r.run_id = ANY($1)
    GROUP BY r.run_id
    ORDER BY r.created_at DESC
  `;

  const result = await getPool().query(query, [runIds]);
  return result.rows;
}
