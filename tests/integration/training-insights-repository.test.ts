import { readFile } from "node:fs/promises";

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterEach, describe, expect, it } from "vitest";

import type { Database } from "@/db/client";
import { schema } from "@/db/schema";
import { seedStarterDatabase } from "@/db/starter-seed";
import type { ViewerContext } from "@/server/auth/viewer";
import { createProfileProgramRepository } from "@/server/repositories/profile-program";
import {
  TrainingInsightsRepositoryError,
  loadPersonalRecords,
  loadProgressInsights,
  loadTrainingHistory,
  loadTrainingSession,
} from "@/server/repositories/training-insights";
import { rebuildPersonalRecordProjections } from "@/server/repositories/workout-repository";

const initialMigrationUrl = new URL("../../drizzle/0000_initial.sql", import.meta.url);
const deletionMigrationUrl = new URL("../../drizzle/0001_account_deletion_saga.sql", import.meta.url);
const workoutMigrationUrl = new URL("../../drizzle/0002_workout_canonical_measurements.sql", import.meta.url);
const programCollectionMigrationUrl = new URL("../../drizzle/0003_program_collection.sql", import.meta.url);
const projectionCheckpointMigrationUrl = new URL("../../drizzle/0004_personal_record_projection_checkpoint.sql", import.meta.url);
const openDatabases: PGlite[] = [];
const sessionIds = {
  aliceOlder: "10000000-0000-4000-8000-000000000001",
  aliceNewer: "10000000-0000-4000-8000-000000000011",
  aliceAbandoned: "10000000-0000-4000-8000-000000000021",
  bob: "20000000-0000-4000-8000-000000000001",
} as const;

function viewer(uid: string): ViewerContext {
  return {
    authTimeSeconds: 1_787_687_200,
    displayName: uid,
    eligibleForPermanentMutations: true,
    email: `${uid}@example.test`,
    emailVerified: true,
    provider: "password",
    uid,
  };
}

async function openDatabase(): Promise<{ database: Database; raw: PGlite }> {
  const raw = new PGlite();
  await raw.waitReady;
  await raw.exec(await readFile(initialMigrationUrl, "utf8"));
  await raw.exec(await readFile(deletionMigrationUrl, "utf8"));
  await raw.exec(await readFile(workoutMigrationUrl, "utf8"));
  await raw.exec(await readFile(programCollectionMigrationUrl, "utf8"));
  await raw.exec(await readFile(projectionCheckpointMigrationUrl, "utf8"));
  openDatabases.push(raw);
  const database = drizzle(raw, { schema }) as unknown as Database;
  await seedStarterDatabase(database);
  return { database, raw };
}

