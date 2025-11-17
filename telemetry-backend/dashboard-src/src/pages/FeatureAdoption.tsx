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
import { FeatureAdoptionResponse } from '../types'

const tooltipStyles = {
  backgroundColor: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: '8px',
  color: '#e2e8f0',
}

const COLORS = ['#2563eb', '#10b981', '#ec4899', '#f59e0b', '#a855f7', '#06b6d4', '#ef4444', '#8b5cf6']

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

export default function FeatureAdoption() {
  const [data, setData] = useState<FeatureAdoptionResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const response = await apiClient.fetchFeatureAdoption()
      setData(response)
      setError(null)
    } catch (err) {
      console.error('Failed to load feature adoption', err)
      setError('Unable to load feature adoption data. Please try again.')
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

  // Prepare framework adoption trend data for multi-line chart
  const frameworkNames = Array.from(
    new Set(data.framework_adoption_trend.flatMap((point) => Object.keys(point.framework_counts)))
  )
  const frameworkTrendData = data.framework_adoption_trend.map((point) => {
    const result: any = { date: point.date }
    frameworkNames.forEach((name) => {
      result[name] = point.framework_counts[name] || 0
    })
    return result
  })

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <p className="text-xs uppercase tracking-wide text-navy-600 dark:text-navy-300 font-semibold">
            Feature Adoption
          </p>
          <h1 className="text-3xl font-serif font-bold text-slate-900 dark:text-white">
            Feature Adoption Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Track MCP adoption, framework usage, and SDK version distribution.
          </p>
        </div>

        {/* MCP Analytics Section */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">MCP Analytics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
                Total MCP Queries
              </p>
              <p className="mt-2 text-3xl font-bold text-navy-600 dark:text-navy-200">
                {data.total_mcp_queries.toLocaleString()}
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
                Avg Queries/User
              </p>
              <p className="mt-2 text-3xl font-bold text-navy-600 dark:text-navy-200">
                {data.average_mcp_queries_per_user.toFixed(1)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard
              title="MCP Adoption Rate Over Time"
              subtitle="Percentage of installations using MCP"
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

            <ChartCard
              title="MCP Usage Distribution"
              subtitle="Distribution of MCP query volumes"
            >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.mcp_usage_distribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5f5" opacity={0.4} />
                  <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyles} />
                  <Bar dataKey="count" fill="#a855f7" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>

        {/* Framework Analytics Section */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Framework Analytics</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <ChartCard
              title="Framework Distribution"
              subtitle="Installations using each framework"
            >
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.framework_distribution.slice(0, 8)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="installations_count"
                  >
                    {data.framework_distribution.slice(0, 8).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyles} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Framework Adoption Trends"
              subtitle="Framework usage over time"
            >
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={frameworkTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5f5" opacity={0.4} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatAxisDate}
                    stroke="#94a3b8"
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={tooltipStyles}
                    labelFormatter={formatAxisDate}
                  />
                  <Legend />
                  {frameworkNames.slice(0, 5).map((name, idx) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={name}
                      stroke={COLORS[idx % COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <ChartCard
            title="Framework Statistics"
            subtitle="Detailed framework usage metrics"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                      Framework
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                      Installations
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                      Total Events
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.framework_distribution.map((framework) => (
                    <tr
                      key={framework.name}
                      className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <td className="py-3 px-4 text-slate-900 dark:text-slate-100 font-semibold">
                        {framework.name}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                        {framework.installations_count.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                        {framework.total_events.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </div>

        {/* SDK Version Analytics Section */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">SDK Version Analytics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
                Latest Version Adoption
              </p>
              <p className="mt-2 text-3xl font-bold text-navy-600 dark:text-navy-200">
                {data.latest_version_adoption_rate.toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard
              title="Version Distribution"
              subtitle="Current SDK version usage"
            >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.version_distribution.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5f5" opacity={0.4} />
                  <XAxis dataKey="version" stroke="#94a3b8" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyles} />
                  <Bar dataKey="count" fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Version Adoption Timeline"
              subtitle="When users upgraded to each version"
            >
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.version_adoption_timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5f5" opacity={0.4} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatAxisDate}
                    stroke="#94a3b8"
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={tooltipStyles}
                    labelFormatter={formatAxisDate}
                  />
                  <Line
                    type="monotone"
                    dataKey="installations"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      </div>
    </div>
  )
}

