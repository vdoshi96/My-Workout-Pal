import { describe, expect, it } from "vitest";

import {
  InMemoryRunnerStorage,
  createRunnerState,
  createSetDraft,
  createWorkoutSnapshot,
  getActiveSetDisplay,
  getRestTimerView,
  isNavigationBlocked,
  loadRunnerState,
  persistRunnerState,
  runnerReducer,
  stableIdempotencyKey,
  syncRunnerOperations,
  validateSetDraft,
  type ActiveWorkoutState,
  type RunnerOperation,
  type RunnerSnapshotInput,
} from "@/domain/workout-runner";

const snapshotInput: RunnerSnapshotInput = {
  sessionId: "session-1",
  ownerUid: "uid-a",
  programRevisionId: "program-revision-4",
  dayId: "day-pull",
  dayName: "Pull",
  exercises: [
    {
      id: "exercise-row",
      name: "Chest-supported row",
      loggingKind: "weight_reps",
      sets: [
        {
          id: "row-warmup-1",
          position: 1,
          phase: "warmup",
          target: {
            kind: "weight_reps",
            targetWeightKg: 20,
            minimumReps: 8,
            maximumReps: 10,
            restSeconds: 45,
          },
          previous: { kind: "weight_reps", weightKg: 15, repetitions: 10 },
        },
        {
          id: "row-work-1",
          position: 2,
          phase: "work",
          target: {
            kind: "weight_reps",
            targetWeightKg: 32,
            minimumReps: 8,
            maximumReps: 12,
            restSeconds: 90,
          },
          previous: { kind: "weight_reps", weightKg: 30, repetitions: 10 },
        },
      ],
    },
    {
      id: "exercise-plank",
      name: "Side plank",
      loggingKind: "duration",
      sets: [
        {
          id: "plank-work-1",
          position: 1,
          phase: "work",
          target: {
            kind: "duration",
            minimumSeconds: 20,
            maximumSeconds: 45,
            restSeconds: 60,
          },
        },
      ],
    },
    {
      id: "exercise-run",
      name: "Easy run",
      loggingKind: "distance_duration",
      sets: [
        {
          id: "run-work-1",
          position: 1,
          phase: "work",
          target: {
            kind: "distance_duration",
            targetDistanceMeters: 2_000,
            targetDurationSeconds: 900,
            restSeconds: 0,
          },
        },
      ],
    },
  ],
};

function makeState(now = 1_000): ActiveWorkoutState {
  return createRunnerState(createWorkoutSnapshot(snapshotInput), { now });
}

function operation(
  state: ActiveWorkoutState,
  kind: RunnerOperation["kind"],
): RunnerOperation {
  const found = [...state.operations]
    .reverse()
    .find((item) => item.kind === kind);
  if (!found) throw new Error(`missing ${kind} operation`);
  return found;
}

describe("active workout snapshot and navigation", () => {
  it("takes an immutable snapshot copy and exposes current target plus previous value", () => {
    const input = structuredClone(snapshotInput);
    const snapshot = createWorkoutSnapshot(input);
    const state = createRunnerState(snapshot);

    input.exercises[0]!.name = "changed outside runner";
    input.exercises[0]!.sets[0]!.target.targetWeightKg = 999;

    expect(state.snapshot.exercises[0]!.name).toBe("Chest-supported row");
    expect(state.snapshot.exercises[0]!.sets[0]!.target.targetWeightKg).toBe(
      20,
    );
    expect(Object.isFrozen(state.snapshot)).toBe(true);
    expect(getActiveSetDisplay(state)).toMatchObject({
      exerciseName: "Chest-supported row",
      phase: "warmup",
      previous: { weightKg: 15, repetitions: 10 },
      target: { targetWeightKg: 20, minimumReps: 8, maximumReps: 10 },
    });

    const nextSet = runnerReducer(state, { type: "navigate_set", index: 1 });
    expect(getActiveSetDisplay(nextSet)).toMatchObject({
      phase: "work",
      previous: { weightKg: 30 },
    });

    const nextExercise = runnerReducer(nextSet, {
      type: "navigate_exercise",
      index: 1,
    });
    expect(nextExercise.currentExerciseIndex).toBe(1);
    expect(nextExercise.currentSetIndex).toBe(0);
    expect(getActiveSetDisplay(nextExercise).target.kind).toBe("duration");
  });
});