async function insertSession(
  raw: PGlite,
  input: Readonly<{
    catalogExerciseId: string;
    dayName: string;
    endedAt: string;
    ownerUid: string;
    programId: string;
    revisionId: string;
    sessionId: string;
    skippedExerciseLogs?: boolean;
    state: "abandoned" | "completed";
    weightKg: number;
  }>,
) {
  const suffix = input.sessionId.slice(-2);
  const relatedId = (offset: number) =>
    `${input.sessionId.slice(0, -2)}${String(Number(suffix) + offset).padStart(2, "0")}`;
  const snapshotId = relatedId(1);
  const setLogId = relatedId(2);
  const cardioId = relatedId(3);
  const warmupSetLogId = relatedId(4);
  await raw.query(`
    INSERT INTO workout_sessions (
      id, owner_firebase_uid, program_id, program_revision_id, state,
      idempotency_key, started_at
    ) VALUES ($1, $2, $3, $4, 'active', $5, $6::timestamptz - interval '45 minutes');
  `, [input.sessionId, input.ownerUid, input.programId, input.revisionId, `${input.ownerUid}-${suffix}-start`, input.endedAt]);
  await raw.query(`
    INSERT INTO workout_exercise_snapshots (
      id, owner_firebase_uid, session_id, position, section_kind, display_name,
      logging_kind, catalog_exercise_id, minimum_reps, maximum_reps, set_count,
      rest_seconds, target_weight_kg, prescription_snapshot
    ) VALUES ($1, $2, $3, 1, 'strength', $4, 'weight_reps', $5, 8, 12, 2, 90, 24.948, $6::jsonb);
  `, [snapshotId, input.ownerUid, input.sessionId, `${input.dayName} snapshot press`, input.catalogExerciseId, JSON.stringify({
    dayName: input.dayName,
    equipmentProfileKind: "dumbbells",
    notes: "Immutable program note",
    schemaVersion: 1,
  })]);
  await raw.query(`
    INSERT INTO workout_exercise_states (
      owner_firebase_uid, session_id, snapshot_id, status,
      effective_catalog_exercise_id, effective_display_name, effective_logging_kind,
      note, last_client_operation_id, version
    ) VALUES ($1, $2, $3, 'completed', $4, $5, 'weight_reps', 'Immutable note', $6, 1);
  `, [input.ownerUid, input.sessionId, snapshotId, input.catalogExerciseId, `${input.dayName} snapshot press`, `${input.ownerUid}-${suffix}-exercise`]);
  await raw.query(`
    INSERT INTO set_logs (
      id, owner_firebase_uid, session_id, snapshot_id, set_position,
      measurement_kind, set_kind, weight_kg, repetitions, form_rating,
      client_idempotency_key, recorded_at
    ) VALUES ($1, $2, $3, $4, 1, 'weight_reps', 'work', $5, 10, 5, $6, $7);
  `, [setLogId, input.ownerUid, input.sessionId, snapshotId, input.weightKg, `${input.ownerUid}-${suffix}-set`, input.endedAt]);
  await raw.query(`
    INSERT INTO set_logs (
      id, owner_firebase_uid, session_id, snapshot_id, set_position,
      measurement_kind, set_kind, weight_kg, repetitions,
      client_idempotency_key, recorded_at
    ) VALUES ($1, $2, $3, $4, 2, 'weight_reps', 'warmup', 999, 10, $5, $6);
  `, [warmupSetLogId, input.ownerUid, input.sessionId, snapshotId, `${input.ownerUid}-${suffix}-warmup`, input.endedAt]);
  if (input.ownerUid === "alice" && suffix === "01") {
    const durationSnapshotId = relatedId(5);
    const durationSetLogId = relatedId(6);
    const distanceSnapshotId = relatedId(7);
    const distanceSetLogId = relatedId(8);
    const bodyweightSnapshotId = relatedId(9);
    const bodyweightSetLogId = relatedId(10);
    await raw.query(`
      INSERT INTO workout_exercise_snapshots (
        id, owner_firebase_uid, session_id, position, section_kind, display_name,
        logging_kind, catalog_exercise_id, minimum_seconds, maximum_seconds,
        set_count, rest_seconds, prescription_snapshot
      ) VALUES ($1, $2, $3, 2, 'core', $4, 'duration', $5, 1, 3600, 1, 0, $6::jsonb);
    `, [durationSnapshotId, input.ownerUid, input.sessionId, `${input.dayName} timed warmup`, null, JSON.stringify({ dayName: input.dayName, schemaVersion: 1 })]);
    await raw.query(`
      INSERT INTO workout_exercise_states (
        owner_firebase_uid, session_id, snapshot_id, status,
        effective_catalog_exercise_id, effective_display_name, effective_logging_kind,
        last_client_operation_id, version
      ) VALUES ($1, $2, $3, 'completed', $4, $5, 'duration', $6, 1);
    `, [input.ownerUid, input.sessionId, durationSnapshotId, null, `${input.dayName} timed warmup`, `${input.ownerUid}-${suffix}-duration`]);
    await raw.query(`
      INSERT INTO set_logs (
        id, owner_firebase_uid, session_id, snapshot_id, set_position,
        measurement_kind, set_kind, duration_seconds,
        client_idempotency_key, recorded_at
      ) VALUES ($1, $2, $3, $4, 1, 'duration', 'warmup', 3599, $5, $6);
    `, [durationSetLogId, input.ownerUid, input.sessionId, durationSnapshotId, `${input.ownerUid}-${suffix}-duration-warmup`, input.endedAt]);
    await raw.query(`
      INSERT INTO workout_exercise_snapshots (
        id, owner_firebase_uid, session_id, position, section_kind, display_name,
        logging_kind, catalog_exercise_id, minimum_seconds, maximum_seconds,
        target_distance_m, set_count, rest_seconds, prescription_snapshot
      ) VALUES ($1, $2, $3, 3, 'core', $4, 'distance_duration', $5, 1, 3600, 1000, 1, 0, $6::jsonb);
    `, [distanceSnapshotId, input.ownerUid, input.sessionId, `${input.dayName} distance warmup`, null, JSON.stringify({ dayName: input.dayName, schemaVersion: 1 })]);
    await raw.query(`
      INSERT INTO workout_exercise_states (
        owner_firebase_uid, session_id, snapshot_id, status,
        effective_catalog_exercise_id, effective_display_name, effective_logging_kind,
        last_client_operation_id, version
      ) VALUES ($1, $2, $3, 'completed', $4, $5, 'distance_duration', $6, 1);
    `, [input.ownerUid, input.sessionId, distanceSnapshotId, null, `${input.dayName} distance warmup`, `${input.ownerUid}-${suffix}-distance`]);
    await raw.query(`
      INSERT INTO set_logs (
        id, owner_firebase_uid, session_id, snapshot_id, set_position,
        measurement_kind, set_kind, distance_m, duration_seconds,
        client_idempotency_key, recorded_at
      ) VALUES ($1, $2, $3, $4, 1, 'distance_duration', 'warmup', 9999, 3599, $5, $6);
    `, [distanceSetLogId, input.ownerUid, input.sessionId, distanceSnapshotId, `${input.ownerUid}-${suffix}-distance-warmup`, input.endedAt]);
    await raw.query(`
      INSERT INTO workout_exercise_snapshots (
        id, owner_firebase_uid, session_id, position, section_kind, display_name,
        logging_kind, minimum_reps, maximum_reps, set_count, rest_seconds,
        prescription_snapshot
      ) VALUES ($1, $2, $3, 4, 'core', $4, 'bodyweight_reps', 1, 20, 1, 0, $5::jsonb);
    `, [bodyweightSnapshotId, input.ownerUid, input.sessionId, `${input.dayName} weighted bodyweight`, JSON.stringify({ dayName: input.dayName, schemaVersion: 1 })]);
    await raw.query(`
      INSERT INTO workout_exercise_states (
        owner_firebase_uid, session_id, snapshot_id, status,
        effective_display_name, effective_logging_kind,
        last_client_operation_id, version
      ) VALUES ($1, $2, $3, 'completed', $4, 'bodyweight_reps', $5, 1);
    `, [input.ownerUid, input.sessionId, bodyweightSnapshotId, `${input.dayName} weighted bodyweight`, `${input.ownerUid}-${suffix}-bodyweight`]);
    await raw.query(`
      INSERT INTO set_logs (
        id, owner_firebase_uid, session_id, snapshot_id, set_position,
        measurement_kind, set_kind, added_weight_kg, repetitions,
        client_idempotency_key, recorded_at
      ) VALUES ($1, $2, $3, $4, 1, 'bodyweight_reps', 'work', 5, 12, $5, $6);
    `, [bodyweightSetLogId, input.ownerUid, input.sessionId, bodyweightSnapshotId, `${input.ownerUid}-${suffix}-bodyweight-work`, input.endedAt]);
  }
  if (input.skippedExerciseLogs) {
    const skippedWeightSnapshotId = relatedId(5);
    const skippedDurationSnapshotId = relatedId(6);
    const skippedDistanceSnapshotId = relatedId(7);
    const skippedWeightSetId = relatedId(8);
    const skippedDurationSetId = relatedId(9);
    const skippedDistanceSetId = relatedId(10);
    await raw.query(`
      INSERT INTO workout_exercise_snapshots (
        id, owner_firebase_uid, session_id, position, section_kind, display_name,
        logging_kind, minimum_reps, maximum_reps, set_count, rest_seconds,
        prescription_snapshot
      ) VALUES ($1, $2, $3, 20, 'strength', 'Skipped heavy press',
        'weight_reps', 1, 100, 1, 0, '{}');
    `, [skippedWeightSnapshotId, input.ownerUid, input.sessionId]);
    await raw.query(`
      INSERT INTO workout_exercise_snapshots (
        id, owner_firebase_uid, session_id, position, section_kind, display_name,
        logging_kind, minimum_seconds, maximum_seconds, set_count, rest_seconds,
        prescription_snapshot
      ) VALUES ($1, $2, $3, 21, 'core', 'Skipped timed hold',
        'duration', 1, 20000, 1, 0, '{}');
    `, [skippedDurationSnapshotId, input.ownerUid, input.sessionId]);
    await raw.query(`
      INSERT INTO workout_exercise_snapshots (
        id, owner_firebase_uid, session_id, position, section_kind, display_name,
        logging_kind, minimum_seconds, maximum_seconds, target_distance_m,
        set_count, rest_seconds, prescription_snapshot
      ) VALUES ($1, $2, $3, 22, 'core', 'Skipped distance drill',
        'distance_duration', 1, 20000, 999999, 1, 0, '{}');
    `, [skippedDistanceSnapshotId, input.ownerUid, input.sessionId]);
    await raw.query(`
      INSERT INTO workout_exercise_states (
        owner_firebase_uid, session_id, snapshot_id, status,
        effective_display_name, effective_logging_kind, last_client_operation_id, version
      ) VALUES
        ($1, $2, $3, 'skipped', 'Skipped heavy press', 'weight_reps', $4, 1),
        ($1, $2, $5, 'skipped', 'Skipped timed hold', 'duration', $6, 1),
        ($1, $2, $7, 'skipped', 'Skipped distance drill', 'distance_duration', $8, 1);
    `, [
      input.ownerUid,
      input.sessionId,
      skippedWeightSnapshotId,
      `${input.ownerUid}-${suffix}-skip-heavy`,
      skippedDurationSnapshotId,
      `${input.ownerUid}-${suffix}-skip-duration`,
      skippedDistanceSnapshotId,
      `${input.ownerUid}-${suffix}-skip-distance`,
    ]);
    await raw.query(`
      INSERT INTO set_logs (
        id, owner_firebase_uid, session_id, snapshot_id, set_position,
        measurement_kind, set_kind, weight_kg, repetitions,
        client_idempotency_key, recorded_at
      ) VALUES ($1, $2, $3, $4, 1, 'weight_reps', 'work', 999, 99, $5, $6);
    `, [skippedWeightSetId, input.ownerUid, input.sessionId, skippedWeightSnapshotId, `${input.ownerUid}-${suffix}-skipped-heavy-set`, input.endedAt]);
    await raw.query(`
      INSERT INTO set_logs (
        id, owner_firebase_uid, session_id, snapshot_id, set_position,
        measurement_kind, set_kind, duration_seconds,
        client_idempotency_key, recorded_at
      ) VALUES ($1, $2, $3, $4, 1, 'duration', 'work', 9999, $5, $6);
    `, [skippedDurationSetId, input.ownerUid, input.sessionId, skippedDurationSnapshotId, `${input.ownerUid}-${suffix}-skipped-duration-set`, input.endedAt]);
    await raw.query(`
      INSERT INTO set_logs (
        id, owner_firebase_uid, session_id, snapshot_id, set_position,
        measurement_kind, set_kind, distance_m, duration_seconds,
        client_idempotency_key, recorded_at
      ) VALUES ($1, $2, $3, $4, 1, 'distance_duration', 'work', 999999, 9999, $5, $6);
    `, [skippedDistanceSetId, input.ownerUid, input.sessionId, skippedDistanceSnapshotId, `${input.ownerUid}-${suffix}-skipped-distance-set`, input.endedAt]);
  }
  await raw.query(`
    INSERT INTO cardio_logs (
      id, owner_firebase_uid, session_id, mode, duration_seconds, distance_m,
      pace_seconds_per_km, pace_source, incline_percent, note_snapshot,
      client_idempotency_key, recorded_at
    ) VALUES ($1, $2, $3, 'walker', 1200, 1609.344, 746, 'entered', 2,
      'Immutable cardio note', $4, $5);
  `, [cardioId, input.ownerUid, input.sessionId, `${input.ownerUid}-${suffix}-cardio`, input.endedAt]);
  await raw.query(`
    UPDATE workout_sessions
    SET state = $1::session_state,
        completed_at = CASE WHEN $1::session_state = 'completed' THEN $2::timestamptz ELSE NULL END,
        abandoned_at = CASE WHEN $1::session_state = 'abandoned' THEN $2::timestamptz ELSE NULL END
    WHERE owner_firebase_uid = $3 AND id = $4;
  `, [input.state, input.endedAt, input.ownerUid, input.sessionId]);
  return { cardioId, setLogId, snapshotId };
}

