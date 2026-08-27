import { describe, expect, it } from "vitest";

import {
  InMemoryRunnerStorage,
  RunnerOwnershipError,
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
  runnerStorageKey,
  runnerStorageRecord,
  stableIdempotencyKey,
  syncRunnerOperations,
  validateCardioDraft,
  validateSetDraft,
  type ActiveWorkoutState,
  type RunnerOperation,
  type RunnerSnapshotInput,
  type RunnerStorageRecord,
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

async function makeCompletingState(
  storage: InMemoryRunnerStorage,
): Promise<ActiveWorkoutState> {
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
  state = await syncRunnerOperations(state, {
    storage,
    submit: async () => ({ status: "saved" }),
  });
  state = runnerReducer(state, {
    type: "complete_exercise",
    exerciseId: "exercise-row",
  });
  state = await syncRunnerOperations(state, {
    storage,
    submit: async () => ({ status: "saved" }),
  });
  return runnerReducer(state, { type: "complete_session" });
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

  it("rejects substitution after a set has been logged or queued", () => {
    let state = makeState();
    state = runnerReducer(state, {
      type: "update_set_draft",
      setId: "row-work-1",
      draft: { kind: "weight_reps", weightKg: 32, repetitions: 10 },
    });
    state = runnerReducer(state, { type: "save_set", setId: "row-work-1" });

    expect(() =>
      runnerReducer(state, {
        type: "substitute_exercise",
        exerciseId: "exercise-row",
        replacement: {
          id: "exercise-machine-row",
          name: "Machine row",
          loggingKind: "weight_reps",
        },
      }),
    ).toThrow(/substitution_after_logging|logged or queued/);
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
    expect(
      validateCardioDraft({
        mode: "runner",
        durationSeconds: 100,
        distanceMeters: 333.25,
        paceSecondsPerKilometer: undefined,
        paceSource: undefined,
        inclinePercent: undefined,
        notes: "Non-even ratio",
      }),
    ).toMatchObject({
      ok: true,
      cardio: { paceSecondsPerKilometer: 300, paceSource: "derived" },
    });
    expect(
      validateCardioDraft({
        mode: "runner",
        durationSeconds: 100.5,
        distanceMeters: 333,
        paceSecondsPerKilometer: 301.5,
        paceSource: "entered",
        inclinePercent: undefined,
        notes: "Fractional values",
      }),
    ).toMatchObject({ ok: false, issues: expect.arrayContaining([
      expect.stringMatching(/durationSeconds/),
      expect.stringMatching(/paceSecondsPerKilometer/),
    ]) });
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

  it("supersedes unsaved cardio and note corrections without discarding history", async () => {
    const storage = new InMemoryRunnerStorage();
    let cardio = makeCardioState();
    cardio = runnerReducer(cardio, { type: "select_cardio", mode: "runner" });
    cardio = runnerReducer(cardio, {
      type: "update_cardio_draft",
      draft: {
        mode: "runner",
        durationSeconds: 900,
        distanceMeters: 2_000,
        paceSecondsPerKilometer: undefined,
        paceSource: undefined,
        inclinePercent: 0,
        notes: "First",
      },
    });
    cardio = runnerReducer(cardio, { type: "save_cardio" });
    const firstCardioKey = operation(cardio, "save_cardio").idempotencyKey;
    cardio = runnerReducer(cardio, {
      type: "update_cardio_draft",
      draft: {
        mode: "runner",
        durationSeconds: 960,
        distanceMeters: 2_000,
        paceSecondsPerKilometer: undefined,
        paceSource: undefined,
        inclinePercent: 0,
        notes: "Second",
      },
    });
    cardio = runnerReducer(cardio, { type: "save_cardio" });
    const secondCardioKey = operation(cardio, "save_cardio").idempotencyKey;
    expect(
      cardio.operations.find(
        ({ idempotencyKey }) => idempotencyKey === firstCardioKey,
      )?.status,
    ).toBe("superseded");
    cardio = runnerReducer(cardio, {
      type: "operation_failed",
      idempotencyKey: secondCardioKey,
      errorCode: "conflict",
      conflict: true,
      retryable: false,
    });
    cardio = runnerReducer(cardio, {
      type: "update_cardio_draft",
      draft: {
        mode: "runner",
        durationSeconds: 1_020,
        distanceMeters: 2_000,
        paceSecondsPerKilometer: undefined,
        paceSource: undefined,
        inclinePercent: 0,
        notes: "Third",
      },
    });
    cardio = runnerReducer(cardio, { type: "save_cardio" });
    const thirdCardioKey = operation(cardio, "save_cardio").idempotencyKey;
    expect(
      cardio.operations.find(
        ({ idempotencyKey }) => idempotencyKey === secondCardioKey,
      )?.status,
    ).toBe("superseded");
    const cardioSubmitted: string[] = [];
    cardio = await syncRunnerOperations(cardio, {
      storage,
      submit: async ({ idempotencyKey }) => {
        cardioSubmitted.push(idempotencyKey);
        return { status: "saved" };
      },
    });
    expect(cardioSubmitted).toEqual([thirdCardioKey]);
    cardio = runnerReducer(cardio, {
      type: "update_cardio_draft",
      draft: {
        mode: "runner",
        durationSeconds: 1_080,
        distanceMeters: 2_000,
        paceSecondsPerKilometer: undefined,
        paceSource: undefined,
        inclinePercent: 0,
        notes: "Fourth",
      },
    });
    cardio = runnerReducer(cardio, { type: "save_cardio" });
    expect(
      cardio.operations.find(
        ({ idempotencyKey }) => idempotencyKey === thirdCardioKey,
      )?.status,
    ).toBe("saved");

    let notes = makeState();
    notes = runnerReducer(notes, {
      type: "update_note",
      exerciseId: "exercise-row",
      note: "First",
    });
    notes = runnerReducer(notes, {
      type: "save_note",
      exerciseId: "exercise-row",
    });
    const firstNoteKey = operation(notes, "save_note").idempotencyKey;
    notes = runnerReducer(notes, {
      type: "update_note",
      exerciseId: "exercise-row",
      note: "Second",
    });
    notes = runnerReducer(notes, {
      type: "save_note",
      exerciseId: "exercise-row",
    });
    const secondNoteKey = operation(notes, "save_note").idempotencyKey;
    expect(
      notes.operations.find(
        ({ idempotencyKey }) => idempotencyKey === firstNoteKey,
      )?.status,
    ).toBe("superseded");
    notes = runnerReducer(notes, {
      type: "operation_failed",
      idempotencyKey: secondNoteKey,
      errorCode: "conflict",
      conflict: true,
      retryable: false,
    });
    notes = runnerReducer(notes, {
      type: "update_note",
      exerciseId: "exercise-row",
      note: "Third",
    });
    notes = runnerReducer(notes, {
      type: "save_note",
      exerciseId: "exercise-row",
    });
    const thirdNoteKey = operation(notes, "save_note").idempotencyKey;
    expect(
      notes.operations.find(
        ({ idempotencyKey }) => idempotencyKey === secondNoteKey,
      )?.status,
    ).toBe("superseded");
    const noteSubmitted: string[] = [];
    notes = await syncRunnerOperations(notes, {
      storage,
      submit: async ({ idempotencyKey }) => {
        noteSubmitted.push(idempotencyKey);
        return { status: "saved" };
      },
    });
    expect(noteSubmitted).toEqual([thirdNoteKey]);
    notes = runnerReducer(notes, {
      type: "update_note",
      exerciseId: "exercise-row",
      note: "Fourth",
    });
    notes = runnerReducer(notes, {
      type: "save_note",
      exerciseId: "exercise-row",
    });
    expect(
      notes.operations.find(
        ({ idempotencyKey }) => idempotencyKey === thirdNoteKey,
      )?.status,
    ).toBe("saved");
  });

  it("ignores stale lifecycle callbacks and never resurrects closed operations", () => {
    let failed = runnerReducer(makeState(), {
      type: "update_set_draft",
      setId: "row-work-1",
      draft: { kind: "weight_reps", weightKg: 32, repetitions: 10 },
    });
    failed = runnerReducer(failed, { type: "save_set", setId: "row-work-1" });
    const failedKey = operation(failed, "save_set").idempotencyKey;
    failed = runnerReducer(failed, {
      type: "operation_failed",
      idempotencyKey: failedKey,
      errorCode: "conflict",
      conflict: true,
      retryable: false,
    });
    const conflicted = failed;
    expect(
      runnerReducer(conflicted, {
        type: "operation_failed",
        idempotencyKey: failedKey,
        errorCode: "stale",
        retryable: true,
      }),
    ).toBe(conflicted);
    expect(
      runnerReducer(conflicted, {
        type: "operation_saved",
        idempotencyKey: failedKey,
        persistedId: "stale-save",
      }),
    ).toBe(conflicted);

    let superseded = makeState();
    superseded = runnerReducer(superseded, {
      type: "update_set_draft",
      setId: "row-work-1",
      draft: { kind: "weight_reps", weightKg: 32, repetitions: 10 },
    });
    superseded = runnerReducer(superseded, {
      type: "save_set",
      setId: "row-work-1",
    });
    const supersededKey = operation(superseded, "save_set").idempotencyKey;
    superseded = runnerReducer(superseded, {
      type: "update_set_draft",
      setId: "row-work-1",
      draft: { kind: "weight_reps", weightKg: 34, repetitions: 10 },
    });
    superseded = runnerReducer(superseded, {
      type: "save_set",
      setId: "row-work-1",
    });
    expect(
      runnerReducer(superseded, {
        type: "operation_saved",
        idempotencyKey: supersededKey,
      }),
    ).toBe(superseded);
    expect(
      runnerReducer(superseded, {
        type: "operation_failed",
        idempotencyKey: supersededKey,
        errorCode: "stale",
      }),
    ).toBe(superseded);

    const saved = runnerReducer(makeState(), {
      type: "update_set_draft",
      setId: "row-work-1",
      draft: { kind: "weight_reps", weightKg: 32, repetitions: 10 },
    });
    const savedQueued = runnerReducer(saved, {
      type: "save_set",
      setId: "row-work-1",
    });
    const savedKey = operation(savedQueued, "save_set").idempotencyKey;
    const savedState = runnerReducer(savedQueued, {
      type: "operation_saved",
      idempotencyKey: savedKey,
      persistedId: "log-1",
    });
    expect(
      runnerReducer(savedState, {
        type: "operation_failed",
        idempotencyKey: savedKey,
        errorCode: "stale-failure",
        retryable: false,
      }),
    ).toBe(savedState);
    expect(
      runnerReducer(savedState, {
        type: "operation_saved",
        idempotencyKey: savedKey,
        persistedId: "stale-log",
      }),
    ).toBe(savedState);
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

    let retryable = runnerReducer(makeState(), {
      type: "update_set_draft",
      setId: "row-work-1",
      draft: { kind: "weight_reps", weightKg: 32, repetitions: 10 },
    });
    retryable = runnerReducer(retryable, {
      type: "save_set",
      setId: "row-work-1",
    });
    const retryableKey = operation(retryable, "save_set").idempotencyKey;
    retryable = runnerReducer(retryable, {
      type: "operation_attempted",
      idempotencyKey: retryableKey,
    });
    retryable = runnerReducer(retryable, {
      type: "operation_failed",
      idempotencyKey: retryableKey,
      errorCode: "temporary",
      retryable: true,
    });
    expect(retryable.operations[0]?.attempts).toBe(1);
    const retried = runnerReducer(retryable, {
      type: "retry_operation",
      idempotencyKey: retryableKey,
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

  it("rejects corrupt or mismatched persisted runner records", async () => {
    let persistedRecord: RunnerStorageRecord | undefined;
    const storage = {
      load: async () => persistedRecord,
      save: async (_key: string, record: RunnerStorageRecord) => {
        persistedRecord = record;
        return record.schemaVersion === 2
          ? record
          : runnerStorageRecord(record.state);
      },
      remove: async () => {
        persistedRecord = undefined;
      },
    };
    const state = makeState();
    const snapshot = createWorkoutSnapshot(snapshotInput);
    const options = {
      ownerUid: "uid-a",
      sessionId: "session-1",
      snapshot,
    };
    const record = runnerStorageRecord(state);
    const load = () => loadRunnerState(storage, options);

    persistedRecord = {
      ...record,
      schemaVersion: 3,
    } as unknown as RunnerStorageRecord;
    await expect(load()).rejects.toMatchObject({ code: "corrupt_storage" });

    persistedRecord = {
      ...record,
      key: runnerStorageKey("uid-a", "session-other"),
    } as RunnerStorageRecord;
    await expect(load()).rejects.toMatchObject({ code: "corrupt_storage" });

    persistedRecord = { ...record, ownerUid: "uid-b" } as RunnerStorageRecord;
    await expect(load()).rejects.toBeInstanceOf(RunnerOwnershipError);

    persistedRecord = {
      ...record,
      sessionId: "session-other",
    } as RunnerStorageRecord;
    await expect(load()).rejects.toMatchObject({ code: "corrupt_storage" });

    persistedRecord = {
      ...record,
      state: {
        ...record.state,
        snapshot: { ...record.state.snapshot, ownerUid: "uid-b" },
      },
    } as RunnerStorageRecord;
    await expect(load()).rejects.toBeInstanceOf(RunnerOwnershipError);

    persistedRecord = {
      ...record,
      state: {
        ...record.state,
        snapshot: { ...record.state.snapshot, sessionId: "session-other" },
      },
    } as RunnerStorageRecord;
    await expect(load()).rejects.toMatchObject({ code: "snapshot_conflict" });

    persistedRecord = {
      ...record,
      state: {
        ...record.state,
        snapshot: { ...record.state.snapshot, dayId: "day-other" },
      },
    } as RunnerStorageRecord;
    await expect(load()).rejects.toMatchObject({ code: "snapshot_conflict" });

    persistedRecord = {
      ...record,
      state: {
        ...record.state,
        snapshot: {
          ...record.state.snapshot,
          programRevisionId: "program-revision-other",
        },
      },
    } as RunnerStorageRecord;
    await expect(load()).rejects.toMatchObject({ code: "snapshot_conflict" });

    persistedRecord = {
      ...record,
      state: undefined,
    } as unknown as RunnerStorageRecord;
    await expect(load()).rejects.toMatchObject({ code: "corrupt_storage" });
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

  it("lets abandonment bypass an earlier permanent or conflict failure", async () => {
    const storage = new InMemoryRunnerStorage();
    let state = runnerReducer(makeState(), {
      type: "update_set_draft",
      setId: "row-work-1",
      draft: { kind: "weight_reps", weightKg: 32, repetitions: 10 },
    });
    state = runnerReducer(state, { type: "save_set", setId: "row-work-1" });
    const savedKey = operation(state, "save_set").idempotencyKey;
    state = runnerReducer(state, {
      type: "operation_saved",
      idempotencyKey: savedKey,
      persistedId: "log-before-abandon",
    });
    state = runnerReducer(state, {
      type: "update_note",
      exerciseId: "exercise-row",
      note: "Stopped after conflict",
    });
    state = runnerReducer(state, {
      type: "save_note",
      exerciseId: "exercise-row",
    });
    const failedKey = operation(state, "save_note").idempotencyKey;
    state = runnerReducer(state, {
      type: "operation_failed",
      idempotencyKey: failedKey,
      errorCode: "conflict",
      conflict: true,
      retryable: false,
    });
    state = runnerReducer(state, {
      type: "abandon_session",
      reason: "Stopped after conflict",
    });
    const abandonKey = operation(state, "abandon_session").idempotencyKey;
    expect(
      state.operations.find(({ idempotencyKey }) => idempotencyKey === savedKey)
        ?.status,
    ).toBe("saved");
    expect(
      state.operations.find(
        ({ idempotencyKey }) => idempotencyKey === failedKey,
      )?.status,
    ).toBe("superseded");
    const submitted: string[] = [];
    state = await syncRunnerOperations(state, {
      storage,
      submit: async ({ idempotencyKey }) => {
        submitted.push(idempotencyKey);
        return { status: "saved", persistedId: "abandoned-2" };
      },
    });
    expect(submitted).toEqual([abandonKey]);
    expect(state.status).toBe("abandoned");
  });
});

describe("session completion", () => {
  it("blocks ordinary edits and abandonment while completing", async () => {
    const state = await makeCompletingState(new InMemoryRunnerStorage());
    expect(runnerReducer(state, { type: "complete_session" })).toBe(state);
    expect(() =>
      runnerReducer(state, {
        type: "update_set_draft",
        setId: "row-work-1",
        draft: { kind: "weight_reps", weightKg: 34, repetitions: 10 },
      }),
    ).toThrow(/closed/);
    expect(() =>
      runnerReducer(state, {
        type: "update_note",
        exerciseId: "exercise-row",
        note: "Too late",
      }),
    ).toThrow(/closed/);
    expect(() =>
      runnerReducer(state, {
        type: "update_cardio_draft",
        draft: {
          mode: "runner",
          durationSeconds: 900,
          distanceMeters: undefined,
          paceSecondsPerKilometer: undefined,
          paceSource: undefined,
          inclinePercent: undefined,
          notes: "Too late",
        },
      }),
    ).toThrow(/closed/);
    expect(() =>
      runnerReducer(state, {
        type: "skip_exercise",
        exerciseId: "exercise-run",
      }),
    ).toThrow(/closed/);
    expect(() =>
      runnerReducer(state, {
        type: "substitute_exercise",
        exerciseId: "exercise-row",
        replacement: {
          id: "exercise-machine-row",
          name: "Machine row",
          loggingKind: "weight_reps",
        },
      }),
    ).toThrow(/closed/);
    expect(() => runnerReducer(state, { type: "start_rest" })).toThrow(
      /closed/,
    );
    expect(() => runnerReducer(state, { type: "pause_rest" })).toThrow(
      /closed/,
    );
    expect(() => runnerReducer(state, { type: "resume_rest" })).toThrow(
      /closed/,
    );
    expect(() => runnerReducer(state, { type: "clear_rest" })).toThrow(
      /closed/,
    );
    expect(() =>
      runnerReducer(state, { type: "abandon_session", reason: "Too late" }),
    ).toThrow(/completion/);
    expect(
      state.operations.filter(({ kind }) => kind === "abandon_session"),
    ).toHaveLength(0);
  });

  it("makes duplicate abandonment idempotent", () => {
    const abandoning = runnerReducer(makeState(), {
      type: "abandon_session",
      reason: "Stopped early",
    });
    expect(runnerReducer(abandoning, { type: "abandon_session" })).toBe(
      abandoning,
    );
    expect(() =>
      runnerReducer(abandoning, { type: "complete_session" }),
    ).toThrow(/abandonment/);
  });

  it("rolls back failed terminal operations, retries, and closes successfully", async () => {
    let conflictedCompletion = await makeCompletingState(
      new InMemoryRunnerStorage(),
    );
    const conflictedCompletionKey = operation(
      conflictedCompletion,
      "complete_session",
    ).idempotencyKey;
    conflictedCompletion = runnerReducer(conflictedCompletion, {
      type: "operation_failed",
      idempotencyKey: conflictedCompletionKey,
      errorCode: "completion_conflict",
      conflict: true,
      retryable: false,
    });
    expect(conflictedCompletion.status).toBe("active");
    expect(conflictedCompletion.sync.status).toBe("conflict");
    expect(() =>
      runnerReducer(conflictedCompletion, {
        type: "retry_operation",
        idempotencyKey: conflictedCompletionKey,
      }),
    ).toThrow(/not retryable/);

    const storage = new InMemoryRunnerStorage();
    let completing = await makeCompletingState(storage);
    const completeKey = operation(
      completing,
      "complete_session",
    ).idempotencyKey;
    completing = runnerReducer(completing, {
      type: "operation_failed",
      idempotencyKey: completeKey,
      errorCode: "temporary_completion_failure",
      retryable: true,
    });
    expect(completing.status).toBe("active");
    expect(completing.sync.status).toBe("failed");
    expect(isNavigationBlocked(completing)).toBe(true);
    completing = runnerReducer(completing, {
      type: "retry_operation",
      idempotencyKey: completeKey,
    });
    expect(completing.status).toBe("completing");
    expect(
      completing.operations.find(
        ({ idempotencyKey }) => idempotencyKey === completeKey,
      )?.status,
    ).toBe("pending");
    completing = await syncRunnerOperations(completing, {
      storage,
      submit: async () => ({ status: "saved", persistedId: "session-retried" }),
    });
    expect(completing.status).toBe("completed");

    const abandonmentStorage = new InMemoryRunnerStorage();
    let abandoning = runnerReducer(makeState(), {
      type: "abandon_session",
      reason: "Stopped early",
    });
    const abandonKey = operation(abandoning, "abandon_session").idempotencyKey;
    abandoning = runnerReducer(abandoning, {
      type: "operation_failed",
      idempotencyKey: abandonKey,
      errorCode: "temporary_abandon_failure",
      retryable: true,
    });
    expect(abandoning.status).toBe("active");
    expect(abandoning.sync.status).toBe("failed");
    abandoning = runnerReducer(abandoning, {
      type: "retry_operation",
      idempotencyKey: abandonKey,
    });
    abandoning = await syncRunnerOperations(abandoning, {
      storage: abandonmentStorage,
      submit: async () => ({
        status: "saved",
        persistedId: "abandoned-retried",
      }),
    });
    expect(abandoning.status).toBe("abandoned");
  });

  it("revalidates a failed completion before restoring the completing state", async () => {
    const storage = new InMemoryRunnerStorage();
    let state = await makeCompletingState(storage);
    const completeKey = operation(state, "complete_session").idempotencyKey;
    state = runnerReducer(state, {
      type: "operation_failed",
      idempotencyKey: completeKey,
      errorCode: "temporary_completion_failure",
      retryable: true,
    });
    state = runnerReducer(state, {
      type: "update_set_draft",
      setId: "row-work-1",
      draft: { kind: "weight_reps", weightKg: 34, repetitions: 10 },
    });
    expect(() =>
      runnerReducer(state, {
        type: "retry_operation",
        idempotencyKey: completeKey,
      }),
    ).toThrow(/local draft|confirmed/);
    expect(state.status).toBe("active");
    expect(operation(state, "complete_session").status).toBe("failed");

    state = runnerReducer(state, {
      type: "update_set_draft",
      setId: "row-work-1",
      draft: { kind: "weight_reps", weightKg: 35, repetitions: 10 },
    });
    state = runnerReducer(state, { type: "save_set", setId: "row-work-1" });
    const correctedSetKey = operation(state, "save_set").idempotencyKey;
    expect(() =>
      runnerReducer(state, {
        type: "retry_operation",
        idempotencyKey: completeKey,
      }),
    ).toThrow(/confirmed/);

    state = runnerReducer(state, {
      type: "operation_saved",
      idempotencyKey: correctedSetKey,
    });
    state = runnerReducer(state, {
      type: "retry_operation",
      idempotencyKey: completeKey,
    });
    expect(state.status).toBe("completing");
    expect(operation(state, "complete_session").status).toBe("pending");
    expect(() =>
      runnerReducer(state, {
        type: "update_note",
        exerciseId: "exercise-row",
        note: "Must wait for completion retry",
      }),
    ).toThrow(/closed/);
  });

  it("stops after a saved terminal operation even with legacy pending entries", async () => {
    const storage = new InMemoryRunnerStorage();
    const completed = await syncRunnerOperations(
      await makeCompletingState(storage),
      {
        storage,
        submit: async () => ({
          status: "saved",
          persistedId: "session-legacy",
        }),
      },
    );
    expect(completed.status).toBe("completed");
    const legacyPending: RunnerOperation = {
      ...completed.operations[0]!,
      idempotencyKey: stableIdempotencyKey({
        legacy: "pending-after-terminal",
      }),
      sequence: completed.nextOperationSequence,
      attempts: 0,
      status: "pending",
      persistedId: undefined,
      errorCode: undefined,
      errorMessage: undefined,
      retryable: undefined,
      failureKind: undefined,
    };
    const corrupted = {
      ...completed,
      operations: [...completed.operations, legacyPending],
      nextOperationSequence: completed.nextOperationSequence + 1,
    };
    const submitted: string[] = [];
    const result = await syncRunnerOperations(corrupted, {
      storage,
      submit: async ({ idempotencyKey }) => {
        submitted.push(idempotencyKey);
        return { status: "saved" };
      },
    });
    expect(submitted).toEqual([]);
    expect(result.status).toBe("completed");
    expect(
      result.operations.find(({ idempotencyKey }) => idempotencyKey === legacyPending.idempotencyKey)
        ?.status,
    ).toBe("superseded");
  });

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

  it("retries abandonment by superseding later unsaved work", async () => {
    const storage = new InMemoryRunnerStorage();
    let state = runnerReducer(makeState(), {
      type: "abandon_session",
      reason: "Stopped early",
    });
    const abandonKey = operation(state, "abandon_session").idempotencyKey;
    state = runnerReducer(state, {
      type: "operation_failed",
      idempotencyKey: abandonKey,
      errorCode: "temporary_abandon_failure",
      retryable: true,
    });
    state = runnerReducer(state, {
      type: "update_note",
      exerciseId: "exercise-row",
      note: "Queued after failed abandonment",
    });
    state = runnerReducer(state, {
      type: "save_note",
      exerciseId: "exercise-row",
    });
    const noteKey = operation(state, "save_note").idempotencyKey;
    state = runnerReducer(state, {
      type: "update_set_draft",
      setId: "row-work-1",
      draft: { kind: "weight_reps", weightKg: 34, repetitions: 10 },
    });
    state = runnerReducer(state, { type: "save_set", setId: "row-work-1" });
    const setKey = operation(state, "save_set").idempotencyKey;

    state = runnerReducer(state, {
      type: "retry_operation",
      idempotencyKey: abandonKey,
    });
    expect(state.status).toBe("abandoning");
    expect(operation(state, "abandon_session").status).toBe("pending");
    expect(
      state.operations.find(({ idempotencyKey }) => idempotencyKey === noteKey)
        ?.status,
    ).toBe("superseded");
    expect(
      state.operations.find(({ idempotencyKey }) => idempotencyKey === setKey)
        ?.status,
    ).toBe("superseded");

    const submitted: string[] = [];
    state = await syncRunnerOperations(state, {
      storage,
      submit: async ({ idempotencyKey }) => {
        submitted.push(idempotencyKey);
        return { status: "saved", persistedId: "abandoned-after-retry" };
      },
    });
    expect(submitted).toEqual([abandonKey]);
    expect(state.status).toBe("abandoned");
  });
});
