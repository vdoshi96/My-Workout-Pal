"use client";

import { useEffect } from "react";

export default function OwnedWorkoutError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  useEffect(() => {
    console.error("Private workout rendering failed", { digest: error.digest });
  }, [error]);

  return (
    <main className="owned-runner-recovery owned-runner-recovery--blocked">
      <span className="eyebrow">Workout interrupted</span>
      <h1>The saved workout could not be opened</h1>
      <p>No pending device activity has been reported as saved or overwritten.</p>
      <button className="primary-action" onClick={reset} type="button">
        Try again
      </button>
    </main>
  );
}
