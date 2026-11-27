/** A card with a spinner and a short description of what the backend is doing. */
export default function LoadingStatus({ children }) {
  return (
    <section className="card status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      {children}
    </section>
  )
}
