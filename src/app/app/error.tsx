"use client";

export default function AccountError({ reset }: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <section className="member-state" role="alert">
      <span className="eyebrow">Personal home unavailable</span>
      <h1>Your home did not load.</h1>
      <p>No routine or workout changes were made. Check the connection and try again.</p>
      <button className="primary-action" onClick={reset} type="button">Try again</button>
    </section>
  );
}
