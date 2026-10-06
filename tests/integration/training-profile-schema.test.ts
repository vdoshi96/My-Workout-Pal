import { readFile } from "node:fs/promises";

import { PGlite } from "@electric-sql/pglite";
import { afterEach, describe, expect, it } from "vitest";

const drizzleRoot = new URL("../../drizzle/", import.meta.url);
const trainingProfileTag = "0008_training_profile";
const openDatabases: PGlite[] = [];

async function journalTags(): Promise<readonly string[]> {
  const journal = JSON.parse(
    await readFile(new URL("meta/_journal.json", drizzleRoot), "utf8"),
  ) as { entries: readonly { idx: number; tag: string }[] };
  return [...journal.entries].sort((left, right) => left.idx - right.idx).map(({ tag }) => tag);
}

async function openDatabase(
  stopBefore?: string,
): Promise<PGlite> {
  const database = new PGlite();
  await database.waitReady;
  openDatabases.push(database);
  for (const tag of await journalTags()) {
    if (tag === stopBefore) break;
    await database.exec(await readFile(new URL(`${tag}.sql`, drizzleRoot), "utf8"));
  }
  return database;
}

afterEach(async () => {
  await Promise.all(openDatabases.splice(0).map((database) => database.close()));
});

describe("training profile migration", () => {
  it("is the ninth journal entry and is purely additive for existing members", async () => {
    const tags = await journalTags();
    expect(tags[8]).toBe(trainingProfileTag);
    expect(tags).toHaveLength(9);

    const database = await openDatabase(trainingProfileTag);
    await database.exec(`
      INSERT INTO user_profiles (firebase_uid, display_name) VALUES ('existing-member', 'Existing');
      INSERT INTO user_preferences (owner_firebase_uid) VALUES ('existing-member');
      INSERT INTO user_equipment_profiles (owner_firebase_uid, profile_kind)
      VALUES ('existing-member', 'dumbbells');
    `);
    await database.exec(await readFile(new URL(`${trainingProfileTag}.sql`, drizzleRoot), "utf8"));

    const counts = await database.query<{ profiles: number; preferences: number; training: number }>(`
      SELECT
        (SELECT count(*)::int FROM user_profiles) AS profiles,
        (SELECT count(*)::int FROM user_preferences) AS preferences,
        (SELECT count(*)::int FROM user_training_profiles) AS training;
    `);
    expect(counts.rows).toEqual([{ profiles: 1, preferences: 1, training: 0 }]);
  });

  it("stores one answer set per member with timestamps", async () => {
    const database = await openDatabase();
    await database.exec(`
      INSERT INTO user_profiles (firebase_uid, display_name) VALUES ('member-a', 'A');
      INSERT INTO user_training_profiles (
        owner_firebase_uid, training_goal, experience_level, days_per_week
      ) VALUES ('member-a', 'fat_loss', 'some', 3);
    `);
    const row = await database.query<{
      training_goal: string;
      experience_level: string;
      days_per_week: number;
      created_at: Date;
      updated_at: Date;
    }>(`SELECT training_goal, experience_level, days_per_week, created_at, updated_at
        FROM user_training_profiles WHERE owner_firebase_uid = 'member-a'`);
    expect(row.rows[0]).toMatchObject({
      training_goal: "fat_loss",
      experience_level: "some",
      days_per_week: 3,
    });
    expect(row.rows[0]!.created_at).toBeInstanceOf(Date);
    expect(row.rows[0]!.updated_at).toBeInstanceOf(Date);

    await expect(database.exec(`
      INSERT INTO user_training_profiles (
        owner_firebase_uid, training_goal, experience_level, days_per_week
      ) VALUES ('member-a', 'strength', 'new', 2);
    `)).rejects.toThrow(/user_training_profiles_pkey|duplicate|unique/iu);
  });

  it("rejects unknown goals, unknown experience, and day counts outside 2 to 5", async () => {
    const database = await openDatabase();
    await database.exec(`INSERT INTO user_profiles (firebase_uid, display_name) VALUES ('member-b', 'B');`);
    const insert = (goal: string, experience: string, days: number) =>
      database.exec(`
        INSERT INTO user_training_profiles (
          owner_firebase_uid, training_goal, experience_level, days_per_week
        ) VALUES ('member-b', '${goal}', '${experience}', ${days});
      `);
    await expect(insert("powerlifting", "some", 3)).rejects.toThrow(/invalid input value for enum/iu);
    await expect(insert("strength", "expert", 3)).rejects.toThrow(/invalid input value for enum/iu);
    await expect(insert("strength", "some", 1)).rejects.toThrow(/user_training_profiles_days_per_week_range/iu);
    await expect(insert("strength", "some", 6)).rejects.toThrow(/user_training_profiles_days_per_week_range/iu);
    for (const days of [2, 3, 4, 5]) {
      await database.exec(`DELETE FROM user_training_profiles WHERE owner_firebase_uid = 'member-b';`);
      await expect(insert("sport", "lots", days)).resolves.toBeDefined();
    }
  });

  it("requires an existing member and follows the owner key like sibling profile tables", async () => {
    const database = await openDatabase();
    await expect(database.exec(`
      INSERT INTO user_training_profiles (
        owner_firebase_uid, training_goal, experience_level, days_per_week
      ) VALUES ('missing-member', 'general', 'new', 2);
    `)).rejects.toThrow(/user_training_profiles_owner_firebase_uid_user_profiles_firebase_uid_fk|foreign key/iu);

    await database.exec(`
      INSERT INTO user_profiles (firebase_uid, display_name) VALUES ('member-c', 'C');
      INSERT INTO user_training_profiles (
        owner_firebase_uid, training_goal, experience_level, days_per_week
      ) VALUES ('member-c', 'general', 'new', 2);
    `);
    // Like user_preferences, the row must be removed explicitly by the
    // owner-scoped account deletion before the profile can go.
    await expect(database.exec(`DELETE FROM user_profiles WHERE firebase_uid = 'member-c';`))
      .rejects.toThrow(/foreign key/iu);
    await database.exec(`DELETE FROM user_training_profiles WHERE owner_firebase_uid = 'member-c';`);
    await database.exec(`DELETE FROM user_profiles WHERE firebase_uid = 'member-c';`);
    const remaining = await database.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM user_training_profiles`,
    );
    expect(remaining.rows).toEqual([{ count: 0 }]);
  });
});
