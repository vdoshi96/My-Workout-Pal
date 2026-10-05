"use client";
import { useEffect } from "react";
import Link from "next/link";
import { PublicShell } from "@/components/layout/public-shell";
import { PalSticker } from "@/components/ui/scene-stage";
export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => { console.error("Page rendering failed", { digest: error.digest }); }, [error]);
  return <PublicShell current={null}><section className="status-page"><PalSticker pose="resting" /><h1>Something went wrong</h1><p>{"This page didn't load."}</p><div className="pal-actions"><button className="primary-action" onClick={retry} type="button">Try again</button><Link className="secondary-action" href="/">Go home</Link></div></section></PublicShell>;
}
