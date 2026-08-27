import { describe, expect, it } from "vitest";

import {
  buildWorkoutRouteCandidates,
  effectiveWorkoutExerciseIds,
} from "@/server/workout-route-model";

describe("owned workout server route model", () => {
  it("builds only equipment-compatible canonical and owner-provided substitutions", () => {
    const candidates = buildWorkoutRouteCandidates("dumbbells", [
      {
        id: "10000000-0000-4000-8000-000000000001",
        name: "My neutral-grip press",
        loggingKind: "weight_reps",
        equipmentIds: ["dumbbells"],
        aliases: [],
      },
      {
        id: "10000000-0000-4000-8000-000000000002",
        name: "My rack squat",
        loggingKind: "weight_reps",
        equipmentIds: ["barbell", "rack"],
        aliases: [],
      },
    ]);

    expect(candidates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: "Dumbbell bench press",
        loggingKind: "weight_reps",
      }),
      {
        id: "10000000-0000-4000-8000-000000000001",
        name: "My neutral-grip press",
        loggingKind: "weight_reps",
      },
    ]));
    expect(candidates.some(({ name }) => name === "Barbell bench press")).toBe(false);
    expect(candidates.some(({ name }) => name === "My rack squat")).toBe(false);
    expect(new Set(candidates.map(({ id }) => id)).size).toBe(candidates.length);
  });

  it("maps exactly one effective exercise identity per immutable snapshot", () => {
    expect(effectiveWorkoutExerciseIds([
      {
        snapshotId: "snapshot-a",
        effectiveCatalogExerciseId: "catalog-a",
        effectiveCustomExerciseId: undefined,
      },
      {
        snapshotId: "snapshot-b",
        effectiveCatalogExerciseId: undefined,
        effectiveCustomExerciseId: "custom-b",
      },
    ])).toEqual({
      "snapshot-a": "catalog-a",
      "snapshot-b": "custom-b",
    });

    expect(() => effectiveWorkoutExerciseIds([{
      snapshotId: "snapshot-a",
      effectiveCatalogExerciseId: "catalog-a",
      effectiveCustomExerciseId: "custom-a",
    }])).toThrow(/identity/i);
  });

  it("uses an immutable snapshot equipment list when the active profile has since changed", () => {
    const customExercises = [
      {
        id: "10000000-0000-4000-8000-000000000001",
        name: "My neutral-grip press",
        loggingKind: "weight_reps" as const,
        equipmentIds: ["dumbbells"] as const,
        aliases: [],
      },
      {
        id: "10000000-0000-4000-8000-000000000002",
        name: "My rack squat",
        loggingKind: "weight_reps" as const,
        equipmentIds: ["barbell", "rack"] as const,
        aliases: [],
      },
    ];
    const oldSnapshotCandidates = buildWorkoutRouteCandidates(
      "barbell",
      customExercises,
      ["dumbbells", "bodyweight", "bench"],
    );

    expect(oldSnapshotCandidates.some(({ name }) => name === "Barbell bench press")).toBe(false);
    expect(oldSnapshotCandidates.some(({ name }) => name === "My rack squat")).toBe(false);
    expect(oldSnapshotCandidates.some(({ name }) => name === "Dumbbell bench press")).toBe(true);
    expect(oldSnapshotCandidates.some(({ name }) => name === "My neutral-grip press")).toBe(true);
  });
});
