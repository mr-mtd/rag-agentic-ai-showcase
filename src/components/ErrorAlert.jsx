/** An error card announced to screen readers. `action` is an optional button, e.g. Retry. */
export default function ErrorAlert({ children, action }) {
  return (
    <section className="card error" role="alert">
      <span>{children}</span>
      {action}
    </section>
  )
}
