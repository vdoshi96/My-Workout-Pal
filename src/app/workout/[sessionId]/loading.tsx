export default function OwnedWorkoutLoading() {
  return (
    <main
      aria-busy="true"
      aria-labelledby="workout-loading-title"
      className="owned-workout-route status-page pal-run-status-page"
      role="status"
    >
      <h1 id="workout-loading-title">Opening your workout…</h1>
    </main>
  );
}
