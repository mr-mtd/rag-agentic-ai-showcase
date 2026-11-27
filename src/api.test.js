import { beforeEach, describe, expect, it, vi } from 'vitest'

// BASE_URL is read when api.js is first imported, so each test re-imports the
// module after setting the environment it needs.
async function loadApi(baseUrl = '') {
  vi.resetModules()
  vi.stubEnv('VITE_API_BASE_URL', baseUrl)
  return import('./api.js')
}

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
}

describe('ask', () => {
  let fetchMock

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  it('POSTs the question as JSON to /api/ask on the same origin by default', async () => {
    const { ask } = await loadApi('')
    const payload = { answer: 'Use a single partition.', sources: [{ id: '7', question: 'Ordering?' }] }
    fetchMock.mockResolvedValue(jsonResponse(payload))
    const signal = new AbortController().signal

    const result = await ask('How do I keep ordering?', signal)

    expect(result).toEqual(payload)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/ask')
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(JSON.parse(init.body)).toEqual({ question: 'How do I keep ordering?' })
    expect(init.signal).toBe(signal)
  })

  it('prefixes VITE_API_BASE_URL and strips trailing slashes', async () => {
    const { ask } = await loadApi('https://backend.example.com//')
    fetchMock.mockResolvedValue(jsonResponse({ answer: 'ok', sources: [] }))

    await ask('q')

    expect(fetchMock.mock.calls[0][0]).toBe('https://backend.example.com/api/ask')
  })

  it.each([
    [{ detail: 'Question is too long' }, 'Request failed (400: Question is too long)'],
    [{ message: 'Bad input' }, 'Request failed (400: Bad input)'],
    [{ error: 'Bad Request' }, 'Request failed (400: Bad Request)'],
  ])('uses the error detail from a JSON error body %j', async (body, expected) => {
    const { ask } = await loadApi('')
    fetchMock.mockResolvedValue(jsonResponse(body, { status: 400, statusText: 'Bad Request' }))

    await expect(ask('q')).rejects.toThrow(expected)
  })

  it('falls back to the status text when the error body is not JSON', async () => {
    const { ask } = await loadApi('')
    fetchMock.mockResolvedValue(
      new Response('<html>oops</html>', { status: 502, statusText: 'Bad Gateway' }),
    )

    await expect(ask('q')).rejects.toThrow('Request failed (502 Bad Gateway)')
  })

  it('reports just the status code when there is no detail or status text', async () => {
    const { ask } = await loadApi('')
    fetchMock.mockResolvedValue(new Response('', { status: 503 }))

    await expect(ask('q')).rejects.toThrow(/^Request failed \(503\)$/)
  })

  it('lets network errors propagate unchanged', async () => {
    const { ask } = await loadApi('')
    const networkError = new TypeError('Failed to fetch')
    fetchMock.mockRejectedValue(networkError)

    await expect(ask('q')).rejects.toBe(networkError)
  })
})
