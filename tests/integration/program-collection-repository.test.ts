import { readFile } from "node:fs/promises";

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterEach, describe, expect, it } from "vitest";

import type { Database } from "@/db/client";
import { schema } from "@/db/schema";
import { seedStarterDatabase } from "@/db/starter-seed";
import type { ProgramPublishInput } from "@/domain/programs/publication";
import { AuthPolicyError } from "@/server/auth/policy";
import type { ViewerContext } from "@/server/auth/viewer";
import { createCustomExercise } from "@/server/repositories/custom-exercises";
import {
  type ActiveProgramReadModel,
  createProfileProgramRepository,
  RepositoryConflictError,
  RepositoryNotFoundError,
  RepositoryValidationError,
} from "@/server/repositories/profile-program";
import { startOrResumeWorkout } from "@/server/repositories/workout-repository";

const migrationUrls = [
  new URL("../../drizzle/0000_initial.sql", import.meta.url),
  new URL("../../drizzle/0001_account_deletion_saga.sql", import.meta.url),
  new URL("../../drizzle/0002_workout_canonical_measurements.sql", import.meta.url),
  new URL("../../drizzle/0003_program_collection.sql", import.meta.url),
] as const;
const openDatabases: PGlite[] = [];

function viewer(uid: string, eligibleForPermanentMutations = true): ViewerContext {
  return {
    authTimeSeconds: 1_787_681_000,
    displayName: `Athlete ${uid}`,
    eligibleForPermanentMutations,
    email: `${uid}@example.test`,
    emailVerified: eligibleForPermanentMutations,
    provider: "password",
    uid,
  };
}

function publicationInput(
  program: ActiveProgramReadModel,
  idempotencyKey: string,
): ProgramPublishInput {
  return {
    baseRevisionId: program.revisionId,
    days: program.days.map((day) => ({
      cardio: day.cardio.map((cardio) => ({
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
        kind: section.kind as "accessory" | "core" | "strength",
        prescriptions: section.prescriptions.map((prescription) => ({
          catalogExerciseId: prescription.catalogExerciseId,
          customExerciseId: prescription.customExerciseId,
          displayName: prescription.displayName,
          maximumReps: prescription.maximumReps,
          maximumSeconds: prescription.maximumSeconds,
          minimumReps: prescription.minimumReps,
          minimumSeconds: prescription.minimumSeconds,
          notes: prescription.notes,
          restSeconds: prescription.restSeconds,
          setCount: prescription.setCount,
          setKind: prescription.setKind,
          sourcePrescriptionId: prescription.id,
          targetDistanceM: prescription.targetDistanceM,
          targetWeightKg: prescription.targetWeightKg,
        })),
        title: section.title,
      })),
    })) as ProgramPublishInput["days"],
    idempotencyKey,
    name: program.name,
    programId: program.id,
  };
}

async function openDatabase(): Promise<{ database: Database; raw: PGlite }> {
  const raw = new PGlite();
  await raw.waitReady;
  for (const migrationUrl of migrationUrls) {
    await raw.exec(await readFile(migrationUrl, "utf8"));
  }
  openDatabases.push(raw);
  const database = drizzle(raw, { schema }) as unknown as Database;
  await seedStarterDatabase(database);
  return { database, raw };
}

afterEach(async () => {
  await Promise.all(openDatabases.splice(0).map((database) => database.close()));
});

