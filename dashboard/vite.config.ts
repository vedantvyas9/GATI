import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')
  
  // Determine backend URL - check for VITE_API_BASE_URL or VITE_BACKEND_URL
  const backendUrl = env.VITE_API_BASE_URL?.replace('/api', '') || 
                     env.VITE_BACKEND_URL || 
                     'http://localhost:8000'

  return {
    plugins: [
      react(),
      // SPA fallback plugin for dev server
      {
        name: 'spa-fallback',
        configureServer(server) {
          return () => {
            // Add middleware at the end to catch all unmatched routes
            server.middlewares.use((req, res, next) => {
              // Only handle GET requests
              if (req.method !== 'GET') {
                return next()
              }

              const url = req.url || ''
              
              // Skip API routes
              if (url.startsWith('/api')) {
                return next()
              }
              
              // Skip requests for files with extensions
              if (url.includes('.') && !url.endsWith('.html')) {
                return next()
              }
              
              // Skip Vite internal paths
              if (url.startsWith('/@') || url.startsWith('/node_modules')) {
                return next()
              }
              
              // Skip root
              if (url === '/' || url === '/index.html') {
                return next()
              }
              
              // For SPA routes, serve index.html
              try {
                const indexHtml = readFileSync(resolve(__dirname, 'index.html'), 'utf-8')
                res.setHeader('Content-Type', 'text/html')
                res.statusCode = 200
                res.end(indexHtml)
              } catch (err) {
                next()
              }
            })
          }
        }
      }
    ],
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '/api')
        }
      }
    },
    // Ensure proper handling of SPA routes in preview mode
    preview: {
      port: 3000,
      host: '0.0.0.0'
    }
  }
})
