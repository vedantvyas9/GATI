import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')
  
  // Determine backend URL - check for VITE_API_BASE_URL or VITE_BACKEND_URL
  const backendUrl = env.VITE_API_BASE_URL?.replace('/api', '') || 
                     env.VITE_BACKEND_URL || 
                     'http://localhost:8000'

  return {
    plugins: [react()],
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
