import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  createRunnerPersistenceQueue,
  runRunnerPersistenceCycle,
  runnerSnapshotIdentity,
  runnerSnapshotRestoreKey,
  shouldResetRunnerSnapshot,
  WorkoutRunner,
} from "@/components/workout/workout-runner";
import {
  createInMemoryRunnerStorage,
  createRunnerState,
  createWorkoutSnapshot,
  persistRunnerState,
  runnerReducer,
  syncRunnerOperations,
  type ActiveWorkoutState,
  type RunnerSnapshotInput,
} from "@/domain/workout-runner";

const snapshotInput: RunnerSnapshotInput = {
  sessionId: "session-harness",
  ownerUid: "owner-harness",
  programRevisionId: "revision-harness",
  dayId: "push",
  dayName: "Push",
  exercises: [
    {
      id: "press",
      name: "Floor press",
      loggingKind: "weight_reps",
      sets: [
        {
          id: "press-work-1",
          position: 1,
          phase: "work",
          target: {
            kind: "weight_reps",
            minimumReps: 8,
            maximumReps: 12,
            targetWeightKg: 20,
            restSeconds: 60,
          },
        },
      ],
    },
  ],
  cardioOptions: [],
};

describe("WorkoutRunner injected boundary harness", () => {
  it("dispatches a set, persists it, syncs it, and renders the saved state", async () => {
    const snapshot = createWorkoutSnapshot(snapshotInput);
    const storage = createInMemoryRunnerStorage();
    const submitted: string[] = [];
    let state: ActiveWorkoutState = createRunnerState(snapshot, { now: 1_000 });

    state = runnerReducer(state, {
      type: "update_set_draft",
      setId: "press-work-1",
      draft: { kind: "weight_reps", weightKg: 20, repetitions: 10 },
    });
    state = runnerReducer(state, {
      type: "save_set",
      setId: "press-work-1",
      now: 1_002,
    });
    await persistRunnerState(storage, state);

    const synced = await syncRunnerOperations(state, {
      storage,
      submit: async (operation) => {
        submitted.push(operation.kind);
        return { status: "saved", persistedId: "log-harness" };
      },
      now: 1_003,
    });

    expect(submitted).toEqual(["save_set"]);
    expect(synced.operations[0]?.status).toBe("saved");
    expect(synced.loggedSets["press-work-1"]?.measurement).toMatchObject({
      weightKg: 20,
      repetitions: 10,
    });

    const markup = renderToStaticMarkup(
      <WorkoutRunner
        initialState={synced}
        storage={storage}
        submitter={async () => ({
          status: "duplicate",
          persistedId: "log-harness",
        })}
        unitSystem="metric"
      />,
    );
    expect(markup).toContain("Snapshot identity stays fixed");
    expect(markup).toContain('value="20"');
    expect(markup).toContain("20 kg · 8–12 reps");
    expect(markup).toContain("Saved");

    const imperialMarkup = renderToStaticMarkup(
      <WorkoutRunner
        initialState={synced}
        storage={storage}
        submitter={async () => ({
          status: "duplicate",
          persistedId: "log-harness",
        })}
        unitSystem="imperial"
      />,
    );
    expect(imperialMarkup).toContain('value="44.09"');
    expect(imperialMarkup).toContain("44.09 lb · 8–12 reps");
  });

  it("keeps a newer revision authoritative when an older submit is deferred", async () => {
    const snapshot = createWorkoutSnapshot(snapshotInput);
    const storage = createInMemoryRunnerStorage();
    const initial = createRunnerState(snapshot, { now: 2_000 });
    const firstDraft = runnerReducer(initial, {
      type: "update_set_draft",
      setId: "press-work-1",
      draft: { kind: "weight_reps", weightKg: 20, repetitions: 10 },
    });
    const firstState = runnerReducer(firstDraft, {
      type: "save_set",
      setId: "press-work-1",
      now: 2_001,
    });
    const newerDraft = runnerReducer(firstState, {
      type: "update_set_draft",
      setId: "press-work-1",
      draft: { kind: "weight_reps", weightKg: 25, repetitions: 8 },
    });
    const newerState = runnerReducer(newerDraft, {
      type: "save_set",
      setId: "press-work-1",
      now: 2_002,
    });

    let releaseFirstSubmit!: () => void;
    let firstSubmitStarted!: () => void;
    const firstSubmit = new Promise<void>((resolve) => {
      releaseFirstSubmit = resolve;
    });
    const firstStarted = new Promise<void>((resolve) => {
      firstSubmitStarted = resolve;
    });
    const submitted: string[] = [];
    const submitter = async (operation: (typeof firstState.operations)[number]) => {
      submitted.push(operation.idempotencyKey);
      if (submitted.length === 1) {
        firstSubmitStarted();
        await firstSubmit;
      }
      return { status: "saved" as const, persistedId: operation.idempotencyKey };
    };
    const queue = createRunnerPersistenceQueue();
    let firstResult: ActiveWorkoutState | undefined;
    let secondResult: ActiveWorkoutState | undefined;
    const first = queue.enqueue(async ({ isLatest, isCancelled }) => {
      firstResult = await runRunnerPersistenceCycle(
        firstState,
        { storage, submitter },
        () => isLatest() && !isCancelled(),
      );
    });
    await firstStarted;
    const second = queue.enqueue(async ({ isLatest, isCancelled }) => {
      secondResult = await runRunnerPersistenceCycle(
        newerState,
        { storage, submitter },
        () => isLatest() && !isCancelled(),
      );
    });
    // Simulate the component unmounting while the older remote request is in
    // flight. The newest local revision must still get its durable write.
    second.cancel();
    releaseFirstSubmit();
    await Promise.all([first.promise, second.promise]);

    expect(firstResult).toBeUndefined();
    expect(secondResult).toBeUndefined();
    expect(submitted).toHaveLength(1);
    const stored = await storage.load(
      "runner:owner-harness:session-harness",
    );
    expect(stored?.state.loggedSets["press-work-1"]?.measurement).toMatchObject({
      weightKg: 25,
      repetitions: 8,
    });
    expect(stored?.state.operations.at(-1)?.status).toBe("pending");
  });

  it("keys restoration by owner and session, not session alone", () => {
    const ownerA = runnerSnapshotIdentity({
      ownerUid: "owner-a",
      sessionId: "shared",
    });
    const ownerB = runnerSnapshotIdentity({
      ownerUid: "owner-b",
      sessionId: "shared",
    });
    expect(ownerA).not.toBe(ownerB);
    expect(shouldResetRunnerSnapshot(ownerA, ownerB, true, true)).toBe(true);
    expect(shouldResetRunnerSnapshot(ownerA, ownerA, false, true)).toBe(true);

    const snapshot = createWorkoutSnapshot(snapshotInput);
    const structurallyIdenticalSnapshot = structuredClone(snapshot);
    expect(runnerSnapshotRestoreKey(snapshot)).toBe(
      runnerSnapshotRestoreKey(structurallyIdenticalSnapshot),
    );
  });
});
