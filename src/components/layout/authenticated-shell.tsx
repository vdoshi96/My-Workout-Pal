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
}: Readonly<{
  children: ReactNode;
  firebaseConfig?: FirebasePublicConfig | null;
  viewer: ViewerContext;
}>) {
  return (
    <div className="member-frame">
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
          <strong>Read-only account.</strong> Verify your email, then sign in again before saving permanent changes.
        </aside>
      ) : null}
      <main className="member-main" id="main-content" tabIndex={-1}>{children}</main>
    </div>
  );
}
