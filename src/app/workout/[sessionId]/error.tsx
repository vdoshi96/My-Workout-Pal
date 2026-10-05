"use client";

import { useEffect } from "react";

import { BackLink } from "@/components/navigation/back-link";

export default function OwnedWorkoutError({
  error,
  retry,
}: Readonly<{ error: Error & { digest?: string }; retry: () => void }>) {
  useEffect(() => {
    console.error("Private workout rendering failed", { digest: error.digest });
  }, [error]);

  return (
    <main className="owned-workout-route status-page pal-run-status-page">
      <h1>{"This workout didn't load"}</h1>
      <p>Your logged sets are safe on this device.</p>
      <div className="pal-actions">
        <button className="primary-action" onClick={retry} type="button">
          Try again
        </button>
        <BackLink target={{ href: "/app", label: "Back to Today" }} />
      </div>
    </main>
  );
}
