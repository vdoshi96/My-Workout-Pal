import { readFile } from "node:fs/promises";

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterEach, describe, expect, it } from "vitest";

import type { Database } from "@/db/client";
import { schema } from "@/db/schema";
import { seedStarterDatabase } from "@/db/starter-seed";
import { createCustomExercise } from "@/server/repositories/custom-exercises";
import {
  AccountDeletionRepositoryError,
  beginAccountDeletion,
  completeAccountDeletion,
  recordAccountDeletionFailure,
} from "@/server/repositories/account-deletion";
import { rebuildPersonalRecordProjections } from "@/server/repositories/workout-repository";
import { createProfileProgramRepository } from "@/server/repositories/profile-program";
import type { ViewerContext } from "@/server/auth/viewer";

const initialMigrationUrl = new URL("../../drizzle/0000_initial.sql", import.meta.url);
const deletionMigrationUrl = new URL(
  "../../drizzle/0001_account_deletion_saga.sql",
  import.meta.url,
);
const workoutMigrationUrl = new URL(
  "../../drizzle/0002_workout_canonical_measurements.sql",
  import.meta.url,
);
const programCollectionMigrationUrl = new URL(
  "../../drizzle/0003_program_collection.sql",
  import.meta.url,
);
const projectionCheckpointMigrationUrl = new URL(
  "../../drizzle/0004_personal_record_projection_checkpoint.sql",
  import.meta.url,
);
const openDatabases: PGlite[] = [];
const now = new Date("2026-08-25T20:00:00.000Z");
const nowSeconds = Math.floor(now.getTime() / 1_000);

