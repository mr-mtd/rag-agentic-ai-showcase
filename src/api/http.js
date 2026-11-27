// Shared fetch helper for both backends: JSON in and out, a request timeout,
// and readable errors. Backend-specific details stay in each client module.

/** A non-2xx response. `status` is the HTTP status; `detail` comes from the body if it had one. */
export class HttpError extends Error {
  constructor(status, statusText, detail) {
    super(`Request failed (${status}${detail ? `: ${detail}` : statusText ? ` ${statusText}` : ''})`)
    this.name = 'HttpError'
    this.status = status
    this.detail = detail
  }
}

/** The backend did not answer within the timeout. */
export class TimeoutError extends Error {
  constructor(timeoutMs) {
    super(`The request timed out after ${Math.round(timeoutMs / 1000)} seconds.`)
    this.name = 'TimeoutError'
    this.timeoutMs = timeoutMs
  }
}

// Reads `detail` (RFC 9457 problem details, used by both Spring Boot backends),
// then a few common alternatives.
async function readDetail(res) {
  try {
    const body = await res.json()
    return body.detail || body.message || body.error || ''
  } catch {
    return '' // Body was not JSON; the caller falls back to the status text.
  }
}

/**
 * POSTs `body` as JSON and resolves with `{ data, headers }`.
 *
 * Rejects with HttpError for a non-2xx status, TimeoutError when `timeoutMs`
 * passes, the caller's AbortError when `signal` aborts, and fetch's TypeError
 * when the network request itself fails (offline, DNS, CORS).
 */
export async function postJson(url, body, { signal, timeoutMs } = {}) {
  const timeout = new AbortController()
  let timedOut = false
  const timer = timeoutMs
    ? setTimeout(() => {
        timedOut = true
        timeout.abort()
      }, timeoutMs)
    : null
  const combined = signal ? AbortSignal.any([signal, timeout.signal]) : timeout.signal

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: combined,
    })
    if (!res.ok) {
      throw new HttpError(res.status, res.statusText, await readDetail(res))
    }
    return { data: await res.json(), headers: res.headers }
  } catch (err) {
    if (timedOut && err?.name === 'AbortError') throw new TimeoutError(timeoutMs)
    throw err
  } finally {
    clearTimeout(timer)
  }
}
