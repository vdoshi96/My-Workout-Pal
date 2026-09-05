import { getDatabase } from "@/db/client";
import type { Database } from "@/db/client";
import { MemberProgramHome } from "@/components/program/member-program-home";
import { OnboardingForm } from "@/components/program/onboarding-form";
import { getCurrentViewer } from "@/server/auth/viewer";
import {
  getViewerProfileProgram,
  RepositoryNotFoundError,
} from "@/server/repositories/profile-program";
import { loadProgressInsights } from "@/server/repositories/training-insights";
import { createWorkoutRepository } from "@/server/repositories/workout-repository";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function readProfileProgramOrUndefined(
  database: Database,
  viewer: NonNullable<Awaited<ReturnType<typeof getCurrentViewer>>>,
) {
  try {
    return await getViewerProfileProgram(database, viewer);
  } catch (error) {
    if (error instanceof RepositoryNotFoundError) return undefined;
    throw error;
  }
}

export default async function MemberHomePage() {
  const viewer = await getCurrentViewer();
  if (!viewer) return null;
  const database = getDatabase();
  const model = await readProfileProgramOrUndefined(database, viewer);
  if (!model?.activeProgram) {
    return <OnboardingForm canMutate={viewer.eligibleForPermanentMutations} />;
  }
  const [progress, resumableWorkout] = await Promise.all([
    loadProgressInsights(database, viewer),
    createWorkoutRepository(database).findResumable(viewer),
  ]);
  return (
    <MemberProgramHome
      canMutate={viewer.eligibleForPermanentMutations}
      displayName={viewer.displayName}
      initialProgram={model.activeProgram}
      progress={{
        completedSessions: progress.totals.completedSessions,
        completedWorkSets: progress.totals.completedWorkSets,
        repetitions: progress.totals.repetitions,
        distanceMeters: progress.totals.distanceMeters,
        durationSeconds: progress.totals.durationSeconds,
        unitSystem: progress.preferences.unitSystem,
        volumeKg: progress.totals.volumeKg,
      }}
      resumableWorkout={resumableWorkout ? {
        dayName: resumableWorkout.session.dayName,
        sessionId: resumableWorkout.session.id,
        state: resumableWorkout.session.state as "active" | "completing" | "draft",
      } : null}
    />
  );
}
