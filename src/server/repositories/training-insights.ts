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
  PERSONAL_RECORD_CALCULATION_VERSIONS,
  personalRecordCalculationVersionRank,
  type ProgressSummaryPoint,
} from "@/domain/analytics";
import type { EquipmentProfileKind } from "@/domain/equipment";
import type { ViewerContext } from "@/server/auth/viewer";

const DEFAULT_HISTORY_LIMIT = 20;
const MAXIMUM_HISTORY_LIMIT = 50;
const MAXIMUM_PERSONAL_RECORD_GROUPS = 500;
const MAXIMUM_PERSONAL_RECORD_SOURCES = 20;
const MAXIMUM_PROGRESS_TIMELINE_SESSIONS = 180;
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
  addedWeightKg: number | undefined;
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
  equipmentProfileKind: EquipmentProfileKind | undefined;
  id: string;
  loggingKind: TrainingSetView["kind"];
  maximumReps: number | undefined;
  maximumSeconds: number | undefined;
  minimumReps: number | undefined;
  minimumSeconds: number | undefined;
  note: string | undefined;
  position: number;
  prescriptionNote: string | undefined;
  restSeconds: number;
  sectionKind: "accessory" | "cardio" | "core" | "strength";
  setCount: number;
  setKind: "warmup" | "work" | undefined;
  sets: readonly TrainingSetView[];
  status: "completed" | "skipped";
  substitutionReason: string | undefined;
  targetDistanceMeters: number | undefined;
  targetWeightKg: number | undefined;
}>;

export type TrainingSessionDetail = TrainingHistorySession & Readonly<{
  exercises: readonly TrainingSessionExercise[];
}>;

