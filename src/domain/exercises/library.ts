import { supportsEquipment, type EquipmentProfile } from "@/domain/equipment";
import { CATALOG_EXERCISES, type CatalogExercise } from "@/domain/exercises/catalog";

export type ExerciseLibraryQuery = Readonly<{
  profile: EquipmentProfile;
  query?: string;
}>;

function matchesQuery(exercise: CatalogExercise, query: string): boolean {
  const terms = query
    .trim()
    .toLocaleLowerCase("en-US")
    .split(/\s+/u)
    .filter(Boolean);

  if (terms.length === 0) return true;

  const searchableText = `${exercise.name} ${exercise.slug.replaceAll("-", " ")}`.toLocaleLowerCase(
    "en-US",
  );
  return terms.every((term) => searchableText.includes(term));
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
