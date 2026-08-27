import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const planPath = resolve(
  repositoryRoot,
  "docs/plans/AUTHENTICATED-PROGRAM-CUSTOMIZATION-INSIGHTS.md",
);
const gitignorePath = resolve(repositoryRoot, ".gitignore");

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

  it("keeps the audited customization and insight invariants explicit", () => {
    const plan = readFileSync(planPath, "utf8");

    for (const auditedInvariant of [
      "exactly one nonempty `core` section",
      "non-removable section kind",
      "removes Push's non-core Accessory section",
      "reactivates the original dumbbell program",
      "non-no-op dumbbell-to-barbell",
      "immutable owner-scoped workout exercise state or snapshot",
      "oldest-first pre-group row cap is forbidden",
      "versioned rebuild",
      "requires `--apply`",
      "never stores a Firebase UID",
      "never downgrades an unknown or newer stored version",
      "current read model excludes them",
      "A semantic metric change requires a new record type",
      "removes older recognized metrics",
      "includes `catalog` or `custom` identity kind",
      "All set-derived metrics use work sets only",
      "`bodyweight_reps` volume",
      "newest 180 completed workouts",
      "`Logged distance`",
      "Actual 200 percent browser zoom remains a separate headed, manual pre-merge gate",
      "unchanged canonical kilograms, meters, seconds",
      "three-decimal metre scale",
      "genuine sequential keyboard entry",
      "completed Pull workout",
      "historical Pull route",
      "weightKg × (1 + repetitions / 30)",
      "one repetition is not special-cased",
      "zero-load weight-and-repetitions set emits repetitions only",
      "counts prove write multiplicity and absence of extra rows, not canonical value equality",
      "first-party request-failure",
    ]) {
      expect(plan).toContain(auditedInvariant);
    }

    expect(plan).not.toContain("completed Push workout");
    expect(plan).not.toContain("keeps its original exercise, equipment, target, unit");
    expect(plan).not.toContain("Every finite nonnegative candidate");
  });

  it("ignores a worktree dependency symlink without broadening unrelated paths", () => {
    const entries = readFileSync(gitignorePath, "utf8").split(/\r?\n/u);

    expect(entries).toContain("node_modules");
    expect(entries).not.toContain("node_modules/");
  });
});
