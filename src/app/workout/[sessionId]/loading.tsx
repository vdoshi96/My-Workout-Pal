export default function OwnedWorkoutLoading() {
  return (
    <main
      aria-busy="true"
      aria-labelledby="workout-loading-title"
      className="owned-runner-recovery"
      role="status"
    >
      <h1 id="workout-loading-title">Opening your workout…</h1>
    </main>
  );
}
