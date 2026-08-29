import { createHash } from "node:crypto";

import { and, asc, desc, eq, gt, inArray, isNull, lt, or, sql } from "drizzle-orm";

import type { Database } from "@/db/client";
import {
  catalogExercises,
  cardioLogs,
  customExerciseEquipment,
  customExercises,
  exerciseEquipment,
  idempotencyKeys,
  programCardioPrescriptions,
  programDays,
  programPrescriptions,
  programRevisions,
  programSections,
  personalRecords,
  personalRecordProjectionCheckpoints,
  setLogs,
  userEquipmentProfiles,
  userPrograms,
  workoutExerciseSnapshots,
  workoutExerciseStates,
  workoutSessions,
} from "@/db/schema";
import { EQUIPMENT_IDS, EQUIPMENT_PROFILES, type EquipmentId, type EquipmentProfileKind } from "@/domain/equipment";
import { deterministicSeedUuid } from "@/domain/seed/identity";
import {
  buildPersonalRecordProjectionCandidates,
  PERSONAL_RECORD_CALCULATION_VERSION,
  parseMeasurement,
  personalRecordCalculationVersionRank,
  type MeasurementKind,
  type WorkoutMeasurement,
} from "@/domain/analytics";
import {
  createWorkoutSnapshot,
  derivePaceSecondsPerKilometer,
  type ActiveWorkoutSnapshot,
  type CardioLog,
  type CardioMode,
  type ExerciseSubstitution,
  type RunnerOperation,
  type RunnerOperationKind,
  type RunnerOperationPayload,
  type RunnerSetPhase,
  type RunnerSubmitResult,
  type WorkoutExerciseSnapshot,
  type WorkoutExerciseInput,
  type WorkoutSectionKind,
} from "@/domain/workout-runner";
import type { ViewerContext } from "@/server/auth/viewer";
import type { PersonalGuidanceLink } from "@/domain/exercises/personal-guidance";
import { listPersonalGuidanceForSources } from "@/server/repositories/personal-guidance";

/**
 * The repository deliberately takes a ViewerContext rather than an ownership
 * string.  A UID present in a runner operation is treated as untrusted data;
 * all SQL predicates use this server-derived context instead.
 */

export type WorkoutRepositoryErrorCode =
  | "unauthenticated"
  | "mutation_forbidden"
  | "not_found"
  | "invalid_request"
  | "conflict"
  | "stale_version"
  | "terminal"
  | "not_ready";

export class WorkoutRepositoryError extends Error {
  readonly code: WorkoutRepositoryErrorCode;
  readonly retryable: boolean;

  constructor(
    code: WorkoutRepositoryErrorCode,
    message: string,
    options: Readonly<{ retryable?: boolean }> = {},
  ) {
    super(message);
    this.name = "WorkoutRepositoryError";
    this.code = code;
    this.retryable = options.retryable ?? false;
  }
}

export type StartWorkoutInput = Readonly<{
  programId: string;
  dayId: string;
  idempotencyKey: string;
  now?: Date;
}>;

export type LoadResumeInput = Readonly<{
  sessionId: string;
}>;

export type WorkoutHistoryInput = Readonly<{
  limit?: number;
  cursor?: string;
}>;

export type SubmitWorkoutOperationInput = Readonly<{
  sessionId: string;
  idempotencyKey: string;
  kind: RunnerOperationKind;
  payload: RunnerOperationPayload;
  /** Optional optimistic concurrency token for state-changing operations. */
  expectedVersion?: number;
  now?: Date;
}>;

type InternalSubmitWorkoutOperationInput = SubmitWorkoutOperationInput & Readonly<{
  serverDerivedVersion?: boolean;
}>;

export type WorkoutSessionState =
  | "draft"
  | "active"
  | "completing"
  | "completed"
  | "abandoned";

export type WorkoutExerciseStateView = Readonly<{
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

export type WorkoutSetLogView = Readonly<{
  id: string;
  snapshotId: string;
  setPosition: number;
  setKind: "warmup" | "work";
  measurement: WorkoutMeasurement;
  note: string | undefined;
  recordedAt: Date;
  idempotencyKey: string;
}>;

export type WorkoutCardioLogView = Readonly<{
  cardioKey?: string | undefined;
  id: string;
  mode: CardioMode;
  cardio: CardioLog;
  note: string | undefined;
  recordedAt: Date;
  idempotencyKey: string;
}>;

export type WorkoutSessionView = Readonly<{
  id: string;
  ownerUid: string;
  programId: string;
  programRevisionId: string;
  state: WorkoutSessionState;
  dayId: string;
  dayName: string;
  dayKey?: string | undefined;
  startedAt: Date | undefined;
  completedAt: Date | undefined;
  abandonedAt: Date | undefined;
  createdAt: Date;
  updatedAt: Date;
}>;

export type WorkoutResumeReadModel = Readonly<{
  session: WorkoutSessionView;
  snapshot: ActiveWorkoutSnapshot;
  exerciseStates: readonly WorkoutExerciseStateView[];
  setLogs: readonly WorkoutSetLogView[];
  cardioLog: WorkoutCardioLogView | undefined;
}>;

export type StartWorkoutResult = Readonly<{
  resumed: boolean;
  model: WorkoutResumeReadModel;
}>;

export type WorkoutOperationResult = Readonly<{
  status: "saved" | "duplicate";
  persistedId: string | undefined;
  sessionState: WorkoutSessionState;
  exerciseVersion: number | undefined;
}>;

export type WorkoutHistoryExercise = Readonly<{
  snapshot: WorkoutExerciseSnapshot;
  state: WorkoutExerciseStateView;
  setLogs: readonly WorkoutSetLogView[];
}>;

export type WorkoutHistorySession = Readonly<{
  session: WorkoutSessionView;
  exercises: readonly WorkoutHistoryExercise[];
  cardioLog: WorkoutCardioLogView | undefined;
}>;

export type WorkoutHistoryReadModel = Readonly<{
  sessions: readonly WorkoutHistorySession[];
  nextCursor: string | undefined;
}>;

type TxDatabase = Database;

type ProgramRow = Readonly<{
  id: string;
  ownerFirebaseUid: string;
  name: string;
  activeRevisionId: string | null;
}>;

type RevisionRow = Readonly<{
  id: string;
  ownerFirebaseUid: string;
  programId: string;
  status: "draft" | "published" | "archived";
  publishedAt: Date | null;
  equipmentProfileKind: EquipmentProfileKind;
}>;

type WorkoutEquipmentSnapshot = Readonly<{
  profileKind: EquipmentProfileKind;
  availableEquipment: readonly EquipmentId[];
}>;

type DayRow = Readonly<{
  id: string;
  ownerFirebaseUid: string;
  programId: string;
  revisionId: string;
  displayName: string;
  dayKey: string;
}>;

type SectionRow = Readonly<{
  id: string;
  sectionKey: string;
  kind: "strength" | "accessory" | "core" | "cardio";
  displayOrder: number;
  title: string;
}>;

type PrescriptionRow = Readonly<{
  id: string;
  sectionId: string;
  prescriptionKey: string;
  catalogExerciseId: string | null;
  customExerciseId: string | null;
  displayName: string | null;
  displayOrder: number;
  setKind: "warmup" | "work";
  setCount: number;
  measurementKind: MeasurementKind;
  minimumReps: number | null;
  maximumReps: number | null;
  minimumSeconds: number | null;
  maximumSeconds: number | null;
  restSeconds: number;
  targetWeightKg: number | null;
  targetDistanceM: number | null;
  notes: string | null;
  targetMetadata: Record<string, unknown>;
  catalogName: string | null;
  catalogLoggingKind: MeasurementKind | null;
  customName: string | null;
  customLoggingKind: MeasurementKind | null;
  requiredEquipment: readonly EquipmentId[];
}>;

type CardioPrescriptionRow = Readonly<{
  id: string;
  cardioKey: string;
  mode: CardioMode;
  durationSeconds: number;
  distanceM: number | null;
  paceSecondsPerKm: number | null;
  inclinePercent: number | null;
  notes: string | null;
}>;

type SnapshotRow = Readonly<{
  id: string;
  ownerFirebaseUid: string;
  sessionId: string;
  position: number;
  sectionKind: "strength" | "accessory" | "core" | "cardio";
  displayName: string;
  loggingKind: MeasurementKind;
  catalogExerciseId: string | null;
  customExerciseId: string | null;
  minimumReps: number | null;
  maximumReps: number | null;
  minimumSeconds: number | null;
  maximumSeconds: number | null;
  setCount: number;
  restSeconds: number;
  targetWeightKg: number | null;
  targetDistanceM: number | null;
  prescriptionSnapshot: Record<string, unknown>;
  guidanceSnapshot: readonly PersonalGuidanceLink[];
}>;

type SnapshotInsertRow = Readonly<{
  ownerFirebaseUid: string;
  sessionId: string;
  position: number;
  sectionKind: "strength" | "accessory" | "core" | "cardio";
  displayName: string;
  loggingKind: MeasurementKind;
  catalogExerciseId: string | null;
  customExerciseId: string | null;
  minimumReps: number | null;
  maximumReps: number | null;
  minimumSeconds: number | null;
  maximumSeconds: number | null;
  setCount: number;
  restSeconds: number;
  targetWeightKg: number | null;
  targetDistanceM: number | null;
  prescriptionSnapshot: Record<string, unknown>;
  guidanceSnapshot: readonly PersonalGuidanceLink[];
}>;

type ExerciseStateRow = Readonly<{
  snapshotId: string;
  status: "pending" | "completed" | "skipped";
  effectiveCatalogExerciseId: string | null;
  effectiveCustomExerciseId: string | null;
  effectiveDisplayName: string;
  effectiveLoggingKind: MeasurementKind;
  note: string | null;
  substitutionReason: string | null;
  lastClientOperationId: string;
  version: number;
}>;

type SessionRow = Readonly<{
  id: string;
  ownerFirebaseUid: string;
  programId: string;
  programRevisionId: string;
  state: WorkoutSessionState;
  idempotencyKey: string;
  startedAt: Date | null;
  completedAt: Date | null;
  abandonedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}>;

const RESUMABLE_STATES: readonly WorkoutSessionState[] = [
  "draft",
  "active",
  "completing",
];
const TERMINAL_STATES: readonly WorkoutSessionState[] = ["completed", "abandoned"];
const MAX_NOTE_LENGTH = 2_000;
const MAX_REASON_LENGTH = 500;
const DEFAULT_HISTORY_LIMIT = 20;
const MAX_HISTORY_LIMIT = 100;
/** Previous values are selected per requested meaning, with a bounded log read. */
const MAX_PREVIOUS_IDENTITIES = 100;
const MAX_PREVIOUS_SET_ROWS = 100;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonblank(value: unknown, field: string, maxLength = 180): string {
  if (typeof value !== "string") {
    throw new WorkoutRepositoryError("invalid_request", `${field} is required.`);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maxLength) {
    throw new WorkoutRepositoryError("invalid_request", `${field} is invalid.`);
  }
  return trimmed;
}

function resourceUuid(value: unknown, field: string): string {
  const candidate = typeof value === "string" ? value.trim() : "";
  if (!UUID_PATTERN.test(candidate)) notFound(`The requested ${field} was not found.`);
  return candidate;
}

function cursorUuid(value: unknown): string {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new WorkoutRepositoryError("invalid_request", "history cursor is invalid.");
  }
  return value;
}

function optionalText(value: unknown, field: string, maxLength: number): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string" || value.length > maxLength) {
    throw new WorkoutRepositoryError("invalid_request", `${field} is invalid.`);
  }
  return value;
}

function dateOrNow(value: Date | undefined): Date {
  const result = value ?? new Date();
  if (!(result instanceof Date) || Number.isNaN(result.getTime())) {
    throw new WorkoutRepositoryError("invalid_request", "The operation timestamp is invalid.");
  }
  return result;
}

function requireViewer(viewer: ViewerContext | null | undefined): ViewerContext {
  if (!viewer || typeof viewer.uid !== "string" || viewer.uid.trim().length === 0) {
    throw new WorkoutRepositoryError("unauthenticated", "A signed-in viewer is required.");
  }
  return viewer;
}

function requireMutationViewer(viewer: ViewerContext | null | undefined): ViewerContext {
  const current = requireViewer(viewer);
  if (!current.eligibleForPermanentMutations) {
    throw new WorkoutRepositoryError(
      "mutation_forbidden",
      "This account must complete verification before saving workout data.",
    );
  }
  return current;
}

function notFound(message = "The requested workout was not found."): never {
  throw new WorkoutRepositoryError("not_found", message);
}

function stableValue(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(stableValue).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableValue(value[key])}`).join(",")}}`;
  }
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  return JSON.stringify(String(value));
}

function requestHash(input: Readonly<{ sessionId: string; kind: RunnerOperationKind; payload: RunnerOperationPayload; expectedVersion: number | undefined }>): string {
  return createHash("sha256")
    .update(stableValue({
      sessionId: input.sessionId,
      kind: input.kind,
      payload: input.payload,
      ...(input.expectedVersion === undefined ? {} : { expectedVersion: input.expectedVersion }),
    }))
    .digest("hex");
}

function operationPersistedId(result: WorkoutOperationResult): string | undefined {
  return result.persistedId;
}

function jsonObject(value: unknown, field: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new WorkoutRepositoryError("invalid_request", `${field} must be an object.`);
  }
  return value;
}

function parseStateView(row: ExerciseStateRow): WorkoutExerciseStateView {
  return {
    snapshotId: row.snapshotId,
    status: row.status,
    effectiveCatalogExerciseId: row.effectiveCatalogExerciseId ?? undefined,
    effectiveCustomExerciseId: row.effectiveCustomExerciseId ?? undefined,
    effectiveDisplayName: row.effectiveDisplayName,
    effectiveLoggingKind: row.effectiveLoggingKind,
    note: row.note ?? undefined,
    substitutionReason: row.substitutionReason ?? undefined,
    version: row.version,
    lastClientOperationId: row.lastClientOperationId,
  };
}

function decodeMeasurement(
  row: Readonly<{
    measurementKind: MeasurementKind;
    weightKg: number | null;
    addedWeightKg: number | null;
    repetitions: number | null;
    durationSeconds: number | null;
    distanceM: number | null;
    setKind: "warmup" | "work";
    noteSnapshot: string | null;
  }>,
): WorkoutMeasurement {
  const warmup = row.setKind === "warmup" ? { isWarmup: true } : {};
  if (row.measurementKind === "weight_reps") {
    if (row.weightKg === null || row.repetitions === null) {
      throw new WorkoutRepositoryError("conflict", "The saved set measurement is malformed.");
    }
    return parseMeasurement({ kind: row.measurementKind, weightKg: row.weightKg, repetitions: row.repetitions, ...warmup });
  }
  if (row.measurementKind === "bodyweight_reps") {
    if (row.repetitions === null) {
      throw new WorkoutRepositoryError("conflict", "The saved set measurement is malformed.");
    }
    return parseMeasurement({
      kind: row.measurementKind,
      repetitions: row.repetitions,
      ...(row.addedWeightKg === null ? {} : { addedWeightKg: row.addedWeightKg }),
      ...warmup,
    });
  }
  if (row.measurementKind === "duration") {
    if (row.durationSeconds === null) {
      throw new WorkoutRepositoryError("conflict", "The saved set measurement is malformed.");
    }
    return parseMeasurement({ kind: row.measurementKind, durationSeconds: row.durationSeconds, ...warmup });
  }
  if (row.durationSeconds === null || row.distanceM === null) {
    throw new WorkoutRepositoryError("conflict", "The saved set measurement is malformed.");
  }
  return parseMeasurement({ kind: row.measurementKind, durationSeconds: row.durationSeconds, distanceMeters: row.distanceM, ...warmup });
}

