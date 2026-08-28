import { describe, expect, it } from "vitest";

import {
  filterMovementChooserCandidates,
  movementChooserDataSchema,
  type MovementChooserCandidate,
} from "@/domain/exercises/movement-chooser";

const candidates: readonly MovementChooserCandidate[] = [
  {
    selection: {
      source: {
        kind: "catalog",
        id: "00000000-0000-4000-8000-000000000001",
      },
      name: "Dumbbell bench press",
      loggingKind: "weight_reps",
    },
    requiredEquipment: ["dumbbells", "bench"],
    searchText: "horizontal push chest pec press",
    hasApprovedGuidance: true,
  },
  {
    selection: {
      source: {
        kind: "custom",
        id: "00000000-0000-4000-8000-000000000002",
      },
      name: "Hotel floor press",
      loggingKind: "weight_reps",
    },
    requiredEquipment: ["dumbbells"],
    searchText: "travel chest",
    hasApprovedGuidance: false,
  },
];

describe("movement chooser data", () => {
  it("accepts a bounded owner-safe response and rejects extra fields", () => {
    const response = {
      canMutate: true,
      equipmentProfileKind: "dumbbells",
      availableEquipment: ["dumbbells", "bodyweight", "bench"],
      candidates,
    } as const;
    expect(movementChooserDataSchema.parse(response)).toEqual(response);
    expect(() =>
      movementChooserDataSchema.parse({
        ...response,
        ownerFirebaseUid: "must-not-cross-the-wire",
      }),
    ).toThrow();
  });

  it("matches bounded multi-term search and source filters without changing order", () => {
    expect(filterMovementChooserCandidates(candidates, "CHEST press", "all"))
      .toEqual(candidates);
    expect(filterMovementChooserCandidates(candidates, "travel", "private"))
      .toEqual([candidates[1]]);
    expect(filterMovementChooserCandidates(candidates, "travel", "canonical"))
      .toEqual([]);
    expect(filterMovementChooserCandidates(candidates, "x".repeat(121), "all"))
      .toEqual([]);
  });
});
