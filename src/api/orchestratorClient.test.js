import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// config.js reads the environment when first imported, so each test re-imports.
async function loadClient(env = {}) {
  vi.resetModules()
  vi.stubEnv('VITE_ORCHESTRATOR_BASE_URL', env.baseUrl ?? '')
  if (env.timeoutMs) vi.stubEnv('VITE_ORCHESTRATOR_TIMEOUT_MS', String(env.timeoutMs))
  const client = await import('./orchestratorClient.js')
  const http = await import('./http.js')
  return { ...client, ...http }
}

const REPLY = {
  conversationId: '7a35d7b7-936b-41f9-addc-22ccb431565b',
  answer: 'LD-000420 is in transit with Swift Freight, 3.4 hours late.',
  model: 'gpt-5-mini',
  toolCalls: [{ tool: 'getLoadStatus', arguments: '{"loadNumber":"420"}', outcome: 'success', durationMs: 19 }],
  usage: { promptTokens: 250, completionTokens: 50, totalTokens: 300 },
  durationMs: 1903,
}

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  })
}

describe('sendChat', () => {
  let fetchMock

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('POSTs only the message when starting a new conversation', async () => {
    const { sendChat } = await loadClient()
    fetchMock.mockResolvedValue(jsonResponse(REPLY, { headers: { 'X-Request-Id': 'req-1' } }))

    const reply = await sendChat({ message: 'Where is load 420?' })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/v1/chat')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ message: 'Where is load 420?' })
    expect(reply).toMatchObject(REPLY)
    expect(reply.requestId).toBe('req-1')
    expect(reply.latencyMs).toEqual(expect.any(Number))
  })

  it('sends the conversationId back to continue a conversation', async () => {
    const { sendChat } = await loadClient({ baseUrl: 'https://orch.example.com/' })
    fetchMock.mockResolvedValue(jsonResponse(REPLY))

    const reply = await sendChat({ message: 'And its carrier?', conversationId: REPLY.conversationId })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://orch.example.com/api/v1/chat')
    expect(JSON.parse(init.body)).toEqual({ message: 'And its carrier?', conversationId: REPLY.conversationId })
    expect(reply.requestId).toBeNull()
  })

  it('treats a missing toolCalls list as no tool calls', async () => {
    const { sendChat } = await loadClient()
    fetchMock.mockResolvedValue(jsonResponse({ ...REPLY, toolCalls: undefined }))

    expect((await sendChat({ message: 'hi' })).toolCalls).toEqual([])
  })

  it('rejects with HttpError carrying the problem detail', async () => {
    const { sendChat, HttpError } = await loadClient()
    fetchMock.mockResolvedValue(
      jsonResponse({ title: 'Service Unavailable', status: 503, detail: 'MCP server unavailable' }, { status: 503 }),
    )

    const err = await sendChat({ message: 'hi' }).catch((e) => e)
    expect(err).toBeInstanceOf(HttpError)
    expect(err.status).toBe(503)
    expect(err.detail).toBe('MCP server unavailable')
  })

  it('rejects with TimeoutError when the orchestrator is too slow', async () => {
    vi.useFakeTimers()
    const { sendChat, TimeoutError } = await loadClient({ timeoutMs: 5000 })
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
        }),
    )

    const pending = sendChat({ message: 'slow' }).catch((e) => e)
    await vi.advanceTimersByTimeAsync(5000)
    const err = await pending

    expect(err).toBeInstanceOf(TimeoutError)
    expect(err.message).toBe('The request timed out after 5 seconds.')
  })

  it('passes a caller abort through as an AbortError, not a timeout', async () => {
    const { sendChat, TimeoutError } = await loadClient()
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
        }),
    )
    const controller = new AbortController()

    const pending = sendChat({ message: 'hi' }, { signal: controller.signal }).catch((e) => e)
    controller.abort()
    const err = await pending

    expect(err.name).toBe('AbortError')
    expect(err).not.toBeInstanceOf(TimeoutError)
  })
})

describe('describeChatError', () => {
  it.each([
    [400, 'message: must not be blank', 'The message was rejected: message: must not be blank'],
    [502, 'Model call failed', 'The language model call failed (502). Please try again in a moment.'],
    [503, 'MCP down', 'The MCP tool server is unavailable right now (503). Please try again in a few seconds.'],
    [504, '', 'The request took too long and the gateway timed out (504). Please try again.'],
    [500, 'Boom', 'Request failed (500: Boom)'],
  ])('explains HTTP %i', async (status, detail, expected) => {
    const { describeChatError, HttpError } = await loadClient()
    expect(describeChatError(new HttpError(status, '', detail))).toBe(expected)
  })

  it('explains timeouts and network failures', async () => {
    const { describeChatError, TimeoutError } = await loadClient()
    expect(describeChatError(new TimeoutError(60000))).toMatch(/did not answer within 60 seconds/)
    expect(describeChatError(new TypeError('Failed to fetch'))).toMatch(/could not reach the transportation orchestrator/i)
  })
})
