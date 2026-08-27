import type { ProgramExerciseCandidate } from "@/components/program/program-editor-model";
import type { Database } from "@/db/client";
import { EQUIPMENT_PROFILES } from "@/domain/equipment";
import {
  listCatalogExercises,
  listOwnedCustomExercises,
} from "@/domain/exercises/library";
import { deterministicSeedUuid } from "@/domain/seed/identity";
import type { ViewerContext } from "@/server/auth/viewer";
import { listCustomExercises } from "@/server/repositories/custom-exercises";
import { getViewerProfileProgram } from "@/server/repositories/profile-program";

export async function loadProgramEditorReadModel(
  database: Database,
  viewer: ViewerContext,
) {
  const [model, ownedCustomExercises] = await Promise.all([
    getViewerProfileProgram(database, viewer),
    listCustomExercises(database, viewer),
  ]);
  const activeProgram = model.activeProgram;
  if (!activeProgram) return { candidates: [] as ProgramExerciseCandidate[], model };

  const profile = EQUIPMENT_PROFILES[activeProgram.equipmentProfileKind];
  const catalogCandidates: ProgramExerciseCandidate[] = listCatalogExercises({ profile }).map(
    (exercise) => ({
      id: deterministicSeedUuid("catalog-exercise", exercise.slug),
      kind: "catalog",
      loggingKind: exercise.loggingKind,
      name: exercise.name,
      requiredEquipment: exercise.requiredEquipment,
      role: exercise.role,
      searchText: [
        exercise.movementFamily,
        ...exercise.aliases,
        ...exercise.primaryMuscles,
      ].join(" ").slice(0, 2_000),
    }),
  );
  const customCandidates: ProgramExerciseCandidate[] = listOwnedCustomExercises(
    ownedCustomExercises,
    { profile },
  ).map((exercise) => ({
    id: exercise.id,
    kind: "custom",
    loggingKind: exercise.loggingKind,
    name: exercise.name,
    requiredEquipment: exercise.equipmentIds,
    role: null,
    searchText: exercise.aliases
      .flatMap(({ alias, normalizedAlias }) => [alias, normalizedAlias])
      .join(" ")
      .slice(0, 2_000),
  }));
  return { candidates: [...customCandidates, ...catalogCandidates], model };
}
