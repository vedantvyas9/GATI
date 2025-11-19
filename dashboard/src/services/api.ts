import axios, { AxiosInstance } from 'axios'
import {
  Agent,
  Run,
  Event,
  Metrics,
  AgentWithStats,
  RunTimeline,
  ExecutionTrace,
  ExecutionTraceResponseData,
  CostTimestampData,
  TokensTimestampData,
  AgentComparisonData,
  MetricsSummary,
} from '../types'

class APIClient {
  private client: AxiosInstance

  constructor(baseURL?: string) {
    // Determine the base URL for API requests
    // Priority: explicit baseURL > VITE_API_BASE_URL env > default localhost:8000/api
    let defaultBaseURL = baseURL

    if (!defaultBaseURL) {
      // Try to get from Vite environment variable (VITE_API_BASE_URL)
      const envUrl = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined
      if (envUrl && envUrl.trim()) {
        defaultBaseURL = envUrl
      }
    }

    // Default to localhost:8000/api when served as static files (production)
    // This works when dashboard and backend are on different ports
    // In dev mode with Vite, the proxy in vite.config.ts handles /api -> backend
    if (!defaultBaseURL) {
      // Check if we're in development (has Vite dev server) or production (static files)
      const isDev = (import.meta as any).env?.DEV
      if (!isDev) {
        // Production: use full URL to backend (when served via http.server or nginx)
        defaultBaseURL = 'http://localhost:8000/api'
      } else {
        // Development: use relative path (vite proxy will handle it)
      defaultBaseURL = '/api'
      }
    }

    this.client = axios.create({
      baseURL: defaultBaseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  // Health Check
  async healthCheck(): Promise<{ status: string; database: string }> {
    // Health endpoint is at /health (not /api/health), so use root URL
    const healthClient = axios.create({
      baseURL: this.client.defaults.baseURL?.replace('/api', '') || 'http://localhost:8000',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    const response = await healthClient.get('/health')
    return response.data
  }

  // Agents
  async fetchAgents(): Promise<Agent[]> {
    const response = await this.client.get('/agents')
    return response.data
  }

  async fetchAgentDetails(agentName: string): Promise<AgentWithStats> {
    const response = await this.client.get(`/agents/${agentName}`)
    return response.data
  }

  async fetchAgentRuns(
    agentName: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Run[]> {
    const response = await this.client.get(`/agents/${agentName}/runs`, {
      params: { limit, offset },
    })
    return response.data
  }

  async deleteAgent(agentName: string): Promise<void> {
    await this.client.delete(`/agents/${agentName}`)
  }

  // Runs
  async fetchRun(agentName: string, runName: string): Promise<Run> {
    const response = await this.client.get(`/runs/${agentName}/${runName}`)
    return response.data
  }

  async fetchRunTimeline(agentName: string, runName: string): Promise<RunTimeline> {
    const response = await this.client.get(`/runs/${agentName}/${runName}/timeline`)
    return response.data
  }

  async fetchRunTrace(agentName: string, runName: string): Promise<ExecutionTraceResponseData> {
    const response = await this.client.get(`/runs/${agentName}/${runName}/trace`)
    return response.data
  }

  async deleteRun(agentName: string, runName: string): Promise<void> {
    await this.client.delete(`/runs/${agentName}/${runName}`)
  }

  async updateRunName(agentName: string, runName: string, newRunName: string): Promise<Run> {
    const response = await this.client.patch(`/runs/${agentName}/${runName}`, {
      new_run_name: newRunName,
    })
    return response.data
  }

  // Events
  async fetchEventChildren(eventId: string): Promise<Event[]> {
    const response = await this.client.get(`/events/${eventId}/children`)
    return response.data
  }

  // Metrics
  async fetchMetrics(): Promise<MetricsSummary> {
    const response = await this.client.get('/metrics/summary')
    return response.data
  }

  async fetchAgentMetrics(agentName: string): Promise<Record<string, unknown>> {
    const response = await this.client.get(`/agents/${agentName}/metrics`)
    return response.data
  }

  async fetchCostTimeline(days: number = 30): Promise<CostTimestampData[]> {
    const response = await this.client.get('/metrics/cost-timeline', {
      params: { days },
    })
    return response.data
  }

  async fetchTokensTimeline(days: number = 30): Promise<TokensTimestampData[]> {
    const response = await this.client.get('/metrics/tokens-timeline', {
      params: { days },
    })
    return response.data
  }

  async fetchAgentsComparison(): Promise<AgentComparisonData[]> {
    const response = await this.client.get('/metrics/agents-comparison')
    return response.data
  }
}

// Export singleton instance
export const apiClient = new APIClient()
export default APIClient
