import { Agent } from '../types'

interface AgentOverviewProps {
  agent: Agent
}

export default function AgentOverview({ agent }: AgentOverviewProps) {
  return (
    <div className="space-y-6">
      {/* Agent Information */}
      <div className="card">
        <h2 className="text-xl font-serif font-bold text-navy-900 dark:text-white mb-4">
          Agent Information
        </h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Name</p>
            <p className="text-lg font-semibold text-navy-900 dark:text-white">
              {agent.name}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Created</p>
            <p className="text-gray-700 dark:text-gray-300">
              {new Date(agent.created_at).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Total Runs</p>
          <p className="text-4xl font-bold text-navy-600 dark:text-navy-400">
            {agent.total_runs || 0}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Total Events</p>
          <p className="text-4xl font-bold text-navy-600 dark:text-navy-400">
            {agent.total_events || 0}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Total Cost</p>
          <p className="text-4xl font-bold text-navy-600 dark:text-navy-400">
            ${(agent.total_cost || 0).toFixed(4)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Avg Cost/Run</p>
          <p className="text-4xl font-bold text-navy-600 dark:text-navy-400">
            ${(agent.avg_cost || 0).toFixed(4)}
          </p>
        </div>
      </div>
    </div>
  )
}
