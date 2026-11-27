// Client for the Spring Boot hybrid RAG service (mr-mtd/springboot_hybrid_RAG).
// POST /api/ask with {"question": "..."}; returns {answer, sources: [{id, question}]}.
//
// VITE_API_BASE_URL is read at build time. When it is empty the request goes to
// the same origin (/api/ask): the Vite dev/preview proxy forwards it in
// development and the CloudFront /api/* behavior forwards it in production.
import { config } from '../config.js'
import { postJson } from './http.js'

export async function ask(question, signal) {
  const { data } = await postJson(
    `${config.rag.baseUrl}/api/ask`,
    { question },
    { signal, timeoutMs: config.rag.timeoutMs },
  )
  return data
}
