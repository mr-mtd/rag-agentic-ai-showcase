import { useEffect, useRef, useState } from 'react'
import Architecture from './features/architecture/Architecture.jsx'
import KnowledgeAssistant from './features/knowledge/KnowledgeAssistant.jsx'
import TransportationAssistant from './features/transportation/TransportationAssistant.jsx'

// The hash (#knowledge, #transportation, #architecture) selects the tab, so tabs
// can be linked to and the back button works, with no router and no extra
// CloudFront rules for deep links.
const TABS = [
  { id: 'knowledge', label: 'Knowledge Assistant', short: 'Knowledge', Panel: KnowledgeAssistant },
  { id: 'transportation', label: 'Transportation Assistant', short: 'Transportation', Panel: TransportationAssistant },
  { id: 'architecture', label: 'Architecture', short: 'Architecture', Panel: Architecture },
]

const tabFromHash = () => {
  const id = window.location.hash.slice(1)
  return TABS.some((t) => t.id === id) ? id : TABS[0].id
}

export default function App() {
  const [active, setActive] = useState(tabFromHash)
  const tabRefs = useRef({})

  useEffect(() => {
    const onHash = () => setActive(tabFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  function select(id, focus = false) {
    setActive(id)
    if (window.location.hash !== `#${id}`) window.history.pushState(null, '', `#${id}`)
    if (focus) tabRefs.current[id]?.focus()
  }

  // Arrow keys move between tabs, as in the WAI-ARIA tabs pattern.
  function onKeyDown(e) {
    const i = TABS.findIndex((t) => t.id === active)
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: TABS.length - 1 }[e.key]
    if (next === undefined) return
    e.preventDefault()
    select(TABS[(next + TABS.length) % TABS.length].id, true)
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">◆</span>
            <div>
              <h1>AI Engineering Showcase</h1>
              <p>Hybrid RAG and agentic MCP tool use, end to end</p>
            </div>
          </div>
          <nav className="tabs" role="tablist" aria-label="Sections" onKeyDown={onKeyDown}>
            {TABS.map((t) => (
              <button
                key={t.id}
                ref={(el) => (tabRefs.current[t.id] = el)}
                id={`tab-${t.id}`}
                type="button"
                role="tab"
                aria-selected={active === t.id}
                aria-controls={`panel-${t.id}`}
                tabIndex={active === t.id ? 0 : -1}
                className="tab"
                aria-label={t.label}
                onClick={() => select(t.id)}
              >
                <span className="tab-long" aria-hidden="true">{t.label}</span>
                <span className="tab-short" aria-hidden="true">{t.short}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="page">
        {/* Panels stay mounted so a conversation survives switching tabs. */}
        {TABS.map(({ id, Panel }) => (
          <section
            key={id}
            id={`panel-${id}`}
            role="tabpanel"
            aria-labelledby={`tab-${id}`}
            hidden={active !== id}
          >
            <Panel />
          </section>
        ))}
      </main>

      <footer className="footer">
        <a href="https://github.com/mr-mtd" target="_blank" rel="noreferrer">
          github.com/mr-mtd
        </a>{' '}
        · Spring Boot · Spring AI · Qdrant · MCP · AWS
      </footer>
    </div>
  )
}
