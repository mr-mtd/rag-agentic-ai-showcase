import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TransportationAssistant from './TransportationAssistant.jsx'
import { sendChat } from '../../api/orchestratorClient.js'

vi.mock('../../api/orchestratorClient.js', async (importOriginal) => ({
  ...(await importOriginal()),
  sendChat: vi.fn(),
}))

const { HttpError, TimeoutError } = await import('../../api/http.js')

const CONVERSATION = '7a35d7b7-936b-41f9-addc-22ccb431565b'

function reply(overrides = {}) {
  return {
    conversationId: CONVERSATION,
    answer: 'LD-000420 is **in transit** with Swift Freight.',
    model: 'gpt-5-mini',
    toolCalls: [{ tool: 'getLoadStatus', arguments: '{"loadNumber":"420"}', outcome: 'success', durationMs: 19 }],
    usage: { promptTokens: 250, completionTokens: 50, totalTokens: 300 },
    durationMs: 1903,
    requestId: 'req-123',
    latencyMs: 2050,
    ...overrides,
  }
}

function deferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function setup() {
  const user = userEvent.setup()
  render(<TransportationAssistant />)
  return { user, input: screen.getByLabelText(/message the transportation assistant/i) }
}

describe('TransportationAssistant', () => {
  beforeEach(() => {
    sendChat.mockReset()
  })

  it('sends a message, renders the Markdown answer and starts without a conversationId', async () => {
    sendChat.mockResolvedValue(reply())
    const { user, input } = setup()

    await user.type(input, '  Where is load 420?  {Enter}')

    expect(sendChat).toHaveBeenCalledWith(
      { message: 'Where is load 420?', conversationId: null },
      { signal: expect.any(AbortSignal) },
    )
    expect(await screen.findByText('in transit', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Where is load 420?')).toBeInTheDocument()
    expect(input).toHaveValue('')
    expect(screen.getByText('7a35d7b7')).toBeInTheDocument()
  })

  it('keeps the conversationId for follow-up messages', async () => {
    sendChat.mockResolvedValueOnce(reply()).mockResolvedValueOnce(reply({ answer: 'Swift Freight, MC155433.' }))
    const { user, input } = setup()

    await user.type(input, 'Where is load 420?{Enter}')
    await screen.findByText('in transit')
    await user.type(input, 'Who is the carrier?{Enter}')

    expect(await screen.findByText('Swift Freight, MC155433.')).toBeInTheDocument()
    expect(sendChat).toHaveBeenLastCalledWith(
      { message: 'Who is the carrier?', conversationId: CONVERSATION },
      expect.anything(),
    )
  })

  it('starts a new conversation without the old id', async () => {
    sendChat.mockResolvedValue(reply())
    const { user, input } = setup()

    await user.type(input, 'Where is load 420?{Enter}')
    await screen.findByText('in transit')
    await user.click(screen.getByRole('button', { name: 'New conversation' }))

    expect(screen.queryByText('in transit')).not.toBeInTheDocument()
    expect(screen.getByText('Try an example')).toBeInTheDocument()

    await user.type(input, 'Fresh start{Enter}')
    expect(sendChat).toHaveBeenLastCalledWith({ message: 'Fresh start', conversationId: null }, expect.anything())
  })

  it('renders GFM tables and lists from the answer', async () => {
    sendChat.mockResolvedValue(
      reply({ answer: '| Load | Hours late |\n| --- | --- |\n| LD-000420 | 3.4 |\n\n- first\n- second' }),
    )
    const { user, input } = setup()

    await user.type(input, 'Late loads?{Enter}')

    const table = await screen.findByRole('table')
    expect(within(table).getByRole('columnheader', { name: 'Hours late' })).toBeInTheDocument()
    expect(within(table).getByRole('cell', { name: 'LD-000420' })).toBeInTheDocument()
    expect(screen.getByText('second').tagName).toBe('LI')
  })

  it('does not render raw HTML from the answer', async () => {
    sendChat.mockResolvedValue(reply({ answer: 'Hi <img src=x onerror="alert(1)"> there' }))
    const { user, input } = setup()

    await user.type(input, 'xss?{Enter}')
    await screen.findByText(/Hi/)

    expect(document.querySelector('.markdown img')).toBeNull()
  })

  it('shows a loading state and ignores duplicate submissions while waiting', async () => {
    const pending = deferred()
    sendChat.mockReturnValue(pending.promise)
    const { user, input } = setup()

    await user.type(input, 'Slow question{Enter}')
    expect(screen.getByRole('button', { name: 'Thinking…' })).toBeDisabled()
    expect(screen.getByText(/waiting for the orchestrator/i)).toBeInTheDocument()

    await user.type(input, 'Second question{Enter}')
    expect(sendChat).toHaveBeenCalledTimes(1)

    pending.resolve(reply())
    expect(await screen.findByText('in transit')).toBeInTheDocument()
    expect(screen.queryByText(/waiting for the orchestrator/i)).not.toBeInTheDocument()
  })

  it('sends an example prompt when clicked', async () => {
    sendChat.mockResolvedValue(reply())
    const { user } = setup()

    await user.click(screen.getByRole('button', { name: /which loads from texas/i }))

    expect(sendChat).toHaveBeenCalledWith(
      { message: 'Which loads from Texas are running more than 4 hours late?', conversationId: null },
      expect.anything(),
    )
  })

  it('offers examples for each MCP tool', () => {
    setup()
    for (const tool of ['getLoadStatus', 'getCarrierDetails', 'findDelayedShipments']) {
      expect(screen.getByText(tool)).toBeInTheDocument()
    }
  })

  it.each([
    [new HttpError(503, '', 'MCP server unavailable'), /MCP tool server is unavailable/],
    [new HttpError(502, '', 'boom'), /language model call failed/],
    [new TimeoutError(60000), /did not answer within 60 seconds/],
    [new TypeError('Failed to fetch'), /could not reach the transportation orchestrator/i],
  ])('explains %s and lets the user retry', async (error, message) => {
    sendChat.mockRejectedValueOnce(error).mockResolvedValueOnce(reply())
    const { user, input } = setup()

    await user.type(input, 'Where is load 420?{Enter}')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(message)
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled() // input was cleared

    await user.click(within(alert).getByRole('button', { name: 'Retry' }))

    expect(await screen.findByText('in transit')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getAllByText('Where is load 420?')).toHaveLength(1)
    expect(sendChat).toHaveBeenCalledTimes(2)
  })

  it('aborts an in-flight request when a new conversation starts', async () => {
    let signal
    sendChat.mockImplementation((_body, opts) => {
      signal = opts.signal
      return new Promise(() => {})
    })
    const { user, input } = setup()

    await user.type(input, 'Slow{Enter}')
    await user.click(screen.getByRole('button', { name: 'New conversation' }))

    expect(signal.aborted).toBe(true)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument())
    expect(screen.queryByText(/waiting for the orchestrator/i)).not.toBeInTheDocument()
  })
})
