import { headers } from "next/headers";
import type { ReactNode } from "react";

import { AuthenticatedShell } from "@/components/layout/authenticated-shell";
import { harnessRequestContext } from "../../server/harness-context";

export default async function HarnessAccountLayout({ children }: Readonly<{ children: ReactNode }>) {
  const context = harnessRequestContext(await headers());
  if (!context.viewer) {
    return (
      <main className="public-main" id="main-content">
        <section className="auth-sheet" aria-labelledby="harness-auth-heading">
          <span className="eyebrow">Synthetic session boundary</span>
          <h1 id="harness-auth-heading">Sign in required</h1>
          <p>The local harness rejected the missing, expired, revoked, or unknown synthetic viewer.</p>
        </section>
      </main>
    );
  }
  return <AuthenticatedShell viewer={context.viewer}>{children}</AuthenticatedShell>;
}
