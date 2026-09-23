"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  compatibleWorkoutSubstitutions,
  recoverOwnedWorkoutState,
  workoutReauthenticationHref,
} from "@/client/owned-workout";
import { privateApiMutation } from "@/client/private-api";
import {
  createIndexedDBRunnerStorage,
  createRunnerStorageBroadcast,
  runnerStorageNamespaceDigest,
} from "@/client/runner-storage";
import { createWorkoutRunnerSubmitter } from "@/client/workout-api";
import { WorkoutRunner } from "@/components/workout/workout-runner";
import {
  createRunnerWriterIdentity,
  loadRunnerState,
  runnerStorageKey,
  type ActiveWorkoutState,
  type ExerciseSubstitution,
} from "@/domain/workout-runner";
import type { RunnerUnitSystem } from "@/components/workout/workout-runner-presenters";
import type { CuratedVideos } from "@/domain/youtube/embed";

type RecoveryState =
  | Readonly<{ status: "loading" }>
  | Readonly<{ status: "blocked"; message: string }>
  | Readonly<{ status: "ready"; state: ActiveWorkoutState }>;

export function OwnedWorkoutRunner({
  curatedVideosByExerciseId,
  effectiveExerciseIdBySnapshot,
  initialState,
  substitutionCandidates,
  unitSystem,
}: Readonly<{
  curatedVideosByExerciseId: Readonly<Record<string, CuratedVideos>>;
  effectiveExerciseIdBySnapshot: Readonly<Record<string, string>>;
  initialState: ActiveWorkoutState;
  substitutionCandidates: readonly ExerciseSubstitution[];
  unitSystem: RunnerUnitSystem;
}>) {
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);
  const savedVersionDialog = useRef<HTMLDialogElement>(null);
  const [recovery, setRecovery] = useState<RecoveryState>({
    status: "loading",
  });
  const ownerUid = initialState.snapshot.ownerUid;
  const sessionId = initialState.snapshot.sessionId;
  const [writerId] = useState(() => createRunnerWriterIdentity());
  const [storageBroadcast] = useState(() => createRunnerStorageBroadcast());
  const storage = useMemo(
    () =>
      createIndexedDBRunnerStorage({
        ownerUid,
        writerId,
        ...(storageBroadcast === undefined
          ? {}
          : { notify: storageBroadcast.publish }),
      }),
    [ownerUid, storageBroadcast, writerId],
  );
  const storageUpdates = useMemo(() => {
    if (storageBroadcast === undefined) return undefined;
    const namespaceDigest = runnerStorageNamespaceDigest(ownerUid, sessionId);
    return {
      subscribe(listener: () => void) {
        return storageBroadcast.subscribe((notification) => {
          if (
            notification.namespaceDigest === namespaceDigest &&
            notification.writerId !== writerId
          ) {
            listener();
          }
        });
      },
    };
  }, [ownerUid, sessionId, storageBroadcast, writerId]);
  const broadcastLifecycle = useRef(0);
  const submitter = useMemo(
    () => createWorkoutRunnerSubmitter(privateApiMutation),
    [],
  );

  useEffect(() => {
    broadcastLifecycle.current += 1;
    return () => {
      broadcastLifecycle.current += 1;
      const closingGeneration = broadcastLifecycle.current;
      queueMicrotask(() => {
        if (broadcastLifecycle.current === closingGeneration) {
          storageBroadcast?.close();
        }
      });
    };
  }, [storageBroadcast]);

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
          console.error("Workout recovery failed", error);
          setRecovery({ status: "blocked", message: "Your logged sets are still on this device." });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [attempt, initialState, ownerUid, sessionId, storage]);

  function openTerminalHistory() {
    router.push(`/app/history/${encodeURIComponent(sessionId)}`);
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
        <h1 id="runner-recovery-title">Opening your workout…</h1>
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
        <h1 id="runner-recovery-title">{"We couldn't open this workout"}</h1>
        <p>Your logged sets are still on this device.</p>
        <div>
          <button className="primary-action" onClick={retryRecovery} type="button">Try again</button>
          <button className="secondary-action" onClick={() => savedVersionDialog.current?.showModal()} type="button">Use the version saved to your account</button>
          <Link href="/app">Back to Today</Link>
        </div>
        <dialog className="account-delete-dialog" ref={savedVersionDialog} aria-labelledby="runner-saved-version-title">
          <h2 id="runner-saved-version-title">Use the saved version?</h2>
          <p>Changes that only exist on this device will be removed.</p>
          <button className="primary-action" type="button" onClick={async () => {
            try { await storage.remove(runnerStorageKey(ownerUid, sessionId)); window.location.reload(); }
            catch (error) { console.error("Workout recovery cleanup failed", error); savedVersionDialog.current?.close(); }
          }}>Use saved version</button>
          <button className="secondary-action" type="button" onClick={() => savedVersionDialog.current?.close()}>Cancel</button>
        </dialog>
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
      reauthenticationHref={workoutReauthenticationHref(sessionId)}
      storage={storage}
      {...(storageUpdates === undefined ? {} : { storageUpdates })}
      submitter={submitter}
      title={initialState.snapshot.dayName}
      unitSystem={unitSystem}
    />
  );
}
