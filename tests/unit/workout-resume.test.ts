import { describe, expect, it } from "vitest";

import {
  RunnerResumeError,
  hydrateWorkoutResumeState,
  type WorkoutResumeSource,
} from "@/domain/workout-resume";
import { createWorkoutSnapshot } from "@/domain/workout-runner";
import type { WorkoutMeasurement } from "@/domain/analytics";

const ownerUid = "owner-resume";
const sessionId = "11111111-1111-4111-8111-111111111111";
const programId = "22222222-2222-4222-8222-222222222222";
const revisionId = "33333333-3333-4333-8333-333333333333";
const dayId = "44444444-4444-4444-8444-444444444444";
const pressId = "55555555-5555-4555-8555-555555555555";
const plankId = "66666666-6666-4666-8666-666666666666";
const rowId = "77777777-7777-4777-8777-777777777777";
const replacementId = "88888888-8888-4888-8888-888888888888";

function source(): WorkoutResumeSource {
  const createdAt = new Date("2026-08-25T12:00:00.000Z");
  const updatedAt = new Date("2026-08-25T12:20:00.000Z");
  return {
    session: {
      id: sessionId,
      ownerUid,
      programId,
      programRevisionId: revisionId,
      state: "active",
      dayId,
      dayName: "Push",
      startedAt: createdAt,
      completedAt: undefined,
      abandonedAt: undefined,
      createdAt,
      updatedAt,
    },
    snapshot: createWorkoutSnapshot({
      sessionId,
      ownerUid,
      programRevisionId: revisionId,
      dayId,
      dayName: "Push",
      exercises: [
        {
          id: pressId,
          name: "Dumbbell bench press",
          loggingKind: "weight_reps",
          sets: [
            {
              id: `${pressId}:1`,
              position: 1,
              phase: "work",
              target: {
                kind: "weight_reps",
                minimumReps: 8,
                maximumReps: 12,
                targetWeightKg: 20,
                restSeconds: 90,
              },
            },
          ],
        },
        {
          id: plankId,
          name: "Front plank",
          loggingKind: "duration",
          sets: [
            {
              id: `${plankId}:1`,
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
          id: rowId,
          name: "One-arm dumbbell row",
          loggingKind: "weight_reps",
          sets: [
            {
              id: `${rowId}:1`,
              position: 1,
              phase: "work",
              target: {
                kind: "weight_reps",
                minimumReps: 8,
                maximumReps: 12,
                restSeconds: 90,
              },
            },
          ],
        },
      ],
      cardioOptions: [
        {
          id: "walker-cardio",
          mode: "walker",
          targetDurationSeconds: 1_200,
        },
        {
          id: "runner-cardio",
          mode: "runner",
          targetDurationSeconds: 900,
        },
      ],
    }),
    exerciseStates: [
      {
        snapshotId: pressId,
        status: "completed",
        effectiveCatalogExerciseId: "99999999-9999-4999-8999-999999999999",
        effectiveCustomExerciseId: undefined,
        effectiveDisplayName: "Dumbbell bench press",
        effectiveLoggingKind: "weight_reps",
        note: "Controlled tempo",
        substitutionReason: undefined,
        version: 3,
        lastClientOperationId: "complete-press",
      },
      {
        snapshotId: plankId,
        status: "skipped",
        effectiveCatalogExerciseId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        effectiveCustomExerciseId: undefined,
        effectiveDisplayName: "Front plank",
        effectiveLoggingKind: "duration",
        note: "Stopped for today",
        substitutionReason: undefined,
        version: 2,
        lastClientOperationId: "skip-plank",
      },
      {
        snapshotId: rowId,
        status: "pending",
        effectiveCatalogExerciseId: replacementId,
        effectiveCustomExerciseId: undefined,
        effectiveDisplayName: "Chest-supported dumbbell row",
        effectiveLoggingKind: "weight_reps",
        note: "Keep the bench low",
        substitutionReason: "Bench support preferred",
        version: 2,
        lastClientOperationId: "substitute-row",
      },
    ],
    setLogs: [
      {
        id: "set-log-press",
        snapshotId: pressId,
        setPosition: 1,
        setKind: "work",
        measurement: {
          kind: "weight_reps",
          weightKg: 22.5,
          repetitions: 12,
        },
        note: undefined,
        recordedAt: new Date("2026-08-25T12:05:00.000Z"),
        idempotencyKey: "set-press-1",
      },
    ],
    cardioLog: {
      id: "cardio-log-1",
      mode: "walker",
      cardio: {
        mode: "walker",
        durationSeconds: 1_200,
        distanceMeters: 1_500,
        paceSecondsPerKilometer: 800,
        paceSource: "derived",
        inclinePercent: 2,
        notes: "Steady finish",
      },
      note: "Steady finish",
      recordedAt: new Date("2026-08-25T12:19:00.000Z"),
      idempotencyKey: "cardio-1",
    },
  };
}

function iso(value: Date | string | undefined): string | undefined {
  if (value === undefined) return undefined;
  return value instanceof Date ? value.toISOString() : value;
}

function measurementSource(measurement: WorkoutMeasurement): WorkoutResumeSource {
  const base = source();
  const target =
    measurement.kind === "weight_reps"
      ? {
          kind: measurement.kind,
          minimumReps: 8,
          maximumReps: 12,
          restSeconds: 90,
        }
      : measurement.kind === "bodyweight_reps"
        ? {
            kind: measurement.kind,
            minimumReps: 8,
            maximumReps: 15,
            restSeconds: 60,
          }
        : measurement.kind === "duration"
          ? {
              kind: measurement.kind,
              minimumSeconds: 20,
              maximumSeconds: 45,
              restSeconds: 60,
            }
          : {
              kind: measurement.kind,
              targetDistanceMeters: 100,
              targetDurationSeconds: 60,
              restSeconds: 60,
            };
  return {
    ...base,
    snapshot: createWorkoutSnapshot({
      sessionId,
      ownerUid,
      programRevisionId: revisionId,
      dayId,
      dayName: "Push",
      exercises: [
        {
          id: pressId,
          name: "Measurement exercise",
          loggingKind: measurement.kind,
          sets: [
            {
              id: `${pressId}:1`,
              position: 1,
              phase: "work",
              target,
            },
          ],
        },
      ],
      cardioOptions: [],
    }),
    exerciseStates: [
      {
        snapshotId: pressId,
        status: "pending",
        effectiveCatalogExerciseId: "99999999-9999-4999-8999-999999999999",
        effectiveCustomExerciseId: undefined,
        effectiveDisplayName: "Measurement exercise",
        effectiveLoggingKind: measurement.kind,
        note: undefined,
        substitutionReason: undefined,
        version: 1,
        lastClientOperationId: "initial-measurement",
      },
    ],
    setLogs: [
      {
        id: "measurement-log",
        snapshotId: pressId,
        setPosition: 1,
        setKind: "work",
        measurement,
        note: undefined,
        recordedAt: new Date("2026-08-25T12:05:00.000Z"),
        idempotencyKey: "measurement-save",
      },
    ],
    cardioLog: undefined,
  };
}

describe("workout resume hydration", () => {
  it("reconstructs confirmed sets, cardio, drafts, notes, and exercise outcomes", () => {
    const state = hydrateWorkoutResumeState(source());

    expect(state.loggedSets[`${pressId}:1`]).toMatchObject({
      exerciseId: pressId,
      operationKey: "set-press-1",
      measurement: { kind: "weight_reps", weightKg: 22.5, repetitions: 12 },
    });
    expect(state.drafts[`${pressId}:1`]).toEqual({
      kind: "weight_reps",
      weightKg: 22.5,
      repetitions: 12,
    });
    expect(state.loggedCardio).toMatchObject({
      mode: "walker",
      operationKey: "cardio-1",
      cardio: { durationSeconds: 1_200, distanceMeters: 1_500 },
    });
    expect(state.cardioDraft).toMatchObject({
      mode: "walker",
      durationSeconds: 1_200,
      distanceMeters: 1_500,
    });
    expect(state.notesByExercise).toEqual({
      [pressId]: "Controlled tempo",
      [plankId]: "Stopped for today",
      [rowId]: "Keep the bench low",
    });
    expect(state.completedExerciseIds).toEqual([pressId]);
    expect(state.skippedExerciseIds).toEqual([plankId]);
    expect(state.substitutions[rowId]).toEqual({
      id: replacementId,
      name: "Chest-supported dumbbell row",
      loggingKind: "weight_reps",
    });
    expect(state.operations.map(({ idempotencyKey, status }) => [idempotencyKey, status])).toEqual([
      ["set-press-1", "saved"],
      ["cardio-1", "saved"],
      ["complete-press", "saved"],
      ["skip-plank", "saved"],
      ["substitute-row", "saved"],
    ]);
    expect(state.currentExerciseIndex).toBe(2);
    expect(state.currentSetIndex).toBe(0);
    expect(state.nextOperationSequence).toBe(6);
    expect(state.lastUpdatedAt).toBe(new Date("2026-08-25T12:20:00.000Z").getTime());
  });

  it("accepts serialized dates and preserves a completing session state", () => {
    const input = source();
    const state = hydrateWorkoutResumeState({
      ...input,
      session: {
        ...input.session,
        state: "completing",
        createdAt: iso(input.session.createdAt)!,
        startedAt: iso(input.session.startedAt),
        updatedAt: iso(input.session.updatedAt)!,
      },
      setLogs: input.setLogs.map((log) => ({
        ...log,
        recordedAt: iso(log.recordedAt)!,
      })),
      cardioLog:
        input.cardioLog === undefined
          ? undefined
          : { ...input.cardioLog, recordedAt: iso(input.cardioLog.recordedAt)! },
    });

    expect(state.status).toBe("completing");
  });

  it.each([
    [
      { kind: "weight_reps", weightKg: 25, repetitions: 10 },
      { kind: "weight_reps", weightKg: 25, repetitions: 10 },
    ],
    [
      { kind: "bodyweight_reps", repetitions: 12, addedWeightKg: 5 },
      { kind: "bodyweight_reps", repetitions: 12, addedWeightKg: 5 },
    ],
    [
      { kind: "duration", durationSeconds: 35 },
      { kind: "duration", durationSeconds: 35 },
    ],
    [
      { kind: "distance_duration", distanceMeters: 100, durationSeconds: 60 },
      { kind: "distance_duration", distanceMeters: 100, durationSeconds: 60 },
    ],
  ] as const)("hydrates a saved %s measurement", (measurement, expectedDraft) => {
    const state = hydrateWorkoutResumeState(
      measurementSource(measurement as WorkoutMeasurement),
    );

    expect(state.drafts[`${pressId}:1`]).toEqual(expectedDraft);
  });

  it("rejects a completed outcome that omits a prescribed set", () => {
    const input = source();
    expect(() =>
      hydrateWorkoutResumeState({ ...input, setLogs: [] }),
    ).toThrowError(
      expect.objectContaining({
        name: "RunnerResumeError",
        code: "invalid_exercise_state",
      }),
    );
  });

  it("fails closed for owner, revision, terminal, state-coverage, and set contradictions", () => {
    const base = source();
    const cases: Array<readonly [string, WorkoutResumeSource, string]> = [
      [
        "owner",
        { ...base, snapshot: { ...base.snapshot, ownerUid: "foreign-owner" } },
        "identity_mismatch",
      ],
      [
        "revision",
        { ...base, snapshot: { ...base.snapshot, programRevisionId: programId } },
        "snapshot_mismatch",
      ],
      [
        "terminal",
        { ...base, session: { ...base.session, state: "completed" } },
        "terminal_session",
      ],
      [
        "missing state",
        { ...base, exerciseStates: base.exerciseStates.slice(1) },
        "exercise_state_mismatch",
      ],
      [
        "duplicate set",
        { ...base, setLogs: [...base.setLogs, { ...base.setLogs[0]!, id: "set-log-duplicate" }] },
        "duplicate_set",
      ],
      [
        "wrong measurement",
        {
          ...base,
          setLogs: [
            {
              ...base.setLogs[0]!,
              measurement: { kind: "duration", durationSeconds: 30 },
            },
          ],
        },
        "measurement_mismatch",
      ],
    ];

    for (const [label, input, code] of cases) {
      expect(
        () => hydrateWorkoutResumeState(input),
        label,
      ).toThrowError(expect.objectContaining({ name: "RunnerResumeError", code }));
    }
  });

  it("uses a stable public error instead of leaking malformed source details", () => {
    const input = source();
    expect(() =>
      hydrateWorkoutResumeState({
        ...input,
        cardioLog: {
          ...input.cardioLog!,
          cardio: { ...input.cardioLog!.cardio, durationSeconds: -1 },
        },
      }),
    ).toThrowError(
      new RunnerResumeError("invalid_cardio", "The saved cardio result is invalid."),
    );
  });
});
