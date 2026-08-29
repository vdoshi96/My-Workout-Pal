import { readFile } from "node:fs/promises";

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterEach, describe, expect, it } from "vitest";

import type { Database } from "@/db/client";
import { schema } from "@/db/schema";
import { seedStarterDatabase } from "@/db/starter-seed";
import { programEditorCanonicalValue } from "@/components/program/program-editor-model";
import type { ProgramPublishInput } from "@/domain/programs/publication";
import {
  createProfileProgramRepository,
  RepositoryConflictError,
  RepositoryNotFoundError,
  RepositoryValidationError,
} from "@/server/repositories/profile-program";
import type { ViewerContext } from "@/server/auth/viewer";

const migrationUrl = new URL("../../drizzle/0000_initial.sql", import.meta.url);
const deletionMigrationUrl = new URL("../../drizzle/0001_account_deletion_saga.sql", import.meta.url);
const workoutMigrationUrl = new URL("../../drizzle/0002_workout_canonical_measurements.sql", import.meta.url);
const programCollectionMigrationUrl = new URL("../../drizzle/0003_program_collection.sql", import.meta.url);
const personalRecordMigrationUrl = new URL("../../drizzle/0004_personal_record_projection_checkpoint.sql", import.meta.url);
const flexibleTopologyMigrationUrl = new URL("../../drizzle/0005_flexible_routine_topology.sql", import.meta.url);
const cardioDisplayOrderMigrationUrl = new URL("../../drizzle/0006_program_cardio_display_order.sql", import.meta.url);
const personalGuidanceMigrationUrl = new URL("../../drizzle/0007_personal_guidance.sql", import.meta.url);
const openDatabases: PGlite[] = [];