describe("drafts, notes, and exercise transitions", () => {
  it("keeps measurement drafts kind-specific and records warm-up separately from work", () => {
    const initial = makeState();
    const warmup = runnerReducer(initial, {
      type: "update_set_draft",
      setId: "row-warmup-1",
      draft: { kind: "weight_reps", weightKg: 20, repetitions: 8 },
    });
    const savedWarmup = runnerReducer(warmup, {
      type: "save_set",
      setId: "row-warmup-1",
    });
    expect(operation(savedWarmup, "save_set").payload).toMatchObject({
      setId: "row-warmup-1",
      phase: "warmup",
      measurement: {
        kind: "weight_reps",
        weightKg: 20,
        repetitions: 8,
        isWarmup: true,
      },
    });

    const work = runnerReducer(savedWarmup, {
      type: "update_set_draft",
      setId: "row-work-1",
      draft: { kind: "weight_reps", weightKg: 32, repetitions: 12 },
    });
    const savedWork = runnerReducer(work, {
      type: "save_set",
      setId: "row-work-1",
    });
    expect(operation(savedWork, "save_set").payload).toMatchObject({
      setId: "row-work-1",
      phase: "work",
      measurement: { kind: "weight_reps", weightKg: 32, repetitions: 12 },
    });

    expect(() =>
      runnerReducer(savedWork, {
        type: "update_set_draft",
        setId: "plank-work-1",
        draft: { kind: "weight_reps", weightKg: 10, repetitions: 8 },
      }),
    ).toThrow(/duration/);
    expect(createSetDraft("distance_duration")).toEqual({
      kind: "distance_duration",
      distanceMeters: undefined,
      durationSeconds: undefined,
    });
    expect(
      validateSetDraft(
        { kind: "bodyweight_reps", repetitions: 12, addedWeightKg: 5 },
        "bodyweight_reps",
      ),
    ).toMatchObject({
      ok: true,
      measurement: {
        kind: "bodyweight_reps",
        repetitions: 12,
        addedWeightKg: 5,
      },
    });
    expect(
      validateSetDraft({ kind: "duration", durationSeconds: 45 }, "duration"),
    ).toMatchObject({
      ok: true,
      measurement: { kind: "duration", durationSeconds: 45 },
    });
    expect(
      validateSetDraft(
        {
          kind: "distance_duration",
          distanceMeters: 2_000,
          durationSeconds: 900,
        },
        "distance_duration",
      ),
    ).toMatchObject({
      ok: true,
      measurement: {
        kind: "distance_duration",
        distanceMeters: 2_000,
        durationSeconds: 900,
      },
    });
  });

  it("supports notes, skip, substitute, and complete exercise transitions", () => {
    let state = makeState();
    state = runnerReducer(state, {
      type: "update_note",
      exerciseId: "exercise-row",
      note: "Keep ribs down",
    });
    state = runnerReducer(state, {
      type: "save_note",
      exerciseId: "exercise-row",
    });
    expect(state.notesByExercise["exercise-row"]).toBe("Keep ribs down");
    expect(operation(state, "save_note").payload).toMatchObject({
      note: "Keep ribs down",
    });

    state = runnerReducer(state, {
      type: "skip_exercise",
      exerciseId: "exercise-plank",
      reason: "wrist discomfort",
    });
    expect(state.skippedExerciseIds).toContain("exercise-plank");

    state = runnerReducer(state, {
      type: "substitute_exercise",
      exerciseId: "exercise-run",
      replacement: {
        id: "exercise-bike",
        name: "Stationary bike",
        loggingKind: "duration",
      },
      reason: "equipment unavailable",
    });
    expect(state.substitutions["exercise-run"]).toMatchObject({
      id: "exercise-bike",
      loggingKind: "duration",
    });

    state = runnerReducer(state, {
      type: "update_set_draft",
      setId: "row-work-1",
      draft: { kind: "weight_reps", weightKg: 32, repetitions: 10 },
    });
    state = runnerReducer(state, { type: "save_set", setId: "row-work-1" });
    state = runnerReducer(state, {
      type: "complete_exercise",
      exerciseId: "exercise-row",
    });
    expect(state.completedExerciseIds).toContain("exercise-row");
  });
});

