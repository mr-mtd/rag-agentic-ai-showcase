// Build-time configuration. Vite inlines import.meta.env.VITE_* values when the
// app is built, so nothing here may be a secret: API keys live on the backends.
//
// Each backend has its own base URL so the two integrations can be deployed and
// changed independently. An empty value means "same origin": the request goes to
// a relative path, which the Vite dev/preview proxy (or CloudFront in production)
// forwards to the right backend.

const trimSlashes = (value) => (value || '').trim().replace(/\/+$/, '')

const toMs = (value, fallback) => {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export const config = {
  rag: {
    baseUrl: trimSlashes(import.meta.env.VITE_API_BASE_URL),
    timeoutMs: toMs(import.meta.env.VITE_API_TIMEOUT_MS, 60_000),
  },
  orchestrator: {
    baseUrl: trimSlashes(import.meta.env.VITE_ORCHESTRATOR_BASE_URL),
    timeoutMs: toMs(import.meta.env.VITE_ORCHESTRATOR_TIMEOUT_MS, 60_000),
  },
}
