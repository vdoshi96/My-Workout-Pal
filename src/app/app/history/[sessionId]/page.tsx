import { notFound, redirect } from "next/navigation";

import { TrainingHistoryDetail } from "@/components/insights/training-history-detail";
import { getDatabase } from "@/db/client";
import { getCurrentViewer } from "@/server/auth/viewer";
import {
  getViewerProfileProgram,
  RepositoryNotFoundError,
} from "@/server/repositories/profile-program";
import {
  loadTrainingSession,
  TrainingInsightsRepositoryError,
} from "@/server/repositories/training-insights";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = Readonly<{ params: Promise<{ sessionId: string }> }>;

async function loadHistoryDetailData(
  viewer: NonNullable<Awaited<ReturnType<typeof getCurrentViewer>>>,
  sessionId: string,
) {
  const database = getDatabase();
  try {
    const [profile, session] = await Promise.all([
      getViewerProfileProgram(database, viewer),
      loadTrainingSession(database, viewer, sessionId),
    ]);
    if (!profile.activeProgram) redirect("/app");
    return { profile, session };
  } catch (error) {
    if (error instanceof RepositoryNotFoundError) redirect("/app");
    if (error instanceof TrainingInsightsRepositoryError && (error.code === "not_found" || error.code === "invalid_request")) {
      notFound();
    }
    throw error;
  }
}

export default async function TrainingHistoryDetailPage({ params }: PageProps) {
  const viewer = await getCurrentViewer();
  if (!viewer) return null;
  const { sessionId } = await params;
  const { profile, session } = await loadHistoryDetailData(viewer, sessionId);
  const { timezone, unitSystem } = profile.preferences;

  return (
    <TrainingHistoryDetail
      session={session}
      timezone={timezone}
      unitSystem={unitSystem}
    />
  );
}
