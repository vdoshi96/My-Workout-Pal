import { describe, expect, it } from "vitest";

import { CATALOG_EXERCISES } from "@/domain/exercises/catalog";
import { APPROVED_CURATED_VIDEO_SEED } from "@/domain/youtube/approved-curated-video-seed";
import {
  APPROVED_VIDEO_REQUIRED_VARIATIONS,
  DEFAULT_YOUTUBE_VARIATION_ID,
  validateVideoRequiredVariationPolicy,
} from "@/domain/youtube/video-requirements";

const TEXT_ONLY_SLUG = "synthetic-text-only-movement";

describe("catalog video eligibility policy", () => {
  it("keeps catalog membership independent from the explicit reviewed subset", () => {
    const supportedCatalogSlugs = [
      ...Object.keys(CATALOG_EXERCISES),
      TEXT_ONLY_SLUG,
      "another-synthetic-text-only-movement",
    ];
    const required = validateVideoRequiredVariationPolicy(
      APPROVED_VIDEO_REQUIRED_VARIATIONS,
      supportedCatalogSlugs,
    );

    expect(supportedCatalogSlugs.length).toBeGreaterThan(required.length);
    expect(required).toHaveLength(27);
    expect(required).not.toContainEqual(
      expect.objectContaining({ canonicalExerciseSlug: TEXT_ONLY_SLUG }),
    );
    expect(
      required.every(
        ({ variationId }) => variationId === DEFAULT_YOUTUBE_VARIATION_ID,
      ),
    ).toBe(true);
  });

  it("matches the released 27-variation declaration to the exact 54 approved rows", () => {
    const requiredKeys = APPROVED_VIDEO_REQUIRED_VARIATIONS.map(
      ({ canonicalExerciseSlug, variationId }) =>
        `${canonicalExerciseSlug}::${variationId}`,
    );
    const seedKeys = APPROVED_CURATED_VIDEO_SEED.map(
      ({ canonicalExerciseSlug, variationId }) =>
        `${canonicalExerciseSlug}::${variationId}`,
    );

    expect(APPROVED_CURATED_VIDEO_SEED).toHaveLength(54);
    expect([...new Set(seedKeys)]).toEqual(requiredKeys);
    for (const requiredKey of requiredKeys) {
      expect(
        seedKeys.filter((seedKey) => seedKey === requiredKey),
      ).toHaveLength(2);
    }
  });

  it("fails when the declaration is duplicate, noncanonical, or absent from the catalog", () => {
    const supportedCatalogSlugs = Object.keys(CATALOG_EXERCISES);
    const first = APPROVED_VIDEO_REQUIRED_VARIATIONS[0]!;

    expect(() =>
      validateVideoRequiredVariationPolicy(
        [...APPROVED_VIDEO_REQUIRED_VARIATIONS, first],
        supportedCatalogSlugs,
      ),
    ).toThrow(/duplicate/i);
    expect(() =>
      validateVideoRequiredVariationPolicy(
        [
          ...APPROVED_VIDEO_REQUIRED_VARIATIONS.slice(0, -1),
          { ...first, variationId: "dumbbells" },
        ],
        supportedCatalogSlugs,
      ),
    ).toThrow(/canonical variation/i);
    expect(() =>
      validateVideoRequiredVariationPolicy(
        APPROVED_VIDEO_REQUIRED_VARIATIONS,
        supportedCatalogSlugs.filter(
          (slug) => slug !== first.canonicalExerciseSlug,
        ),
      ),
    ).toThrow(/missing.*catalog record/i);
  });
});
