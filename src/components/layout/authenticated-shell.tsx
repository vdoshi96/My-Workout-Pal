"use client";

import { useEffect, useState } from "react";
import { sendEmailVerification } from "firebase/auth";
import { getFirebaseClientAuth } from "@/client/firebase";
import Link from "next/link";
import type { ReactNode } from "react";

import type { FirebasePublicConfig } from "@/client/firebase";
import { AuthenticatedNav } from "@/components/layout/authenticated-nav";
import { AuthenticatedSessionSignOut } from "@/components/layout/authenticated-session-sign-out";
import { Icon } from "@/components/ui/icon";
import type { ViewerContext } from "@/server/auth/viewer";

export function AuthenticatedShell({
  children,
  firebaseConfig = null,
  viewer,
  reducedMotion = false,
}: Readonly<{
  children: ReactNode;
  firebaseConfig?: FirebasePublicConfig | null;
  viewer: ViewerContext;
  reducedMotion?: boolean;
}>) {
  const [verificationMessage, setVerificationMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  useEffect(() => {
    if (!cooldown) return;
    const timeout = window.setTimeout(() => setCooldown(false), 60_000);
    return () => window.clearTimeout(timeout);
  }, [cooldown]);
  async function resendVerification() {
    if (!firebaseConfig || sending || cooldown) return;
    setSending(true);
    try {
      const user = getFirebaseClientAuth(firebaseConfig).currentUser;
      if (!user || user.uid !== viewer.uid) { setVerificationMessage("Sign in again to resend the email."); return; }
      await sendEmailVerification(user);
      setVerificationMessage("Email sent. Check your inbox, then sign out and sign in again.");
      setCooldown(true);
    } catch { setVerificationMessage("Couldn't send the email. Try again later."); }
    finally { setSending(false); }
  }
  return (
    <div className="member-frame authenticated-shell-root" data-reduced-motion={reducedMotion ? "true" : undefined}>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="member-header">
        <Link className="brand" href="/app" prefetch={false}>
          <span aria-hidden="true" className="brand-mark"><Icon name="map" /></span>
          <span>
            <strong>My Workout Pal</strong>
            <small>Your workout companion</small>
          </span>
        </Link>
        <div className="member-account-controls">
          <div className="member-identity">
            <span>{viewer.displayName}</span>
            <small className={viewer.eligibleForPermanentMutations ? "identity-ready" : "identity-limited"}>
              {viewer.eligibleForPermanentMutations ? "Verified account" : "Email verification required"}
            </small>
          </div>
          <Link href="/app/settings" aria-label="Settings" className="quiet-settings-link"><Icon name="settings" /><span>Settings</span></Link>
          <AuthenticatedSessionSignOut
            firebaseConfig={firebaseConfig}
            ownerUid={viewer.uid}
          />
        </div>
        <AuthenticatedNav />
      </header>
      {!viewer.eligibleForPermanentMutations ? (
        <aside className="verification-banner" role="status">
          <p>Verify your email to save changes.</p>
          <button type="button" disabled={!firebaseConfig || sending || cooldown} onClick={() => void resendVerification()}>Resend verification email</button>
          {verificationMessage ? <p>{verificationMessage}</p> : null}
        </aside>
      ) : null}
      <main className="member-main" id="main-content" tabIndex={-1}>{children}</main>
    </div>
  );
}
