import { readFile } from "node:fs/promises";

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterEach, describe, expect, it } from "vitest";

import type { Database } from "@/db/client";
import { schema } from "@/db/schema";
import { seedStarterDatabase } from "@/db/starter-seed";
import {
  createProfileProgramRepository,
  RepositoryNotFoundError,
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
      equipmentProfileKind: "barbell",
      idempotencyKey: "equipment-a",
    });
    const replay = await repository.confirmEquipmentChange(viewer("member-a"), {
      programId: ownProgram.id,
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
          cleared: ["targetWeightKg", "targetDistanceM"],
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
       SET target_weight_kg = 22.5, notes = 'Reroute this note'
       WHERE owner_firebase_uid = 'member-values'
         AND revision_id = '${ownProgram.revisionId}'
         AND catalog_exercise_id = (SELECT id FROM catalog_exercises WHERE slug = 'goblet-squat');`,
    );
    await raw.exec("SET session_replication_role = origin;");

    const changed = await repository.confirmEquipmentChange(viewer("member-values"), {
      programId: ownProgram.id,
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
    expect(rerouted).toMatchObject({ targetWeightKg: null, targetDistanceM: null, notes: "Reroute this note" });
    const oldRows = await raw.query<{ target_weight_kg: string | null; notes: string | null }>(
      "SELECT target_weight_kg, notes FROM program_prescriptions WHERE owner_firebase_uid = 'member-values' AND revision_id = $1 AND catalog_exercise_id = (SELECT id FROM catalog_exercises WHERE slug = 'goblet-squat');",
      [ownProgram.revisionId],
    );
    expect(oldRows.rows).toHaveLength(2);
    expect(oldRows.rows).toEqual([
      { target_weight_kg: "22.500", notes: "Reroute this note" },
      { target_weight_kg: "22.500", notes: "Reroute this note" },
    ]);
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
