import {
  MEASUREMENT_KINDS,
  parseMeasurement,
  validateMeasurement,
  type MeasurementKind,
  type WorkoutMeasurement,
} from "@/domain/analytics";

export type RunnerConnectivity = "online" | "offline";
export type RunnerAuth = "valid" | "expired";
export type RunnerStatus =
  "active" | "completing" | "completed" | "abandoning" | "abandoned";
export type RunnerSyncStatus =
  "idle" | "pending" | "offline" | "auth_expired" | "failed" | "conflict";
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
      type: "set_connectivity";
      connectivity: RunnerConnectivity;
      now?: number;
    }>
  | Readonly<{ type: "set_auth"; auth: RunnerAuth; now?: number }>
  | Readonly<{ type: "start_rest"; seconds?: number; now?: number }>
  | Readonly<{ type: "pause_rest"; now?: number }>
  | Readonly<{ type: "resume_rest"; now?: number }>
  | Readonly<{ type: "clear_rest"; now?: number }>;

export type RunnerStorageRecord = Readonly<{
  schemaVersion: 1;
  key: string;
  ownerUid: string;
  sessionId: string;
  state: ActiveWorkoutState;
}>;

export interface RunnerStorage {
  load(key: string): Promise<RunnerStorageRecord | undefined>;
  save(key: string, record: RunnerStorageRecord): Promise<void>;
  remove(key: string): Promise<void>;
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

function derivePaceSecondsPerKilometer(
  durationSeconds: number,
  distanceMeters: number,
): number {
  const pace = durationSeconds / (distanceMeters / 1_000);
  if (!Number.isFinite(pace) || pace <= 0) {
    throw new RangeError("pace must be finite and positive");
  }
  return pace;
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
    draft.durationSeconds <= 0
  ) {
    issues.push("durationSeconds must be positive");
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
      draft.paceSecondsPerKilometer <= 0)
  ) {
    issues.push("paceSecondsPerKilometer must be positive when supplied");
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
    if (
      options.supersedeForAbandonment === true &&
      operation.kind !== "complete_session" &&
      operation.kind !== "abandon_session"
    ) {
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

function assertMutable(state: ActiveWorkoutState): void {
  if (
    state.status === "completed" ||
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

  if (action.type === "navigate_exercise") {
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
    if (state.restTimer === undefined || state.restTimer.pausedAt !== undefined)
      return state;
    return withUpdated(
      state,
      { restTimer: { ...state.restTimer, pausedAt: at } },
      at,
    );
  }
  if (action.type === "resume_rest") {
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
  if (action.type === "clear_rest")
    return withUpdated(state, { restTimer: undefined }, at);

  const isOperationLifecycleAction =
    action.type === "retry_operation" ||
    action.type === "operation_attempted" ||
    action.type === "operation_saved" ||
    action.type === "operation_failed";
  if (!(state.status === "abandoning" && isOperationLifecycleAction)) {
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
    if (state.status === "completing") return state;
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
    const next = replaceOperation({ ...state, lastUpdatedAt: at }, retried);
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
    return {
      ...next,
      sync: syncForState(next, {
        status: action.conflict === true ? "conflict" : "failed",
        code: action.errorCode,
        message: action.errorMessage,
      }),
    };
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

function cloneStorageRecord(record: RunnerStorageRecord): RunnerStorageRecord {
  return clone(record);
}

export class InMemoryRunnerStorage implements RunnerStorage {
  private readonly records = new Map<string, RunnerStorageRecord>();

  async load(key: string): Promise<RunnerStorageRecord | undefined> {
    const record = this.records.get(key);
    return record === undefined ? undefined : cloneStorageRecord(record);
  }

  async save(key: string, record: RunnerStorageRecord): Promise<void> {
    if (record.key !== key) throw new RangeError("Runner storage key mismatch");
    this.records.set(key, cloneStorageRecord(record));
  }

  async remove(key: string): Promise<void> {
    this.records.delete(key);
  }
}

export function createInMemoryRunnerStorage(): InMemoryRunnerStorage {
  return new InMemoryRunnerStorage();
}

export function runnerStorageRecord(
  state: ActiveWorkoutState,
): RunnerStorageRecord {
  const key = runnerStorageKey(
    state.snapshot.ownerUid,
    state.snapshot.sessionId,
  );
  return deepFreeze({
    schemaVersion: 1,
    key,
    ownerUid: state.snapshot.ownerUid,
    sessionId: state.snapshot.sessionId,
    state: clone(state),
  });
}

export async function persistRunnerState(
  storage: RunnerStorage,
  state: ActiveWorkoutState,
): Promise<void> {
  await storage.save(
    runnerStorageKey(state.snapshot.ownerUid, state.snapshot.sessionId),
    runnerStorageRecord(state),
  );
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertRunnerStorageRecordIntegrity(
  record: RunnerStorageRecord,
  expectedKey: string,
  options: LoadRunnerOptions,
): void {
  if (!isObjectRecord(record)) {
    throw new RunnerTransitionError(
      "corrupt_storage",
      "The saved workout record is not an object.",
    );
  }
  const candidate = record as unknown as Record<string, unknown>;
  if (candidate["schemaVersion"] !== 1) {
    throw new RunnerTransitionError(
      "corrupt_storage",
      "The saved workout state has an unsupported schema version.",
    );
  }
  if (candidate["ownerUid"] !== options.ownerUid) {
    throw new RunnerOwnershipError();
  }
  if (candidate["sessionId"] !== options.sessionId) {
    throw new RunnerTransitionError(
      "corrupt_storage",
      "The saved workout record session does not match its storage key.",
    );
  }
  if (candidate["key"] !== expectedKey) {
    throw new RunnerTransitionError(
      "corrupt_storage",
      "The saved workout state key does not match its owner and session.",
    );
  }
  if (options.snapshot.ownerUid !== options.ownerUid) {
    throw new RunnerOwnershipError();
  }
  if (options.snapshot.sessionId !== options.sessionId) {
    throw new RunnerTransitionError(
      "snapshot_conflict",
      "The requested workout snapshot does not match the active session.",
    );
  }
  const storedState = candidate["state"];
  if (!isObjectRecord(storedState)) {
    throw new RunnerTransitionError(
      "corrupt_storage",
      "The saved workout state payload is not an object.",
    );
  }
  if (!Array.isArray(storedState["operations"])) {
    throw new RunnerTransitionError(
      "corrupt_storage",
      "The saved workout operations are not an array.",
    );
  }
  const storedSnapshot = storedState["snapshot"];
  if (!isObjectRecord(storedSnapshot)) {
    throw new RunnerTransitionError(
      "corrupt_storage",
      "The saved workout snapshot is not an object.",
    );
  }
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
    storedSnapshot["ownerUid"] !== candidate["ownerUid"] ||
    storedSnapshot["sessionId"] !== candidate["sessionId"]
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

function isAuthExpiredCode(code: string): boolean {
  return (
    code === "auth_expired" ||
    code === "session_expired" ||
    code === "session_invalid"
  );
}

export async function syncRunnerOperations(
  initialState: ActiveWorkoutState,
  options: SyncRunnerOptions,
): Promise<ActiveWorkoutState> {
  let state = initialState;
  const at = options.now ?? state.lastUpdatedAt;
  if (state.connectivity === "offline") {
    const next = withUpdated(state, { sync: syncForState(state) }, at);
    await persistRunnerState(options.storage, next);
    return next;
  }
  if (state.auth === "expired") {
    const next = withUpdated(state, { sync: syncForState(state) }, at);
    await persistRunnerState(options.storage, next);
    return next;
  }

  await persistRunnerState(options.storage, state);
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
    await persistRunnerState(options.storage, state);
    state = runnerReducer(state, {
      type: "operation_attempted",
      idempotencyKey: current.idempotencyKey,
      now: at,
    });
    await persistRunnerState(options.storage, state);
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
      if (isAuthExpiredCode(code)) {
        state = runnerReducer(state, {
          type: "set_auth",
          auth: "expired",
          now: at,
        });
        await persistRunnerState(options.storage, state);
        break;
      }
      if (isOfflineCode(code)) {
        state = runnerReducer(state, {
          type: "set_connectivity",
          connectivity: "offline",
          now: at,
        });
        await persistRunnerState(options.storage, state);
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
      await persistRunnerState(options.storage, state);
      break;
    }

    if (result.status === "saved" || result.status === "duplicate") {
      state = runnerReducer(state, {
        type: "operation_saved",
        idempotencyKey: current.idempotencyKey,
        persistedId: result.persistedId,
        now: at,
      });
      await persistRunnerState(options.storage, state);
      continue;
    }

    if (result.authExpired === true || isAuthExpiredCode(result.code)) {
      state = runnerReducer(state, {
        type: "set_auth",
        auth: "expired",
        now: at,
      });
      await persistRunnerState(options.storage, state);
      break;
    }
    if (isOfflineCode(result.code)) {
      state = runnerReducer(state, {
        type: "set_connectivity",
        connectivity: "offline",
        now: at,
      });
      await persistRunnerState(options.storage, state);
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
    await persistRunnerState(options.storage, state);
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
