import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// The Spring Boot backend does not configure CORS, so in development every
// request to /api is proxied to the backend. Set VITE_API_TARGET to point the
// proxy somewhere other than a backend running locally on port 8080.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_API_TARGET || 'http://localhost:8080'

  const proxy = {
    '/api': { target, changeOrigin: true, secure: true },
  }

  return {
    plugins: [react()],
    server: { port: 5173, proxy },
    preview: { port: 4173, proxy },
  }
})