type PersonalRecordProjectionSetRow = Readonly<{
  setLogId: string;
  sessionId: string;
  measurementKind: MeasurementKind;
  weightKg: number | null;
  addedWeightKg: number | null;
  repetitions: number | null;
  durationSeconds: number | null;
  distanceM: number | null;
  recordedAt: Date;
  effectiveCatalogExerciseId: string | null;
  effectiveCustomExerciseId: string | null;
  effectiveLoggingKind: MeasurementKind;
}>;

function projectionMeasurement(row: PersonalRecordProjectionSetRow): WorkoutMeasurement | undefined {
  if (row.measurementKind !== row.effectiveLoggingKind) return undefined;
  try {
    if (row.measurementKind === "weight_reps") {
      if (row.weightKg === null || row.repetitions === null) return undefined;
      return parseMeasurement({ kind: row.measurementKind, weightKg: row.weightKg, repetitions: row.repetitions });
    }
    if (row.measurementKind === "bodyweight_reps") {
      if (row.repetitions === null) return undefined;
      return parseMeasurement({
        kind: row.measurementKind,
        repetitions: row.repetitions,
        ...(row.addedWeightKg === null ? {} : { addedWeightKg: row.addedWeightKg }),
      });
    }
    if (row.measurementKind === "duration") {
      if (row.durationSeconds === null) return undefined;
      return parseMeasurement({ kind: row.measurementKind, durationSeconds: row.durationSeconds });
    }
    if (row.distanceM === null || row.durationSeconds === null) return undefined;
    return parseMeasurement({
      kind: row.measurementKind,
      distanceMeters: row.distanceM,
      durationSeconds: row.durationSeconds,
    });
  } catch {
    return undefined;
  }
}

function projectionIdentity(row: PersonalRecordProjectionSetRow): Readonly<{
  catalogExerciseId: string | null;
  customExerciseId: string | null;
}> | undefined {
  if ((row.effectiveCatalogExerciseId === null) === (row.effectiveCustomExerciseId === null)) {
    return undefined;
  }
  return {
    catalogExerciseId: row.effectiveCatalogExerciseId,
    customExerciseId: row.effectiveCustomExerciseId,
  };
}

async function projectPersonalRecords(
  tx: TxDatabase,
  ownerUid: string,
  sessionId: string,
  persist = true,
): Promise<Readonly<{
  candidateCount: number;
  changedCount: number;
  deletedCount: number;
  insertedCount: number;
  updatedCount: number;
}>> {
  const sessionSources = await tx
    .select({ setLogId: setLogs.id })
    .from(setLogs)
    .where(and(
      eq(setLogs.ownerFirebaseUid, ownerUid),
      eq(setLogs.sessionId, sessionId),
    ))
    .orderBy(asc(setLogs.id));
  const rows = await tx
    .select({
      setLogId: setLogs.id,
      sessionId: setLogs.sessionId,
      measurementKind: setLogs.measurementKind,
      weightKg: setLogs.weightKg,
      addedWeightKg: setLogs.addedWeightKg,
      repetitions: setLogs.repetitions,
      durationSeconds: setLogs.durationSeconds,
      distanceM: setLogs.distanceM,
      recordedAt: setLogs.recordedAt,
      effectiveCatalogExerciseId: workoutExerciseStates.effectiveCatalogExerciseId,
      effectiveCustomExerciseId: workoutExerciseStates.effectiveCustomExerciseId,
      effectiveLoggingKind: workoutExerciseStates.effectiveLoggingKind,
    })
    .from(setLogs)
    .innerJoin(workoutExerciseStates, and(
      eq(workoutExerciseStates.ownerFirebaseUid, setLogs.ownerFirebaseUid),
      eq(workoutExerciseStates.sessionId, setLogs.sessionId),
      eq(workoutExerciseStates.snapshotId, setLogs.snapshotId),
    ))
    .where(and(
      eq(setLogs.ownerFirebaseUid, ownerUid),
      eq(setLogs.sessionId, sessionId),
      eq(setLogs.setKind, "work"),
      eq(workoutExerciseStates.ownerFirebaseUid, ownerUid),
      eq(workoutExerciseStates.sessionId, sessionId),
      eq(workoutExerciseStates.status, "completed"),
    ))
    .orderBy(asc(setLogs.id));

  const candidates = (rows as PersonalRecordProjectionSetRow[]).flatMap((row) => {
    const identity = projectionIdentity(row);
    if (!identity) return [];
    const identityKey = identity.catalogExerciseId !== null
      ? `catalog:${identity.catalogExerciseId}`
      : identity.customExerciseId !== null
        ? `custom:${identity.customExerciseId}`
        : undefined;
    if (!identityKey) return [];
    const measurement = projectionMeasurement(row);
    const generated = measurement === undefined ? [] : buildPersonalRecordProjectionCandidates(measurement);
    return generated.map((candidate) => ({
      id: deterministicSeedUuid(
        "personal-record",
        `${ownerUid}:${row.setLogId}:${identityKey}:${candidate.recordType}`,
      ),
      ownerFirebaseUid: ownerUid,
      catalogExerciseId: identity.catalogExerciseId,
      customExerciseId: identity.customExerciseId,
      type: candidate.recordType,
      value: candidate.value,
      sourceSetLogId: row.setLogId,
      calculationVersion: PERSONAL_RECORD_CALCULATION_VERSION,
      achievedAt: row.recordedAt,
    }));
  });

  const currentVersionRank = personalRecordCalculationVersionRank(PERSONAL_RECORD_CALCULATION_VERSION);
  if (currentVersionRank === undefined) {
    throw new Error(`Unsupported personal-record calculation version: ${PERSONAL_RECORD_CALCULATION_VERSION}`);
  }

  if (candidates.length === 0 && sessionSources.length === 0) {
    return { candidateCount: 0, changedCount: 0, deletedCount: 0, insertedCount: 0, updatedCount: 0 };
  }

  let insertedCount = 0;
  let updatedCount = 0;
  let deletedCount = 0;
  for (const candidate of candidates) {
    const identityPredicate = candidate.catalogExerciseId === null
      ? and(
          isNull(personalRecords.catalogExerciseId),
          eq(personalRecords.customExerciseId, candidate.customExerciseId!),
        )
      : and(
          eq(personalRecords.catalogExerciseId, candidate.catalogExerciseId),
          isNull(personalRecords.customExerciseId),
        );
    const basePredicate = and(
      eq(personalRecords.ownerFirebaseUid, ownerUid),
      eq(personalRecords.type, candidate.type),
      eq(personalRecords.sourceSetLogId, candidate.sourceSetLogId),
      identityPredicate,
    );
    let existing = (await tx
      .select({ id: personalRecords.id, calculationVersion: personalRecords.calculationVersion })
      .from(personalRecords)
      .where(basePredicate)
      .limit(1))[0];

    if (!existing) {
      if (!persist) {
        insertedCount += 1;
        continue;
      }
      const inserted = await tx
        .insert(personalRecords)
        .values(candidate)
        .onConflictDoNothing()
        .returning({ id: personalRecords.id });
      if (inserted[0]) {
        insertedCount += 1;
        continue;
      }
      existing = (await tx
        .select({ id: personalRecords.id, calculationVersion: personalRecords.calculationVersion })
        .from(personalRecords)
        .where(basePredicate)
        .limit(1))[0];
      if (!existing) {
        throw new Error("Personal-record candidate conflict did not resolve to a source row.");
      }
    }

    const existingVersionRank = personalRecordCalculationVersionRank(existing.calculationVersion);
    if (existingVersionRank === undefined || existingVersionRank >= currentVersionRank) continue;
    if (!persist) {
      updatedCount += 1;
      continue;
    }
    const updated = await tx
      .update(personalRecords)
      .set({
        calculationVersion: PERSONAL_RECORD_CALCULATION_VERSION,
        updatedAt: new Date(),
        value: candidate.value,
      })
      .where(and(
        eq(personalRecords.id, existing.id),
        eq(personalRecords.ownerFirebaseUid, ownerUid),
        eq(personalRecords.calculationVersion, existing.calculationVersion),
      ))
      .returning({ id: personalRecords.id });
    if (updated[0]) updatedCount += 1;
  }

  const candidateKeys = new Set(candidates.map((candidate) =>
    `${candidate.sourceSetLogId}:${candidate.catalogExerciseId === null ? `custom:${candidate.customExerciseId}` : `catalog:${candidate.catalogExerciseId}`}:${candidate.type}`,
  ));
  const existingSessionRecords = sessionSources.length === 0
    ? []
    : await tx
        .select({
          calculationVersion: personalRecords.calculationVersion,
          catalogExerciseId: personalRecords.catalogExerciseId,
          customExerciseId: personalRecords.customExerciseId,
          id: personalRecords.id,
          sourceSetLogId: personalRecords.sourceSetLogId,
          type: personalRecords.type,
        })
        .from(personalRecords)
        .where(and(
          eq(personalRecords.ownerFirebaseUid, ownerUid),
          inArray(personalRecords.sourceSetLogId, sessionSources.map(({ setLogId }) => setLogId)),
        ));
  const staleIds = existingSessionRecords
    .filter((record) => {
      const rank = personalRecordCalculationVersionRank(record.calculationVersion);
      if (rank === undefined || rank >= currentVersionRank) return false;
      const identityKey = record.catalogExerciseId === null
        ? `custom:${record.customExerciseId}`
        : `catalog:${record.catalogExerciseId}`;
      return !candidateKeys.has(`${record.sourceSetLogId}:${identityKey}:${record.type}`);
    })
    .map(({ id }) => id);
  if (staleIds.length > 0) {
    if (!persist) {
      deletedCount += staleIds.length;
    } else {
      const deleted = await tx
        .delete(personalRecords)
        .where(and(
          eq(personalRecords.ownerFirebaseUid, ownerUid),
          inArray(personalRecords.id, staleIds),
        ))
        .returning({ id: personalRecords.id });
      deletedCount += deleted.length;
    }
  }

  return {
    candidateCount: candidates.length,
    changedCount: insertedCount + updatedCount + deletedCount,
    deletedCount,
    insertedCount,
    updatedCount,
  };
}

function parseCardioLog(
  row: Readonly<{
    id: string;
    mode: CardioMode;
    durationSeconds: number;
    distanceM: number | null;
    paceSecondsPerKm: number | null;
    paceSource: "entered" | "derived" | null;
    inclinePercent: number | null;
    noteSnapshot: string | null;
    recordedAt: Date;
    clientIdempotencyKey: string;
  }>,
  cardioKey?: string,
): WorkoutCardioLogView {
  const distanceMeters = row.distanceM ?? undefined;
  const paceSecondsPerKilometer = row.paceSecondsPerKm ?? undefined;
  const cardio: CardioLog = {
    mode: row.mode,
    durationSeconds: row.durationSeconds,
    distanceMeters,
    paceSecondsPerKilometer,
    paceSource: row.paceSource ?? undefined,
    inclinePercent: row.inclinePercent ?? undefined,
    notes: row.noteSnapshot ?? "",
  };
  return {
    ...(cardioKey === undefined ? {} : { cardioKey }),
    id: row.id,
    mode: row.mode,
    cardio,
    note: row.noteSnapshot ?? undefined,
    recordedAt: row.recordedAt,
    idempotencyKey: row.clientIdempotencyKey,
  };
}

function cardioSnapshotFromJson(value: unknown): readonly ActiveWorkoutSnapshot["cardioOptions"][number][] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    if (
      typeof item["id"] !== "string" ||
      (item["mode"] !== "walker" && item["mode"] !== "runner") ||
      typeof item["targetDurationSeconds"] !== "number"
    ) return [];
    return [{
      id: item["id"],
      ...(typeof item["cardioKey"] === "string" ? { cardioKey: item["cardioKey"] } : {}),
      mode: item["mode"],
      targetDurationSeconds: item["targetDurationSeconds"],
      ...(typeof item["targetDistanceMeters"] === "number" ? { targetDistanceMeters: item["targetDistanceMeters"] } : {}),
      ...(typeof item["targetPaceSecondsPerKilometer"] === "number" ? { targetPaceSecondsPerKilometer: item["targetPaceSecondsPerKilometer"] } : {}),
      ...(typeof item["targetInclinePercent"] === "number" ? { targetInclinePercent: item["targetInclinePercent"] } : {}),
      ...(typeof item["notes"] === "string" ? { notes: item["notes"] } : {}),
    }];
  });
}

