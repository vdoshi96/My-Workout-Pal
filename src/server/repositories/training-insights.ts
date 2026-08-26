import { Buffer } from "node:buffer";

import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNull,
  lt,
  or,
  sql,
} from "drizzle-orm";

import type { Database } from "@/db/client";
import {
  cardioLogs,
  catalogExercises,
  customExercises,
  personalRecords,
  progressSummaries,
  setLogs,
  userPreferences,
  workoutExerciseSnapshots,
  workoutExerciseStates,
  workoutSessions,
} from "@/db/schema";
import {
  buildProgressSummarySeries,
  estimateEpleyOneRepMaxKg,
  type ProgressSummaryPoint,
} from "@/domain/analytics";
import type { ViewerContext } from "@/server/auth/viewer";

const DEFAULT_HISTORY_LIMIT = 20;
const MAXIMUM_HISTORY_LIMIT = 50;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const TERMINAL_STATES = ["completed", "abandoned"] as const;

export type TrainingInsightsRepositoryCode =
  | "conflict"
  | "invalid_request"
  | "not_found"
  | "unauthenticated";

export class TrainingInsightsRepositoryError extends Error {
  readonly code: TrainingInsightsRepositoryCode;
  readonly status: number;

  constructor(code: TrainingInsightsRepositoryCode, message: string, status: number) {
    super(message);
    this.name = "TrainingInsightsRepositoryError";
    this.code = code;
    this.status = status;
  }
}

export type TrainingHistoryInput = Readonly<{
  cursor?: string;
  limit?: number;
  state?: "abandoned" | "completed";
}>;

export type TrainingCardioView = Readonly<{
  distanceMeters: number | undefined;
  durationSeconds: number;
  inclinePercent: number | undefined;
  mode: "runner" | "walker";
  notes: string;
  paceSecondsPerKilometer: number | undefined;
}>;

export type TrainingHistorySession = Readonly<{
  cardio: TrainingCardioView | undefined;
  completedExerciseCount: number;
  dayName: string;
  durationSeconds: number | undefined;
  exerciseCount: number;
  id: string;
  occurredAt: Date;
  setCount: number;
  startedAt: Date;
  state: "abandoned" | "completed";
}>;

export type TrainingHistoryReadModel = Readonly<{
  nextCursor: string | undefined;
  sessions: readonly TrainingHistorySession[];
}>;

export type TrainingSetView = Readonly<{
  distanceMeters: number | undefined;
  durationSeconds: number | undefined;
  formRating: number | undefined;
  id: string;
  kind: "bodyweight_reps" | "distance_duration" | "duration" | "weight_reps";
  note: string | undefined;
  position: number;
  recordedAt: Date;
  repetitions: number | undefined;
  setKind: "warmup" | "work";
  weightKg: number | undefined;
}>;

export type TrainingSessionExercise = Readonly<{
  displayName: string;
  id: string;
  loggingKind: TrainingSetView["kind"];
  note: string | undefined;
  position: number;
  sectionKind: "accessory" | "cardio" | "core" | "strength";
  sets: readonly TrainingSetView[];
  status: "completed" | "skipped";
  substitutionReason: string | undefined;
}>;

export type TrainingSessionDetail = TrainingHistorySession & Readonly<{
  exercises: readonly TrainingSessionExercise[];
}>;

export type PersonalRecordView = Readonly<{
  achievedAt: Date;
  calculationVersions: readonly string[];
  exerciseName: string;
  isTie: boolean;
  sourceSessionIds: readonly string[];
  sourceSetLogIds: readonly string[];
  type: "distance" | "duration" | "estimated_1rm" | "max_repetitions" | "max_weight" | "volume";
  value: number;
}>;

export type ProgressInsightsReadModel = Readonly<{
  preferences: Readonly<{
    timezone: string;
    unitSystem: "imperial" | "metric";
  }>;
  projection: Readonly<{
    calculationVersions: readonly string[];
    generatedAt: Date | undefined;
    state: "derived" | "persisted";
  }>;
  series: readonly ProgressSummaryPoint[];
  totals: Readonly<{
    abandonedSessions: number;
    completedSessions: number;
    distanceMeters: number;
    durationSeconds: number;
    volumeKg: number;
  }>;
}>;

