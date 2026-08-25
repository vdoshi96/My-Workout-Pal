import { describe, expect, it } from "vitest";

import {
  buildDefaultRequiredVideoVariations,
  validateCuratedVideoSeed,
} from "@/domain/youtube/seed-validation";
import type { CuratedVideoSeed, RequiredVideoVariation } from "@/domain/youtube/types";

const VIDEO_ID_ONE = "AbCdEfGhI01";
const VIDEO_ID_TWO = "ZyXwVuTsR98";
const VIDEO_ID_THREE = "QqRrSsTtUuV";

const required: readonly RequiredVideoVariation[] = [
  { canonicalExerciseSlug: "dumbbell-bench-press", variationId: "dumbbells" },
];

function seed(overrides: Partial<CuratedVideoSeed> = {}): CuratedVideoSeed {
  return {
    canonicalExerciseSlug: "dumbbell-bench-press",
    variationId: "dumbbells",
    videoId: VIDEO_ID_ONE,
    displayOrder: 1,
    title: "Dumbbell bench press tutorial",
    channelTitle: "Example Strength",
    approvalState: "approved",
    reviewer: "reviewer@example.com",
    reviewedAt: "2026-08-25T12:00:00.000Z",
    fullWatchConfirmed: true,
    ...overrides,
  };
}

describe("curated video seed validation", () => {
  it("requires exactly two approved, fully watched, distinct videos per variation", () => {
    const result = validateCuratedVideoSeed(required, [
      seed(),
      seed({ videoId: VIDEO_ID_TWO, displayOrder: 2 }),
    ]);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("reports missing, duplicate, unapproved, and unwatched mappings", () => {
    const result = validateCuratedVideoSeed(required, [
      seed({ videoId: VIDEO_ID_ONE, displayOrder: 1, fullWatchConfirmed: false }),
      seed({ videoId: VIDEO_ID_ONE, displayOrder: 1, approvalState: "pending" }),
    ]);

    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.code)).toEqual(
      expect.arrayContaining([
        "duplicate-video-id",
        "duplicate-display-order",
        "not-approved",
        "not-fully-watched",
      ]),
    );
  });

  it("rejects wrong variations, unsupported references, invalid IDs, and view-count product fields", () => {
    const result = validateCuratedVideoSeed(required, [
      seed({ canonicalExerciseSlug: "not-a-catalog-exercise", videoId: "invalid" }),
      seed({
        canonicalExerciseSlug: "dumbbell-bench-press",
        videoId: VIDEO_ID_THREE,
        displayOrder: 2,
        variationId: "barbell",
        viewCount: 10,
      }),
    ]);

    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.code)).toEqual(
      expect.arrayContaining([
        "unsupported-canonical-exercise",
        "wrong-variation",
        "invalid-video-id",
        "view-count-not-allowed",
      ]),
    );
  });

  it("rejects a mapping with anything other than two rows", () => {
    const result = validateCuratedVideoSeed(required, [seed()]);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "required-video-count" }),
    );
  });

  it("reports duplicate and missing required mappings when production coverage is required", () => {
    const result = validateCuratedVideoSeed(
      [required[0]!, required[0]!],
      [seed(), seed({ videoId: VIDEO_ID_TWO, displayOrder: 2 })],
      { requireDefaultCatalogCoverage: true },
    );

    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.code)).toEqual(
      expect.arrayContaining(["duplicate-required-variation", "missing-required-variation"]),
    );
  });

  it("derives all catalog canonical variations for the production checker", () => {
    const defaults = buildDefaultRequiredVideoVariations();

    expect(defaults).toHaveLength(27);
    expect(new Set(defaults.map((variation) => `${variation.canonicalExerciseSlug}::${variation.variationId}`)).size).toBe(27);
    expect(defaults.every((variation) => variation.variationId === "canonical")).toBe(true);
  });

  it("rejects reuse of one video ID across two required variations", () => {
    const secondVariation: RequiredVideoVariation = {
      canonicalExerciseSlug: "barbell-bench-press",
      variationId: "canonical",
    };
    const result = validateCuratedVideoSeed(
      [required[0]!, secondVariation],
      [
        seed(),
        seed({ videoId: VIDEO_ID_TWO, displayOrder: 2 }),
        seed({ canonicalExerciseSlug: secondVariation.canonicalExerciseSlug, variationId: secondVariation.variationId, displayOrder: 1 }),
        seed({ canonicalExerciseSlug: secondVariation.canonicalExerciseSlug, variationId: secondVariation.variationId, videoId: VIDEO_ID_THREE, displayOrder: 2 }),
      ],
    );

    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain("duplicate-video-id");
  });
});
