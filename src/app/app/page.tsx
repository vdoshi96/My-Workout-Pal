import { getDatabase } from "@/db/client";
import type { Database } from "@/db/client";
import { MemberProgramHome } from "@/components/program/member-program-home";
import { OnboardingForm } from "@/components/program/onboarding-form";
import { getCurrentViewer } from "@/server/auth/viewer";
import {
  getViewerProfileProgram,
  RepositoryNotFoundError,
} from "@/server/repositories/profile-program";
import { listApprovedCuratedVideoPairsByExerciseIds, listApprovedCuratedVideoPairsBySlugs } from "@/server/repositories/curated-videos";
import { APPROVED_DEMO_SLUGS } from "@/domain/programs/generate-routine";
import { loadProgressInsights } from "@/server/repositories/training-insights";
import { createWorkoutRepository } from "@/server/repositories/workout-repository";

export const metadata = { title: "Today" };

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

export default async function MemberHomePage({ searchParams }: Readonly<{ searchParams: Promise<{ day?: string | string[] }> }>) {
  const viewer = await getCurrentViewer();
  if (!viewer) return null;
  const database = getDatabase();
  const model = await readProfileProgramOrUndefined(database, viewer);
  if (!model?.activeProgram) {
    const demos = await listApprovedCuratedVideoPairsBySlugs(database, [...APPROVED_DEMO_SLUGS]).catch(() => ({}));
    return <OnboardingForm canMutate={viewer.eligibleForPermanentMutations} demos={demos} displayName={viewer.displayName} />;
  }
  const { day } = await searchParams;
  const initialDayKey = typeof day === "string" ? day : null;
  const catalogExerciseIds = model.activeProgram.days.flatMap((day) =>
    day.prescriptions.flatMap((prescription) => prescription.catalogExerciseId ? [prescription.catalogExerciseId] : []));
  const [progress, resumableWorkout, demos] = await Promise.all([
    loadProgressInsights(database, viewer),
    createWorkoutRepository(database).findResumable(viewer),
    listApprovedCuratedVideoPairsByExerciseIds(database, catalogExerciseIds).catch(() => ({})),
  ]);
  return (
    <MemberProgramHome
      demos={demos}
      initialDayKey={initialDayKey}
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
