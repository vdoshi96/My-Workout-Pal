import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ExerciseVideoField } from "@/components/video/exercise-video-field";
import { EQUIPMENT_PROFILES, type EquipmentId } from "@/domain/equipment";
import {
  CATALOG_EXERCISES,
  type LoggingKind,
} from "@/domain/exercises/catalog";
import type { CatalogManifestRecord } from "@/domain/exercises/catalog-generator";
import {
  armsManifest,
  backAndRearShoulderManifest,
  chestAndPushingManifest,
  lowerBodyAndGlutesManifest,
  shouldersManifest,
} from "@/domain/exercises/catalog-manifests";
import { listCatalogExercises } from "@/domain/exercises/library";
import { buildStarterDatabaseRows } from "@/domain/seed/starter-database-rows";
import { APPROVED_CURATED_VIDEO_SEED } from "@/domain/youtube/approved-curated-video-seed";
import { APPROVED_VIDEO_REQUIRED_VARIATIONS } from "@/domain/youtube/video-requirements";

type ExpectedExercise = readonly [
  slug: string,
  loggingKind: LoggingKind,
  requiredEquipment: readonly EquipmentId[],
];

const CHEST_ADDITIONS = [
  ["push-up", "bodyweight_reps", ["bodyweight"]],
  ["incline-push-up", "bodyweight_reps", ["bodyweight", "bench"]],
  ["decline-push-up", "bodyweight_reps", ["bodyweight", "bench"]],
  ["close-grip-push-up", "bodyweight_reps", ["bodyweight"]],
  ["diamond-push-up", "bodyweight_reps", ["bodyweight"]],
  ["dumbbell-floor-press", "weight_reps", ["dumbbells"]],
  ["dumbbell-squeeze-press", "weight_reps", ["dumbbells", "bench"]],
  ["dumbbell-chest-fly", "weight_reps", ["dumbbells", "bench"]],
  ["incline-dumbbell-fly", "weight_reps", ["dumbbells", "bench"]],
  [
    "incline-barbell-bench-press",
    "weight_reps",
    ["barbell", "plates", "bench", "rack"],
  ],
  [
    "close-grip-barbell-bench-press",
    "weight_reps",
    ["barbell", "plates", "bench", "rack"],
  ],
  ["barbell-floor-press", "weight_reps", ["barbell", "plates", "rack"]],
] as const satisfies readonly ExpectedExercise[];

const BACK_ADDITIONS = [
  ["pendlay-row", "weight_reps", ["barbell", "plates"]],
  ["underhand-barbell-row", "weight_reps", ["barbell", "plates"]],
  ["dumbbell-renegade-row", "weight_reps", ["dumbbells"]],
  ["dumbbell-reverse-fly", "weight_reps", ["dumbbells"]],
  ["dumbbell-rear-delt-row", "weight_reps", ["dumbbells"]],
  ["barbell-shrug", "weight_reps", ["barbell", "plates"]],
  ["dumbbell-shrug", "weight_reps", ["dumbbells"]],
  ["inverted-row", "bodyweight_reps", ["bodyweight", "barbell", "rack"]],
  ["dumbbell-dead-row", "weight_reps", ["dumbbells"]],
  ["barbell-rack-pull", "weight_reps", ["barbell", "plates", "rack"]],
  ["dumbbell-high-pull", "weight_reps", ["dumbbells"]],
] as const satisfies readonly ExpectedExercise[];

const SHOULDER_ADDITIONS = [
  ["standing-dumbbell-shoulder-press", "weight_reps", ["dumbbells"]],
  ["arnold-press", "weight_reps", ["dumbbells", "bench"]],
  ["dumbbell-lateral-raise", "weight_reps", ["dumbbells"]],
  ["leaning-dumbbell-lateral-raise", "weight_reps", ["dumbbells", "rack"]],
  ["dumbbell-front-raise", "weight_reps", ["dumbbells"]],
  ["barbell-overhead-press", "weight_reps", ["barbell", "plates", "rack"]],
  ["barbell-push-press", "weight_reps", ["barbell", "plates", "rack"]],
  ["dumbbell-z-press", "weight_reps", ["dumbbells"]],
  ["dumbbell-upright-row", "weight_reps", ["dumbbells"]],
  ["barbell-upright-row", "weight_reps", ["barbell", "plates"]],
] as const satisfies readonly ExpectedExercise[];

