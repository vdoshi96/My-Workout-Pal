import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { ProgramEditor } from "@/components/program/program-editor";
import type { ViewerContext } from "@/server/auth/viewer";
import { RepositoryNotFoundError } from "@/server/repositories/profile-program";
import { loadProgramEditorReadModel } from "@/server/read-models/program-editor";
import { getHarnessDatabase } from "../../../../server/database";
import { harnessRequestContext } from "../../../../server/harness-context";

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

export default async function HarnessProgramEditorPage() {
  const context = harnessRequestContext(await headers());
  if (!context.viewer) return null;
  const data = await loadEditor(context.scope, context.viewer);
  if (!data?.model.activeProgram) redirect("/app");

  return (
    <ProgramEditor
      canMutate={context.viewer.eligibleForPermanentMutations}
      candidates={data.candidates}
      initialProgram={data.model.activeProgram}
      unitSystem={data.model.preferences.unitSystem}
    />
  );
}
