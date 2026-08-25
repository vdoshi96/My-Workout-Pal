import { describe, expect, it } from "vitest";

import { EQUIPMENT_PROFILES } from "@/domain/equipment";
import { createStarterProgram } from "@/domain/programs/starter";
import { previewEquipmentChange } from "@/domain/programs/substitutions";

describe("equipment substitutions", () => {
  it("previews only the required day-scoped starter substitutions in both directions", () => {
    const dumbbells = createStarterProgram(EQUIPMENT_PROFILES.dumbbells);
    const barbellPreview = previewEquipmentChange(dumbbells, EQUIPMENT_PROFILES.barbell);
    const slugs = (dayName: string) =>
      barbellPreview.nextProgram.days
        .find((day) => day.name === dayName)
        ?.prescriptions.map((prescription) => prescription.exerciseSlug);

    expect(slugs("Push")?.[0]).toBe("dumbbell-bench-press");
    expect(slugs("Pull")?.[0]).toBe("barbell-bent-over-row");
    expect(slugs("Legs")?.slice(0, 2)).toEqual([
      "goblet-squat",
      "dumbbell-romanian-deadlift",
    ]);
    expect(slugs("Upper")?.slice(0, 2)).toEqual([
      "barbell-bench-press",
      "barbell-bent-over-row",
    ]);
    expect(slugs("Lower")?.slice(0, 4)).toEqual([
      "barbell-back-squat",
      "barbell-romanian-deadlift",
      "bulgarian-split-squat",
      "barbell-hip-thrust",
    ]);

    const barbell = createStarterProgram(EQUIPMENT_PROFILES.barbell);
    const dumbbellPreview = previewEquipmentChange(barbell, EQUIPMENT_PROFILES.dumbbells);
    expect(
      dumbbellPreview.nextProgram.days
        .find((day) => day.name === "Lower")
        ?.prescriptions.slice(0, 4)
        .map((prescription) => prescription.exerciseSlug),
    ).toEqual([
      "goblet-squat",
      "dumbbell-romanian-deadlift",
      "bulgarian-split-squat",
      "dumbbell-hip-thrust",
    ]);
  });

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
