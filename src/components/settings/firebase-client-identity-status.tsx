"use client";

import Link from "next/link";

import type { FirebaseClientIdentityState } from "@/client/firebase-client-auth-readiness";

const settingsSignInHref = "/sign-in?returnTo=%2Fapp%2Fsettings";

export function FirebaseClientIdentityStatus({
  onRetry,
  state,
}: Readonly<{
  onRetry: () => void;
  state: FirebaseClientIdentityState;
}>) {
  if (state.status === "loading") {
    return (
      <p aria-live="polite" className="settings-firebase-status" role="status">
        Checking…
      </p>
    );
  }

  if (state.status === "ready") return null;
  const message = state.status === "missing" || state.status === "mismatch"
    ? "Please sign in again to delete your account."
    : "Something went wrong. Try again.";

  return (
    <div className="settings-firebase-status" role="alert">
      <p>{message}</p>
      <div className="settings-firebase-actions">
        {state.status === "unavailable" ? (
          <button onClick={onRetry} type="button">Try again</button>
        ) : null}
        <Link href={settingsSignInHref}>Sign in again</Link>
      </div>
    </div>
  );
}