describe("owned program collection repository", () => {
  it("creates, clones, and activates complete programs without rewriting source meaning", async () => {
    const { database, raw } = await openDatabase();
    const repository = createProfileProgramRepository(database);
    const initial = await repository.onboard(viewer("collection-owner"), {
      equipmentProfileKind: "dumbbells",
      idempotencyKey: "collection-onboard",
    });
    const original = initial.activeProgram;
    if (!original) throw new Error("fixture program missing");

    expect(initial.programs).toEqual([
      expect.objectContaining({
        id: original.id,
        isActive: true,
        revisionId: original.revisionId,
      }),
    ]);

    const originalGraph = await raw.query<{ value: unknown }>(
      `SELECT jsonb_build_object(
        'root', (SELECT to_jsonb(p) FROM user_programs p WHERE p.id = $1),
        'revision', (SELECT to_jsonb(r) FROM program_revisions r WHERE r.id = $2),
        'days', (SELECT jsonb_agg(to_jsonb(d) ORDER BY d.day_number) FROM program_days d WHERE d.revision_id = $2),
        'sections', (SELECT jsonb_agg(to_jsonb(s) ORDER BY s.day_id, s.display_order) FROM program_sections s WHERE s.revision_id = $2),
        'prescriptions', (SELECT jsonb_agg(to_jsonb(p) ORDER BY p.section_id, p.display_order) FROM program_prescriptions p WHERE p.revision_id = $2),
        'cardio', (SELECT jsonb_agg(to_jsonb(c) ORDER BY c.day_id, c.mode) FROM program_cardio_prescriptions c WHERE c.revision_id = $2)
      ) AS value;`,
      [original.id, original.revisionId],
    );

    const created = await repository.createProgramFromStarter(
      viewer("collection-owner"),
      {
        equipmentProfileKind: "barbell",
        idempotencyKey: "create-barbell-route",
        name: "Barbell build",
      },
    );
    expect(created).toMatchObject({
      affectedProgramId: created.activeProgram?.id,
      affectedRevisionId: created.activeProgram?.revisionId,
      replayed: false,
    });
    expect(created.activeProgram).toMatchObject({
      equipmentProfileKind: "barbell",
      id: created.affectedProgramId,
      name: "Barbell build",
      revisionNumber: 1,
    });
    expect(created.activeProgram?.days).toHaveLength(5);
    expect(created.programs).toHaveLength(2);
    expect(created.programs.filter(({ isActive }) => isActive)).toHaveLength(1);
    expect(created.equipment.profileKind).toBe("barbell");

    const custom = await createCustomExercise(
      database,
      viewer("collection-owner"),
      {
        draft: {
          aliases: ["Owner press"],
          equipmentIds: ["dumbbells"],
          instructions: "Owner-only clone fidelity fixture.",
          loggingKind: "weight_reps",
          name: "Private press",
          videoUrls: [],
        },
        idempotencyKey: "create-private-press",
      },
    );
    const sourceDraft = publicationInput(
      created.activeProgram!,
      "publish-private-program-source",
    );
    const sourceWithCustom: ProgramPublishInput = {
      ...sourceDraft,
      days: sourceDraft.days.map((day, dayIndex) => ({
        ...day,
        sections: day.sections.map((section, sectionIndex) => ({
          ...section,
          prescriptions: section.prescriptions.map(
            (prescription, prescriptionIndex) =>
              dayIndex === 0 &&
              sectionIndex === 0 &&
              prescriptionIndex === 0
                ? {
                    ...prescription,
                    catalogExerciseId: null,
                    customExerciseId: custom.exercise.id,
                    displayName: "Private press",
                    notes: "Retain this owner-scoped note in the clone.",
                    targetWeightKg: 22.5,
                  }
                : prescription,
          ),
        })),
      })) as ProgramPublishInput["days"],
    };
    const publishedSource = await repository.publishProgram(
      viewer("collection-owner"),
      sourceWithCustom,
    );
    const source = publishedSource.activeProgram!;
    const cloned = await repository.cloneProgram(viewer("collection-owner"), {
      idempotencyKey: "clone-barbell-route",
      name: "Barbell build copy",
      sourceProgramId: source.id,
      sourceRevisionId: source.revisionId,
    });
    const clone = await repository.getActiveProgram(
      viewer("collection-owner"),
      cloned.affectedProgramId,
    );
    expect(clone).toMatchObject({
      equipmentProfileKind: "barbell",
      name: "Barbell build copy",
      revisionNumber: 1,
    });
    expect(clone.days.map(({ dayKey }) => dayKey)).toEqual(
      source.days.map(({ dayKey }) => dayKey),
    );
    expect(clone.days.flatMap(({ prescriptions }) => prescriptions.map(({ label }) => label))).toEqual(
      source.days.flatMap(({ prescriptions }) => prescriptions.map(({ label }) => label)),
    );
    expect(
      clone.days
        .flatMap(({ prescriptions }) => prescriptions)
        .find(({ customExerciseId }) => customExerciseId === custom.exercise.id),
    ).toMatchObject({
      customExerciseId: custom.exercise.id,
      notes: "Retain this owner-scoped note in the clone.",
      targetWeightKg: 22.5,
    });
    expect(clone.days.map(({ id }) => id)).not.toEqual(source.days.map(({ id }) => id));
    expect(
      clone.days.flatMap(({ prescriptions }) => prescriptions.map(({ id }) => id)),
    ).not.toEqual(
      source.days.flatMap(({ prescriptions }) => prescriptions.map(({ id }) => id)),
    );

    const activated = await repository.activateProgram(viewer("collection-owner"), {
      expectedActiveProgramId: clone.id,
      idempotencyKey: "activate-original-route",
      programId: original.id,
      revisionId: original.revisionId,
    });
    expect(activated.activeProgram?.id).toBe(original.id);
    expect(activated.equipment.profileKind).toBe("dumbbells");
    expect(activated.programs).toHaveLength(3);
    expect(activated.programs.filter(({ isActive }) => isActive)).toEqual([
      expect.objectContaining({ id: original.id }),
    ]);

    const sourceAfter = await raw.query<{ value: unknown }>(
      `SELECT jsonb_build_object(
        'root', (SELECT to_jsonb(p) FROM user_programs p WHERE p.id = $1),
        'revision', (SELECT to_jsonb(r) FROM program_revisions r WHERE r.id = $2),
        'days', (SELECT jsonb_agg(to_jsonb(d) ORDER BY d.day_number) FROM program_days d WHERE d.revision_id = $2),
        'sections', (SELECT jsonb_agg(to_jsonb(s) ORDER BY s.day_id, s.display_order) FROM program_sections s WHERE s.revision_id = $2),
        'prescriptions', (SELECT jsonb_agg(to_jsonb(p) ORDER BY p.section_id, p.display_order) FROM program_prescriptions p WHERE p.revision_id = $2),
        'cardio', (SELECT jsonb_agg(to_jsonb(c) ORDER BY c.day_id, c.mode) FROM program_cardio_prescriptions c WHERE c.revision_id = $2)
      ) AS value;`,
      [original.id, original.revisionId],
    );
    expect(sourceAfter.rows[0]?.value).toEqual({
      ...(originalGraph.rows[0]?.value as Record<string, unknown>),
      root: expect.objectContaining({ is_active: true }),
    });
  });

  it("keeps collection writes replay-safe, verified, current, and owner-scoped", async () => {
    const { database } = await openDatabase();
    const repository = createProfileProgramRepository(database);
    const alice = await repository.onboard(viewer("collection-alice"), {
      equipmentProfileKind: "dumbbells",
    });
    const bob = await repository.onboard(viewer("collection-bob"), {
      equipmentProfileKind: "barbell",
    });
    const aliceProgram = alice.activeProgram!;
    const bobProgram = bob.activeProgram!;
    const input = {
      equipmentProfileKind: "barbell" as const,
      idempotencyKey: "alice-create-replay",
      name: "Alice barbell route",
    };

    const created = await repository.createProgramFromStarter(
      viewer("collection-alice"),
      input,
    );
    const replay = await repository.createProgramFromStarter(
      viewer("collection-alice"),
      input,
    );
    expect(replay.affectedProgramId).toBe(created.affectedProgramId);
    expect(replay.programs).toHaveLength(2);

    const reactivatedOriginal = await repository.activateProgram(
      viewer("collection-alice"),
      {
        expectedActiveProgramId: created.affectedProgramId,
        idempotencyKey: "reactivate-alice-original",
        programId: aliceProgram.id,
        revisionId: aliceProgram.revisionId,
      },
    );
    expect(reactivatedOriginal.activeProgram?.id).toBe(aliceProgram.id);
    const replayAfterSwitch = await repository.createProgramFromStarter(
      viewer("collection-alice"),
      input,
    );
    expect(replayAfterSwitch.affectedProgramId).toBe(created.affectedProgramId);
    expect(replayAfterSwitch.affectedRevisionId).toBe(created.affectedRevisionId);
    expect(replayAfterSwitch.activeProgram?.id).toBe(aliceProgram.id);
    expect(replayAfterSwitch.replayed).toBe(true);

    const concurrentCloneInput = {
      idempotencyKey: "concurrent-alice-clone",
      name: "Concurrent copy",
      sourceProgramId: aliceProgram.id,
      sourceRevisionId: aliceProgram.revisionId,
    };
    const [concurrentCloneA, concurrentCloneB] = await Promise.all([
      repository.cloneProgram(viewer("collection-alice"), concurrentCloneInput),
      repository.cloneProgram(viewer("collection-alice"), concurrentCloneInput),
    ]);
    expect(concurrentCloneB.affectedProgramId).toBe(
      concurrentCloneA.affectedProgramId,
    );
    expect(concurrentCloneB.programs).toHaveLength(3);
    expect(concurrentCloneB.programs.filter(({ isActive }) => isActive)).toEqual([
      expect.objectContaining({ id: concurrentCloneA.affectedProgramId }),
    ]);
    await expect(
      startOrResumeWorkout(database, viewer("collection-alice"), {
        dayId: aliceProgram.days[0]!.id,
        idempotencyKey: "inactive-program-start",
        programId: aliceProgram.id,
      }),
    ).rejects.toMatchObject({ code: "not_found" });

    const cloneReactivatedOriginal = await repository.activateProgram(
      viewer("collection-alice"),
      {
        expectedActiveProgramId: concurrentCloneA.affectedProgramId,
        idempotencyKey: "reactivate-original-after-clone",
        programId: aliceProgram.id,
        revisionId: aliceProgram.revisionId,
      },
    );
    const cloneReplayAfterSwitch = await repository.cloneProgram(
      viewer("collection-alice"),
      concurrentCloneInput,
    );
    expect(cloneReplayAfterSwitch).toMatchObject({
      activeProgram: { id: cloneReactivatedOriginal.affectedProgramId },
      affectedProgramId: concurrentCloneA.affectedProgramId,
      affectedRevisionId: concurrentCloneA.affectedRevisionId,
      replayed: true,
    });

    const activatedClone = await repository.activateProgram(viewer("collection-alice"), {
      expectedActiveProgramId: aliceProgram.id,
      idempotencyKey: "activate-clone-replay-target",
      programId: concurrentCloneA.affectedProgramId,
      revisionId: concurrentCloneA.affectedRevisionId,
    });
    await repository.activateProgram(viewer("collection-alice"), {
      expectedActiveProgramId: concurrentCloneA.affectedProgramId,
      idempotencyKey: "reactivate-original-after-activation",
      programId: aliceProgram.id,
      revisionId: aliceProgram.revisionId,
    });
    const activationReplayAfterSwitch = await repository.activateProgram(
      viewer("collection-alice"),
      {
        expectedActiveProgramId: aliceProgram.id,
        idempotencyKey: "activate-clone-replay-target",
        programId: concurrentCloneA.affectedProgramId,
        revisionId: concurrentCloneA.affectedRevisionId,
      },
    );
    expect(activationReplayAfterSwitch).toMatchObject({
      activeProgram: { id: aliceProgram.id },
      affectedProgramId: activatedClone.affectedProgramId,
      affectedRevisionId: activatedClone.affectedRevisionId,
      replayed: true,
    });

    await expect(
      repository.createProgramFromStarter(viewer("collection-alice"), {
        ...input,
        name: "Changed replay",
      }),
    ).rejects.toBeInstanceOf(RepositoryConflictError);
    await expect(
      repository.createProgramFromStarter(viewer("collection-alice", false), {
        equipmentProfileKind: "dumbbells",
        idempotencyKey: "unverified-create",
        name: "Not allowed",
      }),
    ).rejects.toBeInstanceOf(AuthPolicyError);
    await expect(
      repository.cloneProgram(viewer("collection-alice"), {
        idempotencyKey: "foreign-clone",
        name: "Foreign copy",
        sourceProgramId: bobProgram.id,
        sourceRevisionId: bobProgram.revisionId,
      }),
    ).rejects.toBeInstanceOf(RepositoryNotFoundError);
    await expect(
      repository.cloneProgram(viewer("collection-alice"), {
        idempotencyKey: "stale-source-clone",
        name: "Stale copy",
        sourceProgramId: aliceProgram.id,
        sourceRevisionId: "00000000-0000-4000-8000-000000000999",
      }),
    ).rejects.toBeInstanceOf(RepositoryConflictError);
    await expect(
      repository.activateProgram(viewer("collection-alice"), {
        expectedActiveProgramId: concurrentCloneA.affectedProgramId,
        idempotencyKey: "stale-activation",
        programId: aliceProgram.id,
        revisionId: aliceProgram.revisionId,
      }),
    ).rejects.toBeInstanceOf(RepositoryConflictError);
    await expect(
      repository.confirmEquipmentChange(viewer("collection-alice"), {
        baseRevisionId: concurrentCloneA.affectedRevisionId,
        equipmentProfileKind: "barbell",
        idempotencyKey: "inactive-equipment-change",
        programId: concurrentCloneA.affectedProgramId,
      }),
    ).rejects.toBeInstanceOf(RepositoryConflictError);
  });

  it("refuses a twenty-fifth owned program before writing a partial root", async () => {
    const { database, raw } = await openDatabase();
    const repository = createProfileProgramRepository(database);
    await repository.onboard(viewer("collection-limit"), {
      equipmentProfileKind: "dumbbells",
    });
    const values = Array.from({ length: 23 }, (_, index) => {
      const suffix = String(index + 200).padStart(12, "0");
      return `('00000000-0000-4000-8000-${suffix}', 'collection-limit', 'limit-${index}', 'Limit ${index}')`;
    }).join(",\n");
    await raw.exec(`
      INSERT INTO user_programs (id, owner_firebase_uid, program_key, name)
      VALUES ${values};
    `);

    await expect(
      repository.createProgramFromStarter(viewer("collection-limit"), {
        equipmentProfileKind: "barbell",
        idempotencyKey: "over-program-limit",
        name: "One too many",
      }),
    ).rejects.toBeInstanceOf(RepositoryValidationError);
    const count = await raw.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM user_programs WHERE owner_firebase_uid = 'collection-limit';",
    );
    expect(count.rows).toEqual([{ count: "24" }]);
  });
});
