import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { OwnedWorkoutRunner } from "@/components/workout/owned-workout-runner";
import { getDatabase } from "@/db/client";
import { hydrateWorkoutResumeState } from "@/domain/workout-resume";
import { getCurrentViewer } from "@/server/auth/viewer";
import { listCustomExercises } from "@/server/repositories/custom-exercises";
import { getViewerProfileProgram } from "@/server/repositories/profile-program";
import {
  createWorkoutRepository,
  WorkoutRepositoryError,
} from "@/server/repositories/workout-repository";
import { listApprovedCuratedVideoPairsByExerciseIds } from "@/server/repositories/curated-videos";
import {
  buildWorkoutRouteCandidates,
  effectiveWorkoutExerciseIds,
} from "@/server/workout-route-model";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function loadOwnedWorkoutData(
  database: ReturnType<typeof getDatabase>,
  viewer: NonNullable<Awaited<ReturnType<typeof getCurrentViewer>>>,
  sessionId: string,
) {
  try {
    const [resume, profileProgram, customExercises] = await Promise.all([
      createWorkoutRepository(database).loadResume(viewer, { sessionId }),
      getViewerProfileProgram(database, viewer),
      listCustomExercises(database, viewer),
    ]);
    const effectiveIds = effectiveWorkoutExerciseIds(resume.exerciseStates);
    const curatedVideosByExerciseId = await listApprovedCuratedVideoPairsByExerciseIds(
      database,
      Object.values(effectiveIds),
    ).catch(() => ({}));
    return {
      resume,
      profileProgram,
      customExercises,
      effectiveIds,
      curatedVideosByExerciseId,
    };
  } catch (error) {
    if (
      error instanceof WorkoutRepositoryError &&
      (error.code === "not_found" || error.code === "invalid_request")
    ) {
      notFound();
    }
    throw error;
  }
}

export default async function OwnedWorkoutPage({
  params,
}: Readonly<{ params: Promise<{ sessionId: string }> }>) {
  const [{ sessionId }, viewer] = await Promise.all([
    params,
    getCurrentViewer(),
  ]);
  if (!viewer) {
    const returnTo = `/workout/${encodeURIComponent(sessionId)}`;
    redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  }

  const returnTo = `/workout/${encodeURIComponent(sessionId)}`;

  const {
    resume,
    profileProgram,
    customExercises,
    effectiveIds,
    curatedVideosByExerciseId,
  } =
    await loadOwnedWorkoutData(getDatabase(), viewer, sessionId);
  const initialState = hydrateWorkoutResumeState(resume);

  return (
    <div className="owned-workout-route">
      <a className="skip-link" href="#runner-title">Skip to active workout</a>
      <header className="owned-workout-route-bar">
        <Link href="/app">Back to Today</Link>
        <span>{resume.session.dayName}</span>
      </header>
      <main>
        {viewer.eligibleForPermanentMutations ? (
          <OwnedWorkoutRunner
            curatedVideosByExerciseId={curatedVideosByExerciseId}
            effectiveExerciseIdBySnapshot={effectiveIds}
            initialState={initialState}
            substitutionCandidates={buildWorkoutRouteCandidates(
              resume.snapshot.equipmentProfileKind ?? profileProgram.equipment.profileKind,
              customExercises,
              resume.snapshot.availableEquipment,
            )}
            unitSystem={profileProgram.preferences.unitSystem}
          />
        ) : (
          <section
            aria-labelledby="workout-verification-title"
            className="owned-runner-recovery owned-runner-recovery--blocked"
          >
            <span className="eyebrow">Read-only account</span>
            <h1 id="workout-verification-title">Verify before editing this workout</h1>
            <p>The immutable snapshot remains saved. Verify your email, then sign in again as the same account to continue syncing the device draft.</p>
            <Link
              className="primary-action"
              href={`/sign-in?returnTo=${encodeURIComponent(returnTo)}`}
            >
              Return to sign in
            </Link>
          </section>
        )}
      </main>
    </div>
  );
}
