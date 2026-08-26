import {
  parseMeasurement,
  type MeasurementKind,
  type WorkoutMeasurement,
} from "@/domain/analytics";
import {
  createRunnerState,
  createWorkoutSnapshot,
  derivePaceSecondsPerKilometer,
  type ActiveWorkoutState,
  type CardioLog,
  type CardioMode,
  type ExerciseSubstitution,
  type RunnerOperation,
  type RunnerOperationPayload,
  type RunnerSetPhase,
  type SetDraft,
  type WorkoutSnapshot,
} from "@/domain/workout-runner";

type DateValue = Date | string;

export type ResumeSessionState =
  | "draft"
  | "active"
  | "completing"
  | "completed"
  | "abandoned";

export type WorkoutResumeSessionSource = Readonly<{
  id: string;
  ownerUid: string;
  programId: string;
  programRevisionId: string;
  state: ResumeSessionState;
  dayId: string;
  dayName: string;
  startedAt: DateValue | undefined;
  completedAt: DateValue | undefined;
  abandonedAt: DateValue | undefined;
  createdAt: DateValue;
  updatedAt: DateValue;
}>;

export type WorkoutResumeExerciseStateSource = Readonly<{
  snapshotId: string;
  status: "pending" | "completed" | "skipped";
  effectiveCatalogExerciseId: string | undefined;
  effectiveCustomExerciseId: string | undefined;
  effectiveDisplayName: string;
  effectiveLoggingKind: MeasurementKind;
  note: string | undefined;
  substitutionReason: string | undefined;
  version: number;
  lastClientOperationId: string;
}>;

export type WorkoutResumeSetLogSource = Readonly<{
  id: string;
  snapshotId: string;
  setPosition: number;
  setKind: RunnerSetPhase;
  measurement: WorkoutMeasurement;
  note: string | undefined;
  recordedAt: DateValue;
  idempotencyKey: string;
}>;

export type WorkoutResumeCardioLogSource = Readonly<{
  id: string;
  mode: CardioMode;
  cardio: CardioLog;
  note: string | undefined;
  recordedAt: DateValue;
  idempotencyKey: string;
}>;

export type WorkoutResumeSource = Readonly<{
  session: WorkoutResumeSessionSource;
  snapshot: WorkoutSnapshot;
  exerciseStates: readonly WorkoutResumeExerciseStateSource[];
  setLogs: readonly WorkoutResumeSetLogSource[];
  cardioLog: WorkoutResumeCardioLogSource | undefined;
}>;

export type RunnerResumeErrorCode =
  | "identity_mismatch"
  | "snapshot_mismatch"
  | "invalid_snapshot"
  | "terminal_session"
  | "exercise_state_mismatch"
  | "invalid_exercise_state"
  | "unknown_set"
  | "duplicate_set"
  | "measurement_mismatch"
  | "invalid_cardio"
  | "duplicate_operation"
  | "invalid_timestamp";

export class RunnerResumeError extends Error {
  readonly code: RunnerResumeErrorCode;

  constructor(code: RunnerResumeErrorCode, message: string) {
    super(message);
    this.name = "RunnerResumeError";
    this.code = code;
  }
}

