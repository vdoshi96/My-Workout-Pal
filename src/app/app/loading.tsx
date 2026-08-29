export default function AccountLoading() {
  return (
    <section aria-busy="true" aria-live="polite" className="member-state" role="status">
      <span className="eyebrow">Opening your companion</span>
      <h1>Loading your home…</h1>
      <p>Checking your routine, saved progress, and any resumable workout.</p>
    </section>
  );
}
