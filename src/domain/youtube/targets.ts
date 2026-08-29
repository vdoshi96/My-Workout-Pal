import { CATALOG_EXERCISES } from "../exercises/catalog.ts";
import {
  APPROVED_VIDEO_REQUIRED_VARIATIONS,
  DEFAULT_YOUTUBE_VARIATION_ID,
  validateVideoRequiredVariationPolicy,
} from "./video-requirements.ts";
import type { YouTubeCurationTarget } from "./types.ts";

export { DEFAULT_YOUTUBE_VARIATION_ID } from "./video-requirements.ts";

type DefaultYouTubeCurationTarget = YouTubeCurationTarget & Readonly<{ variationId: string }>;

const ALIAS_OVERRIDES: Readonly<Record<string, readonly string[]>> = Object.freeze({
  "dumbbell-bench-press": ["db bench press", "dumbbell chest press"],
  "seated-dumbbell-shoulder-press": ["seated db shoulder press", "seated dumbbell overhead press"],
  "incline-dumbbell-press": ["incline db press", "incline dumbbell chest press"],
  "overhead-dumbbell-triceps-extension": ["overhead db triceps extension", "dumbbell triceps extension"],
  "dead-bug": ["deadbug", "dead bug exercise"],
  "front-plank": ["forearm plank", "front plank hold"],
  "barbell-bent-over-row": ["barbell row", "bent over barbell row"],
  "one-arm-dumbbell-row": ["single arm dumbbell row", "one arm db row"],
  "dumbbell-pullover": ["db pullover", "dumbbell chest pullover"],
  "dumbbell-curl": ["db curl", "dumbbell biceps curl"],
  "bird-dog": ["bird dog exercise", "quadruped bird dog"],
  "side-plank": ["side plank hold", "lateral plank"],
  "chest-supported-dumbbell-row": ["chest supported db row", "chest supported row"],
  "goblet-squat": ["goblet squat exercise", "dumbbell goblet squat"],
  "dumbbell-romanian-deadlift": ["dumbbell rdl", "db romanian deadlift"],
  "reverse-lunge": ["dumbbell reverse lunge", "rear step lunge"],
  "standing-calf-raise": ["standing calf raise exercise", "dumbbell calf raise"],
  "plank-shoulder-tap": ["plank shoulder taps", "shoulder tap plank"],
  "reverse-crunch": ["reverse crunches", "lying reverse crunch"],
  "barbell-bench-press": ["barbell chest press", "barbell bench"],
  "bicycle-crunch": ["bicycle crunches", "air bicycle crunch"],
  "hollow-hold": ["hollow body hold", "hollow rock hold"],
  "barbell-back-squat": ["barbell squat", "back squat"],
  "barbell-romanian-deadlift": ["barbell rdl", "barbell romanian deadlift form"],
  "bulgarian-split-squat": ["rear foot elevated split squat", "bulgarian split squat exercise"],
  "barbell-hip-thrust": ["barbell glute bridge", "barbell hip thrust exercise"],
  "dumbbell-hip-thrust": ["dumbbell glute bridge", "db hip thrust"],
});

const DISALLOWED_MOVEMENT_OVERRIDES: Readonly<Record<string, readonly string[]>> = Object.freeze({
  "dumbbell-bench-press": ["decline", "incline"],
  "seated-dumbbell-shoulder-press": ["floor seated", "standing", "arnold"],
  "incline-dumbbell-press": ["decline", "flat bench", "flat dumbbell", "floor", "without bench"],
  "dumbbell-curl": ["curl to press", "curl and press", "incline", "hammer", "preacher", "concentration"],
  "reverse-lunge": ["rotation", "rotate", "twist", "curtsy"],
});

