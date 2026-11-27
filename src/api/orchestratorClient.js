// Client for the Spring Boot MCP orchestrator (mr-mtd/springboot_mcp_orchestrator).
//
// POST /api/v1/chat with {message, conversationId?}. The reply is
//   {conversationId, answer, model, toolCalls: [{tool, arguments, outcome, durationMs}],
//    usage: {promptTokens, completionTokens, totalTokens}, durationMs}
// and the X-Request-Id response header identifies the request in the server logs.
// Errors are RFC 9457 problem details: 400 bad input, 502 model failure, 503 MCP server down.
//
// VITE_ORCHESTRATOR_BASE_URL is read at build time. Production points it at the
// orchestrator's own CloudFront distribution, which allows this site's origin via CORS.
// Empty means same origin, which the Vite dev/preview proxy forwards.
import { config } from '../config.js'
import { HttpError, TimeoutError, postJson } from './http.js'

export const MAX_MESSAGE_LENGTH = 4000

/**
 * Sends one chat message. Pass the conversationId from the previous reply to
 * continue that conversation, or leave it out to start a new one.
 *
 * Resolves with the orchestrator's reply plus two values measured here:
 * `requestId` (from the X-Request-Id header, or null) and `latencyMs`, the
 * round trip as seen by the browser.
 */
export async function sendChat({ message, conversationId }, { signal } = {}) {
  const body = conversationId ? { message, conversationId } : { message }
  const started = performance.now()
  const { data, headers } = await postJson(`${config.orchestrator.baseUrl}/api/v1/chat`, body, {
    signal,
    timeoutMs: config.orchestrator.timeoutMs,
  })
  return {
    ...data,
    toolCalls: Array.isArray(data.toolCalls) ? data.toolCalls : [],
    requestId: headers.get('X-Request-Id'),
    latencyMs: Math.round(performance.now() - started),
  }
}

/** A message for the person, based on what the orchestrator documents for each failure. */
export function describeChatError(err) {
  if (err instanceof TimeoutError) {
    return `The transportation assistant did not answer within ${Math.round(err.timeoutMs / 1000)} seconds. Please try again.`
  }
  if (err instanceof HttpError) {
    switch (err.status) {
      case 400:
        return err.detail ? `The message was rejected: ${err.detail}` : 'The message was rejected as invalid.'
      case 502:
        return 'The language model call failed (502). Please try again in a moment.'
      case 503:
        return 'The MCP tool server is unavailable right now (503). Please try again in a few seconds.'
      case 504:
        return 'The request took too long and the gateway timed out (504). Please try again.'
      default:
        return err.message
    }
  }
  if (err instanceof TypeError) {
    return 'Could not reach the transportation orchestrator. Check your connection and try again.'
  }
  return err?.message || 'Something went wrong.'
}
