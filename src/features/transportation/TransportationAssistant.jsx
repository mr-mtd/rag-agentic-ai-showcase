import { useEffect, useRef, useState } from 'react'
import { MAX_MESSAGE_LENGTH, describeChatError, sendChat } from '../../api/orchestratorClient.js'
import ErrorAlert from '../../components/ErrorAlert.jsx'
import ExamplePrompts from '../../components/ExamplePrompts.jsx'
import LoadingStatus from '../../components/LoadingStatus.jsx'
import Markdown from '../../components/Markdown.jsx'
import ExecutionDetails from './ExecutionDetails.jsx'
import { TRANSPORT_EXAMPLES } from './examples.js'

let nextId = 0
const newId = () => `m${++nextId}`

/**
 * Transportation Assistant: a multi-turn chat with the MCP orchestrator.
 * The orchestrator keeps the history; this component keeps the conversationId
 * it returns and sends it back with every following message.
 */
export default function TransportationAssistant() {
  const [messages, setMessages] = useState([])
  const [conversationId, setConversationId] = useState(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  // A ref, not state, so two clicks in the same frame can't both get through.
  const inFlight = useRef(false)
  const controller = useRef(null)
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' })
  }, [messages, loading])

  useEffect(() => () => controller.current?.abort(), [])

  async function send(text) {
    const message = text.trim()
    if (!message || inFlight.current) return
    inFlight.current = true

    controller.current = new AbortController()
    const signal = controller.current.signal
    setMessages((m) => [...m, { id: newId(), role: 'user', text: message }])
    setInput('')
    setLoading(true)

    try {
      const reply = await sendChat({ message, conversationId }, { signal })
      if (signal.aborted) return // "New conversation" was pressed while this was in flight.
      setConversationId(reply.conversationId || conversationId)
      setMessages((m) => [...m, { id: newId(), role: 'assistant', reply }])
    } catch (err) {
      if (err.name !== 'AbortError') {
        setMessages((m) => [...m, { id: newId(), role: 'error', text: describeChatError(err), retry: message }])
      }
    } finally {
      if (!signal.aborted) {
        inFlight.current = false
        setLoading(false)
      }
    }
  }

  // Drop the failed exchange (the user's message and the error) and send it again.
  function retry(errorId, text) {
    if (inFlight.current) return
    setMessages((m) => {
      const i = m.findIndex((x) => x.id === errorId)
      return i > 0 && m[i - 1].role === 'user' ? [...m.slice(0, i - 1), ...m.slice(i + 1)] : m.filter((x) => x.id !== errorId)
    })
    send(text)
  }

  function newConversation() {
    controller.current?.abort()
    inFlight.current = false
    setLoading(false)
    setMessages([])
    setConversationId(null)
    setInput('')
  }

  function onSubmit(e) {
    e.preventDefault()
    send(input)
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      send(input)
    }
  }

  const empty = messages.length === 0

  return (
    <div className="assistant">
      <header className="intro">
        <span className="badge">Agentic AI · MCP</span>
        <h2>Transportation Assistant</h2>
        <p className="lede">
          Ask about a <strong>synthetic freight network</strong> of 50 carriers and 2,000 loads. A Spring
          Boot <strong>orchestrator</strong> gives an OpenAI model the tools it discovers on a{' '}
          <strong>Model Context Protocol</strong> server; the model decides which tools to call, the
          orchestrator runs them against PostgreSQL through MCP, and the model answers from the results.
        </p>
      </header>

      <section className="card chat" aria-label="Conversation">
        <div className="chat-bar">
          <span className="chat-status">
            {conversationId ? (
              <>
                Conversation <code title={conversationId}>{conversationId.slice(0, 8)}</code>
              </>
            ) : (
              'New conversation'
            )}
          </span>
          <button type="button" className="ghost" onClick={newConversation} disabled={empty && !loading}>
            New conversation
          </button>
        </div>

        <div className="chat-log" aria-live="polite">
          {empty && !loading && (
            <p className="chat-empty">
              Ask a question below, or pick an example. Follow-up questions keep the context of the
              conversation.
            </p>
          )}

          {messages.map((m) =>
            m.role === 'user' ? (
              <div key={m.id} className="msg msg-user">
                <span className="sr-only">You: </span>
                {m.text}
              </div>
            ) : m.role === 'assistant' ? (
              <article key={m.id} className="msg msg-assistant">
                <span className="sr-only">Assistant: </span>
                <Markdown>{m.reply.answer}</Markdown>
                <ExecutionDetails reply={m.reply} />
              </article>
            ) : (
              <ErrorAlert
                key={m.id}
                action={
                  <button type="button" className="ghost" onClick={() => retry(m.id, m.retry)} disabled={loading}>
                    Retry
                  </button>
                }
              >
                {m.text}
              </ErrorAlert>
            ),
          )}

          {loading && (
            <LoadingStatus>Waiting for the orchestrator. Tool calls can take several seconds…</LoadingStatus>
          )}
          <div ref={endRef} />
        </div>

        <form className="chat-form" onSubmit={onSubmit}>
          <label htmlFor="chat-input" className="sr-only">
            Message the transportation assistant
          </label>
          <textarea
            id="chat-input"
            rows={2}
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder={empty ? 'e.g. Where is load LD-000420?' : 'Ask a follow-up question…'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <div className="ask-footer">
            <span className="hint">Enter to send · Shift + Enter for a new line</span>
            <button type="submit" disabled={loading || !input.trim()}>
              {loading ? 'Thinking…' : 'Send'}
            </button>
          </div>
        </form>
      </section>

      {empty && <ExamplePrompts examples={TRANSPORT_EXAMPLES} onPick={send} disabled={loading} />}
    </div>
  )
}
