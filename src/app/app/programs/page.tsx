import { listCatalogExercises } from "@/domain/exercises/library";
import { EQUIPMENT_PROFILES } from "@/domain/equipment";
import { deterministicSeedUuid } from "@/domain/seed/identity";
import { redirect } from "next/navigation";

import { ProgramCollection } from "@/components/program/program-collection";
import { getDatabase } from "@/db/client";
import { fromParam, resolveBackTarget } from "@/domain/navigation/back-target";
import { getCurrentViewer } from "@/server/auth/viewer";
import {
  getViewerProfileProgram,
  RepositoryNotFoundError,
} from "@/server/repositories/profile-program";

export const metadata = { title: "Your routines" };

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

type PageProps = Readonly<{ searchParams: Promise<{ from?: string | string[] }> }>;

export default async function ProgramsPage({ searchParams }: PageProps) {
  const viewer = await getCurrentViewer();
  if (!viewer) return null;
  const [model, query] = await Promise.all([readCollectionOrUndefined(viewer), searchParams]);
  if (!model?.activeProgram || model.programs.length === 0) redirect("/app");
  const back = resolveBackTarget(fromParam(query.from), {
    area: "member",
    fallback: { href: "/app", label: "Back to Today" },
    days: model.activeProgram.days,
  });
  const catalogMovements = [...new Map(Object.values(EQUIPMENT_PROFILES).flatMap((profile) =>
    listCatalogExercises({ profile }).map((exercise) => [exercise.slug, {
      id: deterministicSeedUuid("catalog-exercise", exercise.slug), name: exercise.name, requiredEquipment: exercise.requiredEquipment,
    }] as const),
  )).values()].sort((left, right) => left.name.localeCompare(right.name, "en-US"));
  return (
    <ProgramCollection
      back={back}
      canMutate={viewer.eligibleForPermanentMutations}
      initialCatalogMovements={catalogMovements}
      initialPrograms={model.programs}
    />
  );
}
