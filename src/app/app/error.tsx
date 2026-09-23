"use client";

export default function AccountError({ retry }: Readonly<{ error: Error & { digest?: string }; retry: () => void }>) {
  return <section className="member-state" role="alert"><h1>{"This page didn't load"}</h1><p>Nothing was changed.</p><button className="primary-action" onClick={retry} type="button">Try again</button></section>;
}
