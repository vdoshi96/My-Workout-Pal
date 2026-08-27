import {
  MEASUREMENT_KINDS,
  parseMeasurement,
  validateMeasurement,
  type MeasurementKind,
  type WorkoutMeasurement,
} from "@/domain/analytics";

export type RunnerConnectivity = "online" | "offline";
export type RunnerAuth = "valid" | "expired" | "revoked";
export type RunnerStatus =
  "active" | "completing" | "completed" | "abandoning" | "abandoned";
export type RunnerSyncStatus =
  | "idle"
  | "pending"
  | "offline"
  | "auth_expired"
  | "auth_revoked"
  | "failed"
  | "conflict";
export type RunnerSetPhase = "warmup" | "work";

const SUPPORTED_KINDS = new Set<MeasurementKind>(MEASUREMENT_KINDS);

type TargetBaseInput = {
  restSeconds: number;
};

export type WeightRepsTargetInput = TargetBaseInput & {
  kind: "weight_reps";
  minimumReps: number;
  maximumReps: number;
  targetWeightKg?: number | undefined;
};

export type BodyweightRepsTargetInput = TargetBaseInput & {
  kind: "bodyweight_reps";
  minimumReps: number;
  maximumReps: number;
};

export type DurationTargetInput = TargetBaseInput & {
  kind: "duration";
  minimumSeconds: number;
  maximumSeconds: number;
};

export type DistanceDurationTargetInput = TargetBaseInput & {
  kind: "distance_duration";
  targetDistanceMeters: number;
  targetDurationSeconds: number;
};

export type WorkoutSetTargetInput =
  | WeightRepsTargetInput
  | BodyweightRepsTargetInput
  | DurationTargetInput
  | DistanceDurationTargetInput;

export type WorkoutSetInput = {
  id: string;
  position: number;
  phase: RunnerSetPhase;
  target: WorkoutSetTargetInput;
  previous?: WorkoutMeasurement;
};

export type WorkoutExerciseInput = {
  id: string;
  name: string;
  loggingKind: MeasurementKind;
  sets: readonly WorkoutSetInput[];
};

export type CardioMode = "walker" | "runner";
export type CardioSnapshotInput = {
  id: string;
  mode: CardioMode;
  targetDurationSeconds: number;
  targetDistanceMeters?: number | undefined;
  targetPaceSecondsPerKilometer?: number | undefined;
  targetInclinePercent?: number | undefined;
  notes?: string | undefined;
};

export type CardioSnapshot = Readonly<CardioSnapshotInput>;

export type RunnerSnapshotInput = {
  sessionId: string;
  ownerUid: string;
  programRevisionId: string;
  dayId: string;
  dayName: string;
  exercises: readonly WorkoutExerciseInput[];
  cardioOptions?: readonly CardioSnapshotInput[];
};

export type WorkoutSetTarget = Readonly<WorkoutSetTargetInput>;
export type WorkoutSetSnapshot = Readonly<{
  id: string;
  position: number;
  phase: RunnerSetPhase;
  target: WorkoutSetTarget;
  previous: WorkoutMeasurement | undefined;
}>;
export type WorkoutExerciseSnapshot = Readonly<{
  id: string;
  name: string;
  loggingKind: MeasurementKind;
  sets: readonly WorkoutSetSnapshot[];
}>;
export type WorkoutSnapshot = Readonly<{
  sessionId: string;
  ownerUid: string;
  programRevisionId: string;
  dayId: string;
  dayName: string;
  exercises: readonly WorkoutExerciseSnapshot[];
  cardioOptions: readonly CardioSnapshot[];
}>;
export type ActiveWorkoutSnapshot = WorkoutSnapshot;
export type ActiveSessionSnapshot = WorkoutSnapshot;

export type WeightRepsDraft = Readonly<{
  kind: "weight_reps";
  weightKg: number | undefined;
  repetitions: number | undefined;
}>;
export type BodyweightRepsDraft = Readonly<{
  kind: "bodyweight_reps";
  repetitions: number | undefined;
  addedWeightKg: number | undefined;
}>;
export type DurationDraft = Readonly<{
  kind: "duration";
  durationSeconds: number | undefined;
}>;
export type DistanceDurationDraft = Readonly<{
  kind: "distance_duration";
  distanceMeters: number | undefined;
  durationSeconds: number | undefined;
}>;
export type SetDraft =
  WeightRepsDraft | BodyweightRepsDraft | DurationDraft | DistanceDurationDraft;

export type CardioDraft = Readonly<{
  mode: CardioMode;
  durationSeconds: number | undefined;
  distanceMeters: number | undefined;
  paceSecondsPerKilometer: number | undefined;
  paceSource: "entered" | "derived" | undefined;
  inclinePercent: number | undefined;
  notes: string;
}>;

export type CardioLog = Readonly<{
  mode: CardioMode;
  durationSeconds: number;
  distanceMeters: number | undefined;
  paceSecondsPerKilometer: number | undefined;
  paceSource: "entered" | "derived" | undefined;
  inclinePercent: number | undefined;
  notes: string;
}>;

export type CardioDraftValidation =
  | Readonly<{ ok: true; cardio: CardioLog }>
  | Readonly<{ ok: false; issues: readonly string[] }>;

export type SetDraftValidation =
  | Readonly<{ ok: true; measurement: WorkoutMeasurement }>
  | Readonly<{ ok: false; issues: readonly string[] }>;

export type ExerciseSubstitution = Readonly<{
  id: string;
  name: string;
  loggingKind: MeasurementKind;
}>;

export type LoggedSet = Readonly<{
  setId: string;
  exerciseId: string;
  phase: RunnerSetPhase;
  measurement: WorkoutMeasurement;
  operationKey: string;
}>;

export type LoggedCardio = Readonly<{
  mode: CardioMode;
  cardio: CardioLog;
  operationKey: string;
}>;

export type RestTimer = Readonly<{
  startedAt: number;
  endsAt: number;
  pausedAt: number | undefined;
}>;

export type RestTimerView = Readonly<{
  status: "idle" | "running" | "paused" | "complete";
  startedAt: number | undefined;
  endsAt: number | undefined;
  remainingSeconds: number;
}>;

export type RunnerOperationKind =
  | "save_set"
  | "save_cardio"
  | "save_note"
  | "skip_exercise"
  | "substitute_exercise"
  | "complete_exercise"
  | "abandon_session"
  | "complete_session";
export type RunnerOperationStatus =
  "pending" | "saved" | "failed" | "superseded";
export type RunnerFailureKind =
  "transient" | "permanent" | "conflict" | "auth" | "offline";

export type SaveSetOperationPayload = Readonly<{
  kind: "save_set";
  setId: string;
  exerciseId: string;
  phase: RunnerSetPhase;
  measurement: WorkoutMeasurement;
}>;
export type SaveNoteOperationPayload = Readonly<{
  kind: "save_note";
  exerciseId: string;
  note: string;
}>;
export type SaveCardioOperationPayload = Readonly<{
  kind: "save_cardio";
  mode: CardioMode;
  cardio: CardioLog;
}>;
export type SkipExerciseOperationPayload = Readonly<{
  kind: "skip_exercise";
  exerciseId: string;
  reason: string | undefined;
}>;
export type SubstituteExerciseOperationPayload = Readonly<{
  kind: "substitute_exercise";
  exerciseId: string;
  replacement: ExerciseSubstitution;
  reason: string | undefined;
}>;
export type CompleteExerciseOperationPayload = Readonly<{
  kind: "complete_exercise";
  exerciseId: string;
}>;
export type AbandonSessionOperationPayload = Readonly<{
  kind: "abandon_session";
  sessionId: string;
  reason: string | undefined;
}>;
export type CompleteSessionOperationPayload = Readonly<{
  kind: "complete_session";
  sessionId: string;
}>;
export type RunnerOperationPayload =
  | SaveSetOperationPayload
  | SaveCardioOperationPayload
  | SaveNoteOperationPayload
  | SkipExerciseOperationPayload
  | SubstituteExerciseOperationPayload
  | CompleteExerciseOperationPayload
  | AbandonSessionOperationPayload
  | CompleteSessionOperationPayload;

export type RunnerOperation = Readonly<{
  idempotencyKey: string;
  kind: RunnerOperationKind;
  payload: RunnerOperationPayload;
  /**
   * A stable, local-only description of the mutation's semantic target. Older
   * server-hydrated operations omit this field; storage derives it from the
   * validated payload when needed.
   */
  semanticTarget?: string;
  ownerUid: string;
  sessionId: string;
  baseRevision: string;
  sequence: number;
  createdAt: number;
  attempts: number;
  status: RunnerOperationStatus;
  persistedId: string | undefined;
  errorCode: string | undefined;
  errorMessage: string | undefined;
  retryable: boolean | undefined;
  failureKind: RunnerFailureKind | undefined;
}>;

export type RunnerSyncState = Readonly<{
  status: RunnerSyncStatus;
  errorCode: string | undefined;
  errorMessage: string | undefined;
}>;

export type ActiveWorkoutState = Readonly<{
  snapshot: WorkoutSnapshot;
  currentExerciseIndex: number;
  currentSetIndex: number;
  status: RunnerStatus;
  connectivity: RunnerConnectivity;
  auth: RunnerAuth;
  sync: RunnerSyncState;
  drafts: Readonly<Record<string, SetDraft>>;
  dirtySetIds: readonly string[];
  cardioMode: CardioMode | undefined;
  cardioDraft: CardioDraft | undefined;
  dirtyCardio: boolean;
  loggedCardio: LoggedCardio | undefined;
  notesByExercise: Readonly<Record<string, string>>;
  dirtyNoteExerciseIds: readonly string[];
  loggedSets: Readonly<Record<string, LoggedSet>>;
  skippedExerciseIds: readonly string[];
  completedExerciseIds: readonly string[];
  substitutions: Readonly<Record<string, ExerciseSubstitution>>;
  restTimer: RestTimer | undefined;
  operations: readonly RunnerOperation[];
  nextOperationSequence: number;
  lastUpdatedAt: number;
}>;
export type RunnerState = ActiveWorkoutState;

export type RunnerAction =
  | Readonly<{ type: "navigate_exercise"; index: number }>
  | Readonly<{ type: "navigate_set"; index: number }>
  | Readonly<{ type: "update_set_draft"; setId: string; draft: SetDraft }>
  | Readonly<{ type: "save_set"; setId: string; now?: number }>
  | Readonly<{ type: "select_cardio"; mode: CardioMode; now?: number }>
  | Readonly<{ type: "update_cardio_draft"; draft: CardioDraft; now?: number }>
  | Readonly<{ type: "save_cardio"; now?: number }>
  | Readonly<{ type: "update_note"; exerciseId: string; note: string }>
  | Readonly<{ type: "save_note"; exerciseId: string; now?: number }>
  | Readonly<{
      type: "skip_exercise";
      exerciseId: string;
      reason?: string;
      now?: number;
    }>
  | Readonly<{
      type: "substitute_exercise";
      exerciseId: string;
      replacement: ExerciseSubstitution;
      reason?: string;
      now?: number;
    }>
  | Readonly<{ type: "complete_exercise"; exerciseId: string; now?: number }>
  | Readonly<{ type: "abandon_session"; reason?: string; now?: number }>
  | Readonly<{ type: "complete_session"; now?: number }>
  | Readonly<{ type: "retry_operation"; idempotencyKey: string; now?: number }>
  | Readonly<{
      type: "operation_saved";
      idempotencyKey: string;
      persistedId?: string | undefined;
      now?: number;
    }>
  | Readonly<{
      type: "operation_attempted";
      idempotencyKey: string;
      now?: number;
    }>
  | Readonly<{
      type: "operation_failed";
      idempotencyKey: string;
      errorCode: string;
      errorMessage?: string | undefined;
      conflict?: boolean | undefined;
      retryable?: boolean | undefined;
      failureKind?: RunnerFailureKind | undefined;
      now?: number;
    }>
  | Readonly<{
      type: "resolve_local_tab_conflict";
      idempotencyKey: string;
      now?: number;
    }>
  | Readonly<{
      type: "set_connectivity";
      connectivity: RunnerConnectivity;
      now?: number;
    }>
  | Readonly<{ type: "set_auth"; auth: RunnerAuth; now?: number }>
  | Readonly<{ type: "start_rest"; seconds?: number; now?: number }>
  | Readonly<{ type: "pause_rest"; now?: number }>
  | Readonly<{ type: "resume_rest"; now?: number }>
  | Readonly<{ type: "clear_rest"; now?: number }>;

export type RunnerStorageRecordV1 = Readonly<{
  schemaVersion: 1;
  key: string;
  ownerUid: string;
  sessionId: string;
  state: ActiveWorkoutState;
}>;

export type RunnerStorageRecordV2 = Readonly<{
  schemaVersion: 2;
  key: string;
  ownerUid: string;
  sessionId: string;
  /** Monotonic commit revision within the owner/session record. */
  revision: number;
  /** Stable identity of the browser tab or in-memory writer. */
  writerId: string;
  /** Timestamp captured by the committing writer. */
  committedAt: number;
  state: ActiveWorkoutState;
}>;

export type RunnerStorageRecord = RunnerStorageRecordV1 | RunnerStorageRecordV2;

export type RunnerStorageRecordOptions = Readonly<{
  revision?: number;
  writerId?: string;
  committedAt?: number;
}>;

export type RunnerStorageMergeOptions = Readonly<{
  revision?: number;
  writerId?: string;
  committedAt?: number;
}>;

export interface RunnerStorage {
  load(key: string): Promise<RunnerStorageRecord | undefined>;
  save(key: string, record: RunnerStorageRecord): Promise<RunnerStorageRecordV2>;
  remove(key: string): Promise<void>;
  clearOwner?(ownerUid: string): Promise<void>;
}

export type RunnerStorageErrorCode =
  | "storage_unsupported"
  | "storage_blocked"
  | "storage_quota"
  | "storage_schema_mismatch"
  | "storage_open_failed"
  | "storage_read_failed"
  | "storage_write_failed"
  | "storage_remove_failed"
  | "storage_clear_failed"
  | "storage_corrupt"
  | "storage_clear_unsupported";

export type RunnerStorageOperation =
  "open" | "read" | "write" | "remove" | "clear";

const RUNNER_STORAGE_ERROR_MESSAGES: Readonly<
  Record<RunnerStorageErrorCode, string>
> = {
  storage_unsupported: "Workout drafts are unavailable in this browser.",
  storage_blocked:
    "Workout drafts are unavailable because browser storage is blocked.",
  storage_quota: "The browser cannot store more workout draft data.",
  storage_schema_mismatch:
    "Workout draft storage needs an app update before it can be used.",
  storage_open_failed: "Workout draft storage could not be opened.",
  storage_read_failed: "Workout draft storage could not be read.",
  storage_write_failed: "Workout draft could not be saved on this device.",
  storage_remove_failed: "Workout draft could not be removed from this device.",
  storage_clear_failed: "Workout drafts could not be cleared from this device.",
  storage_corrupt:
    "The saved workout draft is not valid and cannot be restored.",
  storage_clear_unsupported:
    "This storage adapter cannot clear a signed-in user's workout drafts.",
};

const NON_RETRYABLE_STORAGE_ERRORS = new Set<RunnerStorageErrorCode>([
  "storage_unsupported",
  "storage_schema_mismatch",
  "storage_corrupt",
  "storage_clear_unsupported",
]);

export class RunnerStorageError extends Error {
  readonly code: RunnerStorageErrorCode;
  readonly retryable: boolean;
  override readonly cause: unknown;

