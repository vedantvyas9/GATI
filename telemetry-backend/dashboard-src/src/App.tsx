import { useState, useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import AgentsList from './AgentsList'
import AgentDetail from './AgentDetail'
import './styles/globals.css'

// Lazy load the metrics dashboard
const MetricsDashboard = lazy(() => import('./MetricsDashboard'))

// Lazy load analytics pages
const AnalyticsDashboard = lazy(() => import('./pages/AnalyticsDashboard'))
const EngagementAnalytics = lazy(() => import('./pages/EngagementAnalytics'))
const UserAnalytics = lazy(() => import('./pages/UserAnalytics'))
const FeatureAdoption = lazy(() => import('./pages/FeatureAdoption'))
const RetentionGrowth = lazy(() => import('./pages/RetentionGrowth'))
const InfrastructureInsights = lazy(() => import('./pages/InfrastructureInsights'))

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-navy-500 border-t-transparent"></div>
  </div>
)

function App() {
  // Initialize from localStorage synchronously to prevent flash
  const getInitialDarkMode = () => {
    const savedMode = localStorage.getItem('darkMode')
    if (savedMode !== null) {
      return JSON.parse(savedMode)
    }
    // Default to system preference if no saved preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  const [isDarkMode, setIsDarkMode] = useState(getInitialDarkMode)

  useEffect(() => {
    // Update DOM and localStorage
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode))
  }, [isDarkMode])

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-white dark:bg-slate-900 text-navy-900 dark:text-slate-100 transition-colors">
        <Header isDarkMode={isDarkMode} onToggleDarkMode={toggleDarkMode} />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route
              path="/"
              element={
                <Suspense fallback={<LoadingSpinner />}>
                  <AnalyticsDashboard />
                </Suspense>
              }
            />
            <Route path="/agents/:agentName" element={<AgentDetail />} />
            <Route
              path="/metrics"
              element={
                <Suspense fallback={<LoadingSpinner />}>
                  <MetricsDashboard />
                </Suspense>
              }
            />
            <Route
              path="/analytics"
              element={
                <Suspense fallback={<LoadingSpinner />}>
                  <AnalyticsDashboard />
                </Suspense>
              }
            />
            <Route
              path="/analytics/engagement"
              element={
                <Suspense fallback={<LoadingSpinner />}>
                  <EngagementAnalytics />
                </Suspense>
              }
            />
            <Route
              path="/analytics/users"
              element={
                <Suspense fallback={<LoadingSpinner />}>
                  <UserAnalytics />
                </Suspense>
              }
            />
            <Route
              path="/analytics/features"
              element={
                <Suspense fallback={<LoadingSpinner />}>
                  <FeatureAdoption />
                </Suspense>
              }
            />
            <Route
              path="/analytics/retention"
              element={
                <Suspense fallback={<LoadingSpinner />}>
                  <RetentionGrowth />
                </Suspense>
              }
            />
            <Route
              path="/analytics/infrastructure"
              element={
                <Suspense fallback={<LoadingSpinner />}>
                  <InfrastructureInsights />
                </Suspense>
              }
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App

