import type { Metadata } from "next";
import Link from "next/link";

import { PublicShell } from "@/components/layout/public-shell";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  const firebaseConfigured = Boolean(
    process.env["NEXT_PUBLIC_FIREBASE_API_KEY"] &&
    process.env["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"] &&
    process.env["NEXT_PUBLIC_FIREBASE_PROJECT_ID"],
  );

  return (
    <PublicShell current="sign-in">
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
          <div className="status-stamp">{firebaseConfigured ? "Configuration detected" : "Credential gate"}</div>
          <h2 id="auth-heading">Sign-in connection pending</h2>
          <p>{firebaseConfigured
            ? "Firebase public configuration is present, but server session verification is not yet enabled. Sign-in remains closed so no identity is handled insecurely."
            : "Firebase project credentials and server session keys are not available in this workspace. Sign-in stays closed instead of simulating account creation."}</p>
          <button className="auth-method" disabled type="button"><Icon name="sign-in" /> Continue with Google</button>
          <button className="auth-method" disabled type="button">Continue with email</button>
          <small>Password accounts will require verified email before permanent mutations. Google identity must be verified by Firebase Admin on the server.</small>
          <Link className="back-link" href="/"><Icon name="arrow-left" /> Continue as guest</Link>
        </section>
      </div>
    </PublicShell>
  );
}