async function seedOwnerGraph(database: Database, raw: PGlite, uid: "alice" | "bob") {
  const profile = await createProfileProgramRepository(database).onboard(viewer(uid), {
    equipmentProfileKind: "dumbbells",
    timezone: uid === "alice" ? "America/Chicago" : "UTC",
    unitSystem: uid === "alice" ? "imperial" : "metric",
  });
  const program = profile.activeProgram!;
  const catalogExerciseId = program.days[0]!.prescriptions[0]!.catalogExerciseId!;
  return { catalogExerciseId, program };
}

async function seedFixture(database: Database, raw: PGlite) {
  const alice = await seedOwnerGraph(database, raw, "alice");
  const bob = await seedOwnerGraph(database, raw, "bob");
  const aliceOlder = await insertSession(raw, {
    catalogExerciseId: alice.catalogExerciseId,
    dayName: "Push archive",
    endedAt: "2026-08-24T23:30:00.000Z",
    ownerUid: "alice",
    programId: alice.program.id,
    revisionId: alice.program.revisionId,
    sessionId: sessionIds.aliceOlder,
    state: "completed",
    weightKg: 40,
  });
  const aliceNewer = await insertSession(raw, {
    catalogExerciseId: alice.catalogExerciseId,
    dayName: "Upper archive",
    endedAt: "2026-08-25T23:30:00.000Z",
    ownerUid: "alice",
    programId: alice.program.id,
    revisionId: alice.program.revisionId,
    sessionId: sessionIds.aliceNewer,
    skippedExerciseLogs: true,
    state: "completed",
    weightKg: 45,
  });
  await insertSession(raw, {
    catalogExerciseId: alice.catalogExerciseId,
    dayName: "Lower interrupted",
    endedAt: "2026-08-26T23:30:00.000Z",
    ownerUid: "alice",
    programId: alice.program.id,
    revisionId: alice.program.revisionId,
    sessionId: sessionIds.aliceAbandoned,
    state: "abandoned",
    weightKg: 30,
  });
  await insertSession(raw, {
    catalogExerciseId: bob.catalogExerciseId,
    dayName: "Bob private",
    endedAt: "2026-08-27T23:30:00.000Z",
    ownerUid: "bob",
    programId: bob.program.id,
    revisionId: bob.program.revisionId,
    sessionId: sessionIds.bob,
    state: "completed",
    weightKg: 90,
  });
  await raw.query(`
    INSERT INTO personal_records (
      owner_firebase_uid, catalog_exercise_id, type, value,
      source_set_log_id, calculation_version, achieved_at
    ) VALUES
      ('alice', $1, 'max_weight', 45, $2, 'v1', '2026-08-24T23:30:00.000Z'),
      ('alice', $1, 'max_weight', 45, $3, 'v1', '2026-08-25T23:30:00.000Z'),
      ('bob', $4, 'max_weight', 90, $5, 'v1', '2026-08-27T23:30:00.000Z');
  `, [alice.catalogExerciseId, aliceOlder.setLogId, aliceNewer.setLogId, bob.catalogExerciseId, `${sessionIds.bob.slice(0, -2)}03`]);
  await raw.query(`
    INSERT INTO progress_summaries (
      owner_firebase_uid, summary_kind, period_start, period_end,
      workout_count, total_volume_kg, total_duration_seconds, calculation_version,
      generated_at
    ) VALUES
      ('alice', 'daily', '2026-08-24', '2026-08-24', 1, 400, 1200, 'v1', '2026-08-25T00:00:00.000Z'),
      ('alice', 'daily', '2026-08-25', '2026-08-25', 1, 450, 1200, 'v1', '2026-08-26T00:00:00.000Z'),
      ('bob', 'daily', '2026-08-27', '2026-08-27', 1, 900, 1200, 'v1', '2026-08-28T00:00:00.000Z');
  `);
}

