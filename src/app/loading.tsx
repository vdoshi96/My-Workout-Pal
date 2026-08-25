export default function Loading() {
  return (
    <main className="loading-shell" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your route</span>
      <div className="loading-header" />
      <div className="loading-map" />
      <div className="loading-sheet" />
    </main>
  );
}
