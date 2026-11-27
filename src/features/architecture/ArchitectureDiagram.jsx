// Hand-drawn SVG so the diagram needs no library and follows the light/dark theme.

function Node({ x, y, w, h, title, lines = [], tone = '' }) {
  return (
    <g className={`arch-node ${tone}`}>
      <rect x={x} y={y} width={w} height={h} rx="12" />
      <text x={x + w / 2} y={y + 28} className="arch-title" textAnchor="middle">
        {title}
      </text>
      {lines.map((line, i) => (
        <text key={line} x={x + w / 2} y={y + 50 + i * 18} className="arch-sub" textAnchor="middle">
          {line}
        </text>
      ))}
    </g>
  )
}

function Edge({ d, label, lx, ly, tone = '', anchor = 'middle' }) {
  return (
    <g className={`arch-edge ${tone}`}>
      <path d={d} markerEnd={`url(#arrow-${tone || 'plain'})`} />
      {label && (
        <text x={lx} y={ly} textAnchor={anchor} className="arch-label">
          {label}
        </text>
      )}
    </g>
  )
}

export default function ArchitectureDiagram() {
  return (
    <div className="diagram-scroll">
      <svg
        className="arch"
        viewBox="0 0 1040 520"
        role="img"
        aria-labelledby="arch-title"
        aria-describedby="arch-desc"
      >
        <title id="arch-title">System architecture</title>
        <desc id="arch-desc">
          The React frontend calls the hybrid RAG service, which queries the Qdrant vector database and
          OpenAI, and the MCP orchestrator, which calls OpenAI and the MCP server. The MCP server reads
          PostgreSQL. The orchestrator, MCP server and database are inside a private AWS network.
        </desc>
        <defs>
          {['plain', 'rag', 'mcp'].map((t) => (
            <marker
              key={t}
              id={`arrow-${t}`}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" className={`arch-head ${t}`} />
            </marker>
          ))}
        </defs>

        {/* Private network around the agentic stack */}
        <g className="arch-zone">
          <rect x="284" y="338" width="746" height="168" rx="16" />
          <text x="1016" y="360" textAnchor="end" className="arch-zone-label">
            AWS us-east-2 · private network, no public ports
          </text>
        </g>

        <Node x={20} y={200} w={180} h={112} title="React frontend" lines={['React 19 · Vite', 'S3 + CloudFront', '(this site)']} />

        <Node x={300} y={40} w={200} h={100} tone="rag" title="Hybrid RAG service" lines={['Spring Boot 3.4 · Java 21', 'AWS Lightsail']} />
        <Node x={620} y={30} w={190} h={96} tone="rag" title="Qdrant Cloud" lines={['vector database', 'dense + BM25 → RRF']} />

        <Node x={620} y={205} w={190} h={92} title="OpenAI API" lines={['chat completions', 'tool calling']} />

        <Node x={300} y={376} w={200} h={110} tone="mcp" title="MCP orchestrator" lines={['Spring Boot 4.2 · Spring AI 2.1', 'EC2, CloudFront', 'VPC origin']} />
        <Node x={620} y={382} w={190} h={98} tone="mcp" title="Transport MCP server" lines={['Spring AI MCP server', '3 tools · Streamable HTTP']} />
        <Node x={860} y={382} w={160} h={98} tone="mcp" title="PostgreSQL 18" lines={['Amazon RDS', 'read-only user']} />

        <Edge tone="rag" d="M110,200 L110,90 L298,90" label="POST /api/ask" lx={122} ly={82} anchor="start" />
        <Edge tone="mcp" d="M110,312 L110,430 L298,430" label="POST /api/v1/chat" lx={122} ly={422} anchor="start" />

        <Edge tone="rag" d="M500,78 L618,78" label="hybrid query" lx={559} ly={70} />
        <Edge tone="rag" d="M500,120 C560,120 560,232 618,232" label="grounded prompt" lx={552} ly={178} anchor="end" />

        <Edge tone="mcp" d="M500,400 C560,400 560,272 618,272" label="tools + history" lx={552} ly={326} anchor="end" />
        <Edge tone="mcp" d="M500,446 L618,446" label="MCP tools/call" lx={559} ly={438} />
        <Edge tone="mcp" d="M810,431 L858,431" label="SQL" lx={834} ly={423} />
      </svg>
    </div>
  )
}
