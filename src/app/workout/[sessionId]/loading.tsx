export default function OwnedWorkoutLoading() {
  return (
    <main
      aria-busy="true"
      aria-labelledby="workout-loading-title"
      className="owned-runner-recovery"
      role="status"
    >
      <span className="eyebrow">Private workout</span>
      <h1 id="workout-loading-title">Loading saved workout</h1>
      <p>Reading the immutable session snapshot before the runner becomes interactive.</p>
    </main>
  );
}
