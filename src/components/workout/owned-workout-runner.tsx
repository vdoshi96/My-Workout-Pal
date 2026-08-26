"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  compatibleWorkoutSubstitutions,
  recoverOwnedWorkoutState,
} from "@/client/owned-workout";
import { privateApiMutation } from "@/client/private-api";
import { createIndexedDBRunnerStorage } from "@/client/runner-storage";
import { createWorkoutRunnerSubmitter } from "@/client/workout-api";
import { WorkoutRunner } from "@/components/workout/workout-runner";
import { RunnerResumeError } from "@/domain/workout-resume";
import {
  clearRunnerState,
  loadRunnerState,
  RunnerOwnershipError,
  RunnerStorageError,
  RunnerTransitionError,
  type ActiveWorkoutState,
  type ExerciseSubstitution,
} from "@/domain/workout-runner";
import type { RunnerUnitSystem } from "@/components/workout/workout-runner-presenters";
import type { CuratedVideoPair } from "@/domain/youtube/embed";

type RecoveryState =
  | Readonly<{ status: "loading" }>
  | Readonly<{ status: "blocked"; message: string }>
  | Readonly<{ status: "ready"; state: ActiveWorkoutState }>;

function recoveryErrorMessage(error: unknown): string {
  if (
    error instanceof RunnerResumeError ||
    error instanceof RunnerOwnershipError ||
    error instanceof RunnerStorageError ||
    error instanceof RunnerTransitionError
  ) {
    return error.message;
  }
  return "This device's workout draft could not be reconciled safely.";
}

export function OwnedWorkoutRunner({
  curatedVideosByExerciseId,
  effectiveExerciseIdBySnapshot,
  initialState,
  substitutionCandidates,
  unitSystem,
}: Readonly<{
  curatedVideosByExerciseId: Readonly<Record<string, CuratedVideoPair>>;
  effectiveExerciseIdBySnapshot: Readonly<Record<string, string>>;
  initialState: ActiveWorkoutState;
  substitutionCandidates: readonly ExerciseSubstitution[];
  unitSystem: RunnerUnitSystem;
}>) {
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);
  const [recovery, setRecovery] = useState<RecoveryState>({
    status: "loading",
  });
  const ownerUid = initialState.snapshot.ownerUid;
  const sessionId = initialState.snapshot.sessionId;
  const storage = useMemo(
    () => createIndexedDBRunnerStorage({ ownerUid }),
    [ownerUid],
  );
  const submitter = useMemo(
    () => createWorkoutRunnerSubmitter(privateApiMutation),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    void loadRunnerState(storage, {
      ownerUid,
      sessionId,
      snapshot: initialState.snapshot,
    })
      .then((local) => recoverOwnedWorkoutState(initialState, local))
      .then((state) => {
        if (!cancelled) setRecovery({ status: "ready", state });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setRecovery({
            status: "blocked",
            message: recoveryErrorMessage(error),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [attempt, initialState, ownerUid, sessionId, storage]);

  function openTerminalHistory() {
    void clearRunnerState(storage, ownerUid, sessionId).finally(() => {
      router.push(`/app/history/${encodeURIComponent(sessionId)}`);
    });
  }

  function retryRecovery() {
    setRecovery({ status: "loading" });
    setAttempt((value) => value + 1);
  }

  if (recovery.status === "loading") {
    return (
      <section
        aria-busy="true"
        aria-labelledby="runner-recovery-title"
        className="owned-runner-recovery"
        role="status"
      >
        <span className="eyebrow">Private recovery</span>
        <h1 id="runner-recovery-title">Reconciling saved workout</h1>
        <p>Checking the server snapshot and device draft for this account before editing begins.</p>
      </section>
    );
  }

  if (recovery.status === "blocked") {
    return (
      <section
        aria-labelledby="runner-recovery-title"
        className="owned-runner-recovery owned-runner-recovery--blocked"
        role="alert"
      >
        <span className="eyebrow">Recovery stopped</span>
        <h1 id="runner-recovery-title">Your local draft was not overwritten</h1>
        <p>{recovery.message}</p>
        <div>
          <button
            className="primary-action"
            onClick={retryRecovery}
            type="button"
          >
            Retry recovery
          </button>
          <button
            className="secondary-action"
            onClick={() => router.push("/app")}
            type="button"
          >
            Return to program
          </button>
        </div>
      </section>
    );
  }

  return (
    <WorkoutRunner
      curatedVideosByExerciseId={curatedVideosByExerciseId}
      effectiveExerciseIdBySnapshot={effectiveExerciseIdBySnapshot}
      getCompatibleSubstitutions={(exercise) =>
        compatibleWorkoutSubstitutions(
          exercise,
          substitutionCandidates,
          effectiveExerciseIdBySnapshot,
        )
      }
      initialState={recovery.state}
      onAbandon={openTerminalHistory}
      onComplete={openTerminalHistory}
      onNavigateAway={() => router.push("/app")}
      protectBeforeUnload
      storage={storage}
      submitter={submitter}
      title={initialState.snapshot.dayName}
      unitSystem={unitSystem}
    />
  );
}
