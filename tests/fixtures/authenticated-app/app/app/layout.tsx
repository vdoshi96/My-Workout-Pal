import { getHarnessDatabase } from "../../server/database";
import { getViewerProfileProgram, RepositoryNotFoundError } from "@/server/repositories/profile-program";
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
  const { database } = await getHarnessDatabase(context.scope);
  const reducedMotion = await getViewerProfileProgram(database, context.viewer).then((model) => model.preferences.reducedMotion).catch((error: unknown) => { if (error instanceof RepositoryNotFoundError) return false; throw error; });
  return <AuthenticatedShell viewer={context.viewer} reducedMotion={reducedMotion}>{children}</AuthenticatedShell>;
}
