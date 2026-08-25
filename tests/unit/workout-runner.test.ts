import { describe, expect, it } from "vitest";

import {
  InMemoryRunnerStorage,
  createCardioDraft,
  createRunnerState,
  createSetDraft,
  createWorkoutSnapshot,
  getActiveSetDisplay,
  getPendingOperations,
  getRestTimerView,
  isNavigationBlocked,
  loadRunnerState,
  persistRunnerState,
  runnerReducer,
  stableIdempotencyKey,
  syncRunnerOperations,
  validateCardioDraft,
  validateSetDraft,
  type ActiveWorkoutState,
  type RunnerOperation,
  type RunnerSnapshotInput,
  type WorkoutSetTargetInput,
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

const cardioSnapshotInput: RunnerSnapshotInput = {
  ...structuredClone(snapshotInput),
  cardioOptions: [
    {
      id: "cardio-walker",
      mode: "walker",
      targetDurationSeconds: 1_200,
      targetDistanceMeters: 1_500,
      targetInclinePercent: 2,
    },
    {
      id: "cardio-runner",
      mode: "runner",
      targetDurationSeconds: 900,
      targetDistanceMeters: 2_000,
    },
  ],
};

function makeCardioState(now = 1_000): ActiveWorkoutState {
  return createRunnerState(createWorkoutSnapshot(cardioSnapshotInput), { now });
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
    (
      input.exercises[0]!.sets[0]!.target as { targetWeightKg?: number }
    ).targetWeightKg = 999;

    expect(state.snapshot.exercises[0]!.name).toBe("Chest-supported row");
    const firstTarget = state.snapshot.exercises[0]!.sets[0]!.target;
    expect(firstTarget.kind).toBe("weight_reps");
    if (firstTarget.kind === "weight_reps")
      expect(firstTarget.targetWeightKg).toBe(20);
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

  it("normalizes set order and rejects strict target fields for another logging kind", () => {
    const input = structuredClone(snapshotInput);
    input.exercises[0]!.sets = [...input.exercises[0]!.sets].reverse();
    input.exercises[0]!.sets[0]!.position = 2;
    input.exercises[0]!.sets[1]!.position = 1;
    const normalized = createWorkoutSnapshot(input);
    expect(
      normalized.exercises[0]!.sets.map(({ id, position }) => ({
        id,
        position,
      })),
    ).toEqual([
      { id: "row-warmup-1", position: 1 },
      { id: "row-work-1", position: 2 },
    ]);

    expect(() =>
      createWorkoutSnapshot({
        ...snapshotInput,
        exercises: [
          {
            ...snapshotInput.exercises[0]!,
            sets: [
              {
                ...snapshotInput.exercises[0]!.sets[0]!,
                target: {
                  kind: "duration",
                  minimumSeconds: 20,
                  maximumSeconds: 40,
                  restSeconds: 30,
                },
              },
            ],
          },
        ],
      }),
    ).toThrow(/target kind/);
    expect(() =>
      createWorkoutSnapshot({
        ...snapshotInput,
        exercises: [
          {
            ...snapshotInput.exercises[0]!,
            sets: [
              {
                ...snapshotInput.exercises[0]!.sets[0]!,
                target: {
                  kind: "weight_reps",
                  restSeconds: 30,
                } as unknown as WorkoutSetTargetInput,
              },
            ],
          },
        ],
      }),
    ).toThrow(/minimumReps/);
    expect(() =>
      createWorkoutSnapshot({
        ...snapshotInput,
        exercises: [
          {
            ...snapshotInput.exercises[0]!,
            sets: [
              {
                ...snapshotInput.exercises[0]!.sets[0]!,
                target: {
                  kind: "weight_reps",
                  minimumReps: 8,
                  maximumReps: 10,
                  targetWeightKg: 20,
                  targetDistanceMeters: 2_000,
                  restSeconds: 30,
                } as unknown as WorkoutSetTargetInput,
              },
            ],
          },
        ],
      }),
    ).toThrow(/targetDistanceMeters/);
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
        loggingKind: "distance_duration",
      },
      reason: "equipment unavailable",
    });
    expect(state.substitutions["exercise-run"]).toMatchObject({
      id: "exercise-bike",
      loggingKind: "distance_duration",
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

  it("rejects incompatible substitutions and displays a compatible replacement name", () => {
    const state = makeState();
    expect(() =>
      runnerReducer(state, {
        type: "substitute_exercise",
        exerciseId: "exercise-run",
        replacement: {
          id: "exercise-bike",
          name: "Stationary bike",
          loggingKind: "duration",
        },
      }),
    ).toThrow(/logging kind/);

    const replaced = runnerReducer(state, {
      type: "substitute_exercise",
      exerciseId: "exercise-row",
      replacement: {
        id: "exercise-barbell-row",
        name: "Barbell row",
        loggingKind: "weight_reps",
      },
    });
    expect(getActiveSetDisplay(replaced).exerciseName).toBe("Barbell row");
  });

  it("validates cardio drafts and derives or preserves entered pace", () => {
    const empty = createCardioDraft("walker");
    expect(empty).toMatchObject({
      mode: "walker",
      durationSeconds: undefined,
      notes: "",
    });
    expect(validateCardioDraft(empty)).toMatchObject({ ok: false });
    expect(
      validateCardioDraft({
        mode: "runner",
        durationSeconds: 900,
        distanceMeters: 2_000,
        paceSecondsPerKilometer: undefined,
        paceSource: undefined,
        inclinePercent: 1,
        notes: "Easy effort",
      }),
    ).toMatchObject({
      ok: true,
      cardio: {
        durationSeconds: 900,
        distanceMeters: 2_000,
        paceSecondsPerKilometer: 450,
        paceSource: "derived",
        inclinePercent: 1,
        notes: "Easy effort",
      },
    });
    expect(
      validateCardioDraft({
        mode: "runner",
        durationSeconds: 900,
        distanceMeters: 2_000,
        paceSecondsPerKilometer: 420,
        paceSource: "entered",
        inclinePercent: undefined,
        notes: "",
      }),
    ).toMatchObject({
      ok: true,
      cardio: { paceSecondsPerKilometer: 420, paceSource: "entered" },
    });
  });
});

describe("durable operation identity and recovery", () => {
  it("uses a deterministic SHA-256 idempotency key contract", () => {
    const key = stableIdempotencyKey({ a: 1, b: 2 });
    expect(key).toMatch(/^mwp_sha256_[0-9a-f]{64}$/);
    expect(stableIdempotencyKey({})).toBe(
      "mwp_sha256_44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a",
    );
    expect(key).toBe(stableIdempotencyKey({ b: 2, a: 1 }));
    expect(key).not.toBe(stableIdempotencyKey({ a: 1, b: 3 }));
  });

  it("supersedes obsolete unsaved set saves but preserves saved corrections", async () => {
    const storage = new InMemoryRunnerStorage();
    let state = makeState();
    state = runnerReducer(state, {
      type: "update_set_draft",
      setId: "row-work-1",
      draft: { kind: "weight_reps", weightKg: 32, repetitions: 10 },
    });
    state = runnerReducer(state, { type: "save_set", setId: "row-work-1" });
    const firstKey = operation(state, "save_set").idempotencyKey;
    state = runnerReducer(state, {
      type: "update_set_draft",
      setId: "row-work-1",
      draft: { kind: "weight_reps", weightKg: 34, repetitions: 10 },
    });
    state = runnerReducer(state, { type: "save_set", setId: "row-work-1" });
    const secondKey = operation(state, "save_set").idempotencyKey;
    expect(secondKey).not.toBe(firstKey);
    expect(
      state.operations.find(({ idempotencyKey }) => idempotencyKey === firstKey)
        ?.status,
    ).toBe("superseded");
    expect(
      getPendingOperations(state).map(({ idempotencyKey }) => idempotencyKey),
    ).toEqual([secondKey]);

    const submitted: string[] = [];
    state = await syncRunnerOperations(state, {
      storage,
      submit: async ({ idempotencyKey }) => {
        submitted.push(idempotencyKey);
        return { status: "saved" };
      },
    });
    expect(submitted).toEqual([secondKey]);
    state = runnerReducer(state, {
      type: "update_set_draft",
      setId: "row-work-1",
      draft: { kind: "weight_reps", weightKg: 36, repetitions: 10 },
    });
    state = runnerReducer(state, { type: "save_set", setId: "row-work-1" });
    expect(
      state.operations.find(
        ({ idempotencyKey }) => idempotencyKey === secondKey,
      )?.status,
    ).toBe("saved");
  });

  it("persists conflict and non-retryable failure state and counts submit attempts only", async () => {
    const storage = new InMemoryRunnerStorage();
    let state = runnerReducer(makeState(), {
      type: "update_set_draft",
      setId: "row-work-1",
      draft: { kind: "weight_reps", weightKg: 32, repetitions: 10 },
    });
    state = runnerReducer(state, { type: "save_set", setId: "row-work-1" });
    const key = operation(state, "save_set").idempotencyKey;
    state = await syncRunnerOperations(state, {
      storage,
      submit: async () => ({
        status: "failed",
        code: "conflict",
        conflict: true,
        retryable: false,
      }),
    });
    expect(state.operations[0]).toMatchObject({
      status: "failed",
      attempts: 1,
      retryable: false,
      failureKind: "conflict",
    });
    expect(state.sync.status).toBe("conflict");
    expect(() =>
      runnerReducer(state, { type: "retry_operation", idempotencyKey: key }),
    ).toThrow(/retry/);
    expect(
      runnerReducer(
        runnerReducer(state, {
          type: "set_connectivity",
          connectivity: "offline",
        }),
        { type: "set_auth", auth: "expired" },
      ).sync.status,
    ).toBe("conflict");
    const restored = await loadRunnerState(storage, {
      ownerUid: "uid-a",
      sessionId: "session-1",
      snapshot: createWorkoutSnapshot(snapshotInput),
    });
    expect(restored?.sync.status).toBe("conflict");
    expect(restored?.operations[0]).toMatchObject({
      failureKind: "conflict",
      retryable: false,
    });

    const retryable = runnerReducer(state, {
      type: "operation_failed",
      idempotencyKey: key,
      errorCode: "temporary",
      retryable: true,
    });
    expect(retryable.operations[0]?.attempts).toBe(1);
    const retried = runnerReducer(retryable, {
      type: "retry_operation",
      idempotencyKey: key,
    });
    expect(retried.operations[0]?.attempts).toBe(1);
  });

  it("persists and refuses a non-retryable failure", async () => {
    const storage = new InMemoryRunnerStorage();
    let state = runnerReducer(makeState(), {
      type: "update_set_draft",
      setId: "row-work-1",
      draft: { kind: "weight_reps", weightKg: 32, repetitions: 10 },
    });
    state = runnerReducer(state, { type: "save_set", setId: "row-work-1" });
    const key = operation(state, "save_set").idempotencyKey;
    state = await syncRunnerOperations(state, {
      storage,
      submit: async () => ({
        status: "failed",
        code: "validation_error",
        retryable: false,
      }),
    });
    expect(state.operations[0]).toMatchObject({
      status: "failed",
      failureKind: "permanent",
      retryable: false,
      attempts: 1,
    });
    expect(() =>
      runnerReducer(state, { type: "retry_operation", idempotencyKey: key }),
    ).toThrow(/not retryable/);
    const restored = await loadRunnerState(storage, {
      ownerUid: "uid-a",
      sessionId: "session-1",
      snapshot: createWorkoutSnapshot(snapshotInput),
    });
    expect(restored?.sync.status).toBe("failed");
    expect(restored?.operations[0]?.failureKind).toBe("permanent");
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
      /Explicitly complete/,
    );

    state = await syncRunnerOperations(state, {
      storage,
      submit: async () => ({ status: "saved" }),
    });
    state = runnerReducer(state, {
      type: "complete_exercise",
      exerciseId: "exercise-row",
    });
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

  it("queues cardio logs with derived pace, resumes offline, and requires selected cardio", async () => {
    const storage = new InMemoryRunnerStorage();
    let state = makeCardioState();
    state = runnerReducer(state, { type: "select_cardio", mode: "runner" });
    state = runnerReducer(state, {
      type: "update_cardio_draft",
      draft: {
        mode: "runner",
        durationSeconds: 900,
        distanceMeters: 2_000,
        paceSecondsPerKilometer: undefined,
        paceSource: undefined,
        inclinePercent: 0,
        notes: "Steady",
      },
    });
    state = runnerReducer(state, { type: "save_cardio" });
    expect(operation(state, "save_cardio").payload).toMatchObject({
      cardio: {
        durationSeconds: 900,
        distanceMeters: 2_000,
        paceSecondsPerKilometer: 450,
        paceSource: "derived",
        notes: "Steady",
      },
    });
    state = runnerReducer(state, {
      type: "set_connectivity",
      connectivity: "offline",
    });
    const offline = await syncRunnerOperations(state, {
      storage,
      submit: async () => ({ status: "saved" }),
    });
    expect(
      offline.operations.find(({ kind }) => kind === "save_cardio")?.status,
    ).toBe("pending");
    state = await syncRunnerOperations(
      runnerReducer(offline, {
        type: "set_connectivity",
        connectivity: "online",
      }),
      { storage, submit: async () => ({ status: "saved" }) },
    );
    expect(state.loggedCardio?.cardio.paceSource).toBe("derived");

    state = runnerReducer(state, {
      type: "update_cardio_draft",
      draft: {
        mode: "runner",
        durationSeconds: 960,
        distanceMeters: 2_000,
        paceSecondsPerKilometer: undefined,
        paceSource: undefined,
        inclinePercent: 0,
        notes: "Longer steady effort",
      },
    });
    expect(state.loggedCardio).toBeUndefined();
    expect(() => runnerReducer(state, { type: "complete_session" })).toThrow(
      /required cardio/,
    );

    state = await syncRunnerOperations(state, {
      storage,
      submit: async () => ({ status: "saved" }),
    });
    state = runnerReducer(state, { type: "select_cardio", mode: "walker" });
    expect(state.loggedCardio).toBeUndefined();
    expect(() => runnerReducer(state, { type: "complete_session" })).toThrow(
      /required cardio/,
    );

    const missing = makeCardioState();
    expect(() => runnerReducer(missing, { type: "complete_session" })).toThrow(
      /required cardio/,
    );
  });

  it("abandons a session through a durable operation and protects navigation until saved", async () => {
    const storage = new InMemoryRunnerStorage();
    let state = runnerReducer(makeState(), {
      type: "abandon_session",
      reason: "Stopped early",
    });
    expect(state.status).toBe("abandoning");
    expect(state.operations.at(-1)).toMatchObject({
      kind: "abandon_session",
      status: "pending",
    });
    expect(isNavigationBlocked(state)).toBe(true);
    state = await syncRunnerOperations(state, {
      storage,
      submit: async () => ({ status: "saved", persistedId: "abandoned-1" }),
    });
    expect(state.status).toBe("abandoned");
    expect(isNavigationBlocked(state)).toBe(false);
  });
});
