import { generateCatalog } from "@/domain/exercises/catalog-generator";
import { CATALOG_MANIFEST_RECORDS } from "@/domain/exercises/catalog-manifests";
import type { CatalogExercise } from "@/domain/exercises/catalog-generator";

export type {
  CatalogExercise,
  ExerciseRole,
  LoggingKind,
} from "@/domain/exercises/catalog-generator";

export const CATALOG_EXERCISES = generateCatalog(CATALOG_MANIFEST_RECORDS);

export function getCatalogExercise(
  slug: string,
): CatalogExercise {
  const exercise = CATALOG_EXERCISES[slug];
  if (!exercise) throw new Error(`Unknown catalog exercise: ${slug}`);
  return exercise;
}
