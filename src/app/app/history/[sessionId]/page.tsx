import { notFound, redirect } from "next/navigation";

import { TrainingHistoryDetail } from "@/components/insights/training-history-detail";
import { recordsFromSession } from "@/components/insights/training-insights-presenters";
import { getDatabase } from "@/db/client";
import { fromParam, resolveBackTarget } from "@/domain/navigation/back-target";
import { getCurrentViewer } from "@/server/auth/viewer";
import {
  getViewerProfileProgram,
  RepositoryNotFoundError,
} from "@/server/repositories/profile-program";
import {
  loadPersonalRecords,
  loadTrainingSession,
  TrainingInsightsRepositoryError,
} from "@/server/repositories/training-insights";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = Readonly<{
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ done?: string | string[]; from?: string | string[] }>;
}>;

async function loadHistoryDetailData(
  viewer: NonNullable<Awaited<ReturnType<typeof getCurrentViewer>>>,
  sessionId: string,
  celebrating: boolean,
) {
  const database = getDatabase();
  try {
    const [profile, session, records] = await Promise.all([
      getViewerProfileProgram(database, viewer),
      loadTrainingSession(database, viewer, sessionId),
      celebrating ? loadPersonalRecords(database, viewer) : Promise.resolve([]),
    ]);
    if (!profile.activeProgram) redirect("/app");
    return { profile, records, session };
  } catch (error) {
    if (error instanceof RepositoryNotFoundError) redirect("/app");
    if (error instanceof TrainingInsightsRepositoryError && (error.code === "not_found" || error.code === "invalid_request")) {
      notFound();
    }
    throw error;
  }
}

export async function generateMetadata({ params }: Readonly<{ params: Promise<{ sessionId: string }> }>) {
  const viewer = await getCurrentViewer();
  if (!viewer) return { title: "Workout" };
  try { const session = await loadTrainingSession(getDatabase(), viewer, (await params).sessionId); return { title: `${session.dayName} workout` }; }
  catch { return { title: "Workout" }; }
}

export default async function TrainingHistoryDetailPage({ params, searchParams }: PageProps) {
  const viewer = await getCurrentViewer();
  if (!viewer) return null;
  const [{ sessionId }, query] = await Promise.all([params, searchParams]);
  // `done=1` is set when the runner finishes a workout; it only adds the celebration and never affects the way back.
  const celebrating = (Array.isArray(query.done) ? query.done[0] : query.done) === "1";
  const { profile, records, session } = await loadHistoryDetailData(viewer, sessionId, celebrating);
  const { timezone, unitSystem } = profile.preferences;
  const back = resolveBackTarget(fromParam(query.from), {
    area: "member",
    fallback: { href: "/app/history", label: "Back to History" },
  });

  return (
    <TrainingHistoryDetail
      back={back}
      celebration={celebrating && session.state === "completed" ? { records: recordsFromSession(records, session.id) } : undefined}
      session={session}
      timezone={timezone}
      unitSystem={unitSystem}
    />
  );
}
