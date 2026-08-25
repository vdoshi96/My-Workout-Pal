"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main className="status-page">
          <p className="status-stamp">App shell interrupted</p>
          <h1>My Workout Pal needs a fresh start.</h1>
          <p>No failed action is presented as saved.</p>
          <button className="primary-action" onClick={reset} type="button">
            Reload app shell
          </button>
        </main>
      </body>
    </html>
  );
}
