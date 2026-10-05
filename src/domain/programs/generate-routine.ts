import { z } from "zod";

import {
  EQUIPMENT_PROFILES,
  supportsEquipment,
  type EquipmentProfileKind,
} from "@/domain/equipment";
import { getCatalogExercise, type LoggingKind } from "@/domain/exercises/catalog";
import { APPROVED_CURATED_VIDEO_SEED } from "@/domain/youtube/approved-curated-video-seed";

/**
 * Builds a starter routine from the onboarding answers. The output is a pure,
 * deterministic draft: it never prescribes load, uses only catalog movements
 * that have an approved demo pair, and only movements the chosen equipment
 * supports. The server regenerates it from the answers; clients may call it
 * to preview the routine before saving.
 */

export const TRAINING_GOALS = ["strength", "muscle", "general", "fat_loss", "sport"] as const;
export const EXPERIENCE_LEVELS = ["new", "some", "lots"] as const;
export const DAYS_PER_WEEK_OPTIONS = [2, 3, 4, 5] as const;

export type TrainingGoal = (typeof TRAINING_GOALS)[number];
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];
export type DaysPerWeek = (typeof DAYS_PER_WEEK_OPTIONS)[number];

export type TrainingProfileAnswers = Readonly<{
  goal: TrainingGoal;
  experience: ExperienceLevel;
  daysPerWeek: DaysPerWeek;
}>;

export type GenerateStarterRoutineInput = TrainingProfileAnswers &
  Readonly<{ equipment: EquipmentProfileKind }>;