function nonblank(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function timestamp(value: DateValue): number {
  const milliseconds =
    value instanceof Date ? value.getTime() : Date.parse(value);
  if (!Number.isFinite(milliseconds) || milliseconds < 0) {
    throw new RunnerResumeError(
      "invalid_timestamp",
      "The saved workout timestamp is invalid.",
    );
  }
  return milliseconds;
}

function measurementDraft(measurement: WorkoutMeasurement): SetDraft {
  switch (measurement.kind) {
    case "weight_reps":
      return {
        kind: measurement.kind,
        weightKg: measurement.weightKg,
        repetitions: measurement.repetitions,
      };
    case "bodyweight_reps":
      return {
        kind: measurement.kind,
        repetitions: measurement.repetitions,
        addedWeightKg: measurement.addedWeightKg,
      };
    case "duration":
      return {
        kind: measurement.kind,
        durationSeconds: measurement.durationSeconds,
      };
    case "distance_duration":
      return {
        kind: measurement.kind,
        distanceMeters: measurement.distanceMeters,
        durationSeconds: measurement.durationSeconds,
      };
  }
}

function validateCardio(
  source: WorkoutResumeCardioLogSource,
  snapshot: WorkoutSnapshot,
): CardioLog {
  const cardio = source.cardio;
  const available = snapshot.cardioOptions.some(
    ({ mode }) => mode === source.mode,
  );
  const pacePaired =
    (cardio.paceSecondsPerKilometer === undefined) ===
    (cardio.paceSource === undefined);
  const valid =
    available &&
    source.mode === cardio.mode &&
    Number.isInteger(cardio.durationSeconds) &&
    cardio.durationSeconds > 0 &&
    (cardio.distanceMeters === undefined ||
      (Number.isFinite(cardio.distanceMeters) &&
        cardio.distanceMeters > 0)) &&
    (cardio.paceSecondsPerKilometer === undefined ||
      (Number.isInteger(cardio.paceSecondsPerKilometer) &&
        cardio.paceSecondsPerKilometer > 0)) &&
    pacePaired &&
    (cardio.paceSource === undefined ||
      cardio.paceSource === "entered" ||
      cardio.paceSource === "derived") &&
    (cardio.inclinePercent === undefined ||
      (Number.isFinite(cardio.inclinePercent) &&
        cardio.inclinePercent >= 0 &&
        cardio.inclinePercent <= 100)) &&
    typeof cardio.notes === "string" &&
    cardio.notes.length <= 2_000;
  if (!valid) {
    throw new RunnerResumeError(
      "invalid_cardio",
      "The saved cardio result is invalid.",
    );
  }
  if (cardio.paceSource === "derived") {
    if (
      cardio.distanceMeters === undefined ||
      cardio.paceSecondsPerKilometer === undefined ||
      derivePaceSecondsPerKilometer(
        cardio.durationSeconds,
        cardio.distanceMeters,
      ) !== cardio.paceSecondsPerKilometer
    ) {
      throw new RunnerResumeError(
        "invalid_cardio",
        "The saved cardio result is invalid.",
      );
    }
  }
  return cardio;
}

function savedOperation(
  source: WorkoutResumeSource,
  sequence: number,
  input: Readonly<{
    idempotencyKey: string;
    kind: RunnerOperation["kind"];
    payload: RunnerOperationPayload;
    persistedId?: string;
    createdAt: number;
  }>,
): RunnerOperation {
  if (!nonblank(input.idempotencyKey)) {
    throw new RunnerResumeError(
      "duplicate_operation",
      "The saved workout operation identity is invalid.",
    );
  }
  return {
    idempotencyKey: input.idempotencyKey,
    kind: input.kind,
    payload: input.payload,
    ownerUid: source.session.ownerUid,
    sessionId: source.session.id,
    baseRevision: source.session.programRevisionId,
    sequence,
    createdAt: input.createdAt,
    attempts: 1,
    status: "saved",
    persistedId: input.persistedId,
    errorCode: undefined,
    errorMessage: undefined,
    retryable: undefined,
    failureKind: undefined,
  };
}

function substitutionFor(
  state: WorkoutResumeExerciseStateSource,
  exercise: WorkoutSnapshot["exercises"][number],
): ExerciseSubstitution | undefined {
  const changed =
    state.substitutionReason !== undefined ||
    state.effectiveDisplayName !== exercise.name ||
    state.effectiveLoggingKind !== exercise.loggingKind;
  if (!changed) return undefined;
  const ids = [
    state.effectiveCatalogExerciseId,
    state.effectiveCustomExerciseId,
  ].filter((value): value is string => value !== undefined);
  if (
    ids.length !== 1 ||
    !nonblank(ids[0]) ||
    state.effectiveLoggingKind !== exercise.loggingKind ||
    !nonblank(state.effectiveDisplayName)
  ) {
    throw new RunnerResumeError(
      "invalid_exercise_state",
      "The saved workout exercise outcome is invalid.",
    );
  }
  return {
    id: ids[0],
    name: state.effectiveDisplayName,
    loggingKind: state.effectiveLoggingKind,
  };
}

export function hydrateWorkoutResumeState(
  source: WorkoutResumeSource,
): ActiveWorkoutState {
  const { session } = source;
  if (
    session.ownerUid !== source.snapshot.ownerUid ||
    session.id !== source.snapshot.sessionId
  ) {
    throw new RunnerResumeError(
      "identity_mismatch",
      "The saved workout identity is invalid.",
    );
  }
  if (
    session.programRevisionId !== source.snapshot.programRevisionId ||
    session.dayId !== source.snapshot.dayId ||
    session.dayName !== source.snapshot.dayName
  ) {
    throw new RunnerResumeError(
      "snapshot_mismatch",
      "The saved workout snapshot doesn't match the session.",
    );
  }
  if (session.state === "completed" || session.state === "abandoned") {
    throw new RunnerResumeError(
      "terminal_session",
      "A completed or abandoned workout can't be resumed.",
    );
  }

  let snapshot: WorkoutSnapshot;
  try {
    snapshot = createWorkoutSnapshot({
      sessionId: source.snapshot.sessionId,
      ownerUid: source.snapshot.ownerUid,
      programRevisionId: source.snapshot.programRevisionId,
      dayId: source.snapshot.dayId,
      dayName: source.snapshot.dayName,
      exercises: source.snapshot.exercises.map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        loggingKind: exercise.loggingKind,
        sets: exercise.sets.map((set) => ({
          id: set.id,
          position: set.position,
          phase: set.phase,
          target: set.target,
          ...(set.previous === undefined ? {} : { previous: set.previous }),
        })),
      })),
      cardioOptions: source.snapshot.cardioOptions.map((option) => ({
        ...option,
      })),
    });
  } catch {
    throw new RunnerResumeError(
      "invalid_snapshot",
      "The saved workout snapshot is invalid.",
    );
  }
  const updatedAt = timestamp(session.updatedAt);
  const stateByExercise = new Map<
    string,
    WorkoutResumeExerciseStateSource
  >();
  for (const exerciseState of source.exerciseStates) {
    if (
      stateByExercise.has(exerciseState.snapshotId) ||
      !snapshot.exercises.some(({ id }) => id === exerciseState.snapshotId)
    ) {
      throw new RunnerResumeError(
        "exercise_state_mismatch",
        "The saved workout exercise outcomes are incomplete.",
      );
    }
    if (
      !Number.isInteger(exerciseState.version) ||
      exerciseState.version < 1 ||
      !nonblank(exerciseState.lastClientOperationId) ||
      !nonblank(exerciseState.effectiveDisplayName)
    ) {
      throw new RunnerResumeError(
        "invalid_exercise_state",
        "The saved workout exercise outcome is invalid.",
      );
    }
    stateByExercise.set(exerciseState.snapshotId, exerciseState);
  }
  if (stateByExercise.size !== snapshot.exercises.length) {
    throw new RunnerResumeError(
      "exercise_state_mismatch",
      "The saved workout exercise outcomes are incomplete.",
    );
  }

  const base = createRunnerState(snapshot, { now: updatedAt });
  const operations: RunnerOperation[] = [];
  const operationKeys = new Set<string>();
  const loggedSets: Record<string, ActiveWorkoutState["loggedSets"][string]> = {};
  const drafts: Record<string, SetDraft> = {};
  const appendOperation = (
    operation: Omit<RunnerOperation, "sequence">,
  ): void => {
    if (operationKeys.has(operation.idempotencyKey)) {
      throw new RunnerResumeError(
        "duplicate_operation",
        "The saved workout operation identity is duplicated.",
      );
    }
    operationKeys.add(operation.idempotencyKey);
    operations.push({ ...operation, sequence: operations.length + 1 });
  };

  for (const log of source.setLogs) {
    const exercise = snapshot.exercises.find(({ id }) => id === log.snapshotId);
    const set = exercise?.sets.find(({ position }) => position === log.setPosition);
    if (!exercise || !set) {
      throw new RunnerResumeError(
        "unknown_set",
        "The saved workout set doesn't match the snapshot.",
      );
    }
    if (loggedSets[set.id] !== undefined) {
      throw new RunnerResumeError(
        "duplicate_set",
        "The saved workout contains a duplicate set result.",
      );
    }
    let measurement: WorkoutMeasurement;
    try {
      measurement = parseMeasurement(log.measurement);
    } catch {
      throw new RunnerResumeError(
        "measurement_mismatch",
        "The saved set measurement doesn't match the workout snapshot.",
      );
    }
    if (
      measurement.kind !== exercise.loggingKind ||
      log.setKind !== set.phase ||
      (set.phase === "warmup") !== (measurement.isWarmup === true)
    ) {
      throw new RunnerResumeError(
        "measurement_mismatch",
        "The saved set measurement doesn't match the workout snapshot.",
      );
    }
    loggedSets[set.id] = {
      setId: set.id,
      exerciseId: exercise.id,
      phase: set.phase,
      measurement,
      operationKey: log.idempotencyKey,
    };
    drafts[set.id] = measurementDraft(measurement);
    appendOperation(
      savedOperation(source, 0, {
        idempotencyKey: log.idempotencyKey,
        kind: "save_set",
        payload: {
          kind: "save_set",
          setId: set.id,
          exerciseId: exercise.id,
          phase: set.phase,
          measurement,
        },
        persistedId: log.id,
        createdAt: timestamp(log.recordedAt),
      }),
    );
  }

  let loggedCardio: ActiveWorkoutState["loggedCardio"];
  let cardioDraft: ActiveWorkoutState["cardioDraft"];
  let cardioMode: ActiveWorkoutState["cardioMode"];
  if (source.cardioLog !== undefined) {
    const cardio = validateCardio(source.cardioLog, snapshot);
    cardioMode = source.cardioLog.mode;
    cardioDraft = {
      mode: cardio.mode,
      durationSeconds: cardio.durationSeconds,
      distanceMeters: cardio.distanceMeters,
      paceSecondsPerKilometer: cardio.paceSecondsPerKilometer,
      paceSource: cardio.paceSource,
      inclinePercent: cardio.inclinePercent,
      notes: cardio.notes,
    };
    loggedCardio = {
      mode: cardio.mode,
      cardio,
      operationKey: source.cardioLog.idempotencyKey,
    };
    appendOperation(
      savedOperation(source, 0, {
        idempotencyKey: source.cardioLog.idempotencyKey,
        kind: "save_cardio",
        payload: { kind: "save_cardio", mode: cardio.mode, cardio },
        persistedId: source.cardioLog.id,
        createdAt: timestamp(source.cardioLog.recordedAt),
      }),
    );
  }

  const notesByExercise: Record<string, string> = {};
  const completedExerciseIds: string[] = [];
  const skippedExerciseIds: string[] = [];
  const substitutions: Record<string, ExerciseSubstitution> = {};
  for (const exercise of snapshot.exercises) {
    const exerciseState = stateByExercise.get(exercise.id)!;
    if (exerciseState.note !== undefined) {
      notesByExercise[exercise.id] = exerciseState.note;
    }
    const substitution = substitutionFor(exerciseState, exercise);
    if (substitution !== undefined) substitutions[exercise.id] = substitution;

    let outcome:
      | Readonly<{
          kind: RunnerOperation["kind"];
          payload: RunnerOperationPayload;
        }>
      | undefined;
    if (exerciseState.status === "completed") {
      if (exercise.sets.some(({ id }) => loggedSets[id] === undefined)) {
        throw new RunnerResumeError(
          "invalid_exercise_state",
          "The saved workout exercise outcome is invalid.",
        );
      }
      completedExerciseIds.push(exercise.id);
      outcome = {
        kind: "complete_exercise",
        payload: { kind: "complete_exercise", exerciseId: exercise.id },
      };
    } else if (exerciseState.status === "skipped") {
      skippedExerciseIds.push(exercise.id);
      outcome = {
        kind: "skip_exercise",
        payload: {
          kind: "skip_exercise",
          exerciseId: exercise.id,
          reason: exerciseState.note,
        },
      };
    } else if (substitution !== undefined) {
      outcome = {
        kind: "substitute_exercise",
        payload: {
          kind: "substitute_exercise",
          exerciseId: exercise.id,
          replacement: substitution,
          reason: exerciseState.substitutionReason,
        },
      };
    } else if (exerciseState.note !== undefined) {
      outcome = {
        kind: "save_note",
        payload: {
          kind: "save_note",
          exerciseId: exercise.id,
          note: exerciseState.note,
        },
      };
    }
    if (outcome !== undefined) {
      appendOperation(
        savedOperation(source, 0, {
          idempotencyKey: exerciseState.lastClientOperationId,
          kind: outcome.kind,
          payload: outcome.payload,
          createdAt: updatedAt,
        }),
      );
    }
  }

  const currentExerciseIndex = Math.max(
    0,
    snapshot.exercises.findIndex(
      ({ id }) =>
        !completedExerciseIds.includes(id) &&
        !skippedExerciseIds.includes(id),
    ),
  );
  const currentExercise = snapshot.exercises[currentExerciseIndex]!;
  const firstUnlogged = currentExercise.sets.findIndex(
    ({ id }) => loggedSets[id] === undefined,
  );
  const currentSetIndex = firstUnlogged < 0 ? 0 : firstUnlogged;

  return {
    ...base,
    currentExerciseIndex,
    currentSetIndex,
    status: session.state === "completing" ? "completing" : "active",
    drafts,
    cardioMode,
    cardioDraft,
    loggedCardio,
    notesByExercise,
    loggedSets,
    skippedExerciseIds,
    completedExerciseIds,
    substitutions,
    operations,
    nextOperationSequence: operations.length + 1,
    lastUpdatedAt: updatedAt,
  };
}