afterEach(async () => {
  await Promise.all(openDatabases.splice(0).map((database) => database.close()));
});

describe("training insights repository", () => {
  it("paginates immutable terminal history and derives labels from snapshots", async () => {
    const { database, raw } = await openDatabase();
    await seedFixture(database, raw);

    const first = await loadTrainingHistory(database, viewer("alice"), { limit: 2 });
    expect(first.sessions.map(({ dayName, state }) => [dayName, state])).toEqual([
      ["Lower interrupted", "abandoned"],
      ["Upper archive", "completed"],
    ]);
    expect(first.nextCursor).toBeTypeOf("string");
    if (first.nextCursor === undefined) throw new Error("Expected another history page.");
    const second = await loadTrainingHistory(database, viewer("alice"), {
      cursor: first.nextCursor,
      limit: 2,
    });
    expect(second.sessions.map(({ dayName }) => dayName)).toEqual(["Push archive"]);
    expect((await loadTrainingHistory(database, viewer("bob"))).sessions).toHaveLength(1);
  });

  it("returns owner-scoped immutable detail and hides a foreign session", async () => {
    const { database, raw } = await openDatabase();
    await seedFixture(database, raw);

    const detail = await loadTrainingSession(database, viewer("alice"), sessionIds.aliceNewer);
    expect(detail).toMatchObject({ dayName: "Upper archive", state: "completed" });
    expect(detail.exercises[0]).toMatchObject({
      displayName: "Upper archive snapshot press",
      equipmentProfileKind: "dumbbells",
      maximumReps: 12,
      minimumReps: 8,
      note: "Immutable note",
      prescriptionNote: "Immutable program note",
      restSeconds: 90,
      setCount: 2,
      status: "completed",
      targetWeightKg: 24.948,
    });
    expect(detail.exercises[0]!.sets[0]).toMatchObject({ repetitions: 10, weightKg: 45 });
    expect(detail.cardio).toMatchObject({ notes: "Immutable cardio note" });
    const older = await loadTrainingSession(database, viewer("alice"), sessionIds.aliceOlder);
    const bodyweight = older.exercises.find(
      (exercise) => exercise.loggingKind === "bodyweight_reps",
    );
    expect(bodyweight).toMatchObject({ maximumReps: 20, minimumReps: 1, setCount: 1 });
    expect(bodyweight?.sets[0]).toMatchObject({ addedWeightKg: 5, repetitions: 12 });
    await expect(
      loadTrainingSession(database, viewer("alice"), sessionIds.bob),
    ).rejects.toBeInstanceOf(TrainingInsightsRepositoryError);
  });

  it("groups tied personal records without exposing another owner's source", async () => {
    const { database, raw } = await openDatabase();
    await seedFixture(database, raw);
    await raw.query(`
      UPDATE catalog_exercises
      SET name = 'Mutable catalog name'
      WHERE id = (
        SELECT catalog_exercise_id
        FROM personal_records
        WHERE owner_firebase_uid = 'alice'
        LIMIT 1
      );
    `);
    const catalogExerciseId = (await raw.query<{ id: string }>(`
      SELECT catalog_exercise_id AS id
      FROM personal_records
      WHERE owner_firebase_uid = 'alice'
      LIMIT 1;
    `)).rows[0]!.id;
    await raw.query(`
      INSERT INTO personal_records (
        owner_firebase_uid, catalog_exercise_id, type, value,
        source_set_log_id, calculation_version, achieved_at
      ) VALUES
        ('alice', '${catalogExerciseId}', 'max_weight', 1000,
          '${sessionIds.aliceOlder.slice(0, -2)}05', 'v1', '2026-08-24T23:31:00.000Z'),
        ('alice', '${catalogExerciseId}', 'max_weight', 2000,
          '${sessionIds.aliceAbandoned.slice(0, -2)}23', 'v1', '2026-08-26T23:31:00.000Z');
    `);

    const records = await loadPersonalRecords(database, viewer("alice"));
    expect(records).toEqual([
      expect.objectContaining({
        exerciseName: "Upper archive snapshot press",
        isTie: true,
        sourceSessionIds: [sessionIds.aliceOlder, sessionIds.aliceNewer],
        type: "max_weight",
        value: 45,
      }),
    ]);
    expect(JSON.stringify(records)).not.toContain(sessionIds.bob);
  });

  it("builds sparse completed-session analytics in the owner's time zone", async () => {
    const { database, raw } = await openDatabase();
    await seedFixture(database, raw);

    const progress = await loadProgressInsights(database, viewer("alice"));
    expect(progress.preferences).toMatchObject({ timezone: "America/Chicago", unitSystem: "imperial" });
    expect(progress.totals).toMatchObject({
      abandonedSessions: 1,
      completedSessions: 2,
      distanceMeters: 3218.688,
      durationSeconds: 2400,
      volumeKg: 910,
    });
    expect(progress.series.map(({ date, sessionCount, volumeKg }) => [date, sessionCount, volumeKg])).toEqual([
      ["2026-08-24", 1, 460],
      ["2026-08-25", 1, 450],
    ]);
    expect(progress.series[1]).toMatchObject({
      distanceMeters: 1609.344,
      durationSeconds: 1200,
      estimatedOneRepMaxKg: 60,
    });
    expect(progress.projection).toMatchObject({ calculationVersions: ["v1"], state: "persisted" });
    expect(progress.series.every(({ sourceIds }) => sourceIds.every((id) => id.startsWith("10000000")))).toBe(true);
  });

  it("keeps all-time totals while bounding the timeline to the newest sessions", async () => {
    const { database, raw } = await openDatabase();
    await seedFixture(database, raw);
    const source = await raw.query<{ catalog_exercise_id: string; program_id: string; program_revision_id: string }>(`
      SELECT pr.catalog_exercise_id, ws.program_id, ws.program_revision_id
      FROM personal_records AS pr
      INNER JOIN set_logs AS sl
        ON sl.owner_firebase_uid = pr.owner_firebase_uid
       AND sl.id = pr.source_set_log_id
      INNER JOIN workout_sessions AS ws
        ON ws.owner_firebase_uid = sl.owner_firebase_uid
       AND ws.id = sl.session_id
      WHERE pr.owner_firebase_uid = 'alice'
      LIMIT 1;
    `);
    const boundedRows = Array.from({ length: 181 }, (_, index) => {
      const number = index + 1;
      const suffix = String(number).padStart(12, "0");
      const completedAt = new Date(Date.parse("2027-01-01T18:00:00.000Z") + index * 86_400_000).toISOString();
      return {
        completedAt,
        sessionId: `60000000-0000-4000-8000-${suffix}`,
        setLogId: `62000000-0000-4000-8000-${suffix}`,
        snapshotId: `61000000-0000-4000-8000-${suffix}`,
      };
    });
    await raw.exec(boundedRows.map(({ completedAt, sessionId, setLogId, snapshotId }) => `
      INSERT INTO workout_sessions (
        id, owner_firebase_uid, program_id, program_revision_id, state,
        idempotency_key, started_at, completed_at
      ) VALUES (
        '${sessionId}', 'alice', '${source.rows[0]!.program_id}',
        '${source.rows[0]!.program_revision_id}', 'active', 'bounded-${sessionId.slice(-4)}',
        '${completedAt}', NULL
      );
      INSERT INTO workout_exercise_snapshots (
        id, owner_firebase_uid, session_id, position, section_kind, display_name,
        logging_kind, catalog_exercise_id, minimum_reps, maximum_reps, set_count,
        rest_seconds, prescription_snapshot
      ) VALUES (
        '${snapshotId}', 'alice', '${sessionId}', 1, 'strength', 'Bounded press',
        'weight_reps', '${source.rows[0]!.catalog_exercise_id}', 1, 1, 1, 0, '{}'
      );
      INSERT INTO workout_exercise_states (
        owner_firebase_uid, session_id, snapshot_id, status,
        effective_catalog_exercise_id, effective_display_name, effective_logging_kind,
        last_client_operation_id, version
      ) VALUES (
        'alice', '${sessionId}', '${snapshotId}', 'completed',
        '${source.rows[0]!.catalog_exercise_id}', 'Bounded press', 'weight_reps',
        'bounded-operation-${sessionId.slice(-4)}', 1
      );
      INSERT INTO set_logs (
        id, owner_firebase_uid, session_id, snapshot_id, set_position,
        measurement_kind, set_kind, weight_kg, repetitions,
        client_idempotency_key, recorded_at
      ) VALUES (
        '${setLogId}', 'alice', '${sessionId}', '${snapshotId}', 1,
        'weight_reps', 'work', 1, 1, 'bounded-set-${sessionId.slice(-4)}', '${completedAt}'
      );
      UPDATE workout_sessions
      SET state = 'completed', completed_at = '${completedAt}'
      WHERE owner_firebase_uid = 'alice' AND id = '${sessionId}';
    `).join("\n"));

    const progress = await loadProgressInsights(database, viewer("alice"));
    expect(progress.scope).toEqual({ maxSessions: 180, sessionCount: 183, truncated: true });
    expect(progress.series).toHaveLength(180);
    expect(progress.series[0]?.sourceIds).toEqual([boundedRows[1]!.sessionId]);
    expect(progress.series.at(-1)?.sourceIds).toEqual([boundedRows.at(-1)!.sessionId]);
    expect(progress.totals).toMatchObject({
      abandonedSessions: 1,
      completedSessions: 183,
      distanceMeters: 3218.688,
      durationSeconds: 2400,
      volumeKg: 1091,
    });
    expect(progress.series.some(({ sourceIds }) => sourceIds.includes(boundedRows[0]!.sessionId))).toBe(false);
  });

  it("dry-runs and resumes UUID-cursor rebuilds with version-safe upserts", async () => {
    const { database, raw } = await openDatabase();
    await seedFixture(database, raw);
    const staleCatalog = await raw.query<{ id: string }>(`
      SELECT catalog_exercise_id AS id
      FROM personal_records
      WHERE owner_firebase_uid = 'alice'
      LIMIT 1;
    `);
    await raw.query(`
      INSERT INTO personal_records (
        owner_firebase_uid, catalog_exercise_id, type, value,
        source_set_log_id, calculation_version, achieved_at
      ) VALUES (
        'alice', '${staleCatalog.rows[0]!.id}', 'distance', 999,
        '${sessionIds.aliceOlder.slice(0, -2)}03', 'v1', '2026-08-24T23:30:00.000Z'
      );
    `);
    const before = await raw.query<{ count: string }>(`
      SELECT count(*)::text AS count
      FROM personal_records;
    `);
    const dryRun = await rebuildPersonalRecordProjections(database, { batchSize: 1 });
    expect(dryRun).toMatchObject({
      changedCount: 13,
      committedBatches: 0,
      completed: true,
      deletedCount: 1,
      insertedCount: 9,
      mode: "dry_run",
      sessionsScanned: 3,
      totalCandidateCount: dryRun.candidateCount,
      totalSessionsScanned: 3,
      updatedCount: 3,
    });
    expect(dryRun.candidateCount).toBeGreaterThan(0);
    expect((await raw.query<{ count: string }>(`
      SELECT count(*)::text AS count
      FROM personal_records;
    `)).rows).toEqual(before.rows);
    expect((await raw.query<{ count: string }>(`
      SELECT count(*)::text AS count
      FROM personal_record_projection_checkpoints;
    `)).rows).toEqual([{ count: "0" }]);

    await raw.query(`
      UPDATE personal_records
      SET value = 999, calculation_version = 'v1'
      WHERE owner_firebase_uid = 'alice'
        AND source_set_log_id = '${sessionIds.aliceOlder.slice(0, -2)}03'
        AND type = 'max_weight';
    `);
    await expect(rebuildPersonalRecordProjections(database, {
      apply: true,
      batchSize: 1,
      interruptAfterBatches: 1,
    })).rejects.toThrow(/interrupted after 1 committed batch/iu);
    const interrupted = await raw.query<{
      calculation_version: string;
      changed_count: number;
      last_session_id: string | null;
      status: string;
    }>(`
      SELECT calculation_version, changed_count, last_session_id, status
      FROM personal_record_projection_checkpoints;
    `);
    expect(interrupted.rows).toEqual([{
      calculation_version: "v2",
      changed_count: 5,
      last_session_id: sessionIds.aliceOlder,
      status: "running",
    }]);
    expect(JSON.stringify(interrupted.rows)).not.toContain("alice");
    const repaired = await raw.query<{ value: number; calculation_version: string }>(`
      SELECT value::float8 AS value, calculation_version
      FROM personal_records
      WHERE owner_firebase_uid = 'alice'
        AND source_set_log_id = '${sessionIds.aliceOlder.slice(0, -2)}03'
        AND type = 'max_weight';
    `);
    expect(repaired.rows).toEqual([{ value: 40, calculation_version: "v2" }]);
    expect((await raw.query<{ count: string }>(`
      SELECT count(*)::text AS count
      FROM personal_records
      WHERE owner_firebase_uid = 'alice'
        AND source_set_log_id = '${sessionIds.aliceOlder.slice(0, -2)}03'
        AND type = 'distance';
    `)).rows).toEqual([{ count: "0" }]);

    const resumed = await rebuildPersonalRecordProjections(database, { apply: true, batchSize: 1 });
    expect(resumed).toMatchObject({
      candidateCount: 8,
      completed: true,
      mode: "applied",
      sessionsScanned: 2,
      totalCandidateCount: dryRun.candidateCount,
      totalSessionsScanned: 3,
    });
    expect(resumed.changedCount).toBe(8);
    expect(resumed.totalChangedCount).toBe(13);
    expect(resumed.committedBatches).toBe(2);
    const replay = await rebuildPersonalRecordProjections(database, { apply: true, batchSize: 1 });
    expect(replay).toMatchObject({
      candidateCount: 0,
      changedCount: 0,
      committedBatches: 0,
      completed: true,
      sessionsScanned: 0,
      totalCandidateCount: dryRun.candidateCount,
      totalSessionsScanned: 3,
    });
    expect(await rebuildPersonalRecordProjections(database, { batchSize: 1 })).toMatchObject({
      candidateCount: dryRun.candidateCount,
      changedCount: 0,
      deletedCount: 0,
      insertedCount: 0,
      mode: "dry_run",
      sessionsScanned: 3,
      updatedCount: 0,
    });
    const completedCheckpoint = await raw.query<{ last_session_id: string | null; status: string }>(`
      SELECT last_session_id, status
      FROM personal_record_projection_checkpoints;
    `);
    expect(completedCheckpoint.rows).toEqual([{ last_session_id: null, status: "completed" }]);

    await raw.query(`
      UPDATE personal_records
      SET value = 45, calculation_version = 'v1'
      WHERE owner_firebase_uid = 'alice'
        AND source_set_log_id = '${sessionIds.aliceOlder.slice(0, -2)}03'
        AND type = 'max_weight';
    `);
    const mixed = (await loadPersonalRecords(database, viewer("alice")))
      .filter(({ type }) => type === "max_weight");
    expect(mixed).toEqual([
      expect.objectContaining({
        calculationVersions: ["v1", "v2"],
        isTie: true,
        sourceSessionIds: [sessionIds.aliceOlder, sessionIds.aliceNewer],
        type: "max_weight",
        value: 45,
      }),
    ]);

    await raw.query(`
      UPDATE personal_records
      SET value = 999, calculation_version = 'v99'
      WHERE owner_firebase_uid = 'alice'
        AND source_set_log_id = '${sessionIds.aliceNewer.slice(0, -2)}13'
        AND type = 'max_weight';
    `);
    await raw.query(`DELETE FROM personal_record_projection_checkpoints;`);
    await rebuildPersonalRecordProjections(database, { apply: true, batchSize: 1 });
    const unknown = await raw.query<{ value: number; calculation_version: string }>(`
      SELECT value::float8 AS value, calculation_version
      FROM personal_records
      WHERE owner_firebase_uid = 'alice'
        AND source_set_log_id = '${sessionIds.aliceNewer.slice(0, -2)}13'
      AND type = 'max_weight';
    `);
    expect(unknown.rows).toEqual([{ value: 999, calculation_version: "v99" }]);
    const afterUnknown = (await loadPersonalRecords(database, viewer("alice")))
      .filter(({ type }) => type === "max_weight");
    expect(afterUnknown).toEqual([
      expect.objectContaining({
        calculationVersions: ["v2"],
        sourceSessionIds: [sessionIds.aliceOlder],
        value: 40,
      }),
    ]);

    const projectionSource = await raw.query<{
      program_id: string;
      program_revision_id: string;
    }>(`
      SELECT program_id, program_revision_id
      FROM workout_sessions
      WHERE owner_firebase_uid = 'alice'
        AND id = '${sessionIds.aliceOlder}';
    `);
    const zeroLoad = await insertSession(raw, {
      catalogExerciseId: staleCatalog.rows[0]!.id,
      dayName: "Zero-load archive",
      endedAt: "2026-08-28T23:30:00.000Z",
      ownerUid: "alice",
      programId: projectionSource.rows[0]!.program_id,
      revisionId: projectionSource.rows[0]!.program_revision_id,
      sessionId: "10000000-0000-4000-8000-000000000041",
      state: "completed",
      weightKg: 0,
    });
    await raw.query(`
      INSERT INTO personal_records (
        owner_firebase_uid, catalog_exercise_id, type, value,
        source_set_log_id, calculation_version, achieved_at
      ) VALUES
        ('alice', $1, 'max_weight', 0, $2, 'v1', '2026-08-28T23:30:00.000Z'),
        ('alice', $1, 'volume', 0, $2, 'v1', '2026-08-28T23:30:00.000Z'),
        ('alice', $1, 'estimated_1rm', 0, $2, 'v1', '2026-08-28T23:30:00.000Z');
    `, [staleCatalog.rows[0]!.id, zeroLoad.setLogId]);
    await raw.exec(`DELETE FROM personal_record_projection_checkpoints;`);
    const zeroLoadRebuild = await rebuildPersonalRecordProjections(database, {
      apply: true,
      batchSize: 1,
    });
    expect(zeroLoadRebuild).toMatchObject({ deletedCount: 3, mode: "applied" });
    const zeroLoadTypes = await raw.query<{ type: string }>(`
      SELECT type::text AS type
      FROM personal_records
      WHERE owner_firebase_uid = 'alice'
        AND source_set_log_id = '${zeroLoad.setLogId}'
      ORDER BY type;
    `);
    expect(zeroLoadTypes.rows).toEqual([{ type: "max_repetitions" }]);
  });

  it("finds a global winner beyond the presentation cap before limiting groups", async () => {
    const { database, raw } = await openDatabase();
    await seedFixture(database, raw);
    const source = await raw.query<{ catalog_exercise_id: string; program_id: string; program_revision_id: string }>(`
      SELECT pr.catalog_exercise_id, ws.program_id, ws.program_revision_id
      FROM personal_records AS pr
      INNER JOIN set_logs AS sl
        ON sl.owner_firebase_uid = pr.owner_firebase_uid
       AND sl.id = pr.source_set_log_id
      INNER JOIN workout_sessions AS ws
        ON ws.owner_firebase_uid = sl.owner_firebase_uid
       AND ws.id = sl.session_id
      WHERE pr.owner_firebase_uid = 'alice'
      LIMIT 1;
    `);
    const catalogExerciseId = source.rows[0]!.catalog_exercise_id;
    const limitSessionId = "30000000-0000-4000-8000-000000000001";
    const limitSnapshotId = "30000000-0000-4000-8000-000000000002";
    const sourceRows = Array.from({ length: 501 }, (_, index) => {
      const number = index + 1;
      const setLogId = `31000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
      const achievedAt = new Date(Date.parse("2026-08-30T00:00:00.000Z") + index * 1_000).toISOString();
      return { achievedAt, setLogId, value: number >= 481 ? 99 : 45 };
    });
    await raw.query(`
      INSERT INTO workout_sessions (
        id, owner_firebase_uid, program_id, program_revision_id, state,
        idempotency_key, started_at
      ) VALUES (
        '${limitSessionId}', 'alice', '${source.rows[0]!.program_id}',
        '${source.rows[0]!.program_revision_id}', 'active', 'limit-session-start',
        '2026-08-29T23:00:00.000Z'
      );
    `);
    await raw.query(`
      INSERT INTO workout_exercise_snapshots (
        id, owner_firebase_uid, session_id, position, section_kind, display_name,
        logging_kind, catalog_exercise_id, minimum_reps, maximum_reps, set_count,
        rest_seconds, prescription_snapshot
      ) VALUES (
        '${limitSnapshotId}', 'alice', '${limitSessionId}', 1, 'strength',
        'Limit source press', 'weight_reps', '${catalogExerciseId}', 8, 12, 501,
        90, '{}'
      );
    `);
    await raw.query(`
      INSERT INTO workout_exercise_states (
        owner_firebase_uid, session_id, snapshot_id, status,
        effective_catalog_exercise_id, effective_display_name, effective_logging_kind,
        last_client_operation_id, version
      ) VALUES (
        'alice', '${limitSessionId}', '${limitSnapshotId}', 'completed',
        '${catalogExerciseId}', 'Limit source press', 'weight_reps',
        'limit-session-exercise', 1
      );
    `);
    await raw.query(`
      INSERT INTO set_logs (
        id, owner_firebase_uid, session_id, snapshot_id, set_position,
        measurement_kind, set_kind, weight_kg, repetitions,
        client_idempotency_key, recorded_at
      ) VALUES ${sourceRows.map(({ setLogId, value }, index) =>
        `('${setLogId}', 'alice', '${limitSessionId}', '${limitSnapshotId}', ${index + 1}, 'weight_reps', 'work', ${value}, 10, 'limit-set-${index + 1}', '2026-08-30T00:00:00.000Z')`).join(",")};
    `);
    await raw.query(`
      UPDATE workout_sessions
      SET state = 'completed', completed_at = '2026-08-30T01:00:00.000Z'
      WHERE id = '${limitSessionId}' AND owner_firebase_uid = 'alice';
    `);
    await raw.query(`
      INSERT INTO personal_records (
        owner_firebase_uid, catalog_exercise_id, type, value,
        source_set_log_id, calculation_version, achieved_at
      ) VALUES ${sourceRows.map(({ achievedAt, setLogId, value }) =>
        `('alice', '${catalogExerciseId}', 'max_weight', ${value}, '${setLogId}', 'v1', '${achievedAt}')`).join(",")};
    `);

    const records = await loadPersonalRecords(database, viewer("alice"));
    const winner = records.find(({ value }) => value === 99);
    expect(winner).toEqual(expect.objectContaining({
      exerciseName: "Limit source press",
      hasMoreSources: true,
      sourceSetLogIds: sourceRows.slice(-20).map(({ setLogId }) => setLogId),
      sourceSessionIds: [limitSessionId],
      totalTieCount: 21,
      type: "max_weight",
      value: 99,
    }));
  });

  it("keeps catalog and custom UUID collisions in separate record groups", async () => {
    const { database, raw } = await openDatabase();
    await seedFixture(database, raw);
    const catalog = await raw.query<{ id: string }>(`
      SELECT catalog_exercise_id AS id
      FROM personal_records
      WHERE owner_firebase_uid = 'alice'
      LIMIT 1;
    `);
    const catalogExerciseId = catalog.rows[0]!.id;
    const customSessionId = "40000000-0000-4000-8000-000000000001";
    const customSnapshotId = "40000000-0000-4000-8000-000000000002";
    const customSetLogId = "40000000-0000-4000-8000-000000000003";
    const corruptCustomId = "50000000-0000-4000-8000-000000000001";
    const catalogSourceSetLogId = `${sessionIds.aliceNewer.slice(0, -2)}13`;
    const source = await raw.query<{ program_id: string; program_revision_id: string }>(`
      SELECT program_id, program_revision_id
      FROM workout_sessions
      WHERE owner_firebase_uid = 'alice' AND id = '${sessionIds.aliceNewer}';
    `);
    await raw.query(`
      INSERT INTO custom_exercises (id, owner_firebase_uid, exercise_key, name, logging_kind)
      VALUES
        ('${catalogExerciseId}', 'alice', 'collision-custom', 'Collision custom', 'weight_reps'),
        ('${corruptCustomId}', 'alice', 'collision-corrupt', 'Corrupt custom', 'weight_reps');
    `);
    await raw.query(`
      INSERT INTO workout_sessions (
        id, owner_firebase_uid, program_id, program_revision_id, state,
        idempotency_key, started_at
      ) VALUES (
        '${customSessionId}', 'alice', '${source.rows[0]!.program_id}',
        '${source.rows[0]!.program_revision_id}', 'active', 'collision-session-start',
        '2026-08-26T22:45:00.000Z'
      );
    `);
    await raw.query(`
      INSERT INTO workout_exercise_snapshots (
        id, owner_firebase_uid, session_id, position, section_kind, display_name,
        logging_kind, minimum_reps, maximum_reps, set_count, rest_seconds,
        prescription_snapshot
      ) VALUES (
        '${customSnapshotId}', 'alice', '${customSessionId}', 1, 'strength',
        'Collision custom source', 'weight_reps', 8, 12, 1, 90, '{}'
      );
    `);
    await raw.query(`
      INSERT INTO workout_exercise_states (
        owner_firebase_uid, session_id, snapshot_id, status,
        effective_custom_exercise_id, effective_display_name, effective_logging_kind,
        last_client_operation_id, version
      ) VALUES (
        'alice', '${customSessionId}', '${customSnapshotId}', 'completed',
        '${catalogExerciseId}', 'Collision custom source', 'weight_reps',
        'collision-session-exercise', 1
      );
    `);
    await raw.query(`
      INSERT INTO set_logs (
        id, owner_firebase_uid, session_id, snapshot_id, set_position,
        measurement_kind, set_kind, weight_kg, repetitions,
        client_idempotency_key, recorded_at
      ) VALUES (
        '${customSetLogId}', 'alice', '${customSessionId}', '${customSnapshotId}', 1,
        'weight_reps', 'work', 100, 10, 'collision-session-set',
        '2026-08-26T23:30:00.000Z'
      );
    `);
    await raw.query(`
      UPDATE workout_sessions
      SET state = 'completed', completed_at = '2026-08-26T23:45:00.000Z'
      WHERE owner_firebase_uid = 'alice' AND id = '${customSessionId}';
    `);
    await raw.query(`
      INSERT INTO personal_records (
        owner_firebase_uid, custom_exercise_id, type, value,
        source_set_log_id, calculation_version, achieved_at
      ) VALUES
        ('alice', '${catalogExerciseId}', 'max_weight', 100, '${customSetLogId}', 'v1', '2026-08-26T23:30:00.000Z'),
        ('alice', '${corruptCustomId}', 'max_weight', 1000, '${catalogSourceSetLogId}', 'v1', '2026-08-25T23:30:00.000Z');
    `);

    const records = (await loadPersonalRecords(database, viewer("alice")))
      .filter(({ type }) => type === "max_weight");
    expect(records).toHaveLength(2);
    expect(records.map(({ value }) => value).sort((left, right) => left - right)).toEqual([45, 100]);
    expect(records).toEqual(expect.arrayContaining([
      expect.objectContaining({
        exerciseName: "Collision custom source",
        sourceSessionIds: [customSessionId],
        value: 100,
      }),
    ]));
  });

  it("rejects malformed cursors and absent viewers before returning data", async () => {
    const { database } = await openDatabase();
    await expect(loadTrainingHistory(database, viewer("alice"), { cursor: "not-a-cursor" }))
      .rejects.toMatchObject({ code: "invalid_request" });
    await expect(loadTrainingHistory(database, null)).rejects.toMatchObject({ code: "unauthenticated" });
  });
});