function sessionView(session: SessionRow, snapshots: readonly SnapshotRow[]): WorkoutSessionView {
  const firstSnapshot = snapshots[0];
  const snapshotMeaning = firstSnapshot?.prescriptionSnapshot;
  const dayId = typeof snapshotMeaning?.["dayId"] === "string" ? snapshotMeaning["dayId"] : "";
  const dayName = typeof snapshotMeaning?.["dayName"] === "string" ? snapshotMeaning["dayName"] : "";
  const dayKey = typeof snapshotMeaning?.["dayKey"] === "string" && snapshotMeaning["dayKey"].trim().length > 0
    ? snapshotMeaning["dayKey"]
    : undefined;
  if (!dayId || !dayName) {
    throw new WorkoutRepositoryError("conflict", "The saved workout snapshot is incomplete.");
  }
  return {
    id: session.id,
    ownerUid: session.ownerFirebaseUid,
    programId: session.programId,
    programRevisionId: session.programRevisionId,
    state: session.state,
    dayId,
    dayName,
    ...(dayKey === undefined ? {} : { dayKey }),
    startedAt: session.startedAt ?? undefined,
    completedAt: session.completedAt ?? undefined,
    abandonedAt: session.abandonedAt ?? undefined,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

function targetForSnapshot(row: SnapshotRow): ActiveWorkoutSnapshot["exercises"][number]["sets"][number]["target"] {
  const base = { restSeconds: row.restSeconds };
  if (row.loggingKind === "weight_reps") {
    return {
      kind: row.loggingKind,
      minimumReps: row.minimumReps ?? 1,
      maximumReps: row.maximumReps ?? row.minimumReps ?? 1,
      ...(row.targetWeightKg === null ? {} : { targetWeightKg: row.targetWeightKg }),
      ...base,
    };
  }
  if (row.loggingKind === "bodyweight_reps") {
    return { kind: row.loggingKind, minimumReps: row.minimumReps ?? 1, maximumReps: row.maximumReps ?? row.minimumReps ?? 1, ...base };
  }
  if (row.loggingKind === "duration") {
    return { kind: row.loggingKind, minimumSeconds: row.minimumSeconds ?? 1, maximumSeconds: row.maximumSeconds ?? row.minimumSeconds ?? 1, ...base };
  }
  return {
    kind: row.loggingKind,
    targetDistanceMeters: row.targetDistanceM ?? 1,
    targetDurationSeconds: row.maximumSeconds ?? row.minimumSeconds ?? 1,
    ...base,
  };
}

function snapshotInputForRow(row: SnapshotRow): WorkoutExerciseInput {
  const sets = Array.from({ length: row.setCount }, (_, index) => {
    const previous = previousValueForSnapshot(row, index + 1);
    return {
      id: `${row.id}:${index + 1}`,
      position: index + 1,
      phase: row.prescriptionSnapshot["setKind"] === "warmup" ? "warmup" as const : "work" as const,
      target: targetForSnapshot(row),
      ...(previous === undefined ? {} : { previous }),
    };
  });
  const sectionKey = typeof row.prescriptionSnapshot["sectionKey"] === "string" && row.prescriptionSnapshot["sectionKey"].trim().length > 0
    ? row.prescriptionSnapshot["sectionKey"]
    : undefined;
  const sectionKindValue = row.prescriptionSnapshot["sectionKind"] ?? row.sectionKind;
  const sectionKind: WorkoutSectionKind | undefined = sectionKindValue === "accessory" || sectionKindValue === "cardio" || sectionKindValue === "core" || sectionKindValue === "strength"
    ? sectionKindValue
    : undefined;
  const sectionTitle = typeof row.prescriptionSnapshot["sectionTitle"] === "string" && row.prescriptionSnapshot["sectionTitle"].trim().length > 0
    ? row.prescriptionSnapshot["sectionTitle"]
    : undefined;
  const prescriptionKey = typeof row.prescriptionSnapshot["prescriptionKey"] === "string" && row.prescriptionSnapshot["prescriptionKey"].trim().length > 0
    ? row.prescriptionSnapshot["prescriptionKey"]
    : undefined;
  return {
    id: row.id,
    name: row.displayName,
    loggingKind: row.loggingKind,
    ...(sectionKind === undefined ? {} : { sectionKind }),
    ...(sectionKey === undefined ? {} : { sectionKey }),
    ...(sectionTitle === undefined ? {} : { sectionTitle }),
    ...(prescriptionKey === undefined ? {} : { prescriptionKey }),
    ...(row.guidanceSnapshot.length === 0
      ? {}
      : { guidance: row.guidanceSnapshot }),
    sets,
  };
}

function previousValueForSnapshot(row: SnapshotRow, position: number): WorkoutMeasurement | undefined {
  const values = row.prescriptionSnapshot["previousValues"];
  if (!isRecord(values)) return undefined;
  const value = values[String(position)];
  if (value === undefined || value === null) return undefined;
  try {
    return parseMeasurement(value);
  } catch {
    throw new WorkoutRepositoryError("conflict", "The saved previous workout value is malformed.");
  }
}

function assertMeasurementForSnapshot(
  measurement: WorkoutMeasurement,
  snapshot: SnapshotRow,
  phase: RunnerSetPhase,
): WorkoutMeasurement {
  let parsed: WorkoutMeasurement;
  try {
    parsed = parseMeasurement(measurement);
  } catch {
    throw new WorkoutRepositoryError("invalid_request", "The set measurement is invalid.");
  }
  if (parsed.kind !== snapshot.loggingKind) {
    throw new WorkoutRepositoryError("invalid_request", "The measurement kind does not match the exercise.");
  }
  if (phase !== (snapshot.prescriptionSnapshot["setKind"] === "warmup" ? "warmup" : "work")) {
    throw new WorkoutRepositoryError("invalid_request", "The set phase does not match the exercise snapshot.");
  }
  if (phase === "warmup" && parsed.isWarmup !== true) {
    throw new WorkoutRepositoryError("invalid_request", "Warm-up measurements must be marked as warm-up.");
  }
  if (phase === "work" && parsed.isWarmup === true) {
    throw new WorkoutRepositoryError("invalid_request", "Work measurements cannot be marked as warm-up.");
  }
  if (parsed.kind === "duration" && (!Number.isInteger(parsed.durationSeconds) || parsed.durationSeconds <= 0)) {
    throw new WorkoutRepositoryError("invalid_request", "Duration must be a positive integer.");
  }
  if (parsed.kind === "distance_duration" && (parsed.distanceMeters <= 0 || !Number.isInteger(parsed.durationSeconds) || parsed.durationSeconds <= 0)) {
    throw new WorkoutRepositoryError("invalid_request", "Distance must be positive and duration must be a positive integer.");
  }
  return parsed;
}

function assertCardio(
  cardio: CardioLog,
  mode: CardioMode,
  options: readonly ActiveWorkoutSnapshot["cardioOptions"][number][],
): CardioLog {
  if (cardio.mode !== mode || !options.some((option) => option.mode === mode)) {
    throw new WorkoutRepositoryError("invalid_request", "The cardio mode is not available for this workout.");
  }
  if (!Number.isInteger(cardio.durationSeconds) || cardio.durationSeconds <= 0) {
    throw new WorkoutRepositoryError("invalid_request", "Cardio duration must be a positive integer.");
  }
  if (cardio.distanceMeters !== undefined && (!Number.isFinite(cardio.distanceMeters) || cardio.distanceMeters <= 0)) {
    throw new WorkoutRepositoryError("invalid_request", "Cardio distance must be positive.");
  }
  if (cardio.paceSecondsPerKilometer !== undefined && (!Number.isInteger(cardio.paceSecondsPerKilometer) || cardio.paceSecondsPerKilometer <= 0)) {
    throw new WorkoutRepositoryError("invalid_request", "Cardio pace must be a positive integer.");
  }
  if (cardio.paceSource !== undefined && cardio.paceSource !== "entered" && cardio.paceSource !== "derived") {
    throw new WorkoutRepositoryError("invalid_request", "Cardio pace source is invalid.");
  }
  if (cardio.paceSource === undefined && cardio.paceSecondsPerKilometer !== undefined) {
    throw new WorkoutRepositoryError("invalid_request", "Cardio pace source is required when pace is supplied.");
  }
  if (cardio.paceSource !== undefined && cardio.paceSecondsPerKilometer === undefined) {
    throw new WorkoutRepositoryError("invalid_request", "Cardio pace is required when pace source is supplied.");
  }
  if (cardio.inclinePercent !== undefined && (!Number.isFinite(cardio.inclinePercent) || cardio.inclinePercent < 0 || cardio.inclinePercent > 100)) {
    throw new WorkoutRepositoryError("invalid_request", "Cardio incline is invalid.");
  }
  if (typeof cardio.notes !== "string" || cardio.notes.length > MAX_NOTE_LENGTH) {
    throw new WorkoutRepositoryError("invalid_request", "Cardio notes are invalid.");
  }
  if (cardio.paceSource === "derived") {
    if (cardio.distanceMeters === undefined || cardio.paceSecondsPerKilometer === undefined) {
      throw new WorkoutRepositoryError("invalid_request", "Derived pace requires distance and pace.");
    }
    const derived = derivePaceSecondsPerKilometer(cardio.durationSeconds, cardio.distanceMeters);
    if (derived !== cardio.paceSecondsPerKilometer) {
      throw new WorkoutRepositoryError("invalid_request", "Derived pace does not match distance and duration.");
    }
  }
  return cardio;
}

function sessionIsTerminal(state: WorkoutSessionState): boolean {
  return TERMINAL_STATES.includes(state);
}

async function lockOwner(tx: TxDatabase, ownerUid: string): Promise<void> {
  await tx.execute(sql`SELECT firebase_uid FROM user_profiles WHERE firebase_uid = ${ownerUid} FOR UPDATE`);
}

async function selectSession(tx: TxDatabase, ownerUid: string, sessionId: string): Promise<SessionRow> {
  const rows = await tx
    .select({
      id: workoutSessions.id,
      ownerFirebaseUid: workoutSessions.ownerFirebaseUid,
      programId: workoutSessions.programId,
      programRevisionId: workoutSessions.programRevisionId,
      state: workoutSessions.state,
      idempotencyKey: workoutSessions.idempotencyKey,
      startedAt: workoutSessions.startedAt,
      completedAt: workoutSessions.completedAt,
      abandonedAt: workoutSessions.abandonedAt,
      createdAt: workoutSessions.createdAt,
      updatedAt: workoutSessions.updatedAt,
    })
    .from(workoutSessions)
    .where(and(eq(workoutSessions.ownerFirebaseUid, ownerUid), eq(workoutSessions.id, sessionId)))
    .limit(1);
  const row = rows[0] as SessionRow | undefined;
  if (!row) notFound();
  return row;
}

async function selectSnapshots(tx: TxDatabase, ownerUid: string, sessionId: string): Promise<SnapshotRow[]> {
  const rows = await tx
    .select({
      id: workoutExerciseSnapshots.id,
      ownerFirebaseUid: workoutExerciseSnapshots.ownerFirebaseUid,
      sessionId: workoutExerciseSnapshots.sessionId,
      position: workoutExerciseSnapshots.position,
      sectionKind: workoutExerciseSnapshots.sectionKind,
      displayName: workoutExerciseSnapshots.displayName,
      loggingKind: workoutExerciseSnapshots.loggingKind,
      catalogExerciseId: workoutExerciseSnapshots.catalogExerciseId,
      customExerciseId: workoutExerciseSnapshots.customExerciseId,
      minimumReps: workoutExerciseSnapshots.minimumReps,
      maximumReps: workoutExerciseSnapshots.maximumReps,
      minimumSeconds: workoutExerciseSnapshots.minimumSeconds,
      maximumSeconds: workoutExerciseSnapshots.maximumSeconds,
      setCount: workoutExerciseSnapshots.setCount,
      restSeconds: workoutExerciseSnapshots.restSeconds,
      targetWeightKg: workoutExerciseSnapshots.targetWeightKg,
      targetDistanceM: workoutExerciseSnapshots.targetDistanceM,
      prescriptionSnapshot: workoutExerciseSnapshots.prescriptionSnapshot,
      guidanceSnapshot: workoutExerciseSnapshots.guidanceSnapshot,
    })
    .from(workoutExerciseSnapshots)
    .where(and(eq(workoutExerciseSnapshots.ownerFirebaseUid, ownerUid), eq(workoutExerciseSnapshots.sessionId, sessionId)))
    .orderBy(asc(workoutExerciseSnapshots.position));
  return rows as SnapshotRow[];
}

async function selectStates(tx: TxDatabase, ownerUid: string, sessionId: string): Promise<ExerciseStateRow[]> {
  const rows = await tx
    .select({
      snapshotId: workoutExerciseStates.snapshotId,
      status: workoutExerciseStates.status,
      effectiveCatalogExerciseId: workoutExerciseStates.effectiveCatalogExerciseId,
      effectiveCustomExerciseId: workoutExerciseStates.effectiveCustomExerciseId,
      effectiveDisplayName: workoutExerciseStates.effectiveDisplayName,
      effectiveLoggingKind: workoutExerciseStates.effectiveLoggingKind,
      note: workoutExerciseStates.note,
      substitutionReason: workoutExerciseStates.substitutionReason,
      lastClientOperationId: workoutExerciseStates.lastClientOperationId,
      version: workoutExerciseStates.version,
    })
    .from(workoutExerciseStates)
    .where(and(eq(workoutExerciseStates.ownerFirebaseUid, ownerUid), eq(workoutExerciseStates.sessionId, sessionId)))
    .orderBy(asc(workoutExerciseStates.snapshotId));
  return rows as ExerciseStateRow[];
}

async function selectSetLogs(tx: TxDatabase, ownerUid: string, sessionId: string): Promise<WorkoutSetLogView[]> {
  const rows = await tx
    .select({
      id: setLogs.id,
      snapshotId: setLogs.snapshotId,
      setPosition: setLogs.setPosition,
      measurementKind: setLogs.measurementKind,
      setKind: setLogs.setKind,
      weightKg: setLogs.weightKg,
      addedWeightKg: setLogs.addedWeightKg,
      repetitions: setLogs.repetitions,
      durationSeconds: setLogs.durationSeconds,
      distanceM: setLogs.distanceM,
      noteSnapshot: setLogs.noteSnapshot,
      recordedAt: setLogs.recordedAt,
      clientIdempotencyKey: setLogs.clientIdempotencyKey,
    })
    .from(setLogs)
    .where(and(eq(setLogs.ownerFirebaseUid, ownerUid), eq(setLogs.sessionId, sessionId)))
    .orderBy(asc(setLogs.snapshotId), asc(setLogs.setPosition));
  return rows.map((row) => ({
    id: row.id,
    snapshotId: row.snapshotId,
    setPosition: row.setPosition,
    setKind: row.setKind,
    measurement: decodeMeasurement(row),
    note: row.noteSnapshot ?? undefined,
    recordedAt: row.recordedAt,
    idempotencyKey: row.clientIdempotencyKey,
  }));
}

async function selectCardioLog(
  tx: TxDatabase,
  ownerUid: string,
  sessionId: string,
  cardioOptions: ActiveWorkoutSnapshot["cardioOptions"] = [],
): Promise<WorkoutCardioLogView | undefined> {
  const rows = await tx
    .select({
      id: cardioLogs.id,
      mode: cardioLogs.mode,
      durationSeconds: cardioLogs.durationSeconds,
      distanceM: cardioLogs.distanceM,
      paceSecondsPerKm: cardioLogs.paceSecondsPerKm,
      paceSource: cardioLogs.paceSource,
      inclinePercent: cardioLogs.inclinePercent,
      noteSnapshot: cardioLogs.noteSnapshot,
      recordedAt: cardioLogs.recordedAt,
      clientIdempotencyKey: cardioLogs.clientIdempotencyKey,
    })
    .from(cardioLogs)
    .where(and(eq(cardioLogs.ownerFirebaseUid, ownerUid), eq(cardioLogs.sessionId, sessionId)))
    .limit(1);
  const row = rows[0];
  const cardioKey = row === undefined
    ? undefined
    : cardioOptions.find(({ mode }) => mode === row.mode)?.cardioKey;
  return row ? parseCardioLog(row, cardioKey) : undefined;
}

function snapshotJsonForRow(
  row: PrescriptionRow,
  section: SectionRow,
  day: DayRow,
  programId: string,
  revisionId: string,
  cardioOptions: readonly ReturnType<typeof cardioOptionForRow>[],
  equipmentProfileKind: EquipmentProfileKind,
  availableEquipment: readonly EquipmentId[],
  previousValues: ReadonlyMap<number, WorkoutMeasurement>,
): Record<string, unknown> {
  return {
    schemaVersion: 2,
    programId,
    revisionId,
    dayId: day.id,
    dayName: day.displayName,
    dayKey: day.dayKey,
    sectionId: section.id,
    sectionKind: section.kind,
    sectionTitle: section.title,
    sectionKey: section.sectionKey,
    prescriptionId: row.id,
    prescriptionKey: row.prescriptionKey,
    catalogExerciseId: row.catalogExerciseId,
    customExerciseId: row.customExerciseId,
    displayName: row.displayName,
    setKind: row.setKind,
    setCount: row.setCount,
    measurementKind: row.measurementKind,
    minimumReps: row.minimumReps,
    maximumReps: row.maximumReps,
    minimumSeconds: row.minimumSeconds,
    maximumSeconds: row.maximumSeconds,
    restSeconds: row.restSeconds,
    targetWeightKg: row.targetWeightKg,
    targetDistanceM: row.targetDistanceM,
    notes: row.notes,
    targetMetadata: row.targetMetadata,
    cardioOptions,
    equipmentProfileKind,
    availableEquipment,
    requiredEquipment: row.requiredEquipment,
    previousValues: Object.fromEntries(
      [...previousValues.entries()].map(([position, measurement]) => [position, measurement]),
    ),
  };
}

function cardioOptionForRow(row: CardioPrescriptionRow): {
  id: string;
  cardioKey: string;
  mode: CardioMode;
  targetDurationSeconds: number;
  targetDistanceMeters?: number;
  targetPaceSecondsPerKilometer?: number;
  targetInclinePercent?: number;
  notes?: string;
} {
  return {
    id: row.id,
    cardioKey: row.cardioKey,
    mode: row.mode,
    targetDurationSeconds: row.durationSeconds,
    ...(row.distanceM === null ? {} : { targetDistanceMeters: row.distanceM }),
    ...(row.paceSecondsPerKm === null ? {} : { targetPaceSecondsPerKilometer: row.paceSecondsPerKm }),
    ...(row.inclinePercent === null ? {} : { targetInclinePercent: row.inclinePercent }),
    ...(row.notes === null ? {} : { notes: row.notes }),
  };
}

function exerciseIdentity(catalogExerciseId: string | null, customExerciseId: string | null): string {
  if (catalogExerciseId) return `catalog:${catalogExerciseId}`;
  if (customExerciseId) return `custom:${customExerciseId}`;
  throw new WorkoutRepositoryError("conflict", "The published workout exercise identity is invalid.");
}

function previousMeaningIdentity(
  catalogExerciseId: string | null,
  customExerciseId: string | null,
  setKind: "warmup" | "work",
  measurementKind: MeasurementKind,
): string {
  return `${exerciseIdentity(catalogExerciseId, customExerciseId)}:${setKind}:${measurementKind}`;
}

function availableEquipmentFromSnapshot(snapshot: SnapshotRow): readonly EquipmentId[] {
  const value = snapshot.prescriptionSnapshot["availableEquipment"];
  if (!Array.isArray(value)) {
    throw new WorkoutRepositoryError("conflict", "The workout equipment snapshot is incomplete.");
  }
  const known = new Set<EquipmentId>(Object.values(EQUIPMENT_PROFILES).flatMap(({ equipment }) => equipment));
  if (value.some((equipment) => typeof equipment !== "string" || !known.has(equipment as EquipmentId))) {
    throw new WorkoutRepositoryError("conflict", "The workout equipment snapshot is invalid.");
  }
  return value as EquipmentId[];
}

function createSnapshotRows(
  sessionId: string,
  ownerUid: string,
  day: DayRow,
  sections: readonly SectionRow[],
  prescriptions: readonly PrescriptionRow[],
  cardioOptions: readonly ReturnType<typeof cardioOptionForRow>[],
  programId: string,
  revisionId: string,
  equipmentProfileKind: EquipmentProfileKind,
  availableEquipment: readonly EquipmentId[],
  previousValuesByExercise: ReadonlyMap<string, ReadonlyMap<number, WorkoutMeasurement>>,
  personalGuidanceByExercise: ReadonlyMap<
    string,
    readonly PersonalGuidanceLink[]
  >,
): readonly SnapshotInsertRow[] {
  const sectionsById = new Map(sections.map((section) => [section.id, section] as const));
  const rows = [...prescriptions]
    .sort((left, right) => {
      const leftSection = sectionsById.get(left.sectionId)?.displayOrder ?? 0;
      const rightSection = sectionsById.get(right.sectionId)?.displayOrder ?? 0;
      return leftSection - rightSection || left.displayOrder - right.displayOrder;
    })
    .map((row, index) => {
      const section = sectionsById.get(row.sectionId);
      if (!section) throw new WorkoutRepositoryError("conflict", "The published workout section is incomplete.");
      const catalogLoggingKind = row.catalogLoggingKind;
      const customLoggingKind = row.customLoggingKind;
      const actualLoggingKind = catalogLoggingKind ?? customLoggingKind;
      const actualName = row.catalogName ?? row.customName;
      if (!actualLoggingKind || !actualName || actualLoggingKind !== row.measurementKind) {
        throw new WorkoutRepositoryError("conflict", "The published workout exercise meaning is invalid.");
      }
      if ((row.catalogExerciseId === null) === (row.customExerciseId === null)) {
        throw new WorkoutRepositoryError("conflict", "The published workout exercise identity is invalid.");
      }
      const available = new Set(availableEquipment);
      if (!row.requiredEquipment.every((equipment) => available.has(equipment))) {
        notFound();
      }
      if (row.measurementKind === "distance_duration" && (row.targetDistanceM === null || row.targetDistanceM <= 0)) {
        throw new WorkoutRepositoryError("conflict", "The published distance target is invalid.");
      }
      return {
        ownerFirebaseUid: ownerUid,
        sessionId,
        position: index + 1,
        sectionKind: section.kind,
        displayName: row.displayName ?? actualName,
        loggingKind: row.measurementKind,
        catalogExerciseId: row.catalogExerciseId,
        customExerciseId: row.customExerciseId,
        minimumReps: row.minimumReps,
        maximumReps: row.maximumReps,
        minimumSeconds: row.minimumSeconds,
        maximumSeconds: row.maximumSeconds,
        setCount: row.setCount,
        restSeconds: row.restSeconds,
        targetWeightKg: row.targetWeightKg,
        targetDistanceM: row.targetDistanceM,
        guidanceSnapshot:
          personalGuidanceByExercise.get(
            exerciseIdentity(row.catalogExerciseId, row.customExerciseId),
          ) ?? [],
        prescriptionSnapshot: snapshotJsonForRow(
          row,
          section,
          day,
          programId,
          revisionId,
          cardioOptions,
          equipmentProfileKind,
          availableEquipment,
          previousValuesByExercise.get(previousMeaningIdentity(row.catalogExerciseId, row.customExerciseId, row.setKind, row.measurementKind)) ?? new Map(),
        ),
      };
    });
  if (rows.length === 0) {
    throw new WorkoutRepositoryError("conflict", "A workout day must contain an exercise.");
  }
  return rows;
}

async function selectProgram(tx: TxDatabase, ownerUid: string, programId: string): Promise<ProgramRow> {
  const rows = await tx
    .select({
      id: userPrograms.id,
      ownerFirebaseUid: userPrograms.ownerFirebaseUid,
      name: userPrograms.name,
      activeRevisionId: userPrograms.activeRevisionId,
    })
    .from(userPrograms)
    .where(
      and(
        eq(userPrograms.ownerFirebaseUid, ownerUid),
        eq(userPrograms.id, programId),
        eq(userPrograms.isActive, true),
      ),
    )
    .limit(1);
  const row = rows[0] as ProgramRow | undefined;
  if (!row) notFound();
  return row;
}

async function selectActiveRevision(tx: TxDatabase, ownerUid: string, program: ProgramRow): Promise<RevisionRow> {
  if (!program.activeRevisionId) notFound();
  const rows = await tx
    .select({
      id: programRevisions.id,
      ownerFirebaseUid: programRevisions.ownerFirebaseUid,
      programId: programRevisions.programId,
      status: programRevisions.status,
      publishedAt: programRevisions.publishedAt,
      equipmentProfileKind: programRevisions.equipmentProfileKind,
    })
    .from(programRevisions)
    .where(and(
      eq(programRevisions.ownerFirebaseUid, ownerUid),
      eq(programRevisions.programId, program.id),
      eq(programRevisions.id, program.activeRevisionId),
      eq(programRevisions.status, "published"),
    ))
    .limit(1);
  const row = rows[0] as RevisionRow | undefined;
  if (!row || !row.publishedAt) notFound();
  return row;
}

async function selectWorkoutEquipment(
  tx: TxDatabase,
  ownerUid: string,
  revision: RevisionRow,
): Promise<WorkoutEquipmentSnapshot> {
  const rows = await tx
    .select({ profileKind: userEquipmentProfiles.profileKind })
    .from(userEquipmentProfiles)
    .where(eq(userEquipmentProfiles.ownerFirebaseUid, ownerUid))
    .limit(1);
  const profileKind = rows[0]?.profileKind;
  if (!profileKind || profileKind !== revision.equipmentProfileKind) {
    notFound();
  }
  return {
    profileKind,
    availableEquipment: EQUIPMENT_PROFILES[profileKind].equipment,
  };
}

async function selectDay(tx: TxDatabase, ownerUid: string, program: ProgramRow, revision: RevisionRow, dayId: string): Promise<DayRow> {
  const rows = await tx
    .select({
      id: programDays.id,
      ownerFirebaseUid: programDays.ownerFirebaseUid,
      programId: programDays.programId,
      revisionId: programDays.revisionId,
      dayKey: programDays.dayKey,
      displayName: programDays.displayName,
    })
    .from(programDays)
    .where(and(
      eq(programDays.ownerFirebaseUid, ownerUid),
      eq(programDays.programId, program.id),
      eq(programDays.revisionId, revision.id),
      eq(programDays.id, dayId),
    ))
    .limit(1);
  const row = rows[0] as DayRow | undefined;
  if (!row) notFound();
  return row;
}

async function selectDayMeaning(
  tx: TxDatabase,
  ownerUid: string,
  program: ProgramRow,
  revision: RevisionRow,
  day: DayRow,
): Promise<Readonly<{ sections: SectionRow[]; prescriptions: PrescriptionRow[]; cardioOptions: ReturnType<typeof cardioOptionForRow>[] }>> {
  const sections = await tx
    .select({
      id: programSections.id,
      sectionKey: programSections.sectionKey,
      kind: programSections.kind,
      displayOrder: programSections.displayOrder,
      title: programSections.title,
    })
    .from(programSections)
    .where(and(
      eq(programSections.ownerFirebaseUid, ownerUid),
      eq(programSections.programId, program.id),
      eq(programSections.revisionId, revision.id),
      eq(programSections.dayId, day.id),
    ))
    .orderBy(asc(programSections.displayOrder));
  const sectionIds = sections.map(({ id }) => id);
  const prescriptions = sectionIds.length === 0
    ? []
    : await tx
      .select({
        id: programPrescriptions.id,
        sectionId: programPrescriptions.sectionId,
        prescriptionKey: programPrescriptions.prescriptionKey,
        catalogExerciseId: programPrescriptions.catalogExerciseId,
        customExerciseId: programPrescriptions.customExerciseId,
        displayName: programPrescriptions.displayName,
        displayOrder: programPrescriptions.displayOrder,
        setKind: programPrescriptions.setKind,
        setCount: programPrescriptions.setCount,
        measurementKind: programPrescriptions.measurementKind,
        minimumReps: programPrescriptions.minimumReps,
        maximumReps: programPrescriptions.maximumReps,
        minimumSeconds: programPrescriptions.minimumSeconds,
        maximumSeconds: programPrescriptions.maximumSeconds,
        restSeconds: programPrescriptions.restSeconds,
        targetWeightKg: programPrescriptions.targetWeightKg,
        targetDistanceM: programPrescriptions.targetDistanceM,
        notes: programPrescriptions.notes,
        targetMetadata: programPrescriptions.targetMetadata,
        catalogName: catalogExercises.name,
        catalogLoggingKind: catalogExercises.loggingKind,
        customName: customExercises.name,
        customLoggingKind: customExercises.loggingKind,
      })
      .from(programPrescriptions)
      .leftJoin(catalogExercises, eq(programPrescriptions.catalogExerciseId, catalogExercises.id))
      .leftJoin(customExercises, and(
        eq(programPrescriptions.customExerciseId, customExercises.id),
        eq(programPrescriptions.ownerFirebaseUid, customExercises.ownerFirebaseUid),
      ))
      .where(and(
        eq(programPrescriptions.ownerFirebaseUid, ownerUid),
        eq(programPrescriptions.programId, program.id),
        eq(programPrescriptions.revisionId, revision.id),
        inArray(programPrescriptions.sectionId, sectionIds),
      ))
      .orderBy(asc(programPrescriptions.displayOrder));
  const cardio = await tx
    .select({
      id: programCardioPrescriptions.id,
      cardioKey: programCardioPrescriptions.cardioKey,
      displayOrder: programCardioPrescriptions.displayOrder,
      mode: programCardioPrescriptions.mode,
      durationSeconds: programCardioPrescriptions.durationSeconds,
      distanceM: programCardioPrescriptions.distanceM,
      paceSecondsPerKm: programCardioPrescriptions.paceSecondsPerKm,
      inclinePercent: programCardioPrescriptions.inclinePercent,
      notes: programCardioPrescriptions.notes,
    })
    .from(programCardioPrescriptions)
    .where(and(
      eq(programCardioPrescriptions.ownerFirebaseUid, ownerUid),
      eq(programCardioPrescriptions.programId, program.id),
      eq(programCardioPrescriptions.revisionId, revision.id),
      eq(programCardioPrescriptions.dayId, day.id),
    ))
    .orderBy(asc(programCardioPrescriptions.displayOrder));
  const typedPrescriptions = prescriptions as PrescriptionRow[];
  const catalogIds = typedPrescriptions.flatMap(({ catalogExerciseId }) => catalogExerciseId ? [catalogExerciseId] : []);
  const customIds = typedPrescriptions.flatMap(({ customExerciseId }) => customExerciseId ? [customExerciseId] : []);
  const catalogEquipmentRows = catalogIds.length === 0
    ? []
    : await tx
      .select({ exerciseId: exerciseEquipment.exerciseId, equipmentId: exerciseEquipment.equipmentId })
      .from(exerciseEquipment)
      .where(inArray(exerciseEquipment.exerciseId, catalogIds));
  const customEquipmentRows = customIds.length === 0
    ? []
    : await tx
      .select({ customExerciseId: customExerciseEquipment.customExerciseId, equipmentId: customExerciseEquipment.equipmentId })
      .from(customExerciseEquipment)
      .where(and(
        eq(customExerciseEquipment.ownerFirebaseUid, ownerUid),
        inArray(customExerciseEquipment.customExerciseId, customIds),
      ));
  const knownEquipment = new Set<EquipmentId>(Object.values(EQUIPMENT_PROFILES).flatMap(({ equipment }) => equipment));
  const equipmentByExercise = new Map<string, EquipmentId[]>();
  for (const row of catalogEquipmentRows) {
    if (!knownEquipment.has(row.equipmentId as EquipmentId)) {
      throw new WorkoutRepositoryError("conflict", "The published workout equipment meaning is invalid.");
    }
    const key = exerciseIdentity(row.exerciseId, null);
    equipmentByExercise.set(key, [...(equipmentByExercise.get(key) ?? []), row.equipmentId as EquipmentId]);
  }
  for (const row of customEquipmentRows) {
    if (!knownEquipment.has(row.equipmentId as EquipmentId)) {
      throw new WorkoutRepositoryError("conflict", "The published workout equipment meaning is invalid.");
    }
    const key = exerciseIdentity(null, row.customExerciseId);
    equipmentByExercise.set(key, [...(equipmentByExercise.get(key) ?? []), row.equipmentId as EquipmentId]);
  }
  return {
    sections: sections as SectionRow[],
    prescriptions: typedPrescriptions.map((row) => ({
      ...row,
      requiredEquipment: equipmentByExercise.get(exerciseIdentity(row.catalogExerciseId, row.customExerciseId)) ?? [],
    })),
    cardioOptions: (cardio as CardioPrescriptionRow[]).map(cardioOptionForRow),
  };
}

async function selectPreviousValues(
  tx: TxDatabase,
  ownerUid: string,
  prescriptions: readonly PrescriptionRow[],
): Promise<Map<string, Map<number, WorkoutMeasurement>>> {
  const result = new Map<string, Map<number, WorkoutMeasurement>>();
  const requested = new Map<string, PrescriptionRow>();
  for (const prescription of prescriptions) {
    const key = previousMeaningIdentity(
      prescription.catalogExerciseId,
      prescription.customExerciseId,
      prescription.setKind,
      prescription.measurementKind,
    );
    requested.set(key, prescription);
  }
  if (requested.size === 0) return result;
  if (requested.size > MAX_PREVIOUS_IDENTITIES) {
    throw new WorkoutRepositoryError("not_ready", "This workout has too many exercise meanings to select previous values safely.");
  }

  // Each meaning gets one latest completed outcome. The log query is scoped to
  // that exact session, so a shorter latest workout can never be backfilled by
  // positions from an older session.
  for (const [key, prescription] of requested) {
    const effectiveIdentity = prescription.catalogExerciseId
      ? eq(workoutExerciseStates.effectiveCatalogExerciseId, prescription.catalogExerciseId)
      : eq(workoutExerciseStates.effectiveCustomExerciseId, prescription.customExerciseId!);
    const latest = await tx
      .select({ sessionId: workoutSessions.id })
      .from(workoutSessions)
      .innerJoin(workoutExerciseSnapshots, and(
        eq(workoutExerciseSnapshots.ownerFirebaseUid, workoutSessions.ownerFirebaseUid),
        eq(workoutExerciseSnapshots.sessionId, workoutSessions.id),
      ))
      .innerJoin(workoutExerciseStates, and(
        eq(workoutExerciseStates.ownerFirebaseUid, workoutExerciseSnapshots.ownerFirebaseUid),
        eq(workoutExerciseStates.sessionId, workoutExerciseSnapshots.sessionId),
        eq(workoutExerciseStates.snapshotId, workoutExerciseSnapshots.id),
      ))
      .where(and(
        eq(workoutSessions.ownerFirebaseUid, ownerUid),
        eq(workoutSessions.state, "completed"),
        eq(workoutExerciseStates.status, "completed"),
        effectiveIdentity,
        eq(workoutExerciseStates.effectiveLoggingKind, prescription.measurementKind),
        sql`${workoutExerciseSnapshots.prescriptionSnapshot}->>'setKind' = ${prescription.setKind}`,
      ))
      .orderBy(desc(workoutSessions.completedAt), desc(workoutSessions.createdAt), desc(workoutSessions.id))
      .limit(1);
    const sessionId = latest[0]?.sessionId;
    if (!sessionId) continue;

    const rows = await tx
      .select({
        setPosition: setLogs.setPosition,
        measurementKind: setLogs.measurementKind,
        setKind: setLogs.setKind,
        weightKg: setLogs.weightKg,
        addedWeightKg: setLogs.addedWeightKg,
        repetitions: setLogs.repetitions,
        durationSeconds: setLogs.durationSeconds,
        distanceM: setLogs.distanceM,
        noteSnapshot: setLogs.noteSnapshot,
      })
      .from(setLogs)
      .innerJoin(workoutExerciseSnapshots, and(
        eq(workoutExerciseSnapshots.ownerFirebaseUid, setLogs.ownerFirebaseUid),
        eq(workoutExerciseSnapshots.sessionId, setLogs.sessionId),
        eq(workoutExerciseSnapshots.id, setLogs.snapshotId),
      ))
      .innerJoin(workoutExerciseStates, and(
        eq(workoutExerciseStates.ownerFirebaseUid, setLogs.ownerFirebaseUid),
        eq(workoutExerciseStates.sessionId, setLogs.sessionId),
        eq(workoutExerciseStates.snapshotId, setLogs.snapshotId),
      ))
      .where(and(
        eq(setLogs.ownerFirebaseUid, ownerUid),
        eq(setLogs.sessionId, sessionId),
        eq(setLogs.setKind, prescription.setKind),
        eq(setLogs.measurementKind, prescription.measurementKind),
        eq(workoutExerciseStates.status, "completed"),
        effectiveIdentity,
        eq(workoutExerciseStates.effectiveLoggingKind, prescription.measurementKind),
      ))
      .orderBy(asc(setLogs.setPosition), desc(setLogs.recordedAt))
      .limit(MAX_PREVIOUS_SET_ROWS);
    if (rows.length === 0) continue;
    const values = new Map<number, WorkoutMeasurement>();
    for (const row of rows) {
      if (!values.has(row.setPosition)) values.set(row.setPosition, decodeMeasurement(row));
    }
    result.set(key, values);
  }
  return result;
}

function modelSnapshot(
  snapshots: readonly SnapshotRow[],
  states: readonly ExerciseStateRow[] = [],
): ActiveWorkoutSnapshot {
  const first = snapshots[0];
  if (!first) throw new WorkoutRepositoryError("conflict", "The workout snapshot is incomplete.");
  const dayId = first.prescriptionSnapshot["dayId"];
  const dayName = first.prescriptionSnapshot["dayName"];
  const dayKey = typeof first.prescriptionSnapshot["dayKey"] === "string" && first.prescriptionSnapshot["dayKey"].trim().length > 0
    ? first.prescriptionSnapshot["dayKey"]
    : undefined;
  const equipmentProfileValue = first.prescriptionSnapshot["equipmentProfileKind"];
  const equipmentProfileKind = equipmentProfileValue === "dumbbells" || equipmentProfileValue === "barbell"
    ? equipmentProfileValue
    : undefined;
  const availableEquipmentValue = first.prescriptionSnapshot["availableEquipment"];
  let availableEquipment: readonly EquipmentId[] | undefined;
  if (availableEquipmentValue !== undefined) {
    const knownEquipment = new Set<string>(EQUIPMENT_IDS);
    if (
      !Array.isArray(availableEquipmentValue) ||
      availableEquipmentValue.length === 0 ||
      availableEquipmentValue.some((equipment) => typeof equipment !== "string" || !knownEquipment.has(equipment))
    ) {
      throw new WorkoutRepositoryError("conflict", "The workout equipment snapshot is invalid.");
    }
    availableEquipment = availableEquipmentValue as EquipmentId[];
  }
  if (typeof dayId !== "string" || typeof dayName !== "string") {
    throw new WorkoutRepositoryError("conflict", "The workout day snapshot is incomplete.");
  }
  const stateBySnapshot = new Map(states.map((state) => [state.snapshotId, state] as const));
  const exercises = snapshots.map((row) => {
    const input = snapshotInputForRow(row);
    const state = stateBySnapshot.get(row.id);
    if (state && state.effectiveLoggingKind !== row.loggingKind) {
      throw new WorkoutRepositoryError("conflict", "The workout outcome meaning is incompatible with its snapshot.");
    }
    return state && state.effectiveDisplayName !== input.name
      ? { ...input, name: state.effectiveDisplayName }
      : input;
  });
  return createWorkoutSnapshot({
    sessionId: first.sessionId,
    ownerUid: first.ownerFirebaseUid,
    programRevisionId: typeof first.prescriptionSnapshot["revisionId"] === "string" ? first.prescriptionSnapshot["revisionId"] : "",
    dayId,
    dayName,
    ...(dayKey === undefined ? {} : { dayKey }),
    ...(equipmentProfileKind === undefined ? {} : { equipmentProfileKind }),
    ...(availableEquipment === undefined ? {} : { availableEquipment }),
    exercises,
    cardioOptions: cardioSnapshotFromJson(first.prescriptionSnapshot["cardioOptions"]),
  });
}

async function buildModel(tx: TxDatabase, session: SessionRow): Promise<WorkoutResumeReadModel> {
  const snapshots = await selectSnapshots(tx, session.ownerFirebaseUid, session.id);
  const states = await selectStates(tx, session.ownerFirebaseUid, session.id);
  const snapshot = modelSnapshot(snapshots, states);
  if (states.length !== snapshots.length) {
    throw new WorkoutRepositoryError("conflict", "The workout outcome snapshot is incomplete.");
  }
  const setLogRows = await selectSetLogs(tx, session.ownerFirebaseUid, session.id);
  const cardioLog = await selectCardioLog(tx, session.ownerFirebaseUid, session.id, snapshot.cardioOptions);
  return {
    session: sessionView(session, snapshots),
    snapshot,
    exerciseStates: states.map(parseStateView),
    setLogs: setLogRows,
    cardioLog,
  };
}

async function resumeExistingWorkoutForRequestedDay(
  tx: TxDatabase,
  ownerUid: string,
  sessionId: string,
  requestedDayId: string,
): Promise<StartWorkoutResult> {
  const session = await selectSession(tx, ownerUid, sessionId);
  const model = await buildModel(tx, session);
  if (model.session.dayId !== requestedDayId) {
    throw new WorkoutRepositoryError(
      "conflict",
      `A workout for ${model.session.dayName} is already in progress. Resume it before starting another day.`,
    );
  }
  return { resumed: true, model };
}

async function existingIdempotency(
  tx: TxDatabase,
  ownerUid: string,
  input: SubmitWorkoutOperationInput,
  hash: string,
): Promise<WorkoutOperationResult | undefined> {
  const rows = await tx
    .select({
      sessionId: idempotencyKeys.sessionId,
      operation: idempotencyKeys.operation,
      requestHash: idempotencyKeys.requestHash,
      resultPayload: idempotencyKeys.resultPayload,
    })
    .from(idempotencyKeys)
    .where(and(eq(idempotencyKeys.ownerFirebaseUid, ownerUid), eq(idempotencyKeys.idempotencyKey, input.idempotencyKey)))
    .limit(1);
  const row = rows[0];
  if (!row) return undefined;
  if (row.operation !== input.kind || row.requestHash !== hash || row.sessionId !== input.sessionId) {
    throw new WorkoutRepositoryError("conflict", "The idempotency key was already used for another request.");
  }
  let value: Record<string, unknown>;
  try {
    value = jsonObject(row.resultPayload, "idempotency result");
  } catch {
    throw new WorkoutRepositoryError("conflict", "The stored idempotency result is malformed.");
  }
  const storedStatus = value["status"];
  const storedSessionState = value["sessionState"];
  const storedPersistedId = value["persistedId"];
  const storedExerciseVersion = value["exerciseVersion"];
  if (
    Object.keys(value).some((key) => !["status", "persistedId", "sessionState", "exerciseVersion"].includes(key)) ||
    storedStatus !== "saved"
    || typeof storedSessionState !== "string"
    || !(["draft", "active", "completing", "completed", "abandoned"] as readonly string[]).includes(storedSessionState)
    || (storedPersistedId !== undefined && (typeof storedPersistedId !== "string" || storedPersistedId.trim().length === 0 || storedPersistedId.length > 180))
    || (storedExerciseVersion !== undefined && (typeof storedExerciseVersion !== "number" || !Number.isInteger(storedExerciseVersion) || storedExerciseVersion < 1))
  ) {
    throw new WorkoutRepositoryError("conflict", "The stored idempotency result is malformed.");
  }
  return {
    status: "duplicate",
    persistedId: storedPersistedId,
    sessionState: storedSessionState as WorkoutSessionState,
    exerciseVersion: storedExerciseVersion as number | undefined,
  };
}

async function insertIdempotency(
  tx: TxDatabase,
  ownerUid: string,
  input: SubmitWorkoutOperationInput,
  hash: string,
  result: WorkoutOperationResult,
): Promise<void> {
  await tx.insert(idempotencyKeys).values({
    ownerFirebaseUid: ownerUid,
    sessionId: input.sessionId,
    idempotencyKey: input.idempotencyKey,
    operation: input.kind,
    requestHash: hash,
    resultPayload: { ...result },
  });
}

function assertExpectedVersion(expectedVersion: number | undefined, currentVersion: number): void {
  if (expectedVersion === undefined) return;
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
    throw new WorkoutRepositoryError("invalid_request", "expectedVersion is invalid.");
  }
  if (expectedVersion !== currentVersion) {
    throw new WorkoutRepositoryError("stale_version", "The workout exercise changed; reload before retrying.");
  }
}

function requireExpectedVersion(expectedVersion: number | undefined, currentVersion: number): void {
  if (expectedVersion === undefined) {
    throw new WorkoutRepositoryError("invalid_request", "expectedVersion is required for an exercise outcome.");
  }
  assertExpectedVersion(expectedVersion, currentVersion);
}

function assertStateVersion(input: InternalSubmitWorkoutOperationInput, currentVersion: number): void {
  if (input.serverDerivedVersion === true) return;
  requireExpectedVersion(input.expectedVersion, currentVersion);
}

function assertExercisePending(state: ExerciseStateRow): void {
  if (state.status !== "pending") {
    throw new WorkoutRepositoryError("terminal", "A completed or skipped exercise cannot change.");
  }
}

function operationPayload(input: SubmitWorkoutOperationInput): RunnerOperationPayload {
  if (!isRecord(input.payload) || input.payload.kind !== input.kind) {
    throw new WorkoutRepositoryError("invalid_request", "The operation payload does not match its kind.");
  }
  return input.payload;
}

function validateOperationResourceIds(payload: RunnerOperationPayload): void {
  switch (payload.kind) {
    case "save_set":
      resourceUuid(payload.exerciseId, "exerciseId");
      parseSetId(stringProperty(payload.setId, "setId"));
      return;
    case "save_note":
    case "skip_exercise":
    case "complete_exercise":
      resourceUuid(payload.exerciseId, "exerciseId");
      return;
    case "substitute_exercise": {
      resourceUuid(payload.exerciseId, "exerciseId");
      const replacement = jsonObject(payload.replacement, "replacement");
      resourceUuid(replacement["id"], "replacement.id");
      return;
    }
    case "complete_session":
    case "abandon_session":
      resourceUuid(payload.sessionId, "sessionId");
      return;
    case "save_cardio":
      return;
  }
}

function stringProperty(value: unknown, field: string, maxLength = 180): string {
  return nonblank(value, field, maxLength);
}

function parseSetId(setId: string): Readonly<{ snapshotId: string; position: number }> {
  const separator = setId.lastIndexOf(":");
  if (separator <= 0) throw new WorkoutRepositoryError("invalid_request", "setId is invalid.");
  const snapshotId = resourceUuid(setId.slice(0, separator), "snapshotId");
  const position = Number(setId.slice(separator + 1));
  if (!Number.isInteger(position) || position < 1) throw new WorkoutRepositoryError("invalid_request", "setId is invalid.");
  return { snapshotId, position };
}

async function selectSnapshotForOperation(tx: TxDatabase, ownerUid: string, sessionId: string, snapshotId: string): Promise<SnapshotRow> {
  const validatedSnapshotId = resourceUuid(snapshotId, "snapshotId");
  const rows = await tx
    .select({
      id: workoutExerciseSnapshots.id,
      ownerFirebaseUid: workoutExerciseSnapshots.ownerFirebaseUid,
      sessionId: workoutExerciseSnapshots.sessionId,
      position: workoutExerciseSnapshots.position,
      sectionKind: workoutExerciseSnapshots.sectionKind,
      displayName: workoutExerciseSnapshots.displayName,
      loggingKind: workoutExerciseSnapshots.loggingKind,
      catalogExerciseId: workoutExerciseSnapshots.catalogExerciseId,
      customExerciseId: workoutExerciseSnapshots.customExerciseId,
      minimumReps: workoutExerciseSnapshots.minimumReps,
      maximumReps: workoutExerciseSnapshots.maximumReps,
      minimumSeconds: workoutExerciseSnapshots.minimumSeconds,
      maximumSeconds: workoutExerciseSnapshots.maximumSeconds,
      setCount: workoutExerciseSnapshots.setCount,
      restSeconds: workoutExerciseSnapshots.restSeconds,
      targetWeightKg: workoutExerciseSnapshots.targetWeightKg,
      targetDistanceM: workoutExerciseSnapshots.targetDistanceM,
      prescriptionSnapshot: workoutExerciseSnapshots.prescriptionSnapshot,
      guidanceSnapshot: workoutExerciseSnapshots.guidanceSnapshot,
    })
    .from(workoutExerciseSnapshots)
    .where(and(eq(workoutExerciseSnapshots.ownerFirebaseUid, ownerUid), eq(workoutExerciseSnapshots.sessionId, sessionId), eq(workoutExerciseSnapshots.id, validatedSnapshotId)))
    .limit(1);
  const row = rows[0] as SnapshotRow | undefined;
  if (!row) notFound();
  return row;
}

async function selectStateForOperation(tx: TxDatabase, ownerUid: string, sessionId: string, snapshotId: string): Promise<ExerciseStateRow> {
  const validatedSnapshotId = resourceUuid(snapshotId, "snapshotId");
  const rows = await tx
    .select({
      snapshotId: workoutExerciseStates.snapshotId,
      status: workoutExerciseStates.status,
      effectiveCatalogExerciseId: workoutExerciseStates.effectiveCatalogExerciseId,
      effectiveCustomExerciseId: workoutExerciseStates.effectiveCustomExerciseId,
      effectiveDisplayName: workoutExerciseStates.effectiveDisplayName,
      effectiveLoggingKind: workoutExerciseStates.effectiveLoggingKind,
      note: workoutExerciseStates.note,
      substitutionReason: workoutExerciseStates.substitutionReason,
      lastClientOperationId: workoutExerciseStates.lastClientOperationId,
      version: workoutExerciseStates.version,
    })
    .from(workoutExerciseStates)
    .where(and(eq(workoutExerciseStates.ownerFirebaseUid, ownerUid), eq(workoutExerciseStates.sessionId, sessionId), eq(workoutExerciseStates.snapshotId, validatedSnapshotId)))
    .limit(1);
  const row = rows[0] as ExerciseStateRow | undefined;
  if (!row) notFound();
  return row;
}

function assertSessionMutable(session: SessionRow): void {
  if (sessionIsTerminal(session.state)) {
    throw new WorkoutRepositoryError("terminal", "A completed or abandoned workout cannot change.");
  }
}

async function updateExerciseState(
  tx: TxDatabase,
  ownerUid: string,
  sessionId: string,
  snapshotId: string,
  state: ExerciseStateRow,
  values: Readonly<{
    status?: "pending" | "completed" | "skipped";
    effectiveCatalogExerciseId?: string | null;
    effectiveCustomExerciseId?: string | null;
    effectiveDisplayName?: string;
    effectiveLoggingKind?: MeasurementKind;
    note?: string | null;
    substitutionReason?: string | null;
    operationId: string;
  }>,
): Promise<number> {
  const nextVersion = state.version + 1;
  const changed = await tx
    .update(workoutExerciseStates)
    .set({
      ...(values.status === undefined ? {} : { status: values.status }),
      ...(values.effectiveCatalogExerciseId === undefined ? {} : { effectiveCatalogExerciseId: values.effectiveCatalogExerciseId }),
      ...(values.effectiveCustomExerciseId === undefined ? {} : { effectiveCustomExerciseId: values.effectiveCustomExerciseId }),
      ...(values.effectiveDisplayName === undefined ? {} : { effectiveDisplayName: values.effectiveDisplayName }),
      ...(values.effectiveLoggingKind === undefined ? {} : { effectiveLoggingKind: values.effectiveLoggingKind }),
      ...(values.note === undefined ? {} : { note: values.note }),
      ...(values.substitutionReason === undefined ? {} : { substitutionReason: values.substitutionReason }),
      lastClientOperationId: values.operationId,
      version: nextVersion,
    })
    .where(and(
      eq(workoutExerciseStates.ownerFirebaseUid, ownerUid),
      eq(workoutExerciseStates.sessionId, sessionId),
      eq(workoutExerciseStates.snapshotId, snapshotId),
      eq(workoutExerciseStates.version, state.version),
    ))
    .returning({ snapshotId: workoutExerciseStates.snapshotId });
  if (changed.length !== 1) {
    throw new WorkoutRepositoryError("conflict", "The workout exercise changed before it could be saved.", { retryable: true });
  }
  const updated = await selectStateForOperation(tx, ownerUid, sessionId, snapshotId);
  if (updated.version !== nextVersion || updated.lastClientOperationId !== values.operationId) {
    throw new WorkoutRepositoryError("conflict", "The workout exercise changed before it could be saved.", { retryable: true });
  }
  return nextVersion;
}

async function operationResult(
  tx: TxDatabase,
  session: SessionRow,
  persistedId: string | undefined,
  exerciseVersion: number | undefined,
): Promise<WorkoutOperationResult> {
  const refreshed = await selectSession(tx, session.ownerFirebaseUid, session.id);
  return {
    status: "saved",
    persistedId,
    sessionState: refreshed.state,
    exerciseVersion,
  };
}

function operationReason(value: unknown): string | undefined {
  return optionalText(value, "reason", MAX_REASON_LENGTH);
}

function operationNote(value: unknown): string {
  if (typeof value !== "string" || value.length > MAX_NOTE_LENGTH) {
    throw new WorkoutRepositoryError("invalid_request", "note is invalid.");
  }
  return value;
}

async function applyOperation(
  tx: TxDatabase,
  ownerUid: string,
  session: SessionRow,
  input: InternalSubmitWorkoutOperationInput,
): Promise<WorkoutOperationResult> {
  assertSessionMutable(session);
  const payload = operationPayload(input);
  const now = dateOrNow(input.now);

  if (input.kind === "save_set") {
    const setPayload = payload as Extract<RunnerOperationPayload, { kind: "save_set" }>;
    const setId = stringProperty(setPayload.setId, "setId");
    const exerciseId = resourceUuid(setPayload.exerciseId, "exerciseId");
    const phase = setPayload.phase;
    if (phase !== "warmup" && phase !== "work") throw new WorkoutRepositoryError("invalid_request", "phase is invalid.");
    const parsedSet = parseSetId(setId);
    if (parsedSet.snapshotId !== exerciseId) throw new WorkoutRepositoryError("not_found", "The requested workout set was not found.");
    const snapshot = await selectSnapshotForOperation(tx, ownerUid, session.id, parsedSet.snapshotId);
    const state = await selectStateForOperation(tx, ownerUid, session.id, snapshot.id);
    assertStateVersion(input, state.version);
    assertExercisePending(state);
    if (parsedSet.position > snapshot.setCount) throw new WorkoutRepositoryError("invalid_request", "The set position exceeds the prescribed set count.");
    const measurement = assertMeasurementForSnapshot(setPayload.measurement, snapshot, phase);
    const existing = await tx
      .select({ id: setLogs.id })
      .from(setLogs)
      .where(and(eq(setLogs.ownerFirebaseUid, ownerUid), eq(setLogs.sessionId, session.id), eq(setLogs.snapshotId, snapshot.id), eq(setLogs.setPosition, parsedSet.position)))
      .limit(1);
    if (existing[0]) throw new WorkoutRepositoryError("conflict", "This set has already been saved.");
    const inserted = await tx.insert(setLogs).values({
      ownerFirebaseUid: ownerUid,
      sessionId: session.id,
      snapshotId: snapshot.id,
      setPosition: parsedSet.position,
      measurementKind: snapshot.loggingKind,
      setKind: phase === "warmup" ? "warmup" : "work",
      weightKg: measurement.kind === "weight_reps" ? measurement.weightKg : null,
      addedWeightKg: measurement.kind === "bodyweight_reps" ? measurement.addedWeightKg ?? null : null,
      repetitions: measurement.kind === "weight_reps" || measurement.kind === "bodyweight_reps" ? measurement.repetitions : null,
      durationSeconds: measurement.kind === "duration" || measurement.kind === "distance_duration" ? measurement.durationSeconds : null,
      distanceM: measurement.kind === "distance_duration" ? measurement.distanceMeters : null,
      noteSnapshot: null,
      recordedAt: now,
      clientIdempotencyKey: input.idempotencyKey,
    }).returning({ id: setLogs.id });
    const version = await updateExerciseState(tx, ownerUid, session.id, snapshot.id, state, {
      operationId: input.idempotencyKey,
    });
    return operationResult(tx, session, inserted[0]?.id, version);
  }

  if (input.kind === "save_cardio") {
    const cardioPayload = payload as Extract<RunnerOperationPayload, { kind: "save_cardio" }>;
    const mode = cardioPayload.mode;
    if (mode !== "walker" && mode !== "runner") throw new WorkoutRepositoryError("invalid_request", "mode is invalid.");
    const snapshots = await selectSnapshots(tx, ownerUid, session.id);
    const snapshot = snapshots[0];
    if (!snapshot) throw new WorkoutRepositoryError("conflict", "The workout snapshot is incomplete.");
    const cardio = assertCardio(cardioPayload.cardio, mode, cardioSnapshotFromJson(snapshot.prescriptionSnapshot["cardioOptions"]));
    const existing = await tx.select({ id: cardioLogs.id }).from(cardioLogs).where(and(eq(cardioLogs.ownerFirebaseUid, ownerUid), eq(cardioLogs.sessionId, session.id))).limit(1);
    if (existing[0]) throw new WorkoutRepositoryError("conflict", "Cardio has already been saved for this workout.");
    const inserted = await tx.insert(cardioLogs).values({
      ownerFirebaseUid: ownerUid,
      sessionId: session.id,
      mode,
      durationSeconds: cardio.durationSeconds,
      distanceM: cardio.distanceMeters ?? null,
      paceSecondsPerKm: cardio.paceSecondsPerKilometer ?? null,
      paceSource: cardio.paceSource ?? null,
      inclinePercent: cardio.inclinePercent ?? null,
      noteSnapshot: cardio.notes,
      recordedAt: now,
      clientIdempotencyKey: input.idempotencyKey,
    }).returning({ id: cardioLogs.id });
    return operationResult(tx, session, inserted[0]?.id, undefined);
  }

  if (input.kind === "save_note") {
    const notePayload = payload as Extract<RunnerOperationPayload, { kind: "save_note" }>;
    const exerciseId = resourceUuid(notePayload.exerciseId, "exerciseId");
    const state = await selectStateForOperation(tx, ownerUid, session.id, exerciseId);
    assertStateVersion(input, state.version);
    assertExercisePending(state);
    const version = await updateExerciseState(tx, ownerUid, session.id, exerciseId, state, {
      note: operationNote(notePayload.note),
      operationId: input.idempotencyKey,
    });
    return operationResult(tx, session, `${session.id}:${exerciseId}`, version);
  }

  if (input.kind === "skip_exercise") {
    const skipPayload = payload as Extract<RunnerOperationPayload, { kind: "skip_exercise" }>;
    const exerciseId = resourceUuid(skipPayload.exerciseId, "exerciseId");
    const state = await selectStateForOperation(tx, ownerUid, session.id, exerciseId);
    assertStateVersion(input, state.version);
    assertExercisePending(state);
    const version = await updateExerciseState(tx, ownerUid, session.id, exerciseId, state, {
      status: "skipped",
      note: operationReason(skipPayload.reason) ?? state.note,
      operationId: input.idempotencyKey,
    });
    return operationResult(tx, session, `${session.id}:${exerciseId}`, version);
  }

  if (input.kind === "substitute_exercise") {
    const substitutePayload = payload as Extract<RunnerOperationPayload, { kind: "substitute_exercise" }>;
    const exerciseId = resourceUuid(substitutePayload.exerciseId, "exerciseId");
    const state = await selectStateForOperation(tx, ownerUid, session.id, exerciseId);
    const snapshot = await selectSnapshotForOperation(tx, ownerUid, session.id, exerciseId);
    assertStateVersion(input, state.version);
    assertExercisePending(state);
    const logged = await tx.select({ id: setLogs.id }).from(setLogs).where(and(eq(setLogs.ownerFirebaseUid, ownerUid), eq(setLogs.sessionId, session.id), eq(setLogs.snapshotId, snapshot.id))).limit(1);
    if (logged[0]) throw new WorkoutRepositoryError("conflict", "An exercise cannot be substituted after a set is logged.");
    const replacement = jsonObject(substitutePayload.replacement, "replacement") as unknown as ExerciseSubstitution;
    const replacementId = resourceUuid(replacement.id, "replacement.id");
    let serverName: string | null = null;
    let serverLoggingKind: MeasurementKind | null = null;
    let catalogId: string | null = null;
    let customId: string | null = null;
    let requiredEquipment: EquipmentId[] = [];
    const catalog = await tx.select({ id: catalogExercises.id, name: catalogExercises.name, loggingKind: catalogExercises.loggingKind }).from(catalogExercises).where(eq(catalogExercises.id, replacementId)).limit(1);
    if (catalog[0]) {
      serverName = catalog[0].name;
      serverLoggingKind = catalog[0].loggingKind;
      catalogId = catalog[0].id;
      const equipmentRows = await tx
        .select({ equipmentId: exerciseEquipment.equipmentId })
        .from(exerciseEquipment)
        .where(eq(exerciseEquipment.exerciseId, catalog[0].id));
      requiredEquipment = equipmentRows.map(({ equipmentId }) => equipmentId as EquipmentId);
    } else {
      const custom = await tx.select({ id: customExercises.id, name: customExercises.name, loggingKind: customExercises.loggingKind }).from(customExercises).where(and(eq(customExercises.ownerFirebaseUid, ownerUid), eq(customExercises.id, replacementId))).limit(1);
      if (custom[0]) {
        serverName = custom[0].name;
        serverLoggingKind = custom[0].loggingKind;
        customId = custom[0].id;
        const equipmentRows = await tx
          .select({ equipmentId: customExerciseEquipment.equipmentId })
          .from(customExerciseEquipment)
          .where(and(
            eq(customExerciseEquipment.ownerFirebaseUid, ownerUid),
            eq(customExerciseEquipment.customExerciseId, custom[0].id),
          ));
        requiredEquipment = equipmentRows.map(({ equipmentId }) => equipmentId as EquipmentId);
      }
    }
    if (!serverName || !serverLoggingKind || (serverLoggingKind !== snapshot.loggingKind)) notFound("The requested replacement was not found.");
    const availableEquipment = new Set(availableEquipmentFromSnapshot(snapshot));
    if (!requiredEquipment.every((equipment) => availableEquipment.has(equipment))) {
      notFound("The requested replacement was not found.");
    }
    const version = await updateExerciseState(tx, ownerUid, session.id, exerciseId, state, {
      effectiveCatalogExerciseId: catalogId,
      effectiveCustomExerciseId: customId,
      effectiveDisplayName: serverName,
      effectiveLoggingKind: serverLoggingKind,
      substitutionReason: operationReason(substitutePayload.reason) ?? null,
      operationId: input.idempotencyKey,
    });
    return operationResult(tx, session, `${session.id}:${exerciseId}`, version);
  }

  if (input.kind === "complete_exercise") {
    const completePayload = payload as Extract<RunnerOperationPayload, { kind: "complete_exercise" }>;
    const exerciseId = resourceUuid(completePayload.exerciseId, "exerciseId");
    const state = await selectStateForOperation(tx, ownerUid, session.id, exerciseId);
    assertStateVersion(input, state.version);
    assertExercisePending(state);
    const snapshot = await selectSnapshotForOperation(tx, ownerUid, session.id, exerciseId);
    const logs = await tx.select({ position: setLogs.setPosition }).from(setLogs).where(and(eq(setLogs.ownerFirebaseUid, ownerUid), eq(setLogs.sessionId, session.id), eq(setLogs.snapshotId, snapshot.id)));
    const positions = new Set(logs.map(({ position }) => position));
    for (let position = 1; position <= snapshot.setCount; position += 1) {
      if (!positions.has(position)) throw new WorkoutRepositoryError("not_ready", "Log every prescribed set before completing the exercise.");
    }
    const version = await updateExerciseState(tx, ownerUid, session.id, exerciseId, state, {
      status: "completed",
      operationId: input.idempotencyKey,
    });
    return operationResult(tx, session, `${session.id}:${exerciseId}`, version);
  }

  if (input.kind === "complete_session") {
    const completePayload = payload as Extract<RunnerOperationPayload, { kind: "complete_session" }>;
    if (resourceUuid(completePayload.sessionId, "sessionId") !== session.id) notFound();
    const snapshots = await selectSnapshots(tx, ownerUid, session.id);
    const states = await selectStates(tx, ownerUid, session.id);
    if (states.some((state) => state.status === "pending")) throw new WorkoutRepositoryError("not_ready", "Complete or skip every exercise before completing the workout.");
    const completedSnapshotIds = states.filter((state) => state.status === "completed").map((state) => state.snapshotId);
    if (completedSnapshotIds.length > 0) {
      const completedLogs = await tx.select({ snapshotId: setLogs.snapshotId, setPosition: setLogs.setPosition }).from(setLogs).where(and(eq(setLogs.ownerFirebaseUid, ownerUid), eq(setLogs.sessionId, session.id), inArray(setLogs.snapshotId, completedSnapshotIds)));
      const logsBySnapshot = new Map<string, Set<number>>();
      for (const log of completedLogs) logsBySnapshot.set(log.snapshotId, new Set([...(logsBySnapshot.get(log.snapshotId) ?? []), log.setPosition]));
      for (const snapshot of snapshots.filter(({ id }) => completedSnapshotIds.includes(id))) {
        const positions = logsBySnapshot.get(snapshot.id) ?? new Set<number>();
        for (let position = 1; position <= snapshot.setCount; position += 1) {
          if (!positions.has(position)) throw new WorkoutRepositoryError("not_ready", "Log every prescribed set before completing the workout.");
        }
      }
    }
    const cardioOptions = cardioSnapshotFromJson(snapshots[0]?.prescriptionSnapshot["cardioOptions"]);
    if (cardioOptions.length > 0) {
      const cardio = await selectCardioLog(tx, ownerUid, session.id);
      if (!cardio) throw new WorkoutRepositoryError("not_ready", "Save a cardio result before completing the workout.");
    }
    await projectPersonalRecords(tx, ownerUid, session.id);
    const update = await tx.update(workoutSessions).set({ state: "completed", completedAt: now }).where(and(eq(workoutSessions.ownerFirebaseUid, ownerUid), eq(workoutSessions.id, session.id), inArray(workoutSessions.state, RESUMABLE_STATES))).returning({ id: workoutSessions.id });
    if (!update[0]) throw new WorkoutRepositoryError("conflict", "The workout changed before it could be completed.", { retryable: true });
    return operationResult(tx, session, session.id, undefined);
  }

  if (input.kind === "abandon_session") {
    const abandonPayload = payload as Extract<RunnerOperationPayload, { kind: "abandon_session" }>;
    if (resourceUuid(abandonPayload.sessionId, "sessionId") !== session.id) notFound();
    operationReason(abandonPayload.reason);
    const update = await tx.update(workoutSessions).set({ state: "abandoned", abandonedAt: now }).where(and(eq(workoutSessions.ownerFirebaseUid, ownerUid), eq(workoutSessions.id, session.id), inArray(workoutSessions.state, RESUMABLE_STATES))).returning({ id: workoutSessions.id });
    if (!update[0]) throw new WorkoutRepositoryError("conflict", "The workout changed before it could be abandoned.", { retryable: true });
    return operationResult(tx, session, session.id, undefined);
  }

  throw new WorkoutRepositoryError("invalid_request", "The operation is not supported.");
}

export function createWorkoutRepository(database: Database): WorkoutRepository {
  return {
    startOrResume: (viewer, input) => startOrResumeWorkout(database, viewer, input),
    loadResume: (viewer, input) => loadResumeWorkout(database, viewer, input),
    submitOperation: (viewer, input) => submitWorkoutOperation(database, viewer, input),
    history: (viewer, input) => loadWorkoutHistory(database, viewer, input),
    submitRunnerOperation: (viewer, operation) => submitRunnerOperation(database, viewer, operation),
  };
}

export type WorkoutRepository = Readonly<{
  startOrResume(viewer: ViewerContext | null | undefined, input: StartWorkoutInput): Promise<StartWorkoutResult>;
  loadResume(viewer: ViewerContext | null | undefined, input: LoadResumeInput): Promise<WorkoutResumeReadModel>;
  submitOperation(viewer: ViewerContext | null | undefined, input: SubmitWorkoutOperationInput): Promise<WorkoutOperationResult>;
  history(viewer: ViewerContext | null | undefined, input?: WorkoutHistoryInput): Promise<WorkoutHistoryReadModel>;
  submitRunnerOperation(viewer: ViewerContext | null | undefined, operation: RunnerOperation): Promise<RunnerSubmitResult>;
}>;

export async function startOrResumeWorkout(database: Database, viewer: ViewerContext | null | undefined, input: StartWorkoutInput): Promise<StartWorkoutResult> {
  const current = requireMutationViewer(viewer);
  const programId = resourceUuid(input.programId, "programId");
  const dayId = resourceUuid(input.dayId, "dayId");
  const idempotencyKey = nonblank(input.idempotencyKey, "idempotencyKey");
  const now = dateOrNow(input.now);
  return database.transaction(async (transaction) => {
    const tx = transaction as unknown as Database;
    await lockOwner(tx, current.uid);
    const program = await selectProgram(tx, current.uid, programId);
    const existingByKey = await tx.select({ id: workoutSessions.id }).from(workoutSessions).where(and(eq(workoutSessions.ownerFirebaseUid, current.uid), eq(workoutSessions.idempotencyKey, idempotencyKey))).limit(1);
    if (existingByKey[0]) {
      const session = await selectSession(tx, current.uid, existingByKey[0].id);
      const replayModel = await buildModel(tx, session);
      if (session.programId !== program.id) {
        throw new WorkoutRepositoryError("conflict", "The start idempotency key was already used for another workout.");
      }
      if (replayModel.session.dayId !== dayId) {
        throw new WorkoutRepositoryError(
          "conflict",
          `A workout for ${replayModel.session.dayName} is already in progress. Resume it before starting another day.`,
        );
      }
      return { resumed: true, model: replayModel };
    }
    const revision = await selectActiveRevision(tx, current.uid, program);
    const equipment = await selectWorkoutEquipment(tx, current.uid, revision);
    const existing = await tx.select({ id: workoutSessions.id }).from(workoutSessions).where(and(eq(workoutSessions.ownerFirebaseUid, current.uid), eq(workoutSessions.programRevisionId, revision.id), inArray(workoutSessions.state, RESUMABLE_STATES))).orderBy(desc(workoutSessions.createdAt)).limit(1);
    if (existing[0]) {
      return resumeExistingWorkoutForRequestedDay(tx, current.uid, existing[0].id, dayId);
    }
    const day = await selectDay(tx, current.uid, program, revision, dayId);
    const meaning = await selectDayMeaning(tx, current.uid, program, revision, day);
    const previousValues = await selectPreviousValues(tx, current.uid, meaning.prescriptions);
    const personalGuidance = await listPersonalGuidanceForSources(
      tx,
      current,
      meaning.prescriptions.map((prescription) => ({
        kind: prescription.catalogExerciseId === null ? "custom" as const : "catalog" as const,
        id: prescription.catalogExerciseId ?? prescription.customExerciseId ?? "",
      })),
    );
    const snapshotRows = createSnapshotRows(
      "pending",
      current.uid,
      day,
      meaning.sections,
      meaning.prescriptions,
      meaning.cardioOptions,
      program.id,
      revision.id,
      equipment.profileKind,
      equipment.availableEquipment,
      previousValues,
      personalGuidance,
    );
    const insertedSession = await tx.insert(workoutSessions).values({
      ownerFirebaseUid: current.uid,
      programId: program.id,
      programRevisionId: revision.id,
      state: "active",
      idempotencyKey,
      startedAt: now,
    }).onConflictDoNothing().returning({ id: workoutSessions.id });
    let sessionId = insertedSession[0]?.id;
    if (!sessionId) {
      const race = await tx.select({ id: workoutSessions.id }).from(workoutSessions).where(and(eq(workoutSessions.ownerFirebaseUid, current.uid), eq(workoutSessions.programRevisionId, revision.id), inArray(workoutSessions.state, RESUMABLE_STATES))).limit(1);
      sessionId = race[0]?.id;
      if (!sessionId) {
        const duplicate = await tx.select({ id: workoutSessions.id }).from(workoutSessions).where(and(eq(workoutSessions.ownerFirebaseUid, current.uid), eq(workoutSessions.idempotencyKey, idempotencyKey))).limit(1);
        sessionId = duplicate[0]?.id;
      }
      if (!sessionId) throw new WorkoutRepositoryError("conflict", "The workout could not be started safely.", { retryable: true });
      return resumeExistingWorkoutForRequestedDay(tx, current.uid, sessionId, dayId);
    }
    const rows: SnapshotInsertRow[] = snapshotRows.map((row) => ({ ...row, sessionId }));
    const snapshots = await tx.insert(workoutExerciseSnapshots).values(rows).returning({ id: workoutExerciseSnapshots.id, position: workoutExerciseSnapshots.position });
    const snapshotIdByPosition = new Map(snapshots.map(({ id, position }) => [position, id] as const));
    await tx.insert(workoutExerciseStates).values(rows.map((row) => {
      const snapshotId = snapshotIdByPosition.get(row.position);
      if (!snapshotId) throw new WorkoutRepositoryError("conflict", "The workout snapshot could not be completed.");
      const operationId = `${sessionId}:initial:${row.position}`;
      return {
        ownerFirebaseUid: current.uid,
        sessionId,
        snapshotId,
        status: "pending" as const,
        effectiveCatalogExerciseId: row.catalogExerciseId,
        effectiveCustomExerciseId: row.customExerciseId,
        effectiveDisplayName: row.displayName as string,
        effectiveLoggingKind: row.loggingKind as MeasurementKind,
        lastClientOperationId: operationId,
        version: 1,
      };
    }));
    const session = await selectSession(tx, current.uid, sessionId);
    return { resumed: false, model: await buildModel(tx, session) };
  });
}

export async function loadResumeWorkout(database: Database, viewer: ViewerContext | null | undefined, input: LoadResumeInput): Promise<WorkoutResumeReadModel> {
  const current = requireViewer(viewer);
  const sessionId = resourceUuid(input.sessionId, "sessionId");
  return database.transaction(async (transaction) => {
    const tx = transaction as unknown as Database;
    const session = await selectSession(tx, current.uid, sessionId);
    if (!RESUMABLE_STATES.includes(session.state)) throw new WorkoutRepositoryError("not_found", "The requested workout was not found.");
    return buildModel(tx, session);
  });
}

async function submitWorkoutOperationInternal(database: Database, viewer: ViewerContext | null | undefined, input: InternalSubmitWorkoutOperationInput): Promise<WorkoutOperationResult> {
  const current = requireMutationViewer(viewer);
  const sessionId = resourceUuid(input.sessionId, "sessionId");
  const idempotencyKey = nonblank(input.idempotencyKey, "idempotencyKey");
  const kind = input.kind;
  const payload = operationPayload(input);
  validateOperationResourceIds(payload);
  const hash = requestHash({ sessionId, kind, payload, expectedVersion: input.expectedVersion });
  return database.transaction(async (transaction) => {
    const tx = transaction as unknown as Database;
    await lockOwner(tx, current.uid);
    const replay = await existingIdempotency(tx, current.uid, { ...input, sessionId, idempotencyKey, kind, payload }, hash);
    if (replay) return replay;
    const session = await selectSession(tx, current.uid, sessionId);
    const result = await applyOperation(tx, current.uid, session, { ...input, sessionId, idempotencyKey, kind, payload });
    await insertIdempotency(tx, current.uid, { ...input, sessionId, idempotencyKey, kind, payload }, hash, result);
    return result;
  });
}

export type PersonalRecordProjectionRebuildInput = Readonly<{
  /** Writes are opt-in; the default is a read-only dry run. */
  apply?: boolean;
  /** Maximum number of completed sessions handled by one committed batch. */
  batchSize?: number;
  /** Test/maintenance hook that throws after the requested batches commit. */
  interruptAfterBatches?: number;
}>;

export type PersonalRecordProjectionRebuildResult = Readonly<{
  /** Candidates observed in this invocation. */
  candidateCount: number;
  /** Candidate rows changed in this invocation. */
  changedCount: number;
  completed: boolean;
  committedBatches: number;
  /** Candidate rows deleted in this invocation. */
  deletedCount: number;
  /** Candidate rows inserted in this invocation. */
  insertedCount: number;
  mode: "applied" | "dry_run";
  /** Completed sessions observed in this invocation. */
  sessionsScanned: number;
  /** Durable totals through the current cursor, including prior committed batches. */
  totalCandidateCount: number;
  totalChangedCount: number;
  totalSessionsScanned: number;
  /** Candidate rows updated in this invocation. */
  updatedCount: number;
}>;

type PersonalRecordProjectionCheckpoint = Readonly<{
  status: "completed" | "running";
  lastSessionId: string | null;
  sessionsScanned: number;
  candidateCount: number;
  changedCount: number;
}>;

type ProjectionBatchResult = Readonly<{
  candidateCount: number;
  changedCount: number;
  committedBatch: boolean;
  completed: boolean;
  deletedCount: number;
  insertedCount: number;
  lastSessionId: string | null;
  sessionsScanned: number;
  totalCandidateCount: number;
  totalChangedCount: number;
  totalSessionsScanned: number;
  updatedCount: number;
}>;

const DEFAULT_PROJECTION_REBUILD_BATCH_SIZE = 50;
const MAXIMUM_PROJECTION_REBUILD_BATCH_SIZE = 1_000;

function rebuildBatchSize(input: PersonalRecordProjectionRebuildInput): number {
  const batchSize = input.batchSize ?? DEFAULT_PROJECTION_REBUILD_BATCH_SIZE;
  if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > MAXIMUM_PROJECTION_REBUILD_BATCH_SIZE) {
    throw new RangeError(
      `Personal-record rebuild batchSize must be between 1 and ${MAXIMUM_PROJECTION_REBUILD_BATCH_SIZE}.`,
    );
  }
  return batchSize;
}

