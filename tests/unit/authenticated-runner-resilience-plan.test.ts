import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const planPath = resolve(
  repositoryRoot,
  "docs/plans/AUTHENTICATED-RUNNER-RESILIENCE.md",
);

describe("authenticated runner resilience plan", () => {
  it("exists before implementation and covers the required planning contract", () => {
    expect(existsSync(planPath)).toBe(true);
    if (!existsSync(planPath)) return;

    const plan = readFileSync(planPath, "utf8");
    for (const heading of [
      "## User outcome",
      "## Navigation",
      "## UI states",
      "## Domain types and invariants",
      "## Persistence contracts",
      "## Authentication and authorization",
      "## Loading, empty, error, interrupted, and worst-case behavior",
      "## Mobile, tablet, and desktop behavior",
      "## Accessibility",
      "## Privacy and security",
      "## Acceptance criteria",
      "## Automated tests and retained fail-first evidence",
      "## Browser evidence required for completion",
    ]) {
      expect(plan).toContain(heading);
    }
  });

  it("keeps the audited offline, auth, and multi-tab boundaries explicit", () => {
    const plan = readFileSync(planPath, "utf8");
    for (const invariant of [
      "Authentication and connectivity are ephemeral runtime facts",
      "`session_revoked`",
      "one read/write transaction",
      "Divergent unresolved operations for one target",
      "The product never chooses a winner from wall-clock time alone",
      "BroadcastChannel",
      "advisory only",
      "opaque namespace digest",
      "Retry connection",
      "/sign-in?returnTo=%2Fworkout%2F<session-id>",
      "Bob cannot load, merge, inspect, or clear Alice's draft",
      "real route abort/context offline state",
      "Chromium desktop and WebKit phone",
      "Hosted password/Google sign-in",
    ]) {
      expect(plan).toContain(invariant);
    }

    expect(plan).toContain(
      "Raw field tokens that have not been activated with **Save activity** remain unsent local editing projections",
    );
    expect(plan).toContain(
      "They may persist for same-device refresh recovery, but they are not operations and are never submitted",
    );
    expect(plan).not.toContain("remain tab-local editing state");
    expect(plan).not.toContain("Broadcast messages carry only an encoded owner-scoped key");
  });
});
