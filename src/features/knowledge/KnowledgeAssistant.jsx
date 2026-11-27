import { useRef, useState } from 'react'
import { ask } from '../../api/ragClient.js'
import ErrorAlert from '../../components/ErrorAlert.jsx'
import ExamplePrompts from '../../components/ExamplePrompts.jsx'
import LoadingStatus from '../../components/LoadingStatus.jsx'

const MAX_LENGTH = 4000

const EXAMPLES = [
  'How do I guarantee message ordering in Kafka?',
  'What happens when a consumer group rebalances?',
  'How do I enable exactly-once semantics in a Kafka producer?',
  'Why is my Kafka consumer lag increasing?',
]

/** Knowledge Assistant: single question, hybrid RAG answer with its sources. */
export default function KnowledgeAssistant() {
  const [question, setQuestion] = useState('')
  const [asked, setAsked] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const controller = useRef(null)

  async function submit(text) {
    const q = text.trim()
    if (!q || loading) return

    controller.current?.abort()
    controller.current = new AbortController()

    setAsked(q)
    setLoading(true)
    setError('')
    setResult(null)
    try {
      setResult(await ask(q, controller.current.signal))
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(
          err instanceof TypeError
            ? 'Could not reach the backend. Is the Spring Boot service running?'
            : err.message,
        )
      }
    } finally {
      setLoading(false)
    }
  }

  function onSubmit(e) {
    e.preventDefault()
    submit(question)
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      submit(question)
    }
  }

  function pickExample(text) {
    setQuestion(text)
    submit(text)
  }

  return (
    <div className="assistant">
      <header className="intro">
        <span className="badge">Hybrid RAG</span>
        <h2>Kafka Hybrid RAG</h2>
        <p className="lede">
          <strong>1,000 Kafka questions and answers</strong> are stored in a <strong>Qdrant</strong>{' '}
          vector database that supports <strong>hybrid queries</strong>, combining BM25 keyword search
          with semantic search. The closest matches are passed to an LLM, which writes an answer
          grounded in them.
        </p>
      </header>

      <form className="card ask" onSubmit={onSubmit}>
        <label htmlFor="question">Please ask a question about Kafka</label>
        <textarea
          id="question"
          rows={3}
          maxLength={MAX_LENGTH}
          placeholder="e.g. How do I choose the number of partitions for a topic?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={onKeyDown}
          autoFocus
        />
        <div className="ask-footer">
          <span className="hint">Ctrl/⌘ + Enter to send</span>
          <button type="submit" disabled={loading || !question.trim()}>
            {loading ? 'Searching…' : 'Ask'}
          </button>
        </div>
      </form>

      {!asked && <ExamplePrompts examples={EXAMPLES} onPick={pickExample} />}

      {loading && <LoadingStatus>Running hybrid search and generating an answer…</LoadingStatus>}

      {error && <ErrorAlert>{error}</ErrorAlert>}

      {result && (
        <section className="card result" aria-live="polite">
          <p className="asked">{asked}</p>
          <h3>Answer</h3>
          <div className="answer">{result.answer}</div>

          {result.sources?.length > 0 && (
            <>
              <h3>Sources</h3>
              <ol className="sources">
                {result.sources.map((s, i) => (
                  <li key={s.id ?? i}>
                    <span className="source-tag">Source {i + 1}</span>
                    <span className="source-q">{s.question}</span>
                    {s.id && <span className="source-id">id {s.id}</span>}
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>
      )}
    </div>
  )
}
