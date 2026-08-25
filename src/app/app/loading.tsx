export default function AccountLoading() {
  return (
    <section aria-busy="true" aria-live="polite" className="member-state" role="status">
      <span className="eyebrow">Opening saved route</span>
      <h1>Loading your program…</h1>
      <p>Checking the current program revision and any resumable workout.</p>
    </section>
  );
}
