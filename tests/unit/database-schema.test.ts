import { readFile } from "node:fs/promises";

import { PGlite } from "@electric-sql/pglite";
import { afterEach, describe, expect, it } from "vitest";

const migrationUrl = new URL("../../drizzle/0000_initial.sql", import.meta.url);

const ids = {
  aliceProgram: "00000000-0000-4000-8000-000000000001",
  aliceRevision: "00000000-0000-4000-8000-000000000002",
  aliceSession: "00000000-0000-4000-8000-000000000003",
  aliceSnapshot: "00000000-0000-4000-8000-000000000004",
  aliceCustomExercise: "00000000-0000-4000-8000-000000000005",
  bobProgram: "00000000-0000-4000-8000-000000000006",
  bobRevision: "00000000-0000-4000-8000-000000000007",
  bobSession: "00000000-0000-4000-8000-000000000008",
  catalogExercise: "00000000-0000-4000-8000-000000000009",
  aliceCardioLog: "00000000-0000-4000-8000-000000000010",
} as const;

const openDatabases: PGlite[] = [];

async function openDatabase() {
  const database = new PGlite();
  await database.waitReady;
  const migration = await readFile(migrationUrl, "utf8");
  await database.exec(migration);
  openDatabases.push(database);
  return database;
}

async function seedOwner(database: PGlite, firebaseUid: string) {
  await database.exec(`
    INSERT INTO user_profiles (firebase_uid, display_name)
    VALUES ('${firebaseUid}', '${firebaseUid}');
  `);
}

async function seedProgram(
  database: PGlite,
  ownerFirebaseUid: string,
  programId: string,
  revisionId: string,
) {
  await database.exec(`
    INSERT INTO user_programs (id, owner_firebase_uid, program_key, name)
    VALUES ('${programId}', '${ownerFirebaseUid}', '${ownerFirebaseUid}-program', 'Starter');
    INSERT INTO program_revisions (
      id, owner_firebase_uid, program_id, revision_number, status, equipment_profile_kind
    ) VALUES (
      '${revisionId}', '${ownerFirebaseUid}', '${programId}', 1, 'draft', 'dumbbells'
    );
  `);
}

async function seedSession(database: PGlite, ownerFirebaseUid: string, sessionId: string) {
  await database.exec(`
    INSERT INTO workout_sessions (
      id, owner_firebase_uid, program_id, program_revision_id, state, idempotency_key
    ) VALUES (
      '${sessionId}', '${ownerFirebaseUid}', '${ownerFirebaseUid === "alice" ? ids.aliceProgram : ids.bobProgram}',
      '${ownerFirebaseUid === "alice" ? ids.aliceRevision : ids.bobRevision}', 'draft', '${sessionId}-create'
    );
    INSERT INTO workout_exercise_snapshots (
      id, owner_firebase_uid, session_id, position, display_name, logging_kind,
      minimum_reps, maximum_reps, set_count
    ) VALUES (
      '${ownerFirebaseUid === "alice" ? ids.aliceSnapshot : "00000000-0000-4000-8000-000000000011"}',
      '${ownerFirebaseUid}', '${sessionId}', 1, 'Dumbbell bench press', 'weight_reps', 8, 12, 3
    );
  `);
}

afterEach(async () => {
  await Promise.all(openDatabases.splice(0).map((database) => database.close()));
});

