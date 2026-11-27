// Calls the Spring Boot backend: POST /api/ask with {"question": "..."}.
// Returns {answer: string, sources: [{id, question}]}.
//
// VITE_API_BASE_URL is read at build time. When it is empty the request goes to
// the same origin (/api/ask), which the Vite dev/preview proxy forwards to the
// backend. When it is set (e.g. the Lightsail URL in CI), the browser calls the
// backend directly, which requires CORS to be enabled on the backend.
const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')

export async function ask(question, signal) {
  const res = await fetch(`${BASE_URL}/api/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
    signal,
  })

  if (!res.ok) {
    let detail = ''
    try {
      const body = await res.json()
      detail = body.detail || body.message || body.error || ''
    } catch {
      // Body was not JSON; fall back to the status text.
    }
    throw new Error(`Request failed (${res.status}${detail ? `: ${detail}` : res.statusText ? ` ${res.statusText}` : ''})`)
  }

  return res.json()
}