function rebuildInterruptAfterBatches(input: PersonalRecordProjectionRebuildInput): number | undefined {
  const value = input.interruptAfterBatches;
  if (value === undefined) return undefined;
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError("Personal-record rebuild interruptAfterBatches must be a positive integer.");
  }
  return value;
}

async function selectCompletedProjectionSessions(
  tx: TxDatabase,
  lastSessionId: string | null,
  batchSize: number,
): Promise<Readonly<{ id: string; ownerFirebaseUid: string }[]>> {
  const predicates = [eq(workoutSessions.state, "completed")];
  if (lastSessionId !== null) predicates.push(gt(workoutSessions.id, lastSessionId));
  return tx
    .select({ id: workoutSessions.id, ownerFirebaseUid: workoutSessions.ownerFirebaseUid })
    .from(workoutSessions)
    .where(and(...predicates))
    .orderBy(asc(workoutSessions.id))
    .limit(batchSize + 1);
}

async function lockProjectionCheckpoint(tx: TxDatabase): Promise<PersonalRecordProjectionCheckpoint> {
  await tx
    .insert(personalRecordProjectionCheckpoints)
    .values({ calculationVersion: PERSONAL_RECORD_CALCULATION_VERSION })
    .onConflictDoNothing();
  const result = await tx.execute(sql`
    SELECT status, last_session_id, sessions_scanned, candidate_count, changed_count
    FROM personal_record_projection_checkpoints
    WHERE calculation_version = ${PERSONAL_RECORD_CALCULATION_VERSION}
    FOR UPDATE
  `);
  const row = (result as unknown as { rows: Array<Record<string, unknown>> }).rows[0];
  if (!row || (row["status"] !== "running" && row["status"] !== "completed")) {
    throw new Error("Personal-record projection checkpoint is missing or malformed.");
  }
  const sessionsScanned = Number(row["sessions_scanned"]);
  const candidateCount = Number(row["candidate_count"]);
  const changedCount = Number(row["changed_count"]);
  if (
    !Number.isSafeInteger(sessionsScanned) || sessionsScanned < 0
    || !Number.isSafeInteger(candidateCount) || candidateCount < 0
    || !Number.isSafeInteger(changedCount) || changedCount < 0
  ) {
    throw new Error("Personal-record projection checkpoint counters are malformed.");
  }
  return {
    status: row["status"],
    lastSessionId: typeof row["last_session_id"] === "string" ? row["last_session_id"] : null,
    sessionsScanned,
    candidateCount,
    changedCount,
  };
}

