import { listCatalogExercises } from "@/domain/exercises/library";
import { EQUIPMENT_PROFILES } from "@/domain/equipment";
import { deterministicSeedUuid } from "@/domain/seed/identity";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { ProgramCollection } from "@/components/program/program-collection";
import type { Database } from "@/db/client";
import type { ViewerContext } from "@/server/auth/viewer";
import {
  getViewerProfileProgram,
  RepositoryNotFoundError,
} from "@/server/repositories/profile-program";
import { getHarnessDatabase } from "../../../server/database";
import { harnessRequestContext } from "../../../server/harness-context";

export const metadata = { title: "Your routines" };

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function readCollectionOrUndefined(
  database: Database,
  viewer: ViewerContext,
) {
  try {
    return await getViewerProfileProgram(database, viewer);
  } catch (error) {
    if (error instanceof RepositoryNotFoundError) return undefined;
    throw error;
  }
}

export default async function HarnessProgramsPage() {
  const context = harnessRequestContext(await headers());
  if (!context.viewer) return null;
  const { database } = await getHarnessDatabase(context.scope);
  const model = await readCollectionOrUndefined(database, context.viewer);
  if (!model?.activeProgram || model.programs.length === 0) redirect("/app");
  const catalogMovements = [...new Map(Object.values(EQUIPMENT_PROFILES).flatMap((profile) =>
    listCatalogExercises({ profile }).map((exercise) => [exercise.slug, {
      id: deterministicSeedUuid("catalog-exercise", exercise.slug), name: exercise.name, requiredEquipment: exercise.requiredEquipment,
    }] as const),
  )).values()].sort((left, right) => left.name.localeCompare(right.name, "en-US"));
  return (
    <ProgramCollection
      canMutate={context.viewer.eligibleForPermanentMutations}
      initialCatalogMovements={catalogMovements}
      initialPrograms={model.programs}
    />
  );
}