describe("rest timing and navigation protection", () => {
  it("stores timestamps and derives remaining time rather than ticking a counter", () => {
    const started = runnerReducer(makeState(10_000), {
      type: "start_rest",
      seconds: 90,
      now: 10_000,
    });
    expect(started.restTimer).toEqual({
      startedAt: 10_000,
      endsAt: 100_000,
      pausedAt: undefined,
    });
    expect(getRestTimerView(started, 10_050)).toMatchObject({
      status: "running",
      remainingSeconds: 90,
    });
    expect(getRestTimerView(started, 10_050).endsAt).toBe(100_000);

    const paused = runnerReducer(started, { type: "pause_rest", now: 10_020 });
    expect(paused.restTimer?.pausedAt).toBe(10_020);
    expect(getRestTimerView(paused, 10_050)).toMatchObject({
      status: "paused",
      remainingSeconds: 90,
    });

    const resumed = runnerReducer(paused, { type: "resume_rest", now: 10_050 });
    expect(resumed.restTimer?.endsAt).toBe(100_030);
    expect(getRestTimerView(resumed, 100_030).status).toBe("complete");
  });

  it("blocks leaving for dirty drafts and unsaved or failed operations", () => {
    const initial = makeState();
    expect(isNavigationBlocked(initial)).toBe(false);
    const dirty = runnerReducer(initial, {
      type: "update_set_draft",
      setId: "row-work-1",
      draft: { kind: "weight_reps", weightKg: 32, repetitions: 10 },
    });
    expect(isNavigationBlocked(dirty)).toBe(true);
    const queued = runnerReducer(dirty, {
      type: "save_set",
      setId: "row-work-1",
    });
    expect(isNavigationBlocked(queued)).toBe(true);
  });
});

