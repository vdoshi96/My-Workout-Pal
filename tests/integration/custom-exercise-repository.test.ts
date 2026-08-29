import { readFile } from "node:fs/promises";

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterEach, describe, expect, it } from "vitest";

import type { Database } from "@/db/client";
import { schema } from "@/db/schema";
import { seedStarterDatabase } from "@/db/starter-seed";
import {
  CustomExerciseRepositoryError,
  createCustomExercise,
  deleteCustomExercise,
  getCustomExercise,
  listCustomExercises,
  updateCustomExercise,
} from "@/server/repositories/custom-exercises";
import type { ViewerContext } from "@/server/auth/viewer";
import {
  getPersonalGuidance,
  replacePersonalGuidance,
} from "@/server/repositories/personal-guidance";

const migrationUrls = [
  "0000_initial.sql",
  "0001_account_deletion_saga.sql",
  "0002_workout_canonical_measurements.sql",
  "0003_program_collection.sql",
  "0004_personal_record_projection_checkpoint.sql",
  "0005_flexible_routine_topology.sql",
  "0006_program_cardio_display_order.sql",
  "0007_personal_guidance.sql",
].map((name) => new URL(`../../drizzle/${name}`, import.meta.url));
const databases: PGlite[] = [];

const verifiedViewer = (uid: string): ViewerContext => ({
  uid,
  displayName: uid,
  email: `${uid}@example.test`,
  emailVerified: true,
  provider: "password",
  authTimeSeconds: 1_000,
  eligibleForPermanentMutations: true,
});

async function openDatabase() {
  const raw = new PGlite();
  await raw.waitReady;
  for (const migrationUrl of migrationUrls) {
    await raw.exec(await readFile(migrationUrl, "utf8"));
  }
  databases.push(raw);
  const database = drizzle(raw, { schema }) as unknown as Database;
  await seedStarterDatabase(database);
  return { raw, database };
}

async function seedViewer(raw: PGlite, uid: string): Promise<void> {
  await raw.query(
    "INSERT INTO user_profiles (firebase_uid, display_name) VALUES ($1, $2)",
    [uid, uid],
  );
}

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.close()));
});

const draft = {
  name: "Supported home row",
  loggingKind: "weight_reps",
  equipmentIds: ["dumbbells", "bench"],
  instructions: "Keep the torso supported.",
  aliases: ["Home row"],
  videoUrls: ["https://youtu.be/abc123XYZ_1"],
} as const;

