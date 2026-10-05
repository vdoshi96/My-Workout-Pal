import { describe, expect, it } from "vitest";

import { EQUIPMENT_PROFILES, supportsEquipment, type EquipmentProfileKind } from "@/domain/equipment";
import { getCatalogExercise } from "@/domain/exercises/catalog";
import {
  DAYS_PER_WEEK_OPTIONS,
  EXPERIENCE_LEVELS,
  TRAINING_GOALS,
  generateStarterRoutine,
  trainingProfileAnswersSchema,
  type DaysPerWeek,
  type ExperienceLevel,
  type GeneratedRoutine,
  type TrainingGoal,
} from "@/domain/programs/generate-routine";
import { APPROVED_CURATED_VIDEO_SEED } from "@/domain/youtube/approved-curated-video-seed";

const EQUIPMENT: readonly EquipmentProfileKind[] = ["dumbbells", "barbell"];

type Combination = Readonly<{
  goal: TrainingGoal;
  experience: ExperienceLevel;
  daysPerWeek: DaysPerWeek;
  equipment: EquipmentProfileKind;
}>;

const combinations: readonly Combination[] = TRAINING_GOALS.flatMap((goal) =>
  EXPERIENCE_LEVELS.flatMap((experience) =>
    DAYS_PER_WEEK_OPTIONS.flatMap((daysPerWeek) =>
      EQUIPMENT.map((equipment) => ({ goal, experience, daysPerWeek, equipment })),
    ),
  ),
);

/** Slugs with two approved, fully watched canonical demos. */
const approvedDemoSlugs = (() => {
  const counts = new Map<string, Set<number>>();
  for (const video of APPROVED_CURATED_VIDEO_SEED) {
    if (video.approvalState !== "approved" || video.fullWatchConfirmed !== true) continue;
    if (video.variationId !== "canonical") continue;
    const orders = counts.get(video.canonicalExerciseSlug) ?? new Set<number>();
    orders.add(video.displayOrder);
    counts.set(video.canonicalExerciseSlug, orders);
  }
  return new Set(
    [...counts].filter(([, orders]) => orders.has(1) && orders.has(2)).map(([slug]) => slug),
  );
})();

function label(combination: Combination): string {
  return `${combination.goal}/${combination.experience}/${combination.daysPerWeek}d/${combination.equipment}`;
}

function movements(routine: GeneratedRoutine) {
  return routine.days.flatMap((day) => day.sections.flatMap((section) => section.movements));
}

const expectedRanges = {
  strength: { main: { sets: [3, 4], reps: [4, 6] }, accessory: { sets: [2, 3], reps: [8, 10] }, rest: 150 },
  muscle: { main: { sets: [3, 4], reps: [8, 12] }, accessory: { sets: [3, 3], reps: [10, 15] }, rest: 90 },
  general: { main: { sets: [3, 3], reps: [8, 12] }, accessory: { sets: [2, 2], reps: [12, 15] }, rest: 75 },
  fat_loss: { main: { sets: [3, 3], reps: [10, 15] }, accessory: { sets: [2, 2], reps: [12, 15] }, rest: 60 },
  sport: { main: { sets: [3, 3], reps: [5, 8] }, accessory: { sets: [2, 2], reps: [8, 12] }, rest: 90 },
} as const satisfies Record<TrainingGoal, unknown>;

