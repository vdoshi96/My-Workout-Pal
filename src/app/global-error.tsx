"use client";
import "./globals.css";
import "./quiet-set.css";
import { PublicShell } from "@/components/layout/public-shell";
export default function GlobalError() {
  return <html lang="en"><body><PublicShell current={null}><section className="status-page"><h1>Something went wrong</h1><button className="primary-action" onClick={() => window.location.reload()} type="button">Reload</button></section></PublicShell></body></html>;
}
