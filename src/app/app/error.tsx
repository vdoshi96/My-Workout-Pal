"use client";

export default function AccountError({ reset }: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return <section className="member-state" role="alert"><h1>{"This page didn't load"}</h1><p>Nothing was changed.</p><button className="primary-action" onClick={reset} type="button">Try again</button></section>;
}
