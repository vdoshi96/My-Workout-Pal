import { redirect } from "next/navigation";

import { ProgramEditor } from "@/components/program/program-editor";
import { getDatabase } from "@/db/client";
import { getCurrentViewer } from "@/server/auth/viewer";
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
    const model = await getViewerProfileProgram(getDatabase(), viewer);
    return { model, viewer };
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
      initialProgram={data.model.activeProgram}
    />
  );
}