function viewer(uid: string, overrides: Partial<ViewerContext> = {}): ViewerContext {
  return {
    authTimeSeconds: nowSeconds,
    displayName: uid,
    eligibleForPermanentMutations: true,
    email: `${uid}@example.test`,
    emailVerified: true,
    provider: "password",
    uid,
    ...overrides,
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

const customDraft = {
  aliases: ["Owner movement"],
  equipmentIds: ["dumbbells"],
  instructions: "Owner-only notes.",
  loggingKind: "weight_reps",
  name: "Private owner row",
  videoUrls: ["https://youtu.be/abc123XYZ_1"],
} as const;

async function seedOwnedGraph(database: Database, raw: PGlite, uid: string): Promise<void> {
  const owner = viewer(uid);
  const profile = await createProfileProgramRepository(database).onboard(owner, {
    equipmentProfileKind: "dumbbells",
  });
  const program = profile.activeProgram;
  if (!program) throw new Error("fixture program missing");
  await createCustomExercise(database, owner, {
    draft: { ...customDraft, name: `${uid} private row` },
    idempotencyKey: `${uid}-custom-create`,
  });
  const catalogExerciseId = program.days[0]!.prescriptions[0]!.catalogExerciseId;
  if (!catalogExerciseId) throw new Error("fixture exercise missing");
  const sessionId = uid === "alice"
    ? "10000000-0000-4000-8000-000000000001"
    : "20000000-0000-4000-8000-000000000001";
  const snapshotId = uid === "alice"
    ? "10000000-0000-4000-8000-000000000002"
    : "20000000-0000-4000-8000-000000000002";
  const setLogId = uid === "alice"
    ? "10000000-0000-4000-8000-000000000003"
    : "20000000-0000-4000-8000-000000000003";
  const cardioLogId = uid === "alice"
    ? "10000000-0000-4000-8000-000000000004"
    : "20000000-0000-4000-8000-000000000004";
  const summaryId = uid === "alice"
    ? "10000000-0000-4000-8000-000000000005"
    : "20000000-0000-4000-8000-000000000005";
  await raw.query(`
    INSERT INTO workout_sessions (
      id, owner_firebase_uid, program_id, program_revision_id, state,
      idempotency_key, started_at
    ) VALUES ($1, $2, $3, $4, 'active', $5, $6);
  `, [sessionId, uid, program.id, program.revisionId, `${uid}-session-start`, now]);
  await raw.query(`
    INSERT INTO workout_exercise_snapshots (
      id, owner_firebase_uid, session_id, position, section_kind, display_name,
      logging_kind, catalog_exercise_id, minimum_reps, maximum_reps, set_count,
      rest_seconds, prescription_snapshot
    ) VALUES ($1, $2, $3, 1, 'strength', 'Fixture press', 'weight_reps', $4, 8, 12, 1, 90, '{}');
  `, [snapshotId, uid, sessionId, catalogExerciseId]);
  await raw.query(`
    INSERT INTO workout_exercise_states (
      owner_firebase_uid, session_id, snapshot_id, status,
      effective_catalog_exercise_id, effective_display_name, effective_logging_kind,
      last_client_operation_id, version
    ) VALUES ($1, $2, $3, 'completed', $4, 'Fixture press', 'weight_reps', $5, 1);
  `, [uid, sessionId, snapshotId, catalogExerciseId, `${uid}-exercise-complete`]);
  await raw.query(`
    INSERT INTO set_logs (
      id, owner_firebase_uid, session_id, snapshot_id, set_position,
      measurement_kind, set_kind, weight_kg, repetitions, client_idempotency_key
    ) VALUES ($1, $2, $3, $4, 1, 'weight_reps', 'work', 20, 12, $5);
  `, [setLogId, uid, sessionId, snapshotId, `${uid}-set-save`]);
  await raw.query(`
    INSERT INTO cardio_logs (
      id, owner_firebase_uid, session_id, mode, duration_seconds,
      client_idempotency_key
    ) VALUES ($1, $2, $3, 'walker', 600, $4);
  `, [cardioLogId, uid, sessionId, `${uid}-cardio-save`]);
  await raw.query(`
    INSERT INTO personal_records (
      owner_firebase_uid, catalog_exercise_id, type, value,
      source_set_log_id, calculation_version, achieved_at
    ) VALUES ($1, $2, 'max_weight', 20, $3, 'v1', $4);
  `, [uid, catalogExerciseId, setLogId, now]);
  await raw.query(`
    INSERT INTO progress_summaries (
      id, owner_firebase_uid, summary_kind, period_start, period_end,
      catalog_exercise_id, calculation_version
    ) VALUES ($1, $2, 'daily', '2026-08-25', '2026-08-25', $3, 'v1');
  `, [summaryId, uid, catalogExerciseId]);
  await raw.query(`
    INSERT INTO progress_summary_sources (
      owner_firebase_uid, summary_id, source_kind, set_log_id
    ) VALUES ($1, $2, 'set', $3);
  `, [uid, summaryId, setLogId]);
  await raw.query(`
    INSERT INTO progress_summary_sources (
      owner_firebase_uid, summary_id, source_kind, cardio_log_id
    ) VALUES ($1, $2, 'cardio', $3);
  `, [uid, summaryId, cardioLogId]);
  await raw.query(`
    INSERT INTO idempotency_keys (
      owner_firebase_uid, session_id, idempotency_key, operation, result_payload
    ) VALUES ($1, $2, $3, 'fixture', '{}');
  `, [uid, sessionId, `${uid}-fixture-operation`]);
}

async function ownerCounts(raw: PGlite, uid: string): Promise<Record<string, number>> {
  const tables = [
    "user_profiles",
    "user_preferences",
    "user_equipment_profiles",
    "user_programs",
    "program_revisions",
    "program_days",
    "program_sections",
    "program_prescriptions",
    "program_cardio_prescriptions",
    "custom_exercises",
    "custom_exercise_videos",
    "custom_exercise_equipment",
    "custom_exercise_aliases",
    "workout_sessions",
    "workout_exercise_snapshots",
    "workout_exercise_states",
    "set_logs",
    "cardio_logs",
    "idempotency_keys",
    "personal_records",
    "progress_summaries",
    "progress_summary_sources",
  ];
  const counts: Record<string, number> = {};
  for (const table of tables) {
    const ownerColumn = table === "user_profiles" ? "firebase_uid" : "owner_firebase_uid";
    const result = await raw.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM ${table} WHERE ${ownerColumn} = $1`,
      [uid],
    );
    counts[table] = result.rows[0]!.count;
  }
  return counts;
}

afterEach(async () => {
  await Promise.all(openDatabases.splice(0).map((database) => database.close()));
});

describe("account deletion repository", () => {
  it("keeps the resumable projection cursor free of deleted owner identifiers", async () => {
    const { database, raw } = await openDatabase();
    await seedOwnedGraph(database, raw, "alice");
    await raw.query(`
      INSERT INTO personal_record_projection_checkpoints (
        calculation_version, status, last_session_id, sessions_scanned, candidate_count, changed_count
      ) VALUES (
        'v2', 'running', '10000000-0000-4000-8000-000000000001', 1, 4, 4
      );
    `);
    await beginAccountDeletion(
      database,
      viewer("alice"),
      { confirmation: "DELETE", idempotencyKey: "alice-projection-delete" },
      now,
    );
    const checkpoint = await raw.query<Record<string, unknown>>(`
      SELECT row_to_json(personal_record_projection_checkpoints) AS checkpoint
      FROM personal_record_projection_checkpoints;
    `);
    expect(JSON.stringify(checkpoint.rows)).not.toContain("alice");
    expect(checkpoint.rows).toHaveLength(1);

    const resumed = await rebuildPersonalRecordProjections(database, { apply: true, batchSize: 1 });
    expect(resumed).toMatchObject({
      completed: true,
      candidateCount: 0,
      sessionsScanned: 0,
      totalCandidateCount: 4,
      totalSessionsScanned: 1,
    });
    await expect(raw.query<{ status: string; last_session_id: string | null }>(`
      SELECT status, last_session_id
      FROM personal_record_projection_checkpoints;
    `)).resolves.toMatchObject({ rows: [{ status: "completed", last_session_id: null }] });
  });

  it("serializes simultaneous first requests into one deletion and one replay", async () => {
    const { database, raw } = await openDatabase();
    await seedOwnedGraph(database, raw, "alice");
    const input = { confirmation: "DELETE", idempotencyKey: "alice-concurrent-delete" } as const;

    const results = await Promise.all([
      beginAccountDeletion(database, viewer("alice"), input, now),
      beginAccountDeletion(database, viewer("alice"), input, now),
    ]);

    expect(results.map(({ action }) => action)).toEqual(["delete_firebase", "delete_firebase"]);
    expect(results.map(({ duplicate }) => duplicate).sort()).toEqual([false, true]);
    expect(results.map(({ job }) => job.attemptCount)).toEqual([1, 1]);
    expect(Object.values(await ownerCounts(raw, "alice")).every((count) => count === 0)).toBe(true);
  });

  it("deletes exactly one owner's graph and resumes Firebase work after the profile is gone", async () => {
    const { database, raw } = await openDatabase();
    await seedOwnedGraph(database, raw, "alice");
    await seedOwnedGraph(database, raw, "bob");
    const globalsBefore = await raw.query<{ catalog: number; templates: number }>(`
      SELECT
        (SELECT count(*)::int FROM catalog_exercises) AS catalog,
        (SELECT count(*)::int FROM program_templates) AS templates;
    `);
    await expect(raw.exec(`
      DELETE FROM workout_exercise_snapshots
      WHERE owner_firebase_uid = 'alice';
    `)).rejects.toThrow(/immutable/iu);
    await raw.exec(`SELECT set_config('my_workout_pal.account_deletion_uid', 'alice', false);`);
    await expect(raw.exec(`
      DELETE FROM workout_exercise_snapshots
      WHERE owner_firebase_uid = 'bob';
    `)).rejects.toThrow(/immutable/iu);
    await raw.exec(`RESET my_workout_pal.account_deletion_uid;`);

    const started = await beginAccountDeletion(
      database,
      viewer("alice"),
      { confirmation: "DELETE", idempotencyKey: "alice-delete" },
      now,
    );
    expect(started).toMatchObject({ action: "delete_firebase", duplicate: false });
    expect(started.job).toMatchObject({ attemptCount: 1, phase: "firebase", status: "running" });
    expect(Object.values(await ownerCounts(raw, "alice"))).toEqual(expect.arrayContaining([0]));
    expect(Object.values(await ownerCounts(raw, "alice")).every((count) => count === 0)).toBe(true);
    expect(Object.values(await ownerCounts(raw, "bob")).every((count) => count > 0)).toBe(true);
    await expect(raw.query(`
      SELECT
        (SELECT count(*)::int FROM catalog_exercises) AS catalog,
        (SELECT count(*)::int FROM program_templates) AS templates;
    `)).resolves.toMatchObject(globalsBefore);

    const duplicate = await beginAccountDeletion(
      database,
      viewer("alice"),
      { confirmation: "DELETE", idempotencyKey: "alice-retry-from-another-tab" },
      now,
    );
    expect(duplicate).toMatchObject({ action: "delete_firebase", duplicate: true });

    const failed = await recordAccountDeletionFailure(
      database,
      viewer("alice"),
      { alreadyDeleted: false, code: "firebase_unavailable", retryable: true },
      now,
    );
    expect(failed).toMatchObject({ phase: "firebase", status: "failed" });
    const resumed = await beginAccountDeletion(
      database,
      viewer("alice"),
      { confirmation: "DELETE", idempotencyKey: "alice-later-retry" },
      now,
    );
    expect(resumed.job).toMatchObject({ attemptCount: 2, phase: "firebase", status: "running" });
    const completed = await completeAccountDeletion(database, viewer("alice"), now);
    expect(completed).toMatchObject({ completedAt: now, phase: "complete", status: "completed" });
    const replay = await beginAccountDeletion(
      database,
      viewer("alice"),
      { confirmation: "DELETE", idempotencyKey: "alice-completed-replay" },
      now,
    );
    expect(replay).toMatchObject({ action: "completed", duplicate: true });
  });

  it("rolls back every deletion when a late owned-table delete fails", async () => {
    const { database, raw } = await openDatabase();
    await seedOwnedGraph(database, raw, "alice");
    const before = await ownerCounts(raw, "alice");
    await raw.exec(`
      CREATE FUNCTION reject_alice_program_delete() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'fixture late deletion failure';
        RETURN OLD;
      END;
      $$ LANGUAGE plpgsql;
      CREATE TRIGGER reject_alice_program_delete
      BEFORE DELETE ON user_programs
      FOR EACH ROW EXECUTE FUNCTION reject_alice_program_delete();
    `);

    await expect(beginAccountDeletion(
      database,
      viewer("alice"),
      { confirmation: "DELETE", idempotencyKey: "alice-delete-rollback" },
      now,
    )).rejects.toThrow(/delete from "user_programs"/iu);

    expect(await ownerCounts(raw, "alice")).toEqual(before);
    await expect(raw.query<{ count: number }>(`
      SELECT count(*)::int AS count
      FROM account_deletion_jobs
      WHERE owner_firebase_uid = 'alice';
    `)).resolves.toMatchObject({ rows: [{ count: 0 }] });
  });

  it("rejects unverified, stale, unsupported, and absent viewers before creating a job", async () => {
    const { database, raw } = await openDatabase();
    await seedOwnedGraph(database, raw, "alice");
    const input = { confirmation: "DELETE", idempotencyKey: "alice-delete-denied" } as const;

    await expect(beginAccountDeletion(database, null, input, now)).rejects.toMatchObject({ code: "unauthenticated" });
    await expect(beginAccountDeletion(
      database,
      viewer("alice", { eligibleForPermanentMutations: false, emailVerified: false }),
      input,
      now,
    )).rejects.toMatchObject({ code: "verification_required" });
    await expect(beginAccountDeletion(
      database,
      viewer("alice", { authTimeSeconds: nowSeconds - 301 }),
      input,
      now,
    )).rejects.toMatchObject({ code: "reauth_required" });
    await expect(beginAccountDeletion(
      database,
      viewer("alice", { provider: "other" }),
      input,
      now,
    )).rejects.toMatchObject({ code: "provider_unsupported" });
    expect(AccountDeletionRepositoryError).toBeTypeOf("function");
    await expect(raw.query<{ count: number }>(`
      SELECT count(*)::int AS count FROM account_deletion_jobs;
    `)).resolves.toMatchObject({ rows: [{ count: 0 }] });
  });
});
