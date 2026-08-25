import { describe, expect, it } from "vitest";

import { CATALOG_EXERCISES } from "@/domain/exercises/catalog";
import {
  assertDefaultYouTubeCurationTargets,
  buildDefaultYouTubeCurationTargets,
} from "@/domain/youtube/targets";

describe("default YouTube curation targets", () => {
  it("covers each catalog record exactly once with the durable canonical variation", () => {
    const targets = buildDefaultYouTubeCurationTargets();
    const keys = targets.map((target) => `${target.canonicalExerciseSlug}::${target.variationId}`);

    expect(targets).toHaveLength(27);
    expect(new Set(keys).size).toBe(targets.length);
    expect(new Set(targets.map((target) => target.canonicalExerciseSlug))).toEqual(
      new Set(Object.keys(CATALOG_EXERCISES)),
    );
    expect(targets.every((target) => target.variationId === "canonical")).toBe(true);
  });

  it("derives useful movement aliases and equipment discriminators without requiring bodyweight in titles", () => {
    const targets = buildDefaultYouTubeCurationTargets();
    const dumbbellBenchPress = targets.find((target) => target.canonicalExerciseSlug === "dumbbell-bench-press");
    const barbellBenchPress = targets.find((target) => target.canonicalExerciseSlug === "barbell-bench-press");
    const deadBug = targets.find((target) => target.canonicalExerciseSlug === "dead-bug");

    expect(dumbbellBenchPress).toMatchObject({ movement: "bench press" });
    expect(dumbbellBenchPress?.aliases?.length).toBeGreaterThan(0);
    expect(dumbbellBenchPress?.requiredEquipmentTerms).toContain("dumbbell");
    expect(barbellBenchPress?.requiredEquipmentTerms).toContain("barbell");
    expect(deadBug?.requiredEquipmentTerms ?? []).not.toContain("bodyweight");
    expect(deadBug?.requiredEquipmentTerms ?? []).not.toContain("body weight");
  });

  it("rejects duplicate or incomplete default target sets", () => {
    const targets = buildDefaultYouTubeCurationTargets();

    expect(() => assertDefaultYouTubeCurationTargets([...targets, targets[0]!])).toThrow(
      "exactly one",
    );
    expect(() => assertDefaultYouTubeCurationTargets(targets.slice(1))).toThrow(
      "catalog",
    );
  });
});