/** Strict, owner-free answer shape shared by the API and repositories. */
export const trainingProfileAnswersSchema = z
  .object({
    goal: z.enum(TRAINING_GOALS),
    experience: z.enum(EXPERIENCE_LEVELS),
    daysPerWeek: z.union([z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  })
  .strict();

export type GeneratedSectionKind = "strength" | "accessory" | "core";

export type GeneratedRoutineMovement = Readonly<{
  exerciseSlug: string;
  displayName: string;
  loggingKind: LoggingKind;
  measurementKind: LoggingKind;
  sectionKind: GeneratedSectionKind;
  setKind: "work";
  setCount: number;
  minimumReps: number | null;
  maximumReps: number | null;
  minimumSeconds: number | null;
  maximumSeconds: number | null;
  restSeconds: number;
  targetWeightKg: null;
  targetDistanceM: null;
  notes: null;
}>;

export type GeneratedRoutineSection = Readonly<{
  kind: GeneratedSectionKind;
  title: string;
  movements: readonly GeneratedRoutineMovement[];
}>;

export type GeneratedRoutineCardio = Readonly<{
  mode: "walker" | "runner";
  durationSeconds: number;
  distanceM: null;
  inclinePercent: null;
  paceSecondsPerKm: null;
  notes: null;
}>;

export type GeneratedRoutineDay = Readonly<{
  dayNumber: number;
  name: string;
  sections: readonly GeneratedRoutineSection[];
  cardio: readonly GeneratedRoutineCardio[];
}>;

export type GeneratedRoutine = Readonly<{
  name: string;
  equipmentProfileKind: EquipmentProfileKind;
  answers: TrainingProfileAnswers;
  days: readonly GeneratedRoutineDay[];
}>;

type DayTemplate =
  | "fullBodyA"
  | "fullBodyB"
  | "fullBodyC"
  | "push"
  | "pull"
  | "legs"
  | "upperA"
  | "upperB"
  | "lowerA"
  | "lowerB";

/**
 * Six candidates per day in priority order. Smaller days take a prefix, so
 * the first movements are always the main lifts.
 */
const DAY_CANDIDATES = {
  dumbbells: {
    fullBodyA: ["goblet-squat", "dumbbell-bench-press", "one-arm-dumbbell-row", "dumbbell-romanian-deadlift", "dumbbell-curl", "dead-bug"],
    fullBodyB: ["dumbbell-romanian-deadlift", "seated-dumbbell-shoulder-press", "chest-supported-dumbbell-row", "reverse-lunge", "overhead-dumbbell-triceps-extension", "front-plank"],
    fullBodyC: ["bulgarian-split-squat", "incline-dumbbell-press", "one-arm-dumbbell-row", "dumbbell-hip-thrust", "standing-calf-raise", "side-plank"],
    push: ["dumbbell-bench-press", "seated-dumbbell-shoulder-press", "incline-dumbbell-press", "overhead-dumbbell-triceps-extension", "dead-bug", "front-plank"],
    pull: ["chest-supported-dumbbell-row", "one-arm-dumbbell-row", "dumbbell-pullover", "dumbbell-curl", "bird-dog", "side-plank"],
    legs: ["goblet-squat", "dumbbell-romanian-deadlift", "reverse-lunge", "standing-calf-raise", "plank-shoulder-tap", "reverse-crunch"],
    upperA: ["dumbbell-bench-press", "one-arm-dumbbell-row", "seated-dumbbell-shoulder-press", "chest-supported-dumbbell-row", "dumbbell-curl", "bicycle-crunch"],
    upperB: ["incline-dumbbell-press", "chest-supported-dumbbell-row", "seated-dumbbell-shoulder-press", "dumbbell-pullover", "overhead-dumbbell-triceps-extension", "hollow-hold"],
    lowerA: ["goblet-squat", "dumbbell-romanian-deadlift", "reverse-lunge", "standing-calf-raise", "dead-bug", "side-plank"],
    lowerB: ["dumbbell-romanian-deadlift", "bulgarian-split-squat", "dumbbell-hip-thrust", "standing-calf-raise", "reverse-crunch", "front-plank"],
  },
  barbell: {
    fullBodyA: ["barbell-back-squat", "barbell-bench-press", "barbell-bent-over-row", "dumbbell-romanian-deadlift", "dumbbell-curl", "dead-bug"],
    fullBodyB: ["barbell-romanian-deadlift", "seated-dumbbell-shoulder-press", "one-arm-dumbbell-row", "reverse-lunge", "overhead-dumbbell-triceps-extension", "front-plank"],
    fullBodyC: ["bulgarian-split-squat", "incline-dumbbell-press", "chest-supported-dumbbell-row", "barbell-hip-thrust", "standing-calf-raise", "side-plank"],
    push: ["barbell-bench-press", "seated-dumbbell-shoulder-press", "incline-dumbbell-press", "overhead-dumbbell-triceps-extension", "dead-bug", "front-plank"],
    pull: ["barbell-bent-over-row", "one-arm-dumbbell-row", "dumbbell-pullover", "dumbbell-curl", "bird-dog", "side-plank"],
    legs: ["barbell-back-squat", "dumbbell-romanian-deadlift", "reverse-lunge", "standing-calf-raise", "plank-shoulder-tap", "reverse-crunch"],
    upperA: ["barbell-bench-press", "barbell-bent-over-row", "seated-dumbbell-shoulder-press", "one-arm-dumbbell-row", "dumbbell-curl", "bicycle-crunch"],
    upperB: ["incline-dumbbell-press", "chest-supported-dumbbell-row", "seated-dumbbell-shoulder-press", "dumbbell-pullover", "overhead-dumbbell-triceps-extension", "hollow-hold"],
    lowerA: ["barbell-back-squat", "dumbbell-romanian-deadlift", "reverse-lunge", "standing-calf-raise", "dead-bug", "side-plank"],
    lowerB: ["barbell-romanian-deadlift", "bulgarian-split-squat", "barbell-hip-thrust", "standing-calf-raise", "reverse-crunch", "front-plank"],
  },
} as const satisfies Record<EquipmentProfileKind, Record<DayTemplate, readonly string[]>>;

type SplitPlan = Readonly<{
  name: string;
  days: readonly Readonly<{ template: DayTemplate; name: string }>[];
}>;

function splitFor(daysPerWeek: DaysPerWeek, experience: ExperienceLevel): SplitPlan {
  switch (daysPerWeek) {
    case 2:
      return {
        name: "2-day full body",
        days: [
          { template: "fullBodyA", name: "Full body A" },
          { template: "fullBodyB", name: "Full body B" },
        ],
      };
    case 3:
      return experience === "lots"
        ? {
            name: "3-day push, pull, legs",
            days: [
              { template: "push", name: "Push" },
              { template: "pull", name: "Pull" },
              { template: "legs", name: "Legs" },
            ],
          }
        : {
            name: "3-day full body",
            days: [
              { template: "fullBodyA", name: "Full body A" },
              { template: "fullBodyB", name: "Full body B" },
              { template: "fullBodyC", name: "Full body C" },
            ],
          };
    case 4:
      return {
        name: "4-day upper and lower",
        days: [
          { template: "upperA", name: "Upper A" },
          { template: "lowerA", name: "Lower A" },
          { template: "upperB", name: "Upper B" },
          { template: "lowerB", name: "Lower B" },
        ],
      };
    case 5:
      return {
        name: "5-day push, pull, legs",
        days: [
          { template: "push", name: "Push" },
          { template: "pull", name: "Pull" },
          { template: "legs", name: "Legs" },
          { template: "upperA", name: "Upper" },
          { template: "lowerB", name: "Lower" },
        ],
      };
  }
}

type Tier = Readonly<{ lowerSets: number; higherSets: number; minimumReps: number; maximumReps: number }>;
type GoalRules = Readonly<{
  main: Tier;
  accessory: Tier;
  restSeconds: number;
  cardioMinutes: number | null;
  coreEveryDay: boolean;
}>;

/** Goal table from the onboarding plan. Accessory and core rest caps at 90s. */
const GOAL_RULES = {
  strength: {
    main: { lowerSets: 3, higherSets: 4, minimumReps: 4, maximumReps: 6 },
    accessory: { lowerSets: 2, higherSets: 3, minimumReps: 8, maximumReps: 10 },
    restSeconds: 150,
    cardioMinutes: null,
    coreEveryDay: false,
  },
  muscle: {
    main: { lowerSets: 3, higherSets: 4, minimumReps: 8, maximumReps: 12 },
    accessory: { lowerSets: 3, higherSets: 3, minimumReps: 10, maximumReps: 15 },
    restSeconds: 90,
    cardioMinutes: null,
    coreEveryDay: false,
  },
  general: {
    main: { lowerSets: 3, higherSets: 3, minimumReps: 8, maximumReps: 12 },
    accessory: { lowerSets: 2, higherSets: 2, minimumReps: 12, maximumReps: 15 },
    restSeconds: 75,
    cardioMinutes: 15,
    coreEveryDay: false,
  },
  fat_loss: {
    main: { lowerSets: 3, higherSets: 3, minimumReps: 10, maximumReps: 15 },
    accessory: { lowerSets: 2, higherSets: 2, minimumReps: 12, maximumReps: 15 },
    restSeconds: 60,
    cardioMinutes: 20,
    coreEveryDay: false,
  },
  sport: {
    main: { lowerSets: 3, higherSets: 3, minimumReps: 5, maximumReps: 8 },
    accessory: { lowerSets: 2, higherSets: 2, minimumReps: 8, maximumReps: 12 },
    restSeconds: 90,
    cardioMinutes: null,
    coreEveryDay: true,
  },
} as const satisfies Record<TrainingGoal, GoalRules>;

const MOVEMENTS_PER_DAY = { new: 4, some: 5, lots: 6 } as const satisfies Record<ExperienceLevel, number>;
const HOLD_SECONDS = { minimum: 20, maximum: 45 } as const;
const ACCESSORY_REST_CAP_SECONDS = 90;
const SECTION_ORDER: readonly GeneratedSectionKind[] = ["strength", "accessory", "core"];
const SECTION_TITLES = {
  strength: "Main lifts",
  accessory: "Accessories",
  core: "Core",
} as const satisfies Record<GeneratedSectionKind, string>;

/** Slugs whose canonical demo has two approved, fully watched videos. */
export const APPROVED_DEMO_SLUGS: ReadonlySet<string> = (() => {
  const orders = new Map<string, Set<number>>();
  for (const video of APPROVED_CURATED_VIDEO_SEED) {
    if (
      video.approvalState !== "approved" ||
      video.fullWatchConfirmed !== true ||
      video.variationId !== "canonical"
    ) {
      continue;
    }
    const seen = orders.get(video.canonicalExerciseSlug) ?? new Set<number>();
    seen.add(video.displayOrder);
    orders.set(video.canonicalExerciseSlug, seen);
  }
  return new Set(
    [...orders].filter(([, seen]) => seen.has(1) && seen.has(2)).map(([slug]) => slug),
  );
})();

function sectionKindFor(slug: string): GeneratedSectionKind {
  const role = getCatalogExercise(slug).role;
  if (role === "compound") return "strength";
  if (role === "accessory") return "accessory";
  return "core";
}

function chooseDaySlugs(
  candidates: readonly string[],
  count: number,
  coreEveryDay: boolean,
): readonly string[] {
  const chosen = candidates.slice(0, count);
  if (coreEveryDay && !chosen.some((slug) => sectionKindFor(slug) === "core")) {
    const core = candidates.find((slug) => sectionKindFor(slug) === "core");
    if (!core) throw new Error("Every starter day needs a core movement.");
    chosen[chosen.length - 1] = core;
  }
  return chosen;
}

function movementFor(
  slug: string,
  rules: GoalRules,
  experience: ExperienceLevel,
): GeneratedRoutineMovement {
  const exercise = getCatalogExercise(slug);
  const sectionKind = sectionKindFor(slug);
  const tier = sectionKind === "strength" ? rules.main : rules.accessory;
  const timed = exercise.loggingKind === "duration";
  return {
    exerciseSlug: exercise.slug,
    displayName: exercise.name,
    loggingKind: exercise.loggingKind,
    measurementKind: exercise.loggingKind,
    sectionKind,
    setKind: "work",
    setCount: experience === "lots" ? tier.higherSets : tier.lowerSets,
    minimumReps: timed ? null : tier.minimumReps,
    maximumReps: timed ? null : tier.maximumReps,
    minimumSeconds: timed ? HOLD_SECONDS.minimum : null,
    maximumSeconds: timed ? HOLD_SECONDS.maximum : null,
    restSeconds:
      sectionKind === "strength"
        ? rules.restSeconds
        : Math.min(rules.restSeconds, ACCESSORY_REST_CAP_SECONDS),
    targetWeightKg: null,
    targetDistanceM: null,
    notes: null,
  };
}

function cardioFinish(minutes: number | null): readonly GeneratedRoutineCardio[] {
  if (minutes === null) return [];
  return (["walker", "runner"] as const).map((mode) => ({
    mode,
    durationSeconds: minutes * 60,
    distanceM: null,
    inclinePercent: null,
    paceSecondsPerKm: null,
    notes: null,
  }));
}

function assertChoice<T>(values: readonly T[], value: unknown, label: string): asserts value is T {
  if (!values.includes(value as T)) {
    throw new TypeError(`Choose a supported ${label}.`);
  }
}

export function generateStarterRoutine(input: GenerateStarterRoutineInput): GeneratedRoutine {
  assertChoice(TRAINING_GOALS, input.goal, "goal");
  assertChoice(EXPERIENCE_LEVELS, input.experience, "experience level");
  assertChoice(DAYS_PER_WEEK_OPTIONS, input.daysPerWeek, "number of days");
  assertChoice(["dumbbells", "barbell"] as const, input.equipment, "equipment profile");

  const rules = GOAL_RULES[input.goal];
  const profile = EQUIPMENT_PROFILES[input.equipment];
  const split = splitFor(input.daysPerWeek, input.experience);
  const days = split.days.map((plan, index): GeneratedRoutineDay => {
    const slugs = chooseDaySlugs(
      DAY_CANDIDATES[input.equipment][plan.template],
      MOVEMENTS_PER_DAY[input.experience],
      rules.coreEveryDay,
    );
    for (const slug of slugs) {
      if (!APPROVED_DEMO_SLUGS.has(slug)) {
        throw new Error(`Starter movement ${slug} has no approved demo.`);
      }
      if (!supportsEquipment(profile, getCatalogExercise(slug).requiredEquipment)) {
        throw new Error(`Starter movement ${slug} needs equipment the profile lacks.`);
      }
    }
    const movements = slugs.map((slug) => movementFor(slug, rules, input.experience));
    const sections = SECTION_ORDER.flatMap((kind): GeneratedRoutineSection[] => {
      const inSection = movements.filter((movement) => movement.sectionKind === kind);
      return inSection.length > 0
        ? [{ kind, title: SECTION_TITLES[kind], movements: inSection }]
        : [];
    });
    return {
      dayNumber: index + 1,
      name: plan.name,
      sections,
      cardio: cardioFinish(rules.cardioMinutes),
    };
  });

  return {
    name: split.name,
    equipmentProfileKind: input.equipment,
    answers: {
      goal: input.goal,
      experience: input.experience,
      daysPerWeek: input.daysPerWeek,
    },
    days,
  };
}
