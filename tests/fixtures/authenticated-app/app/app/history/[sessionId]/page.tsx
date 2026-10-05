import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { TrainingHistoryDetail } from "@/components/insights/training-history-detail";
import { recordsFromSession } from "@/components/insights/training-insights-presenters";
import { getViewerProfileProgram } from "@/server/repositories/profile-program";
import { fromParam, resolveBackTarget } from "@/domain/navigation/back-target";
import {
  loadPersonalRecords,
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
  celebrating: boolean,
) {
  const { database } = await getHarnessDatabase(scope);
  try {
    const [profile, session, records] = await Promise.all([
      getViewerProfileProgram(database, viewer),
      loadTrainingSession(database, viewer, sessionId),
      celebrating ? loadPersonalRecords(database, viewer) : Promise.resolve([]),
    ]);
    return { profile, records, session };
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

export async function generateMetadata({ params }: Readonly<{ params: Promise<{ sessionId: string }> }>) {
  const context = harnessRequestContext(await headers());
  if (!context.viewer) return { title: "Workout" };
  const { database } = await getHarnessDatabase(context.scope);
  try { const session = await loadTrainingSession(database, context.viewer, (await params).sessionId); return { title: `${session.dayName} workout` }; }
  catch { return { title: "Workout" }; }
}

export default async function HarnessHistoryDetailPage({
  params,
  searchParams,
}: Readonly<{ params: Promise<{ sessionId: string }>; searchParams: Promise<{ done?: string | string[]; from?: string | string[] }> }>) {
  const [{ sessionId }, query, context] = await Promise.all([
    params,
    searchParams,
    headers().then(harnessRequestContext),
  ]);
  if (!context.viewer) return null;
  // `done=1` is set when the runner finishes a workout; it only adds the celebration and never affects the way back.
  const celebrating = (Array.isArray(query.done) ? query.done[0] : query.done) === "1";
  const { profile, records, session } = await loadHarnessHistory(
    context.scope,
    context.viewer,
    sessionId,
    celebrating,
  );
  const back = resolveBackTarget(fromParam(query.from), {
    area: "member",
    fallback: { href: "/app/history", label: "Back to History" },
  });
  return (
    <TrainingHistoryDetail
      back={back}
      celebration={celebrating && session.state === "completed" ? { records: recordsFromSession(records, session.id) } : undefined}
      session={session}
      timezone={profile.preferences.timezone}
      unitSystem={profile.preferences.unitSystem}
    />
  );
}
