import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { TrainingHistoryDetail } from "@/components/insights/training-history-detail";
import { getViewerProfileProgram } from "@/server/repositories/profile-program";
import {
  loadTrainingSession,
  TrainingInsightsRepositoryError,
} from "@/server/repositories/training-insights";
import { getHarnessDatabase } from "../../../../server/database";
import { harnessRequestContext } from "../../../../server/harness-context";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function loadHarnessHistory(
  scope: string,
  viewer: NonNullable<ReturnType<typeof harnessRequestContext>["viewer"]>,
  sessionId: string,
) {
  const { database } = await getHarnessDatabase(scope);
  try {
    const [profile, session] = await Promise.all([
      getViewerProfileProgram(database, viewer),
      loadTrainingSession(database, viewer, sessionId),
    ]);
    return { profile, session };
  } catch (error) {
    if (
      error instanceof TrainingInsightsRepositoryError &&
      (error.code === "not_found" || error.code === "invalid_request")
    ) {
      notFound();
    }
    throw error;
  }
}

export default async function HarnessHistoryDetailPage({
  params,
}: Readonly<{ params: Promise<{ sessionId: string }> }>) {
  const [{ sessionId }, context] = await Promise.all([
    params,
    headers().then(harnessRequestContext),
  ]);
  if (!context.viewer) return null;
  const { profile, session } = await loadHarnessHistory(
    context.scope,
    context.viewer,
    sessionId,
  );
  return (
    <TrainingHistoryDetail
      session={session}
      timezone={profile.preferences.timezone}
      unitSystem={profile.preferences.unitSystem}
    />
  );
}
