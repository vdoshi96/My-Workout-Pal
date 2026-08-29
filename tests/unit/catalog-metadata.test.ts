import { describe, expect, it } from "vitest";

import { CATALOG_EXERCISES } from "@/domain/exercises/catalog";
import { CATALOG_MANIFEST_RECORDS } from "@/domain/exercises/catalog-manifests";

describe("canonical exercise metadata", () => {
  it("gives every seeded exercise muscles, aliases, movement family, and original cues", () => {
    const exercises = Object.values(CATALOG_EXERCISES);

    expect(exercises).toHaveLength(CATALOG_MANIFEST_RECORDS.length);
    for (const exercise of exercises) {
      expect(exercise.primaryMuscles.length).toBeGreaterThan(0);
      expect(exercise.aliases.length).toBeGreaterThan(0);
      expect(exercise.movementFamily).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(exercise.instructions.length).toBeGreaterThanOrEqual(3);
      expect(exercise.instructions.length).toBeLessThanOrEqual(4);
      expect(exercise.instructions.join(" ")).not.toMatch(
        /\b(?:cure|diagnos|heal|injury-proof|pain[- ]?free|treat)\b/i,
      );
    }
  });

  it("uses unique normalized aliases within each canonical record", () => {
    for (const exercise of Object.values(CATALOG_EXERCISES)) {
      const normalized = exercise.aliases.map((alias) =>
        alias.trim().toLocaleLowerCase("en-US"),
      );
      expect(new Set(normalized).size).toBe(normalized.length);
    }
  });

  it("shares movement families only where equipment variations are intentional", () => {
    expect(CATALOG_EXERCISES["dumbbell-bench-press"]?.movementFamily).toBe(
      "bench-press",
    );
    expect(CATALOG_EXERCISES["barbell-bench-press"]?.movementFamily).toBe(
      "bench-press",
    );
    expect(
      CATALOG_EXERCISES["dumbbell-romanian-deadlift"]?.movementFamily,
    ).toBe("romanian-deadlift");
    expect(CATALOG_EXERCISES["barbell-romanian-deadlift"]?.movementFamily).toBe(
      "romanian-deadlift",
    );
  });
});