async function applyProjectionBatch(
  database: Database,
  batchSize: number,
): Promise<ProjectionBatchResult> {
  return database.transaction(async (transaction) => {
    const tx = transaction as unknown as Database;
    const checkpoint = await lockProjectionCheckpoint(tx);
    if (checkpoint.status === "completed") {
      return {
        candidateCount: 0,
        changedCount: 0,
        committedBatch: false,
        completed: true,
        deletedCount: 0,
        insertedCount: 0,
        lastSessionId: checkpoint.lastSessionId,
        sessionsScanned: 0,
        totalCandidateCount: checkpoint.candidateCount,
        totalChangedCount: checkpoint.changedCount,
        totalSessionsScanned: checkpoint.sessionsScanned,
        updatedCount: 0,
      };
    }

    const selected = await selectCompletedProjectionSessions(tx, checkpoint.lastSessionId, batchSize);
    const sessions = selected.slice(0, batchSize);
    if (sessions.length === 0) {
      await tx
        .update(personalRecordProjectionCheckpoints)
        .set({
          lastSessionId: null,
          status: "completed",
          updatedAt: new Date(),
        })
        .where(eq(
          personalRecordProjectionCheckpoints.calculationVersion,
          PERSONAL_RECORD_CALCULATION_VERSION,
        ));
      return {
        candidateCount: 0,
        changedCount: 0,
        committedBatch: false,
        completed: true,
        deletedCount: 0,
        insertedCount: 0,
        lastSessionId: null,
        sessionsScanned: 0,
        totalCandidateCount: checkpoint.candidateCount,
        totalChangedCount: checkpoint.changedCount,
        totalSessionsScanned: checkpoint.sessionsScanned,
        updatedCount: 0,
      };
    }

    let candidateCount = 0;
    let changedCount = 0;
    let deletedCount = 0;
    let insertedCount = 0;
    let updatedCount = 0;
    const lockedOwners = new Set<string>();
    for (const session of sessions) {
      if (!lockedOwners.has(session.ownerFirebaseUid)) {
        await lockOwner(tx, session.ownerFirebaseUid);
        lockedOwners.add(session.ownerFirebaseUid);
      }
      const projection = await projectPersonalRecords(tx, session.ownerFirebaseUid, session.id);
      candidateCount += projection.candidateCount;
      changedCount += projection.changedCount;
      deletedCount += projection.deletedCount;
      insertedCount += projection.insertedCount;
      updatedCount += projection.updatedCount;
    }
    const nextSessionId = sessions[sessions.length - 1]!.id;
    const completed = selected.length <= batchSize;
    await tx
      .update(personalRecordProjectionCheckpoints)
      .set({
        candidateCount: checkpoint.candidateCount + candidateCount,
        changedCount: checkpoint.changedCount + changedCount,
        lastSessionId: completed ? null : nextSessionId,
        sessionsScanned: checkpoint.sessionsScanned + sessions.length,
        status: completed ? "completed" : "running",
        updatedAt: new Date(),
      })
      .where(eq(
        personalRecordProjectionCheckpoints.calculationVersion,
        PERSONAL_RECORD_CALCULATION_VERSION,
      ));
    return {
      candidateCount,
      changedCount,
      committedBatch: true,
      completed,
      deletedCount,
      insertedCount,
      lastSessionId: completed ? null : nextSessionId,
      sessionsScanned: sessions.length,
      totalCandidateCount: checkpoint.candidateCount + candidateCount,
      totalChangedCount: checkpoint.changedCount + changedCount,
      totalSessionsScanned: checkpoint.sessionsScanned + sessions.length,
      updatedCount,
    };
  });
}

