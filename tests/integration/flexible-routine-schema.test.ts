import { readFile } from "node:fs/promises";

import { PGlite } from "@electric-sql/pglite";
import { afterEach, describe, expect, it } from "vitest";

const migrationUrls = [
  new URL("../../drizzle/0000_initial.sql", import.meta.url),
  new URL("../../drizzle/0001_account_deletion_saga.sql", import.meta.url),
  new URL("../../drizzle/0002_workout_canonical_measurements.sql", import.meta.url),
  new URL("../../drizzle/0003_program_collection.sql", import.meta.url),
  new URL("../../drizzle/0004_personal_record_projection_checkpoint.sql", import.meta.url),
] as const;
const flexibleMigrationUrl = new URL(
  "../../drizzle/0005_flexible_routine_topology.sql",
  import.meta.url,
);

const openDatabases: PGlite[] = [];

async function openBeforeFlexibleTopology(): Promise<PGlite> {
  const database = new PGlite();
  await database.waitReady;
  for (const migrationUrl of migrationUrls) {
    await database.exec(await readFile(migrationUrl, "utf8"));
  }
  openDatabases.push(database);
  return database;
}

afterEach(async () => {
  await Promise.all(openDatabases.splice(0).map((database) => database.close()));
});

describe("flexible routine topology migration", () => {
  it("backfills stable keys and expands owned day ordering without rewriting rows", async () => {
    const database = await openBeforeFlexibleTopology();
    await database.exec(`
      INSERT INTO user_profiles (firebase_uid, display_name)
      VALUES ('flexible-owner', 'Flexible owner');

      INSERT INTO catalog_exercises (
        id, slug, name, movement_family, role, logging_kind, modality, muscles
      ) VALUES (
        '20000000-0000-4000-8000-000000000001',
        'migration-squat',
        'Migration squat',
        'squat',
        'compound',
        'weight_reps',
        'strength',
        '{}'
      );

      INSERT INTO user_programs (
        id, owner_firebase_uid, program_key, name, is_active
      ) VALUES (
        '40000000-0000-4000-8000-000000000001',
        'flexible-owner',
        'migration-program',
        'Migration program',
        true
      );

      INSERT INTO program_revisions (
        id, owner_firebase_uid, program_id, revision_number, status,
        equipment_profile_kind, published_at
      ) VALUES (
        '10000000-0000-4000-8000-000000000001',
        'flexible-owner',
        '40000000-0000-4000-8000-000000000001',
        1,
        'draft',
        'dumbbells',
        null
      );

      INSERT INTO program_days (
        id, owner_firebase_uid, program_id, revision_id, day_number, day_key,
        display_name
      ) VALUES (
        '30000000-0000-4000-8000-000000000001',
        'flexible-owner',
        '40000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000001',
        1,
        'push',
        'Push'
      );

      INSERT INTO program_sections (
        id, owner_firebase_uid, program_id, revision_id, day_id, kind,
        display_order, title
      ) VALUES (
        '60000000-0000-4000-8000-000000000001',
        'flexible-owner',
        '40000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000001',
        '30000000-0000-4000-8000-000000000001',
        'strength',
        1,
        'Main work'
      );

      INSERT INTO program_prescriptions (
        id, owner_firebase_uid, program_id, revision_id, section_id,
        catalog_exercise_id, display_order, set_kind, set_count,
        measurement_kind, minimum_reps, maximum_reps, rest_seconds
      ) VALUES (
        '50000000-0000-4000-8000-000000000001',
        'flexible-owner',
        '40000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000001',
        '60000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000001',
        1,
        'work',
        3,
        'weight_reps',
        8,
        12,
        90
      );

      INSERT INTO program_cardio_prescriptions (
        id, owner_firebase_uid, program_id, revision_id, day_id, mode,
        duration_seconds
      ) VALUES (
        '70000000-0000-4000-8000-000000000001',
        'flexible-owner',
        '40000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000001',
        '30000000-0000-4000-8000-000000000001',
        'walker',
        1200
      );

      UPDATE program_revisions
      SET status = 'published', published_at = now()
      WHERE id = '10000000-0000-4000-8000-000000000001';

      UPDATE user_programs
      SET active_revision_id = '10000000-0000-4000-8000-000000000001'
      WHERE id = '40000000-0000-4000-8000-000000000001';
    `);

    const immutableMeaningQuery = `
      SELECT
        d.id::text AS day_id,
        d.owner_firebase_uid,
        d.program_id::text,
        d.revision_id::text,
        d.day_number,
        d.day_key,
        d.display_name AS day_name,
        d.created_at::text AS day_created_at,
        s.id::text AS section_id,
        s.display_order AS section_order,
        e.name AS prescription_name,
        s.title AS section_name,
        s.created_at::text AS section_created_at,
        p.id::text AS prescription_id,
        p.display_order AS prescription_order,
        p.created_at::text AS prescription_created_at,
        c.id::text AS cardio_id,
        c.mode AS cardio_mode,
        c.created_at::text AS cardio_created_at
      FROM program_days d
      JOIN program_sections s ON s.day_id = d.id
      JOIN program_prescriptions p ON p.section_id = s.id
      JOIN catalog_exercises e ON e.id = p.catalog_exercise_id
      JOIN program_cardio_prescriptions c ON c.day_id = d.id;
    `;
    const before = await database.query(immutableMeaningQuery);

    await database.exec(await readFile(flexibleMigrationUrl, "utf8"));

    const stable = await database.query<{
      cardio_key: string;
      cardio_row_id: string;
      prescription_key: string;
      prescription_row_id: string;
      section_key: string;
      section_row_id: string;
    }>(`
      SELECT
        s.id::text AS section_row_id,
        s.section_key,
        p.id::text AS prescription_row_id,
        p.prescription_key,
        c.id::text AS cardio_row_id,
        c.cardio_key
      FROM program_sections s
      JOIN program_prescriptions p ON p.section_id = s.id
      JOIN program_cardio_prescriptions c ON c.day_id = s.day_id;
    `);
    expect(stable.rows).toEqual([
      {
        cardio_key: "70000000-0000-4000-8000-000000000001",
        cardio_row_id: "70000000-0000-4000-8000-000000000001",
        prescription_key: "50000000-0000-4000-8000-000000000001",
        prescription_row_id: "50000000-0000-4000-8000-000000000001",
        section_key: "60000000-0000-4000-8000-000000000001",
        section_row_id: "60000000-0000-4000-8000-000000000001",
      },
    ]);

    expect(
      await database.query(immutableMeaningQuery),
    ).toEqual(before);

    await expect(
      database.exec(`
        UPDATE program_sections
        SET title = 'History was rewritten'
        WHERE id = '60000000-0000-4000-8000-000000000001';
      `),
    ).rejects.toThrow(/published program revision descendants are immutable/i);

    await database.exec(`
      INSERT INTO program_revisions (
        id, owner_firebase_uid, program_id, revision_number, status,
        equipment_profile_kind, published_at
      ) VALUES (
        '10000000-0000-4000-8000-000000000002',
        'flexible-owner',
        '40000000-0000-4000-8000-000000000001',
        2,
        'draft',
        'dumbbells',
        null
      );
    `);

    await expect(
      database.exec(`
        INSERT INTO program_days (
          id, owner_firebase_uid, program_id, revision_id, day_number, day_key,
          display_name
        ) VALUES (
          '30000000-0000-4000-8000-000000000014',
          'flexible-owner',
          '40000000-0000-4000-8000-000000000001',
          '10000000-0000-4000-8000-000000000002',
          14,
          '30000000-0000-4000-8000-000000000014',
          'Fourteenth day'
        );
      `),
    ).resolves.toBeDefined();

    await expect(
      database.exec(`
        INSERT INTO program_days (
          id, owner_firebase_uid, program_id, revision_id, day_number, day_key,
          display_name
        ) VALUES (
          '30000000-0000-4000-8000-000000000015',
          'flexible-owner',
          '40000000-0000-4000-8000-000000000001',
          '10000000-0000-4000-8000-000000000002',
          15,
          '30000000-0000-4000-8000-000000000015',
          'Fifteenth day'
        );
      `),
    ).rejects.toThrow(/program_days_number_shape|check constraint/i);
  });
});
