import type { EquipmentId } from "@/domain/equipment";

export type ExerciseRole = "compound" | "accessory" | "core-reps" | "core-timed";
export type LoggingKind = "weight_reps" | "bodyweight_reps" | "duration";

export type CatalogExercise = Readonly<{
  slug: string;
  name: string;
  role: ExerciseRole;
  loggingKind: LoggingKind;
  requiredEquipment: readonly EquipmentId[];
}>;

const catalog = [
  ["dumbbell-bench-press", "Dumbbell bench press", "compound", "weight_reps", ["dumbbells", "bench"]],
  ["seated-dumbbell-shoulder-press", "Seated dumbbell shoulder press", "compound", "weight_reps", ["dumbbells", "bench"]],
  ["incline-dumbbell-press", "Incline dumbbell press", "compound", "weight_reps", ["dumbbells", "bench"]],
  ["overhead-dumbbell-triceps-extension", "Overhead dumbbell triceps extension", "accessory", "weight_reps", ["dumbbells"]],
  ["dead-bug", "Dead bug", "core-reps", "bodyweight_reps", ["bodyweight"]],
  ["front-plank", "Front plank", "core-timed", "duration", ["bodyweight"]],
  ["barbell-bent-over-row", "Barbell bent-over row", "compound", "weight_reps", ["barbell", "plates"]],
  ["one-arm-dumbbell-row", "One-arm dumbbell row", "compound", "weight_reps", ["dumbbells", "bench"]],
  ["dumbbell-pullover", "Dumbbell pullover", "accessory", "weight_reps", ["dumbbells", "bench"]],
  ["dumbbell-curl", "Dumbbell curl", "accessory", "weight_reps", ["dumbbells"]],
  ["bird-dog", "Bird dog", "core-reps", "bodyweight_reps", ["bodyweight"]],
  ["side-plank", "Side plank", "core-timed", "duration", ["bodyweight"]],
  ["chest-supported-dumbbell-row", "Chest-supported dumbbell row", "compound", "weight_reps", ["dumbbells", "bench"]],
  ["goblet-squat", "Goblet squat", "compound", "weight_reps", ["dumbbells"]],
  ["dumbbell-romanian-deadlift", "Dumbbell Romanian deadlift", "compound", "weight_reps", ["dumbbells"]],
  ["reverse-lunge", "Reverse lunge", "compound", "weight_reps", ["dumbbells"]],
  ["standing-calf-raise", "Standing calf raise", "accessory", "weight_reps", ["dumbbells"]],
  ["plank-shoulder-tap", "Plank shoulder tap", "core-reps", "bodyweight_reps", ["bodyweight"]],
  ["reverse-crunch", "Reverse crunch", "core-reps", "bodyweight_reps", ["bodyweight"]],
  ["barbell-bench-press", "Barbell bench press", "compound", "weight_reps", ["barbell", "plates", "bench", "rack"]],
  ["bicycle-crunch", "Bicycle crunch", "core-reps", "bodyweight_reps", ["bodyweight"]],
  ["hollow-hold", "Hollow hold", "core-timed", "duration", ["bodyweight"]],
  ["barbell-back-squat", "Barbell back squat", "compound", "weight_reps", ["barbell", "plates", "rack"]],
  ["barbell-romanian-deadlift", "Barbell Romanian deadlift", "compound", "weight_reps", ["barbell", "plates"]],
  ["bulgarian-split-squat", "Bulgarian split squat", "compound", "weight_reps", ["dumbbells", "bench"]],
  ["barbell-hip-thrust", "Barbell hip thrust", "compound", "weight_reps", ["barbell", "plates", "bench"]],
  ["dumbbell-hip-thrust", "Dumbbell hip thrust", "compound", "weight_reps", ["dumbbells", "bench"]],
] as const satisfies readonly (readonly [
  string,
  string,
  ExerciseRole,
  LoggingKind,
  readonly EquipmentId[],
])[];

export const CATALOG_EXERCISES = Object.freeze(
  Object.fromEntries(
    catalog.map(([slug, name, role, loggingKind, requiredEquipment]) => [
      slug,
      Object.freeze({ slug, name, role, loggingKind, requiredEquipment }),
    ]),
  ) as Readonly<Record<string, CatalogExercise>>,
);

export function getCatalogExercise(slug: string): CatalogExercise {
  const exercise = CATALOG_EXERCISES[slug];
  if (!exercise) throw new Error(`Unknown catalog exercise: ${slug}`);
  return exercise;
}