async function dryRunProjectionBatch(
  database: Database,
  lastSessionId: string | null,
  batchSize: number,
): Promise<ProjectionBatchResult> {
  return database.transaction(async (transaction) => {
    const tx = transaction as unknown as Database;
    const selected = await selectCompletedProjectionSessions(tx, lastSessionId, batchSize);
    const sessions = selected.slice(0, batchSize);
    if (sessions.length === 0) {
      return {
        candidateCount: 0,
        changedCount: 0,
        committedBatch: false,
        completed: true,
        deletedCount: 0,
        insertedCount: 0,
        lastSessionId: null,
        sessionsScanned: 0,
        totalCandidateCount: 0,
        totalChangedCount: 0,
        totalSessionsScanned: 0,
        updatedCount: 0,
      };
    }
    let candidateCount = 0;
    let changedCount = 0;
    let deletedCount = 0;
    let insertedCount = 0;
    let updatedCount = 0;
    for (const session of sessions) {
      const projection = await projectPersonalRecords(tx, session.ownerFirebaseUid, session.id, false);
      candidateCount += projection.candidateCount;
      changedCount += projection.changedCount;
      deletedCount += projection.deletedCount;
      insertedCount += projection.insertedCount;
      updatedCount += projection.updatedCount;
    }
    const completed = selected.length <= batchSize;
    return {
      candidateCount,
      changedCount,
      committedBatch: false,
      completed,
      deletedCount,
      insertedCount,
      lastSessionId: completed ? null : sessions[sessions.length - 1]!.id,
      sessionsScanned: sessions.length,
      totalCandidateCount: candidateCount,
      totalChangedCount: changedCount,
      totalSessionsScanned: sessions.length,
      updatedCount,
    };
  });
}

