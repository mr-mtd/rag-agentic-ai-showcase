import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// GitHub-flavored Markdown (tables, lists, strikethrough, autolinks). Raw HTML in
// the model's answer is not rendered, so the answer can't inject markup.
const components = {
  a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noreferrer" />,
  // Wide tables scroll inside their own box instead of widening the page on mobile.
  table: ({ node: _node, ...props }) => (
    <div className="md-table">
      <table {...props} />
    </div>
  ),
}

export default function Markdown({ children }) {
  return (
    <div className="markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children || ''}
      </ReactMarkdown>
    </div>
  )
}
