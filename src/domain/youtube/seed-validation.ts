import { CATALOG_EXERCISES } from "../exercises/catalog.ts";
import { YOUTUBE_VIDEO_ID_PATTERN } from "./normalization.ts";
import type {
  CuratedVideoSeed,
  RequiredVideoVariation,
  SeedValidationError,
  SeedValidationResult,
} from "@/domain/youtube/types";

type SeedCandidate = CuratedVideoSeed & Record<string, unknown>;

function key(canonicalExerciseSlug: string, variationId: string): string {
  return `${canonicalExerciseSlug}::${variationId}`;
}

function error(
  code: SeedValidationError["code"],
  message: string,
  seed: Partial<CuratedVideoSeed> = {},
): SeedValidationError {
  return {
    code,
    message,
    ...(seed.canonicalExerciseSlug ? { canonicalExerciseSlug: seed.canonicalExerciseSlug } : {}),
    ...(seed.variationId ? { variationId: seed.variationId } : {}),
    ...(seed.videoId ? { videoId: seed.videoId } : {}),
  };
}

function hasOwnValue(record: Record<string, unknown>, property: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, property);
}

export function validateCuratedVideoSeed(
  requiredVariations: readonly RequiredVideoVariation[],
  seedRows: readonly CuratedVideoSeed[],
  options: Readonly<{ supportedCanonicalExerciseSlugs?: readonly string[] }> = {},
): SeedValidationResult {
  const errors: SeedValidationError[] = [];
  const supportedCanonicalExerciseSlugs = new Set(
    options.supportedCanonicalExerciseSlugs ?? Object.keys(CATALOG_EXERCISES),
  );
  const requiredKeys = new Set(requiredVariations.map((variation) => key(variation.canonicalExerciseSlug, variation.variationId)));
  const rowsByKey = new Map<string, CuratedVideoSeed[]>();

  for (const required of requiredVariations) {
    if (!supportedCanonicalExerciseSlugs.has(required.canonicalExerciseSlug)) {
      errors.push(error("unsupported-canonical-exercise", "A required mapping references an unsupported canonical exercise.", required));
    }
  }

  for (const row of seedRows) {
    const rowRecord = row as SeedCandidate;
    if (!supportedCanonicalExerciseSlugs.has(row.canonicalExerciseSlug)) {
      errors.push(error("unsupported-canonical-exercise", "The seed references an unsupported canonical exercise.", row));
    }
    if (!requiredKeys.has(key(row.canonicalExerciseSlug, row.variationId))) {
      errors.push(error("wrong-variation", "The seed row does not match a required canonical exercise variation.", row));
    }
    if (!YOUTUBE_VIDEO_ID_PATTERN.test(row.videoId)) {
      errors.push(error("invalid-video-id", "The seed contains an invalid YouTube video ID.", row));
    }
    if (row.displayOrder !== 1 && row.displayOrder !== 2) {
      errors.push(error("invalid-display-order", "A curated variation must use display order one or two.", row));
    }
    if (row.approvalState !== "approved") {
      errors.push(error("not-approved", "Every seeded video must be approved by a human reviewer.", row));
    }
    if (typeof row.reviewer !== "string" || !row.reviewer.trim()) {
      errors.push(error("missing-reviewer", "Every approved seeded video must name its reviewer.", row));
    }
    if (typeof row.reviewedAt !== "string" || !row.reviewedAt.trim() || Number.isNaN(Date.parse(row.reviewedAt))) {
      errors.push(error("missing-review-timestamp", "Every approved seeded video must have a valid review timestamp.", row));
    }
    if (!row.fullWatchConfirmed) {
      errors.push(error("not-fully-watched", "Every seeded video must have a complete-watch confirmation.", row));
    }
    if (typeof row.title !== "string" || !row.title.trim()) {
      errors.push(error("missing-title", "Every seeded video must preserve its reviewed title.", row));
    }
    if (typeof row.channelTitle !== "string" || !row.channelTitle.trim()) {
      errors.push(error("missing-channel", "Every seeded video must preserve its reviewed channel attribution.", row));
    }
    if (hasOwnValue(rowRecord, "viewCount")) {
      errors.push(error("view-count-not-allowed", "View counts are candidate metadata and cannot be stored in production seed truth.", row));
    }

    const rowKey = key(row.canonicalExerciseSlug, row.variationId);
    const rows = rowsByKey.get(rowKey) ?? [];
    rows.push(row);
    rowsByKey.set(rowKey, rows);
  }

  for (const required of requiredVariations) {
    const rowKey = key(required.canonicalExerciseSlug, required.variationId);
    const rows = rowsByKey.get(rowKey) ?? [];
    if (rows.length !== 2) {
      errors.push({
        code: "required-video-count",
        message: `The ${rowKey} variation must contain exactly two videos.`,
        canonicalExerciseSlug: required.canonicalExerciseSlug,
        variationId: required.variationId,
      });
    }

    const videoIds = new Set<string>();
    const displayOrders = new Set<number>();
    for (const row of rows) {
      if (videoIds.has(row.videoId)) {
        errors.push(error("duplicate-video-id", "A variation cannot reuse the same YouTube video ID.", row));
      }
      videoIds.add(row.videoId);
      if (displayOrders.has(row.displayOrder)) {
        errors.push(error("duplicate-display-order", "A variation cannot reuse a display order.", row));
      }
      displayOrders.add(row.displayOrder);
    }
  }

  return { valid: errors.length === 0, errors };
}

export const validateProductionVideoSeed = validateCuratedVideoSeed;
export const checkCuratedVideoSeed = validateCuratedVideoSeed;
export const validateSeed = validateCuratedVideoSeed;