async function dryRunProjectionRebuild(
  database: Database,
  batchSize: number,
): Promise<Omit<ProjectionBatchResult, "committedBatch" | "lastSessionId">> {
  let lastSessionId: string | null = null;
  let candidateCount = 0;
  let changedCount = 0;
  let deletedCount = 0;
  let insertedCount = 0;
  let sessionsScanned = 0;
  let updatedCount = 0;
  while (true) {
    const result = await dryRunProjectionBatch(database, lastSessionId, batchSize);
    candidateCount += result.candidateCount;
    changedCount += result.changedCount;
    deletedCount += result.deletedCount;
    insertedCount += result.insertedCount;
    sessionsScanned += result.sessionsScanned;
    updatedCount += result.updatedCount;
    if (result.completed) {
      return {
        candidateCount,
        changedCount,
        completed: true,
        deletedCount,
        insertedCount,
        sessionsScanned,
        totalCandidateCount: candidateCount,
        totalChangedCount: changedCount,
        totalSessionsScanned: sessionsScanned,
        updatedCount,
      };
    }
    lastSessionId = result.lastSessionId;
  }
}

/**
 * Backfill candidates for every already-completed session, including sessions
 * whose terminal completion receipt predates projection support. The default
 * dry-run mode performs no writes; applying the same run again is idempotent.
 */
