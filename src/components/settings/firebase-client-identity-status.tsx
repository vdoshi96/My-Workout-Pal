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
        Checking the browser Firebase sign-in before enabling permanent deletion…
      </p>
    );
  }

  if (state.status === "ready") {
    return (
      <p aria-live="polite" className="settings-firebase-status" role="status">
        Browser Firebase sign-in is ready for same-account reauthentication.
      </p>
    );
  }

  const message = state.status === "missing"
    ? "The browser Firebase sign-in could not be found after initialization."
    : state.status === "mismatch"
      ? "The browser Firebase sign-in does not match this secure server session."
      : "Firebase sign-in did not finish loading safely.";

  return (
    <div className="settings-firebase-status" role="alert">
      <p>{message} Permanent deletion remains disabled.</p>
      <div className="settings-firebase-actions">
        {state.status === "unavailable" ? (
          <button onClick={onRetry} type="button">Retry Firebase check</button>
        ) : null}
        <Link href={settingsSignInHref}>Sign in again</Link>
      </div>
    </div>
  );
}
