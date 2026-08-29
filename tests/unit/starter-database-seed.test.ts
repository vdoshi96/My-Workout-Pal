import { describe, expect, it } from "vitest";

import { CATALOG_EXERCISES } from "@/domain/exercises/catalog";
import { buildStarterDatabaseSeed } from "@/domain/seed/starter-database";

describe("database-neutral starter seed manifest", () => {
  it("covers each canonical catalog record once without duplicating owned truth", () => {
    const seed = buildStarterDatabaseSeed();
    const slugs = seed.exercises.map(({ slug }) => slug);

    expect(slugs).toHaveLength(Object.keys(CATALOG_EXERCISES).length);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(slugs)).toEqual(new Set(Object.keys(CATALOG_EXERCISES)));
    expect(seed.exerciseEquipment.every(({ exerciseSlug }) => slugs.includes(exerciseSlug))).toBe(
      true,
    );
    expect(
      seed.exerciseAliases.every(
        ({ alias, normalizedAlias }) => normalizedAlias === alias.trim().toLowerCase(),
      ),
    ).toBe(true);
  });

  it("derives two five-day template revisions from the canonical program domain", () => {
    const seed = buildStarterDatabaseSeed();

    expect(seed.template.templateKey).toBe("five-day-starter-route");
    expect(seed.template.revisions.map(({ equipmentProfileKind }) => equipmentProfileKind)).toEqual([
      "dumbbells",
      "barbell",
    ]);
    for (const revision of seed.template.revisions) {
      expect(revision.days.map(({ dayKey }) => dayKey)).toEqual([
        "push",
        "pull",
        "legs",
        "upper",
        "lower",
      ]);
      expect(revision.days.every(({ cardio }) => cardio.length === 2)).toBe(true);
      expect(
        revision.days.every(({ sections }) => sections.some(({ kind }) => kind === "core")),
      ).toBe(true);
    }
  });

  it("preserves exact profile substitutions while reusing canonical exercise keys", () => {
    const seed = buildStarterDatabaseSeed();
    const dumbbells = seed.template.revisions[0]!;
    const barbell = seed.template.revisions[1]!;
    const exerciseSlugs = (revision: typeof dumbbells, dayKey: string) =>
      revision.days
        .find((day) => day.dayKey === dayKey)!
        .sections.flatMap(({ prescriptions }) => prescriptions.map(({ exerciseSlug }) => exerciseSlug));

    expect(exerciseSlugs(dumbbells, "pull")[0]).toBe("chest-supported-dumbbell-row");
    expect(exerciseSlugs(barbell, "pull")[0]).toBe("barbell-bent-over-row");
    expect(exerciseSlugs(dumbbells, "lower")).toContain("dumbbell-hip-thrust");
    expect(exerciseSlugs(barbell, "lower")).toContain("barbell-hip-thrust");
    expect(
      dumbbells.days
        .find(({ dayKey }) => dayKey === "lower")!
        .sections.flatMap(({ prescriptions }) => prescriptions)
        .find(({ exerciseSlug }) => exerciseSlug === "goblet-squat")?.displayName,
    ).toBe("Heavy goblet squat");
  });

  it("emits only valid editable default measurement shapes", () => {
    const seed = buildStarterDatabaseSeed();
    const prescriptions = seed.template.revisions.flatMap(({ days }) =>
      days.flatMap(({ sections }) => sections.flatMap(({ prescriptions }) => prescriptions)),
    );

    for (const prescription of prescriptions) {
      if (prescription.measurementKind === "duration") {
        expect(prescription).toMatchObject({
          setCount: 2,
          minimumReps: undefined,
          maximumReps: undefined,
          minimumSeconds: 20,
          maximumSeconds: 45,
          restSeconds: 60,
        });
      } else {
        expect(prescription.minimumReps).toBeGreaterThan(0);
        expect(prescription.maximumReps).toBeGreaterThanOrEqual(prescription.minimumReps!);
        expect(prescription.minimumSeconds).toBeUndefined();
        expect(prescription.maximumSeconds).toBeUndefined();
      }
      expect(prescription.targetWeightKg).toBeUndefined();
    }
  });
});
