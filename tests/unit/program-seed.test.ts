import { describe, expect, it } from "vitest";

import { EQUIPMENT_PROFILES } from "@/domain/equipment";
import { createStarterProgram } from "@/domain/programs/starter";

describe("starter program", () => {
  it("builds the exact five-day dumbbell route", () => {
    const program = createStarterProgram(EQUIPMENT_PROFILES.dumbbells);

    expect(program.days.map((day) => day.name)).toEqual([
      "Push",
      "Pull",
      "Legs",
      "Upper",
      "Lower",
    ]);
    expect(program.days.find((day) => day.name === "Pull")?.exerciseSlugs).toEqual([
      "chest-supported-dumbbell-row",
      "one-arm-dumbbell-row",
      "dumbbell-pullover",
      "dumbbell-curl",
      "bird-dog",
      "side-plank",
    ]);
    expect(program.days.find((day) => day.name === "Lower")?.exerciseSlugs).toEqual([
      "goblet-squat",
      "dumbbell-romanian-deadlift",
      "bulgarian-split-squat",
      "dumbbell-hip-thrust",
      "dead-bug",
      "side-plank",
    ]);
  });

  it("changes only the required barbell variations", () => {
    const program = createStarterProgram(EQUIPMENT_PROFILES.barbell);

    expect(program.days.find((day) => day.name === "Pull")?.exerciseSlugs[0]).toBe(
      "barbell-bent-over-row",
    );
    expect(program.days.find((day) => day.name === "Upper")?.exerciseSlugs.slice(0, 2)).toEqual([
      "barbell-bench-press",
      "barbell-bent-over-row",
    ]);
    expect(program.days.find((day) => day.name === "Lower")?.exerciseSlugs).toEqual([
      "barbell-back-squat",
      "barbell-romanian-deadlift",
      "bulgarian-split-squat",
      "barbell-hip-thrust",
      "dead-bug",
      "side-plank",
    ]);
  });

  it("assigns core and cardio to every day with editable defaults", () => {
    const program = createStarterProgram(EQUIPMENT_PROFILES.dumbbells);

    for (const day of program.days) {
      expect(day.sections.some((section) => section.kind === "core")).toBe(true);
      expect(day.cardio.walker.enabled).toBe(true);
      expect(day.cardio.runner.enabled).toBe(true);
    }

    const bench = program.days[0]?.prescriptions[0];
    expect(bench).toMatchObject({ sets: 3, minimumReps: 8, maximumReps: 12, restSeconds: 90 });
  });
});