export async function rebuildPersonalRecordProjections(
  database: Database,
  input: PersonalRecordProjectionRebuildInput = {},
): Promise<PersonalRecordProjectionRebuildResult> {
  const apply = input.apply === true;
  const batchSize = rebuildBatchSize(input);
  const interruptAfterBatches = rebuildInterruptAfterBatches(input);
  if (!apply) {
    const result = await dryRunProjectionRebuild(database, batchSize);
    return { ...result, committedBatches: 0, mode: "dry_run" };
  }

  let committedBatches = 0;
  let candidateCount = 0;
  let changedCount = 0;
  let deletedCount = 0;
  let insertedCount = 0;
  let updatedCount = 0;
  let sessionsScanned = 0;
  let totalCandidateCount = 0;
  let totalChangedCount = 0;
  let totalSessionsScanned = 0;
  while (true) {
    const result = await applyProjectionBatch(database, batchSize);
    if (result.committedBatch) committedBatches += 1;
    candidateCount += result.candidateCount;
    changedCount += result.changedCount;
    deletedCount += result.deletedCount;
    insertedCount += result.insertedCount;
    updatedCount += result.updatedCount;
    sessionsScanned += result.sessionsScanned;
    totalCandidateCount = result.totalCandidateCount;
    totalChangedCount = result.totalChangedCount;
    totalSessionsScanned = result.totalSessionsScanned;
    if (interruptAfterBatches !== undefined && committedBatches >= interruptAfterBatches) {
      throw new Error(`Personal-record projection rebuild interrupted after ${committedBatches} committed batch(es).`);
    }
    if (result.completed) {
      return {
        candidateCount,
        changedCount,
        committedBatches,
        completed: true,
        deletedCount,
        insertedCount,
        mode: "applied",
        sessionsScanned,
        totalCandidateCount,
        totalChangedCount,
        totalSessionsScanned,
        updatedCount,
      };
    }
  }
}

export function submitWorkoutOperation(
  database: Database,
  viewer: ViewerContext | null | undefined,
  input: SubmitWorkoutOperationInput,
): Promise<WorkoutOperationResult> {
  return submitWorkoutOperationInternal(database, viewer, input);
}

export async function submitRunnerOperation(database: Database, viewer: ViewerContext | null | undefined, operation: RunnerOperation): Promise<RunnerSubmitResult> {
  try {
    const current = requireMutationViewer(viewer);
    if (operation.ownerUid !== current.uid) {
      throw new WorkoutRepositoryError("conflict", "The runner operation identity does not match the signed-in viewer.");
    }
    const baseRevision = resourceUuid(operation.baseRevision, "baseRevision");
    const sessionId = resourceUuid(operation.sessionId, "sessionId");
    await database.transaction(async (transaction) => {
      const tx = transaction as unknown as Database;
      const session = await selectSession(tx, current.uid, sessionId);
      if (session.programRevisionId !== baseRevision) {
        throw new WorkoutRepositoryError("conflict", "The runner operation targets an outdated workout revision.");
      }
    });
    const result = await submitWorkoutOperationInternal(database, viewer, {
      sessionId,
      idempotencyKey: operation.idempotencyKey,
      kind: operation.kind,
      payload: operation.payload,
      serverDerivedVersion: true,
    });
    const persistedId = operationPersistedId(result);
    if (result.status === "saved") {
      return persistedId === undefined
        ? { status: "saved" }
        : { status: "saved", persistedId };
    }
    return persistedId === undefined
      ? { status: "duplicate" }
      : { status: "duplicate", persistedId };
  } catch (error) {
    if (error instanceof WorkoutRepositoryError) {
      return {
        status: "failed",
        code: error.code,
        message: error.message,
        retryable: error.retryable,
        conflict: error.code === "conflict" || error.code === "stale_version" || error.code === "terminal",
        authExpired: error.code === "unauthenticated",
      };
    }
    throw error;
  }
}

type HistoryCursor = Readonly<{ occurredAt: Date; sessionId: string }>;

function historyOccurredAt(session: SessionRow): Date {
  return session.completedAt ?? session.abandonedAt ?? session.createdAt;
}

function encodeHistoryCursor(session: SessionRow): string {
  return Buffer.from(JSON.stringify({ occurredAt: historyOccurredAt(session).toISOString(), sessionId: session.id }), "utf8").toString("base64url");
}

function decodeHistoryCursor(value: string | undefined): HistoryCursor | undefined {
  if (value === undefined) return undefined;
  if (value.length > 512) throw new WorkoutRepositoryError("invalid_request", "history cursor is invalid.");
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as unknown;
    if (!isRecord(parsed) || typeof parsed["occurredAt"] !== "string" || typeof parsed["sessionId"] !== "string") {
      throw new Error("invalid cursor");
    }
    const occurredAt = new Date(parsed["occurredAt"]);
    if (Number.isNaN(occurredAt.getTime())) {
      throw new Error("invalid cursor");
    }
    return { occurredAt, sessionId: cursorUuid(parsed["sessionId"]) };
  } catch {
    throw new WorkoutRepositoryError("invalid_request", "history cursor is invalid.");
  }
}

function parseHistoryInput(input: WorkoutHistoryInput | undefined): Readonly<{ limit: number; cursor: HistoryCursor | undefined }> {
  const limit = input?.limit ?? DEFAULT_HISTORY_LIMIT;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_HISTORY_LIMIT) {
    throw new WorkoutRepositoryError("invalid_request", `history limit must be between 1 and ${MAX_HISTORY_LIMIT}.`);
  }
  return { limit, cursor: decodeHistoryCursor(input?.cursor) };
}

export async function loadWorkoutHistory(
  database: Database,
  viewer: ViewerContext | null | undefined,
  input?: WorkoutHistoryInput,
): Promise<WorkoutHistoryReadModel> {
  const current = requireViewer(viewer);
  const options = parseHistoryInput(input);
  return database.transaction(async (transaction) => {
    const tx = transaction as unknown as Database;
    const occurredAt = sql`coalesce(${workoutSessions.completedAt}, ${workoutSessions.abandonedAt}, ${workoutSessions.createdAt})`;
    const cursorFilter = options.cursor
      ? or(
        sql`${occurredAt} < ${options.cursor.occurredAt}`,
        and(sql`${occurredAt} = ${options.cursor.occurredAt}`, lt(workoutSessions.id, options.cursor.sessionId)),
      )
      : undefined;
    const sessions = await tx
      .select({
        id: workoutSessions.id,
        ownerFirebaseUid: workoutSessions.ownerFirebaseUid,
        programId: workoutSessions.programId,
        programRevisionId: workoutSessions.programRevisionId,
        state: workoutSessions.state,
        idempotencyKey: workoutSessions.idempotencyKey,
        startedAt: workoutSessions.startedAt,
        completedAt: workoutSessions.completedAt,
        abandonedAt: workoutSessions.abandonedAt,
        createdAt: workoutSessions.createdAt,
        updatedAt: workoutSessions.updatedAt,
      })
      .from(workoutSessions)
      .where(and(eq(workoutSessions.ownerFirebaseUid, current.uid), inArray(workoutSessions.state, TERMINAL_STATES), cursorFilter))
      .orderBy(desc(occurredAt), desc(workoutSessions.id))
      .limit(options.limit + 1);
    const page = (sessions as SessionRow[]).slice(0, options.limit);
    const hasMore = sessions.length > page.length;
    const result: WorkoutHistorySession[] = [];
    for (const row of page) {
      const snapshots = await selectSnapshots(tx, current.uid, row.id);
      const states = await selectStates(tx, current.uid, row.id);
      const logs = await selectSetLogs(tx, current.uid, row.id);
      const stateBySnapshot = new Map(states.map((state) => [state.snapshotId, parseStateView(state)] as const));
      const logsBySnapshot = new Map<string, WorkoutSetLogView[]>();
      for (const log of logs) logsBySnapshot.set(log.snapshotId, [...(logsBySnapshot.get(log.snapshotId) ?? []), log]);
      const snapshotModel = modelSnapshot(snapshots, states);
      const cardioLog = await selectCardioLog(tx, current.uid, row.id, snapshotModel.cardioOptions);
      result.push({
        session: sessionView(row, snapshots),
        exercises: snapshots.map((snapshot, index) => {
          const state = stateBySnapshot.get(snapshot.id);
          if (!state) throw new WorkoutRepositoryError("conflict", "Workout history is incomplete.");
          return {
            snapshot: snapshotModel.exercises[index]!,
            state,
            setLogs: logsBySnapshot.get(snapshot.id) ?? [],
          };
        }),
        cardioLog,
      });
    }
    return {
      sessions: result,
      nextCursor: hasMore && page.length > 0 ? encodeHistoryCursor(page[page.length - 1]!) : undefined,
    };
  });
}