type HistoryCursor = Readonly<{ occurredAt: Date; sessionId: string }>;

function requireViewer(viewer: ViewerContext | null | undefined): ViewerContext {
  if (!viewer) {
    throw new TrainingInsightsRepositoryError(
      "unauthenticated",
      "A signed-in account is required.",
      401,
    );
  }
  return viewer;
}

function requireUuid(value: string, fieldName: string): string {
  if (!UUID_PATTERN.test(value)) {
    throw new TrainingInsightsRepositoryError(
      "invalid_request",
      `${fieldName} is invalid.`,
      400,
    );
  }
  return value.toLowerCase();
}

function decodeCursor(value: string | undefined): HistoryCursor | undefined {
  if (value === undefined) return undefined;
  if (value.length < 1 || value.length > 512) {
    throw new TrainingInsightsRepositoryError("invalid_request", "History cursor is invalid.", 400);
  }
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as unknown;
    if (typeof parsed !== "object" || parsed === null) throw new TypeError();
    const record = parsed as Record<string, unknown>;
    if (typeof record["occurredAt"] !== "string" || typeof record["sessionId"] !== "string") {
      throw new TypeError();
    }
    const occurredAt = new Date(record["occurredAt"]);
    if (!Number.isFinite(occurredAt.getTime())) throw new TypeError();
    return { occurredAt, sessionId: requireUuid(record["sessionId"], "History cursor") };
  } catch (error) {
    if (error instanceof TrainingInsightsRepositoryError) throw error;
    throw new TrainingInsightsRepositoryError("invalid_request", "History cursor is invalid.", 400);
  }
}

function encodeCursor(session: TrainingHistorySession): string {
  return Buffer.from(JSON.stringify({
    occurredAt: session.occurredAt.toISOString(),
    sessionId: session.id,
  })).toString("base64url");
}

function parseHistoryInput(input: TrainingHistoryInput): Readonly<{
  cursor: HistoryCursor | undefined;
  limit: number;
  state: TrainingHistoryInput["state"];
}> {
  const limit = input.limit ?? DEFAULT_HISTORY_LIMIT;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAXIMUM_HISTORY_LIMIT) {
    throw new TrainingInsightsRepositoryError(
      "invalid_request",
      `History limit must be between 1 and ${MAXIMUM_HISTORY_LIMIT}.`,
      400,
    );
  }
  if (input.state !== undefined && !TERMINAL_STATES.includes(input.state)) {
    throw new TrainingInsightsRepositoryError("invalid_request", "History state is invalid.", 400);
  }
  return { cursor: decodeCursor(input.cursor), limit, state: input.state };
}

function occurredAtFor(row: Readonly<{
  abandonedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}>): Date {
  return row.completedAt ?? row.abandonedAt ?? row.createdAt;
}

function dayNameFromSnapshots(
  snapshots: readonly Readonly<{ prescriptionSnapshot: Record<string, unknown> }>[]
): string {
  const dayName = snapshots[0]?.prescriptionSnapshot["dayName"];
  return typeof dayName === "string" && dayName.trim().length > 0
    ? dayName.trim()
    : "Saved workout";
}

function cardioView(row: typeof cardioLogs.$inferSelect | undefined): TrainingCardioView | undefined {
  if (!row) return undefined;
  return {
    distanceMeters: row.distanceM ?? undefined,
    durationSeconds: row.durationSeconds,
    inclinePercent: row.inclinePercent ?? undefined,
    mode: row.mode,
    notes: row.noteSnapshot ?? "",
    paceSecondsPerKilometer: row.paceSecondsPerKm ?? undefined,
  };
}

