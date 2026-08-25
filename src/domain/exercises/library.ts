import {
  supportsEquipment,
  type EquipmentId,
  type EquipmentProfile,
} from "@/domain/equipment";
import { CATALOG_EXERCISES, type CatalogExercise } from "@/domain/exercises/catalog";

export type ExerciseLibraryQuery = Readonly<{
  profile: EquipmentProfile;
  query?: string;
}>;

function matchesQuery(exercise: CatalogExercise, query: string): boolean {
  const terms = searchTerms(query);

  if (terms.length === 0) return true;

  const searchableText = [
    exercise.name,
    exercise.slug.replaceAll("-", " "),
    exercise.movementFamily.replaceAll("-", " "),
    ...exercise.aliases,
    ...exercise.primaryMuscles,
    ...exercise.requiredEquipment,
  ]
    .join(" ")
    .toLocaleLowerCase("en-US");
  return terms.every((term) => searchableText.includes(term));
}

function searchTerms(query: string): readonly string[] {
  return query
    .trim()
    .toLocaleLowerCase("en-US")
    .split(/\s+/u)
    .filter(Boolean);
}

type OwnedCustomExerciseSearchRecord = Readonly<{
  id: string;
  name: string;
  loggingKind: string;
  equipmentIds: readonly EquipmentId[];
  aliases: readonly Readonly<{ alias: string; normalizedAlias: string }>[];
}>;

export function listOwnedCustomExercises<T extends OwnedCustomExerciseSearchRecord>(
  exercises: readonly T[],
  { profile, query = "" }: ExerciseLibraryQuery,
): readonly T[] {
  const terms = searchTerms(query);
  return exercises
    .filter((exercise) => supportsEquipment(profile, exercise.equipmentIds))
    .filter((exercise) => {
      const searchableText = [
        exercise.name,
        exercise.loggingKind.replaceAll("_", " "),
        ...exercise.equipmentIds,
        ...exercise.aliases.flatMap(({ alias, normalizedAlias }) => [alias, normalizedAlias]),
      ]
        .join(" ")
        .toLocaleLowerCase("en-US");
      return terms.every((term) => searchableText.includes(term));
    })
    .sort((left, right) => left.name.localeCompare(right.name, "en-US"));
}

export function listCatalogExercises({
  profile,
  query = "",
}: ExerciseLibraryQuery): readonly CatalogExercise[] {
  return Object.values(CATALOG_EXERCISES)
    .filter((exercise) => supportsEquipment(profile, exercise.requiredEquipment))
    .filter((exercise) => matchesQuery(exercise, query))
    .sort((left, right) => left.name.localeCompare(right.name, "en-US"));
}
