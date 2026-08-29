import type {
  CatalogManifestCategory,
  CatalogManifestRecord,
} from "@/domain/exercises/catalog-generator";
import { armsManifest } from "./arms";
import { backAndRearShoulderManifest } from "./back-and-rear-shoulder";
import { chestAndPushingManifest } from "./chest-and-pushing";
import { conditioningAndCarriesManifest } from "./conditioning-and-carries";
import { coreManifest } from "./core";
import { lowerBodyAndGlutesManifest } from "./lower-body-and-glutes";
import { mobilityAndRecoveryManifest } from "./mobility-and-recovery";
import { shouldersManifest } from "./shoulders";

/**
 * The eight isolated expansion categories. Category order is stable for new
 * records; the compatibility list below keeps the released 27-record order.
 */
export const CATALOG_MANIFESTS = Object.freeze([
  { category: "chest-and-pushing", records: chestAndPushingManifest },
  { category: "back-and-rear-shoulder", records: backAndRearShoulderManifest },
  { category: "shoulders", records: shouldersManifest },
  { category: "arms", records: armsManifest },
  { category: "lower-body-and-glutes", records: lowerBodyAndGlutesManifest },
  { category: "core", records: coreManifest },
  { category: "conditioning-and-carries", records: conditioningAndCarriesManifest },
  { category: "mobility-and-recovery", records: mobilityAndRecoveryManifest },
] as const satisfies readonly CatalogManifestCategory[]);

/** The exact order exposed by the released `CATALOG_EXERCISES` object. */
const RELEASED_CATALOG_SLUG_ORDER = [
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
] as const;

const allManifestRecords: CatalogManifestRecord[] = [];
for (const category of CATALOG_MANIFESTS) {
  allManifestRecords.push(
    ...(category.records as readonly CatalogManifestRecord[]),
  );
}

const recordsBySlug = new Map<string, CatalogManifestRecord>();
for (const record of allManifestRecords) {
  if (recordsBySlug.has(record.slug)) {
    throw new TypeError(`Duplicate catalog manifest slug: ${record.slug}`);
  }
  recordsBySlug.set(record.slug, record);
}

function releasedRecord(slug: string): CatalogManifestRecord {
  const record = recordsBySlug.get(slug);
  if (!record) {
    throw new Error(`Missing released catalog manifest record: ${slug}`);
  }
  return record;
}

const releasedSlugs = new Set<string>(RELEASED_CATALOG_SLUG_ORDER);

/**
 * Feed this ordered view to the generator. Any future category additions are
 * appended deterministically after the released records until their slugs are
 * explicitly added to a later compatibility order.
 */
export const CATALOG_MANIFEST_RECORDS = Object.freeze([
  ...RELEASED_CATALOG_SLUG_ORDER.map(releasedRecord),
  ...allManifestRecords.filter((record) => !releasedSlugs.has(record.slug)),
]);

export {
  armsManifest,
  backAndRearShoulderManifest,
  chestAndPushingManifest,
  conditioningAndCarriesManifest,
  coreManifest,
  lowerBodyAndGlutesManifest,
  mobilityAndRecoveryManifest,
  shouldersManifest,
};
