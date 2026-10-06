"use client";

import Link from "next/link";

import { PalSticker } from "@/components/ui/scene-stage";

export default function AccountError({ retry }: Readonly<{ error: Error & { digest?: string }; retry: () => void }>) {
  return <section className="member-state status-page" role="alert"><PalSticker pose="resting" /><h1>{"This page didn't load"}</h1><p>Nothing was changed.</p><div className="pal-actions"><button className="primary-action" onClick={retry} type="button">Try again</button><Link className="secondary-action" href="/app">Back to Today</Link></div></section>;
}