  constructor(
    code: RunnerStorageErrorCode,
    message = RUNNER_STORAGE_ERROR_MESSAGES[code],
    options: Readonly<{ retryable?: boolean; cause?: unknown }> = {},
  ) {
    super(message);
    this.name = "RunnerStorageError";
    this.code = code;
    this.retryable =
      options.retryable ?? !NON_RETRYABLE_STORAGE_ERRORS.has(code);
    this.cause = options.cause;
  }
}

function unknownErrorName(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("name" in error))
    return undefined;
  const name = (error as { name?: unknown }).name;
  return typeof name === "string" ? name : undefined;
}

function storageErrorCodeFor(
  error: unknown,
  operation: RunnerStorageOperation,
): RunnerStorageErrorCode {
  const name = unknownErrorName(error);
  if (name === "QuotaExceededError") return "storage_quota";
  if (name === "VersionError") return "storage_schema_mismatch";
  if (operation === "open") return "storage_open_failed";
  if (operation === "read") return "storage_read_failed";
  if (operation === "write") return "storage_write_failed";
  if (operation === "remove") return "storage_remove_failed";
  return "storage_clear_failed";
}

export function classifyRunnerStorageError(
  error: unknown,
  operation: RunnerStorageOperation = "open",
): RunnerStorageError {
  if (error instanceof RunnerStorageError) return error;
  const code = storageErrorCodeFor(error, operation);
  return new RunnerStorageError(code, undefined, { cause: error });
}

export type RunnerSubmitResult =
  | Readonly<{ status: "saved"; persistedId?: string }>
  | Readonly<{ status: "duplicate"; persistedId?: string }>
  | Readonly<{
      status: "failed";
      code: string;
      message?: string;
      retryable?: boolean;
      authExpired?: boolean;
      conflict?: boolean;
    }>;

export type RunnerSubmitter =
  | ((operation: RunnerOperation) => Promise<RunnerSubmitResult>)
  | Readonly<{
      submit(operation: RunnerOperation): Promise<RunnerSubmitResult>;
    }>;

export type SyncRunnerOptions = Readonly<{
  storage: RunnerStorage;
  submit: RunnerSubmitter;
  now?: number;
}>;

export type LoadRunnerOptions = Readonly<{
  ownerUid: string;
  sessionId: string;
  snapshot: WorkoutSnapshot;
}>;

export class RunnerTransitionError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "RunnerTransitionError";
    this.code = code;
  }
}

export class RunnerOwnershipError extends Error {
  constructor(
    message = "The workout draft belongs to another signed-in user.",
  ) {
    super(message);
    this.name = "RunnerOwnershipError";
  }
}

function assertString(value: string, fieldName: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new RangeError(`${fieldName} must be a non-empty string`);
  }
}

function assertFiniteNonnegative(value: number, fieldName: string): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new RangeError(`${fieldName} must be finite and nonnegative`);
  }
}

