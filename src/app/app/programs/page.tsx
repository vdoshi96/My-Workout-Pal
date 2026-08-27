import { redirect } from "next/navigation";

import { ProgramCollection } from "@/components/program/program-collection";
import { getDatabase } from "@/db/client";
import { getCurrentViewer } from "@/server/auth/viewer";
import {
  getViewerProfileProgram,
  RepositoryNotFoundError,
} from "@/server/repositories/profile-program";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function readCollectionOrUndefined(
  viewer: NonNullable<Awaited<ReturnType<typeof getCurrentViewer>>>,
) {
  try {
    return await getViewerProfileProgram(getDatabase(), viewer);
  } catch (error) {
    if (error instanceof RepositoryNotFoundError) return undefined;
    throw error;
  }
}

export default async function ProgramsPage() {
  const viewer = await getCurrentViewer();
  if (!viewer) return null;
  const model = await readCollectionOrUndefined(viewer);
  if (!model?.activeProgram || model.programs.length === 0) redirect("/app");
  const catalogMovements = [
    ...new Map(
      model.activeProgram.days
        .flatMap((day) => day.prescriptions)
        .filter((prescription) => prescription.catalogExerciseId !== null)
        .map((prescription) => [
          prescription.catalogExerciseId!,
          {
            id: prescription.catalogExerciseId!,
            name: prescription.exercise.name,
            requiredEquipment: prescription.exercise.requiredEquipment,
          },
        ]),
    ).values(),
  ].sort((left, right) => left.name.localeCompare(right.name, "en-US"));
  return (
    <ProgramCollection
      canMutate={viewer.eligibleForPermanentMutations}
      initialCatalogMovements={catalogMovements}
      initialPrograms={model.programs}
    />
  );
}
