import type { Metadata } from "next";
import Link from "next/link";

import { PublicShell } from "@/components/layout/public-shell";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <PublicShell current="program">
      <section className="status-page">
        <div className="status-stamp">Connection interrupted</div>
        <h1>You are off the trail.</h1>
        <p>Previously opened public routes may still be available. Account changes are never reported as saved while the server cannot confirm them.</p>
        <Link className="primary-action" href="/"><span>Open cached route</span><Icon name="arrow-right" /></Link>
      </section>
    </PublicShell>
  );
}