function assertPositiveInteger(value: number, fieldName: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${fieldName} must be a positive integer`);
  }
}

function assertPositiveNumber(value: number, fieldName: string): void {
  assertFiniteNonnegative(value, fieldName);
  if (value <= 0) throw new RangeError(`${fieldName} must be positive`);
}

function assertKind(
  value: string,
  fieldName: string,
): asserts value is MeasurementKind {
  if (!SUPPORTED_KINDS.has(value as MeasurementKind)) {
    throw new RangeError(`${fieldName} must be a supported measurement kind`);
  }
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value))
    return value;
  for (const child of Object.values(value as Record<string, unknown>))
    deepFreeze(child);
  return Object.freeze(value);
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function normalizeTarget(
  input: WorkoutSetTargetInput,
  expectedKind: MeasurementKind,
): WorkoutSetTarget {
  assertKind(input.kind, "target.kind");
  if (input.kind !== expectedKind) {
    throw new RangeError(
      `target kind ${input.kind} does not match exercise logging kind ${expectedKind}`,
    );
  }
  assertFiniteNonnegative(input.restSeconds, "target.restSeconds");
  const allowedFields =
    input.kind === "weight_reps"
      ? new Set([
          "kind",
          "minimumReps",
          "maximumReps",
          "targetWeightKg",
          "restSeconds",
        ])
      : input.kind === "bodyweight_reps"
        ? new Set(["kind", "minimumReps", "maximumReps", "restSeconds"])
        : input.kind === "duration"
          ? new Set(["kind", "minimumSeconds", "maximumSeconds", "restSeconds"])
          : new Set([
              "kind",
              "targetDistanceMeters",
              "targetDurationSeconds",
              "restSeconds",
            ]);
  for (const field of Object.keys(input)) {
    if (!allowedFields.has(field)) {
      throw new RangeError(`target.${field} is not valid for ${input.kind}`);
    }
  }

  if (input.kind === "weight_reps" || input.kind === "bodyweight_reps") {
    assertPositiveInteger(input.minimumReps, "target.minimumReps");
    assertPositiveInteger(input.maximumReps, "target.maximumReps");
    if (input.minimumReps > input.maximumReps) {
      throw new RangeError("target minimumReps cannot exceed maximumReps");
    }
    if (input.kind === "weight_reps") {
      if (input.targetWeightKg !== undefined) {
        assertFiniteNonnegative(input.targetWeightKg, "target.targetWeightKg");
      }
      return {
        kind: input.kind,
        minimumReps: input.minimumReps,
        maximumReps: input.maximumReps,
        ...(input.targetWeightKg === undefined
          ? {}
          : { targetWeightKg: input.targetWeightKg }),
        restSeconds: input.restSeconds,
      };
    }
    return {
      kind: input.kind,
      minimumReps: input.minimumReps,
      maximumReps: input.maximumReps,
      restSeconds: input.restSeconds,
    };
  }

  if (input.kind === "duration") {
    assertPositiveNumber(input.minimumSeconds, "target.minimumSeconds");
    assertPositiveNumber(input.maximumSeconds, "target.maximumSeconds");
    if (input.minimumSeconds > input.maximumSeconds) {
      throw new RangeError(
        "target minimumSeconds cannot exceed maximumSeconds",
      );
    }
    return {
      kind: input.kind,
      minimumSeconds: input.minimumSeconds,
      maximumSeconds: input.maximumSeconds,
      restSeconds: input.restSeconds,
    };
  }

  assertPositiveNumber(
    input.targetDistanceMeters,
    "target.targetDistanceMeters",
  );
  assertPositiveNumber(
    input.targetDurationSeconds,
    "target.targetDurationSeconds",
  );
  return {
    kind: input.kind,
    targetDistanceMeters: input.targetDistanceMeters,
    targetDurationSeconds: input.targetDurationSeconds,
    restSeconds: input.restSeconds,
  };
}

function normalizeCardioOptions(
  options: readonly CardioSnapshotInput[] | undefined,
): readonly CardioSnapshot[] {
  const ids = new Set<string>();
  const modes = new Set<CardioMode>();
  return (options ?? []).map((option) => {
    assertString(option.id, "cardio.id");
    if (ids.has(option.id))
      throw new RangeError(`Duplicate cardio id: ${option.id}`);
    ids.add(option.id);
    if (option.mode !== "walker" && option.mode !== "runner") {
      throw new RangeError("cardio.mode must be walker or runner");
    }
    if (modes.has(option.mode))
      throw new RangeError(`Duplicate cardio mode: ${option.mode}`);
    modes.add(option.mode);
    assertPositiveNumber(
      option.targetDurationSeconds,
      "cardio.targetDurationSeconds",
    );
    if (option.targetDistanceMeters !== undefined) {
      assertPositiveNumber(
        option.targetDistanceMeters,
        "cardio.targetDistanceMeters",
      );
    }
    if (option.targetPaceSecondsPerKilometer !== undefined) {
      assertPositiveNumber(
        option.targetPaceSecondsPerKilometer,
        "cardio.targetPaceSecondsPerKilometer",
      );
    }
    if (option.targetInclinePercent !== undefined) {
      assertFiniteNonnegative(
        option.targetInclinePercent,
        "cardio.targetInclinePercent",
      );
    }
    if (option.notes !== undefined) {
      if (typeof option.notes !== "string")
        throw new RangeError("cardio.notes must be a string");
      if (option.notes.length > 2_000) {
        throw new RangeError("cardio.notes must be 2,000 characters or fewer");
      }
    }
    return clone(option);
  });
}

export function createWorkoutSnapshot(
  input: RunnerSnapshotInput,
): WorkoutSnapshot {
  assertString(input.sessionId, "sessionId");
  assertString(input.ownerUid, "ownerUid");
  assertString(input.programRevisionId, "programRevisionId");
  assertString(input.dayId, "dayId");
  assertString(input.dayName, "dayName");
  if (input.exercises.length === 0)
    throw new RangeError("A workout snapshot needs an exercise");

  const exerciseIds = new Set<string>();
  const setIds = new Set<string>();
  const exercises = input.exercises.map((exercise) => {
    assertString(exercise.id, "exercise.id");
    assertString(exercise.name, "exercise.name");
    assertKind(exercise.loggingKind, "exercise.loggingKind");
    if (exerciseIds.has(exercise.id))
      throw new RangeError(`Duplicate exercise id: ${exercise.id}`);
    exerciseIds.add(exercise.id);
    if (exercise.sets.length === 0)
      throw new RangeError(`Exercise ${exercise.id} needs a set`);

    const sets = exercise.sets.map((set) => {
      assertString(set.id, "set.id");
      if (setIds.has(set.id))
        throw new RangeError(`Duplicate set id: ${set.id}`);
      setIds.add(set.id);
      assertPositiveInteger(set.position, "set.position");
      if (set.phase !== "warmup" && set.phase !== "work") {
        throw new RangeError("set.phase must be warmup or work");
      }
      const target = normalizeTarget(set.target, exercise.loggingKind);
      const previous =
        set.previous === undefined
          ? undefined
          : clone(parseMeasurement(set.previous));
      if (previous !== undefined && previous.kind !== exercise.loggingKind) {
        throw new RangeError(
          `previous measurement for ${set.id} does not match logging kind`,
        );
      }
      return {
        id: set.id,
        position: set.position,
        phase: set.phase,
        target,
        previous,
      };
    });

    const positions = sets.map(({ position }) => position);
    if (new Set(positions).size !== positions.length) {
      throw new RangeError(`Duplicate set position in exercise ${exercise.id}`);
    }
    sets.sort((left, right) => left.position - right.position);
    for (const [index, set] of sets.entries()) {
      set.position = index + 1;
    }
    return {
      id: exercise.id,
      name: exercise.name,
      loggingKind: exercise.loggingKind,
      sets,
    };
  });
  const cardioOptions = normalizeCardioOptions(input.cardioOptions);

  return deepFreeze({
    sessionId: input.sessionId,
    ownerUid: input.ownerUid,
    programRevisionId: input.programRevisionId,
    dayId: input.dayId,
    dayName: input.dayName,
    exercises,
    cardioOptions,
  });
}

export const createActiveWorkoutSnapshot = createWorkoutSnapshot;

export function createSetDraft(kind: MeasurementKind): SetDraft {
  assertKind(kind, "kind");
  if (kind === "weight_reps")
    return { kind, weightKg: undefined, repetitions: undefined };
  if (kind === "bodyweight_reps") {
    return { kind, repetitions: undefined, addedWeightKg: undefined };
  }
  if (kind === "duration") return { kind, durationSeconds: undefined };
  return { kind, distanceMeters: undefined, durationSeconds: undefined };
}

export function createCardioDraft(mode: CardioMode): CardioDraft {
  if (mode !== "walker" && mode !== "runner") {
    throw new RangeError("mode must be walker or runner");
  }
  return {
    mode,
    durationSeconds: undefined,
    distanceMeters: undefined,
    paceSecondsPerKilometer: undefined,
    paceSource: undefined,
    inclinePercent: undefined,
    notes: "",
  };
}

export function derivePaceSecondsPerKilometer(
  durationSeconds: number,
  distanceMeters: number,
): number {
  const pace = durationSeconds / (distanceMeters / 1_000);
  if (!Number.isFinite(pace) || pace <= 0) {
    throw new RangeError("pace must be finite and positive");
  }
  const roundedPace = Math.round(pace);
  if (roundedPace <= 0) {
    throw new RangeError("pace must round to a positive integer");
  }
  return roundedPace;
}

export function validateCardioDraft(
  draft: CardioDraft,
  expectedMode?: CardioMode,
): CardioDraftValidation {
  const issues: string[] = [];
  if (draft.mode !== "walker" && draft.mode !== "runner") {
    issues.push("mode must be walker or runner");
  }
  if (expectedMode !== undefined && draft.mode !== expectedMode) {
    issues.push(`mode must be ${expectedMode}`);
  }
  if (
    draft.durationSeconds === undefined ||
    !Number.isFinite(draft.durationSeconds) ||
    !Number.isInteger(draft.durationSeconds) ||
    draft.durationSeconds <= 0
  ) {
    issues.push("durationSeconds must be a positive integer");
  }
  if (
    draft.distanceMeters !== undefined &&
    (!Number.isFinite(draft.distanceMeters) || draft.distanceMeters <= 0)
  ) {
    issues.push("distanceMeters must be positive when supplied");
  }
  if (
    draft.paceSecondsPerKilometer !== undefined &&
    (!Number.isFinite(draft.paceSecondsPerKilometer) ||
      !Number.isInteger(draft.paceSecondsPerKilometer) ||
      draft.paceSecondsPerKilometer <= 0)
  ) {
    issues.push("paceSecondsPerKilometer must be a positive integer when supplied");
  }
  if (
    draft.inclinePercent !== undefined &&
    (!Number.isFinite(draft.inclinePercent) || draft.inclinePercent < 0)
  ) {
    issues.push("inclinePercent must be nonnegative when supplied");
  }
  if (typeof draft.notes !== "string" || draft.notes.length > 2_000) {
    issues.push("notes must be a string of 2,000 characters or fewer");
  }
  if (issues.length > 0 || draft.durationSeconds === undefined) {
    return { ok: false, issues };
  }

  let paceSecondsPerKilometer = draft.paceSecondsPerKilometer;
  let paceSource = draft.paceSource;
  if (
    paceSource !== undefined &&
    paceSource !== "entered" &&
    paceSource !== "derived"
  ) {
    return { ok: false, issues: ["paceSource must be entered or derived"] };
  }
  if (paceSource === "derived") {
    if (draft.distanceMeters === undefined) {
      return { ok: false, issues: ["derived pace requires distanceMeters"] };
    }
    const derived = derivePaceSecondsPerKilometer(
      draft.durationSeconds,
      draft.distanceMeters,
    );
    if (
      paceSecondsPerKilometer !== undefined &&
      Math.abs(paceSecondsPerKilometer - derived) > 0.000001
    ) {
      return {
        ok: false,
        issues: ["derived pace must match duration and distance"],
      };
    }
    paceSecondsPerKilometer = derived;
  } else if (paceSource === "entered") {
    if (paceSecondsPerKilometer === undefined) {
      return {
        ok: false,
        issues: ["entered pace requires paceSecondsPerKilometer"],
      };
    }
  } else if (paceSecondsPerKilometer !== undefined) {
    paceSource = "entered";
  } else if (draft.distanceMeters !== undefined) {
    paceSecondsPerKilometer = derivePaceSecondsPerKilometer(
      draft.durationSeconds,
      draft.distanceMeters,
    );
    paceSource = "derived";
  }

  return {
    ok: true,
    cardio: {
      mode: draft.mode,
      durationSeconds: draft.durationSeconds,
      distanceMeters: draft.distanceMeters,
      paceSecondsPerKilometer,
      paceSource,
      inclinePercent: draft.inclinePercent,
      notes: draft.notes,
    },
  };
}

export function validateSetDraft(
  draft: SetDraft,
  expectedKind?: MeasurementKind,
): SetDraftValidation {
  if (expectedKind !== undefined && draft.kind !== expectedKind) {
    return { ok: false, issues: [`Draft kind must be ${expectedKind}`] };
  }
  const input: Record<string, unknown> = { kind: draft.kind };
  if (draft.kind === "weight_reps") {
    input["weightKg"] = draft.weightKg;
    input["repetitions"] = draft.repetitions;
  } else if (draft.kind === "bodyweight_reps") {
    input["repetitions"] = draft.repetitions;
    if (draft.addedWeightKg !== undefined)
      input["addedWeightKg"] = draft.addedWeightKg;
  } else if (draft.kind === "duration") {
    input["durationSeconds"] = draft.durationSeconds;
  } else {
    input["distanceMeters"] = draft.distanceMeters;
    input["durationSeconds"] = draft.durationSeconds;
  }
  const result = validateMeasurement(input);
  return result.ok ? result : { ok: false, issues: result.issues };
}

export function parseSetDraft(
  draft: SetDraft,
  expectedKind?: MeasurementKind,
): WorkoutMeasurement {
  const result = validateSetDraft(draft, expectedKind);
  if (!result.ok) {
    throw new RunnerTransitionError("invalid_draft", result.issues.join("; "));
  }
  return result.measurement;
}

function measurementForPhase(
  draft: SetDraft,
  phase: RunnerSetPhase,
): WorkoutMeasurement {
  const result = validateSetDraft(draft);
  if (!result.ok)
    throw new RunnerTransitionError("invalid_draft", result.issues.join("; "));
  const input = {
    ...result.measurement,
    ...(phase === "warmup" ? { isWarmup: true } : {}),
  };
  return parseMeasurement(input);
}

function exerciseAt(
  state: ActiveWorkoutState,
  exerciseId: string,
): WorkoutExerciseSnapshot {
  const exercise = state.snapshot.exercises.find(({ id }) => id === exerciseId);
  if (!exercise)
    throw new RunnerTransitionError(
      "unknown_exercise",
      `Unknown exercise ${exerciseId}`,
    );
  return exercise;
}

function setAt(
  state: ActiveWorkoutState,
  setId: string,
): { exercise: WorkoutExerciseSnapshot; set: WorkoutSetSnapshot } {
  for (const exercise of state.snapshot.exercises) {
    const set = exercise.sets.find(({ id }) => id === setId);
    if (set) return { exercise, set };
  }
  throw new RunnerTransitionError("unknown_set", `Unknown set ${setId}`);
}

function cardioOptionAt(
  state: ActiveWorkoutState,
  mode: CardioMode,
): CardioSnapshot {
  const option = state.snapshot.cardioOptions.find(
    (item) => item.mode === mode,
  );
  if (!option) {
    throw new RunnerTransitionError(
      "unknown_cardio",
      `No ${mode} cardio option is available.`,
    );
  }
  return option;
}

function effectiveLoggingKind(
  state: ActiveWorkoutState,
  exercise: WorkoutExerciseSnapshot,
): MeasurementKind {
  return state.substitutions[exercise.id]?.loggingKind ?? exercise.loggingKind;
}

function timestamp(
  state: ActiveWorkoutState,
  requested: number | undefined,
): number {
  const value = requested ?? state.lastUpdatedAt;
  if (!Number.isFinite(value) || value < 0)
    throw new RangeError("timestamp must be finite and nonnegative");
  return value;
}

function withUpdated(
  state: ActiveWorkoutState,
  patch: Partial<ActiveWorkoutState>,
  at: number,
): ActiveWorkoutState {
  return { ...state, ...patch, lastUpdatedAt: at };
}

function syncForState(
  state: ActiveWorkoutState,
  preferredError?: Readonly<{
    status: "failed" | "conflict";
    code: string;
    message: string | undefined;
  }>,
): RunnerSyncState {
  const failed = state.operations.find(({ status }) => status === "failed");
  if (failed?.failureKind === "conflict") {
    return {
      status: "conflict",
      errorCode: failed.errorCode ?? "conflict",
      errorMessage: failed.errorMessage,
    };
  }
  if (failed?.retryable === false) {
    return {
      status: "failed",
      errorCode: failed.errorCode ?? "operation_failed",
      errorMessage: failed.errorMessage,
    };
  }
  if (preferredError) {
    return {
      status: preferredError.status,
      errorCode: preferredError.code,
      errorMessage: preferredError.message,
    };
  }
  if (state.auth === "revoked")
    return {
      status: "auth_revoked",
      errorCode: "session_revoked",
      errorMessage: undefined,
    };
  if (state.auth === "expired")
    return {
      status: "auth_expired",
      errorCode: "auth_expired",
      errorMessage: undefined,
    };
  if (state.connectivity === "offline")
    return { status: "offline", errorCode: "offline", errorMessage: undefined };
  if (failed) {
    return {
      status: "failed",
      errorCode: failed?.errorCode ?? "operation_failed",
      errorMessage: failed?.errorMessage,
    };
  }
  if (state.operations.some(({ status }) => status === "pending")) {
    return { status: "pending", errorCode: undefined, errorMessage: undefined };
  }
  return { status: "idle", errorCode: undefined, errorMessage: undefined };
}

function isOperationConfirmed(state: ActiveWorkoutState, key: string): boolean {
  return state.operations.some(
    ({ idempotencyKey, status }) =>
      idempotencyKey === key && status === "saved",
  );
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, child]) => child !== undefined)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
  return `{${entries.map(([key, child]) => `${JSON.stringify(key)}:${stableStringify(child)}`).join(",")}}`;
}

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotateRight(value: number, amount: number): number {
  return (value >>> amount) | (value << (32 - amount));
}

function sha256Hex(value: string): string {
  const bytes = new TextEncoder().encode(value);
  const blockLength = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(blockLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const bitLength = bytes.length * 8;
  const lengthOffset = blockLength - 8;
  for (let index = 0; index < 8; index += 1) {
    padded[lengthOffset + index] =
      Math.floor(bitLength / 2 ** (56 - index * 8)) & 0xff;
  }

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  for (let offset = 0; offset < padded.length; offset += 64) {
    const words = new Uint32Array(64);
    for (let index = 0; index < 16; index += 1) {
      const position = offset + index * 4;
      words[index] =
        (padded[position]! << 24) |
        (padded[position + 1]! << 16) |
        (padded[position + 2]! << 8) |
        padded[position + 3]!;
    }
    for (let index = 16; index < 64; index += 1) {
      const lower = words[index - 15]!;
      const upper = words[index - 2]!;
      const smallSigma0 =
        rotateRight(lower, 7) ^ rotateRight(lower, 18) ^ (lower >>> 3);
      const smallSigma1 =
        rotateRight(upper, 17) ^ rotateRight(upper, 19) ^ (upper >>> 10);
      words[index] =
        (words[index - 16]! + smallSigma0 + words[index - 7]! + smallSigma1) >>>
        0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;
    for (let index = 0; index < 64; index += 1) {
      const bigSigma1 =
        rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temporary1 =
        (h + bigSigma1 + choice + SHA256_K[index]! + words[index]!) >>> 0;
      const bigSigma0 =
        rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temporary2 = (bigSigma0 + majority) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temporary1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temporary1 + temporary2) >>> 0;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((word) => word.toString(16).padStart(8, "0"))
    .join("");
}

export function stableIdempotencyKey(value: unknown): string {
  return `mwp_sha256_${sha256Hex(stableStringify(value))}`;
}

export type RunnerOperationSemanticTarget = Readonly<{
  kind:
    | "set"
    | "cardio"
    | "note"
    | "exercise_decision"
    | "session_terminal";
  id: string;
}>;

/**
 * Returns the durable mutation target used by the schema-two merge. The
 * target deliberately excludes the payload value: two values for one target
 * must remain a conflict until a user chooses one.
 */
export function runnerOperationSemanticTarget(
  operation: Pick<RunnerOperation, "kind" | "payload">,
): RunnerOperationSemanticTarget {
  switch (operation.payload.kind) {
    case "save_set":
      return { kind: "set", id: operation.payload.setId };
    case "save_cardio":
      return { kind: "cardio", id: "session" };
    case "save_note":
      return { kind: "note", id: operation.payload.exerciseId };
    case "skip_exercise":
    case "substitute_exercise":
    case "complete_exercise":
      return { kind: "exercise_decision", id: operation.payload.exerciseId };
    case "abandon_session":
    case "complete_session":
      return { kind: "session_terminal", id: operation.payload.sessionId };
  }
}

function semanticTargetKey(target: RunnerOperationSemanticTarget): string {
  return `${target.kind}:${target.id}`;
}

function semanticTargetText(target: RunnerOperationSemanticTarget): string {
  return semanticTargetKey(target);
}

function defaultRunnerWriterId(): string {
  const cryptoObject =
    typeof globalThis === "undefined"
      ? undefined
      : (
          globalThis as typeof globalThis & {
            crypto?: { randomUUID?: () => string };
          }
        ).crypto;
  if (typeof cryptoObject?.randomUUID === "function") {
    return `runner-writer-${cryptoObject.randomUUID()}`;
  }
  return `runner-writer-${stableIdempotencyKey({
    scope: "runner-storage",
    createdAt: Date.now(),
  })}`;
}

let moduleRunnerWriterId: string | undefined;

function runnerWriterId(): string {
  moduleRunnerWriterId ??= defaultRunnerWriterId();
  return moduleRunnerWriterId;
}

export function createRunnerWriterIdentity(): string {
  return defaultRunnerWriterId();
}

function isRunnerOperationKind(value: unknown): value is RunnerOperationKind {
  return (
    value === "save_set" ||
    value === "save_cardio" ||
    value === "save_note" ||
    value === "skip_exercise" ||
    value === "substitute_exercise" ||
    value === "complete_exercise" ||
    value === "abandon_session" ||
    value === "complete_session"
  );
}

function isRunnerOperationStatus(value: unknown): value is RunnerOperationStatus {
  return (
    value === "pending" ||
    value === "saved" ||
    value === "failed" ||
    value === "superseded"
  );
}

function isRunnerFailureKind(value: unknown): value is RunnerFailureKind {
  return (
    value === "transient" ||
    value === "permanent" ||
    value === "conflict" ||
    value === "auth" ||
    value === "offline"
  );
}

function corruptStorage(message: string): never {
  throw new RunnerTransitionError("corrupt_storage", message);
}

function assertFiniteTimestampValue(value: unknown, fieldName: string): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    corruptStorage(`${fieldName} is invalid.`);
  }
}

function assertOptionalStringValue(
  value: unknown,
  fieldName: string,
): void {
  if (value !== undefined && typeof value !== "string") {
    corruptStorage(`${fieldName} is invalid.`);
  }
}

function assertOperationPayloadIntegrity(
  operation: Record<string, unknown>,
  ownerUid: string,
  sessionId: string,
): void {
  const kind = operation["kind"];
  const payload = operation["payload"];
  if (!isRunnerOperationKind(kind) || !isObjectRecord(payload)) {
    corruptStorage("The saved workout operation kind or payload is invalid.");
  }
  if (payload["kind"] !== kind) {
    corruptStorage("The saved workout operation kind does not match payload.");
  }

  const stringField = (fieldName: string): void => {
    if (
      typeof payload[fieldName] !== "string" ||
      payload[fieldName].trim().length === 0
    ) {
      corruptStorage(`The saved workout operation ${fieldName} is invalid.`);
    }
  };

  switch (kind) {
    case "save_set": {
      stringField("setId");
      stringField("exerciseId");
      if (payload["phase"] !== "warmup" && payload["phase"] !== "work") {
        corruptStorage("The saved workout set phase is invalid.");
      }
      if (!isObjectRecord(payload["measurement"])) {
        corruptStorage("The saved workout measurement is invalid.");
      }
      try {
        parseMeasurement(payload["measurement"]);
      } catch {
        corruptStorage("The saved workout measurement is invalid.");
      }
      break;
    }
    case "save_cardio": {
      if (payload["mode"] !== "walker" && payload["mode"] !== "runner") {
        corruptStorage("The saved workout cardio mode is invalid.");
      }
      const cardio = payload["cardio"];
      if (!isObjectRecord(cardio)) {
        corruptStorage("The saved workout cardio is invalid.");
      }
      if (cardio["mode"] !== payload["mode"]) {
        corruptStorage("The saved workout cardio mode does not match payload.");
      }
      assertFiniteTimestampValue(cardio["durationSeconds"], "cardio duration");
      if (
        cardio["distanceMeters"] !== undefined &&
        (typeof cardio["distanceMeters"] !== "number" ||
          !Number.isFinite(cardio["distanceMeters"]) ||
          cardio["distanceMeters"] <= 0)
      ) {
        corruptStorage("The saved workout cardio distance is invalid.");
      }
      if (
        cardio["paceSecondsPerKilometer"] !== undefined &&
        (typeof cardio["paceSecondsPerKilometer"] !== "number" ||
          !Number.isFinite(cardio["paceSecondsPerKilometer"]) ||
          cardio["paceSecondsPerKilometer"] <= 0)
      ) {
        corruptStorage("The saved workout cardio pace is invalid.");
      }
      if (
        cardio["paceSource"] !== undefined &&
        cardio["paceSource"] !== "entered" &&
        cardio["paceSource"] !== "derived"
      ) {
        corruptStorage("The saved workout cardio pace source is invalid.");
      }
      if (
        cardio["inclinePercent"] !== undefined &&
        (typeof cardio["inclinePercent"] !== "number" ||
          !Number.isFinite(cardio["inclinePercent"]) ||
          cardio["inclinePercent"] < 0)
      ) {
        corruptStorage("The saved workout cardio incline is invalid.");
      }
      if (
        typeof cardio["notes"] !== "string" ||
        cardio["notes"].length > 2_000
      ) {
        corruptStorage("The saved workout cardio notes are invalid.");
      }
      break;
    }
    case "save_note":
      stringField("exerciseId");
      if (
        typeof payload["note"] !== "string" ||
        payload["note"].length > 2_000
      ) {
        corruptStorage("The saved workout note is invalid.");
      }
      break;
    case "skip_exercise":
      stringField("exerciseId");
      assertOptionalStringValue(payload["reason"], "operation reason");
      break;
    case "substitute_exercise": {
      stringField("exerciseId");
      const replacement = payload["replacement"];
      if (!isObjectRecord(replacement)) {
        corruptStorage("The saved workout replacement is invalid.");
      }
      if (
        typeof replacement["id"] !== "string" ||
        replacement["id"].trim().length === 0 ||
        typeof replacement["name"] !== "string" ||
        replacement["name"].trim().length === 0 ||
        !SUPPORTED_KINDS.has(replacement["loggingKind"] as MeasurementKind)
      ) {
        corruptStorage("The saved workout replacement is invalid.");
      }
      assertOptionalStringValue(payload["reason"], "operation reason");
      break;
    }
    case "complete_exercise":
      stringField("exerciseId");
      break;
    case "abandon_session":
      if (payload["sessionId"] !== sessionId) {
        corruptStorage("The saved abandonment session does not match record.");
      }
      assertOptionalStringValue(payload["reason"], "operation reason");
      break;
    case "complete_session":
      if (payload["sessionId"] !== sessionId) {
        corruptStorage("The saved completion session does not match record.");
      }
      break;
  }

  const semanticTarget = operation["semanticTarget"];
  if (semanticTarget !== undefined && typeof semanticTarget !== "string") {
    corruptStorage("The saved workout semantic target is invalid.");
  }
  void ownerUid;
}

function assertRunnerOperationIntegrity(
  value: unknown,
  ownerUid: string,
  sessionId: string,
  baseRevision: string,
): RunnerOperation {
  if (!isObjectRecord(value)) {
    corruptStorage("The saved workout operation is not an object.");
  }
  const operation = value as Record<string, unknown>;
  if (
    typeof operation["idempotencyKey"] !== "string" ||
    operation["idempotencyKey"].trim().length === 0 ||
    operation["ownerUid"] !== ownerUid ||
    operation["sessionId"] !== sessionId ||
    operation["baseRevision"] !== baseRevision
  ) {
    if (operation["ownerUid"] !== ownerUid) throw new RunnerOwnershipError();
    corruptStorage("The saved workout operation identity is invalid.");
  }
  if (
    !isRunnerOperationKind(operation["kind"]) ||
    !isRunnerOperationStatus(operation["status"])
  ) {
    corruptStorage("The saved workout operation state is invalid.");
  }
  if (
    typeof operation["sequence"] !== "number" ||
    !Number.isInteger(operation["sequence"]) ||
    operation["sequence"] <= 0
  ) {
    corruptStorage("The saved workout operation sequence is invalid.");
  }
  assertFiniteTimestampValue(operation["createdAt"], "operation createdAt");
  if (
    typeof operation["attempts"] !== "number" ||
    !Number.isInteger(operation["attempts"]) ||
    operation["attempts"] < 0
  ) {
    corruptStorage("The saved workout operation attempts are invalid.");
  }
  assertOptionalStringValue(operation["persistedId"], "operation persistedId");
  assertOptionalStringValue(operation["errorCode"], "operation errorCode");
  assertOptionalStringValue(operation["errorMessage"], "operation errorMessage");
  if (
    operation["retryable"] !== undefined &&
    typeof operation["retryable"] !== "boolean"
  ) {
    corruptStorage("The saved workout operation retry state is invalid.");
  }
  if (
    operation["failureKind"] !== undefined &&
    !isRunnerFailureKind(operation["failureKind"])
  ) {
    corruptStorage("The saved workout operation failure kind is invalid.");
  }
  assertOperationPayloadIntegrity(operation, ownerUid, sessionId);
  const typed = operation as unknown as RunnerOperation;
  if (
    typed.semanticTarget !== undefined &&
    typed.semanticTarget !== semanticTargetText(runnerOperationSemanticTarget(typed))
  ) {
    corruptStorage("The saved workout semantic target does not match payload.");
  }
  return typed;
}

function assertRunnerStateIntegrity(
  value: unknown,
  ownerUid: string,
  sessionId: string,
): ActiveWorkoutState {
  if (!isObjectRecord(value)) {
    corruptStorage("The saved workout state payload is not an object.");
  }
  const state = value as Record<string, unknown>;
  const snapshot = state["snapshot"];
  if (!isObjectRecord(snapshot)) {
    corruptStorage("The saved workout snapshot is not an object.");
  }
  if (snapshot["ownerUid"] !== ownerUid) throw new RunnerOwnershipError();
  if (snapshot["sessionId"] !== sessionId) {
    throw new RunnerTransitionError(
      "snapshot_conflict",
      "The saved workout session identity does not match the requested session.",
    );
  }
  if (
    typeof snapshot["programRevisionId"] !== "string" ||
    snapshot["programRevisionId"].trim().length === 0 ||
    typeof snapshot["dayId"] !== "string" ||
    snapshot["dayId"].trim().length === 0
  ) {
    corruptStorage("The saved workout snapshot identity is invalid.");
  }
  try {
    createWorkoutSnapshot(
      structuredClone(snapshot) as unknown as RunnerSnapshotInput,
    );
  } catch {
    corruptStorage("The saved workout snapshot is invalid.");
  }
  if (!Array.isArray(state["operations"])) {
    corruptStorage("The saved workout operations are not an array.");
  }
  const baseRevision = snapshot["programRevisionId"] as string;
  const operations = state["operations"].map((operation) =>
    assertRunnerOperationIntegrity(operation, ownerUid, sessionId, baseRevision),
  );
  if (
    typeof state["currentExerciseIndex"] !== "number" ||
    !Number.isInteger(state["currentExerciseIndex"]) ||
    typeof state["currentSetIndex"] !== "number" ||
    !Number.isInteger(state["currentSetIndex"]) ||
    typeof state["nextOperationSequence"] !== "number" ||
    !Number.isInteger(state["nextOperationSequence"]) ||
    state["nextOperationSequence"] <= 0
  ) {
    corruptStorage("The saved workout position or sequence is invalid.");
  }
  assertFiniteTimestampValue(state["lastUpdatedAt"], "state lastUpdatedAt");
  if (
    state["status"] !== "active" &&
    state["status"] !== "completing" &&
    state["status"] !== "completed" &&
    state["status"] !== "abandoning" &&
    state["status"] !== "abandoned"
  ) {
    corruptStorage("The saved workout session status is invalid.");
  }
  if (state["connectivity"] !== "online" && state["connectivity"] !== "offline") {
    corruptStorage("The saved workout connectivity state is invalid.");
  }
  if (
    state["auth"] !== "valid" &&
    state["auth"] !== "expired" &&
    state["auth"] !== "revoked"
  ) {
    corruptStorage("The saved workout authentication state is invalid.");
  }
  if (!isObjectRecord(state["sync"])) {
    corruptStorage("The saved workout sync state is invalid.");
  }
  const sync = state["sync"] as Record<string, unknown>;
  if (
    sync["status"] !== "idle" &&
    sync["status"] !== "pending" &&
    sync["status"] !== "offline" &&
    sync["status"] !== "auth_expired" &&
    sync["status"] !== "auth_revoked" &&
    sync["status"] !== "failed" &&
    sync["status"] !== "conflict"
  ) {
    corruptStorage("The saved workout sync status is invalid.");
  }
  assertOptionalStringValue(sync["errorCode"], "sync errorCode");
  assertOptionalStringValue(sync["errorMessage"], "sync errorMessage");
  if (
    !isObjectRecord(state["drafts"]) ||
    !Array.isArray(state["dirtySetIds"]) ||
    !Array.isArray(state["dirtyNoteExerciseIds"]) ||
    !isObjectRecord(state["notesByExercise"]) ||
    !isObjectRecord(state["loggedSets"]) ||
    !Array.isArray(state["skippedExerciseIds"]) ||
    !Array.isArray(state["completedExerciseIds"]) ||
    !isObjectRecord(state["substitutions"])
  ) {
    corruptStorage("The saved workout projection is invalid.");
  }
  return {
    ...(state as unknown as ActiveWorkoutState),
    operations,
  };
}

export function validateRunnerStorageRecord(
  value: unknown,
  options: Readonly<{
    expectedKey?: string;
    ownerUid?: string;
    sessionId?: string;
  }> = {},
): RunnerStorageRecord {
  if (!isObjectRecord(value)) {
    corruptStorage("The saved workout record is not an object.");
  }
  const record = value as Record<string, unknown>;
  if (record["schemaVersion"] !== 1 && record["schemaVersion"] !== 2) {
    corruptStorage("The saved workout state has an unsupported schema version.");
  }
  if (
    typeof record["key"] !== "string" ||
    typeof record["ownerUid"] !== "string" ||
    typeof record["sessionId"] !== "string"
  ) {
    corruptStorage("The saved workout record identity is invalid.");
  }
  if (options.expectedKey !== undefined && record["key"] !== options.expectedKey) {
    corruptStorage("The saved workout state key does not match its owner and session.");
  }
  if (options.ownerUid !== undefined && record["ownerUid"] !== options.ownerUid) {
    throw new RunnerOwnershipError();
  }
  if (
    options.sessionId !== undefined &&
    record["sessionId"] !== options.sessionId
  ) {
    corruptStorage("The saved workout record session does not match its key.");
  }
  const ownerUid = record["ownerUid"];
  const sessionId = record["sessionId"];
  const state = assertRunnerStateIntegrity(record["state"], ownerUid, sessionId);
  if (record["schemaVersion"] === 2) {
    if (
      typeof record["revision"] !== "number" ||
      !Number.isInteger(record["revision"]) ||
      record["revision"] < 0 ||
      typeof record["writerId"] !== "string" ||
      record["writerId"].trim().length === 0
    ) {
      corruptStorage("The saved workout record metadata is invalid.");
    }
    assertFiniteTimestampValue(record["committedAt"], "record committedAt");
    const key = record["key"];
    const writerId = record["writerId"];
    const committedAt = record["committedAt"];
    const revision = record["revision"];
    if (
      typeof key !== "string" ||
      typeof writerId !== "string" ||
      typeof committedAt !== "number" ||
      typeof revision !== "number"
    ) {
      corruptStorage("The saved workout record metadata is invalid.");
    }
    return {
      schemaVersion: 2,
      key,
      ownerUid,
      sessionId,
      revision,
      writerId,
      committedAt,
      state,
    };
  }
  const key = record["key"];
  if (typeof key !== "string") {
    corruptStorage("The saved workout record identity is invalid.");
  }
  return {
    schemaVersion: 1,
    key,
    ownerUid,
    sessionId,
    state,
  };
}

function recordRevision(record: RunnerStorageRecord | undefined): number {
  return record?.schemaVersion === 2 ? record.revision : 0;
}

function recordCommittedAt(record: RunnerStorageRecord | undefined): number {
  return record?.schemaVersion === 2 ? record.committedAt : 0;
}

function operationStatusRank(status: RunnerOperationStatus): number {
  switch (status) {
    case "saved":
      return 4;
    case "failed":
      return 3;
    case "pending":
      return 2;
    case "superseded":
      return 1;
  }
}

type OperationCandidate = Readonly<{
  operation: RunnerOperation;
  state: ActiveWorkoutState;
  fromIncoming: boolean;
}>;

type Mutable<T> = { -readonly [Key in keyof T]: T[Key] };

function operationPayloadMatches(
  left: RunnerOperation,
  right: RunnerOperation,
): boolean {
  return (
    left.kind === right.kind &&
    left.ownerUid === right.ownerUid &&
    left.sessionId === right.sessionId &&
    left.baseRevision === right.baseRevision &&
    stableStringify(left.payload) === stableStringify(right.payload)
  );
}

function chooseOperationCandidate(
  current: OperationCandidate,
  next: OperationCandidate,
): OperationCandidate {
  if (
    current.operation.status === "saved" ||
    next.operation.status === "saved"
  ) {
    return current.operation.status === "saved" ? current : next;
  }
  if (next.state.lastUpdatedAt !== current.state.lastUpdatedAt) {
    return next.state.lastUpdatedAt > current.state.lastUpdatedAt
      ? next
      : current;
  }
  const currentRank = operationStatusRank(current.operation.status);
  const nextRank = operationStatusRank(next.operation.status);
  if (nextRank !== currentRank) return nextRank > currentRank ? next : current;
  if (next.operation.attempts !== current.operation.attempts) {
    return next.operation.attempts > current.operation.attempts ? next : current;
  }
  if (next.operation.createdAt !== current.operation.createdAt) {
    return next.operation.createdAt > current.operation.createdAt
      ? next
      : current;
  }
  return next.fromIncoming ? next : current;
}

function conflictOperation(operation: RunnerOperation): RunnerOperation {
  return {
    ...operation,
    status: "failed",
    errorCode: "local_tab_conflict",
    errorMessage:
      "Another tab saved a different value for this workout target. Choose which value to keep.",
    retryable: false,
    failureKind: "conflict",
  };
}

function supersededOperation(
  operation: RunnerOperation,
  message: string,
): RunnerOperation {
  return {
    ...operation,
    status: "superseded",
    errorCode: "superseded",
    errorMessage: message,
    retryable: false,
    failureKind: undefined,
  };
}

function canonicalOperationPayloadKey(operation: RunnerOperation): string {
  return stableStringify({
    kind: operation.kind,
    payload: operation.payload,
  });
}

function isTerminalOperation(operation: RunnerOperation): boolean {
  return (
    operation.kind === "complete_session" ||
    operation.kind === "abandon_session"
  );
}

function exerciseIdForOperation(
  candidate: OperationCandidate,
): string | undefined {
  switch (candidate.operation.payload.kind) {
    case "save_set": {
      const setId = candidate.operation.payload.setId;
      return candidate.state.snapshot.exercises.find(({ sets }) =>
        sets.some(({ id }) => id === setId),
      )?.id;
    }
    case "save_note":
    case "skip_exercise":
    case "substitute_exercise":
    case "complete_exercise":
      return candidate.operation.payload.exerciseId;
    case "save_cardio":
    case "abandon_session":
    case "complete_session":
      return undefined;
  }
}

function mergeOperationCandidates(
  existing: RunnerStorageRecord | undefined,
  incoming: RunnerStorageRecord,
): Readonly<{
  operations: readonly RunnerOperation[];
  candidates: ReadonlyMap<string, OperationCandidate>;
}> {
  const candidates = new Map<string, OperationCandidate>();
  const add = (
    state: ActiveWorkoutState,
    fromIncoming: boolean,
  ): void => {
    for (const operation of state.operations) {
      const prior = candidates.get(operation.idempotencyKey);
      const candidate = { operation, state, fromIncoming };
      if (prior === undefined) {
        candidates.set(operation.idempotencyKey, candidate);
        continue;
      }
      if (!operationPayloadMatches(prior.operation, operation)) {
        throw new RunnerTransitionError(
          "duplicate_operation",
          "A workout operation key was reused for a different payload.",
        );
      }
      candidates.set(
        operation.idempotencyKey,
        chooseOperationCandidate(prior, candidate),
      );
    }
  };
  if (existing !== undefined) {
    add(existing.state, false);
  }
  add(incoming.state, true);

  const byTarget = new Map<string, OperationCandidate[]>();
  for (const candidate of candidates.values()) {
    const key = semanticTargetKey(
      runnerOperationSemanticTarget(candidate.operation),
    );
    const group = byTarget.get(key) ?? [];
    group.push(candidate);
    byTarget.set(key, group);
  }
  for (const group of byTarget.values()) {
    const equivalentGroups = new Map<string, OperationCandidate[]>();
    for (const candidate of group) {
      if (candidate.operation.status === "superseded") continue;
      const payloadKey = canonicalOperationPayloadKey(candidate.operation);
      const equivalent = equivalentGroups.get(payloadKey) ?? [];
      equivalent.push(candidate);
      equivalentGroups.set(payloadKey, equivalent);
    }
    for (const equivalent of equivalentGroups.values()) {
      if (equivalent.length <= 1) continue;
      const winner = equivalent.reduce(chooseOperationCandidate);
      for (const candidate of equivalent) {
        if (
          candidate.operation.idempotencyKey === winner.operation.idempotencyKey ||
          candidate.operation.status === "saved"
        ) {
          continue;
        }
        candidates.set(candidate.operation.idempotencyKey, {
          ...candidate,
          operation: supersededOperation(
            candidate.operation,
            "Superseded by an equivalent operation with the same payload.",
          ),
        });
      }
    }
    const mergedGroup = group.map(
      (candidate) => candidates.get(candidate.operation.idempotencyKey) ?? candidate,
    );
    const saved = mergedGroup.filter(({ operation }) => operation.status === "saved");
    const active = mergedGroup.filter(
      ({ operation }) =>
        operation.status === "pending" || operation.status === "failed",
    );
    if (saved.length > 0) {
      for (const candidate of active) {
        const sourceContainsConfirmedPredecessor = saved.some(
          ({ operation: savedOperation }) =>
            candidate.state.operations.some(
              (sourceOperation) =>
                sourceOperation.idempotencyKey ===
                savedOperation.idempotencyKey,
            ),
        );
        if (sourceContainsConfirmedPredecessor) {
          continue;
        }
        candidates.set(
          candidate.operation.idempotencyKey,
          {
            ...candidate,
            operation: supersededOperation(
              candidate.operation,
              "Superseded by a server-confirmed value for this target.",
            ),
          },
        );
      }
      continue;
    }
    if (active.length <= 1) continue;
    for (const candidate of active) {
      candidates.set(
        candidate.operation.idempotencyKey,
        {
          ...candidate,
          operation: conflictOperation(candidate.operation),
        },
      );
    }
  }

  const confirmedExerciseDecisions = new Map<string, OperationCandidate[]>();
  for (const candidate of candidates.values()) {
    if (
      candidate.operation.status !== "saved" ||
      (candidate.operation.kind !== "complete_exercise" &&
        candidate.operation.kind !== "skip_exercise")
    ) {
      continue;
    }
    const payload = candidate.operation.payload;
    if (
      payload.kind !== "complete_exercise" &&
      payload.kind !== "skip_exercise"
    ) {
      continue;
    }
    const decisions = confirmedExerciseDecisions.get(payload.exerciseId) ?? [];
    decisions.push(candidate);
    confirmedExerciseDecisions.set(payload.exerciseId, decisions);
  }
  if (confirmedExerciseDecisions.size > 0) {
    for (const candidate of candidates.values()) {
      if (
        candidate.operation.status === "saved" ||
        candidate.operation.status === "superseded"
      ) {
        continue;
      }
      const exerciseId = exerciseIdForOperation(candidate);
      if (exerciseId === undefined) {
        continue;
      }
      const decisions = confirmedExerciseDecisions.get(exerciseId);
      if (decisions === undefined) continue;
      const sourceContainsConfirmedDecision = decisions.some(
        ({ operation: decision }) =>
          candidate.state.operations.some(
            (sourceOperation) =>
              sourceOperation.idempotencyKey === decision.idempotencyKey,
          ),
      );
      if (sourceContainsConfirmedDecision) continue;
      candidates.set(candidate.operation.idempotencyKey, {
        ...candidate,
        operation: supersededOperation(
          candidate.operation,
          "Superseded by the server-confirmed exercise decision.",
        ),
      });
    }
  }

  const confirmedTerminal = [...candidates.values()].find(
    ({ operation }) =>
      operation.status === "saved" && isTerminalOperation(operation),
  );
  if (confirmedTerminal !== undefined) {
    for (const candidate of candidates.values()) {
      if (
        candidate.operation.status === "saved" ||
        candidate.operation.status === "superseded"
      ) {
        continue;
      }
      candidates.set(candidate.operation.idempotencyKey, {
        ...candidate,
        operation: supersededOperation(
          candidate.operation,
          "Superseded by the server-confirmed terminal session state.",
        ),
      });
    }
  }

  const operations = [...candidates.values()]
    .map(({ operation }) => operation)
    .sort(
      (left, right) =>
        left.createdAt - right.createdAt ||
        left.idempotencyKey.localeCompare(right.idempotencyKey),
    )
    .map((operation, index) => ({ ...operation, sequence: index + 1 }));
  return { operations, candidates };
}

function latestState(
  existing: RunnerStorageRecord | undefined,
  incoming: RunnerStorageRecord,
): ActiveWorkoutState {
  if (existing === undefined) return incoming.state;
  return incoming.state.lastUpdatedAt >= existing.state.lastUpdatedAt
    ? incoming.state
    : existing.state;
}

function mergeStateProjections(
  existing: RunnerStorageRecord | undefined,
  incoming: RunnerStorageRecord,
  operations: readonly RunnerOperation[],
  candidates: ReadonlyMap<string, OperationCandidate>,
): ActiveWorkoutState {
  const confirmedTerminal = [...candidates.values()]
    .filter(
      ({ operation }) =>
        operation.status === "saved" && isTerminalOperation(operation),
    )
    .sort(
      (left, right) =>
        left.operation.createdAt - right.operation.createdAt ||
        left.operation.idempotencyKey.localeCompare(
          right.operation.idempotencyKey,
        ),
    )
    .at(-1);
  const base = clone(
    confirmedTerminal?.state ?? latestState(existing, incoming),
  ) as Mutable<ActiveWorkoutState>;
  const drafts: Record<string, SetDraft> = { ...base.drafts };
  const loggedSets: Record<string, LoggedSet> = { ...base.loggedSets };
  const notesByExercise: Record<string, string> = { ...base.notesByExercise };
  const skippedExerciseIds = [...base.skippedExerciseIds];
  const completedExerciseIds = [...base.completedExerciseIds];
  const substitutions: Record<string, ExerciseSubstitution> = {
    ...base.substitutions,
  };
  let cardioMode = base.cardioMode;
  let cardioDraft = base.cardioDraft;
  let loggedCardio = base.loggedCardio;
  let dirtyCardio = base.dirtyCardio;
  const dirtySetIds = [...base.dirtySetIds];
  const dirtyNoteExerciseIds = [...base.dirtyNoteExerciseIds];
  let status = base.status;

  const addUnique = (items: string[], value: string): void => {
    if (!items.includes(value)) items.push(value);
  };
  const remove = (items: string[], value: string): void => {
    const index = items.indexOf(value);
    if (index >= 0) items.splice(index, 1);
  };
  const restoreConfirmedExerciseProjection = (
    exerciseId: string,
    source: ActiveWorkoutState,
  ): void => {
    const exercise = base.snapshot.exercises.find(({ id }) => id === exerciseId);
    for (const set of exercise?.sets ?? []) {
      const draft = source.drafts[set.id];
      if (draft === undefined) delete drafts[set.id];
      else drafts[set.id] = clone(draft);
      const loggedSet = source.loggedSets[set.id];
      if (loggedSet === undefined) delete loggedSets[set.id];
      else loggedSets[set.id] = clone(loggedSet);
      if (source.dirtySetIds.includes(set.id)) addUnique(dirtySetIds, set.id);
      else remove(dirtySetIds, set.id);
    }
    if (
      Object.prototype.hasOwnProperty.call(
        source.notesByExercise,
        exerciseId,
      )
    ) {
      notesByExercise[exerciseId] = source.notesByExercise[exerciseId] ?? "";
    } else {
      delete notesByExercise[exerciseId];
    }
    if (source.dirtyNoteExerciseIds.includes(exerciseId)) {
      addUnique(dirtyNoteExerciseIds, exerciseId);
    } else {
      remove(dirtyNoteExerciseIds, exerciseId);
    }
    const substitution = source.substitutions[exerciseId];
    if (substitution === undefined) delete substitutions[exerciseId];
    else substitutions[exerciseId] = clone(substitution);
  };
  const sourceStateFor = (operation: RunnerOperation): ActiveWorkoutState =>
    candidates.get(operation.idempotencyKey)?.state ?? base;

  for (const operation of operations) {
    if (operation.status === "superseded") continue;
    const source = sourceStateFor(operation);
    switch (operation.payload.kind) {
      case "save_set": {
        const logged = source.loggedSets[operation.payload.setId];
        if (logged?.operationKey === operation.idempotencyKey) {
          loggedSets[operation.payload.setId] = clone(logged);
        }
        const draft = source.drafts[operation.payload.setId];
        if (draft !== undefined) drafts[operation.payload.setId] = clone(draft);
        remove(dirtySetIds, operation.payload.setId);
        break;
      }
      case "save_cardio":
        if (source.loggedCardio?.operationKey === operation.idempotencyKey) {
          cardioMode = source.cardioMode;
          cardioDraft = source.cardioDraft ? clone(source.cardioDraft) : undefined;
          loggedCardio = clone(source.loggedCardio);
          dirtyCardio = source.dirtyCardio;
        }
        break;
      case "save_note":
        if (Object.prototype.hasOwnProperty.call(source.notesByExercise, operation.payload.exerciseId)) {
          notesByExercise[operation.payload.exerciseId] =
            source.notesByExercise[operation.payload.exerciseId] ?? "";
        }
        remove(dirtyNoteExerciseIds, operation.payload.exerciseId);
        break;
      case "skip_exercise":
        restoreConfirmedExerciseProjection(
          operation.payload.exerciseId,
          source,
        );
        addUnique(skippedExerciseIds, operation.payload.exerciseId);
        remove(completedExerciseIds, operation.payload.exerciseId);
        break;
      case "substitute_exercise": {
        const payload = operation.payload;
        substitutions[payload.exerciseId] = clone(payload.replacement);
        const exercise = base.snapshot.exercises.find(
          ({ id }) => id === payload.exerciseId,
        );
        for (const set of exercise?.sets ?? []) {
          delete drafts[set.id];
          delete loggedSets[set.id];
          remove(dirtySetIds, set.id);
        }
        remove(completedExerciseIds, payload.exerciseId);
        break;
      }
      case "complete_exercise":
        restoreConfirmedExerciseProjection(
          operation.payload.exerciseId,
          source,
        );
        addUnique(completedExerciseIds, operation.payload.exerciseId);
        remove(skippedExerciseIds, operation.payload.exerciseId);
        break;
      case "complete_session":
        if (operation.status === "saved") status = "completed";
        else if (status !== "completed" && status !== "abandoned") status = "completing";
        break;
      case "abandon_session":
        if (operation.status === "saved") status = "abandoned";
        else if (status !== "completed" && status !== "abandoned") status = "abandoning";
        break;
    }
  }

  const merged: Mutable<ActiveWorkoutState> = {
    ...base,
    drafts,
    dirtySetIds,
    cardioMode,
    cardioDraft,
    dirtyCardio,
    loggedCardio,
    notesByExercise,
    dirtyNoteExerciseIds,
    loggedSets,
    skippedExerciseIds,
    completedExerciseIds,
    substitutions,
    status,
    operations,
    nextOperationSequence: operations.length + 1,
    lastUpdatedAt: Math.max(existing?.state.lastUpdatedAt ?? 0, incoming.state.lastUpdatedAt),
  };
  return {
    ...merged,
    sync: syncForState(merged),
  };
}

export function mergeRunnerStorageStates(
  existing: ActiveWorkoutState | undefined,
  incoming: ActiveWorkoutState,
): ActiveWorkoutState {
  const incomingRecord = runnerStorageRecord(incoming);
  const existingRecord =
    existing === undefined ? undefined : runnerStorageRecord(existing);
  return mergeRunnerStorageRecords(existingRecord, incomingRecord).state;
}

export function mergeRunnerStorageRecords(
  existing: RunnerStorageRecord | undefined,
  incoming: RunnerStorageRecord,
  options: RunnerStorageMergeOptions = {},
): RunnerStorageRecordV2 {
  const validatedIncoming = validateRunnerStorageRecord(incoming);
  const validatedExisting =
    existing === undefined ? undefined : validateRunnerStorageRecord(existing);
  if (
    validatedExisting !== undefined &&
    (validatedExisting.key !== validatedIncoming.key ||
      validatedExisting.ownerUid !== validatedIncoming.ownerUid ||
      validatedExisting.sessionId !== validatedIncoming.sessionId)
  ) {
    throw new RunnerTransitionError(
      "storage_identity_mismatch",
      "Workout drafts from different owner or session namespaces cannot merge.",
    );
  }
  if (
    validatedExisting !== undefined &&
    (validatedExisting.state.snapshot.programRevisionId !==
      validatedIncoming.state.snapshot.programRevisionId ||
      validatedExisting.state.snapshot.dayId !==
        validatedIncoming.state.snapshot.dayId)
  ) {
    throw new RunnerTransitionError(
      "snapshot_conflict",
      "Workout drafts from different immutable snapshots cannot merge.",
    );
  }
  const mergedOperations = mergeOperationCandidates(
    validatedExisting,
    validatedIncoming,
  );
  const state = mergeStateProjections(
    validatedExisting,
    validatedIncoming,
    mergedOperations.operations,
    mergedOperations.candidates,
  );
  const previousRevision = recordRevision(validatedExisting);
  const requestedRevision = options.revision ?? previousRevision + 1;
  if (
    !Number.isInteger(requestedRevision) ||
    requestedRevision < previousRevision + (validatedExisting === undefined ? 0 : 1)
  ) {
    throw new RunnerTransitionError(
      "storage_revision_conflict",
      "The workout draft storage revision is stale.",
    );
  }
  const requestedCommittedAt =
    options.committedAt ??
    Math.max(
      recordCommittedAt(validatedExisting),
      recordCommittedAt(validatedIncoming),
      state.lastUpdatedAt,
    );
  assertFiniteTimestampValue(requestedCommittedAt, "record committedAt");
  const writerId =
    options.writerId ??
    (validatedIncoming.schemaVersion === 2
      ? validatedIncoming.writerId
      : validatedExisting?.schemaVersion === 2
        ? validatedExisting.writerId
        : runnerWriterId());
  if (writerId.trim().length === 0) {
    throw new RunnerTransitionError(
      "corrupt_storage",
      "The workout draft writer identity is invalid.",
    );
  }
  return deepFreeze({
    schemaVersion: 2,
    key: validatedIncoming.key,
    ownerUid: validatedIncoming.ownerUid,
    sessionId: validatedIncoming.sessionId,
    revision: requestedRevision,
    writerId,
    committedAt: Math.max(requestedCommittedAt, recordCommittedAt(validatedExisting)),
    state: clone(state),
  });
}

export const mergeRunnerStorage = mergeRunnerStorageRecords;
export const mergeRunnerRecords = mergeRunnerStorageRecords;

function queueOperation(
  state: ActiveWorkoutState,
  kind: RunnerOperationKind,
  payload: RunnerOperationPayload,
  at: number,
  options: Readonly<{
    supersedeSetId?: string;
    supersedeCardio?: boolean;
    supersedeNoteExerciseId?: string;
    supersedeForAbandonment?: boolean;
  }> = {},
): { state: ActiveWorkoutState; operation: RunnerOperation } {
  const idempotencyKey = stableIdempotencyKey({
    ownerUid: state.snapshot.ownerUid,
    sessionId: state.snapshot.sessionId,
    kind,
    payload,
  });
  const existing = state.operations.find(
    (operation) => operation.idempotencyKey === idempotencyKey,
  );
  if (existing) return { state, operation: existing };

  const shouldSupersede = (operation: RunnerOperation): boolean => {
    if (operation.status === "saved" || operation.status === "superseded")
      return false;
    if (options.supersedeForAbandonment === true) {
      if (
        operation.kind === "abandon_session" ||
        (operation.kind === "complete_session" &&
          operation.status === "pending")
      ) {
        return false;
      }
      return true;
    }
    if (
      options.supersedeSetId !== undefined &&
      operation.kind === "save_set" &&
      operation.payload.kind === "save_set" &&
      operation.payload.setId === options.supersedeSetId
    ) {
      return true;
    }
    if (options.supersedeCardio === true && operation.kind === "save_cardio") {
      return true;
    }
    return (
      options.supersedeNoteExerciseId !== undefined &&
      operation.kind === "save_note" &&
      operation.payload.kind === "save_note" &&
      operation.payload.exerciseId === options.supersedeNoteExerciseId
    );
  };
  const operations = state.operations.map((operation) => {
    if (!shouldSupersede(operation)) return operation;
    const target =
      operation.kind === "save_set"
        ? "set"
        : operation.kind === "save_cardio"
          ? "cardio"
          : operation.kind === "save_note"
            ? "note"
            : "session";
    return {
      ...operation,
      status: "superseded" as const,
      errorCode: "superseded",
      errorMessage: `Superseded by a newer local ${target} value.`,
      retryable: false,
      failureKind: undefined,
    };
  });

  const operation: RunnerOperation = {
    idempotencyKey,
    kind,
    payload,
    semanticTarget: semanticTargetText(runnerOperationSemanticTarget({ kind, payload })),
    ownerUid: state.snapshot.ownerUid,
    sessionId: state.snapshot.sessionId,
    baseRevision: state.snapshot.programRevisionId,
    sequence: state.nextOperationSequence,
    createdAt: at,
    attempts: 0,
    status: "pending",
    persistedId: undefined,
    errorCode: undefined,
    errorMessage: undefined,
    retryable: undefined,
    failureKind: undefined,
  };
  const next = {
    ...state,
    operations: [...operations, operation],
    nextOperationSequence: state.nextOperationSequence + 1,
    lastUpdatedAt: at,
  };
  return { state: { ...next, sync: syncForState(next) }, operation };
}

function replaceOperation(
  state: ActiveWorkoutState,
  operation: RunnerOperation,
): ActiveWorkoutState {
  const operations = state.operations.map((item) =>
    item.idempotencyKey === operation.idempotencyKey ? operation : item,
  );
  return { ...state, operations, sync: syncForState({ ...state, operations }) };
}

function draftFromMeasurement(measurement: WorkoutMeasurement): SetDraft {
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

function hasSavedSubstitution(
  state: ActiveWorkoutState,
  exerciseId: string,
): boolean {
  return state.operations.some(
    (operation) =>
      operation.status === "saved" &&
      operation.payload.kind === "substitute_exercise" &&
      operation.payload.exerciseId === exerciseId,
  );
}

function projectResolvedLocalConflict(
  state: ActiveWorkoutState,
  chosen: RunnerOperation,
): ActiveWorkoutState {
  const payload = chosen.payload;
  switch (payload.kind) {
    case "save_set":
      return {
        ...state,
        drafts: {
          ...state.drafts,
          [payload.setId]: draftFromMeasurement(payload.measurement),
        },
        dirtySetIds: removeId(state.dirtySetIds, payload.setId),
        loggedSets: {
          ...state.loggedSets,
          [payload.setId]: {
            setId: payload.setId,
            exerciseId: payload.exerciseId,
            phase: payload.phase,
            measurement: clone(payload.measurement),
            operationKey: chosen.idempotencyKey,
          },
        },
      };
    case "save_cardio":
      return {
        ...state,
        cardioMode: payload.mode,
        cardioDraft: clone(payload.cardio),
        dirtyCardio: false,
        loggedCardio: {
          mode: payload.mode,
          cardio: clone(payload.cardio),
          operationKey: chosen.idempotencyKey,
        },
      };
    case "save_note":
      return {
        ...state,
        notesByExercise: {
          ...state.notesByExercise,
          [payload.exerciseId]: payload.note,
        },
        dirtyNoteExerciseIds: removeId(
          state.dirtyNoteExerciseIds,
          payload.exerciseId,
        ),
      };
    case "skip_exercise": {
      const substitutions = { ...state.substitutions };
      if (!hasSavedSubstitution(state, payload.exerciseId)) {
        delete substitutions[payload.exerciseId];
      }
      return {
        ...state,
        skippedExerciseIds: addId(
          state.skippedExerciseIds,
          payload.exerciseId,
        ),
        completedExerciseIds: removeId(
          state.completedExerciseIds,
          payload.exerciseId,
        ),
        substitutions,
      };
    }
    case "substitute_exercise": {
      const exercise = state.snapshot.exercises.find(
        ({ id }) => id === payload.exerciseId,
      );
      const drafts = { ...state.drafts };
      const loggedSets = { ...state.loggedSets };
      let dirtySetIds: readonly string[] = [...state.dirtySetIds];
      for (const set of exercise?.sets ?? []) {
        delete drafts[set.id];
        delete loggedSets[set.id];
        dirtySetIds = removeId(dirtySetIds, set.id);
      }
      return {
        ...state,
        drafts,
        loggedSets,
        dirtySetIds,
        substitutions: {
          ...state.substitutions,
          [payload.exerciseId]: clone(payload.replacement),
        },
        skippedExerciseIds: removeId(
          state.skippedExerciseIds,
          payload.exerciseId,
        ),
        completedExerciseIds: removeId(
          state.completedExerciseIds,
          payload.exerciseId,
        ),
      };
    }
    case "complete_exercise": {
      const substitutions = { ...state.substitutions };
      if (!hasSavedSubstitution(state, payload.exerciseId)) {
        delete substitutions[payload.exerciseId];
      }
      return {
        ...state,
        skippedExerciseIds: removeId(
          state.skippedExerciseIds,
          payload.exerciseId,
        ),
        completedExerciseIds: addId(
          state.completedExerciseIds,
          payload.exerciseId,
        ),
        substitutions,
      };
    }
    case "complete_session":
      return { ...state, status: "completing" };
    case "abandon_session":
      return { ...state, status: "abandoning" };
  }
}

export function resolveRunnerLocalTabConflict(
  state: ActiveWorkoutState,
  idempotencyKey: string,
  now?: number,
): ActiveWorkoutState {
  const chosen = state.operations.find(
    ({ idempotencyKey: key }) => key === idempotencyKey,
  );
  if (
    chosen === undefined ||
    chosen.status !== "failed" ||
    chosen.failureKind !== "conflict" ||
    chosen.errorCode !== "local_tab_conflict"
  ) {
    throw new RunnerTransitionError(
      "unknown_local_tab_conflict",
      "The selected workout value is not an unresolved local-tab conflict.",
    );
  }
  const target = semanticTargetKey(runnerOperationSemanticTarget(chosen));
  const at = timestamp(
    state,
    now === undefined ? state.lastUpdatedAt + 1 : now,
  );
  const operations = state.operations.map((operation) => {
    if (operation.idempotencyKey === idempotencyKey) {
      return {
        ...operation,
        status: "pending" as const,
        errorCode: undefined,
        errorMessage: undefined,
        retryable: undefined,
        failureKind: undefined,
      };
    }
    if (
      (operation.status === "failed" || operation.status === "pending") &&
      semanticTargetKey(runnerOperationSemanticTarget(operation)) === target
    ) {
      return supersededOperation(
        operation,
        "Superseded by the value chosen for this local-tab conflict.",
      );
    }
    return operation;
  });
  const next = {
    ...state,
    operations,
    lastUpdatedAt: at,
  };
  const projected = projectResolvedLocalConflict(next, chosen);
  return { ...projected, sync: syncForState(projected) };
}

function terminalStatusForState(
  state: ActiveWorkoutState,
): "completed" | "abandoned" | undefined {
  if (state.status === "completed" || state.status === "abandoned") {
    return state.status;
  }
  const savedTerminal = state.operations.find(
    ({ kind, status }) =>
      status === "saved" &&
      (kind === "complete_session" || kind === "abandon_session"),
  );
  if (!savedTerminal) return undefined;
  return savedTerminal.kind === "complete_session" ? "completed" : "abandoned";
}

function supersedeUnsavedOperations(
  state: ActiveWorkoutState,
  preservedKey: string,
): ActiveWorkoutState {
  const operations = state.operations.map((operation) => {
    if (
      operation.idempotencyKey === preservedKey ||
      operation.status === "saved" ||
      operation.status === "superseded"
    ) {
      return operation;
    }
    return {
      ...operation,
      status: "superseded" as const,
      errorCode: "superseded",
      errorMessage: "Superseded by retrying session abandonment.",
      retryable: false,
      failureKind: undefined,
    };
  });
  return { ...state, operations, sync: syncForState({ ...state, operations }) };
}

function assertMutable(state: ActiveWorkoutState): void {
  if (
    state.status === "completed" ||
    state.status === "completing" ||
    state.status === "abandoning" ||
    state.status === "abandoned"
  ) {
    throw new RunnerTransitionError(
      "session_closed",
      "This workout session is already closed.",
    );
  }
}

function removeId(ids: readonly string[], id: string): readonly string[] {
  return ids.filter((item) => item !== id);
}

function addId(ids: readonly string[], id: string): readonly string[] {
  return ids.includes(id) ? ids : [...ids, id];
}

export function createRunnerState(
  snapshot: WorkoutSnapshot,
  options: Readonly<{
    now?: number;
    connectivity?: RunnerConnectivity;
    auth?: RunnerAuth;
  }> = {},
): ActiveWorkoutState {
  if (snapshot.exercises.length === 0)
    throw new RangeError("A workout snapshot needs an exercise");
  const now = options.now ?? Date.now();
  if (!Number.isFinite(now) || now < 0)
    throw new RangeError("now must be finite and nonnegative");
  const state: ActiveWorkoutState = {
    snapshot: deepFreeze(clone(snapshot)),
    currentExerciseIndex: 0,
    currentSetIndex: 0,
    status: "active",
    connectivity: options.connectivity ?? "online",
    auth: options.auth ?? "valid",
    sync: { status: "idle", errorCode: undefined, errorMessage: undefined },
    drafts: {},
    dirtySetIds: [],
    cardioMode: undefined,
    cardioDraft: undefined,
    dirtyCardio: false,
    loggedCardio: undefined,
    notesByExercise: {},
    dirtyNoteExerciseIds: [],
    loggedSets: {},
    skippedExerciseIds: [],
    completedExerciseIds: [],
    substitutions: {},
    restTimer: undefined,
    operations: [],
    nextOperationSequence: 1,
    lastUpdatedAt: now,
  };
  return withUpdated(state, { sync: syncForState(state) }, now);
}

export const createRunner = createRunnerState;

export function getActiveSetDisplay(state: ActiveWorkoutState): Readonly<{
  exerciseId: string;
  exerciseName: string;
  setId: string;
  setPosition: number;
  setCount: number;
  phase: RunnerSetPhase;
  isWarmup: boolean;
  previous: WorkoutMeasurement | undefined;
  target: WorkoutSetTarget;
  draft: SetDraft;
}> {
  const exercise = state.snapshot.exercises[state.currentExerciseIndex];
  if (!exercise)
    throw new RunnerTransitionError(
      "invalid_cursor",
      "The active exercise is missing.",
    );
  const set = exercise.sets[state.currentSetIndex];
  if (!set)
    throw new RunnerTransitionError(
      "invalid_cursor",
      "The active set is missing.",
    );
  return {
    exerciseId: exercise.id,
    exerciseName: state.substitutions[exercise.id]?.name ?? exercise.name,
    setId: set.id,
    setPosition: set.position,
    setCount: exercise.sets.length,
    phase: set.phase,
    isWarmup: set.phase === "warmup",
    previous: set.previous,
    target: set.target,
    draft:
      state.drafts[set.id] ??
      createSetDraft(effectiveLoggingKind(state, exercise)),
  };
}

export function getRestTimerView(
  state: ActiveWorkoutState,
  now: number,
): RestTimerView {
  if (!Number.isFinite(now) || now < 0)
    throw new RangeError("now must be finite and nonnegative");
  if (state.restTimer === undefined) {
    return {
      status: "idle",
      startedAt: undefined,
      endsAt: undefined,
      remainingSeconds: 0,
    };
  }
  const timer = state.restTimer;
  const reference = timer.pausedAt ?? now;
  const remainingMilliseconds = Math.max(0, timer.endsAt - reference);
  const remainingSeconds = Math.ceil(remainingMilliseconds / 1_000);
  if (timer.pausedAt !== undefined) {
    return {
      status: "paused",
      startedAt: timer.startedAt,
      endsAt: timer.endsAt,
      remainingSeconds,
    };
  }
  if (now >= timer.endsAt) {
    return {
      status: "complete",
      startedAt: timer.startedAt,
      endsAt: timer.endsAt,
      remainingSeconds: 0,
    };
  }
  return {
    status: "running",
    startedAt: timer.startedAt,
    endsAt: timer.endsAt,
    remainingSeconds,
  };
}

function allWorkSetsLogged(
  state: ActiveWorkoutState,
  exercise: WorkoutExerciseSnapshot,
): boolean {
  return exercise.sets
    .filter(({ phase }) => phase === "work")
    .every(({ id }) => state.loggedSets[id] !== undefined);
}

function requiredWorkOperationsConfirmed(state: ActiveWorkoutState): boolean {
  for (const exercise of state.snapshot.exercises) {
    if (state.skippedExerciseIds.includes(exercise.id)) continue;
    for (const set of exercise.sets) {
      if (set.phase !== "work") continue;
      const logged = state.loggedSets[set.id];
      if (!logged || !isOperationConfirmed(state, logged.operationKey))
        return false;
    }
  }
  return true;
}

function requiredCardioOperationConfirmed(state: ActiveWorkoutState): boolean {
  if (state.snapshot.cardioOptions.length === 0) return true;
  if (!state.loggedCardio) return false;
  return isOperationConfirmed(state, state.loggedCardio.operationKey);
}

function ensureCompleteSession(state: ActiveWorkoutState): void {
  if (state.snapshot.cardioOptions.length > 0 && !state.loggedCardio) {
    throw new RunnerTransitionError(
      "required_cardio_missing",
      "Select and save the required cardio option before completing the session.",
    );
  }
  if (!requiredCardioOperationConfirmed(state)) {
    throw new RunnerTransitionError(
      "required_operations_unconfirmed",
      "The required cardio log must be saved and confirmed before completing the session.",
    );
  }
  for (const exercise of state.snapshot.exercises) {
    if (state.skippedExerciseIds.includes(exercise.id)) continue;
    if (!state.completedExerciseIds.includes(exercise.id)) {
      throw new RunnerTransitionError(
        "exercise_not_completed",
        `Explicitly complete or skip ${exercise.name} before completing the session.`,
      );
    }
    if (!allWorkSetsLogged(state, exercise)) {
      throw new RunnerTransitionError(
        "required_sets_missing",
        `Log every work set for ${exercise.name} before completing the session.`,
      );
    }
  }
  if (!requiredWorkOperationsConfirmed(state)) {
    throw new RunnerTransitionError(
      "required_operations_unconfirmed",
      "Every required work set must be saved and confirmed before completing the session.",
    );
  }
  if (
    state.dirtySetIds.length > 0 ||
    state.dirtyCardio ||
    state.dirtyNoteExerciseIds.length > 0
  ) {
    throw new RunnerTransitionError(
      "dirty_draft",
      "Save or discard every local draft before completing the session.",
    );
  }
  if (
    state.operations.some(
      ({ status, kind }) =>
        kind !== "complete_session" &&
        kind !== "abandon_session" &&
        status !== "saved" &&
        status !== "superseded",
    )
  ) {
    throw new RunnerTransitionError(
      "required_operations_unconfirmed",
      "Every runner operation must be confirmed before completing the session.",
    );
  }
}

export function runnerReducer(
  state: ActiveWorkoutState,
  action: RunnerAction,
): ActiveWorkoutState {
  const at = timestamp(state, "now" in action ? action.now : undefined);

  if (action.type === "complete_session" && state.status === "completing") {
    return state;
  }
  if (action.type === "abandon_session" && state.status === "abandoning") {
    return state;
  }
  if (
    action.type === "complete_session" &&
    state.operations.some(
      ({ kind, status }) => kind === "abandon_session" && status === "pending",
    )
  ) {
    throw new RunnerTransitionError(
      "session_abandoning",
      "A workout cannot be completed while abandonment is pending.",
    );
  }
  if (action.type === "abandon_session" && state.status === "completing") {
    throw new RunnerTransitionError(
      "session_completing",
      "A workout cannot be abandoned while completion is being saved.",
    );
  }
  if (
    action.type === "abandon_session" &&
    state.operations.some(
      ({ kind, status }) => kind === "complete_session" && status === "pending",
    )
  ) {
    throw new RunnerTransitionError(
      "session_completing",
      "A workout cannot be abandoned while completion is pending.",
    );
  }

  if (action.type === "navigate_exercise") {
    assertMutable(state);
    if (
      !Number.isInteger(action.index) ||
      action.index < 0 ||
      action.index >= state.snapshot.exercises.length
    ) {
      return state;
    }
    return withUpdated(
      state,
      { currentExerciseIndex: action.index, currentSetIndex: 0 },
      at,
    );
  }
  if (action.type === "navigate_set") {
    assertMutable(state);
    const exercise = state.snapshot.exercises[state.currentExerciseIndex];
    if (
      !exercise ||
      !Number.isInteger(action.index) ||
      action.index < 0 ||
      action.index >= exercise.sets.length
    ) {
      return state;
    }
    return withUpdated(state, { currentSetIndex: action.index }, at);
  }
  if (action.type === "set_connectivity") {
    const next = {
      ...state,
      connectivity: action.connectivity,
      lastUpdatedAt: at,
    };
    return { ...next, sync: syncForState(next) };
  }
  if (action.type === "set_auth") {
    const next = { ...state, auth: action.auth, lastUpdatedAt: at };
    return { ...next, sync: syncForState(next) };
  }
  if (action.type === "start_rest") {
    assertMutable(state);
    const display = getActiveSetDisplay(state);
    const seconds = action.seconds ?? display.target.restSeconds;
    assertFiniteNonnegative(seconds, "rest seconds");
    const restTimer: RestTimer = {
      startedAt: at,
      endsAt: at + seconds * 1_000,
      pausedAt: undefined,
    };
    return withUpdated(state, { restTimer }, at);
  }
  if (action.type === "pause_rest") {
    assertMutable(state);
    if (state.restTimer === undefined || state.restTimer.pausedAt !== undefined)
      return state;
    return withUpdated(
      state,
      { restTimer: { ...state.restTimer, pausedAt: at } },
      at,
    );
  }
  if (action.type === "resume_rest") {
    assertMutable(state);
    if (state.restTimer === undefined || state.restTimer.pausedAt === undefined)
      return state;
    const remaining = Math.max(
      0,
      state.restTimer.endsAt - state.restTimer.pausedAt,
    );
    return withUpdated(
      state,
      {
        restTimer: {
          startedAt: at,
          endsAt: at + remaining,
          pausedAt: undefined,
        },
      },
      at,
    );
  }
  if (action.type === "clear_rest") {
    assertMutable(state);
    return withUpdated(state, { restTimer: undefined }, at);
  }

  const isOperationLifecycleAction =
    action.type === "retry_operation" ||
    action.type === "operation_attempted" ||
    action.type === "operation_saved" ||
    action.type === "operation_failed";
  if (!(
    (state.status === "abandoning" || state.status === "completing") &&
    isOperationLifecycleAction
  )) {
    assertMutable(state);
  }

  if (action.type === "update_set_draft") {
    const { exercise } = setAt(state, action.setId);
    const expectedKind = effectiveLoggingKind(state, exercise);
    if (action.draft.kind !== expectedKind) {
      throw new RunnerTransitionError(
        "invalid_draft",
        `Set ${action.setId} accepts ${expectedKind} drafts, not ${action.draft.kind}.`,
      );
    }
    return withUpdated(
      state,
      {
        drafts: { ...state.drafts, [action.setId]: clone(action.draft) },
        dirtySetIds: addId(state.dirtySetIds, action.setId),
      },
      at,
    );
  }

  if (action.type === "save_set") {
    const { exercise, set } = setAt(state, action.setId);
    const draft = state.drafts[action.setId];
    if (!draft)
      throw new RunnerTransitionError(
        "missing_draft",
        `Enter a value for set ${action.setId}.`,
      );
    if (draft.kind !== effectiveLoggingKind(state, exercise)) {
      throw new RunnerTransitionError(
        "invalid_draft",
        `Set ${action.setId} has the wrong logging kind.`,
      );
    }
    const measurement = measurementForPhase(draft, set.phase);
    const payload: SaveSetOperationPayload = {
      kind: "save_set",
      setId: set.id,
      exerciseId: exercise.id,
      phase: set.phase,
      measurement,
    };
    const queued = queueOperation(state, "save_set", payload, at, {
      supersedeSetId: set.id,
    });
    const loggedSets = {
      ...queued.state.loggedSets,
      [set.id]: {
        setId: set.id,
        exerciseId: exercise.id,
        phase: set.phase,
        measurement,
        operationKey: queued.operation.idempotencyKey,
      },
    };
    return withUpdated(
      queued.state,
      { loggedSets, dirtySetIds: removeId(queued.state.dirtySetIds, set.id) },
      at,
    );
  }

  if (action.type === "select_cardio") {
    assertMutable(state);
    cardioOptionAt(state, action.mode);
    const modeChanged = state.cardioMode !== action.mode;
    const draft =
      state.cardioDraft?.mode === action.mode
        ? state.cardioDraft
        : createCardioDraft(action.mode);
    return withUpdated(
      state,
      {
        cardioMode: action.mode,
        cardioDraft: draft,
        loggedCardio: modeChanged ? undefined : state.loggedCardio,
        dirtyCardio: modeChanged
          ? state.loggedCardio !== undefined || state.dirtyCardio
          : state.dirtyCardio,
      },
      at,
    );
  }

  if (action.type === "update_cardio_draft") {
    assertMutable(state);
    cardioOptionAt(state, action.draft.mode);
    return withUpdated(
      state,
      {
        cardioMode: action.draft.mode,
        cardioDraft: clone(action.draft),
        dirtyCardio: true,
        loggedCardio: undefined,
      },
      at,
    );
  }

  if (action.type === "save_cardio") {
    assertMutable(state);
    if (!state.cardioMode || !state.cardioDraft) {
      throw new RunnerTransitionError(
        "missing_cardio_draft",
        "Select a cardio option and enter its values before saving.",
      );
    }
    const option = cardioOptionAt(state, state.cardioMode);
    const result = validateCardioDraft(state.cardioDraft, state.cardioMode);
    if (!result.ok) {
      throw new RunnerTransitionError(
        "invalid_cardio_draft",
        result.issues.join("; "),
      );
    }
    const payload: SaveCardioOperationPayload = {
      kind: "save_cardio",
      mode: option.mode,
      cardio: result.cardio,
    };
    const queued = queueOperation(state, "save_cardio", payload, at, {
      supersedeCardio: true,
    });
    return withUpdated(
      queued.state,
      {
        loggedCardio: {
          mode: option.mode,
          cardio: result.cardio,
          operationKey: queued.operation.idempotencyKey,
        },
        dirtyCardio: false,
      },
      at,
    );
  }

  if (action.type === "update_note") {
    exerciseAt(state, action.exerciseId);
    return withUpdated(
      state,
      {
        notesByExercise: {
          ...state.notesByExercise,
          [action.exerciseId]: action.note,
        },
        dirtyNoteExerciseIds: addId(
          state.dirtyNoteExerciseIds,
          action.exerciseId,
        ),
      },
      at,
    );
  }
  if (action.type === "save_note") {
    exerciseAt(state, action.exerciseId);
    const note = state.notesByExercise[action.exerciseId] ?? "";
    const payload: SaveNoteOperationPayload = {
      kind: "save_note",
      exerciseId: action.exerciseId,
      note,
    };
    const queued = queueOperation(state, "save_note", payload, at, {
      supersedeNoteExerciseId: action.exerciseId,
    });
    return withUpdated(
      queued.state,
      {
        dirtyNoteExerciseIds: removeId(
          queued.state.dirtyNoteExerciseIds,
          action.exerciseId,
        ),
      },
      at,
    );
  }
  if (action.type === "skip_exercise") {
    exerciseAt(state, action.exerciseId);
    const payload: SkipExerciseOperationPayload = {
      kind: "skip_exercise",
      exerciseId: action.exerciseId,
      reason: action.reason,
    };
    const queued = queueOperation(state, "skip_exercise", payload, at);
    const exercise = state.snapshot.exercises.find(
      ({ id }) => id === action.exerciseId,
    );
    const skippedSetIds = exercise?.sets.map(({ id }) => id) ?? [];
    return withUpdated(
      queued.state,
      {
        skippedExerciseIds: addId(
          queued.state.skippedExerciseIds,
          action.exerciseId,
        ),
        dirtySetIds: queued.state.dirtySetIds.filter(
          (id) => !skippedSetIds.includes(id),
        ),
      },
      at,
    );
  }
  if (action.type === "substitute_exercise") {
    const exercise = exerciseAt(state, action.exerciseId);
    const exerciseSetIds = new Set(exercise.sets.map(({ id }) => id));
    const hasLoggedOrQueuedSet =
      exercise.sets.some(({ id }) => state.loggedSets[id] !== undefined) ||
      state.operations.some(
        (operation) =>
          operation.kind === "save_set" &&
          operation.payload.kind === "save_set" &&
          operation.payload.exerciseId === exercise.id &&
          exerciseSetIds.has(operation.payload.setId),
      );
    if (hasLoggedOrQueuedSet) {
      throw new RunnerTransitionError(
        "substitution_after_logging",
        "This exercise cannot be substituted after a set has been logged or queued.",
      );
    }
    assertString(action.replacement.id, "replacement.id");
    assertString(action.replacement.name, "replacement.name");
    assertKind(action.replacement.loggingKind, "replacement.loggingKind");
    if (action.replacement.loggingKind !== exercise.loggingKind) {
      throw new RunnerTransitionError(
        "incompatible_substitution",
        `Replacement logging kind ${action.replacement.loggingKind} does not match ${exercise.loggingKind}; retained targets cannot be reinterpreted.`,
      );
    }
    const payload: SubstituteExerciseOperationPayload = {
      kind: "substitute_exercise",
      exerciseId: action.exerciseId,
      replacement: clone(action.replacement),
      reason: action.reason,
    };
    const queued = queueOperation(state, "substitute_exercise", payload, at);
    const setIds = exercise?.sets.map(({ id }) => id) ?? [];
    const drafts = { ...queued.state.drafts };
    const loggedSets = { ...queued.state.loggedSets };
    for (const setId of setIds) {
      delete drafts[setId];
      delete loggedSets[setId];
    }
    return withUpdated(
      queued.state,
      {
        substitutions: {
          ...queued.state.substitutions,
          [action.exerciseId]: clone(action.replacement),
        },
        drafts,
        loggedSets,
        dirtySetIds: queued.state.dirtySetIds.filter(
          (id) => !setIds.includes(id),
        ),
        completedExerciseIds: removeId(
          queued.state.completedExerciseIds,
          action.exerciseId,
        ),
      },
      at,
    );
  }
  if (action.type === "complete_exercise") {
    const exercise = exerciseAt(state, action.exerciseId);
    if (state.skippedExerciseIds.includes(action.exerciseId)) {
      throw new RunnerTransitionError(
        "exercise_skipped",
        "A skipped exercise cannot be completed.",
      );
    }
    if (!allWorkSetsLogged(state, exercise)) {
      throw new RunnerTransitionError(
        "required_sets_missing",
        "Log every work set before completing the exercise.",
      );
    }
    const payload: CompleteExerciseOperationPayload = {
      kind: "complete_exercise",
      exerciseId: action.exerciseId,
    };
    const queued = queueOperation(state, "complete_exercise", payload, at);
    return withUpdated(
      queued.state,
      {
        completedExerciseIds: addId(
          queued.state.completedExerciseIds,
          action.exerciseId,
        ),
      },
      at,
    );
  }
  if (action.type === "abandon_session") {
    const payload: AbandonSessionOperationPayload = {
      kind: "abandon_session",
      sessionId: state.snapshot.sessionId,
      reason: action.reason,
    };
    const queued = queueOperation(state, "abandon_session", payload, at, {
      supersedeForAbandonment: true,
    });
    return withUpdated(queued.state, { status: "abandoning" }, at);
  }
  if (action.type === "complete_session") {
    ensureCompleteSession(state);
    const payload: CompleteSessionOperationPayload = {
      kind: "complete_session",
      sessionId: state.snapshot.sessionId,
    };
    const queued = queueOperation(state, "complete_session", payload, at);
    return withUpdated(queued.state, { status: "completing" }, at);
  }
  if (action.type === "retry_operation") {
    const operation = state.operations.find(
      ({ idempotencyKey }) => idempotencyKey === action.idempotencyKey,
    );
    if (!operation)
      throw new RunnerTransitionError(
        "unknown_operation",
        "The operation no longer exists.",
      );
    if (operation.status !== "failed") return state;
    if (
      operation.retryable === false ||
      operation.failureKind === "conflict" ||
      operation.failureKind === "permanent"
    ) {
      throw new RunnerTransitionError(
        "retry_not_allowed",
        "This operation is not retryable and requires conflict resolution.",
      );
    }
    const retried: RunnerOperation = {
      ...operation,
      status: "pending",
      errorCode: undefined,
      errorMessage: undefined,
      retryable: undefined,
      failureKind: undefined,
    };
    if (operation.kind === "complete_session") {
      ensureCompleteSession(state);
    }
    let next = replaceOperation({ ...state, lastUpdatedAt: at }, retried);
    if (operation.kind === "abandon_session") {
      next = supersedeUnsavedOperations(next, operation.idempotencyKey);
    }
    const status =
      operation.kind === "complete_session"
        ? "completing"
        : operation.kind === "abandon_session"
          ? "abandoning"
          : next.status;
    next = { ...next, status };
    return { ...next, sync: syncForState(next) };
  }
  if (action.type === "operation_attempted") {
    const operation = state.operations.find(
      ({ idempotencyKey }) => idempotencyKey === action.idempotencyKey,
    );
    if (!operation)
      throw new RunnerTransitionError(
        "unknown_operation",
        "The operation no longer exists.",
      );
    if (operation.status !== "pending") return state;
    const attempted: RunnerOperation = {
      ...operation,
      attempts: operation.attempts + 1,
    };
    return replaceOperation({ ...state, lastUpdatedAt: at }, attempted);
  }
  if (action.type === "operation_saved") {
    const operation = state.operations.find(
      ({ idempotencyKey }) => idempotencyKey === action.idempotencyKey,
    );
    if (!operation)
      throw new RunnerTransitionError(
        "unknown_operation",
        "The operation no longer exists.",
      );
    if (operation.status === "saved") return state;
    if (operation.status !== "pending") return state;
    const saved: RunnerOperation = {
      ...operation,
      status: "saved",
      persistedId: action.persistedId ?? operation.persistedId,
      errorCode: undefined,
      errorMessage: undefined,
      retryable: undefined,
      failureKind: undefined,
    };
    const next = replaceOperation({ ...state, lastUpdatedAt: at }, saved);
    return {
      ...next,
      status:
        saved.kind === "complete_session"
          ? "completed"
          : saved.kind === "abandon_session"
            ? "abandoned"
            : next.status,
      sync: syncForState(next),
    };
  }
  if (action.type === "operation_failed") {
    const operation = state.operations.find(
      ({ idempotencyKey }) => idempotencyKey === action.idempotencyKey,
    );
    if (!operation)
      throw new RunnerTransitionError(
        "unknown_operation",
        "The operation no longer exists.",
      );
    if (operation.status !== "pending") return state;
    const failed: RunnerOperation = {
      ...operation,
      status: "failed",
      errorCode: action.errorCode,
      errorMessage: action.errorMessage,
      retryable: action.retryable ?? true,
      failureKind:
        action.failureKind ??
        (action.conflict === true
          ? "conflict"
          : action.retryable === false
            ? "permanent"
            : "transient"),
    };
    const next = replaceOperation({ ...state, lastUpdatedAt: at }, failed);
    const recovered =
      failed.kind === "complete_session" || failed.kind === "abandon_session"
        ? { ...next, status: "active" as const }
        : next;
    return {
      ...recovered,
      sync: syncForState(recovered, {
        status: action.conflict === true ? "conflict" : "failed",
        code: action.errorCode,
        message: action.errorMessage,
      }),
    };
  }

  if (action.type === "resolve_local_tab_conflict") {
    return resolveRunnerLocalTabConflict(
      state,
      action.idempotencyKey,
      action.now,
    );
  }

  return state;
}

export const reduceRunner = runnerReducer;

export function isNavigationBlocked(state: ActiveWorkoutState): boolean {
  if (state.status === "completed" || state.status === "abandoned")
    return false;
  return (
    state.status === "completing" ||
    state.dirtySetIds.length > 0 ||
    state.dirtyCardio ||
    state.dirtyNoteExerciseIds.length > 0 ||
    state.operations.some(
      ({ status }) => status !== "saved" && status !== "superseded",
    )
  );
}

export function canNavigateAway(state: ActiveWorkoutState): boolean {
  return !isNavigationBlocked(state);
}

export function navigationProtectionReason(
  state: ActiveWorkoutState,
): string | undefined {
  if (state.status === "completing") return "The workout is still being saved.";
  if (
    state.dirtySetIds.length > 0 ||
    state.dirtyCardio ||
    state.dirtyNoteExerciseIds.length > 0
  )
    return "Unsaved local workout changes remain.";
  if (state.operations.some(({ failureKind }) => failureKind === "conflict"))
    return "A workout save conflicts with server state and needs resolution.";
  if (state.operations.some(({ status }) => status === "failed"))
    return "A workout save failed and needs retry.";
  if (state.operations.some(({ status }) => status === "pending"))
    return "A workout save is still pending.";
  return undefined;
}

export const shouldBlockNavigation = isNavigationBlocked;
export const shouldProtectNavigation = isNavigationBlocked;
export const getSetDisplayData = getActiveSetDisplay;

export function runnerStorageKey(ownerUid: string, sessionId: string): string {
  assertString(ownerUid, "ownerUid");
  assertString(sessionId, "sessionId");
  return `runner:${encodeURIComponent(ownerUid)}:${encodeURIComponent(sessionId)}`;
}

function parseRunnerStorageKeyForDomain(
  key: string,
): Readonly<{ ownerUid: string; sessionId: string }> | undefined {
  if (typeof key !== "string" || !key.startsWith("runner:")) return undefined;
  const encoded = key.slice("runner:".length);
  const separator = encoded.indexOf(":");
  if (separator <= 0 || separator >= encoded.length - 1) return undefined;
  try {
    const ownerUid = decodeURIComponent(encoded.slice(0, separator));
    const sessionId = decodeURIComponent(encoded.slice(separator + 1));
    if (
      ownerUid.length === 0 ||
      sessionId.length === 0 ||
      runnerStorageKey(ownerUid, sessionId) !== key
    ) {
      return undefined;
    }
    return { ownerUid, sessionId };
  } catch {
    return undefined;
  }
}

function assertRunnerStorageKeyOwner(
  key: string,
  ownerUid: string | undefined,
): Readonly<{ ownerUid: string; sessionId: string }> {
  const parsed = parseRunnerStorageKeyForDomain(key);
  if (parsed === undefined) {
    throw new RunnerStorageError(
      "storage_corrupt",
      "The workout draft key is not valid.",
    );
  }
  if (ownerUid !== undefined && parsed.ownerUid !== ownerUid) {
    throw new RunnerOwnershipError();
  }
  return parsed;
}

function cloneStorageRecord(record: RunnerStorageRecord): RunnerStorageRecord {
  return clone(record);
}

export type InMemoryRunnerStorageOptions = Readonly<{
  ownerUid?: string;
  writerId?: string;
  clock?: () => number;
  /** Supply a map when multiple in-memory tabs should share one namespace. */
  records?: Map<string, RunnerStorageRecord>;
}>;

export class InMemoryRunnerStorage implements RunnerStorage {
  private readonly records: Map<string, RunnerStorageRecord>;
  private readonly ownerUid: string | undefined;
  private readonly writerId: string;
  private readonly clock: () => number;

  constructor(options: InMemoryRunnerStorageOptions = {}) {
    if (options.ownerUid !== undefined) assertString(options.ownerUid, "ownerUid");
    if (options.writerId !== undefined) assertString(options.writerId, "writerId");
    this.records = options.records ?? new Map<string, RunnerStorageRecord>();
    this.ownerUid = options.ownerUid;
    this.writerId = options.writerId ?? runnerWriterId();
    this.clock = options.clock ?? (() => Date.now());
  }

  async load(key: string): Promise<RunnerStorageRecord | undefined> {
    const expected = assertRunnerStorageKeyOwner(key, this.ownerUid);
    const record = this.records.get(key);
    if (record === undefined) return undefined;
    return cloneStorageRecord(
      validateRunnerStorageRecord(record, {
        expectedKey: key,
        ownerUid: expected.ownerUid,
        sessionId: expected.sessionId,
      }),
    );
  }

  async save(
    key: string,
    record: RunnerStorageRecord,
  ): Promise<RunnerStorageRecordV2> {
    const expected = assertRunnerStorageKeyOwner(key, this.ownerUid);
    const validated = validateRunnerStorageRecord(record, {
      expectedKey: key,
      ownerUid: expected.ownerUid,
      sessionId: expected.sessionId,
    });
    const current = this.records.get(key);
    const committed = mergeRunnerStorageRecords(current, validated, {
      revision: recordRevision(current) + 1,
      writerId: this.writerId,
      committedAt: Math.max(validated.state.lastUpdatedAt, this.clock()),
    });
    this.records.set(key, cloneStorageRecord(committed));
    return clone(committed);
  }

  async remove(key: string): Promise<void> {
    assertRunnerStorageKeyOwner(key, this.ownerUid);
    this.records.delete(key);
  }

  async clearOwner(ownerUid: string): Promise<void> {
    assertString(ownerUid, "ownerUid");
    if (this.ownerUid !== undefined && this.ownerUid !== ownerUid) {
      throw new RunnerOwnershipError();
    }
    for (const key of this.records.keys()) {
      if (parseRunnerStorageKeyForDomain(key)?.ownerUid === ownerUid) {
        this.records.delete(key);
      }
    }
  }
}

export function createInMemoryRunnerStorage(
  options: InMemoryRunnerStorageOptions = {},
): InMemoryRunnerStorage {
  return new InMemoryRunnerStorage(options);
}

export async function clearRunnerNamespace(
  storage: RunnerStorage,
  ownerUid: string,
): Promise<void> {
  assertString(ownerUid, "ownerUid");
  if (typeof storage.clearOwner !== "function") {
    throw new RunnerStorageError("storage_clear_unsupported");
  }
  await storage.clearOwner(ownerUid);
}

export function runnerStorageRecord(
  state: ActiveWorkoutState,
  options: RunnerStorageRecordOptions = {},
): RunnerStorageRecordV2 {
  const key = runnerStorageKey(
    state.snapshot.ownerUid,
    state.snapshot.sessionId,
  );
  const revision = options.revision ?? 0;
  const committedAt = options.committedAt ?? state.lastUpdatedAt;
  if (!Number.isInteger(revision) || revision < 0) {
    throw new RangeError("revision must be a nonnegative integer");
  }
  assertFiniteTimestampValue(committedAt, "record committedAt");
  const writerId = options.writerId ?? runnerWriterId();
  assertString(writerId, "writerId");
  return deepFreeze({
    schemaVersion: 2,
    key,
    ownerUid: state.snapshot.ownerUid,
    sessionId: state.snapshot.sessionId,
    revision,
    writerId,
    committedAt,
    state: clone(state),
  });
}

export async function persistRunnerState(
  storage: RunnerStorage,
  state: ActiveWorkoutState,
): Promise<ActiveWorkoutState> {
  const committed = await storage.save(
    runnerStorageKey(state.snapshot.ownerUid, state.snapshot.sessionId),
    runnerStorageRecord(state),
  );
  return clone(committed.state);
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertRunnerStorageRecordIntegrity(
  record: RunnerStorageRecord,
  expectedKey: string,
  options: LoadRunnerOptions,
): void {
  if (options.snapshot.ownerUid !== options.ownerUid) {
    throw new RunnerOwnershipError();
  }
  if (options.snapshot.sessionId !== options.sessionId) {
    throw new RunnerTransitionError(
      "snapshot_conflict",
      "The requested workout snapshot does not match the active session.",
    );
  }
  const validated = validateRunnerStorageRecord(record, {
    expectedKey,
    ownerUid: options.ownerUid,
    sessionId: options.sessionId,
  });
  const storedSnapshot = validated.state.snapshot;
  if (storedSnapshot["ownerUid"] !== options.ownerUid) {
    throw new RunnerOwnershipError();
  }
  if (storedSnapshot["sessionId"] !== options.sessionId) {
    throw new RunnerTransitionError(
      "snapshot_conflict",
      "The saved workout session identity does not match the requested session.",
    );
  }
  if (
    storedSnapshot["ownerUid"] !== validated.ownerUid ||
    storedSnapshot["sessionId"] !== validated.sessionId
  ) {
    throw new RunnerTransitionError(
      "corrupt_storage",
      "The saved workout state identity does not match its record.",
    );
  }
  if (
    storedSnapshot["programRevisionId"] !==
      options.snapshot.programRevisionId ||
    storedSnapshot["dayId"] !== options.snapshot.dayId
  ) {
    throw new RunnerTransitionError(
      "snapshot_conflict",
      "The saved workout snapshot no longer matches this active session.",
    );
  }
}

export async function loadRunnerState(
  storage: RunnerStorage,
  options: LoadRunnerOptions,
): Promise<ActiveWorkoutState | undefined> {
  const key = runnerStorageKey(options.ownerUid, options.sessionId);
  const record = await storage.load(key);
  if (record === undefined) return undefined;
  assertRunnerStorageRecordIntegrity(record, key, options);
  const hydrated = {
    ...record.state,
    snapshot: deepFreeze(clone(options.snapshot)),
    operations: record.state.operations.map((operation) => clone(operation)),
  };
  return deepFreeze(hydrated);
}

export const restoreRunnerState = loadRunnerState;
export type RunnerDraftStorage = RunnerStorage;

export async function clearRunnerState(
  storage: RunnerStorage,
  ownerUid: string,
  sessionId: string,
): Promise<void> {
  await storage.remove(runnerStorageKey(ownerUid, sessionId));
}

function submitterFunction(
  submitter: RunnerSubmitter,
): (operation: RunnerOperation) => Promise<RunnerSubmitResult> {
  return typeof submitter === "function"
    ? submitter
    : (operation) => submitter.submit(operation);
}

function errorCodeFromUnknown(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }
  return "network_error";
}

function errorMessageFromUnknown(error: unknown): string | undefined {
  return error instanceof Error ? error.message : undefined;
}

function isOfflineCode(code: string): boolean {
  return (
    code === "offline" || code === "network_error" || code === "failed_to_fetch"
  );
}

function authBlockerForCode(
  code: string,
): Exclude<RunnerAuth, "valid"> | undefined {
  if (code === "session_revoked") return "revoked";
  if (
    code === "auth_expired" ||
    code === "session_expired" ||
    code === "session_invalid"
  ) {
    return "expired";
  }
  return undefined;
}

export async function syncRunnerOperations(
  initialState: ActiveWorkoutState,
  options: SyncRunnerOptions,
): Promise<ActiveWorkoutState> {
  let state = initialState;
  const at = options.now ?? state.lastUpdatedAt;
  state = await persistRunnerState(options.storage, state);
  const terminalStatus = terminalStatusForState(state);
  if (terminalStatus !== undefined) {
    const next = withUpdated(state, { status: terminalStatus }, at);
    return persistRunnerState(options.storage, next);
  }
  if (state.connectivity === "offline") {
    const next = withUpdated(state, { sync: syncForState(state) }, at);
    return persistRunnerState(options.storage, next);
  }
  if (state.auth !== "valid") {
    const next = withUpdated(state, { sync: syncForState(state) }, at);
    return persistRunnerState(options.storage, next);
  }

  const submit = submitterFunction(options.submit);
  const ordered = [...state.operations].sort(
    (left, right) => left.sequence - right.sequence,
  );

  for (const operation of ordered) {
    if (operation.status === "saved" || operation.status === "superseded")
      continue;
    if (operation.status !== "pending") break;
    const current = state.operations.find(
      ({ idempotencyKey }) => idempotencyKey === operation.idempotencyKey,
    );
    if (!current || current.status !== "pending") continue;
    state = runnerReducer(state, {
      type: "operation_attempted",
      idempotencyKey: current.idempotencyKey,
      now: at,
    });
    state = await persistRunnerState(options.storage, state);
    const attempted = state.operations.find(
      ({ idempotencyKey }) => idempotencyKey === current.idempotencyKey,
    );
    if (!attempted) break;
    let result: RunnerSubmitResult;
    try {
      result = await submit(attempted);
    } catch (error) {
      const code = errorCodeFromUnknown(error);
      const message = errorMessageFromUnknown(error);
      const authBlocker = authBlockerForCode(code);
      if (authBlocker !== undefined) {
        state = runnerReducer(state, {
          type: "set_auth",
          auth: authBlocker,
          now: at,
        });
        state = await persistRunnerState(options.storage, state);
        break;
      }
      if (isOfflineCode(code)) {
        state = runnerReducer(state, {
          type: "set_connectivity",
          connectivity: "offline",
          now: at,
        });
        state = await persistRunnerState(options.storage, state);
        break;
      }
      state = runnerReducer(state, {
        type: "operation_failed",
        idempotencyKey: current.idempotencyKey,
        errorCode: code,
        errorMessage: message,
        retryable: true,
        failureKind: "transient",
        now: at,
      });
      state = await persistRunnerState(options.storage, state);
      break;
    }

    if (result.status === "saved" || result.status === "duplicate") {
      state = runnerReducer(state, {
        type: "operation_saved",
        idempotencyKey: current.idempotencyKey,
        persistedId: result.persistedId,
        now: at,
      });
      state = await persistRunnerState(options.storage, state);
      if (
        current.kind === "complete_session" ||
        current.kind === "abandon_session"
      ) {
        break;
      }
      continue;
    }

    const authBlocker = authBlockerForCode(result.code);
    if (result.authExpired === true || authBlocker !== undefined) {
      state = runnerReducer(state, {
        type: "set_auth",
        auth: authBlocker ?? "expired",
        now: at,
      });
      state = await persistRunnerState(options.storage, state);
      break;
    }
    if (isOfflineCode(result.code)) {
      state = runnerReducer(state, {
        type: "set_connectivity",
        connectivity: "offline",
        now: at,
      });
      state = await persistRunnerState(options.storage, state);
      break;
    }
    state = runnerReducer(state, {
      type: "operation_failed",
      idempotencyKey: current.idempotencyKey,
      errorCode: result.code,
      errorMessage: result.message,
      conflict: result.conflict,
      retryable: result.retryable ?? result.conflict !== true,
      failureKind:
        result.conflict === true
          ? "conflict"
          : result.retryable === false
            ? "permanent"
            : "transient",
      now: at,
    });
    state = await persistRunnerState(options.storage, state);
    break;
  }

  return state;
}

export const syncPendingOperations = syncRunnerOperations;

export function getPendingOperations(
  state: ActiveWorkoutState,
): readonly RunnerOperation[] {
  return state.operations
    .filter(({ status }) => status === "pending")
    .sort((left, right) => left.sequence - right.sequence);
}

export function getFailedOperations(
  state: ActiveWorkoutState,
): readonly RunnerOperation[] {
  return state.operations
    .filter(({ status }) => status === "failed")
    .sort((left, right) => left.sequence - right.sequence);
}
