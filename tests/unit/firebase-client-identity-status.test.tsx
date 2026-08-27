import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { FirebaseClientIdentityStatus } from "@/components/settings/firebase-client-identity-status";

describe("Firebase client identity status", () => {
  it("renders a polite loading state without offering deletion recovery early", () => {
    const markup = renderToStaticMarkup(
      <FirebaseClientIdentityStatus
        onRetry={vi.fn()}
        state={{ status: "loading" }}
      />,
    );

    expect(markup).toContain("Checking the browser Firebase sign-in");
    expect(markup).toContain('role="status"');
    expect(markup).not.toContain("Sign in again");
  });

  it("renders a non-sensitive ready state", () => {
    const markup = renderToStaticMarkup(
      <FirebaseClientIdentityStatus
        onRetry={vi.fn()}
        state={{ status: "ready" }}
      />,
    );

    expect(markup).toContain("ready for same-account reauthentication");
    expect(markup).not.toContain("/sign-in");
  });

  it.each([
    ["missing", "could not be found"],
    ["mismatch", "does not match this secure server session"],
  ] as const)("renders a bounded sign-in recovery for %s", (status, copy) => {
    const markup = renderToStaticMarkup(
      <FirebaseClientIdentityStatus
        onRetry={vi.fn()}
        state={{ status }}
      />,
    );

    expect(markup).toContain(copy);
    expect(markup).toContain('role="alert"');
    expect(markup).toContain('href="/sign-in?returnTo=%2Fapp%2Fsettings"');
    expect(markup).toContain("Sign in again");
  });

  it("offers a bounded retry without exposing provider details when initialization is unavailable", () => {
    const markup = renderToStaticMarkup(
      <FirebaseClientIdentityStatus
        onRetry={vi.fn()}
        state={{ status: "unavailable" }}
      />,
    );

    expect(markup).toContain("did not finish loading safely");
    expect(markup).toContain("Retry Firebase check");
    expect(markup).toContain('href="/sign-in?returnTo=%2Fapp%2Fsettings"');
    expect(markup).not.toContain("uid");
  });
});
