import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Hosted backends. Each is used only by the dev and preview servers; production
// builds use VITE_API_BASE_URL and VITE_ORCHESTRATOR_BASE_URL instead.
const DEFAULT_RAG_BACKEND = 'https://hybrid-rag.9jn1qt7414py4.us-east-2.cs.amazonlightsail.com'
const DEFAULT_ORCHESTRATOR = 'https://d23pzgqslfrw1a.cloudfront.net'

// The browser only talks to the Vite server, which forwards API calls to the
// backends. The Origin header is dropped so a backend's CORS allowlist (which
// lists the deployed site, not localhost) doesn't reject proxied requests.
function proxyTo(target) {
  return {
    target,
    changeOrigin: true,
    secure: true,
    configure: (proxy) => proxy.on('proxyReq', (req) => req.removeHeader('origin')),
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // Order matters: the more specific /api/v1 (orchestrator) must come before
  // /api (RAG service, POST /api/ask).
  const proxy = {
    '/api/v1': proxyTo(env.VITE_ORCHESTRATOR_TARGET || DEFAULT_ORCHESTRATOR),
    '/api': proxyTo(env.VITE_API_TARGET || DEFAULT_RAG_BACKEND),
  }

  return {
    plugins: [react()],
    server: { port: 5173, proxy },
    preview: { port: 4173, proxy },
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.js',
      restoreMocks: true,
      unstubEnvs: true,
      unstubGlobals: true,
    },
  }
})
