import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Apply dark mode class immediately before React renders to prevent flash
const applyDarkModeBeforeRender = () => {
  const savedMode = localStorage.getItem('darkMode')
  if (savedMode !== null) {
    const isDark = JSON.parse(savedMode)
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  } else {
    // Check system preference if no saved preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }
}

// Apply dark mode before React renders
applyDarkModeBeforeRender()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
