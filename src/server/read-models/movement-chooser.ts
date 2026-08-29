import type { Database } from "@/db/client";
import { EQUIPMENT_PROFILES } from "@/domain/equipment";
import {
  listCatalogExercises,
  listOwnedCustomExercises,
} from "@/domain/exercises/library";
import type {
  MovementChooserCandidate,
  MovementChooserData,
} from "@/domain/exercises/movement-chooser";
import { deterministicSeedUuid } from "@/domain/seed/identity";
import type { ViewerContext } from "@/server/auth/viewer";
import { listApprovedCuratedVideoPairsByExerciseIds } from "@/server/repositories/curated-videos";
import { listCustomExercises } from "@/server/repositories/custom-exercises";
import { getViewerProfileProgram } from "@/server/repositories/profile-program";

export async function loadMovementChooserData(
  database: Database,
  viewer: ViewerContext,
): Promise<MovementChooserData> {
  const [profileProgram, ownedCustomExercises] = await Promise.all([
    getViewerProfileProgram(database, viewer),
    listCustomExercises(database, viewer),
  ]);
  const equipmentProfileKind =
    profileProgram.activeProgram?.equipmentProfileKind ??
    profileProgram.equipment.profileKind;
  const profile = EQUIPMENT_PROFILES[equipmentProfileKind];
  const catalog = listCatalogExercises({ profile });
  const catalogIds = catalog.map(({ slug }) =>
    deterministicSeedUuid("catalog-exercise", slug),
  );
  const approvedPairs = await listApprovedCuratedVideoPairsByExerciseIds(
    database,
    catalogIds,
  );

  const privateCandidates: MovementChooserCandidate[] = listOwnedCustomExercises(
    ownedCustomExercises,
    { profile },
  ).map((exercise) => ({
    selection: {
      source: { kind: "custom", id: exercise.id },
      name: exercise.name,
      loggingKind: exercise.loggingKind,
    },
    requiredEquipment: exercise.equipmentIds,
    searchText: exercise.aliases
      .flatMap(({ alias, normalizedAlias }) => [alias, normalizedAlias])
      .join(" ")
      .slice(0, 2_000),
    hasApprovedGuidance: false,
  }));
  const catalogCandidates: MovementChooserCandidate[] = catalog.map(
    (exercise) => {
      const id = deterministicSeedUuid("catalog-exercise", exercise.slug);
      return {
        selection: {
          source: { kind: "catalog", id },
          name: exercise.name,
          loggingKind: exercise.loggingKind,
        },
        requiredEquipment: exercise.requiredEquipment,
        searchText: [
          exercise.slug.replaceAll("-", " "),
          exercise.movementFamily,
          exercise.role,
          ...exercise.aliases,
          ...exercise.primaryMuscles,
        ]
          .join(" ")
          .slice(0, 2_000),
        hasApprovedGuidance: approvedPairs[id] !== undefined,
      };
    },
  );

  return {
    canMutate: viewer.eligibleForPermanentMutations,
    equipmentProfileKind,
    availableEquipment: [...profile.equipment],
    candidates: [...privateCandidates, ...catalogCandidates],
  };
}
