import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import KnowledgeAssistant from './KnowledgeAssistant.jsx'
import { ask } from '../../api/ragClient.js'

vi.mock('../../api/ragClient.js', () => ({ ask: vi.fn() }))

const RESULT = {
  answer: 'Kafka only guarantees ordering within a partition [Source 1].',
  sources: [
    { id: '42', question: 'Does Kafka preserve message order?' },
    { id: '', question: 'How do keys map to partitions?' },
  ],
}

// A promise the test resolves or rejects by hand, to observe the loading state.
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
  render(<KnowledgeAssistant />)
  return {
    user,
    input: screen.getByLabelText(/please ask a question about kafka/i),
    askButton: screen.getByRole('button', { name: 'Ask' }),
  }
}

describe('KnowledgeAssistant', () => {
  beforeEach(() => {
    ask.mockReset()
  })

  it('renders the form with the Ask button disabled until a question is typed', async () => {
    const { user, input, askButton } = setup()

    expect(screen.getByRole('heading', { level: 2, name: 'Kafka Hybrid RAG' })).toBeInTheDocument()
    expect(input).toHaveFocus()
    expect(askButton).toBeDisabled()

    await user.type(input, '   ')
    expect(askButton).toBeDisabled()

    await user.type(input, 'What is a partition?')
    expect(askButton).toBeEnabled()
  })

  it('limits questions to 4000 characters, matching the backend', () => {
    const { input } = setup()
    expect(input).toHaveAttribute('maxLength', '4000')
  })

  it('submits the trimmed question and shows the answer with numbered sources', async () => {
    ask.mockResolvedValue(RESULT)
    const { user, input, askButton } = setup()

    await user.type(input, '  Does Kafka keep order?  ')
    await user.click(askButton)

    expect(ask).toHaveBeenCalledTimes(1)
    expect(ask).toHaveBeenCalledWith('Does Kafka keep order?', expect.any(AbortSignal))

    expect(await screen.findByText(RESULT.answer)).toBeInTheDocument()
    expect(screen.getByText('Does Kafka keep order?', { selector: '.asked' })).toBeInTheDocument()

    const sources = screen.getAllByRole('listitem')
    expect(sources).toHaveLength(2)
    expect(sources[0]).toHaveTextContent('Source 1')
    expect(sources[0]).toHaveTextContent('Does Kafka preserve message order?')
    expect(sources[0]).toHaveTextContent('id 42')
    expect(sources[1]).toHaveTextContent('Source 2')
    expect(sources[1]).not.toHaveTextContent(/id\s/)
  })

  it('hides the Sources heading when the backend returns no sources', async () => {
    ask.mockResolvedValue({ answer: 'No matches found.', sources: [] })
    const { user, input } = setup()

    await user.type(input, 'Unrelated question')
    await user.click(screen.getByRole('button', { name: 'Ask' }))

    expect(await screen.findByText('No matches found.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Sources' })).not.toBeInTheDocument()
  })

  it('shows a loading state while waiting and ignores repeat submits', async () => {
    const pending = deferred()
    ask.mockReturnValue(pending.promise)
    const { user, input } = setup()

    await user.type(input, 'Slow question')
    await user.click(screen.getByRole('button', { name: 'Ask' }))

    const busyButton = screen.getByRole('button', { name: 'Searching…' })
    expect(busyButton).toBeDisabled()
    expect(screen.getByText(/running hybrid search/i)).toBeInTheDocument()

    await user.type(input, '{Control>}{Enter}{/Control}')
    expect(ask).toHaveBeenCalledTimes(1)

    pending.resolve(RESULT)
    expect(await screen.findByText(RESULT.answer)).toBeInTheDocument()
    expect(screen.queryByText(/running hybrid search/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ask' })).toBeEnabled()
  })

  it.each([
    ['Ctrl', '{Control>}{Enter}{/Control}'],
    ['Cmd', '{Meta>}{Enter}{/Meta}'],
  ])('submits with %s+Enter but not with plain Enter', async (_name, shortcut) => {
    ask.mockResolvedValue(RESULT)
    const { user, input } = setup()

    await user.type(input, 'Keyboard question')
    await user.keyboard('{Enter}')
    expect(ask).not.toHaveBeenCalled()
    expect(input).toHaveValue('Keyboard question\n')

    await user.keyboard(shortcut)
    expect(ask).toHaveBeenCalledWith('Keyboard question', expect.any(AbortSignal))
  })

  it('fills in and asks an example question when one is clicked, then hides the examples', async () => {
    ask.mockResolvedValue(RESULT)
    const { user, input } = setup()
    const example = 'What happens when a consumer group rebalances?'

    expect(screen.getByText('Try an example')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: example }))

    expect(input).toHaveValue(example)
    expect(ask).toHaveBeenCalledWith(example, expect.any(AbortSignal))
    expect(await screen.findByText(RESULT.answer)).toBeInTheDocument()
    expect(screen.queryByText('Try an example')).not.toBeInTheDocument()
  })

  it('shows the error message from a failed request', async () => {
    ask.mockRejectedValue(new Error('Request failed (500 Internal Server Error)'))
    const { user, input } = setup()

    await user.type(input, 'Broken question')
    await user.click(screen.getByRole('button', { name: 'Ask' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Request failed (500 Internal Server Error)')
    expect(screen.getByRole('button', { name: 'Ask' })).toBeEnabled()
  })

  it('explains when the backend cannot be reached', async () => {
    ask.mockRejectedValue(new TypeError('Failed to fetch'))
    const { user, input } = setup()

    await user.type(input, 'Offline question')
    await user.click(screen.getByRole('button', { name: 'Ask' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not reach the backend/i)
  })

  it('does not show an error for an aborted request', async () => {
    ask.mockRejectedValue(new DOMException('The operation was aborted.', 'AbortError'))
    const { user, input } = setup()

    await user.type(input, 'Aborted question')
    await user.click(screen.getByRole('button', { name: 'Ask' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Ask' })).toBeEnabled())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('clears the previous error when a new question succeeds', async () => {
    ask.mockRejectedValueOnce(new Error('Request failed (503)')).mockResolvedValueOnce(RESULT)
    const { user, input } = setup()

    await user.type(input, 'First try')
    await user.click(screen.getByRole('button', { name: 'Ask' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Ask' }))
    expect(await screen.findByText(RESULT.answer)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
