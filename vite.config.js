import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Hosted Spring Boot backend on AWS Lightsail.
const DEFAULT_BACKEND = 'https://hybrid-rag.9jn1qt7414py4.us-east-2.cs.amazonlightsail.com'

// The backend does not configure CORS, so during development every request to
// /api is proxied to the backend. Set VITE_API_TARGET to proxy somewhere else,
// e.g. http://localhost:8080 for a backend running on your machine.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_API_TARGET || DEFAULT_BACKEND

  const proxy = {
    '/api': { target, changeOrigin: true, secure: true },
  }

  return {
    plugins: [react()],
    server: { port: 5173, proxy },
    preview: { port: 4173, proxy },
  }
})