describe("offline operation queue", () => {
  it("uses stable keys and suppresses repeated identical submits", () => {
    expect(stableIdempotencyKey({ b: 2, a: 1 })).toBe(
      stableIdempotencyKey({ a: 1, b: 2 }),
    );
    let state = makeState();
    state = runnerReducer(state, {
      type: "update_set_draft",
      setId: "row-work-1",
      draft: { kind: "weight_reps", weightKg: 32, repetitions: 10 },
    });
    state = runnerReducer(state, { type: "save_set", setId: "row-work-1" });
    state = runnerReducer(state, { type: "save_set", setId: "row-work-1" });
    expect(
      state.operations.filter(({ kind }) => kind === "save_set"),
    ).toHaveLength(1);
  });

  it("persists before submission, reconstructs after reload, and reconciles saved results", async () => {
    const storage = new InMemoryRunnerStorage();
    let state = makeState();
    state = runnerReducer(state, {
      type: "update_set_draft",
      setId: "row-work-1",
      draft: { kind: "weight_reps", weightKg: 32, repetitions: 10 },
    });
    state = runnerReducer(state, { type: "save_set", setId: "row-work-1" });
    await persistRunnerState(storage, state);
    const restored = await loadRunnerState(storage, {
      ownerUid: "uid-a",
      sessionId: "session-1",
      snapshot: createWorkoutSnapshot(snapshotInput),
    });
    expect(restored?.operations[0]?.status).toBe("pending");
    expect(restored?.drafts["row-work-1"]).toMatchObject({
      weightKg: 32,
      repetitions: 10,
    });

    const synced = await syncRunnerOperations(restored!, {
      storage,
      submit: async () => ({ status: "saved", persistedId: "log-1" }),
    });
    expect(synced.operations[0]).toMatchObject({
      status: "saved",
      persistedId: "log-1",
    });

    let submitCount = 0;
    const resubmitted = await syncRunnerOperations(synced, {
      storage,
      submit: async () => {
        submitCount += 1;
        return { status: "saved" };
      },
    });
    expect(submitCount).toBe(0);
    expect(resubmitted.operations[0]?.status).toBe("saved");
  });

  it("keeps an offline or expired-auth draft and retries failed operations without changing keys", async () => {
    const storage = new InMemoryRunnerStorage();
    let offline = runnerReducer(makeState(), {
      type: "set_connectivity",
      connectivity: "offline",
    });
    offline = runnerReducer(offline, {
      type: "update_set_draft",
      setId: "row-work-1",
      draft: { kind: "weight_reps", weightKg: 32, repetitions: 10 },
    });
    offline = runnerReducer(offline, { type: "save_set", setId: "row-work-1" });
    const offlineResult = await syncRunnerOperations(offline, {
      storage,
      submit: async () => ({ status: "saved" }),
    });
    expect(offlineResult.sync.status).toBe("offline");
    expect(offlineResult.operations[0]?.status).toBe("pending");

    const expired = runnerReducer(offlineResult, {
      type: "set_auth",
      auth: "expired",
    });
    const expiredResult = await syncRunnerOperations(expired, {
      storage,
      submit: async () => ({ status: "saved" }),
    });
    expect(expiredResult.sync.status).toBe("auth_expired");
    expect(expiredResult.operations[0]?.status).toBe("pending");

    const reconnected = runnerReducer(
      runnerReducer(expiredResult, { type: "set_auth", auth: "valid" }),
      { type: "set_connectivity", connectivity: "online" },
    );
    const failed = await syncRunnerOperations(reconnected, {
      storage,
      submit: async () => ({
        status: "failed",
        code: "server_unavailable",
        retryable: true,
      }),
    });
    expect(failed.operations[0]).toMatchObject({
      status: "failed",
      errorCode: "server_unavailable",
    });
    const key = failed.operations[0]!.idempotencyKey;
    const retried = runnerReducer(failed, {
      type: "retry_operation",
      idempotencyKey: key,
    });
    expect(retried.operations[0]).toMatchObject({
      status: "pending",
      idempotencyKey: key,
    });
  });

  it("does not submit later operations while an earlier operation is failed", async () => {
    const storage = new InMemoryRunnerStorage();
    let state = makeState();
    for (const [setId, repetitions] of [
      ["row-work-1", 10],
      ["row-warmup-1", 8],
    ] as const) {
      state = runnerReducer(state, {
        type: "update_set_draft",
        setId,
        draft: { kind: "weight_reps", weightKg: 32, repetitions },
      });
      state = runnerReducer(state, { type: "save_set", setId });
    }
    const submitted: string[] = [];
    const failed = await syncRunnerOperations(state, {
      storage,
      submit: async (item) => {
        submitted.push(item.idempotencyKey);
        return { status: "failed", code: "temporary_failure", retryable: true };
      },
    });
    expect(submitted).toHaveLength(1);
    expect(failed.operations[0]?.status).toBe("failed");
    expect(failed.operations[1]?.status).toBe("pending");
  });
});

describe("session completion", () => {
  it("does not complete until required work operations are confirmed", async () => {
    const storage = new InMemoryRunnerStorage();
    let state = makeState();
    state = runnerReducer(state, {
      type: "skip_exercise",
      exerciseId: "exercise-plank",
      reason: "not today",
    });
    state = runnerReducer(state, {
      type: "skip_exercise",
      exerciseId: "exercise-run",
      reason: "not today",
    });
    state = runnerReducer(state, {
      type: "update_set_draft",
      setId: "row-work-1",
      draft: { kind: "weight_reps", weightKg: 32, repetitions: 10 },
    });
    state = runnerReducer(state, { type: "save_set", setId: "row-work-1" });
    expect(() => runnerReducer(state, { type: "complete_session" })).toThrow(
      /confirmed/,
    );

    state = await syncRunnerOperations(state, {
      storage,
      submit: async () => ({ status: "saved" }),
    });
    state = runnerReducer(state, { type: "complete_session" });
    expect(state.status).toBe("completing");
    const completeKey = operation(state, "complete_session").idempotencyKey;
    expect(isNavigationBlocked(state)).toBe(true);

    state = await syncRunnerOperations(state, {
      storage,
      submit: async (item) =>
        item.idempotencyKey === completeKey
          ? { status: "saved", persistedId: "session-1" }
          : { status: "saved" },
    });
    expect(state.status).toBe("completed");
    expect(isNavigationBlocked(state)).toBe(false);
  });
});
