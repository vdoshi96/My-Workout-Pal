import { readFile } from "node:fs/promises";

import { PGlite } from "@electric-sql/pglite";
import { afterEach, describe, expect, it } from "vitest";

const initialMigrationUrl = new URL("../../drizzle/0000_initial.sql", import.meta.url);
const deletionMigrationUrl = new URL(
  "../../drizzle/0001_account_deletion_saga.sql",
  import.meta.url,
);
const openDatabases: PGlite[] = [];

async function openDatabase(): Promise<PGlite> {
  const database = new PGlite();
  await database.waitReady;
  await database.exec(await readFile(initialMigrationUrl, "utf8"));
  await database.exec(await readFile(deletionMigrationUrl, "utf8"));
  openDatabases.push(database);
  return database;
}

afterEach(async () => {
  await Promise.all(openDatabases.splice(0).map((database) => database.close()));
});

describe("account deletion saga migration", () => {
  it("refuses to guess how to resume a legacy deletion job", async () => {
    const database = new PGlite();
    await database.waitReady;
    openDatabases.push(database);
    await database.exec(await readFile(initialMigrationUrl, "utf8"));
    await database.exec(`
      INSERT INTO user_profiles (firebase_uid, display_name)
      VALUES ('legacy-owner', 'Legacy owner');
      INSERT INTO account_deletion_jobs (owner_firebase_uid, status)
      VALUES ('legacy-owner', 'pending');
    `);

    await expect(
      database.exec(await readFile(deletionMigrationUrl, "utf8")),
    ).rejects.toThrow(/requires account_deletion_jobs to be empty/iu);
  });

  it("keeps the minimal job after its user profile is deleted", async () => {
    const database = await openDatabase();
    await database.exec(`
      INSERT INTO user_profiles (firebase_uid, display_name)
      VALUES ('delete-owner', 'Delete owner');
      INSERT INTO account_deletion_jobs (
        owner_firebase_uid, phase, status, attempt_count,
        idempotency_key, request_hash
      ) VALUES (
        'delete-owner', 'firebase', 'running', 1,
        'delete-owner-once', '${"a".repeat(64)}'
      );
      DELETE FROM user_profiles WHERE firebase_uid = 'delete-owner';
    `);

    const job = await database.query<{
      owner_firebase_uid: string;
      phase: string;
      status: string;
    }>(`
      SELECT owner_firebase_uid, phase, status
      FROM account_deletion_jobs
      WHERE owner_firebase_uid = 'delete-owner';
    `);
    expect(job.rows).toEqual([
      { owner_firebase_uid: "delete-owner", phase: "firebase", status: "running" },
    ]);
  });

  it("rejects blank keys, malformed hashes, and invalid completion shape", async () => {
    const database = await openDatabase();

    await expect(database.exec(`
      INSERT INTO account_deletion_jobs (
        owner_firebase_uid, phase, status, idempotency_key, request_hash
      ) VALUES ('blank-key', 'database', 'pending', ' ', '${"a".repeat(64)}');
    `)).rejects.toThrow(/account_deletion_jobs_idempotency_key_not_blank|check|violates/iu);

    await expect(database.exec(`
      INSERT INTO account_deletion_jobs (
        owner_firebase_uid, phase, status, idempotency_key, request_hash
      ) VALUES ('bad-hash', 'database', 'pending', 'delete', 'short');
    `)).rejects.toThrow(/account_deletion_jobs_request_hash_shape|check|violates/iu);

    await expect(database.exec(`
      INSERT INTO account_deletion_jobs (
        owner_firebase_uid, phase, status, idempotency_key, request_hash, completed_at
      ) VALUES (
        'bad-completion', 'firebase', 'completed', 'delete', '${"a".repeat(64)}', now()
      );
    `)).rejects.toThrow(/account_deletion_jobs_completion_shape|check|violates/iu);
  });
});
