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
      <h1>{"This workout didn't load"}</h1>
      <p>Your logged sets are safe on this device.</p>
      <button className="primary-action" onClick={reset} type="button">
        Try again
      </button>
    </main>
  );
}
