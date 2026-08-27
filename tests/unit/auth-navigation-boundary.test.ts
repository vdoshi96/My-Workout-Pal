import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

describe("authenticated session navigation boundary", () => {
  it("uses full-document replacement after session creation and deletion", () => {
    const authPanel = source("src/components/auth/auth-panel.tsx");
    const accountShell = source(
      "src/components/layout/authenticated-session-sign-out.tsx",
    );
    const settings = source("src/components/settings/settings-form.tsx");

    expect(authPanel).toContain("window.location.replace(returnTo)");
    expect(authPanel).not.toContain("router.replace(returnTo)");
    expect(accountShell).toContain('window.location.replace("/sign-in")');
    expect(accountShell).not.toContain('router.replace("/sign-in")');
    expect(settings).toContain('window.location.replace("/sign-in")');
    expect(settings).not.toContain('router.replace("/sign-in")');
  });
});
