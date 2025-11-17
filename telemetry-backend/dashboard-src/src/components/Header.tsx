import { Link } from 'react-router-dom'

interface HeaderProps {
  isDarkMode: boolean
  onToggleDarkMode: () => void
}

export default function Header({ isDarkMode, onToggleDarkMode }: HeaderProps) {
  return (
    <header className="bg-navy-500 dark:bg-navy-900 text-white shadow-lg">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <Link to="/analytics" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-bold text-navy-500">
              G
            </div>
            <h1 className="text-2xl font-serif font-bold">GATI</h1>
          </Link>

          <nav className="flex items-center space-x-6">
            <div className="relative group">
              <Link
                to="/analytics"
                className="hover:text-white/80 transition-colors font-medium"
              >
                Analytics
              </Link>
              <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="py-2">
                  <Link
                    to="/analytics"
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                  >
                    Overview
                  </Link>
                  <Link
                    to="/analytics/engagement"
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                  >
                    Engagement
                  </Link>
                  <Link
                    to="/analytics/users"
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                  >
                    Users
                  </Link>
                  <Link
                    to="/analytics/features"
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                  >
                    Feature Adoption
                  </Link>
                  <Link
                    to="/analytics/retention"
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                  >
                    Retention & Growth
                  </Link>
                  <Link
                    to="/analytics/infrastructure"
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                  >
                    Infrastructure
                  </Link>
                </div>
              </div>
            </div>

            <button
              onClick={onToggleDarkMode}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              title="Toggle dark mode"
            >
              {isDarkMode ? (
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l-2.12-2.12a1 1 0 011.414-1.414l2.12 2.12a1 1 0 01-1.414 1.414zM2.05 6.464L4.17 4.343a1 1 0 011.414 1.414L3.464 7.878a1 1 0 11-1.414-1.414zM17.95 6.464a1 1 0 001.414-1.414L16.828 2.05a1 1 0 00-1.414 1.414l2.12 2.12z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
          </nav>
        </div>
      </div>
    </header>
  )
}
