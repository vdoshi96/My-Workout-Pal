import { redirect } from "next/navigation";

import { ProgramEditor } from "@/components/program/program-editor";
import type { ProgramExerciseCandidate } from "@/components/program/program-editor-model";
import { getDatabase } from "@/db/client";
import { EQUIPMENT_PROFILES } from "@/domain/equipment";
import {
  listCatalogExercises,
  listOwnedCustomExercises,
} from "@/domain/exercises/library";
import { deterministicSeedUuid } from "@/domain/seed/identity";
import { getCurrentViewer } from "@/server/auth/viewer";
import { listCustomExercises } from "@/server/repositories/custom-exercises";
import {
  getViewerProfileProgram,
  RepositoryNotFoundError,
} from "@/server/repositories/profile-program";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function loadEditor() {
  const viewer = await getCurrentViewer();
  if (!viewer) return undefined;
  try {
    const database = getDatabase();
    const [model, ownedCustomExercises] = await Promise.all([
      getViewerProfileProgram(database, viewer),
      listCustomExercises(database, viewer),
    ]);
    const activeProgram = model.activeProgram;
    if (!activeProgram) return { candidates: [], model, viewer };
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
    return { candidates: [...customCandidates, ...catalogCandidates], model, viewer };
  } catch (error) {
    if (error instanceof RepositoryNotFoundError) return undefined;
    throw error;
  }
}

export default async function ProgramEditorPage() {
  const data = await loadEditor();
  if (!data?.model.activeProgram) redirect("/app");
  return (
    <ProgramEditor
      canMutate={data.viewer.eligibleForPermanentMutations}
      candidates={data.candidates}
      initialProgram={data.model.activeProgram}
    />
  );
}
