import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import ExecutionDetails from './ExecutionDetails.jsx'

const REPLY = {
  conversationId: 'conv-1',
  model: 'gpt-5-mini',
  toolCalls: [
    { tool: 'getLoadStatus', arguments: '{"loadNumber":"999999"}', outcome: 'error', durationMs: 12 },
    { tool: 'findDelayedShipments', arguments: '{"originState":"TX","minHoursLate":4}', outcome: 'success', durationMs: 1250 },
  ],
  usage: { promptTokens: 1812, completionTokens: 96, totalTokens: 1908 },
  durationMs: 2903,
  latencyMs: 3010,
  requestId: 'req-9',
}

describe('ExecutionDetails', () => {
  it('is collapsed by default with a summary of the real values', async () => {
    const user = userEvent.setup()
    const { container } = render(<ExecutionDetails reply={REPLY} />)
    const details = container.querySelector('details')

    expect(details).not.toHaveAttribute('open')
    expect(screen.getByText('2 tool calls · 1 failed · 1,908 tokens · 3.01 s')).toBeInTheDocument()

    await user.click(screen.getByText('Technical details'))
    expect(details).toHaveAttribute('open')
  })

  it('lists each tool call with arguments, outcome and duration, marking failures', () => {
    render(<ExecutionDetails reply={REPLY} />)
    const [failed, ok] = screen.getAllByRole('listitem')

    expect(failed).toHaveClass('tool-failed')
    expect(within(failed).getByText('getLoadStatus')).toBeInTheDocument()
    expect(failed).toHaveTextContent('error')
    expect(failed).toHaveTextContent('12 ms')
    expect(within(failed).getByLabelText('Arguments for getLoadStatus')).toHaveTextContent('"loadNumber": "999999"')

    expect(ok).toHaveClass('tool-ok')
    expect(ok).toHaveTextContent('success')
    expect(ok).toHaveTextContent('1.25 s')
    expect(ok).toHaveTextContent('"minHoursLate": 4')
  })

  it('shows model, tokens and both latencies', () => {
    render(<ExecutionDetails reply={REPLY} />)
    const value = (label) => screen.getByText(label).nextElementSibling

    expect(value('Model')).toHaveTextContent('gpt-5-mini')
    expect(value('Prompt tokens')).toHaveTextContent('1,812')
    expect(value('Completion tokens')).toHaveTextContent('96')
    expect(value('Total tokens')).toHaveTextContent('1,908')
    expect(value('Orchestrator time')).toHaveTextContent('2.90 s')
    expect(value('Round-trip latency')).toHaveTextContent('3.01 s')
    expect(value('Request id')).toHaveTextContent('req-9')
    expect(value('Conversation id')).toHaveTextContent('conv-1')
  })

  it('says when nothing was reported instead of inventing values', () => {
    render(<ExecutionDetails reply={{ conversationId: 'c', toolCalls: [], answer: 'hi' }} />)
    const value = (label) => screen.getByText(label).nextElementSibling

    expect(screen.getByText(/answered without calling any MCP tools/i)).toBeInTheDocument()
    expect(value('Model')).toHaveTextContent('Not reported')
    expect(value('Total tokens')).toHaveTextContent('Not reported')
    expect(screen.queryByText('Request id')).not.toBeInTheDocument()
  })

  it('shows non-JSON arguments as they were sent', () => {
    render(<ExecutionDetails reply={{ ...REPLY, toolCalls: [{ tool: 't', arguments: 'not json', outcome: 'success', durationMs: 1 }] }} />)
    expect(screen.getByLabelText('Arguments for t')).toHaveTextContent('not json')
  })
})