async function buildHistorySummary(
  database: Database,
  ownerUid: string,
  row: typeof workoutSessions.$inferSelect,
): Promise<TrainingHistorySession> {
  const snapshots = await database
    .select({ prescriptionSnapshot: workoutExerciseSnapshots.prescriptionSnapshot })
    .from(workoutExerciseSnapshots)
    .where(and(
      eq(workoutExerciseSnapshots.ownerFirebaseUid, ownerUid),
      eq(workoutExerciseSnapshots.sessionId, row.id),
    ))
    .orderBy(asc(workoutExerciseSnapshots.position));
  const states = await database
    .select({ status: workoutExerciseStates.status })
    .from(workoutExerciseStates)
    .where(and(
      eq(workoutExerciseStates.ownerFirebaseUid, ownerUid),
      eq(workoutExerciseStates.sessionId, row.id),
    ));
  const setCountRows = await database
    .select({ count: sql<number>`count(*)::int` })
    .from(setLogs)
    .where(and(eq(setLogs.ownerFirebaseUid, ownerUid), eq(setLogs.sessionId, row.id)));
  const cardioRows = await database
    .select()
    .from(cardioLogs)
    .where(and(eq(cardioLogs.ownerFirebaseUid, ownerUid), eq(cardioLogs.sessionId, row.id)))
    .limit(1);
  const occurredAt = occurredAtFor(row);
  const startedAt = row.startedAt ?? row.createdAt;
  return {
    cardio: cardioView(cardioRows[0]),
    completedExerciseCount: states.filter(({ status }) => status === "completed").length,
    dayName: dayNameFromSnapshots(snapshots),
    durationSeconds: occurredAt >= startedAt
      ? Math.floor((occurredAt.getTime() - startedAt.getTime()) / 1_000)
      : undefined,
    exerciseCount: snapshots.length,
    id: row.id,
    occurredAt,
    setCount: setCountRows[0]?.count ?? 0,
    startedAt,
    state: row.state as "abandoned" | "completed",
  };
}

export async function loadTrainingHistory(
  database: Database,
  viewerInput: ViewerContext | null | undefined,
  input: TrainingHistoryInput = {},
): Promise<TrainingHistoryReadModel> {
  const viewer = requireViewer(viewerInput);
  const options = parseHistoryInput(input);
  const occurredAt = sql<Date>`coalesce(${workoutSessions.completedAt}, ${workoutSessions.abandonedAt}, ${workoutSessions.createdAt})`;
  const cursorPredicate = options.cursor === undefined
    ? undefined
    : or(
        lt(occurredAt, options.cursor.occurredAt),
        and(
          eq(occurredAt, options.cursor.occurredAt),
          lt(workoutSessions.id, options.cursor.sessionId),
        ),
      );
  const statePredicate = options.state === undefined
    ? inArray(workoutSessions.state, TERMINAL_STATES)
    : eq(workoutSessions.state, options.state);
  const rows = await database
    .select()
    .from(workoutSessions)
    .where(and(
      eq(workoutSessions.ownerFirebaseUid, viewer.uid),
      statePredicate,
      cursorPredicate,
    ))
    .orderBy(desc(occurredAt), desc(workoutSessions.id))
    .limit(options.limit + 1);
  const page = rows.slice(0, options.limit);
  const sessions = await Promise.all(
    page.map((row) => buildHistorySummary(database, viewer.uid, row)),
  );
  return {
    nextCursor: rows.length > page.length && sessions.length > 0
      ? encodeCursor(sessions[sessions.length - 1]!)
      : undefined,
    sessions,
  };
}

