"use client";

export default function AccountError({ reset }: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <section className="member-state" role="alert">
      <span className="eyebrow">Saved data unavailable</span>
      <h1>Your route did not load.</h1>
      <p>No changes were made. Check the connection and try the request again.</p>
      <button className="primary-action" onClick={reset} type="button">Try again</button>
    </section>
  );
}
