import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const planPath = resolve(
  repositoryRoot,
  "docs/plans/AUTHENTICATED-PROGRAM-CUSTOMIZATION-INSIGHTS.md",
);

describe("authenticated program customization and insights plan", () => {
  it("exists before the implementation boundary and covers the complete required plan contract", () => {
    expect(existsSync(planPath)).toBe(true);
    if (!existsSync(planPath)) return;

    const plan = readFileSync(planPath, "utf8");
    const requiredHeadings = [
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
    ];

    for (const heading of requiredHeadings) expect(plan).toContain(heading);
    for (const requiredBoundary of [
      "program collection",
      "custom exercise",
      "section",
      "equipment-change preview",
      "immutable workout snapshot",
      "personal-record projection",
      "progress",
      "preferences",
      "Alice",
      "Bob",
      "no-store",
      "Chromium",
      "WebKit",
      "literal offline",
      "hosted Firebase",
    ]) {
      expect(plan).toContain(requiredBoundary);
    }
  });
});
