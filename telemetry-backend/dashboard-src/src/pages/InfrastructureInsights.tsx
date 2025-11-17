import { useState, useCallback, useEffect, ReactNode } from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts'
import { apiClient } from '../services/api'
import { InfrastructureInsightsResponse } from '../types'

const tooltipStyles = {
  backgroundColor: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: '8px',
  color: '#e2e8f0',
}

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

function getHeatmapColor(value: number, max: number) {
  const intensity = value / max
  if (intensity < 0.2) return '#10b981'
  if (intensity < 0.4) return '#84cc16'
  if (intensity < 0.6) return '#eab308'
  if (intensity < 0.8) return '#f59e0b'
  return '#ef4444'
}

export default function InfrastructureInsights() {
  const [data, setData] = useState<InfrastructureInsightsResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState(30)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const response = await apiClient.fetchInfrastructureInsights(days)
      setData(response)
      setError(null)
    } catch (err) {
      console.error('Failed to load infrastructure insights', err)
      setError('Unable to load infrastructure insights. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [days])

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

  const maxHourlyEvents = Math.max(...data.events_by_hour.map((h) => h.count), 1)
  const combinedData = [
    ...data.daily_event_volume.map((d) => ({
      date: d.date,
      events: d.total_events_per_day,
      type: 'actual' as const,
    })),
    ...data.projected_growth.map((p) => ({
      date: p.projected_date,
      events: p.projected_events,
      type: 'projected' as const,
    })),
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-navy-600 dark:text-navy-300 font-semibold">
              Infrastructure Insights
            </p>
            <h1 className="text-3xl font-serif font-bold text-slate-900 dark:text-white">
              Infrastructure Insights Dashboard
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Monitor load metrics, event volume, and projected growth.
            </p>
          </div>
          <div>
            <label className="text-sm text-slate-600 dark:text-slate-300 font-medium">
              Days
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="mt-1 block w-full sm:w-auto rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
            </label>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
              Peak Events/Day
            </p>
            <p className="mt-2 text-3xl font-bold text-navy-600 dark:text-navy-200">
              {data.peak_events_per_day.toLocaleString()}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
              Avg Events/Installation/Day
            </p>
            <p className="mt-2 text-3xl font-bold text-navy-600 dark:text-navy-200">
              {data.average_events_per_installation_per_day.toFixed(1)}
            </p>
          </div>
        </div>

        {/* Charts */}
        <ChartCard
          title="Daily Event Volume with Projections"
          subtitle="Historical and projected event volume"
        >
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={combinedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5f5" opacity={0.4} />
              <XAxis
                dataKey="date"
                tickFormatter={formatAxisDate}
                stroke="#94a3b8"
                tick={{ fontSize: 12 }}
              />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={tooltipStyles}
                labelFormatter={formatAxisDate}
              />
              <Area
                type="monotone"
                dataKey="events"
                stroke="#2563eb"
                fill="#2563eb"
                fillOpacity={0.3}
                strokeDasharray={combinedData.some((d) => d.type === 'projected') ? '5 5' : '0'}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Events by Hour of Day"
          subtitle="Average event volume by hour (last 7 days)"
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.events_by_hour}>
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5f5" opacity={0.4} />
              <XAxis
                dataKey="hour"
                stroke="#94a3b8"
                tick={{ fontSize: 12 }}
                label={{ value: 'Hour of Day', position: 'insideBottom', offset: -5 }}
              />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyles} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.events_by_hour.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getHeatmapColor(entry.count, maxHourlyEvents)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Geographic Distribution Placeholder */}
        <ChartCard
          title="Geographic Distribution"
          subtitle="Coming soon - location tracking will be added in a future update"
        >
          <div className="flex items-center justify-center h-64 text-slate-400 dark:text-slate-500">
            <p>Geographic distribution visualization will be available once location tracking is implemented.</p>
          </div>
        </ChartCard>
      </div>
    </div>
  )
}

