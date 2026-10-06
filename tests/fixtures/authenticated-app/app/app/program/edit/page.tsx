import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { ProgramEditor } from "@/components/program/program-editor";
import type { ViewerContext } from "@/server/auth/viewer";
import { RepositoryNotFoundError } from "@/server/repositories/profile-program";
import { loadProgramEditorReadModel } from "@/server/read-models/program-editor";
import { fromParam, resolveBackTarget } from "@/domain/navigation/back-target";
import { getHarnessDatabase } from "../../../../server/database";
import { harnessRequestContext } from "../../../../server/harness-context";

export const metadata = { title: "Routine" };

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function loadEditor(
  scope: string,
  viewer: ViewerContext,
) {
  try {
    const { database } = await getHarnessDatabase(scope);
    return await loadProgramEditorReadModel(database, viewer);
  } catch (error) {
    if (error instanceof RepositoryNotFoundError) return undefined;
    throw error;
  }
}

type PageProps = Readonly<{ searchParams: Promise<{ day?: string | string[]; from?: string | string[] }> }>;

export default async function HarnessProgramEditorPage({ searchParams }: PageProps) {
  const context = harnessRequestContext(await headers());
  if (!context.viewer) return null;
  const [data, query] = await Promise.all([loadEditor(context.scope, context.viewer), searchParams]);
  if (!data?.model.activeProgram) redirect("/app");
  const back = resolveBackTarget(fromParam(query.from), {
    area: "member",
    fallback: { href: "/app", label: "Back to Today" },
    days: data.model.activeProgram.days,
  });

  return (
    <ProgramEditor
      back={back}
      initialDayKey={fromParam(query.day)}
      canMutate={context.viewer.eligibleForPermanentMutations}
      candidates={data.candidates}
      initialProgram={data.model.activeProgram}
      unitSystem={data.model.preferences.unitSystem}
    />
  );
}