export async function loadTrainingSession(
  database: Database,
  viewerInput: ViewerContext | null | undefined,
  sessionIdInput: string,
): Promise<TrainingSessionDetail> {
  const viewer = requireViewer(viewerInput);
  const sessionId = requireUuid(sessionIdInput, "Session ID");
  const rows = await database
    .select()
    .from(workoutSessions)
    .where(and(
      eq(workoutSessions.ownerFirebaseUid, viewer.uid),
      eq(workoutSessions.id, sessionId),
      inArray(workoutSessions.state, TERMINAL_STATES),
    ))
    .limit(1);
  const session = rows[0];
  if (!session) {
    throw new TrainingInsightsRepositoryError("not_found", "Workout history was not found.", 404);
  }
  const snapshots = await database
    .select()
    .from(workoutExerciseSnapshots)
    .where(and(
      eq(workoutExerciseSnapshots.ownerFirebaseUid, viewer.uid),
      eq(workoutExerciseSnapshots.sessionId, sessionId),
    ))
    .orderBy(asc(workoutExerciseSnapshots.position));
  const states = await database
    .select()
    .from(workoutExerciseStates)
    .where(and(
      eq(workoutExerciseStates.ownerFirebaseUid, viewer.uid),
      eq(workoutExerciseStates.sessionId, sessionId),
    ));
  const logs = await database
    .select()
    .from(setLogs)
    .where(and(eq(setLogs.ownerFirebaseUid, viewer.uid), eq(setLogs.sessionId, sessionId)))
    .orderBy(asc(setLogs.snapshotId), asc(setLogs.setPosition));
  const stateBySnapshot = new Map(states.map((state) => [state.snapshotId, state] as const));
  const logsBySnapshot = new Map<string, typeof logs>();
  for (const log of logs) {
    logsBySnapshot.set(log.snapshotId, [...(logsBySnapshot.get(log.snapshotId) ?? []), log]);
  }
  const exercises: TrainingSessionExercise[] = snapshots.map((snapshot) => {
    const state = stateBySnapshot.get(snapshot.id);
    if (!state || state.status === "pending") {
      throw new TrainingInsightsRepositoryError(
        "conflict",
        "Workout history is incomplete.",
        409,
      );
    }
    return {
      displayName: state.effectiveDisplayName || snapshot.displayName,
      id: snapshot.id,
      loggingKind: state.effectiveLoggingKind,
      note: state.note ?? undefined,
      position: snapshot.position,
      sectionKind: snapshot.sectionKind,
      sets: (logsBySnapshot.get(snapshot.id) ?? []).map((log) => ({
        distanceMeters: log.distanceM ?? undefined,
        durationSeconds: log.durationSeconds ?? undefined,
        formRating: log.formRating ?? undefined,
        id: log.id,
        kind: log.measurementKind,
        note: log.noteSnapshot ?? undefined,
        position: log.setPosition,
        recordedAt: log.recordedAt,
        repetitions: log.repetitions ?? undefined,
        setKind: log.setKind,
        weightKg: log.weightKg ?? undefined,
      })),
      status: state.status,
      substitutionReason: state.substitutionReason ?? undefined,
    };
  });
  const summary = await buildHistorySummary(database, viewer.uid, session);
  return { ...summary, exercises };
}

