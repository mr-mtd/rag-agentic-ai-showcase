import ArchitectureDiagram from './ArchitectureDiagram.jsx'

const REPOS = [
  {
    name: 'react_hybrid_RAG_frontend',
    url: 'https://github.com/mr-mtd/react_hybrid_RAG_frontend',
    text: 'This site: React 19 and Vite, deployed to S3 and CloudFront by GitHub Actions.',
  },
  {
    name: 'springboot_hybrid_RAG',
    url: 'https://github.com/mr-mtd/springboot_hybrid_RAG',
    text: 'Hybrid retrieval in Qdrant with RRF, then a grounded answer from OpenAI.',
  },
  {
    name: 'springboot_mcp_orchestrator',
    url: 'https://github.com/mr-mtd/springboot_mcp_orchestrator',
    text: 'Chat API: conversation memory, OpenAI tool calling, MCP client, metrics.',
  },
  {
    name: 'springboot_MCP_server',
    url: 'https://github.com/mr-mtd/springboot_MCP_server',
    text: 'Transport MCP server: three read-only tools over a PostgreSQL freight database.',
  },
]

const CONCEPTS = [
  {
    title: 'Hybrid retrieval',
    body: (
      <>
        Every question runs two searches side by side in Qdrant: a <strong>dense</strong> semantic search
        (sentence embeddings, which match meaning) and a <strong>BM25</strong> keyword search (which matches
        exact terms like config names and error messages). Each finds things the other misses.
      </>
    ),
  },
  {
    title: 'Reciprocal Rank Fusion',
    body: (
      <>
        RRF merges the two ranked lists without comparing their incompatible scores. Each document scores{' '}
        <code>Σ 1 / (k + rank)</code> over the lists it appears in, so records ranked well by both searches
        rise to the top. The top 5 become numbered <code>[Source N]</code> context for the model.
      </>
    ),
  },
  {
    title: 'Conversational orchestration',
    body: (
      <>
        The orchestrator keeps each conversation's history server-side under a{' '}
        <code>conversationId</code> and runs Spring AI's tool-calling loop: the model asks for tools, the
        orchestrator executes them, feeds results back, and repeats until the model answers. Each call is
        timed and returned with token usage.
      </>
    ),
  },
  {
    title: 'Dynamic MCP tool discovery',
    body: (
      <>
        The orchestrator has no freight logic. It asks the MCP server for its tools (<code>tools/list</code>)
        and hands their names, descriptions and JSON schemas to the model. A new tool on the server
        becomes available to the model without any change to the orchestrator's code.
      </>
    ),
  },
]

const STACK = [
  ['Frontend', 'React 19, Vite 8, react-markdown + remark-gfm, Vitest, React Testing Library'],
  ['RAG service', 'Java 21, Spring Boot 3.4, Qdrant Cloud (dense all-MiniLM-L6-v2 + BM25, RRF), OpenAI Chat Completions'],
  ['Orchestrator', 'Java 21, Spring Boot 4.2, Spring AI 2.1 (OpenAI chat model, MCP client, session memory), Micrometer, OpenAPI'],
  ['MCP server', 'Java 21, Spring Boot 4.2, Spring AI MCP server (Streamable HTTP), JdbcClient, Flyway'],
  ['Data', 'Qdrant Cloud collection of Kafka Q&A; Amazon RDS PostgreSQL 18 with carriers, loads and tracking events'],
  ['CI/CD', 'GitHub Actions with AWS OIDC (no stored AWS keys), Docker images on GHCR, SSM Run Command deploys'],
]

const AWS = [
  <>
    <strong>Frontend:</strong> static build in a private S3 bucket, served by CloudFront over HTTPS through
    Origin Access Control. Its <code>/api/*</code> behavior forwards to the RAG service on{' '}
    <strong>AWS Lightsail</strong>, so the knowledge assistant calls its own origin.
  </>,
  <>
    <strong>Agentic stack:</strong> the orchestrator and MCP server run as Docker containers on one EC2
    instance with no public inbound ports. A second CloudFront distribution reaches the orchestrator
    through a <strong>VPC origin</strong>; the MCP server and RDS database are only reachable inside the
    private network.
  </>,
  <>
    <strong>Secrets:</strong> the OpenAI keys live on the backends (SSM Parameter Store for the
    orchestrator). The browser never sees an API key, MCP endpoint or database address.
  </>,
]

export default function Architecture() {
  return (
    <div className="assistant">
      <header className="intro">
        <span className="badge">About</span>
        <h2>Architecture</h2>
        <p className="lede">
          Two independent AI backends behind one React frontend: a <strong>retrieval-augmented
          generation</strong> service for answering from a knowledge base, and an <strong>agentic</strong>{' '}
          orchestrator that lets a model use live tools through the <strong>Model Context Protocol</strong>.
        </p>
      </header>

      <section className="card">
        <ArchitectureDiagram />
        <div className="legend">
          <span className="legend-item rag">Knowledge Assistant (RAG)</span>
          <span className="legend-item mcp">Transportation Assistant (MCP)</span>
        </div>
      </section>

      <section className="concepts">
        {CONCEPTS.map((c) => (
          <article key={c.title} className="card concept">
            <h3>{c.title}</h3>
            <p>{c.body}</p>
          </article>
        ))}
      </section>

      <section className="card">
        <h3>Technology stack</h3>
        <dl className="stack">
          {STACK.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="card">
        <h3>AWS deployment</h3>
        <ul className="plain-list">
          {AWS.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h3>Source code</h3>
        <ul className="repos">
          {REPOS.map((r) => (
            <li key={r.name}>
              <a href={r.url} target="_blank" rel="noreferrer">
                mr-mtd/{r.name}
              </a>
              <span>{r.text}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