describe("custom exercise repository", () => {
  it("creates one normalized owner-scoped exercise and replays idempotently", async () => {
    const { raw, database } = await openDatabase();
    const viewer = verifiedViewer("alice");
    await seedViewer(raw, viewer.uid);

    const first = await createCustomExercise(database, viewer, {
      idempotencyKey: "custom-create-1",
      draft,
    });
    const replay = await createCustomExercise(database, viewer, {
      idempotencyKey: "custom-create-1",
      draft,
    });
    const loaded = await getCustomExercise(database, viewer, first.exercise.id);

    expect(replay).toEqual({ ...first, duplicate: true });
    expect(loaded).toMatchObject({
      id: first.exercise.id,
      name: "Supported home row",
      loggingKind: "weight_reps",
      equipmentIds: ["dumbbells", "bench"],
      aliases: [{ alias: "Home row", normalizedAlias: "home row" }],
      youtubeVideoIds: ["abc123XYZ_1"],
    });
    await expect(listCustomExercises(database, viewer)).resolves.toEqual([loaded]);
    await expect(
      raw.query<{ count: number }>(
        "SELECT count(*)::int AS count FROM custom_exercises WHERE owner_firebase_uid = 'alice'",
      ),
    ).resolves.toMatchObject({ rows: [{ count: 1 }] });
  });

  it("denies unverified permanent mutation before writing", async () => {
    const { raw, database } = await openDatabase();
    const viewer = {
      ...verifiedViewer("alice"),
      emailVerified: false,
      eligibleForPermanentMutations: false,
    };
    await seedViewer(raw, viewer.uid);

    await expect(
      createCustomExercise(database, viewer, {
        idempotencyKey: "custom-create-unverified",
        draft,
      }),
    ).rejects.toMatchObject({ code: "verification_required" });
    await expect(
      raw.query<{ count: number }>(
        "SELECT count(*)::int AS count FROM custom_exercises",
      ),
    ).resolves.toMatchObject({ rows: [{ count: 0 }] });
  });

  it("keeps reads and aliases owner-scoped and hides foreign IDs", async () => {
    const { raw, database } = await openDatabase();
    const alice = verifiedViewer("alice");
    const bob = verifiedViewer("bob");
    await seedViewer(raw, alice.uid);
    await seedViewer(raw, bob.uid);
    const aliceResult = await createCustomExercise(database, alice, {
      idempotencyKey: "alice-create",
      draft,
    });
    const bobResult = await createCustomExercise(database, bob, {
      idempotencyKey: "bob-create",
      draft,
    });

    await expect(getCustomExercise(database, bob, aliceResult.exercise.id)).rejects.toEqual(
      expect.objectContaining({ code: "not_found", status: 404 }),
    );
    await expect(getCustomExercise(database, bob, "00000000-0000-4000-8000-000000000099")).rejects.toEqual(
      expect.objectContaining({ code: "not_found", status: 404 }),
    );
    await expect(listCustomExercises(database, alice)).resolves.toMatchObject([
      { id: aliceResult.exercise.id },
    ]);
    await expect(listCustomExercises(database, bob)).resolves.toMatchObject([
      { id: bobResult.exercise.id },
    ]);
  });

  it("rejects idempotency hash reuse and semantic edits that reinterpret references", async () => {
    const { raw, database } = await openDatabase();
    const viewer = verifiedViewer("alice");
    await seedViewer(raw, viewer.uid);
    const created = await createCustomExercise(database, viewer, {
      idempotencyKey: "custom-create-1",
      draft,
    });
    await expect(
      createCustomExercise(database, viewer, {
        idempotencyKey: "custom-create-1",
        draft: { ...draft, name: "Different row" },
      }),
    ).rejects.toMatchObject({ code: "idempotency_conflict", status: 409 });

    const template = await raw.query<{ revision_id: string; day_id: string }>(`
      SELECT r.id AS revision_id, d.id AS day_id
      FROM program_template_revisions r
      JOIN template_days d ON d.revision_id = r.id
      WHERE r.equipment_profile_kind = 'dumbbells'
      ORDER BY d.day_number
      LIMIT 1;
    `);
    const revisionId = "00000000-0000-4000-8000-000000000101";
    const programId = "00000000-0000-4000-8000-000000000102";
    const dayId = "00000000-0000-4000-8000-000000000103";
    const sectionId = "00000000-0000-4000-8000-000000000104";
    await raw.query(
      `INSERT INTO user_programs (id, owner_firebase_uid, program_key, name)
       VALUES ($1, 'alice', 'active', 'Active')`,
      [programId],
    );
    await raw.query(
      `INSERT INTO program_revisions (
         id, owner_firebase_uid, program_id, revision_number, status,
         equipment_profile_kind, source_template_revision_id
       ) VALUES ($1, 'alice', $2, 1, 'draft', 'dumbbells', $3)`,
      [revisionId, programId, template.rows[0]!.revision_id],
    );
    await raw.query(
      `INSERT INTO program_days (
         id, owner_firebase_uid, program_id, revision_id, day_number, day_key, display_name
       ) VALUES ($1, 'alice', $2, $3, 1, 'push', 'Push')`,
      [dayId, programId, revisionId],
    );
    await raw.query(
      `INSERT INTO program_sections (
         id, owner_firebase_uid, program_id, revision_id, day_id, section_key,
         kind, display_order, title
       ) VALUES ($1, 'alice', $2, $3, $4, $1::uuid::text, 'strength', 1, 'Strength')`,
      [sectionId, programId, revisionId, dayId],
    );
    await raw.query(
      `INSERT INTO program_prescriptions (
         owner_firebase_uid, program_id, revision_id, section_id,
         prescription_key, custom_exercise_id, display_order, set_count, measurement_kind,
         minimum_reps, maximum_reps, rest_seconds
       ) VALUES ('alice', $1, $2, $3, $3::uuid::text, $4, 1, 3, 'weight_reps', 8, 12, 90)`,
      [programId, revisionId, sectionId, created.exercise.id],
    );

    await expect(
      updateCustomExercise(database, viewer, {
        exerciseId: created.exercise.id,
        expectedUpdatedAt: created.exercise.updatedAt,
        idempotencyKey: "custom-update-kind",
        draft: { ...draft, loggingKind: "duration" },
      }),
    ).rejects.toMatchObject({ code: "semantic_clone_required", status: 409 });
  });

  it("updates with optimistic concurrency and deletes only an unreferenced owned exercise", async () => {
    const { raw, database } = await openDatabase();
    const viewer = verifiedViewer("alice");
    await seedViewer(raw, viewer.uid);
    const created = await createCustomExercise(database, viewer, {
      idempotencyKey: "custom-create-1",
      draft,
    });
    await replacePersonalGuidance(database, viewer, {
      source: { kind: "custom", id: created.exercise.id },
      links: ["https://example.com/private-row"],
      idempotencyKey: "custom-guidance-1",
    });

    const updated = await updateCustomExercise(database, viewer, {
      exerciseId: created.exercise.id,
      expectedUpdatedAt: created.exercise.updatedAt,
      idempotencyKey: "custom-update-1",
      draft: { ...draft, name: "Supported row two", aliases: [] },
    });
    expect(updated.exercise).toMatchObject({ name: "Supported row two", aliases: [] });
    await expect(
      getPersonalGuidance(database, viewer, {
        kind: "custom",
        id: created.exercise.id,
      }),
    ).resolves.toMatchObject({
      links: [{ canonicalUrl: "https://example.com/private-row" }],
    });
    await expect(
      updateCustomExercise(database, viewer, {
        exerciseId: created.exercise.id,
        expectedUpdatedAt: created.exercise.updatedAt,
        idempotencyKey: "custom-update-stale",
        draft,
      }),
    ).rejects.toMatchObject({ code: "stale", status: 409 });

    await deleteCustomExercise(database, viewer, {
      exerciseId: created.exercise.id,
      idempotencyKey: "custom-delete-1",
    });
    await expect(getCustomExercise(database, viewer, created.exercise.id)).rejects.toMatchObject({
      code: "not_found",
    } satisfies Partial<CustomExerciseRepositoryError>);
    await expect(
      raw.query<{ count: number }>(
        "SELECT count(*)::int AS count FROM personal_guidance_links WHERE owner_firebase_uid = 'alice'",
      ),
    ).resolves.toMatchObject({ rows: [{ count: 0 }] });
  });
});
