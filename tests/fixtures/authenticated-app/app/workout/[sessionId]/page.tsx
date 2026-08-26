import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { OwnedWorkoutRunner } from "@/components/workout/owned-workout-runner";
import { hydrateWorkoutResumeState } from "@/domain/workout-resume";
import { listApprovedCuratedVideoPairsByExerciseIds } from "@/server/repositories/curated-videos";
import { listCustomExercises } from "@/server/repositories/custom-exercises";
import { getViewerProfileProgram } from "@/server/repositories/profile-program";
import {
  createWorkoutRepository,
  WorkoutRepositoryError,
} from "@/server/repositories/workout-repository";
import {
  buildWorkoutRouteCandidates,
  effectiveWorkoutExerciseIds,
} from "@/server/workout-route-model";
import { getHarnessDatabase } from "../../../server/database";
import { harnessRequestContext } from "../../../server/harness-context";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function loadHarnessWorkout(
  scope: string,
  viewer: NonNullable<ReturnType<typeof harnessRequestContext>["viewer"]>,
  sessionId: string,
) {
  const { database } = await getHarnessDatabase(scope);
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
      curatedVideosByExerciseId,
      customExercises,
      effectiveIds,
      initialState: hydrateWorkoutResumeState(resume),
      profileProgram,
      resume,
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

export default async function HarnessOwnedWorkoutPage({
  params,
}: Readonly<{ params: Promise<{ sessionId: string }> }>) {
  const [{ sessionId }, context] = await Promise.all([
    params,
    headers().then(harnessRequestContext),
  ]);
  if (!context.viewer) return null;
  const {
    curatedVideosByExerciseId,
    customExercises,
    effectiveIds,
    initialState,
    profileProgram,
    resume,
  } = await loadHarnessWorkout(context.scope, context.viewer, sessionId);

  return (
    <div className="owned-workout-route">
      <a className="skip-link" href="#runner-title">
        Skip to active workout
      </a>
      <header className="owned-workout-route-bar">
        <Link href="/app">Exit to program</Link>
        <span>
          {resume.session.dayName} · revision {resume.session.programRevisionId.slice(0, 8)}
        </span>
      </header>
      {context.viewer.eligibleForPermanentMutations ? (
        <OwnedWorkoutRunner
          curatedVideosByExerciseId={curatedVideosByExerciseId}
          effectiveExerciseIdBySnapshot={effectiveIds}
          initialState={initialState}
          substitutionCandidates={buildWorkoutRouteCandidates(
            profileProgram.equipment.profileKind,
            customExercises,
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
          <p>The immutable snapshot remains saved. Verify your email before continuing.</p>
        </section>
      )}
    </div>
  );
}