const ARM_ADDITIONS = [
  ["hammer-curl", "weight_reps", ["dumbbells"]],
  ["cross-body-hammer-curl", "weight_reps", ["dumbbells"]],
  ["incline-dumbbell-curl", "weight_reps", ["dumbbells", "bench"]],
  ["concentration-curl", "weight_reps", ["dumbbells", "bench"]],
  ["barbell-curl", "weight_reps", ["barbell", "plates"]],
  ["reverse-barbell-curl", "weight_reps", ["barbell", "plates"]],
  [
    "lying-dumbbell-triceps-extension",
    "weight_reps",
    ["dumbbells", "bench"],
  ],
  ["barbell-skull-crusher", "weight_reps", ["barbell", "plates", "bench"]],
  ["dumbbell-triceps-kickback", "weight_reps", ["dumbbells", "bench"]],
  ["bench-dip", "bodyweight_reps", ["bodyweight", "bench"]],
  ["close-grip-dumbbell-press", "weight_reps", ["dumbbells", "bench"]],
  [
    "barbell-jm-press",
    "weight_reps",
    ["barbell", "plates", "bench", "rack"],
  ],
] as const satisfies readonly ExpectedExercise[];

const LOWER_BODY_ADDITIONS = [
  ["barbell-front-squat", "weight_reps", ["barbell", "plates", "rack"]],
  ["zercher-squat", "weight_reps", ["barbell", "plates", "rack"]],
  ["sumo-goblet-squat", "weight_reps", ["dumbbells"]],
  ["dumbbell-split-squat", "weight_reps", ["dumbbells"]],
  ["forward-lunge", "weight_reps", ["dumbbells"]],
  ["walking-lunge", "weight_reps", ["dumbbells"]],
  ["lateral-lunge", "weight_reps", ["dumbbells"]],
  ["dumbbell-step-up", "weight_reps", ["dumbbells", "bench"]],
  ["lateral-step-up", "weight_reps", ["dumbbells", "bench"]],
  [
    "single-leg-dumbbell-romanian-deadlift",
    "weight_reps",
    ["dumbbells"],
  ],
  ["dumbbell-stiff-leg-deadlift", "weight_reps", ["dumbbells"]],
  ["conventional-barbell-deadlift", "weight_reps", ["barbell", "plates"]],
  ["sumo-barbell-deadlift", "weight_reps", ["barbell", "plates"]],
  ["barbell-good-morning", "weight_reps", ["barbell", "plates", "rack"]],
  ["bodyweight-glute-bridge", "bodyweight_reps", ["bodyweight"]],
  ["single-leg-glute-bridge", "bodyweight_reps", ["bodyweight"]],
  ["frog-pump", "bodyweight_reps", ["bodyweight"]],
  ["seated-dumbbell-calf-raise", "weight_reps", ["dumbbells", "bench"]],
  ["single-leg-calf-raise", "bodyweight_reps", ["bodyweight"]],
  ["wall-sit", "duration", ["bodyweight"]],
] as const satisfies readonly ExpectedExercise[];

const EXPECTED_BY_MANIFEST = [
  { manifest: chestAndPushingManifest, releasedCount: 3, additions: CHEST_ADDITIONS },
  {
    manifest: backAndRearShoulderManifest,
    releasedCount: 4,
    additions: BACK_ADDITIONS,
  },
  { manifest: shouldersManifest, releasedCount: 1, additions: SHOULDER_ADDITIONS },
  { manifest: armsManifest, releasedCount: 2, additions: ARM_ADDITIONS },
  {
    manifest: lowerBodyAndGlutesManifest,
    releasedCount: 9,
    additions: LOWER_BODY_ADDITIONS,
  },
] as const;

const ALL_ADDITIONS = [
  ...CHEST_ADDITIONS,
  ...BACK_ADDITIONS,
  ...SHOULDER_ADDITIONS,
  ...ARM_ADDITIONS,
  ...LOWER_BODY_ADDITIONS,
] as const satisfies readonly ExpectedExercise[];
const ADDED_SLUGS = ALL_ADDITIONS.map(([slug]) => slug);

function manifestProjection(records: readonly CatalogManifestRecord[]) {
  return records.map(({ slug, loggingKind, requiredEquipment }) => [
    slug,
    loggingKind,
    requiredEquipment,
  ]);
}