export async function loadPersonalRecords(
  database: Database,
  viewerInput: ViewerContext | null | undefined,
): Promise<readonly PersonalRecordView[]> {
  const viewer = requireViewer(viewerInput);
  const rows = await database
    .select({
      achievedAt: personalRecords.achievedAt,
      calculationVersion: personalRecords.calculationVersion,
      catalogExerciseId: personalRecords.catalogExerciseId,
      catalogName: catalogExercises.name,
      customExerciseId: personalRecords.customExerciseId,
      customName: customExercises.name,
      sourceSessionId: setLogs.sessionId,
      sourceSetLogId: personalRecords.sourceSetLogId,
      type: personalRecords.type,
      value: personalRecords.value,
    })
    .from(personalRecords)
    .innerJoin(
      setLogs,
      and(
        eq(setLogs.ownerFirebaseUid, personalRecords.ownerFirebaseUid),
        eq(setLogs.id, personalRecords.sourceSetLogId),
      ),
    )
    .leftJoin(catalogExercises, eq(catalogExercises.id, personalRecords.catalogExerciseId))
    .leftJoin(
      customExercises,
      and(
        eq(customExercises.ownerFirebaseUid, personalRecords.ownerFirebaseUid),
        eq(customExercises.id, personalRecords.customExerciseId),
      ),
    )
    .where(eq(personalRecords.ownerFirebaseUid, viewer.uid))
    .orderBy(asc(personalRecords.achievedAt), asc(personalRecords.id))
    .limit(500);
  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    const identity = row.catalogExerciseId ?? row.customExerciseId;
    if (!identity) continue;
    const key = `${identity}:${row.type}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return [...groups.values()]
    .map((group): PersonalRecordView => {
      const value = Math.max(...group.map((row) => row.value));
      const winners = group.filter((row) => row.value === value);
      const latest = winners.reduce((right, row) => row.achievedAt > right.achievedAt ? row : right);
      return {
        achievedAt: latest.achievedAt,
        calculationVersions: [...new Set(winners.map(({ calculationVersion }) => calculationVersion))].sort(),
        exerciseName: latest.catalogName ?? latest.customName ?? "Saved exercise",
        isTie: winners.length > 1,
        sourceSessionIds: winners.map(({ sourceSessionId }) => sourceSessionId),
        sourceSetLogIds: winners.map(({ sourceSetLogId }) => sourceSetLogId),
        type: latest.type,
        value,
      };
    })
    .sort((left, right) => right.achievedAt.getTime() - left.achievedAt.getTime());
}

export async function loadProgressInsights(
  database: Database,
  viewerInput: ViewerContext | null | undefined,
): Promise<ProgressInsightsReadModel> {
  const viewer = requireViewer(viewerInput);
  const preferenceRows = await database
    .select({ timezone: userPreferences.timezone, unitSystem: userPreferences.unitSystem })
    .from(userPreferences)
    .where(eq(userPreferences.ownerFirebaseUid, viewer.uid))
    .limit(1);
  const preferences = preferenceRows[0] ?? { timezone: "UTC", unitSystem: "metric" as const };
  const sessions = await database
    .select()
    .from(workoutSessions)
    .where(and(
      eq(workoutSessions.ownerFirebaseUid, viewer.uid),
      inArray(workoutSessions.state, TERMINAL_STATES),
    ))
    .orderBy(asc(workoutSessions.completedAt), asc(workoutSessions.id));
  const completed = sessions.filter((session) => session.state === "completed" && session.completedAt);
  const completedIds = completed.map(({ id }) => id);
  const logs = completedIds.length === 0
    ? []
    : await database
        .select()
        .from(setLogs)
        .where(and(
          eq(setLogs.ownerFirebaseUid, viewer.uid),
          inArray(setLogs.sessionId, completedIds),
        ));
  const cardio = completedIds.length === 0
    ? []
    : await database
        .select()
        .from(cardioLogs)
        .where(and(
          eq(cardioLogs.ownerFirebaseUid, viewer.uid),
          inArray(cardioLogs.sessionId, completedIds),
        ));
  const inputs = completed.map((session) => {
    const sessionLogs = logs.filter(({ sessionId }) => sessionId === session.id);
    const sessionCardio = cardio.find(({ sessionId }) => sessionId === session.id);
    const estimated = sessionLogs
      .filter((log) => log.measurementKind === "weight_reps")
      .map((log) => estimateEpleyOneRepMaxKg(log.weightKg ?? 0, log.repetitions ?? 0))
      .filter((value): value is number => value !== undefined);
    return {
      completedAt: session.completedAt!.toISOString(),
      distanceMeters: sessionLogs.reduce((sum, log) => sum + (log.distanceM ?? 0), 0) + (sessionCardio?.distanceM ?? 0),
      durationSeconds: sessionLogs.reduce((sum, log) => sum + (log.durationSeconds ?? 0), 0) + (sessionCardio?.durationSeconds ?? 0),
      ...(estimated.length === 0 ? {} : { estimatedOneRepMaxKg: Math.max(...estimated) }),
      id: session.id,
      volumeKg: sessionLogs
        .filter(({ setKind }) => setKind === "work")
        .reduce((sum, log) => sum + ((log.weightKg ?? 0) * (log.repetitions ?? 0)), 0),
    };
  });
  const series = buildProgressSummarySeries(inputs, { timeZone: preferences.timezone });
  const projections = await database
    .select({
      calculationVersion: progressSummaries.calculationVersion,
      generatedAt: progressSummaries.generatedAt,
    })
    .from(progressSummaries)
    .where(and(
      eq(progressSummaries.ownerFirebaseUid, viewer.uid),
      isNull(progressSummaries.catalogExerciseId),
      isNull(progressSummaries.customExerciseId),
    ));
  return {
    preferences,
    projection: {
      calculationVersions: [...new Set(projections.map(({ calculationVersion }) => calculationVersion))].sort(),
      generatedAt: projections.length === 0
        ? undefined
        : projections.reduce((latest, row) => row.generatedAt > latest ? row.generatedAt : latest, projections[0]!.generatedAt),
      state: projections.length === 0 ? "derived" : "persisted",
    },
    series,
    totals: {
      abandonedSessions: sessions.filter(({ state }) => state === "abandoned").length,
      completedSessions: completed.length,
      distanceMeters: series.reduce((sum, point) => sum + (point.distanceMeters ?? 0), 0),
      durationSeconds: series.reduce((sum, point) => sum + (point.durationSeconds ?? 0), 0),
      volumeKg: series.reduce((sum, point) => sum + (point.volumeKg ?? 0), 0),
    },
  };
}
