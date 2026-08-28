import { readFile } from "node:fs/promises";

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterEach, describe, expect, it } from "vitest";

import type { Database } from "@/db/client";
import { schema } from "@/db/schema";
import { seedStarterDatabase } from "@/db/starter-seed";
import type { ViewerContext } from "@/server/auth/viewer";
import {
  beginAccountDeletion,
  completeAccountDeletionReconciliation,
  listAccountDeletionReconciliationCandidates,
  recordAccountDeletionFailure,
} from "@/server/repositories/account-deletion";
import { createProfileProgramRepository } from "@/server/repositories/profile-program";

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
const flexibleTopologyMigrationUrl = new URL(
  "../../drizzle/0005_flexible_routine_topology.sql",
  import.meta.url,
);
const personalGuidanceMigrationUrl = new URL(
  "../../drizzle/0007_personal_guidance.sql",
  import.meta.url,
);
const openDatabases: PGlite[] = [];

function viewer(uid: string, now: Date): ViewerContext {
  return {
    authTimeSeconds: Math.floor(now.getTime() / 1_000),
    displayName: uid,
    eligibleForPermanentMutations: true,
    email: `${uid}@example.test`,
    emailVerified: true,
    provider: "password",
    uid,
  };
}

async function openDatabase(): Promise<Database> {
  const raw = new PGlite();
  await raw.waitReady;
  await raw.exec(await readFile(initialMigrationUrl, "utf8"));
  await raw.exec(await readFile(deletionMigrationUrl, "utf8"));
  await raw.exec(await readFile(workoutMigrationUrl, "utf8"));
  await raw.exec(await readFile(programCollectionMigrationUrl, "utf8"));
  await raw.exec(await readFile(projectionCheckpointMigrationUrl, "utf8"));
  await raw.exec(await readFile(flexibleTopologyMigrationUrl, "utf8"));
  await raw.exec(await readFile(personalGuidanceMigrationUrl, "utf8"));
  openDatabases.push(raw);
  const database = drizzle(raw, { schema }) as unknown as Database;
  await seedStarterDatabase(database);
  return database;
}

async function beginDeletion(database: Database, uid: string, now: Date) {
  const owner = viewer(uid, now);
  await createProfileProgramRepository(database).onboard(owner, {
    equipmentProfileKind: "dumbbells",
  });
  return beginAccountDeletion(
    database,
    owner,
    { confirmation: "DELETE", idempotencyKey: `${uid}-delete` },
    now,
  );
}

afterEach(async () => {
  await Promise.all(openDatabases.splice(0).map((database) => database.close()));
});

describe("account deletion reconciliation repository", () => {
  it("lists only bounded Firebase-phase candidates and completes a failed job monotonically", async () => {
    const database = await openDatabase();
    const aliceTime = new Date("2026-08-25T20:00:00.000Z");
    const bobTime = new Date("2026-08-25T21:00:00.000Z");
    await beginDeletion(database, "alice", aliceTime);
    await recordAccountDeletionFailure(
      database,
      viewer("alice", aliceTime),
      { alreadyDeleted: false, code: "firebase_unavailable", retryable: true },
      aliceTime,
    );
    await beginDeletion(database, "bob", bobTime);

    const aliceCandidates = await listAccountDeletionReconciliationCandidates(
      database,
      { limit: 1, ownerUid: "alice" },
    );
    expect(aliceCandidates).toEqual([
      expect.objectContaining({ ownerUid: "alice", status: "failed" }),
    ]);

    const completedAt = new Date("2026-08-25T22:00:00.000Z");
    const completed = await completeAccountDeletionReconciliation(
      database,
      aliceCandidates[0]!,
      completedAt,
    );
    expect(completed).toMatchObject({
      attemptCount: 2,
      completedAt,
      phase: "complete",
      status: "completed",
    });
    await expect(
      completeAccountDeletionReconciliation(database, aliceCandidates[0]!, completedAt),
    ).resolves.toMatchObject({ status: "completed" });

    const remaining = await listAccountDeletionReconciliationCandidates(database, { limit: 20 });
    expect(remaining).toEqual([
      expect.objectContaining({ ownerUid: "bob", status: "running" }),
    ]);
  });

  it("rejects a stale candidate without changing the running job", async () => {
    const database = await openDatabase();
    const startedAt = new Date("2026-08-25T20:00:00.000Z");
    await beginDeletion(database, "alice", startedAt);
    const candidate = (
      await listAccountDeletionReconciliationCandidates(database, {
        limit: 1,
        ownerUid: "alice",
      })
    )[0]!;

    await expect(completeAccountDeletionReconciliation(
      database,
      { ...candidate, updatedAt: new Date(candidate.updatedAt.getTime() - 1) },
      new Date("2026-08-25T22:00:00.000Z"),
    )).rejects.toMatchObject({ code: "conflict" });

    await expect(
      listAccountDeletionReconciliationCandidates(database, { limit: 1, ownerUid: "alice" }),
    ).resolves.toEqual([candidate]);
  });
});
