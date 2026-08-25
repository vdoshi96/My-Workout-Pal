import { describe, expect, it } from "vitest";

import { EQUIPMENT_PROFILES } from "@/domain/equipment";
import { previewOwnedEquipmentChange } from "@/domain/programs/owned-equipment-preview";

const program = {
  equipmentProfileKind: "dumbbells" as const,
  days: [
    {
      dayKey: "push",
      displayName: "Push",
      sections: [
        {
          kind: "strength" as const,
          prescriptions: [
            {
              id: "push-bench",
              label: "Dumbbell bench press",
              exercise: {
                kind: "catalog" as const,
                name: "Dumbbell bench press",
                requiredEquipment: ["dumbbells", "bench"] as const,
                slug: "dumbbell-bench-press",
              },
            },
          ],
        },
      ],
    },
    {
      dayKey: "lower",
      displayName: "Lower",
      sections: [
        {
          kind: "strength" as const,
          prescriptions: [
            {
              id: "lower-squat",
              label: "Heavy goblet squat",
              exercise: {
                kind: "catalog" as const,
                name: "Goblet squat",
                requiredEquipment: ["dumbbells"] as const,
                slug: "goblet-squat",
              },
            },
            {
              id: "private-rack-row",
              label: "Private rack row",
              exercise: {
                kind: "custom" as const,
                name: "Private rack row",
                requiredEquipment: ["rack"] as const,
                slug: "private-rack-row",
              },
            },
          ],
        },
      ],
    },
  ],
};

describe("owned equipment-change preview", () => {
  it("shows day-scoped replacements while retaining compatible movements", () => {
    const preview = previewOwnedEquipmentChange(program, EQUIPMENT_PROFILES.barbell);

    expect(preview.changes).toEqual([
      expect.objectContaining({
        dayDisplayName: "Lower",
        fromName: "Heavy goblet squat",
        toName: "Barbell back squat",
      }),
    ]);
    expect(preview.changes.some((change) => change.prescriptionId === "push-bench")).toBe(false);
    expect(preview.canConfirm).toBe(true);
  });

  it("blocks an incompatible custom movement before confirmation", () => {
    const dumbbellOnly = {
      ...program,
      equipmentProfileKind: "barbell" as const,
    };
    const preview = previewOwnedEquipmentChange(dumbbellOnly, EQUIPMENT_PROFILES.dumbbells);

    expect(preview.blockers).toEqual([
      expect.objectContaining({
        exerciseName: "Private rack row",
        requiredEquipment: ["rack"],
      }),
    ]);
    expect(preview.canConfirm).toBe(false);
  });

  it("returns a no-change preview for the active profile", () => {
    const preview = previewOwnedEquipmentChange(program, EQUIPMENT_PROFILES.dumbbells);

    expect(preview).toMatchObject({ blockers: [], canConfirm: false, changes: [] });
  });
});
