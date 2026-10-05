import { redirect } from "next/navigation";

import { ProgramEditor } from "@/components/program/program-editor";
import { getDatabase } from "@/db/client";
import { fromParam, resolveBackTarget } from "@/domain/navigation/back-target";
import { getCurrentViewer } from "@/server/auth/viewer";
import { RepositoryNotFoundError } from "@/server/repositories/profile-program";
import { loadProgramEditorReadModel } from "@/server/read-models/program-editor";

export const metadata = { title: "Routine" };

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

type PageProps = Readonly<{ searchParams: Promise<{ day?: string | string[]; from?: string | string[] }> }>;

export default async function ProgramEditorPage({ searchParams }: PageProps) {
  const [data, query] = await Promise.all([loadEditor(), searchParams]);
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
      canMutate={data.viewer.eligibleForPermanentMutations}
      candidates={data.candidates}
      initialProgram={data.model.activeProgram}
      unitSystem={data.model.preferences.unitSystem}
    />
  );
}
