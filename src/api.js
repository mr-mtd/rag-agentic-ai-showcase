// Calls the Spring Boot backend: POST /api/ask with {"question": "..."}.
// Returns {answer: string, sources: [{id, question}]}.
export async function ask(question, signal) {
  const res = await fetch('/api/ask', {
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
