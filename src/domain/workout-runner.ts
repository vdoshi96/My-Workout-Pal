import {
  MEASUREMENT_KINDS,
  parseMeasurement,
  validateMeasurement,
  type MeasurementKind,
  type WorkoutMeasurement,
} from "@/domain/analytics";

export type RunnerConnectivity = "online" | "offline";
export type RunnerAuth = "valid" | "expired";
export type RunnerStatus = "active" | "completing" | "completed" | "abandoned";
export type RunnerSyncStatus =
  "idle" | "pending" | "offline" | "auth_expired" | "failed" | "conflict";
export type RunnerSetPhase = "warmup" | "work";

const SUPPORTED_KINDS = new Set<MeasurementKind>(MEASUREMENT_KINDS);

export type WorkoutSetTargetInput = {
  kind: MeasurementKind;
  minimumReps?: number;
  maximumReps?: number;
  minimumSeconds?: number;
  maximumSeconds?: number;
  targetWeightKg?: number;
  targetDistanceMeters?: number;
  targetDurationSeconds?: number;
  restSeconds: number;
};

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

export type RunnerSnapshotInput = {
  sessionId: string;
  ownerUid: string;
  programRevisionId: string;
  dayId: string;
  dayName: string;
  exercises: readonly WorkoutExerciseInput[];
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
  | "save_note"
  | "skip_exercise"
  | "substitute_exercise"
  | "complete_exercise"
  | "complete_session";
export type RunnerOperationStatus = "pending" | "saved" | "failed";

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
export type CompleteSessionOperationPayload = Readonly<{
  kind: "complete_session";
  sessionId: string;
}>;
export type RunnerOperationPayload =
  | SaveSetOperationPayload
  | SaveNoteOperationPayload
  | SkipExerciseOperationPayload
  | SubstituteExerciseOperationPayload
  | CompleteExerciseOperationPayload
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
  | Readonly<{ type: "complete_session"; now?: number }>
  | Readonly<{ type: "retry_operation"; idempotencyKey: string; now?: number }>
  | Readonly<{
      type: "operation_saved";
      idempotencyKey: string;
      persistedId?: string | undefined;
      now?: number;
    }>
  | Readonly<{
      type: "operation_failed";
      idempotencyKey: string;
      errorCode: string;
      errorMessage?: string | undefined;
      conflict?: boolean | undefined;
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
  for (const fieldName of [
    "minimumReps",
    "maximumReps",
    "minimumSeconds",
    "maximumSeconds",
    "targetWeightKg",
    "targetDistanceMeters",
    "targetDurationSeconds",
  ] as const) {
    const value = input[fieldName];
    if (value !== undefined)
      assertFiniteNonnegative(value, `target.${fieldName}`);
  }
  if (
    input.minimumReps !== undefined &&
    input.maximumReps !== undefined &&
    input.minimumReps > input.maximumReps
  ) {
    throw new RangeError("target minimumReps cannot exceed maximumReps");
  }
  if (
    input.minimumSeconds !== undefined &&
    input.maximumSeconds !== undefined &&
    input.minimumSeconds > input.maximumSeconds
  ) {
    throw new RangeError("target minimumSeconds cannot exceed maximumSeconds");
  }
  return clone(input);
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
    return {
      id: exercise.id,
      name: exercise.name,
      loggingKind: exercise.loggingKind,
      sets,
    };
  });

  return deepFreeze({
    sessionId: input.sessionId,
    ownerUid: input.ownerUid,
    programRevisionId: input.programRevisionId,
    dayId: input.dayId,
    dayName: input.dayName,
    exercises,
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
  if (state.auth === "expired")
    return {
      status: "auth_expired",
      errorCode: "auth_expired",
      errorMessage: undefined,
    };
  if (state.connectivity === "offline")
    return { status: "offline", errorCode: "offline", errorMessage: undefined };
  if (preferredError) {
    return {
      status: preferredError.status,
      errorCode: preferredError.code,
      errorMessage: preferredError.message,
    };
  }
  if (state.operations.some(({ status }) => status === "failed")) {
    const failed = state.operations.find(({ status }) => status === "failed");
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

function hashString(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function stableIdempotencyKey(value: unknown): string {
  return `mwp_${hashString(stableStringify(value))}`;
}

function queueOperation(
  state: ActiveWorkoutState,
  kind: RunnerOperationKind,
  payload: RunnerOperationPayload,
  at: number,
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
  };
  const next = {
    ...state,
    operations: [...state.operations, operation],
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
  if (state.status === "completed" || state.status === "abandoned") {
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
    exerciseName: exercise.name,
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

function ensureCompleteSession(state: ActiveWorkoutState): void {
  if (!requiredWorkOperationsConfirmed(state)) {
    throw new RunnerTransitionError(
      "required_operations_unconfirmed",
      "Every required work set must be saved and confirmed before completing the session.",
    );
  }
  if (state.dirtySetIds.length > 0 || state.dirtyNoteExerciseIds.length > 0) {
    throw new RunnerTransitionError(
      "dirty_draft",
      "Save or discard every local draft before completing the session.",
    );
  }
  if (
    state.operations.some(
      ({ status, kind }) => kind !== "complete_session" && status !== "saved",
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

  assertMutable(state);

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
    const queued = queueOperation(state, "save_set", payload, at);
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
    const queued = queueOperation(state, "save_note", payload, at);
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
    exerciseAt(state, action.exerciseId);
    assertString(action.replacement.id, "replacement.id");
    assertString(action.replacement.name, "replacement.name");
    assertKind(action.replacement.loggingKind, "replacement.loggingKind");
    const payload: SubstituteExerciseOperationPayload = {
      kind: "substitute_exercise",
      exerciseId: action.exerciseId,
      replacement: clone(action.replacement),
      reason: action.reason,
    };
    const queued = queueOperation(state, "substitute_exercise", payload, at);
    const exercise = state.snapshot.exercises.find(
      ({ id }) => id === action.exerciseId,
    );
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
    const retried: RunnerOperation = {
      ...operation,
      status: "pending",
      attempts: operation.attempts + 1,
      errorCode: undefined,
      errorMessage: undefined,
    };
    const next = replaceOperation({ ...state, lastUpdatedAt: at }, retried);
    return { ...next, sync: syncForState(next) };
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
    const saved: RunnerOperation = {
      ...operation,
      status: "saved",
      attempts: operation.attempts + 1,
      persistedId: action.persistedId ?? operation.persistedId,
      errorCode: undefined,
      errorMessage: undefined,
    };
    const next = replaceOperation({ ...state, lastUpdatedAt: at }, saved);
    return {
      ...next,
      status: saved.kind === "complete_session" ? "completed" : next.status,
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
    const failed: RunnerOperation = {
      ...operation,
      status: "failed",
      attempts: operation.attempts + 1,
      errorCode: action.errorCode,
      errorMessage: action.errorMessage,
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
    state.dirtyNoteExerciseIds.length > 0 ||
    state.operations.some(({ status }) => status !== "saved")
  );
}

export function canNavigateAway(state: ActiveWorkoutState): boolean {
  return !isNavigationBlocked(state);
}

export function navigationProtectionReason(
  state: ActiveWorkoutState,
): string | undefined {
  if (state.status === "completing") return "The workout is still being saved.";
  if (state.dirtySetIds.length > 0 || state.dirtyNoteExerciseIds.length > 0)
    return "Unsaved local workout changes remain.";
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

export async function loadRunnerState(
  storage: RunnerStorage,
  options: LoadRunnerOptions,
): Promise<ActiveWorkoutState | undefined> {
  const key = runnerStorageKey(options.ownerUid, options.sessionId);
  const record = await storage.load(key);
  if (record === undefined) return undefined;
  if (
    record.ownerUid !== options.ownerUid ||
    record.sessionId !== options.sessionId
  ) {
    throw new RunnerOwnershipError();
  }
  if (
    record.state.snapshot.ownerUid !== options.snapshot.ownerUid ||
    record.state.snapshot.sessionId !== options.snapshot.sessionId ||
    record.state.snapshot.programRevisionId !==
      options.snapshot.programRevisionId
  ) {
    throw new RunnerTransitionError(
      "snapshot_conflict",
      "The saved workout snapshot no longer matches this active session.",
    );
  }
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
    if (operation.status === "saved") continue;
    if (operation.status !== "pending") break;
    const current = state.operations.find(
      ({ idempotencyKey }) => idempotencyKey === operation.idempotencyKey,
    );
    if (!current || current.status !== "pending") continue;
    await persistRunnerState(options.storage, state);
    let result: RunnerSubmitResult;
    try {
      result = await submit(current);
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
