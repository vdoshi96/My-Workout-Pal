import { readFile } from "node:fs/promises";

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterEach, describe, expect, it } from "vitest";

import type { Database } from "@/db/client";
import { schema } from "@/db/schema";
import { seedStarterDatabase } from "@/db/starter-seed";
import {
  createProfileProgramRepository,
  RepositoryConflictError,
  RepositoryNotFoundError,
  RepositoryValidationError,
} from "@/server/repositories/profile-program";
import type { ViewerContext } from "@/server/auth/viewer";

const migrationUrl = new URL("../../drizzle/0000_initial.sql", import.meta.url);
const openDatabases: PGlite[] = [];

async function openDatabase(): Promise<{ raw: PGlite; database: Database }> {
  const raw = new PGlite();
  await raw.waitReady;
  await raw.exec(await readFile(migrationUrl, "utf8"));
  openDatabases.push(raw);
  const database = drizzle(raw, { schema }) as unknown as Database;
  await seedStarterDatabase(database);
  return { raw, database };
}

function viewer(
  uid: string,
  eligibleForPermanentMutations = true,
): ViewerContext {
  return {
    uid,
    displayName: `Athlete ${uid}`,
    email: `${uid}@example.com`,
    emailVerified: eligibleForPermanentMutations,
    provider: "password",
    authTimeSeconds: 1_787_681_000,
    eligibleForPermanentMutations,
  };
}

function slugsByDay(
  program: Readonly<{
    days: readonly Readonly<{
      dayKey: string;
      prescriptions: readonly Readonly<{
        exercise: Readonly<{ slug: string }>;
      }>[];
    }>[];
  }>,
): Record<string, string[]> {
  return Object.fromEntries(
    program.days.map((day) => [
      day.dayKey,
      day.prescriptions.map((prescription) => prescription.exercise.slug),
    ]),
  );
}

afterEach(async () => {
  await Promise.all(openDatabases.splice(0).map((database) => database.close()));
});

