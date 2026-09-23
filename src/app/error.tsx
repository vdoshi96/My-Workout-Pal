"use client";
import { useEffect } from "react";
import { PublicShell } from "@/components/layout/public-shell";
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Page rendering failed", { digest: error.digest }); }, [error]);
  return <PublicShell current={null}><section className="status-page"><h1>Something went wrong</h1><p>{"This page didn't load."}</p><button className="primary-action" onClick={reset} type="button">Try again</button></section></PublicShell>;
}