function movementStem(name: string): string {
  return name
    .replace(/\b(?:dumbbells?|barbells?)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function equipmentDiscriminatorTerms(exercise: { requiredEquipment: readonly string[] }): readonly string[] {
  return [...new Set(
    exercise.requiredEquipment.flatMap((equipment) => {
      if (equipment === "dumbbells") return ["dumbbell"];
      if (equipment === "barbell") return ["barbell"];
      return [];
    }),
  )];
}

function targetForCatalogRecord(exercise: (typeof CATALOG_EXERCISES)[string]): DefaultYouTubeCurationTarget {
  const aliases = ALIAS_OVERRIDES[exercise.slug] ?? [`${exercise.name.toLocaleLowerCase("en-US")} tutorial`];
  const requiredEquipmentTerms = equipmentDiscriminatorTerms(exercise);
  const disallowedMovementTerms = DISALLOWED_MOVEMENT_OVERRIDES[exercise.slug] ?? [];
  return {
    canonicalExerciseSlug: exercise.slug,
    variationId: DEFAULT_YOUTUBE_VARIATION_ID,
    exerciseName: exercise.name,
    movement: movementStem(exercise.name),
    aliases,
    ...(requiredEquipmentTerms.length > 0 ? { requiredEquipmentTerms } : {}),
    ...(disallowedMovementTerms.length > 0 ? { disallowedMovementTerms } : {}),
  };
}

function targetKey(target: Readonly<{
  canonicalExerciseSlug: string;
  variationId: string;
}>): string {
  return `${target.canonicalExerciseSlug}::${target.variationId}`;
}

export function assertDefaultYouTubeCurationTargets(
  targets: readonly DefaultYouTubeCurationTarget[],
): void {
  const requiredVariations = validateVideoRequiredVariationPolicy(
    APPROVED_VIDEO_REQUIRED_VARIATIONS,
    Object.keys(CATALOG_EXERCISES),
  );
  const expectedKeys = new Set(requiredVariations.map(targetKey));
  const actualKeys = new Set(targets.map(targetKey));
  if (targets.length !== requiredVariations.length || actualKeys.size !== targets.length) {
    throw new Error("Default YouTube targets must contain exactly one target per video-required variation.");
  }
  if (actualKeys.size !== expectedKeys.size || [...expectedKeys].some((key) => !actualKeys.has(key))) {
    throw new Error("Default YouTube targets must cover every video-required variation exactly once.");
  }
  for (const target of targets) {
    const catalogExercise = CATALOG_EXERCISES[target.canonicalExerciseSlug];
    if (!catalogExercise || target.exerciseName !== catalogExercise.name || target.movement !== movementStem(catalogExercise.name)) {
      throw new Error(`Default YouTube target ${target.canonicalExerciseSlug} does not match its catalog movement.`);
    }
    if (target.variationId !== DEFAULT_YOUTUBE_VARIATION_ID) {
      throw new Error("Default YouTube targets must use the stable canonical variation ID.");
    }
    if (!target.movement?.trim() || !target.aliases?.some((alias) => alias.trim())) {
      throw new Error(`Default YouTube target ${target.canonicalExerciseSlug} is missing useful movement aliases.`);
    }
    if (target.requiredEquipmentTerms?.some((term) => /body\s*weight/i.test(term))) {
      throw new Error(`Default YouTube target ${target.canonicalExerciseSlug} must not require bodyweight in a title.`);
    }
    const expectedEquipmentTerms = equipmentDiscriminatorTerms(catalogExercise);
    const actualEquipmentTerms = target.requiredEquipmentTerms ?? [];
    if (actualEquipmentTerms.length !== expectedEquipmentTerms.length || actualEquipmentTerms.some((term, index) => term !== expectedEquipmentTerms[index])) {
      throw new Error(`Default YouTube target ${target.canonicalExerciseSlug} has incorrect equipment discriminator terms.`);
    }
    const expectedDisallowedMovementTerms = DISALLOWED_MOVEMENT_OVERRIDES[target.canonicalExerciseSlug] ?? [];
    const actualDisallowedMovementTerms = target.disallowedMovementTerms ?? [];
    if (
      actualDisallowedMovementTerms.length !== expectedDisallowedMovementTerms.length
      || actualDisallowedMovementTerms.some((term, index) => term !== expectedDisallowedMovementTerms[index])
    ) {
      throw new Error(`Default YouTube target ${target.canonicalExerciseSlug} has incorrect movement exclusions.`);
    }
  }
}

export function buildDefaultYouTubeCurationTargets(): readonly DefaultYouTubeCurationTarget[] {
  const requiredVariations = validateVideoRequiredVariationPolicy(
    APPROVED_VIDEO_REQUIRED_VARIATIONS,
    Object.keys(CATALOG_EXERCISES),
  );
  const targets = requiredVariations.map(({ canonicalExerciseSlug }) =>
    targetForCatalogRecord(CATALOG_EXERCISES[canonicalExerciseSlug]!),
  );
  assertDefaultYouTubeCurationTargets(targets);
  return targets;
}
