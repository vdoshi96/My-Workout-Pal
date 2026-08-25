import { describe, expect, it } from "vitest";

import { EQUIPMENT_PROFILES } from "@/domain/equipment";
import { listCatalogExercises } from "@/domain/exercises/library";

describe("exercise library filtering", () => {
  it("returns the canonical catalog in stable name order", () => {
    const exercises = listCatalogExercises({ profile: EQUIPMENT_PROFILES.barbell });

    expect(exercises).toHaveLength(27);
    expect(exercises.map((exercise) => exercise.name)).toEqual(
      [...exercises].map((exercise) => exercise.name).sort((left, right) => left.localeCompare(right)),
    );
  });

  it("hides movements that the selected equipment profile cannot perform", () => {
    const dumbbellOnly = listCatalogExercises({ profile: EQUIPMENT_PROFILES.dumbbells });

    expect(dumbbellOnly.some((exercise) => exercise.slug === "barbell-back-squat")).toBe(false);
    expect(dumbbellOnly.some((exercise) => exercise.slug === "goblet-squat")).toBe(true);
  });

  it("matches case-insensitive name terms after compatibility filtering", () => {
    const rowMatches = listCatalogExercises({
      profile: EQUIPMENT_PROFILES.dumbbells,
      query: "supported row",
    });

    expect(rowMatches.map((exercise) => exercise.slug)).toEqual(["chest-supported-dumbbell-row"]);
    expect(
      listCatalogExercises({ profile: EQUIPMENT_PROFILES.dumbbells, query: "barbell squat" }),
    ).toEqual([]);
  });

  it("searches aliases, muscles, movement families, and equipment", () => {
    expect(
      listCatalogExercises({ profile: EQUIPMENT_PROFILES.dumbbells, query: "pecs" }).some(
        (exercise) => exercise.slug === "dumbbell-bench-press",
      ),
    ).toBe(true);
    expect(
      listCatalogExercises({ profile: EQUIPMENT_PROFILES.dumbbells, query: "RDL" }).map(
        (exercise) => exercise.slug,
      ),
    ).toEqual(["dumbbell-romanian-deadlift"]);
    expect(
      listCatalogExercises({ profile: EQUIPMENT_PROFILES.barbell, query: "rack squat" }).map(
        (exercise) => exercise.slug,
      ),
    ).toEqual(["barbell-back-squat"]);
  });
});
