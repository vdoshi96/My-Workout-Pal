import type { RequiredVideoVariation } from "@/domain/youtube/types";

export const DEFAULT_YOUTUBE_VARIATION_ID = "canonical";

/**
 * The released canonical variations whose app-approved video pair is required.
 *
 * This declaration is intentionally independent from catalog membership and
 * the approved seed rows that it validates. Adding a text-only catalog record
 * must not add a video requirement, and removing an approved row must not
 * remove its requirement.
 */
export const APPROVED_VIDEO_REQUIRED_VARIATIONS = Object.freeze(
  [
    "dumbbell-bench-press",
    "seated-dumbbell-shoulder-press",
    "incline-dumbbell-press",
    "overhead-dumbbell-triceps-extension",
    "dead-bug",
    "front-plank",
    "barbell-bent-over-row",
    "one-arm-dumbbell-row",
    "dumbbell-pullover",
    "dumbbell-curl",
    "bird-dog",
    "side-plank",
    "chest-supported-dumbbell-row",
    "goblet-squat",
    "dumbbell-romanian-deadlift",
    "reverse-lunge",
    "standing-calf-raise",
    "plank-shoulder-tap",
    "reverse-crunch",
    "barbell-bench-press",
    "bicycle-crunch",
    "hollow-hold",
    "barbell-back-squat",
    "barbell-romanian-deadlift",
    "bulgarian-split-squat",
    "barbell-hip-thrust",
    "dumbbell-hip-thrust",
  ].map((canonicalExerciseSlug) =>
    Object.freeze({
      canonicalExerciseSlug,
      variationId: DEFAULT_YOUTUBE_VARIATION_ID,
    }),
  ),
) satisfies readonly RequiredVideoVariation[];

function variationKey(variation: RequiredVideoVariation): string {
  return `${variation.canonicalExerciseSlug}::${variation.variationId}`;
}

/** Validate a video-requirement declaration against a supplied catalog view. */
export function validateVideoRequiredVariationPolicy(
  requiredVariations: readonly RequiredVideoVariation[],
  supportedCanonicalExerciseSlugs: readonly string[],
): readonly RequiredVideoVariation[] {
  const supportedSlugs = new Set(supportedCanonicalExerciseSlugs);
  const seenKeys = new Set<string>();

  for (const variation of requiredVariations) {
    if (variation.variationId !== DEFAULT_YOUTUBE_VARIATION_ID) {
      throw new TypeError(
        `Video-required catalog entry ${variation.canonicalExerciseSlug} must use the canonical variation.`,
      );
    }
    const key = variationKey(variation);
    if (seenKeys.has(key)) {
      throw new TypeError(`Duplicate video-required variation: ${key}.`);
    }
    seenKeys.add(key);
    if (!supportedSlugs.has(variation.canonicalExerciseSlug)) {
      throw new TypeError(
        `Video-required variation ${key} is missing its catalog record.`,
      );
    }
  }

  return requiredVariations;
}
