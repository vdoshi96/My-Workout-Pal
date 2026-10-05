import type { Metadata } from "next";
import Link from "next/link";

import type { FirebasePublicConfig } from "@/client/firebase";
import { AuthPanel } from "@/components/auth/auth-panel";
import { PublicShell } from "@/components/layout/public-shell";
import { SceneStage } from "@/components/ui/scene-stage";
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
    <PublicShell current="account">
      <SceneStage scene="pal" />
      <header className="pal-page-head">
        <h1>Sign in to save your workouts</h1>
        <p>Keep your routine, history and records on any device.</p>
      </header>
      <div className="pal-page-body pal-auth">
        <section className="pal-auth-panel" aria-labelledby="auth-heading">
          {config ? (
            <AuthPanel config={config} returnTo={returnTo} />
          ) : (
            <>
              <h2 id="auth-heading">Sign-in is unavailable</h2>
              <p>Please try again later.</p>
              <button className="auth-method" disabled type="button"><Icon name="sign-in" /> Continue with Google</button>
              <button className="auth-method" disabled type="button">Continue with email</button>
            </>
          )}
        </section>
        <ul className="pal-explain">
          <li><Icon name="map" /> A routine that fits your goal and equipment</li>
          <li><Icon name="sample" /> Pick up where you left off</li>
          <li><Icon name="library" /> Demos and your own custom movements</li>
        </ul>
        <Link className="pal-back-link" href="/try"><Icon name="arrow-right" /> Not ready? Take a test drive first</Link>
      </div>
    </PublicShell>
  );
}
