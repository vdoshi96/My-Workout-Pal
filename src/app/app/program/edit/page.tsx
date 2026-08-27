import { redirect } from "next/navigation";

import { ProgramEditor } from "@/components/program/program-editor";
import { getDatabase } from "@/db/client";
import { getCurrentViewer } from "@/server/auth/viewer";
import { RepositoryNotFoundError } from "@/server/repositories/profile-program";
import { loadProgramEditorReadModel } from "@/server/read-models/program-editor";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function loadEditor() {
  const viewer = await getCurrentViewer();
  if (!viewer) return undefined;
  try {
    return { ...(await loadProgramEditorReadModel(getDatabase(), viewer)), viewer };
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
      unitSystem={data.model.preferences.unitSystem}
    />
  );
}
