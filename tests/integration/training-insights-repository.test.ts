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

const initialMigrationUrl = new URL("../../drizzle/0000_initial.sql", import.meta.url);
const deletionMigrationUrl = new URL("../../drizzle/0001_account_deletion_saga.sql", import.meta.url);
const workoutMigrationUrl = new URL("../../drizzle/0002_workout_canonical_measurements.sql", import.meta.url);
const programCollectionMigrationUrl = new URL("../../drizzle/0003_program_collection.sql", import.meta.url);
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
      rest_seconds, prescription_snapshot
    ) VALUES ($1, $2, $3, 1, 'strength', $4, 'weight_reps', $5, 8, 12, 1, 90, $6::jsonb);
  `, [snapshotId, input.ownerUid, input.sessionId, `${input.dayName} snapshot press`, input.catalogExerciseId, JSON.stringify({ dayName: input.dayName, schemaVersion: 1 })]);
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
      note: "Immutable note",
      status: "completed",
    });
    expect(detail.exercises[0]!.sets[0]).toMatchObject({ repetitions: 10, weightKg: 45 });
    expect(detail.cardio).toMatchObject({ notes: "Immutable cardio note" });
    await expect(
      loadTrainingSession(database, viewer("alice"), sessionIds.bob),
    ).rejects.toBeInstanceOf(TrainingInsightsRepositoryError);
  });

  it("groups tied personal records without exposing another owner's source", async () => {
    const { database, raw } = await openDatabase();
    await seedFixture(database, raw);

    const records = await loadPersonalRecords(database, viewer("alice"));
    expect(records).toEqual([
      expect.objectContaining({
        exerciseName: "Dumbbell bench press",
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
    expect(progress.totals).toMatchObject({ abandonedSessions: 1, completedSessions: 2 });
    expect(progress.series.map(({ date, sessionCount, volumeKg }) => [date, sessionCount, volumeKg])).toEqual([
      ["2026-08-24", 1, 400],
      ["2026-08-25", 1, 450],
    ]);
    expect(progress.projection).toMatchObject({ calculationVersions: ["v1"], state: "persisted" });
    expect(progress.series.every(({ sourceIds }) => sourceIds.every((id) => id.startsWith("10000000")))).toBe(true);
  });

  it("rejects malformed cursors and absent viewers before returning data", async () => {
    const { database } = await openDatabase();
    await expect(loadTrainingHistory(database, viewer("alice"), { cursor: "not-a-cursor" }))
      .rejects.toMatchObject({ code: "invalid_request" });
    await expect(loadTrainingHistory(database, null)).rejects.toMatchObject({ code: "unauthenticated" });
  });
});
