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
  ComposedChart,
  Bar,
} from 'recharts'
import { apiClient } from '../services/api'
import { RetentionGrowthResponse } from '../types'

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

export default function RetentionGrowth() {
  const [data, setData] = useState<RetentionGrowthResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const response = await apiClient.fetchRetentionGrowth()
      setData(response)
      setError(null)
    } catch (err) {
      console.error('Failed to load retention and growth data', err)
      setError('Unable to load retention and growth data. Please try again.')
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
            Retention & Growth
          </p>
          <h1 className="text-3xl font-serif font-bold text-slate-900 dark:text-white">
            Retention & Growth Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Analyze user retention, growth rates, and churn indicators.
          </p>
        </div>

        {/* Retention Rates */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Retention Metrics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
                Week 1 Retention
              </p>
              <p className="mt-2 text-3xl font-bold text-navy-600 dark:text-navy-200">
                {data.retention_rates.week_1.toFixed(1)}%
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
                Week 4 Retention
              </p>
              <p className="mt-2 text-3xl font-bold text-navy-600 dark:text-navy-200">
                {data.retention_rates.week_4.toFixed(1)}%
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
                Week 12 Retention
              </p>
              <p className="mt-2 text-3xl font-bold text-navy-600 dark:text-navy-200">
                {data.retention_rates.week_12.toFixed(1)}%
              </p>
            </div>
          </div>

          <ChartCard
            title="Cohort Analysis"
            subtitle="Retention rates by signup week"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                      Signup Week
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                      Week 1 Retention
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                      Week 4 Retention
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                      Week 12 Retention
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.cohort_analysis.map((cohort) => (
                    <tr
                      key={cohort.signup_week}
                      className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <td className="py-3 px-4 text-slate-900 dark:text-slate-100">
                        {new Date(cohort.signup_week).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                        {cohort.week_1_retention.toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                        {cohort.week_4_retention.toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                        {cohort.week_12_retention.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </div>

        {/* Churn Indicators */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Churn Indicators</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
                Inactive 7+ Days
              </p>
              <p className="mt-2 text-3xl font-bold text-red-600 dark:text-red-400">
                {data.churn_indicators.inactive_7_days.toLocaleString()}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
                Inactive 14+ Days
              </p>
              <p className="mt-2 text-3xl font-bold text-orange-600 dark:text-orange-400">
                {data.churn_indicators.inactive_14_days.toLocaleString()}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
                Inactive 30+ Days
              </p>
              <p className="mt-2 text-3xl font-bold text-red-700 dark:text-red-500">
                {data.churn_indicators.inactive_30_days.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Growth Rates */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Growth Metrics</h2>
          <ChartCard
            title="Growth Rates"
            subtitle="Weekly growth rates for installations and users"
          >
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.growth_rates}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5f5" opacity={0.4} />
                <XAxis dataKey="period" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={tooltipStyles}
                  formatter={(value: number) => `${value.toFixed(1)}%`}
                />
                <Line
                  type="monotone"
                  dataKey="installation_growth_rate"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Installations"
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="user_growth_rate"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Users"
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Conversion Rate */}
        <ChartCard
          title="Installation to User Conversion Rate"
          subtitle="Percentage of installations that are authenticated users"
        >
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.conversion_rate_trend}>
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
              <Area
                type="monotone"
                dataKey="conversion_rate"
                stroke="#a855f7"
                fill="#a855f7"
                fillOpacity={0.3}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* New vs Returning */}
        <ChartCard
          title="New vs Returning Installations"
          subtitle="Daily breakdown of new and returning installations"
        >
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={data.new_vs_returning}>
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
              <Bar dataKey="new_installations" fill="#10b981" name="New" />
              <Bar dataKey="returning_installations" fill="#2563eb" name="Returning" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}

