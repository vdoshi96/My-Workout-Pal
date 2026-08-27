import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { normalizedMemberLibraryQuery } from "@/domain/exercises/member-library-query";

const repositoryRoot = resolve(import.meta.dirname, "../..");

describe("authenticated library query boundary", () => {
  it("accepts one bounded string and fails repeated or malformed values closed", () => {
    expect(normalizedMemberLibraryQuery("  squat  ")).toBe("squat");
    expect(normalizedMemberLibraryQuery("x".repeat(121))).toHaveLength(120);
    expect(normalizedMemberLibraryQuery(["row", "squat"])).toBe("");
    expect(normalizedMemberLibraryQuery({ q: "row" })).toBe("");
    expect(normalizedMemberLibraryQuery(undefined)).toBe("");
  });

  it("keeps production and fixture pages on the same normalizer", () => {
    for (const relativePath of [
      "src/app/app/library/page.tsx",
      "tests/fixtures/authenticated-app/app/app/library/page.tsx",
    ]) {
      const page = readFileSync(resolve(repositoryRoot, relativePath), "utf8");
      expect(page).toContain("normalizedMemberLibraryQuery");
      expect(page).not.toContain("q?.trim()");
    }
  });

  it("keeps production and fixture editors on one candidate read-model transformation", () => {
    for (const relativePath of [
      "src/app/app/program/edit/page.tsx",
      "tests/fixtures/authenticated-app/app/app/program/edit/page.tsx",
    ]) {
      const page = readFileSync(resolve(repositoryRoot, relativePath), "utf8");
      expect(page).toContain("loadProgramEditorReadModel");
      expect(page).not.toContain("listCatalogExercises");
      expect(page).not.toContain("listOwnedCustomExercises");
    }
  });
});