export type PersonalRecordView = Readonly<{
  achievedAt: Date;
  calculationVersions: readonly string[];
  exerciseName: string;
  hasMoreSources: boolean;
  isTie: boolean;
  sourceSessionIds: readonly string[];
  sourceSetLogIds: readonly string[];
  totalTieCount: number;
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
  scope: Readonly<{
    maxSessions: number;
    sessionCount: number;
    truncated: boolean;
  }>;
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

function snapshotEquipmentProfileKind(
  snapshot: Record<string, unknown>,
): EquipmentProfileKind | undefined {
  const value = snapshot["equipmentProfileKind"];
  return value === "dumbbells" || value === "barbell" ? value : undefined;
}

function snapshotText(
  snapshot: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = snapshot[key];
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function snapshotSetKind(
  snapshot: Record<string, unknown>,
): "warmup" | "work" | undefined {
  const value = snapshot["setKind"];
  return value === "warmup" || value === "work" ? value : undefined;
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
      equipmentProfileKind: snapshotEquipmentProfileKind(snapshot.prescriptionSnapshot),
      id: snapshot.id,
      loggingKind: state.effectiveLoggingKind,
      maximumReps: snapshot.maximumReps ?? undefined,
      maximumSeconds: snapshot.maximumSeconds ?? undefined,
      minimumReps: snapshot.minimumReps ?? undefined,
      minimumSeconds: snapshot.minimumSeconds ?? undefined,
      note: state.note ?? undefined,
      position: snapshot.position,
      prescriptionNote: snapshotText(snapshot.prescriptionSnapshot, "notes"),
      restSeconds: snapshot.restSeconds,
      sectionKind: snapshot.sectionKind,
      setCount: snapshot.setCount,
      setKind: snapshotSetKind(snapshot.prescriptionSnapshot),
      sets: (logsBySnapshot.get(snapshot.id) ?? []).map((log) => ({
        addedWeightKg: log.addedWeightKg ?? undefined,
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
      targetDistanceMeters: snapshot.targetDistanceM ?? undefined,
      targetWeightKg: snapshot.targetWeightKg ?? undefined,
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
  const recognizedVersions = sql.join(
    PERSONAL_RECORD_CALCULATION_VERSIONS.map((version) => sql`${version}`),
    sql`, `,
  );
  const result = await database.execute(sql`
    WITH eligible AS (
      SELECT
        pr.id,
        pr.achieved_at,
        pr.calculation_version,
        pr.catalog_exercise_id,
        pr.custom_exercise_id,
        pr.source_set_log_id,
        pr.type,
        pr.value,
        sl.session_id AS source_session_id,
        wes.effective_catalog_exercise_id,
        wes.effective_custom_exercise_id,
        wes.effective_display_name
      FROM personal_records AS pr
      INNER JOIN set_logs AS sl
        ON sl.owner_firebase_uid = pr.owner_firebase_uid
       AND sl.id = pr.source_set_log_id
      INNER JOIN workout_sessions AS ws
        ON ws.owner_firebase_uid = sl.owner_firebase_uid
       AND ws.id = sl.session_id
       AND ws.state = 'completed'
      INNER JOIN workout_exercise_states AS wes
        ON wes.owner_firebase_uid = pr.owner_firebase_uid
       AND wes.session_id = sl.session_id
       AND wes.snapshot_id = sl.snapshot_id
      WHERE pr.owner_firebase_uid = ${viewer.uid}
        AND sl.set_kind = 'work'
        AND wes.status = 'completed'
        AND pr.calculation_version IN (${recognizedVersions})
        AND (
          (pr.catalog_exercise_id IS NOT NULL
            AND pr.catalog_exercise_id = wes.effective_catalog_exercise_id
            AND wes.effective_custom_exercise_id IS NULL)
          OR (pr.custom_exercise_id IS NOT NULL
            AND pr.custom_exercise_id = wes.effective_custom_exercise_id
            AND wes.effective_catalog_exercise_id IS NULL)
        )
    ),
    winner_values AS (
      SELECT
        CASE WHEN eligible.catalog_exercise_id IS NOT NULL THEN 'catalog' ELSE 'custom' END AS identity_kind,
        COALESCE(eligible.catalog_exercise_id, eligible.custom_exercise_id) AS identity_id,
        eligible.type,
        MAX(eligible.value) AS max_value
      FROM eligible
      GROUP BY
        CASE WHEN eligible.catalog_exercise_id IS NOT NULL THEN 'catalog' ELSE 'custom' END,
        COALESCE(eligible.catalog_exercise_id, eligible.custom_exercise_id),
        eligible.type
    ),
    winner_groups AS (
      SELECT
        winners.identity_kind,
        winners.identity_id,
        winners.type,
        winners.max_value,
        MAX(eligible.achieved_at) AS winner_achieved_at,
        COUNT(*)::int AS total_tie_count,
        ARRAY_AGG(DISTINCT eligible.calculation_version ORDER BY eligible.calculation_version) AS calculation_versions
      FROM winner_values AS winners
      INNER JOIN eligible
        ON eligible.type = winners.type
       AND eligible.value = winners.max_value
       AND (CASE WHEN eligible.catalog_exercise_id IS NOT NULL THEN 'catalog' ELSE 'custom' END) = winners.identity_kind
       AND COALESCE(eligible.catalog_exercise_id, eligible.custom_exercise_id) = winners.identity_id
      GROUP BY winners.identity_kind, winners.identity_id, winners.type, winners.max_value
    ),
    selected_groups AS (
      SELECT
        winner_groups.*,
        ROW_NUMBER() OVER (
          ORDER BY winner_achieved_at DESC, identity_kind, identity_id, type
        ) AS group_rank
      FROM winner_groups
    ),
    ranked_winners AS (
      SELECT
        eligible.*,
        selected_groups.total_tie_count,
        selected_groups.calculation_versions,
        ROW_NUMBER() OVER (
          PARTITION BY selected_groups.identity_kind, selected_groups.identity_id, selected_groups.type
          ORDER BY eligible.achieved_at DESC, eligible.id DESC
        ) AS source_rank
      FROM eligible
      INNER JOIN selected_groups
        ON selected_groups.group_rank <= ${MAXIMUM_PERSONAL_RECORD_GROUPS}
       AND selected_groups.type = eligible.type
       AND selected_groups.max_value = eligible.value
       AND selected_groups.identity_kind = CASE WHEN eligible.catalog_exercise_id IS NOT NULL THEN 'catalog' ELSE 'custom' END
       AND selected_groups.identity_id = COALESCE(eligible.catalog_exercise_id, eligible.custom_exercise_id)
    )
    SELECT
      ranked_winners.achieved_at,
      ranked_winners.calculation_version,
      ranked_winners.calculation_versions,
      ranked_winners.catalog_exercise_id,
      ranked_winners.custom_exercise_id,
      ranked_winners.effective_display_name,
      ranked_winners.source_session_id,
      ranked_winners.source_set_log_id,
      ranked_winners.total_tie_count,
      ranked_winners.type,
      ranked_winners.value
    FROM ranked_winners
    WHERE ranked_winners.source_rank <= ${MAXIMUM_PERSONAL_RECORD_SOURCES}
    ORDER BY ranked_winners.achieved_at ASC, ranked_winners.id ASC
  `);
  const rows = (result as unknown as { rows: Array<Record<string, unknown>> }).rows.flatMap((row) => {
    const value = Number(row["value"]);
    const achievedAt = row["achieved_at"] instanceof Date
      ? row["achieved_at"]
      : new Date(String(row["achieved_at"]));
    const totalTieCount = Number(row["total_tie_count"]);
    if (!Number.isFinite(value) || !Number.isFinite(achievedAt.getTime()) || !Number.isSafeInteger(totalTieCount)) return [];
    const calculationVersions = Array.isArray(row["calculation_versions"])
      ? row["calculation_versions"].map(String)
      : typeof row["calculation_versions"] === "string"
        ? row["calculation_versions"].replace(/^\{|\}$/gu, "").split(",").filter(Boolean)
        : [String(row["calculation_version"])]
    return [{
      achievedAt,
      calculationVersion: String(row["calculation_version"]),
      calculationVersions,
      catalogExerciseId: typeof row["catalog_exercise_id"] === "string" ? row["catalog_exercise_id"] : null,
      customExerciseId: typeof row["custom_exercise_id"] === "string" ? row["custom_exercise_id"] : null,
      effectiveCatalogExerciseId: null,
      effectiveCustomExerciseId: null,
      effectiveDisplayName: String(row["effective_display_name"]),
      sourceSessionId: String(row["source_session_id"]),
      sourceSetLogId: String(row["source_set_log_id"]),
      totalTieCount,
      type: String(row["type"]) as PersonalRecordView["type"],
      value,
    }];
  });
  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    if (personalRecordCalculationVersionRank(row.calculationVersion) === undefined) continue;
    const identity = row.catalogExerciseId !== null
      ? `catalog:${row.catalogExerciseId}`
      : row.customExerciseId !== null
        ? `custom:${row.customExerciseId}`
        : undefined;
    if (!identity) continue;
    const key = `${identity}:${row.type}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return [...groups.values()]
    .map((group): PersonalRecordView => {
      const value = Math.max(...group.map((row) => row.value));
      const winners = group.filter((row) => row.value === value);
      const latest = winners.reduce((right, row) => row.achievedAt > right.achievedAt ? row : right);
      const totalTieCount = winners[0]?.totalTieCount ?? winners.length;
      const sourceRows = [...winners].sort((left, right) => {
        const achievedAtDifference = left.achievedAt.getTime() - right.achievedAt.getTime();
        return achievedAtDifference === 0
          ? left.sourceSetLogId.localeCompare(right.sourceSetLogId)
          : achievedAtDifference;
      });
      return {
        achievedAt: latest.achievedAt,
        calculationVersions: [...new Set(winners.flatMap(({ calculationVersions, calculationVersion }) => calculationVersions.length > 0 ? calculationVersions : [calculationVersion]))].sort(),
        exerciseName: latest.effectiveDisplayName,
        hasMoreSources: totalTieCount > sourceRows.length,
        isTie: totalTieCount > 1,
        sourceSessionIds: [...new Set(sourceRows.map(({ sourceSessionId }) => sourceSessionId))],
        sourceSetLogIds: sourceRows.map(({ sourceSetLogId }) => sourceSetLogId),
        totalTieCount,
        type: latest.type,
        value,
      };
    })
    .sort((left, right) => right.achievedAt.getTime() - left.achievedAt.getTime())
    .slice(0, MAXIMUM_PERSONAL_RECORD_GROUPS);
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
  const aggregateResult = await database.execute(sql`
    SELECT
      (
        SELECT count(*)::int
        FROM workout_sessions AS ws
        WHERE ws.owner_firebase_uid = ${viewer.uid}
          AND ws.state = 'completed'
      ) AS completed_sessions,
      (
        SELECT count(*)::int
        FROM workout_sessions AS ws
        WHERE ws.owner_firebase_uid = ${viewer.uid}
          AND ws.state = 'abandoned'
      ) AS abandoned_sessions,
      (
        SELECT COALESCE(sum(
          CASE
            WHEN sl.measurement_kind = 'weight_reps' THEN COALESCE(sl.weight_kg, 0) * COALESCE(sl.repetitions, 0)
            WHEN sl.measurement_kind = 'bodyweight_reps' THEN COALESCE(sl.added_weight_kg, 0) * COALESCE(sl.repetitions, 0)
            ELSE 0
          END
        ), 0)::float8
        FROM set_logs AS sl
        INNER JOIN workout_sessions AS ws
          ON ws.owner_firebase_uid = sl.owner_firebase_uid
         AND ws.id = sl.session_id
        INNER JOIN workout_exercise_states AS wes
          ON wes.owner_firebase_uid = sl.owner_firebase_uid
         AND wes.session_id = sl.session_id
         AND wes.snapshot_id = sl.snapshot_id
         AND wes.status = 'completed'
        WHERE sl.owner_firebase_uid = ${viewer.uid}
          AND ws.state = 'completed'
          AND sl.set_kind = 'work'
      ) AS volume_kg,
      (
        SELECT COALESCE(sum(COALESCE(sl.duration_seconds, 0)), 0)::float8
        FROM set_logs AS sl
        INNER JOIN workout_sessions AS ws
          ON ws.owner_firebase_uid = sl.owner_firebase_uid
         AND ws.id = sl.session_id
        INNER JOIN workout_exercise_states AS wes
          ON wes.owner_firebase_uid = sl.owner_firebase_uid
         AND wes.session_id = sl.session_id
         AND wes.snapshot_id = sl.snapshot_id
         AND wes.status = 'completed'
        WHERE sl.owner_firebase_uid = ${viewer.uid}
          AND ws.state = 'completed'
          AND sl.set_kind = 'work'
      ) AS set_duration_seconds,
      (
        SELECT COALESCE(sum(COALESCE(sl.distance_m, 0)), 0)::float8
        FROM set_logs AS sl
        INNER JOIN workout_sessions AS ws
          ON ws.owner_firebase_uid = sl.owner_firebase_uid
         AND ws.id = sl.session_id
        INNER JOIN workout_exercise_states AS wes
          ON wes.owner_firebase_uid = sl.owner_firebase_uid
         AND wes.session_id = sl.session_id
         AND wes.snapshot_id = sl.snapshot_id
         AND wes.status = 'completed'
        WHERE sl.owner_firebase_uid = ${viewer.uid}
          AND ws.state = 'completed'
          AND sl.set_kind = 'work'
      ) AS set_distance_meters,
      (
        SELECT COALESCE(sum(COALESCE(cl.duration_seconds, 0)), 0)::float8
        FROM cardio_logs AS cl
        INNER JOIN workout_sessions AS ws
          ON ws.owner_firebase_uid = cl.owner_firebase_uid
         AND ws.id = cl.session_id
        WHERE cl.owner_firebase_uid = ${viewer.uid}
          AND ws.state = 'completed'
      ) AS cardio_duration_seconds,
      (
        SELECT COALESCE(sum(COALESCE(cl.distance_m, 0)), 0)::float8
        FROM cardio_logs AS cl
        INNER JOIN workout_sessions AS ws
          ON ws.owner_firebase_uid = cl.owner_firebase_uid
         AND ws.id = cl.session_id
        WHERE cl.owner_firebase_uid = ${viewer.uid}
          AND ws.state = 'completed'
      ) AS cardio_distance_meters
  `);
  const aggregateRow = (aggregateResult as unknown as { rows: Array<Record<string, unknown>> }).rows[0] ?? {};
  const aggregateNumber = (key: string): number => {
    const value = Number(aggregateRow[key] ?? 0);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  };
  const completedSessionCount = aggregateNumber("completed_sessions");
  const sessions = await database
    .select()
    .from(workoutSessions)
    .where(and(
      eq(workoutSessions.ownerFirebaseUid, viewer.uid),
      eq(workoutSessions.state, "completed"),
    ))
    .orderBy(desc(workoutSessions.completedAt), desc(workoutSessions.id))
    .limit(MAXIMUM_PROGRESS_TIMELINE_SESSIONS);
  const completed = sessions
    .filter((session) => session.completedAt)
    .reverse();
  const completedIds = completed.map(({ id }) => id);
  const logs = completedIds.length === 0
    ? []
    : await database
        .select({
          addedWeightKg: setLogs.addedWeightKg,
          distanceM: setLogs.distanceM,
          durationSeconds: setLogs.durationSeconds,
          measurementKind: setLogs.measurementKind,
          repetitions: setLogs.repetitions,
          sessionId: setLogs.sessionId,
          setKind: setLogs.setKind,
          weightKg: setLogs.weightKg,
        })
        .from(setLogs)
        .innerJoin(workoutExerciseStates, and(
          eq(workoutExerciseStates.ownerFirebaseUid, setLogs.ownerFirebaseUid),
          eq(workoutExerciseStates.sessionId, setLogs.sessionId),
          eq(workoutExerciseStates.snapshotId, setLogs.snapshotId),
          eq(workoutExerciseStates.status, "completed"),
        ))
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
  const logsBySession = new Map<string, Array<typeof logs[number]>>();
  for (const log of logs) {
    const sessionLogs = logsBySession.get(log.sessionId);
    if (sessionLogs) {
      sessionLogs.push(log);
    } else {
      logsBySession.set(log.sessionId, [log]);
    }
  }
  const cardioBySession = new Map<string, Array<typeof cardio[number]>>();
  for (const row of cardio) {
    const sessionCardio = cardioBySession.get(row.sessionId);
    if (sessionCardio) {
      sessionCardio.push(row);
    } else {
      cardioBySession.set(row.sessionId, [row]);
    }
  }
  const inputs = completed.map((session) => {
    const sessionLogs = logsBySession.get(session.id) ?? [];
    const workLogs = sessionLogs.filter(({ setKind }) => setKind === "work");
    const sessionCardio = cardioBySession.get(session.id)?.[0];
    const estimated = workLogs
      .filter((log) => log.measurementKind === "weight_reps" && log.weightKg !== null && log.repetitions !== null)
      .flatMap((log) => {
        try {
          const value = estimateEpleyOneRepMaxKg(log.weightKg!, log.repetitions!);
          return value === undefined ? [] : [value];
        } catch {
          return [];
        }
      });
    const volume = workLogs.reduce((sum, log) => {
      const loadKg = log.measurementKind === "bodyweight_reps"
        ? log.addedWeightKg ?? 0
        : log.measurementKind === "weight_reps"
          ? log.weightKg ?? 0
          : 0;
      const repetitions = log.repetitions ?? 0;
      const next = sum + (loadKg * repetitions);
      return Number.isFinite(next) && next >= 0 ? next : sum;
    }, 0);
    const durationSeconds = workLogs.reduce((sum, log) => sum + (log.durationSeconds ?? 0), 0) + (sessionCardio?.durationSeconds ?? 0);
    const distanceMeters = workLogs.reduce((sum, log) => sum + (log.distanceM ?? 0), 0) + (sessionCardio?.distanceM ?? 0);
    return {
      completedAt: session.completedAt!.toISOString(),
      ...(Number.isFinite(distanceMeters) && distanceMeters >= 0 ? { distanceMeters } : {}),
      ...(Number.isFinite(durationSeconds) && durationSeconds >= 0 ? { durationSeconds } : {}),
      ...(estimated.length === 0 ? {} : { estimatedOneRepMaxKg: Math.max(...estimated) }),
      id: session.id,
      volumeKg: volume,
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
    scope: {
      maxSessions: MAXIMUM_PROGRESS_TIMELINE_SESSIONS,
      sessionCount: completedSessionCount,
      truncated: completedSessionCount > MAXIMUM_PROGRESS_TIMELINE_SESSIONS,
    },
    totals: {
      abandonedSessions: aggregateNumber("abandoned_sessions"),
      completedSessions: completedSessionCount,
      distanceMeters: aggregateNumber("set_distance_meters") + aggregateNumber("cardio_distance_meters"),
      durationSeconds: aggregateNumber("set_duration_seconds") + aggregateNumber("cardio_duration_seconds"),
      volumeKg: aggregateNumber("volume_kg"),
    },
  };
}