describe("generateStarterRoutine", () => {
  it("covers all 120 answer combinations", () => {
    expect(TRAINING_GOALS).toEqual(["strength", "muscle", "general", "fat_loss", "sport"]);
    expect(EXPERIENCE_LEVELS).toEqual(["new", "some", "lots"]);
    expect(DAYS_PER_WEEK_OPTIONS).toEqual([2, 3, 4, 5]);
    expect(combinations).toHaveLength(120);
    expect(approvedDemoSlugs.size).toBe(27);
  });

  it.each(combinations.map((combination) => [label(combination), combination] as const))(
    "%s has a valid structure with the right number of days and movements",
    (_name, combination) => {
      const routine = generateStarterRoutine(combination);
      expect(routine.equipmentProfileKind).toBe(combination.equipment);
      expect(routine.answers).toEqual({
        goal: combination.goal,
        experience: combination.experience,
        daysPerWeek: combination.daysPerWeek,
      });
      expect(routine.days).toHaveLength(combination.daysPerWeek);
      const perDay = { new: 4, some: 5, lots: 6 }[combination.experience];
      routine.days.forEach((day, index) => {
        expect(day.dayNumber).toBe(index + 1);
        expect(day.name.trim().length).toBeGreaterThan(0);
        expect(day.name.length).toBeLessThanOrEqual(120);
        expect(day.name.toLowerCase()).not.toContain("route");
        const dayMovements = day.sections.flatMap((section) => section.movements);
        expect(dayMovements).toHaveLength(perDay);
        expect(new Set(dayMovements.map(({ exerciseSlug }) => exerciseSlug)).size).toBe(perDay);
        expect(day.sections.length).toBeGreaterThan(0);
        const kinds = day.sections.map(({ kind }) => kind);
        expect(new Set(kinds).size).toBe(kinds.length);
        const order = ["strength", "accessory", "core"];
        expect([...kinds].sort((a, b) => order.indexOf(a) - order.indexOf(b))).toEqual(kinds);
        for (const section of day.sections) {
          expect(section.movements.length).toBeGreaterThan(0);
          expect(section.title.trim().length).toBeGreaterThan(0);
          expect(section.title.length).toBeLessThanOrEqual(120);
          for (const movement of section.movements) {
            expect(movement.sectionKind).toBe(section.kind);
            const exercise = getCatalogExercise(movement.exerciseSlug);
            expect(movement.displayName).toBe(exercise.name);
            expect(movement.loggingKind).toBe(exercise.loggingKind);
            expect(movement.measurementKind).toBe(exercise.loggingKind);
            expect(movement.setKind).toBe("work");
            expect(Number.isInteger(movement.setCount)).toBe(true);
            expect(movement.setCount).toBeGreaterThanOrEqual(1);
            expect(movement.setCount).toBeLessThanOrEqual(20);
            expect(movement.restSeconds).toBeGreaterThanOrEqual(0);
            expect(movement.restSeconds).toBeLessThanOrEqual(900);
            if (exercise.loggingKind === "duration") {
              expect(movement.minimumReps).toBeNull();
              expect(movement.maximumReps).toBeNull();
              expect(movement.minimumSeconds).toBeGreaterThan(0);
              expect(movement.minimumSeconds!).toBeLessThanOrEqual(movement.maximumSeconds!);
            } else {
              expect(movement.minimumSeconds).toBeNull();
              expect(movement.maximumSeconds).toBeNull();
              expect(movement.minimumReps).toBeGreaterThan(0);
              expect(movement.minimumReps!).toBeLessThanOrEqual(movement.maximumReps!);
            }
            const expectedKind =
              exercise.role === "compound" ? "strength" : exercise.role === "accessory" ? "accessory" : "core";
            expect(movement.sectionKind).toBe(expectedKind);
          }
        }
      });
    },
  );

  it.each(combinations.map((combination) => [label(combination), combination] as const))(
    "%s uses only equipment-compatible movements with approved demos and no load targets",
    (_name, combination) => {
      const routine = generateStarterRoutine(combination);
      const profile = EQUIPMENT_PROFILES[combination.equipment];
      for (const movement of movements(routine)) {
        expect(approvedDemoSlugs.has(movement.exerciseSlug), movement.exerciseSlug).toBe(true);
        expect(
          supportsEquipment(profile, getCatalogExercise(movement.exerciseSlug).requiredEquipment),
          movement.exerciseSlug,
        ).toBe(true);
        expect(movement.targetWeightKg).toBeNull();
        expect(movement.targetDistanceM).toBeNull();
        expect(movement.notes).toBeNull();
      }
    },
  );

  it.each(combinations.map((combination) => [label(combination), combination] as const))(
    "%s applies the goal's sets, ranges, rest and finishers",
    (_name, combination) => {
      const routine = generateStarterRoutine(combination);
      const expected = expectedRanges[combination.goal];
      const higher = combination.experience === "lots";
      for (const day of routine.days) {
        for (const section of day.sections) {
          for (const movement of section.movements) {
            const tier = section.kind === "strength" ? expected.main : expected.accessory;
            expect(movement.setCount).toBe(higher ? tier.sets[1] : tier.sets[0]);
            if (movement.loggingKind === "duration") {
              expect([movement.minimumSeconds, movement.maximumSeconds]).toEqual([20, 45]);
            } else {
              expect([movement.minimumReps, movement.maximumReps]).toEqual(tier.reps);
            }
            expect(movement.restSeconds).toBe(
              section.kind === "strength" ? expected.rest : Math.min(expected.rest, 90),
            );
          }
        }
        const cardioMinutes =
          combination.goal === "general" ? 15 : combination.goal === "fat_loss" ? 20 : null;
        if (cardioMinutes === null) {
          expect(day.cardio).toEqual([]);
        } else {
          expect(day.cardio).toEqual([
            { mode: "walker", durationSeconds: cardioMinutes * 60, distanceM: null, inclinePercent: null, paceSecondsPerKm: null, notes: null },
            { mode: "runner", durationSeconds: cardioMinutes * 60, distanceM: null, inclinePercent: null, paceSecondsPerKm: null, notes: null },
          ]);
        }
        if (combination.goal === "sport") {
          expect(day.sections.some(({ kind }) => kind === "core")).toBe(true);
        }
      }
    },
  );

  it("names routines and days in plain words", () => {
    const names = (answers: Omit<Combination, "equipment">) =>
      generateStarterRoutine({ ...answers, equipment: "dumbbells" });
    expect(names({ goal: "muscle", experience: "new", daysPerWeek: 2 })).toMatchObject({
      name: "2-day full body",
      days: [{ name: "Full body A" }, { name: "Full body B" }],
    });
    expect(names({ goal: "muscle", experience: "some", daysPerWeek: 3 })).toMatchObject({
      name: "3-day full body",
      days: [{ name: "Full body A" }, { name: "Full body B" }, { name: "Full body C" }],
    });
    expect(names({ goal: "muscle", experience: "lots", daysPerWeek: 3 })).toMatchObject({
      name: "3-day push, pull, legs",
      days: [{ name: "Push" }, { name: "Pull" }, { name: "Legs" }],
    });
    expect(names({ goal: "strength", experience: "new", daysPerWeek: 4 })).toMatchObject({
      name: "4-day upper and lower",
      days: [{ name: "Upper A" }, { name: "Lower A" }, { name: "Upper B" }, { name: "Lower B" }],
    });
    expect(names({ goal: "general", experience: "lots", daysPerWeek: 5 })).toMatchObject({
      name: "5-day push, pull, legs",
      days: [{ name: "Push" }, { name: "Pull" }, { name: "Legs" }, { name: "Upper" }, { name: "Lower" }],
    });
  });

  it("returns identical output for identical answers and never shares mutable state", () => {
    for (const combination of combinations) {
      const first = generateStarterRoutine(combination);
      const second = generateStarterRoutine({ ...combination });
      expect(second).toEqual(first);
      expect(second).not.toBe(first);
    }
  });

  it("uses barbell lifts only when a barbell is available", () => {
    const barbell = generateStarterRoutine({ goal: "strength", experience: "lots", daysPerWeek: 4, equipment: "barbell" });
    const dumbbells = generateStarterRoutine({ goal: "strength", experience: "lots", daysPerWeek: 4, equipment: "dumbbells" });
    expect(movements(barbell).some(({ exerciseSlug }) => exerciseSlug.startsWith("barbell-"))).toBe(true);
    expect(movements(dumbbells).some(({ exerciseSlug }) => exerciseSlug.startsWith("barbell-"))).toBe(false);
  });

  it("rejects answers outside the supported choices", () => {
    expect(() =>
      generateStarterRoutine({ goal: "powerlifting" as TrainingGoal, experience: "new", daysPerWeek: 3, equipment: "dumbbells" }),
    ).toThrow(TypeError);
    expect(() =>
      generateStarterRoutine({ goal: "strength", experience: "new", daysPerWeek: 6 as DaysPerWeek, equipment: "dumbbells" }),
    ).toThrow(TypeError);
    expect(() =>
      generateStarterRoutine({ goal: "strength", experience: "new", daysPerWeek: 3, equipment: "kettlebell" as EquipmentProfileKind }),
    ).toThrow(TypeError);
  });

  it("parses training answers strictly", () => {
    expect(trainingProfileAnswersSchema.safeParse({ goal: "sport", experience: "some", daysPerWeek: 4 }).success).toBe(true);
    expect(trainingProfileAnswersSchema.safeParse({ goal: "sport", experience: "some", daysPerWeek: 1 }).success).toBe(false);
    expect(trainingProfileAnswersSchema.safeParse({ goal: "sport", experience: "some", daysPerWeek: 4.5 }).success).toBe(false);
    expect(
      trainingProfileAnswersSchema.safeParse({ goal: "sport", experience: "some", daysPerWeek: 4, ownerFirebaseUid: "x" }).success,
    ).toBe(false);
  });
});
