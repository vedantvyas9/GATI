import { useState, useCallback, useEffect, ReactNode } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { apiClient } from '../services/api'
import { EngagementAnalyticsResponse } from '../types'

const tooltipStyles = {
  backgroundColor: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: '8px',
  color: '#e2e8f0',
}

const COLORS = ['#2563eb', '#10b981', '#ec4899', '#f59e0b', '#a855f7', '#06b6d4']

const ChartCard = ({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) => (
  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
    <div className="mb-4">
      <p className="text-sm uppercase tracking-wide text-slate-500 font-semibold">
        {title}
      </p>
      {subtitle && (
        <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
      )}
    </div>
    {children}
  </div>
)

function formatAxisDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function EngagementAnalytics() {
  const [data, setData] = useState<EngagementAnalyticsResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const response = await apiClient.fetchEngagementAnalytics()
      setData(response)
      setError(null)
    } catch (err) {
      console.error('Failed to load engagement analytics', err)
      setError('Unable to load engagement analytics. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-navy-500 border-t-transparent" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
        <div className="max-w-lg w-full bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800 rounded-2xl p-8 shadow-lg">
          <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">
            Something went wrong
          </h2>
          <p className="text-slate-600 dark:text-slate-300">{error || 'No data available'}</p>
          <button
            onClick={fetchData}
            className="mt-6 inline-flex items-center px-4 py-2 rounded-lg bg-navy-600 text-white font-medium hover:bg-navy-500"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <p className="text-xs uppercase tracking-wide text-navy-600 dark:text-navy-300 font-semibold">
            Engagement Analytics
          </p>
          <h1 className="text-3xl font-serif font-bold text-slate-900 dark:text-white">
            User Engagement Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Analyze installation activity, event distributions, and MCP adoption.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
              Avg Events/Installation
            </p>
            <p className="mt-2 text-3xl font-bold text-navy-600 dark:text-navy-200">
              {data.average_events_per_installation.toFixed(1)}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
              Avg Events/Agent
            </p>
            <p className="mt-2 text-3xl font-bold text-navy-600 dark:text-navy-200">
              {data.average_events_per_agent.toFixed(1)}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
              MCP Adoption Rate
            </p>
            <p className="mt-2 text-3xl font-bold text-navy-600 dark:text-navy-200">
              {data.mcp_adoption_rate.toFixed(1)}%
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
              Top Installations
            </p>
            <p className="mt-2 text-3xl font-bold text-navy-600 dark:text-navy-200">
              {data.top_installations.length}
            </p>
          </div>
        </div>

        {/* Charts */}
        <div className="space-y-6">
          <ChartCard
            title="Events Per Installation Distribution"
            subtitle="Distribution of lifetime events across installations"
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.events_per_installation_distribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5f5" opacity={0.4} />
                <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyles} />
                <Bar dataKey="count" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Events Today Distribution"
            subtitle="How many installations had different event volumes today"
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.events_today_distribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5f5" opacity={0.4} />
                <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyles} />
                <Bar dataKey="count" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Agents Tracked Distribution"
            subtitle="Distribution of number of agents per installation"
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.agents_tracked_distribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5f5" opacity={0.4} />
                <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyles} />
                <Bar dataKey="count" fill="#ec4899" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="MCP Adoption Rate Over Time"
            subtitle="Percentage of installations using MCP features"
          >
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.mcp_adoption_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5f5" opacity={0.4} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatAxisDate}
                  stroke="#94a3b8"
                  tick={{ fontSize: 12 }}
                />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={tooltipStyles}
                  labelFormatter={formatAxisDate}
                  formatter={(value: number) => `${value.toFixed(1)}%`}
                />
                <Line
                  type="monotone"
                  dataKey="adoption_rate"
                  stroke="#a855f7"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Top Installations Table */}
          <ChartCard
            title="Top 20 Most Active Installations"
            subtitle="Installations ranked by lifetime events"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                      Installation ID
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                      User Email
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                      Lifetime Events
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                      Agents
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                      SDK Version
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                      Last Active
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_installations.map((inst, idx) => (
                    <tr
                      key={inst.installation_id}
                      className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <td className="py-3 px-4 text-slate-900 dark:text-slate-100 font-mono text-xs">
                        {inst.installation_id.substring(0, 8)}...
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {inst.user_email || 'Anonymous'}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-900 dark:text-slate-100 font-semibold">
                        {inst.lifetime_events.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                        {inst.agents_tracked}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {inst.sdk_version || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {inst.last_active
                          ? new Date(inst.last_active).toLocaleDateString()
                          : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </div>
      </div>
    </div>
  )
}

