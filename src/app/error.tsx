"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Route rendering failed", { digest: error.digest });
  }, [error]);

  return (
    <main className="status-page">
      <p className="status-stamp">Route interrupted</p>
      <h1>We could not open this route.</h1>
      <p>Your activity has not been reported as saved. Try loading the route again.</p>
      <button className="primary-action" onClick={reset} type="button">
        Try again
      </button>
    </main>
  );
}
