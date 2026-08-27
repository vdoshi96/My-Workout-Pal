import { readFile } from "node:fs/promises";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";

import type { Database } from "@/db/client";
import { schema } from "@/db/schema";
import { seedStarterDatabase } from "@/db/starter-seed";

type HarnessDatabase = Readonly<{
  database: Database;
  raw: PGlite;
}>;

const migrationNames = [
  "0000_initial.sql",
  "0001_account_deletion_saga.sql",
  "0002_workout_canonical_measurements.sql",
  "0003_program_collection.sql",
  "0004_personal_record_projection_checkpoint.sql",
  "0005_flexible_routine_topology.sql",
] as const;

const databasePromises = new Map<string, Promise<HarnessDatabase>>();

async function openHarnessDatabase(): Promise<HarnessDatabase> {
  const repositoryRoot = process.env["MWP_AUTH_HARNESS_REPOSITORY_ROOT"];
  if (!repositoryRoot || !path.isAbsolute(repositoryRoot)) {
    throw new Error("The authenticated harness repository root is unavailable.");
  }
  const drizzleRoot = path.join(repositoryRoot, "drizzle");
  const raw = new PGlite();
  await raw.waitReady;
  for (const migrationName of migrationNames) {
    const migrationPath = path.join(drizzleRoot, migrationName);
    if (path.dirname(migrationPath) !== drizzleRoot) {
      throw new Error("The authenticated harness migration path is invalid.");
    }
    await raw.exec(await readFile(migrationPath, "utf8"));
  }
  const database = drizzle(raw, { schema }) as unknown as Database;
  await seedStarterDatabase(database);
  return { database, raw };
}

export function getHarnessDatabase(scope: string): Promise<HarnessDatabase> {
  const existing = databasePromises.get(scope);
  if (existing) return existing;
  const opened = openHarnessDatabase();
  databasePromises.set(scope, opened);
  return opened;
}

export async function closeHarnessDatabase(scope: string): Promise<void> {
  const existing = databasePromises.get(scope);
  databasePromises.delete(scope);
  if (!existing) return;
  const { raw } = await existing;
  await raw.close();
}
