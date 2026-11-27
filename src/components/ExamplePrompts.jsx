/** Clickable example prompts. Each example is a string or {text, tag}; `tag` is a small label shown before it. */
export default function ExamplePrompts({ examples, onPick, disabled = false, label = 'Try an example' }) {
  return (
    <section className="examples">
      <span className="examples-label">{label}</span>
      <div className="chips">
        {examples.map((ex) => {
          const text = typeof ex === 'string' ? ex : ex.text
          return (
            <button key={text} type="button" className="chip" disabled={disabled} onClick={() => onPick(text)}>
              {ex.tag && <span className="chip-tag">{ex.tag}</span>}
              {text}
            </button>
          )
        })}
      </div>
    </section>
  )
}
