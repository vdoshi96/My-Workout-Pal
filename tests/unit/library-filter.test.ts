import { describe, expect, it } from "vitest";

import { EQUIPMENT_PROFILES } from "@/domain/equipment";
import { listCatalogExercises, listOwnedCustomExercises } from "@/domain/exercises/library";

describe("exercise library filtering", () => {
  it("returns the canonical catalog in stable name order", () => {
    const exercises = listCatalogExercises({ profile: EQUIPMENT_PROFILES.barbell });

    expect(exercises.length).toBeGreaterThan(0);
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
    ).toEqual([
      "dumbbell-romanian-deadlift",
      "single-leg-dumbbell-romanian-deadlift",
    ]);
    expect(
      listCatalogExercises({ profile: EQUIPMENT_PROFILES.barbell, query: "rack squat" }).map(
        (exercise) => exercise.slug,
      ),
    ).toEqual([
      "barbell-back-squat",
      "barbell-front-squat",
      "zercher-squat",
    ]);
  });

  it("filters only compatible owner-provided custom records with aliases", () => {
    const custom = [
      {
        id: "dumbbell-row",
        aliases: [{ alias: "supported row", normalizedAlias: "supported row" }],
        equipmentIds: ["dumbbells"] as const,
        loggingKind: "weight_reps" as const,
        name: "My supported row",
      },
      {
        id: "rack-row",
        aliases: [{ alias: "private rack pull", normalizedAlias: "private rack pull" }],
        equipmentIds: ["barbell", "rack"] as const,
        loggingKind: "weight_reps" as const,
        name: "My rack row",
      },
    ];

    expect(
      listOwnedCustomExercises(custom, {
        profile: EQUIPMENT_PROFILES.dumbbells,
        query: "supported",
      }).map(({ id }) => id),
    ).toEqual(["dumbbell-row"]);
    expect(
      listOwnedCustomExercises(custom, {
        profile: EQUIPMENT_PROFILES.dumbbells,
        query: "rack",
      }),
    ).toEqual([]);
  });
});
