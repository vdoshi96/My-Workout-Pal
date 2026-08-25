import Link from "next/link";
import type { ReactNode } from "react";

import { AuthenticatedNav } from "@/components/layout/authenticated-nav";
import { Icon } from "@/components/ui/icon";
import type { ViewerContext } from "@/server/auth/viewer";

export function AuthenticatedShell({
  children,
  viewer,
}: Readonly<{
  children: ReactNode;
  viewer: ViewerContext;
}>) {
  return (
    <div className="member-frame">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="member-header">
        <Link aria-label="My Workout Pal account home" className="brand" href="/app">
          <span aria-hidden="true" className="brand-mark"><Icon name="map" /></span>
          <span>
            <strong>My Workout Pal</strong>
            <small>Saved training route</small>
          </span>
        </Link>
        <div className="member-identity">
          <span>{viewer.displayName}</span>
          <small className={viewer.eligibleForPermanentMutations ? "identity-ready" : "identity-limited"}>
            {viewer.eligibleForPermanentMutations ? "Verified account" : "Email verification required"}
          </small>
        </div>
        <AuthenticatedNav />
      </header>
      {!viewer.eligibleForPermanentMutations ? (
        <aside className="verification-banner" role="status">
          <strong>Read-only account.</strong> Verify your email, then sign in again before saving permanent changes.
        </aside>
      ) : null}
      <main className="member-main" id="main-content">{children}</main>
    </div>
  );
}
