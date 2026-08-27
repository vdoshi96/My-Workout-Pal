import type { Metadata } from "next";
import Link from "next/link";

import type { FirebasePublicConfig } from "@/client/firebase";
import { AuthPanel } from "@/components/auth/auth-panel";
import { PublicShell } from "@/components/layout/public-shell";
import { Icon } from "@/components/ui/icon";
import { normalizeReturnPath } from "@/server/navigation/return-path";

export const metadata: Metadata = { title: "Sign in" };

type PageProps = {
  searchParams: Promise<{ returnTo?: string | string[] }>;
};

export default async function SignInPage({ searchParams }: PageProps) {
  const { returnTo: rawReturnTo } = await searchParams;
  const returnTo = normalizeReturnPath(rawReturnTo);
  const apiKey = process.env["NEXT_PUBLIC_FIREBASE_API_KEY"];
  const appId = process.env["NEXT_PUBLIC_FIREBASE_APP_ID"];
  const authDomain = process.env["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"];
  const projectId = process.env["NEXT_PUBLIC_FIREBASE_PROJECT_ID"];
  const config: FirebasePublicConfig | null = apiKey && appId && authDomain && projectId
    ? { apiKey, appId, authDomain, projectId }
    : null;

  return (
    <PublicShell current={null}>
      <div className="auth-layout contour-surface">
        <section className="auth-copy">
          <span className="eyebrow">Save only when you choose</span>
          <h1>Your route can travel with you.</h1>
          <p>An account will persist equipment, editable programs, workout snapshots, records, analytics, and preferences. Guest browsing remains temporary.</p>
          <ul>
            <li><Icon name="map" /> Equipment-aware program revisions</li>
            <li><Icon name="sample" /> Resumable workouts and immutable history</li>
            <li><Icon name="library" /> Custom exercises and approved demos</li>
          </ul>
        </section>
        <section className="auth-sheet" aria-labelledby="auth-heading">
          {config ? (
            <AuthPanel config={config} returnTo={returnTo} />
          ) : (
            <>
              <div className="status-stamp">Credential gate</div>
              <h2 id="auth-heading">Sign-in connection pending</h2>
              <p>Firebase project credentials and server session keys are not available in this workspace. Sign-in stays closed instead of simulating account creation.</p>
              <button className="auth-method" disabled type="button"><Icon name="sign-in" /> Continue with Google</button>
              <button className="auth-method" disabled type="button">Continue with email</button>
              <small>Password accounts will require verified email before permanent mutations. Google identity must be verified by Firebase Admin on the server.</small>
            </>
          )}
          <Link className="back-link" href="/program"><Icon name="arrow-left" /> Browse the free program</Link>
        </section>
      </div>
    </PublicShell>
  );
}
