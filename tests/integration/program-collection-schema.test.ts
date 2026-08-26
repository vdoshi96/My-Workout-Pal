import { readFile } from "node:fs/promises";

import { PGlite } from "@electric-sql/pglite";
import { afterEach, describe, expect, it } from "vitest";

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

const openDatabases: PGlite[] = [];

async function openBeforeProgramCollection(): Promise<PGlite> {
  const database = new PGlite();
  await database.waitReady;
  await database.exec(await readFile(initialMigrationUrl, "utf8"));
  await database.exec(await readFile(deletionMigrationUrl, "utf8"));
  await database.exec(await readFile(workoutMigrationUrl, "utf8"));
  openDatabases.push(database);
  return database;
}

afterEach(async () => {
  await Promise.all(openDatabases.splice(0).map((database) => database.close()));
});

describe("program collection migration", () => {
  it("backfills the starter as active and enforces one active program per owner", async () => {
    const database = await openBeforeProgramCollection();
    await database.exec(`
      INSERT INTO user_profiles (firebase_uid, display_name)
      VALUES
        ('program-owner', 'Program owner'),
        ('fallback-owner', 'Fallback owner');

      INSERT INTO user_programs (id, owner_firebase_uid, program_key, name)
      VALUES
        ('00000000-0000-4000-8000-000000000101', 'program-owner', 'five-day-starter-route', 'Starter'),
        ('00000000-0000-4000-8000-000000000102', 'program-owner', 'custom-route', 'Custom');

      INSERT INTO user_programs (
        id, owner_firebase_uid, program_key, name, created_at
      ) VALUES
        (
          '00000000-0000-4000-8000-000000000103',
          'fallback-owner',
          'later-route',
          'Later',
          '2026-08-25T12:00:00Z'
        ),
        (
          '00000000-0000-4000-8000-000000000104',
          'fallback-owner',
          'earlier-route',
          'Earlier',
          '2026-08-24T12:00:00Z'
        );
    `);

    await database.exec(await readFile(programCollectionMigrationUrl, "utf8"));

    const programs = await database.query<{
      is_active: boolean;
      program_key: string;
    }>(`
      SELECT program_key, is_active
      FROM user_programs
      WHERE owner_firebase_uid = 'program-owner'
      ORDER BY program_key;
    `);
    expect(programs.rows).toEqual([
      { is_active: false, program_key: "custom-route" },
      { is_active: true, program_key: "five-day-starter-route" },
    ]);

    const fallbackPrograms = await database.query<{
      is_active: boolean;
      program_key: string;
    }>(`
      SELECT program_key, is_active
      FROM user_programs
      WHERE owner_firebase_uid = 'fallback-owner'
      ORDER BY program_key;
    `);
    expect(fallbackPrograms.rows).toEqual([
      { is_active: true, program_key: "earlier-route" },
      { is_active: false, program_key: "later-route" },
    ]);

    await expect(
      database.exec(`
        UPDATE user_programs
        SET is_active = true
        WHERE owner_firebase_uid = 'program-owner'
          AND program_key = 'custom-route';
      `),
    ).rejects.toThrow(/user_programs_owner_active_unique|unique|duplicate/i);
  });
});
