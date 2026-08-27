import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  createRunnerPersistenceQueue,
  reloadRunnerStateFromStorage,
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
  mergeRunnerStorageStates,
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

  it("adopts the committed cross-tab merge when no operation needs submission", async () => {
    const snapshot = createWorkoutSnapshot(snapshotInput);
    const storage = createInMemoryRunnerStorage();
    const initial = createRunnerState(snapshot, { now: 2_000 });
    const draft = runnerReducer(initial, {
      type: "update_set_draft",
      setId: "press-work-1",
      draft: { kind: "weight_reps", weightKg: 22.5, repetitions: 9 },
    });
    let confirmed = runnerReducer(draft, {
      type: "save_set",
      setId: "press-work-1",
      now: 2_001,
    });
    confirmed = runnerReducer(confirmed, {
      type: "operation_saved",
      idempotencyKey: confirmed.operations[0]!.idempotencyKey,
      now: 2_002,
    });
    await persistRunnerState(storage, confirmed);

    let submitted = false;
    const result = await runRunnerPersistenceCycle(initial, {
      storage,
      submitter: async () => {
        submitted = true;
        return { status: "saved", persistedId: "unexpected" };
      },
    });

    expect(submitted).toBe(false);
    expect(result?.loggedSets["press-work-1"]?.measurement).toMatchObject({
      weightKg: 22.5,
      repetitions: 9,
    });
    expect(result?.operations).toHaveLength(1);
    expect(result?.operations[0]?.status).toBe("saved");
  });

  it("re-reads a cross-tab commit without creating an identical render loop", async () => {
    const snapshot = createWorkoutSnapshot(snapshotInput);
    const storage = createInMemoryRunnerStorage();
    const initial = createRunnerState(snapshot, { now: 2_000 });
    const draft = runnerReducer(initial, {
      type: "update_set_draft",
      setId: "press-work-1",
      draft: { kind: "weight_reps", weightKg: 30, repetitions: 7 },
    });
    let otherTab = runnerReducer(draft, {
      type: "save_set",
      setId: "press-work-1",
      now: 2_001,
    });
    otherTab = runnerReducer(otherTab, {
      type: "set_connectivity",
      connectivity: "offline",
      now: 2_002,
    });
    await persistRunnerState(storage, otherTab);

    const adopted = await reloadRunnerStateFromStorage(
      initial,
      storage,
      () => "online",
    );
    expect(adopted).not.toBe(initial);
    expect(adopted.connectivity).toBe("online");
    expect(adopted.loggedSets["press-work-1"]?.measurement).toMatchObject({
      weightKg: 30,
      repetitions: 7,
    });

    const identical = await reloadRunnerStateFromStorage(
      adopted,
      storage,
      () => "online",
    );
    expect(identical).toBe(adopted);
  });

  it("renders target-specific choices for a durable local-tab conflict", () => {
    const snapshot = createWorkoutSnapshot(snapshotInput);
    const initial = createRunnerState(snapshot, { now: 2_000 });
    let first = runnerReducer(initial, {
      type: "update_set_draft",
      setId: "press-work-1",
      draft: { kind: "weight_reps", weightKg: 20, repetitions: 10 },
    });
    first = runnerReducer(first, {
      type: "save_set",
      setId: "press-work-1",
      now: 2_001,
    });
    let second = runnerReducer(initial, {
      type: "update_set_draft",
      setId: "press-work-1",
      draft: { kind: "weight_reps", weightKg: 25, repetitions: 8 },
    });
    second = runnerReducer(second, {
      type: "save_set",
      setId: "press-work-1",
      now: 2_002,
    });
    const conflicted = mergeRunnerStorageStates(first, second);

    const markup = renderToStaticMarkup(
      <WorkoutRunner
        initialState={conflicted}
        storage={createInMemoryRunnerStorage()}
        submitter={async () => ({ status: "saved", persistedId: "unused" })}
      />,
    );

    expect(markup).toContain("Choose the workout value to keep");
    expect(markup).toContain("Set 1 · Floor press");
    expect(markup).toContain(
      'aria-label="Keep 20 kg · 10 reps for Set 1 · Floor press"',
    );
    expect(markup).toContain(
      'aria-label="Keep 25 kg · 8 reps for Set 1 · Floor press"',
    );
    expect(markup).toContain("Leave both values unresolved");
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

  it("renders bounded recovery actions for offline and authentication blockers", () => {
    const storage = createInMemoryRunnerStorage();
    const snapshot = createWorkoutSnapshot(snapshotInput);
    let blocked = createRunnerState(snapshot, { now: 3_000 });
    blocked = runnerReducer(blocked, {
      type: "set_connectivity",
      connectivity: "offline",
      now: 3_001,
    });
    blocked = runnerReducer(blocked, {
      type: "set_auth",
      auth: "expired",
      now: 3_002,
    });

    const markup = renderToStaticMarkup(
      <WorkoutRunner
        initialState={blocked}
        reauthenticationHref="/sign-in?returnTo=%2Fworkout%2Fsession-harness"
        storage={storage}
        submitter={async () => ({
          status: "saved",
          persistedId: "saved-after-recovery",
        })}
      />,
    );

    expect(markup).toContain("Retry connection");
    expect(markup).toContain("Reauthenticate and return");
    expect(markup).toContain(
      'href="/sign-in?returnTo=%2Fworkout%2Fsession-harness"',
    );
    expect(markup).toContain('aria-labelledby="runner-auth-blocked-title"');
    expect(markup).toContain('tabindex="-1"');

    const revokedMarkup = renderToStaticMarkup(
      <WorkoutRunner
        initialState={runnerReducer(blocked, {
          type: "set_auth",
          auth: "revoked",
          now: 3_003,
        })}
        reauthenticationHref="/sign-in?returnTo=%2Fworkout%2Fsession-harness"
        storage={storage}
        submitter={async () => ({
          status: "saved",
          persistedId: "saved-after-reauthentication",
        })}
      />,
    );
    expect(revokedMarkup).toContain("Your sign-in was revoked");
    expect(revokedMarkup).toContain("Sign-in revoked");
  });
});
