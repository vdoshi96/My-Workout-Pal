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
  catalogAliasExerciseA: "00000000-0000-4000-8000-000000000014",
  catalogAliasExerciseB: "00000000-0000-4000-8000-000000000015",
  aliceSecondProgram: "00000000-0000-4000-8000-000000000016",
  aliceSecondRevision: "00000000-0000-4000-8000-000000000017",
  bobCustomExercise: "00000000-0000-4000-8000-000000000018",
  volumeSetLog: "00000000-0000-4000-8000-000000000019",
  aliceProgramDay: "00000000-0000-4000-8000-000000000024",
  aliceProgramSection: "00000000-0000-4000-8000-000000000025",
  aliceAbandonedSession: "00000000-0000-4000-8000-000000000026",
  aliceAbandonedSnapshot: "00000000-0000-4000-8000-000000000027",
  terminalSetLog: "00000000-0000-4000-8000-000000000028",
  terminalCardioLog: "00000000-0000-4000-8000-000000000029",
  terminalSnapshot: "00000000-0000-4000-8000-000000000030",
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
    VALUES ('${programId}', '${ownerFirebaseUid}', '${ownerFirebaseUid}-${programId}', 'Starter');
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
        "custom_exercise_aliases",
        "custom_exercise_equipment",
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
        ) VALUES ('bob', '${ids.aliceCustomExercise}', 'abc123XYZ_1', 1);
      `),
    ).rejects.toThrow(/custom_exercise_videos_owner_exercise_fk|foreign key|violates/i);
  });

  it("keeps custom equipment and search aliases owner-scoped", async () => {
    const database = await openDatabase();
    await seedOwner(database, "alice");
    await seedOwner(database, "bob");
    await database.exec(`
      INSERT INTO catalog_equipment (id, label)
      VALUES ('dumbbells', 'Dumbbells');
      INSERT INTO custom_exercises (
        id, owner_firebase_uid, exercise_key, name, logging_kind
      ) VALUES
        ('${ids.aliceCustomExercise}', 'alice', 'alice-row', 'Alice row', 'weight_reps'),
        ('${ids.bobCustomExercise}', 'bob', 'bob-row', 'Bob row', 'weight_reps');
      INSERT INTO custom_exercise_equipment (
        owner_firebase_uid, custom_exercise_id, equipment_id
      ) VALUES ('alice', '${ids.aliceCustomExercise}', 'dumbbells');
      INSERT INTO custom_exercise_aliases (
        owner_firebase_uid, custom_exercise_id, alias, normalized_alias
      ) VALUES ('alice', '${ids.aliceCustomExercise}', 'My Row', 'my row');
      INSERT INTO custom_exercise_aliases (
        owner_firebase_uid, custom_exercise_id, alias, normalized_alias
      ) VALUES ('bob', '${ids.bobCustomExercise}', 'My Row', 'my row');
    `);

    await expect(
      database.exec(`
        INSERT INTO custom_exercise_equipment (
          owner_firebase_uid, custom_exercise_id, equipment_id
        ) VALUES ('bob', '${ids.aliceCustomExercise}', 'dumbbells');
      `),
    ).rejects.toThrow(/custom_exercise_equipment_owner_exercise_fk|foreign key|violates/i);

    await expect(
      database.exec(`
        INSERT INTO custom_exercise_aliases (
          owner_firebase_uid, custom_exercise_id, alias, normalized_alias
        ) VALUES ('alice', '${ids.aliceCustomExercise}', 'MY ROW', 'my row');
      `),
    ).rejects.toThrow(/custom_exercise_aliases_owner_normalized_unique|unique|duplicate/i);

    await expect(
      database.exec(`
        INSERT INTO custom_exercise_aliases (
          owner_firebase_uid, custom_exercise_id, alias, normalized_alias
        ) VALUES ('alice', '${ids.aliceCustomExercise}', 'Another Row', 'Another Row');
      `),
    ).rejects.toThrow(/custom_exercise_aliases_normalized_form|check|violates/i);
  });

  it("allows a catalog alias across exercises but rejects a duplicate per exercise", async () => {
    const database = await openDatabase();
    await database.exec(`
      INSERT INTO catalog_exercises (id, slug, name, role, logging_kind)
      VALUES
        ('${ids.catalogAliasExerciseA}', 'alias-a', 'Alias A', 'compound', 'weight_reps'),
        ('${ids.catalogAliasExerciseB}', 'alias-b', 'Alias B', 'compound', 'weight_reps');
      INSERT INTO exercise_aliases (exercise_id, alias, normalized_alias)
      VALUES
        ('${ids.catalogAliasExerciseA}', 'RDL', 'rdl'),
        ('${ids.catalogAliasExerciseB}', 'RDL', 'rdl');
    `);

    await expect(
      database.exec(`
        INSERT INTO exercise_aliases (exercise_id, alias, normalized_alias)
        VALUES ('${ids.catalogAliasExerciseA}', 'Romanian deadlift', 'rdl');
      `),
    ).rejects.toThrow(/exercise_aliases_exercise_normalized_unique|unique|duplicate/i);
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

    await expect(
      database.exec(`
        INSERT INTO set_logs (
          id, owner_firebase_uid, session_id, snapshot_id, set_position,
          measurement_kind, set_kind, repetitions, client_idempotency_key
        ) VALUES (
          '00000000-0000-4000-8000-000000000031', 'alice', '${ids.aliceSession}',
          '${ids.aliceSnapshot}', 3, 'bodyweight_reps', 'work', 10, 'mismatched-kind'
        );
      `),
    ).rejects.toThrow(/set_logs_snapshot_scope_fk|foreign key|violates/i);
  });

  it("allows one resumable session and one idempotency result per owner key", async () => {
    const database = await openDatabase();
    await seedOwner(database, "alice");
    await seedProgram(database, "alice", ids.aliceProgram, ids.aliceRevision);
    await database.exec(`
      INSERT INTO workout_sessions (
        id, owner_firebase_uid, program_id, program_revision_id, state, started_at, idempotency_key
      ) VALUES (
        '${ids.aliceSession}', 'alice', '${ids.aliceProgram}', '${ids.aliceRevision}',
        'active', now(), 'session-create'
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

  it("scopes an active revision pointer to the same owner and program", async () => {
    const database = await openDatabase();
    await seedOwner(database, "alice");
    await seedProgram(database, "alice", ids.aliceProgram, ids.aliceRevision);
    await seedProgram(database, "alice", ids.aliceSecondProgram, ids.aliceSecondRevision);

    await expect(
      database.exec(`
        UPDATE user_programs
        SET active_revision_id = '${ids.aliceSecondRevision}'
        WHERE owner_firebase_uid = 'alice' AND id = '${ids.aliceProgram}';
      `),
    ).rejects.toThrow(/active_revision|foreign key|violates/i);

    await database.exec(`
      UPDATE user_programs
      SET active_revision_id = '${ids.aliceRevision}'
      WHERE owner_firebase_uid = 'alice' AND id = '${ids.aliceProgram}';
    `);
  });

  it("scopes a session revision to the session program", async () => {
    const database = await openDatabase();
    await seedOwner(database, "alice");
    await seedProgram(database, "alice", ids.aliceProgram, ids.aliceRevision);
    await seedProgram(database, "alice", ids.aliceSecondProgram, ids.aliceSecondRevision);

    await expect(
      database.exec(`
        INSERT INTO workout_sessions (
          id, owner_firebase_uid, program_id, program_revision_id, state, idempotency_key
        ) VALUES (
          '${ids.aliceSession}', 'alice', '${ids.aliceProgram}', '${ids.aliceSecondRevision}',
          'draft', 'mismatched-revision'
        );
      `),
    ).rejects.toThrow(/workout_sessions_revision_scope_fk|foreign key|violates/i);
  });

  it("scopes a program section to its parent day program", async () => {
    const database = await openDatabase();
    await seedOwner(database, "alice");
    await seedProgram(database, "alice", ids.aliceProgram, ids.aliceRevision);
    await seedProgram(database, "alice", ids.aliceSecondProgram, ids.aliceSecondRevision);
    await database.exec(`
      INSERT INTO program_days (
        id, owner_firebase_uid, program_id, revision_id, day_number, day_key, display_name
      ) VALUES (
        '${ids.aliceProgramDay}', 'alice', '${ids.aliceProgram}', '${ids.aliceRevision}',
        1, 'push', 'Push'
      );
    `);

    await expect(
      database.exec(`
        INSERT INTO program_sections (
          id, owner_firebase_uid, program_id, revision_id, day_id,
          kind, display_order, title
        ) VALUES (
          '${ids.aliceProgramSection}', 'alice', '${ids.aliceSecondProgram}', '${ids.aliceRevision}',
          '${ids.aliceProgramDay}', 'strength', 1, 'Mismatched program'
        );
      `),
    ).rejects.toThrow(/program_sections_day_scope_fk|foreign key|violates/i);
  });

  it("keeps terminal workout sessions terminal and timestamps truthful", async () => {
    const database = await openDatabase();
    await seedOwner(database, "alice");
    await seedProgram(database, "alice", ids.aliceProgram, ids.aliceRevision);
    await seedSession(database, "alice", ids.aliceSession);

    await expect(
      database.exec(`
        UPDATE workout_sessions
        SET state = 'completed', completed_at = now()
        WHERE id = '${ids.aliceSession}';
      `),
    ).rejects.toThrow(/timestamp|state|check|violates/i);

    await expect(
      database.exec(`
        UPDATE workout_sessions
        SET state = 'active', started_at = now(), completed_at = now()
        WHERE id = '${ids.aliceSession}';
      `),
    ).rejects.toThrow(/timestamp|state|check|violates/i);

    await database.exec(`
      UPDATE workout_sessions
      SET state = 'active', started_at = now()
      WHERE id = '${ids.aliceSession}';
      UPDATE workout_sessions
      SET state = 'completed', completed_at = now()
      WHERE id = '${ids.aliceSession}';
    `);

    await expect(
      database.exec(`
        UPDATE workout_sessions
        SET state = 'active', completed_at = null
        WHERE id = '${ids.aliceSession}';
      `),
    ).rejects.toThrow(/terminal|immutable|state|violates/i);

    await expect(
      database.exec(`
        UPDATE workout_sessions
        SET state = 'abandoned', completed_at = null, abandoned_at = now()
        WHERE id = '${ids.aliceSession}';
      `),
    ).rejects.toThrow(/terminal|immutable|state|violates/i);

    await database.exec(`
      INSERT INTO workout_sessions (
        id, owner_firebase_uid, program_id, program_revision_id,
        state, started_at, idempotency_key
      ) VALUES (
        '${ids.aliceAbandonedSession}', 'alice', '${ids.aliceProgram}', '${ids.aliceRevision}',
        'active', now(), 'abandoned-session'
      );
      UPDATE workout_sessions
      SET state = 'abandoned', abandoned_at = now()
      WHERE id = '${ids.aliceAbandonedSession}';
    `);

    await expect(
      database.exec(`
        INSERT INTO workout_exercise_snapshots (
          id, owner_firebase_uid, session_id, position, display_name, logging_kind, set_count
        ) VALUES (
          '${ids.aliceAbandonedSnapshot}', 'alice', '${ids.aliceAbandonedSession}', 1,
          'Abandoned snapshot', 'weight_reps', 1
        );
      `),
    ).rejects.toThrow(/immutable|history|completed|abandoned/i);

    await expect(
      database.exec(`
        INSERT INTO set_logs (
          id, owner_firebase_uid, session_id, snapshot_id, set_position,
          measurement_kind, set_kind, weight_kg, repetitions, client_idempotency_key
        ) VALUES (
          '${ids.terminalSetLog}', 'alice', '${ids.aliceAbandonedSession}', '${ids.aliceAbandonedSnapshot}',
          1, 'weight_reps', 'work', 20, 10, 'abandoned-set'
        );
      `),
    ).rejects.toThrow(/immutable|history|completed|abandoned/i);

    await expect(
      database.exec(`
        INSERT INTO cardio_logs (
          id, owner_firebase_uid, session_id, mode, duration_seconds,
          distance_m, client_idempotency_key
        ) VALUES (
          '${ids.terminalCardioLog}', 'alice', '${ids.aliceAbandonedSession}', 'runner',
          600, 1000, 'abandoned-cardio'
        );
      `),
    ).rejects.toThrow(/immutable|history|completed|abandoned/i);

    await expect(
      database.exec(`
        UPDATE workout_sessions
        SET state = 'completed', abandoned_at = null, completed_at = now()
        WHERE id = '${ids.aliceAbandonedSession}';
      `),
    ).rejects.toThrow(/terminal|immutable|state|violates/i);
  });

  it("stores volume as a personal-record type", async () => {
    const database = await openDatabase();
    await seedOwner(database, "alice");
    await seedProgram(database, "alice", ids.aliceProgram, ids.aliceRevision);
    await seedSession(database, "alice", ids.aliceSession);
    await database.exec(`
      INSERT INTO catalog_exercises (
        id, slug, name, role, logging_kind
      ) VALUES (
        '${ids.catalogExercise}', 'volume-test', 'Volume test', 'compound', 'weight_reps'
      );
      INSERT INTO set_logs (
        id, owner_firebase_uid, session_id, snapshot_id, set_position,
        measurement_kind, set_kind, weight_kg, repetitions, client_idempotency_key
      ) VALUES (
        '${ids.volumeSetLog}', 'alice', '${ids.aliceSession}', '${ids.aliceSnapshot}',
        1, 'weight_reps', 'work', 20, 10, 'volume-source'
      );
      INSERT INTO personal_records (
        owner_firebase_uid, catalog_exercise_id, type, value,
        source_set_log_id, calculation_version, achieved_at
      ) VALUES (
        'alice', '${ids.catalogExercise}', 'volume', 200,
        '${ids.volumeSetLog}', 'v1', now()
      );
    `);

    const result = await database.query<{ type: string }>(`
      SELECT type FROM personal_records
      WHERE owner_firebase_uid = 'alice' AND source_set_log_id = '${ids.volumeSetLog}';
    `);
    expect(result.rows).toEqual([{ type: "volume" }]);
  });

  it("does not move a template child into a published revision", async () => {
    const database = await openDatabase();
    await database.exec(`
      INSERT INTO program_templates (id, template_key, name)
      VALUES ('00000000-0000-4000-8000-000000000020', 'starter', 'Starter');
      INSERT INTO program_template_revisions (
        id, template_id, revision_number, status, published_at
      ) VALUES
        ('00000000-0000-4000-8000-000000000021', '00000000-0000-4000-8000-000000000020', 1, 'draft', null),
        ('00000000-0000-4000-8000-000000000022', '00000000-0000-4000-8000-000000000020', 2, 'published', now());
      INSERT INTO template_days (
        id, revision_id, day_number, day_key, display_name
      ) VALUES (
        '00000000-0000-4000-8000-000000000023',
        '00000000-0000-4000-8000-000000000021',
        1, 'push', 'Push'
      );
    `);

    await expect(
      database.exec(`
        UPDATE template_days
        SET revision_id = '00000000-0000-4000-8000-000000000022'
        WHERE id = '00000000-0000-4000-8000-000000000023';
      `),
    ).rejects.toThrow(/immutable|published|revision/i);

    await expect(
      database.exec(`
        INSERT INTO template_days (
          id, revision_id, day_number, day_key, display_name
        ) VALUES (
          '00000000-0000-4000-8000-000000000024',
          '00000000-0000-4000-8000-000000000022',
          2, 'pull', 'Pull'
        );
      `),
    ).rejects.toThrow(/immutable|published|revision/i);
  });

  it("protects published revisions and accepted workout history from mutation", async () => {
    const database = await openDatabase();
    await seedOwner(database, "alice");
    await seedProgram(database, "alice", ids.aliceProgram, ids.aliceRevision);
    await seedSession(database, "alice", ids.aliceSession);
    await database.exec(`
      UPDATE workout_sessions
      SET state = 'active', started_at = now()
      WHERE id = '${ids.aliceSession}';

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

    await database.exec(`
      UPDATE set_logs
      SET weight_kg = 25
      WHERE owner_firebase_uid = 'alice' AND client_idempotency_key = 'set-1';
      DELETE FROM cardio_logs WHERE id = '${ids.aliceCardioLog}';
      INSERT INTO cardio_logs (
        id, owner_firebase_uid, session_id, mode, duration_seconds,
        distance_m, client_idempotency_key
      ) VALUES (
        '${ids.aliceCardioLog}', 'alice', '${ids.aliceSession}', 'runner', 720, 1200, 'cardio-2'
      );
      UPDATE workout_sessions
      SET state = 'completed', completed_at = now()
      WHERE id = '${ids.aliceSession}';
    `);

    await expect(
      database.exec(`UPDATE program_revisions SET revision_number = 2 WHERE id = '${ids.aliceRevision}';`),
    ).rejects.toThrow(/immutable|published|revision/i);

    await expect(
      database.exec(`
        INSERT INTO program_days (
          id, owner_firebase_uid, program_id, revision_id, day_number, day_key, display_name
        ) VALUES (
          '${ids.aliceProgramDay}', 'alice', '${ids.aliceProgram}', '${ids.aliceRevision}',
          1, 'push', 'Push'
        );
      `),
    ).rejects.toThrow(/immutable|published|revision/i);

    await expect(
      database.exec(`UPDATE workout_exercise_snapshots SET display_name = 'Changed' WHERE id = '${ids.aliceSnapshot}';`),
    ).rejects.toThrow(/immutable|append-only|history/i);

    await expect(
      database.exec(`UPDATE set_logs SET weight_kg = 30 WHERE owner_firebase_uid = 'alice' AND client_idempotency_key = 'set-1';`),
    ).rejects.toThrow(/immutable|append-only|history/i);

    await expect(
      database.exec(`DELETE FROM cardio_logs WHERE id = '${ids.aliceCardioLog}';`),
    ).rejects.toThrow(/immutable|append-only|history/i);

    await expect(
      database.exec(`
        INSERT INTO workout_exercise_snapshots (
          id, owner_firebase_uid, session_id, position, display_name, logging_kind, set_count
        ) VALUES (
          '${ids.terminalSnapshot}', 'alice', '${ids.aliceSession}', 2,
          'Post-terminal snapshot', 'weight_reps', 1
        );
      `),
    ).rejects.toThrow(/immutable|history|completed|abandoned/i);

    await expect(
      database.exec(`
        INSERT INTO set_logs (
          id, owner_firebase_uid, session_id, snapshot_id, set_position,
          measurement_kind, set_kind, weight_kg, repetitions, client_idempotency_key
        ) VALUES (
          '${ids.terminalSetLog}', 'alice', '${ids.aliceSession}', '${ids.aliceSnapshot}',
          2, 'weight_reps', 'work', 20, 10, 'post-terminal-set'
        );
      `),
    ).rejects.toThrow(/immutable|history|completed|abandoned/i);

    await expect(
      database.exec(`
        INSERT INTO cardio_logs (
          id, owner_firebase_uid, session_id, mode, duration_seconds,
          distance_m, client_idempotency_key
        ) VALUES (
          '${ids.terminalCardioLog}', 'alice', '${ids.aliceSession}', 'runner',
          600, 1000, 'post-terminal-cardio'
        );
      `),
    ).rejects.toThrow(/immutable|history|completed|abandoned/i);
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