async function openDatabase(): Promise<{ raw: PGlite; database: Database }> {
  const raw = new PGlite();
  await raw.waitReady;
  await raw.exec(await readFile(migrationUrl, "utf8"));
  await raw.exec(await readFile(deletionMigrationUrl, "utf8"));
  await raw.exec(await readFile(workoutMigrationUrl, "utf8"));
  await raw.exec(await readFile(programCollectionMigrationUrl, "utf8"));
  await raw.exec(await readFile(personalRecordMigrationUrl, "utf8"));
  await raw.exec(await readFile(flexibleTopologyMigrationUrl, "utf8"));
  await raw.exec(await readFile(cardioDisplayOrderMigrationUrl, "utf8"));
  await raw.exec(await readFile(personalGuidanceMigrationUrl, "utf8"));
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

function publishInputFromProgram(
  program: NonNullable<Awaited<ReturnType<ReturnType<typeof createProfileProgramRepository>["getViewerData"]>>["activeProgram"]>,
  overrides: Partial<Pick<ProgramPublishInput, "idempotencyKey" | "name">> = {},
): ProgramPublishInput {
  return {
    baseRevisionId: program.revisionId,
    idempotencyKey: overrides.idempotencyKey ?? "publish-program-1",
    name: overrides.name ?? program.name,
    programId: program.id,
    days: program.days.map((day) => ({
      cardio: day.cardio.map((cardio) => ({
        cardioKey: cardio.cardioKey,
        distanceM: cardio.distanceM,
        durationSeconds: cardio.durationSeconds,
        inclinePercent: cardio.inclinePercent,
        mode: cardio.mode,
        notes: cardio.notes,
        paceSecondsPerKm: cardio.paceSecondsPerKm,
      })) as ProgramPublishInput["days"][number]["cardio"],
      dayKey: day.dayKey as ProgramPublishInput["days"][number]["dayKey"],
      dayNumber: day.dayNumber,
      displayName: day.displayName,
      sections: day.sections.map((section) => ({
        kind: section.kind as "strength" | "accessory" | "core",
        sectionKey: section.sectionKey,
        title: section.title,
        prescriptions: section.prescriptions.map((prescription) => ({
          catalogExerciseId: prescription.catalogExerciseId,
          customExerciseId: prescription.customExerciseId,
          displayName: prescription.displayName,
          maximumReps: prescription.maximumReps,
          maximumSeconds: prescription.maximumSeconds,
          minimumReps: prescription.minimumReps,
          minimumSeconds: prescription.minimumSeconds,
          notes: prescription.notes,
          prescriptionKey: prescription.prescriptionKey,
          restSeconds: prescription.restSeconds,
          setCount: prescription.setCount,
          setKind: prescription.setKind,
          sourcePrescriptionId: prescription.id,
          targetDistanceM: prescription.targetDistanceM,
          targetWeightKg: prescription.targetWeightKg,
        })),
      })),
    })) as ProgramPublishInput["days"],
  };
}

afterEach(async () => {
  await Promise.all(openDatabases.splice(0).map((database) => database.close()));
});

describe("profile and active-program repository", () => {
  it("publishes an edited immutable revision with owner, compatibility, conflict, and replay gates", async () => {
    const { database, raw } = await openDatabase();
    const repository = createProfileProgramRepository(database);
    const initial = await repository.onboard(viewer("member-editor"), {
      equipmentProfileKind: "dumbbells",
    });
    const source = initial.activeProgram;
    if (!source) throw new Error("onboarding did not create an active program");
    const oldGraph = await raw.query<{ value: unknown }>(
      `SELECT jsonb_build_object(
        'revision', (SELECT to_jsonb(r) FROM program_revisions r WHERE r.id = $1),
        'days', (SELECT jsonb_agg(to_jsonb(d) ORDER BY d.day_number) FROM program_days d WHERE d.revision_id = $1),
        'sections', (SELECT jsonb_agg(to_jsonb(s) ORDER BY s.day_id, s.display_order) FROM program_sections s WHERE s.revision_id = $1),
        'prescriptions', (SELECT jsonb_agg(to_jsonb(p) ORDER BY p.section_id, p.display_order) FROM program_prescriptions p WHERE p.revision_id = $1),
        'cardio', (SELECT jsonb_agg(to_jsonb(c) ORDER BY c.day_id, c.mode) FROM program_cardio_prescriptions c WHERE c.revision_id = $1)
      ) AS value;`,
      [source.revisionId],
    );
    const input = publishInputFromProgram(source, {
      idempotencyKey: "publish-editor-1",
      name: "My durable route",
    });
    const imperialDistanceM = programEditorCanonicalValue("0.1", "distance", "imperial");
    if (imperialDistanceM === null) throw new Error("imperial distance conversion failed");
    const firstSection = input.days[0]!.sections[0]!;
    const edited: ProgramPublishInput = {
      ...input,
      days: input.days.map((day, dayIndex) =>
        dayIndex === 0
          ? {
              ...day,
              cardio: day.cardio
                .map((cardio, cardioIndex) =>
                  cardioIndex === 0 ? { ...cardio, distanceM: imperialDistanceM } : cardio,
                )
                .reverse() as ProgramPublishInput["days"][number]["cardio"],
              sections: day.sections.map((section, sectionIndex) =>
                sectionIndex === 0
                  ? {
                      ...section,
                      prescriptions: [...firstSection.prescriptions]
                        .reverse()
                        .map((prescription, prescriptionIndex) =>
                          prescriptionIndex === 0
                            ? { ...prescription, notes: "Edited in the immutable publisher.", restSeconds: 120 }
                            : prescription,
                        ),
                    }
                  : section,
              ),
            }
          : day,
      ) as ProgramPublishInput["days"],
    };

    const published = await repository.publishProgram(viewer("member-editor"), edited);
    const replay = await repository.publishProgram(viewer("member-editor"), edited);
    expect(published.replayed).toBe(false);
    expect(replay).toEqual({ ...published, replayed: true });
    await expect(
      repository.publishProgram(viewer("member-editor"), {
        ...edited,
        name: "Changed replay content",
      }),
    ).rejects.toBeInstanceOf(RepositoryConflictError);
    expect(published.activeProgram).toMatchObject({
      name: "My durable route",
      revisionNumber: 2,
      equipmentProfileKind: "dumbbells",
    });
    expect(
      published.activeProgram?.days[0]?.cardio.find(
        ({ cardioKey }) => cardioKey === source.days[0]!.cardio[0]!.cardioKey,
      )?.distanceM,
    ).toBe(160.934);
    expect(published.activeProgram?.days[0]?.cardio.map(({ mode }) => mode)).toEqual(
      [...source.days[0]!.cardio].reverse().map(({ mode }) => mode),
    );
    expect(
      published.activeProgram?.days[0]?.sections[0]?.prescriptions.map(({ id, notes, restSeconds }) => ({ id, notes, restSeconds })),
    ).toEqual(
      [...source.days[0]!.sections[0]!.prescriptions]
        .reverse()
        .map((prescription, index) => ({
          id: expect.not.stringMatching(new RegExp(`^${prescription.id}$`)),
          notes: index === 0 ? "Edited in the immutable publisher." : prescription.notes,
          restSeconds: index === 0 ? 120 : prescription.restSeconds,
        })),
    );
    expect(published.activeProgram?.days[0]?.dayKey).toBe(source.days[0]?.dayKey);
    expect(published.activeProgram?.days[0]?.sections.map(({ sectionKey }) => sectionKey)).toEqual(
      source.days[0]?.sections.map(({ sectionKey }) => sectionKey),
    );
    expect(
      published.activeProgram?.days[0]?.sections[0]?.prescriptions.map(
        ({ prescriptionKey }) => prescriptionKey,
      ),
    ).toEqual(
      [...source.days[0]!.sections[0]!.prescriptions]
        .reverse()
        .map(({ prescriptionKey }) => prescriptionKey),
    );
    expect(published.activeProgram?.days[0]?.cardio.map(({ cardioKey }) => cardioKey)).toEqual(
      [...source.days[0]!.cardio].reverse().map(({ cardioKey }) => cardioKey),
    );
    await expect(
      raw.query<{ value: unknown }>(
        `SELECT jsonb_build_object(
          'revision', (SELECT to_jsonb(r) FROM program_revisions r WHERE r.id = $1),
          'days', (SELECT jsonb_agg(to_jsonb(d) ORDER BY d.day_number) FROM program_days d WHERE d.revision_id = $1),
          'sections', (SELECT jsonb_agg(to_jsonb(s) ORDER BY s.day_id, s.display_order) FROM program_sections s WHERE s.revision_id = $1),
          'prescriptions', (SELECT jsonb_agg(to_jsonb(p) ORDER BY p.section_id, p.display_order) FROM program_prescriptions p WHERE p.revision_id = $1),
          'cardio', (SELECT jsonb_agg(to_jsonb(c) ORDER BY c.day_id, c.mode) FROM program_cardio_prescriptions c WHERE c.revision_id = $1)
        ) AS value;`,
        [source.revisionId],
      ),
    ).resolves.toEqual(oldGraph);

    await expect(
      repository.publishProgram(viewer("member-editor"), {
        ...edited,
        idempotencyKey: "publish-editor-stale",
        name: "Stale overwrite",
      }),
    ).rejects.toBeInstanceOf(RepositoryConflictError);
    await expect(
      repository.publishProgram(viewer("member-editor", false), {
        ...edited,
        baseRevisionId: published.activeProgram!.revisionId,
        idempotencyKey: "publish-editor-unverified",
      }),
    ).rejects.toMatchObject({ code: "email_unverified" });
    await expect(
      repository.publishProgram(viewer("member-editor"), {
        ...edited,
        idempotencyKey: "publish-editor-excess-distance-precision",
        days: edited.days.map((day, dayIndex) =>
          dayIndex === 0
            ? {
                ...day,
                cardio: day.cardio.map((cardio, cardioIndex) =>
                  cardioIndex === 0 ? { ...cardio, distanceM: 160.9345 } : cardio,
                ) as ProgramPublishInput["days"][number]["cardio"],
              }
            : day,
        ) as ProgramPublishInput["days"],
      }),
    ).rejects.toBeInstanceOf(RepositoryValidationError);

    const barbellExerciseId = (
      await raw.query<{ id: string }>("SELECT id FROM catalog_exercises WHERE slug = 'barbell-back-squat';")
    ).rows[0]!.id;
    const incompatible = publishInputFromProgram(published.activeProgram!, {
      idempotencyKey: "publish-editor-incompatible",
    });
    incompatible.days[0]!.sections[0]!.prescriptions[0] = {
      ...incompatible.days[0]!.sections[0]!.prescriptions[0]!,
      catalogExerciseId: barbellExerciseId,
      customExerciseId: null,
      sourcePrescriptionId: null,
    };
    await expect(
      repository.publishProgram(viewer("member-editor"), incompatible),
    ).rejects.toBeInstanceOf(RepositoryValidationError);

    const foreignCustomId = "66666666-6666-4666-8666-666666666666";
    await raw.exec(
      `INSERT INTO user_profiles (firebase_uid, display_name)
       VALUES ('member-editor-foreign', 'Foreign owner');
       INSERT INTO custom_exercises (
         id, owner_firebase_uid, exercise_key, name, logging_kind
       ) VALUES (
         '${foreignCustomId}', 'member-editor-foreign', 'foreign-row', 'Foreign row', 'weight_reps'
       );
       INSERT INTO custom_exercise_equipment (
         owner_firebase_uid, custom_exercise_id, equipment_id
       ) VALUES (
         'member-editor-foreign', '${foreignCustomId}', 'dumbbells'
       );`,
    );
    const foreign = publishInputFromProgram(published.activeProgram!, {
      idempotencyKey: "publish-editor-foreign",
    });
    foreign.days[0]!.sections[0]!.prescriptions[0] = {
      ...foreign.days[0]!.sections[0]!.prescriptions[0]!,
      catalogExerciseId: null,
      customExerciseId: foreignCustomId,
      sourcePrescriptionId: null,
    };
    await expect(
      repository.publishProgram(viewer("member-editor"), foreign),
    ).rejects.toBeInstanceOf(RepositoryNotFoundError);
    await expect(
      raw.query<{ count: string }>(
        "SELECT count(*)::text AS count FROM program_revisions WHERE owner_firebase_uid = 'member-editor';",
      ),
    ).resolves.toMatchObject({ rows: [{ count: "2" }] });

    const other = await repository.createProgramFromStarter(viewer("member-editor"), {
      equipmentProfileKind: "barbell",
      idempotencyKey: "activate-other-after-publish",
      name: "Other active route",
    });
    const replayAfterSwitch = await repository.publishProgram(viewer("member-editor"), edited);
    expect(replayAfterSwitch).toMatchObject({
      activeProgram: { id: other.affectedProgramId },
      affectedProgramId: source.id,
      affectedRevisionId: published.affectedRevisionId,
      replayed: true,
    });
  });
  it("onboards one complete dumbbell profile and replays stably", async () => {
    const { database, raw } = await openDatabase();
    const repository = createProfileProgramRepository(database);
    const first = await repository.onboard(viewer("member-a"), {
      equipmentProfileKind: "dumbbells",
      unitSystem: "imperial",
      timezone: "America/Chicago",
      reducedMotion: true,
      idempotencyKey: "onboarding-a",
      mode: "example",
    });
    const second = await repository.onboard(viewer("member-a"), {
      equipmentProfileKind: "dumbbells",
      unitSystem: "imperial",
      timezone: "America/Chicago",
      reducedMotion: true,
      idempotencyKey: "onboarding-a",
      mode: "example",
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

  it("onboards one minimal blank graph with owner-scoped replay and mode mismatch protection", async () => {
    const { database, raw } = await openDatabase();
    const repository = createProfileProgramRepository(database);
    const first = await repository.onboard(viewer("member-blank"), {
      equipmentProfileKind: "barbell",
      idempotencyKey: "onboarding-blank",
      mode: "blank",
    });
    const replay = await repository.onboard(viewer("member-blank"), {
      equipmentProfileKind: "barbell",
      idempotencyKey: "onboarding-blank",
      mode: "blank",
    });

    expect(replay).toEqual(first);
    expect(first.profile.firebaseUid).toBe("member-blank");
    expect(first.equipment.profileKind).toBe("barbell");
    expect(first.activeProgram).toMatchObject({
      days: [{
        cardio: [],
        displayName: "Day 1",
        sections: [{ title: "Main work" }],
      }],
      name: "Blank routine",
      sourceTemplateRevisionId: null,
      status: "published",
    });
    expect(first.activeProgram?.days[0]?.prescriptions).toHaveLength(1);
    expect(first.activeProgram?.days[0]?.prescriptions[0]?.exercise.slug).toBe("dead-bug");

    await expect(
      repository.onboard(viewer("member-blank"), {
        equipmentProfileKind: "barbell",
        idempotencyKey: "onboarding-blank",
        mode: "example",
      }),
    ).rejects.toBeInstanceOf(RepositoryConflictError);

    await expect(raw.query<{
      days: string;
      idempotency: string;
      prescriptions: string;
      programs: string;
      revisions: string;
      sections: string;
    }>(`SELECT
      (SELECT count(*)::text FROM user_programs WHERE owner_firebase_uid = 'member-blank') AS programs,
      (SELECT count(*)::text FROM program_revisions WHERE owner_firebase_uid = 'member-blank') AS revisions,
      (SELECT count(*)::text FROM program_days WHERE owner_firebase_uid = 'member-blank') AS days,
      (SELECT count(*)::text FROM program_sections WHERE owner_firebase_uid = 'member-blank') AS sections,
      (SELECT count(*)::text FROM program_prescriptions WHERE owner_firebase_uid = 'member-blank') AS prescriptions,
      (SELECT count(*)::text FROM idempotency_keys WHERE owner_firebase_uid = 'member-blank') AS idempotency;`))
      .resolves.toMatchObject({ rows: [{
        days: "1",
        idempotency: "1",
        prescriptions: "1",
        programs: "1",
        revisions: "1",
        sections: "1",
      }] });

    const foreign = await repository.onboard(viewer("member-blank-other"), {
      equipmentProfileKind: "barbell",
      idempotencyKey: "onboarding-blank",
      mode: "blank",
    });
    expect(foreign.profile.firebaseUid).toBe("member-blank-other");
    expect(foreign.activeProgram?.id).not.toBe(first.activeProgram?.id);
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

    expect(changed.replayed).toBe(false);
    expect(replay).toEqual({ ...changed, replayed: true });
    expect(changed.equipment.profileKind).toBe("barbell");
    const changedProgram = changed.activeProgram;
    if (!changedProgram) throw new Error("equipment change removed the active program");
    expect(changedProgram.revisionNumber).toBe(2);
    expect(changedProgram.days.map(({ dayKey }) => dayKey)).toEqual(
      ownProgram.days.map(({ dayKey }) => dayKey),
    );
    expect(
      changedProgram.days.flatMap(({ sections }) =>
        sections.map(({ sectionKey }) => sectionKey),
      ),
    ).toEqual(
      ownProgram.days.flatMap(({ sections }) =>
        sections.map(({ sectionKey }) => sectionKey),
      ),
    );
    expect(
      changedProgram.days.flatMap(({ prescriptions }) =>
        prescriptions.map(({ prescriptionKey }) => prescriptionKey),
      ),
    ).toEqual(
      ownProgram.days.flatMap(({ prescriptions }) =>
        prescriptions.map(({ prescriptionKey }) => prescriptionKey),
      ),
    );
    expect(
      changedProgram.days.flatMap(({ cardio }) => cardio.map(({ cardioKey }) => cardioKey)),
    ).toEqual(
      ownProgram.days.flatMap(({ cardio }) => cardio.map(({ cardioKey }) => cardioKey)),
    );
    expect(changedProgram.days.map(({ id }) => id)).not.toEqual(
      ownProgram.days.map(({ id }) => id),
    );
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

    const other = await repository.createProgramFromStarter(viewer("member-a"), {
      equipmentProfileKind: "dumbbells",
      idempotencyKey: "activate-other-after-equipment",
      name: "Other active route",
    });
    const replayAfterSwitch = await repository.confirmEquipmentChange(viewer("member-a"), {
      programId: ownProgram.id,
      baseRevisionId: ownProgram.revisionId,
      equipmentProfileKind: "barbell",
      idempotencyKey: "equipment-a",
    });
    expect(replayAfterSwitch).toMatchObject({
      activeProgram: { id: other.affectedProgramId },
      affectedProgramId: ownProgram.id,
      affectedRevisionId: changedProgram.revisionId,
      replayed: true,
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
