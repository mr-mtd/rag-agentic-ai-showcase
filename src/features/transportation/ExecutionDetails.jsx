// Collapsible technical details for one orchestrator reply. Everything shown is
// a value the API returned, except the round-trip latency and request id, which
// the client measured / read from the response header. Missing values say so
// rather than being filled in.

const NOT_REPORTED = 'Not reported'

const fmtInt = (n) => (typeof n === 'number' ? n.toLocaleString('en-US') : NOT_REPORTED)

export function fmtMs(ms) {
  if (typeof ms !== 'number') return NOT_REPORTED
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${ms} ms`
}

// Arguments arrive as a JSON string; pretty-print it, or show it as-is if it isn't JSON.
function formatArguments(args) {
  if (args == null || args === '') return '{}'
  try {
    return JSON.stringify(JSON.parse(args), null, 2)
  } catch {
    return String(args)
  }
}

function ToolCallItem({ call, index }) {
  const ok = call.outcome === 'success'
  return (
    <li className={`tool-call ${ok ? 'tool-ok' : 'tool-failed'}`}>
      <div className="tool-head">
        <span className="tool-index">{index + 1}</span>
        <code className="tool-name">{call.tool}</code>
        <span className={`outcome ${ok ? 'outcome-ok' : 'outcome-failed'}`}>
          <span aria-hidden="true">{ok ? '✓' : '✕'}</span> {call.outcome || 'unknown'}
        </span>
        <span className="tool-duration">{fmtMs(call.durationMs)}</span>
      </div>
      <pre className="tool-args" aria-label={`Arguments for ${call.tool}`}>
        {formatArguments(call.arguments)}
      </pre>
    </li>
  )
}

export default function ExecutionDetails({ reply }) {
  const calls = reply.toolCalls || []
  const failed = calls.filter((c) => c.outcome !== 'success').length
  const usage = reply.usage || {}

  const summary = [
    `${calls.length} tool call${calls.length === 1 ? '' : 's'}`,
    failed ? `${failed} failed` : null,
    typeof usage.totalTokens === 'number' ? `${fmtInt(usage.totalTokens)} tokens` : null,
    fmtMs(reply.latencyMs ?? reply.durationMs),
  ].filter(Boolean)

  return (
    <details className="exec-details">
      <summary>
        <span className="exec-title">Technical details</span>
        <span className="exec-summary">{summary.join(' · ')}</span>
      </summary>

      <div className="exec-body">
        <h4>MCP tool calls</h4>
        {calls.length ? (
          <ol className="tool-calls">
            {calls.map((call, i) => (
              <ToolCallItem key={i} call={call} index={i} />
            ))}
          </ol>
        ) : (
          <p className="muted">The model answered without calling any MCP tools.</p>
        )}

        <h4>Model and usage</h4>
        <dl className="metrics">
          <dt>Model</dt>
          <dd>{reply.model || NOT_REPORTED}</dd>
          <dt>Prompt tokens</dt>
          <dd>{fmtInt(usage.promptTokens)}</dd>
          <dt>Completion tokens</dt>
          <dd>{fmtInt(usage.completionTokens)}</dd>
          <dt>Total tokens</dt>
          <dd>{fmtInt(usage.totalTokens)}</dd>
          <dt>Orchestrator time</dt>
          <dd>{fmtMs(reply.durationMs)}</dd>
          <dt>Round-trip latency</dt>
          <dd>{fmtMs(reply.latencyMs)}</dd>
          {reply.requestId && (
            <>
              <dt>Request id</dt>
              <dd><code>{reply.requestId}</code></dd>
            </>
          )}
          <dt>Conversation id</dt>
          <dd><code>{reply.conversationId || NOT_REPORTED}</code></dd>
        </dl>
        <p className="muted small">
          Tokens are summed over every model call in the tool loop. Orchestrator time is measured by the
          server; round-trip latency is measured in your browser and includes the network.
        </p>
      </div>
    </details>
  )
}