describe("profile and active-program repository", () => {
  it("onboards one complete dumbbell profile and replays stably", async () => {
    const { database, raw } = await openDatabase();
    const repository = createProfileProgramRepository(database);
    const first = await repository.onboard(viewer("member-a"), {
      equipmentProfileKind: "dumbbells",
      unitSystem: "imperial",
      timezone: "America/Chicago",
      reducedMotion: true,
      idempotencyKey: "onboarding-a",
    });
    const second = await repository.onboard(viewer("member-a"), {
      equipmentProfileKind: "dumbbells",
      unitSystem: "imperial",
      timezone: "America/Chicago",
      reducedMotion: true,
      idempotencyKey: "onboarding-a",
    });

    expect(second).toEqual(first);
    expect(first.profile.firebaseUid).toBe("member-a");
    expect(first.preferences).toMatchObject({
      unitSystem: "imperial",
      timezone: "America/Chicago",
      reducedMotion: true,
      updatedAt: expect.any(String),
    });
    expect(first.equipment.profileKind).toBe("dumbbells");
    const active = first.activeProgram;
    if (!active) throw new Error("onboarding did not create an active program");
    expect(active.revisionNumber).toBe(1);
    expect(active.days).toHaveLength(5);
    expect(active.days.flatMap((day) => day.sections)).toHaveLength(13);
    expect(active.days.flatMap((day) => day.prescriptions)).toHaveLength(30);
    expect(active.days.flatMap((day) => day.cardio)).toHaveLength(10);
    expect(
      active.days
        .find((day) => day.displayName === "Lower")
        ?.prescriptions.find((prescription) => prescription.exercise.slug === "goblet-squat")
        ?.displayName,
    ).toBe("Heavy goblet squat");

    await expect(
      raw.query<{ count: string }>(
        "SELECT count(*)::text AS count FROM user_profiles WHERE firebase_uid = 'member-a';",
      ),
    ).resolves.toMatchObject({ rows: [{ count: "1" }] });
    await expect(
      raw.query<{ count: string }>(
        "SELECT count(*)::text AS count FROM user_preferences WHERE owner_firebase_uid = 'member-a';",
      ),
    ).resolves.toMatchObject({ rows: [{ count: "1" }] });
    await expect(
      raw.query<{ count: string }>(
        "SELECT count(*)::text AS count FROM user_equipment_profiles WHERE owner_firebase_uid = 'member-a';",
      ),
    ).resolves.toMatchObject({ rows: [{ count: "1" }] });
    await expect(
      raw.query<{ count: string }>(
        "SELECT count(*)::text AS count FROM user_programs WHERE owner_firebase_uid = 'member-a';",
      ),
    ).resolves.toMatchObject({ rows: [{ count: "1" }] });
  });

  it("denies an unverified permanent mutation without writes", async () => {
    const { database, raw } = await openDatabase();
    const repository = createProfileProgramRepository(database);

    await expect(
      repository.onboard(viewer("unverified", false), {
        equipmentProfileKind: "dumbbells",
      }),
    ).rejects.toMatchObject({ code: "email_unverified" });
    await expect(
      raw.query<{ count: string }>(
        "SELECT count(*)::text AS count FROM user_profiles WHERE firebase_uid = 'unverified';",
      ),
    ).resolves.toMatchObject({ rows: [{ count: "0" }] });
  });

  it("accepts valid IANA timezones and rejects invalid labels before writing", async () => {
    const { database, raw } = await openDatabase();
    const repository = createProfileProgramRepository(database);
    const valid = await repository.onboard(viewer("timezone-valid"), {
      equipmentProfileKind: "dumbbells",
      timezone: "America/Chicago",
    });
    expect(valid.preferences.timezone).toBe("America/Chicago");

    await expect(
      repository.onboard(viewer("timezone-invalid"), {
        equipmentProfileKind: "dumbbells",
        timezone: "Mars/Olympus",
      }),
    ).rejects.toMatchObject({ code: "validation" });
    await expect(
      raw.query<{ count: string }>(
        "SELECT count(*)::text AS count FROM user_profiles WHERE firebase_uid = 'timezone-invalid';",
      ),
    ).resolves.toMatchObject({ rows: [{ count: "0" }] });
  });

  it("updates preferences with optimistic conflict and idempotent replay", async () => {
    const { database } = await openDatabase();
    const repository = createProfileProgramRepository(database);
    const original = await repository.onboard(viewer("member-preferences"), {
      equipmentProfileKind: "dumbbells",
      timezone: "UTC",
      unitSystem: "imperial",
    });
    const input = {
      expectedUpdatedAt: original.preferences.updatedAt,
      idempotencyKey: "preferences-1",
      reducedMotion: true,
      timezone: "America/Chicago",
      unitSystem: "metric" as const,
    };

    const updated = await repository.updatePreferences(viewer("member-preferences"), input);
    const replay = await repository.updatePreferences(viewer("member-preferences"), input);
    expect(replay).toEqual(updated);
    expect(updated.preferences).toMatchObject({
      reducedMotion: true,
      timezone: "America/Chicago",
      unitSystem: "metric",
    });
    expect(updated.preferences.updatedAt).not.toBe(original.preferences.updatedAt);

    await expect(
      repository.updatePreferences(viewer("member-preferences"), {
        ...input,
        idempotencyKey: "preferences-stale",
        timezone: "America/New_York",
      }),
    ).rejects.toBeInstanceOf(RepositoryConflictError);
    await expect(repository.getViewerData(viewer("member-preferences"))).resolves.toEqual(updated);
  });

  it("denies unverified preference changes and invalid timezones without writes", async () => {
    const { database } = await openDatabase();
    const repository = createProfileProgramRepository(database);
    const original = await repository.onboard(viewer("member-preferences-denied"), {
      equipmentProfileKind: "dumbbells",
    });
    const input = {
      expectedUpdatedAt: original.preferences.updatedAt,
      idempotencyKey: "preferences-denied",
      reducedMotion: false,
      timezone: "Mars/Olympus",
      unitSystem: "imperial" as const,
    };

    await expect(
      repository.updatePreferences(viewer("member-preferences-denied", false), {
        ...input,
        timezone: "UTC",
      }),
    ).rejects.toMatchObject({ code: "email_unverified" });
    await expect(
      repository.updatePreferences(viewer("member-preferences-denied"), input),
    ).rejects.toBeInstanceOf(RepositoryValidationError);
    await expect(repository.getViewerData(viewer("member-preferences-denied"))).resolves.toEqual(original);
  });

  it("keeps active reads owner-scoped and maps foreign IDs to the same not-found error", async () => {
    const { database } = await openDatabase();
    const repository = createProfileProgramRepository(database);
    const own = await repository.onboard(viewer("member-a"), {
      equipmentProfileKind: "dumbbells",
    });
    const ownProgram = own.activeProgram;
    if (!ownProgram) throw new Error("onboarding did not create an active program");

    await expect(
      repository.getActiveProgram(viewer("member-b"), ownProgram.id),
    ).rejects.toBeInstanceOf(RepositoryNotFoundError);
    await expect(
      repository.getActiveProgram(viewer("member-b"), "00000000-0000-0000-0000-000000000000"),
    ).rejects.toBeInstanceOf(RepositoryNotFoundError);
  });

  it("maps a malformed equipment base revision ID to the stable not-found error", async () => {
    const { database } = await openDatabase();
    const repository = createProfileProgramRepository(database);
    const own = await repository.onboard(viewer("member-malformed-base"), {
      equipmentProfileKind: "dumbbells",
    });
    const ownProgram = own.activeProgram;
    if (!ownProgram) throw new Error("onboarding did not create an active program");

    await expect(
      repository.confirmEquipmentChange(viewer("member-malformed-base"), {
        programId: ownProgram.id,
        baseRevisionId: "not-a-uuid",
        equipmentProfileKind: "barbell",
      }),
    ).rejects.toBeInstanceOf(RepositoryNotFoundError);
  });

  it("publishes an equipment revision without mutating the old revision", async () => {
    const { database, raw } = await openDatabase();
    const repository = createProfileProgramRepository(database);
    const own = await repository.onboard(viewer("member-a"), {
      equipmentProfileKind: "dumbbells",
    });
    const ownProgram = own.activeProgram;
    if (!ownProgram) throw new Error("onboarding did not create an active program");
    const changed = await repository.confirmEquipmentChange(viewer("member-a"), {
      programId: ownProgram.id,
      baseRevisionId: ownProgram.revisionId,
      equipmentProfileKind: "barbell",
      idempotencyKey: "equipment-a",
    });
    const replay = await repository.confirmEquipmentChange(viewer("member-a"), {
      programId: ownProgram.id,
      baseRevisionId: ownProgram.revisionId,
      equipmentProfileKind: "barbell",
      idempotencyKey: "equipment-a",
    });

    expect(changed).toEqual(replay);
    expect(changed.equipment.profileKind).toBe("barbell");
    const changedProgram = changed.activeProgram;
    if (!changedProgram) throw new Error("equipment change removed the active program");
    expect(changedProgram.revisionNumber).toBe(2);
    expect(changed.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fromSlug: "goblet-squat",
          toSlug: "barbell-back-squat",
          cleared: ["targetWeightKg", "targetDistanceM", "targetMetadata"],
          reason: expect.stringContaining("movement-specific targets were cleared"),
        }),
      ]),
    );
    await expect(
      raw.query<{ count: string }>(
        "SELECT count(*)::text AS count FROM program_revisions WHERE owner_firebase_uid = 'member-a' AND program_id = $1;",
        [ownProgram.id],
      ),
    ).resolves.toMatchObject({ rows: [{ count: "2" }] });
    await expect(
      raw.query<{ status: string; revision_number: number }>(
        "SELECT status, revision_number FROM program_revisions WHERE owner_firebase_uid = 'member-a' AND program_id = $1 ORDER BY revision_number;",
        [ownProgram.id],
      ),
    ).resolves.toMatchObject({
      rows: [
        { status: "published", revision_number: 1 },
        { status: "published", revision_number: 2 },
      ],
    });
  });

  it("applies only the canonical day-scoped substitutions in both directions", async () => {
    const { database } = await openDatabase();
    const repository = createProfileProgramRepository(database);
    const dumbbellProfile = await repository.onboard(viewer("member-mapping-dumbbells"), {
      equipmentProfileKind: "dumbbells",
    });
    const dumbbellProgram = dumbbellProfile.activeProgram;
    if (!dumbbellProgram) throw new Error("onboarding did not create an active program");
    const barbellResult = await repository.confirmEquipmentChange(
      viewer("member-mapping-dumbbells"),
      {
        programId: dumbbellProgram.id,
        baseRevisionId: dumbbellProgram.revisionId,
        equipmentProfileKind: "barbell",
      },
    );
    const barbellProgram = barbellResult.activeProgram;
    if (!barbellProgram) throw new Error("equipment change removed the active program");
    expect(slugsByDay(barbellProgram)).toEqual({
      push: [
        "dumbbell-bench-press",
        "seated-dumbbell-shoulder-press",
        "incline-dumbbell-press",
        "overhead-dumbbell-triceps-extension",
        "dead-bug",
        "front-plank",
      ],
      pull: [
        "barbell-bent-over-row",
        "one-arm-dumbbell-row",
        "dumbbell-pullover",
        "dumbbell-curl",
        "bird-dog",
        "side-plank",
      ],
      legs: [
        "goblet-squat",
        "dumbbell-romanian-deadlift",
        "reverse-lunge",
        "standing-calf-raise",
        "plank-shoulder-tap",
        "reverse-crunch",
      ],
      upper: [
        "barbell-bench-press",
        "barbell-bent-over-row",
        "seated-dumbbell-shoulder-press",
        "one-arm-dumbbell-row",
        "bicycle-crunch",
        "hollow-hold",
      ],
      lower: [
        "barbell-back-squat",
        "barbell-romanian-deadlift",
        "bulgarian-split-squat",
        "barbell-hip-thrust",
        "dead-bug",
        "side-plank",
      ],
    });

    const barbellProfile = await repository.onboard(viewer("member-mapping-barbell"), {
      equipmentProfileKind: "barbell",
    });
    const initialBarbellProgram = barbellProfile.activeProgram;
    if (!initialBarbellProgram) throw new Error("onboarding did not create an active program");
    const dumbbellResult = await repository.confirmEquipmentChange(
      viewer("member-mapping-barbell"),
      {
        programId: initialBarbellProgram.id,
        baseRevisionId: initialBarbellProgram.revisionId,
        equipmentProfileKind: "dumbbells",
      },
    );
    const finalDumbbellProgram = dumbbellResult.activeProgram;
    if (!finalDumbbellProgram) throw new Error("equipment change removed the active program");
    expect(slugsByDay(finalDumbbellProgram)).toEqual({
      push: [
        "dumbbell-bench-press",
        "seated-dumbbell-shoulder-press",
        "incline-dumbbell-press",
        "overhead-dumbbell-triceps-extension",
        "dead-bug",
        "front-plank",
      ],
      pull: [
        "chest-supported-dumbbell-row",
        "one-arm-dumbbell-row",
        "dumbbell-pullover",
        "dumbbell-curl",
        "bird-dog",
        "side-plank",
      ],
      legs: [
        "goblet-squat",
        "dumbbell-romanian-deadlift",
        "reverse-lunge",
        "standing-calf-raise",
        "plank-shoulder-tap",
        "reverse-crunch",
      ],
      upper: [
        "dumbbell-bench-press",
        "chest-supported-dumbbell-row",
        "seated-dumbbell-shoulder-press",
        "one-arm-dumbbell-row",
        "bicycle-crunch",
        "hollow-hold",
      ],
      lower: [
        "goblet-squat",
        "dumbbell-romanian-deadlift",
        "bulgarian-split-squat",
        "dumbbell-hip-thrust",
        "dead-bug",
        "side-plank",
      ],
    });
  });

  it("rejects a previewed stale base before creating another revision", async () => {
    const { database, raw } = await openDatabase();
    const repository = createProfileProgramRepository(database);
    const own = await repository.onboard(viewer("member-stale"), {
      equipmentProfileKind: "dumbbells",
    });
    const preview = own.activeProgram;
    if (!preview) throw new Error("onboarding did not create an active program");

    const changed = await repository.confirmEquipmentChange(viewer("member-stale"), {
      programId: preview.id,
      baseRevisionId: preview.revisionId,
      equipmentProfileKind: "barbell",
      idempotencyKey: "stale-first-change",
    });
    const current = changed.activeProgram;
    if (!current) throw new Error("equipment change removed the active program");

    await expect(
      repository.confirmEquipmentChange(viewer("member-stale"), {
        programId: preview.id,
        baseRevisionId: preview.revisionId,
        equipmentProfileKind: "dumbbells",
        idempotencyKey: "stale-previewed-change",
      }),
    ).rejects.toBeInstanceOf(RepositoryConflictError);

    await expect(
      raw.query<{ revisions: string; active_revision_id: string; profile_kind: string; idempotency_rows: string }>(
        `SELECT
          (SELECT count(*)::text FROM program_revisions WHERE owner_firebase_uid = 'member-stale' AND program_id = $1) AS revisions,
          (SELECT active_revision_id FROM user_programs WHERE owner_firebase_uid = 'member-stale' AND id = $1) AS active_revision_id,
          (SELECT profile_kind FROM user_equipment_profiles WHERE owner_firebase_uid = 'member-stale') AS profile_kind,
          (SELECT count(*)::text FROM idempotency_keys WHERE owner_firebase_uid = 'member-stale' AND idempotency_key = 'stale-previewed-change') AS idempotency_rows;`,
        [preview.id],
      ),
    ).resolves.toMatchObject({
      rows: [
        {
          revisions: "2",
          active_revision_id: current.revisionId,
          profile_kind: "barbell",
          idempotency_rows: "0",
        },
      ],
    });
  });

  it("preserves compatible values and notes while clearing rerouted targets", async () => {
    const { database, raw } = await openDatabase();
    const repository = createProfileProgramRepository(database);
    const own = await repository.onboard(viewer("member-values"), {
      equipmentProfileKind: "dumbbells",
    });
    const ownProgram = own.activeProgram;
    if (!ownProgram) throw new Error("onboarding did not create an active program");

    await raw.exec("SET session_replication_role = replica;");
    await raw.exec(
      `UPDATE program_prescriptions
       SET target_weight_kg = 17.5, notes = 'Keep this note'
       WHERE owner_firebase_uid = 'member-values'
         AND revision_id = '${ownProgram.revisionId}'
         AND catalog_exercise_id = (SELECT id FROM catalog_exercises WHERE slug = 'seated-dumbbell-shoulder-press');
    UPDATE program_prescriptions
       SET target_weight_kg = 22.5, notes = 'Reroute this note', target_metadata = '{"movement":"goblet"}'::jsonb
       WHERE owner_firebase_uid = 'member-values'
         AND revision_id = '${ownProgram.revisionId}'
         AND catalog_exercise_id = (SELECT id FROM catalog_exercises WHERE slug = 'goblet-squat');`,
    );
    await raw.exec("SET session_replication_role = origin;");

    const changed = await repository.confirmEquipmentChange(viewer("member-values"), {
      programId: ownProgram.id,
      baseRevisionId: ownProgram.revisionId,
      equipmentProfileKind: "barbell",
    });
    const changedProgram = changed.activeProgram;
    if (!changedProgram) throw new Error("equipment change removed the active program");
    const compatible = changedProgram.days
      .flatMap((day) => day.prescriptions)
      .find((prescription) => prescription.exercise.slug === "seated-dumbbell-shoulder-press");
    const rerouted = changedProgram.days
      .flatMap((day) => day.prescriptions)
      .find((prescription) => prescription.exercise.slug === "barbell-back-squat");
    expect(compatible).toMatchObject({ targetWeightKg: 17.5, notes: "Keep this note" });
    expect(rerouted).toMatchObject({
      targetWeightKg: null,
      targetDistanceM: null,
      targetMetadata: {},
      notes: "Reroute this note",
    });
    const oldRows = await raw.query<{
      target_weight_kg: string | null;
      notes: string | null;
      target_metadata: Record<string, unknown>;
    }>(
      "SELECT target_weight_kg, notes, target_metadata FROM program_prescriptions WHERE owner_firebase_uid = 'member-values' AND revision_id = $1 AND catalog_exercise_id = (SELECT id FROM catalog_exercises WHERE slug = 'goblet-squat');",
      [ownProgram.revisionId],
    );
    expect(oldRows.rows).toHaveLength(2);
    expect(oldRows.rows).toEqual([
      {
        target_weight_kg: "22.500",
        notes: "Reroute this note",
        target_metadata: { movement: "goblet" },
      },
      {
        target_weight_kg: "22.500",
        notes: "Reroute this note",
        target_metadata: { movement: "goblet" },
      },
    ]);
  });

  it("reads owner-scoped custom prescriptions and preserves compatible custom values", async () => {
    const { database, raw } = await openDatabase();
    const repository = createProfileProgramRepository(database);
    const own = await repository.onboard(viewer("member-custom"), {
      equipmentProfileKind: "dumbbells",
    });
    const ownProgram = own.activeProgram;
    if (!ownProgram) throw new Error("onboarding did not create an active program");
    const customId = "11111111-1111-5111-8111-111111111111";

    await raw.exec("SET session_replication_role = replica;");
    await raw.exec(
      `INSERT INTO custom_exercises (id, owner_firebase_uid, exercise_key, name, logging_kind, instructions)
       VALUES ('${customId}', 'member-custom', 'member-row', 'Member row', 'weight_reps', 'Keep the elbow close.');
       INSERT INTO custom_exercise_equipment (owner_firebase_uid, custom_exercise_id, equipment_id)
       VALUES ('member-custom', '${customId}', 'dumbbells');
       UPDATE program_prescriptions
       SET catalog_exercise_id = NULL,
           custom_exercise_id = '${customId}',
           target_weight_kg = 19.5,
           notes = 'Custom note',
           target_metadata = '{"grip":"neutral"}'::jsonb
       WHERE id = (
         SELECT pp.id
         FROM program_prescriptions pp
         JOIN catalog_exercises ce ON ce.id = pp.catalog_exercise_id
         WHERE pp.owner_firebase_uid = 'member-custom'
           AND pp.revision_id = '${ownProgram.revisionId}'
           AND ce.slug = 'dumbbell-curl'
         ORDER BY pp.display_order
         LIMIT 1
       );`,
    );
    await raw.exec("SET session_replication_role = origin;");

    const read = await repository.getActiveProgram(viewer("member-custom"), ownProgram.id);
    const customRead = read.days
      .flatMap((day) => day.prescriptions)
      .find((prescription) => prescription.customExerciseId === customId);
    expect(customRead).toMatchObject({
      catalogExerciseId: null,
      customExerciseId: customId,
      targetWeightKg: 19.5,
      notes: "Custom note",
      targetMetadata: { grip: "neutral" },
      exercise: {
        id: customId,
        slug: "member-row",
        name: "Member row",
        kind: "custom",
        requiredEquipment: ["dumbbells"],
      },
      customExercise: {
        id: customId,
        exerciseKey: "member-row",
        equipmentIds: ["dumbbells"],
        instructions: "Keep the elbow close.",
      },
    });

    const changed = await repository.confirmEquipmentChange(viewer("member-custom"), {
      programId: ownProgram.id,
      baseRevisionId: ownProgram.revisionId,
      equipmentProfileKind: "barbell",
      idempotencyKey: "custom-compatible-change",
    });
    const changedProgram = changed.activeProgram;
    if (!changedProgram) throw new Error("equipment change removed the active program");
    const customPreserved = changedProgram.days
      .flatMap((day) => day.prescriptions)
      .find((prescription) => prescription.customExerciseId === customId);
    expect(customPreserved).toMatchObject({
      catalogExerciseId: null,
      customExerciseId: customId,
      targetWeightKg: 19.5,
      notes: "Custom note",
      targetMetadata: { grip: "neutral" },
      exercise: { kind: "custom", slug: "member-row" },
    });
  });

  it("returns stable validation for an incompatible custom exercise without writes", async () => {
    const { database, raw } = await openDatabase();
    const repository = createProfileProgramRepository(database);
    const own = await repository.onboard(viewer("member-custom-incompatible"), {
      equipmentProfileKind: "barbell",
    });
    const ownProgram = own.activeProgram;
    if (!ownProgram) throw new Error("onboarding did not create an active program");
    const customId = "22222222-2222-5222-8222-222222222222";

    await raw.exec("SET session_replication_role = replica;");
    await raw.exec(
      `INSERT INTO custom_exercises (id, owner_firebase_uid, exercise_key, name, logging_kind)
       VALUES ('${customId}', 'member-custom-incompatible', 'rack-row', 'Rack row', 'weight_reps');
       INSERT INTO custom_exercise_equipment (owner_firebase_uid, custom_exercise_id, equipment_id)
       VALUES ('member-custom-incompatible', '${customId}', 'barbell');
       UPDATE program_prescriptions
       SET catalog_exercise_id = NULL, custom_exercise_id = '${customId}'
       WHERE id = (
         SELECT pp.id
         FROM program_prescriptions pp
         JOIN catalog_exercises ce ON ce.id = pp.catalog_exercise_id
         WHERE pp.owner_firebase_uid = 'member-custom-incompatible'
           AND pp.revision_id = '${ownProgram.revisionId}'
           AND ce.slug = 'dumbbell-curl'
         ORDER BY pp.display_order
         LIMIT 1
       );`,
    );
    await raw.exec("SET session_replication_role = origin;");

    await expect(
      repository.confirmEquipmentChange(viewer("member-custom-incompatible"), {
        programId: ownProgram.id,
        baseRevisionId: ownProgram.revisionId,
        equipmentProfileKind: "dumbbells",
        idempotencyKey: "custom-incompatible-change",
      }),
    ).rejects.toBeInstanceOf(RepositoryValidationError);

    await expect(
      raw.query<{ revisions: string; active_revision_id: string; profile_kind: string }>(
        `SELECT
          (SELECT count(*)::text FROM program_revisions WHERE owner_firebase_uid = 'member-custom-incompatible' AND program_id = $1) AS revisions,
          (SELECT active_revision_id FROM user_programs WHERE owner_firebase_uid = 'member-custom-incompatible' AND id = $1) AS active_revision_id,
          (SELECT profile_kind FROM user_equipment_profiles WHERE owner_firebase_uid = 'member-custom-incompatible') AS profile_kind;`,
        [ownProgram.id],
      ),
    ).resolves.toMatchObject({
      rows: [
        {
          revisions: "1",
          active_revision_id: ownProgram.revisionId,
          profile_kind: "barbell",
        },
      ],
    });
  });

  it("preserves a compatible nonstarter catalog exercise instead of using template position", async () => {
    const { database, raw } = await openDatabase();
    const repository = createProfileProgramRepository(database);
    const own = await repository.onboard(viewer("member-nonstarter"), {
      equipmentProfileKind: "dumbbells",
    });
    const ownProgram = own.activeProgram;
    if (!ownProgram) throw new Error("onboarding did not create an active program");

    await raw.exec("SET session_replication_role = replica;");
    await raw.exec(
      `UPDATE program_prescriptions
       SET catalog_exercise_id = (SELECT id FROM catalog_exercises WHERE slug = 'dumbbell-curl')
       WHERE id = (
         SELECT pp.id
         FROM program_prescriptions pp
         JOIN catalog_exercises ce ON ce.id = pp.catalog_exercise_id
         WHERE pp.owner_firebase_uid = 'member-nonstarter'
           AND pp.revision_id = '${ownProgram.revisionId}'
           AND ce.slug = 'goblet-squat'
           AND pp.display_name = 'Heavy goblet squat'
         LIMIT 1
       );`,
    );
    await raw.exec("SET session_replication_role = origin;");

    const changed = await repository.confirmEquipmentChange(viewer("member-nonstarter"), {
      programId: ownProgram.id,
      baseRevisionId: ownProgram.revisionId,
      equipmentProfileKind: "barbell",
      idempotencyKey: "nonstarter-compatible-change",
    });
    const changedProgram = changed.activeProgram;
    if (!changedProgram) throw new Error("equipment change removed the active program");
    expect(changed.changes.some((change) => change.fromSlug === "dumbbell-curl")).toBe(false);
    expect(
      changedProgram.days
        .flatMap((day) => day.prescriptions)
        .some(
          (prescription) =>
            prescription.exercise.slug === "dumbbell-curl" &&
            prescription.displayName === "Heavy goblet squat",
        ),
    ).toBe(true);
  });

  it("supports concurrent identical onboarding calls without duplicate owner rows", async () => {
    const { database, raw } = await openDatabase();
    const repository = createProfileProgramRepository(database);
    const results = await Promise.all(
      Array.from({ length: 3 }, () =>
        repository.onboard(viewer("member-concurrent"), {
          equipmentProfileKind: "barbell",
          idempotencyKey: "concurrent-onboarding",
        }),
      ),
    );
    expect(results[0]).toEqual(results[1]);
    expect(results[1]).toEqual(results[2]);
    await expect(
      raw.query<{ profiles: string; preferences: string; equipment: string; programs: string }>(
        `SELECT
          (SELECT count(*)::text FROM user_profiles WHERE firebase_uid = 'member-concurrent') AS profiles,
          (SELECT count(*)::text FROM user_preferences WHERE owner_firebase_uid = 'member-concurrent') AS preferences,
          (SELECT count(*)::text FROM user_equipment_profiles WHERE owner_firebase_uid = 'member-concurrent') AS equipment,
          (SELECT count(*)::text FROM user_programs WHERE owner_firebase_uid = 'member-concurrent') AS programs;`,
      ),
    ).resolves.toMatchObject({
      rows: [{ profiles: "1", preferences: "1", equipment: "1", programs: "1" }],
    });
  });
});
