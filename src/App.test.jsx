import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'

vi.mock('./api/ragClient.js', () => ({ ask: vi.fn() }))
vi.mock('./api/orchestratorClient.js', async (importOriginal) => ({
  ...(await importOriginal()),
  sendChat: vi.fn(),
}))

describe('App', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/')
  })

  it('opens on the Knowledge Assistant with three tabs', () => {
    render(<App />)

    expect(screen.getByRole('heading', { level: 1, name: 'AI Engineering Showcase' })).toBeInTheDocument()
    expect(screen.getAllByRole('tab').map((t) => t.getAttribute('aria-label'))).toEqual([
      'Knowledge Assistant',
      'Transportation Assistant',
      'Architecture',
    ])
    expect(screen.getByRole('tab', { name: 'Knowledge Assistant' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { name: 'Kafka Hybrid RAG' })).toBeVisible()
  })

  it('switches tabs on click and records the tab in the URL hash', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('tab', { name: 'Transportation Assistant' }))

    expect(window.location.hash).toBe('#transportation')
    expect(screen.getByRole('heading', { name: 'Transportation Assistant' })).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Kafka Hybrid RAG' })).not.toBeInTheDocument() // hidden panel
  })

  it('opens the tab named in the hash and moves with arrow keys', async () => {
    window.history.replaceState(null, '', '/#architecture')
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Architecture' })).toBeVisible()
    expect(screen.getByRole('img', { name: 'System architecture' })).toBeInTheDocument()

    screen.getByRole('tab', { name: 'Architecture' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Knowledge Assistant' })).toHaveFocus()
    expect(screen.getByRole('tab', { name: 'Knowledge Assistant' })).toHaveAttribute('aria-selected', 'true')
  })

  it('links to all four repositories', () => {
    window.history.replaceState(null, '', '/#architecture')
    render(<App />)
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'))
    for (const repo of ['rag-agentic-ai-showcase', 'springboot_hybrid_RAG', 'springboot_mcp_orchestrator', 'springboot_MCP_server']) {
      expect(hrefs).toContain(`https://github.com/mr-mtd/${repo}`)
    }
  })
})