describe("initial database migration", () => {
  it("builds the complete bounded persistence surface from an empty database", async () => {
    const database = await openDatabase();
    const result = await database.query<{ table_name: string }>(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    expect(result.rows.map((row) => row.table_name)).toEqual(
      expect.arrayContaining([
        "account_deletion_jobs",
        "catalog_equipment",
        "catalog_exercises",
        "cardio_logs",
        "curated_videos",
        "custom_exercise_videos",
        "custom_exercises",
        "exercise_aliases",
        "exercise_equipment",
        "idempotency_keys",
        "personal_records",
        "program_days",
        "program_prescriptions",
        "program_revisions",
        "program_sections",
        "progress_summary_sources",
        "progress_summaries",
        "set_logs",
        "template_days",
        "template_prescriptions",
        "template_sections",
        "user_equipment_profiles",
        "user_preferences",
        "user_profiles",
        "user_programs",
        "workout_exercise_snapshots",
        "workout_sessions",
      ]),
    );
  });

  it("uses composite ownership keys to reject a cross-user child row", async () => {
    const database = await openDatabase();
    await seedOwner(database, "alice");
    await seedOwner(database, "bob");
    await database.exec(`
      INSERT INTO custom_exercises (
        id, owner_firebase_uid, exercise_key, name, logging_kind
      ) VALUES (
        '${ids.aliceCustomExercise}', 'alice', 'alice-row', 'Alice row', 'weight_reps'
      );
    `);

    await expect(
      database.exec(`
        INSERT INTO custom_exercise_videos (
          owner_firebase_uid, custom_exercise_id, youtube_video_id, display_order
        ) VALUES ('bob', '${ids.aliceCustomExercise}', 'abc123', 1);
      `),
    ).rejects.toThrow(/foreign key|violates/i);
  });

  it("rejects non-canonical measurements and wrong measurement-kind fields", async () => {
    const database = await openDatabase();
    await seedOwner(database, "alice");
    await seedProgram(database, "alice", ids.aliceProgram, ids.aliceRevision);
    await seedSession(database, "alice", ids.aliceSession);

    await expect(
      database.exec(`
        INSERT INTO set_logs (
          id, owner_firebase_uid, session_id, snapshot_id, set_position,
          measurement_kind, set_kind, weight_kg, repetitions, client_idempotency_key
        ) VALUES (
          '00000000-0000-4000-8000-000000000012', 'alice', '${ids.aliceSession}',
          '${ids.aliceSnapshot}', 1, 'weight_reps', 'work', -1, 10, 'negative-weight'
        );
      `),
    ).rejects.toThrow(/check|violates/i);

    await expect(
      database.exec(`
        INSERT INTO set_logs (
          id, owner_firebase_uid, session_id, snapshot_id, set_position,
          measurement_kind, set_kind, weight_kg, duration_seconds, client_idempotency_key
        ) VALUES (
          '00000000-0000-4000-8000-000000000013', 'alice', '${ids.aliceSession}',
          '${ids.aliceSnapshot}', 2, 'weight_reps', 'work', 10, 30, 'wrong-fields'
        );
      `),
    ).rejects.toThrow(/check|violates/i);
  });

  it("allows one resumable session and one idempotency result per owner key", async () => {
    const database = await openDatabase();
    await seedOwner(database, "alice");
    await seedProgram(database, "alice", ids.aliceProgram, ids.aliceRevision);
    await database.exec(`
      INSERT INTO workout_sessions (
        id, owner_firebase_uid, program_id, program_revision_id, state, idempotency_key
      ) VALUES (
        '${ids.aliceSession}', 'alice', '${ids.aliceProgram}', '${ids.aliceRevision}',
        'active', 'session-create'
      );
    `);

    await expect(
      database.exec(`
        INSERT INTO workout_sessions (
          id, owner_firebase_uid, program_id, program_revision_id, state, idempotency_key
        ) VALUES (
          '00000000-0000-4000-8000-000000000014', 'alice', '${ids.aliceProgram}',
          '${ids.aliceRevision}', 'draft', 'session-create-2'
        );
      `),
    ).rejects.toThrow(/unique|duplicate/i);

    await database.exec(`
      INSERT INTO idempotency_keys (
        owner_firebase_uid, idempotency_key, operation, result_payload
      ) VALUES ('alice', 'mutation-1', 'program.update', '{}');
    `);

    await expect(
      database.exec(`
        INSERT INTO idempotency_keys (
          owner_firebase_uid, idempotency_key, operation, result_payload
        ) VALUES ('alice', 'mutation-1', 'program.update', '{}');
      `),
    ).rejects.toThrow(/unique|duplicate/i);
  });

  it("protects published revisions and accepted workout history from mutation", async () => {
    const database = await openDatabase();
    await seedOwner(database, "alice");
    await seedProgram(database, "alice", ids.aliceProgram, ids.aliceRevision);
    await seedSession(database, "alice", ids.aliceSession);
    await database.exec(`
      UPDATE program_revisions
      SET status = 'published', published_at = now()
      WHERE id = '${ids.aliceRevision}';

      INSERT INTO set_logs (
        id, owner_firebase_uid, session_id, snapshot_id, set_position,
        measurement_kind, set_kind, weight_kg, repetitions, client_idempotency_key
      ) VALUES (
        '00000000-0000-4000-8000-000000000015', 'alice', '${ids.aliceSession}',
        '${ids.aliceSnapshot}', 1, 'weight_reps', 'work', 20, 10, 'set-1'
      );

      INSERT INTO cardio_logs (
        id, owner_firebase_uid, session_id, mode, duration_seconds,
        distance_m, client_idempotency_key
      ) VALUES (
        '${ids.aliceCardioLog}', 'alice', '${ids.aliceSession}', 'walker', 600, 1000, 'cardio-1'
      );
    `);

    await expect(
      database.exec(`UPDATE program_revisions SET revision_number = 2 WHERE id = '${ids.aliceRevision}';`),
    ).rejects.toThrow(/immutable|published|revision/i);

    await expect(
      database.exec(`UPDATE workout_exercise_snapshots SET display_name = 'Changed' WHERE id = '${ids.aliceSnapshot}';`),
    ).rejects.toThrow(/immutable|append-only|history/i);

    await expect(
      database.exec(`UPDATE set_logs SET weight_kg = 25 WHERE owner_firebase_uid = 'alice' AND client_idempotency_key = 'set-1';`),
    ).rejects.toThrow(/immutable|append-only|history/i);

    await expect(
      database.exec(`DELETE FROM cardio_logs WHERE id = '${ids.aliceCardioLog}';`),
    ).rejects.toThrow(/immutable|append-only|history/i);
  });

  it("keeps Drizzle configuration and the live connector import-safe without credentials", async () => {
    const previousDatabaseUrl = process.env["DATABASE_URL"];
    delete process.env["DATABASE_URL"];

    try {
      const configModule = await import("../../drizzle.config");
      expect(
        "dbCredentials" in configModule.default ? configModule.default.dbCredentials : undefined,
      ).toBeUndefined();

      const clientModule = await import("../../src/db/client");
      expect(() => clientModule.createDatabase()).toThrow(/DATABASE_URL/);
    } finally {
      if (previousDatabaseUrl === undefined) delete process.env["DATABASE_URL"];
      else process.env["DATABASE_URL"] = previousDatabaseUrl;
    }
  });
});
