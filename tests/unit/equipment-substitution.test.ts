import { describe, expect, it } from "vitest";

import { EQUIPMENT_PROFILES } from "@/domain/equipment";
import { createStarterProgram } from "@/domain/programs/starter";
import { previewEquipmentChange } from "@/domain/programs/substitutions";

describe("equipment substitutions", () => {
  it("preserves compatible prescription fields and clears movement-specific load targets", () => {
    const program = createStarterProgram(EQUIPMENT_PROFILES.barbell);
    const upper = program.days.find((day) => day.name === "Upper");
    if (!upper) throw new Error("Upper day fixture is missing");
    upper.prescriptions[0] = {
      ...upper.prescriptions[0]!,
      notes: "Keep a controlled pause",
      targetWeightKg: 60,
    };

    const preview = previewEquipmentChange(program, EQUIPMENT_PROFILES.dumbbells);
    const bench = preview.changes.find((change) => change.fromSlug === "barbell-bench-press");

    expect(bench).toMatchObject({
      toSlug: "dumbbell-bench-press",
      preserved: ["sets", "repRange", "rest", "section", "order", "notes"],
      cleared: ["targetWeightKg", "previousValueLink"],
    });
    expect(preview.nextProgram.days.find((day) => day.name === "Upper")?.prescriptions[0]).toMatchObject({
      exerciseSlug: "dumbbell-bench-press",
      notes: "Keep a controlled pause",
      targetWeightKg: undefined,
    });
  });

  it("does not mutate the source program", () => {
    const program = createStarterProgram(EQUIPMENT_PROFILES.barbell);
    const original = structuredClone(program);

    previewEquipmentChange(program, EQUIPMENT_PROFILES.dumbbells);

    expect(program).toEqual(original);
  });

  it("returns no changes when the profile already matches", () => {
    const program = createStarterProgram(EQUIPMENT_PROFILES.dumbbells);
    const preview = previewEquipmentChange(program, EQUIPMENT_PROFILES.dumbbells);

    expect(preview.changes).toEqual([]);
    expect(preview.nextProgram).toEqual(program);
  });
});
