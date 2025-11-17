import { useState, useCallback, useEffect, ReactNode } from 'react'
import {
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
} from 'recharts'
import { apiClient } from '../services/api'
import { UserAnalyticsResponse } from '../types'

const tooltipStyles = {
  backgroundColor: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: '8px',
  color: '#e2e8f0',
}

const COLORS = ['#2563eb', '#10b981', '#ec4899']

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

export default function UserAnalytics() {
  const [data, setData] = useState<UserAnalyticsResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('total_events')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const response = await apiClient.fetchUserAnalytics(page, 50, search || undefined, sortBy)
      setData(response)
      setError(null)
    } catch (err) {
      console.error('Failed to load user analytics', err)
      setError('Unable to load user analytics. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [page, search, sortBy])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-navy-500 border-t-transparent" />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
        <div className="max-w-lg w-full bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800 rounded-2xl p-8 shadow-lg">
          <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">
            Something went wrong
          </h2>
          <p className="text-slate-600 dark:text-slate-300">{error}</p>
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

  if (!data) return null

  const segmentData = [
    { name: 'Hobbyist', value: data.segment_counts.hobbyist },
    { name: 'Professional', value: data.segment_counts.professional },
    { name: 'Enterprise', value: data.segment_counts.enterprise },
  ]

  const topUsersData = data.top_power_users.map((user) => ({
    name: user.email.split('@')[0],
    events: user.total_events,
  }))

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <p className="text-xs uppercase tracking-wide text-navy-600 dark:text-navy-300 font-semibold">
            User Analytics
          </p>
          <h1 className="text-3xl font-serif font-bold text-slate-900 dark:text-white">
            Authenticated Users Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Analyze user segments, power users, and user engagement metrics.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
              Total Users
            </p>
            <p className="mt-2 text-3xl font-bold text-navy-600 dark:text-navy-200">
              {data.total_users.toLocaleString()}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
              Hobbyist
            </p>
            <p className="mt-2 text-3xl font-bold text-navy-600 dark:text-navy-200">
              {data.segment_counts.hobbyist.toLocaleString()}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
              Professional
            </p>
            <p className="mt-2 text-3xl font-bold text-navy-600 dark:text-navy-200">
              {data.segment_counts.professional.toLocaleString()}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
              Enterprise
            </p>
            <p className="mt-2 text-3xl font-bold text-navy-600 dark:text-navy-200">
              {data.segment_counts.enterprise.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard
            title="User Segmentation"
            subtitle="Distribution of users by engagement level"
          >
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={segmentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {segmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyles} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Top 10 Power Users"
            subtitle="Users with highest total events"
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topUsersData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5f5" opacity={0.4} />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyles} />
                <Bar dataKey="events" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Users Table */}
        <ChartCard
          title="All Authenticated Users"
          subtitle={`Page ${data.page} of ${data.total_pages} (${data.total_count} total users)`}
        >
          <div className="mb-4 flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="Search by email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
            />
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value)
                setPage(1)
              }}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
            >
              <option value="total_events">Sort by Events</option>
              <option value="email">Sort by Email</option>
              <option value="installations">Sort by Installations</option>
              <option value="total_agents">Sort by Agents</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                    Email
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                    Installations
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                    Agents
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                    Total Events
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                    MCP Queries
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                    Last Active
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((user) => (
                  <tr
                    key={user.email}
                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <td className="py-3 px-4 text-slate-900 dark:text-slate-100">
                      {user.email}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                      {user.installations}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                      {user.total_agents}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-900 dark:text-slate-100 font-semibold">
                      {user.total_events.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                      {user.total_mcp_queries.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      {user.last_active
                        ? new Date(user.last_active).toLocaleDateString()
                        : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.total_pages > 1 && (
            <div className="mt-4 flex justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-slate-600 dark:text-slate-400">
                Page {page} of {data.total_pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                disabled={page === data.total_pages}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  )
}

