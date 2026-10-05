import { loadTrainingSession, TrainingInsightsRepositoryError } from "@/server/repositories/training-insights";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { BackLink } from "@/components/navigation/back-link";
import { NavigationTracker } from "@/components/navigation/navigation-tracker";
import { SceneStage } from "@/components/ui/scene-stage";
import { OwnedWorkoutRunner } from "@/components/workout/owned-workout-runner";
import { withFrom } from "@/domain/navigation/back-target";
import { memberGuideHrefsByExerciseId } from "@/server/read-models/approved-demos";
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
    const substitutionCandidates = buildWorkoutRouteCandidates(
      resume.snapshot.equipmentProfileKind ?? profileProgram.equipment.profileKind,
      customExercises,
      resume.snapshot.availableEquipment,
    );
    const guideHrefByExerciseId = memberGuideHrefsByExerciseId(
      [...Object.values(effectiveIds), ...substitutionCandidates.map(({ id }) => id)],
      customExercises.map(({ id }) => id),
    );
    return {
      resume,
      profileProgram,
      effectiveIds,
      curatedVideosByExerciseId,
      guideHrefByExerciseId,
      substitutionCandidates,
    };
  } catch (error) {
    if (
      error instanceof WorkoutRepositoryError &&
      (error.code === "not_found" || error.code === "invalid_request")
    ) {
      if (error.code === "not_found") {
        const session = await loadTrainingSession(database, viewer, sessionId).catch((historyError: unknown) => {
          if (historyError instanceof TrainingInsightsRepositoryError && historyError.code === "not_found") return undefined;
          throw historyError;
        });
        if (session) redirect(withFrom(`/app/history/${sessionId}`, "/app"));
      }
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
    effectiveIds,
    curatedVideosByExerciseId,
    guideHrefByExerciseId,
    substitutionCandidates,
  } =
    await loadOwnedWorkoutData(getDatabase(), viewer, sessionId);
  const initialState = hydrateWorkoutResumeState(resume);

  return (
    <div className="owned-workout-route">
      <a className="skip-link" href="#runner-title">Skip to active workout</a>
      {/* The studio belongs to an editable workout; the read-only screen stays plain. */}
      {viewer.eligibleForPermanentMutations ? <SceneStage scene="workout" /> : null}
      <header className="pal-run-bar">
        <BackLink target={{ href: "/app", label: "Back to Today" }} />
      </header>
      <main>
        {viewer.eligibleForPermanentMutations ? (
          <OwnedWorkoutRunner
            curatedVideosByExerciseId={curatedVideosByExerciseId}
            effectiveExerciseIdBySnapshot={effectiveIds}
            guideHrefByExerciseId={guideHrefByExerciseId}
            initialState={initialState}
            substitutionCandidates={substitutionCandidates}
            unitSystem={profileProgram.preferences.unitSystem}
          />
        ) : (
          <section
            aria-labelledby="workout-verification-title"
            className="status-page pal-run-recovery"
          >
            <span className="pal-tag">Read-only account</span>
            <h1 id="workout-verification-title">Verify before editing this workout</h1>
            <p>Verify your email, then sign in again to continue this workout.</p>
            <Link
              className="primary-action"
              href={`/sign-in?returnTo=${encodeURIComponent(returnTo)}`}
            >
              Return to sign in
            </Link>
          </section>
        )}
      </main>
      <NavigationTracker />
    </div>
  );
}