describe("Wave 2 strength catalog expansion", () => {
  it("appends the 65 distinct candidates once in bounded inventory order", () => {
    expect(ALL_ADDITIONS).toHaveLength(65);
    expect(new Set(ADDED_SLUGS)).toHaveLength(65);

    for (const { manifest, releasedCount, additions } of EXPECTED_BY_MANIFEST) {
      expect(manifestProjection(manifest.slice(releasedCount))).toEqual(additions);
    }

    expect(Object.keys(CATALOG_EXERCISES)).toHaveLength(92);
    expect(Object.keys(CATALOG_EXERCISES).slice(0, 27)).toEqual(
      APPROVED_VIDEO_REQUIRED_VARIATIONS.map(
        ({ canonicalExerciseSlug }) => canonicalExerciseSlug,
      ),
    );
    expect(Object.keys(CATALOG_EXERCISES).slice(27)).toEqual(ADDED_SLUGS);
  });

  it("keeps authored records ID-free and generates complete bounded content", () => {
    const addedRecords = ADDED_SLUGS.map((slug) => CATALOG_EXERCISES[slug]);

    for (const record of addedRecords) {
      expect(record).toBeDefined();
      expect(record).not.toHaveProperty("id");
      expect(record?.aliases.length).toBeGreaterThan(0);
      expect(record?.primaryMuscles.length).toBeGreaterThan(0);
      expect(record?.instructions).toHaveLength(3);
      expect(record?.instructions.every((cue) => cue.trim().length > 0)).toBe(true);
    }

    expect(
      ALL_ADDITIONS.filter(([, loggingKind]) => loggingKind === "weight_reps"),
    ).toHaveLength(53);
    expect(
      ALL_ADDITIONS.filter(
        ([, loggingKind]) => loggingKind === "bodyweight_reps",
      ),
    ).toHaveLength(11);
    expect(
      ALL_ADDITIONS.filter(([, loggingKind]) => loggingKind === "duration"),
    ).toHaveLength(1);
  });

  it("reconciles prone dumbbell row as an alias of the released canonical row", () => {
    expect(CATALOG_EXERCISES).not.toHaveProperty("prone-dumbbell-row");
    expect(
      CATALOG_EXERCISES["chest-supported-dumbbell-row"]?.aliases,
    ).toContain("prone dumbbell row");
    expect(
      listCatalogExercises({
        profile: EQUIPMENT_PROFILES.dumbbells,
        query: "prone dumbbell row",
      }).map(({ slug }) => slug),
    ).toEqual(["chest-supported-dumbbell-row"]);
  });

  it("finds representative additions by name and alias within equipment profiles", () => {
    expect(
      listCatalogExercises({
        profile: EQUIPMENT_PROFILES.barbell,
        query: "strict press",
      }).map(({ slug }) => slug),
    ).toEqual(["barbell-overhead-press"]);
    expect(
      listCatalogExercises({
        profile: EQUIPMENT_PROFILES.dumbbells,
        query: "single leg calf raise",
      }).map(({ slug }) => slug),
    ).toEqual(["single-leg-calf-raise"]);

    const dumbbellSlugs = listCatalogExercises({
      profile: EQUIPMENT_PROFILES.dumbbells,
    }).map(({ slug }) => slug);
    expect(dumbbellSlugs).toContain("sumo-goblet-squat");
    expect(dumbbellSlugs).toContain("push-up");
    expect(dumbbellSlugs).not.toContain("barbell-front-squat");
    expect(
      listCatalogExercises({ profile: EQUIPMENT_PROFILES.barbell }).map(
        ({ slug }) => slug,
      ),
    ).toContain("barbell-front-squat");
  });

  it("preserves logging meaning while keeping new records text-only", () => {
    expect(CATALOG_EXERCISES["wall-sit"]?.loggingKind).toBe("duration");
    expect(CATALOG_EXERCISES["push-up"]?.loggingKind).toBe("bodyweight_reps");
    expect(CATALOG_EXERCISES["barbell-front-squat"]?.loggingKind).toBe(
      "weight_reps",
    );

    const approvedSlugs = new Set(
      APPROVED_CURATED_VIDEO_SEED.map(({ canonicalExerciseSlug }) =>
        canonicalExerciseSlug,
      ),
    );
    expect(ADDED_SLUGS.every((slug) => !approvedSlugs.has(slug))).toBe(true);
    expect(APPROVED_VIDEO_REQUIRED_VARIATIONS).toHaveLength(27);
    expect(APPROVED_CURATED_VIDEO_SEED).toHaveLength(54);

    const rows = buildStarterDatabaseRows();
    const wallSit = rows.catalogExercises.find(({ slug }) => slug === "wall-sit");
    expect(rows.catalogExercises).toHaveLength(92);
    expect(rows.curatedVideos).toHaveLength(54);
    expect(wallSit?.instructions.split("\n")).toHaveLength(3);
    expect(
      rows.curatedVideos.some(({ exerciseId }) => exerciseId === wallSit?.id),
    ).toBe(false);

    const markup = renderToStaticMarkup(
      <main>
        <ol>
          {CATALOG_EXERCISES["wall-sit"]?.instructions.map((instruction) => (
            <li key={instruction}>{instruction}</li>
          ))}
        </ol>
        <ExerciseVideoField videos={undefined} />
      </main>,
    );
    expect(markup).toContain("Curated demos unavailable");
    expect(markup).not.toContain("<iframe");
  });
});
