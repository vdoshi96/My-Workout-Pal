import { CATALOG_MANIFEST_RECORDS } from "@/domain/exercises/catalog-manifests";

export type ExerciseMetadata = Readonly<{
  movementFamily: string;
  primaryMuscles: readonly string[];
  aliases: readonly string[];
  instructions: readonly string[];
}>;

const metadataBySlug = new Map(
  CATALOG_MANIFEST_RECORDS.map((record) => [record.slug, record] as const),
);

/**
 * Backward-compatible metadata accessor. Category manifests are now the sole
 * authored source; callers still receive the historical metadata shape.
 */
export function getExerciseMetadata(slug: string): ExerciseMetadata {
  const exercise = metadataBySlug.get(slug);
  if (!exercise) throw new Error(`Missing exercise metadata: ${slug}`);
  return Object.freeze({
    movementFamily: exercise.movementFamily,
    primaryMuscles: Object.freeze([...exercise.primaryMuscles]),
    aliases: Object.freeze([...exercise.aliases]),
    instructions: Object.freeze([...exercise.instructions]) as readonly [
      string,
      string,
      string,
    ],
  });
}
