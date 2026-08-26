import { readFile } from "node:fs/promises";

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterEach, describe, expect, it } from "vitest";

import type { Database } from "@/db/client";
import { schema } from "@/db/schema";
import {
  seedStarterDatabase,
  verifyStarterDatabase,
} from "@/db/starter-seed";
import {
  buildStarterDatabaseRows,
  type StarterDatabaseRows,
} from "@/domain/seed/starter-database-rows";

const migrationUrl = new URL("../../drizzle/0000_initial.sql", import.meta.url);
const openDatabases: PGlite[] = [];

async function openDatabase(): Promise<{
  raw: PGlite;
  database: Database;
}> {
  const raw = new PGlite();
  await raw.waitReady;
  await raw.exec(await readFile(migrationUrl, "utf8"));
  openDatabases.push(raw);
  return {
    raw,
    database: drizzle(raw, { schema }) as unknown as Database,
  };
}

afterEach(async () => {
  await Promise.all(openDatabases.splice(0).map((database) => database.close()));
});

describe("starter database bootstrap", () => {
  it("publishes the complete starter graph and reruns without material changes", async () => {
    const { raw, database } = await openDatabase();

    const first = await seedStarterDatabase(database);
    const before = await raw.query<{ payload: unknown }>(`
      SELECT jsonb_build_object(
        'equipment', (SELECT jsonb_agg(to_jsonb(row) ORDER BY id) FROM catalog_equipment row),
        'exercises', (SELECT jsonb_agg(to_jsonb(row) ORDER BY id) FROM catalog_exercises row),
        'revisions', (SELECT jsonb_agg(to_jsonb(row) ORDER BY id) FROM program_template_revisions row),
        'prescriptions', (SELECT jsonb_agg(to_jsonb(row) ORDER BY id) FROM template_prescriptions row)
      ) AS payload;
    `);
    const second = await seedStarterDatabase(database);
    const after = await raw.query<{ payload: unknown }>(`
      SELECT jsonb_build_object(
        'equipment', (SELECT jsonb_agg(to_jsonb(row) ORDER BY id) FROM catalog_equipment row),
        'exercises', (SELECT jsonb_agg(to_jsonb(row) ORDER BY id) FROM catalog_exercises row),
        'revisions', (SELECT jsonb_agg(to_jsonb(row) ORDER BY id) FROM program_template_revisions row),
        'prescriptions', (SELECT jsonb_agg(to_jsonb(row) ORDER BY id) FROM template_prescriptions row)
      ) AS payload;
    `);

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      catalogEquipment: 6,
      catalogExercises: 27,
      templateRevisions: 2,
      templateDays: 10,
      templateSections: 26,
      templatePrescriptions: 60,
      templateCardioPrescriptions: 20,
      approvedVideos: 54,
    });
    expect(after.rows[0]?.payload).toEqual(before.rows[0]?.payload);
    expect(
      await raw.query<{ status: string; published_at: Date | null }>(`
        SELECT status, published_at
        FROM program_template_revisions
        ORDER BY revision_number;
      `),
    ).toMatchObject({
      rows: [
        { status: "published", published_at: new Date("2026-08-25T00:00:00.000Z") },
        { status: "published", published_at: new Date("2026-08-25T00:00:00.000Z") },
      ],
    });
  }, 15_000);

  it("rejects deterministic catalog drift and leaves the committed graph intact", async () => {
    const { raw, database } = await openDatabase();
    const rows = buildStarterDatabaseRows();
    await seedStarterDatabase(database, rows);
    const changed: StarterDatabaseRows = {
      ...rows,
      catalogEquipment: rows.catalogEquipment.map((equipment) =>
        equipment.id === "dumbbells"
          ? { ...equipment, label: "Changed outside a migration" }
          : equipment,
      ),
    };

    await expect(seedStarterDatabase(database, changed)).rejects.toThrow(
      /catalog_equipment.*dumbbells.*drift/i,
    );
    await expect(
      raw.query<{ label: string }>(
        "SELECT label FROM catalog_equipment WHERE id = 'dumbbells';",
      ),
    ).resolves.toMatchObject({ rows: [{ label: "Dumbbells" }] });
  });

  it("detects a missing immutable published child instead of repairing history", async () => {
    const { raw, database } = await openDatabase();
    const rows = buildStarterDatabaseRows();
    await seedStarterDatabase(database, rows);
    const missing = rows.templatePrescriptions[0]!;

    await raw.exec("SET session_replication_role = replica;");
    await raw.exec(`DELETE FROM template_prescriptions WHERE id = '${missing.id}';`);
    await raw.exec("SET session_replication_role = origin;");

    await expect(verifyStarterDatabase(database, rows)).rejects.toThrow(
      new RegExp(`template_prescriptions.*missing.*${missing.id}`, "i"),
    );
    await expect(seedStarterDatabase(database, rows)).rejects.toThrow(
      /published.*revision.*drift|template_prescriptions.*missing/i,
    );
  });
});
