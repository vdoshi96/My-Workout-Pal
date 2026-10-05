import { readFile } from "node:fs/promises";

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterEach, describe, expect, it } from "vitest";

import type { Database } from "@/db/client";
import { schema } from "@/db/schema";
import { seedStarterDatabase } from "@/db/starter-seed";
import {
  parseGeneratedProgramResponse,
  parseOnboardingResponse,
} from "@/components/program/program-mutation-response";
import {
  generateStarterRoutine,
  type TrainingProfileAnswers,
} from "@/domain/programs/generate-routine";
import type { ViewerContext } from "@/server/auth/viewer";
import {
  createProfileProgramRepository,
  RepositoryConflictError,
  RepositoryNotFoundError,
  RepositoryValidationError,
  type ActiveProgramReadModel,
} from "@/server/repositories/profile-program";

const drizzleRoot = new URL("../../drizzle/", import.meta.url);
const openDatabases: PGlite[] = [];

async function openDatabase(): Promise<{ raw: PGlite; database: Database }> {
  const journal = JSON.parse(
    await readFile(new URL("meta/_journal.json", drizzleRoot), "utf8"),
  ) as { entries: readonly { idx: number; tag: string }[] };
  const raw = new PGlite();
  await raw.waitReady;
  openDatabases.push(raw);
  for (const { tag } of [...journal.entries].sort((left, right) => left.idx - right.idx)) {
    await raw.exec(await readFile(new URL(`${tag}.sql`, drizzleRoot), "utf8"));
  }
  const database = drizzle(raw, { schema }) as unknown as Database;
  await seedStarterDatabase(database);
  return { raw, database };
}

afterEach(async () => {
  await Promise.all(openDatabases.splice(0).map((database) => database.close()));
});

function viewer(uid: string, eligibleForPermanentMutations = true): ViewerContext {
  return {
    uid,
    displayName: `Member ${uid}`,
    email: `${uid}@example.test`,
    emailVerified: eligibleForPermanentMutations,
    provider: "password",
    authTimeSeconds: 1_787_681_000,
    eligibleForPermanentMutations,
  };
}

const fatLossAnswers: TrainingProfileAnswers = { goal: "fat_loss", experience: "some", daysPerWeek: 3 };
const strengthAnswers: TrainingProfileAnswers = { goal: "strength", experience: "lots", daysPerWeek: 4 };

function routineShape(program: ActiveProgramReadModel) {
  return {
    name: program.name,
    days: program.days.map((day) => ({
      name: day.displayName,
      sections: day.sections.map((section) => ({
        kind: section.kind,
        title: section.title,
        movements: section.prescriptions.map((prescription) => ({
          slug: prescription.exercise.slug,
          setCount: prescription.setCount,
          minimumReps: prescription.minimumReps,
          maximumReps: prescription.maximumReps,
          minimumSeconds: prescription.minimumSeconds,
          maximumSeconds: prescription.maximumSeconds,
          restSeconds: prescription.restSeconds,
          targetWeightKg: prescription.targetWeightKg,
        })),
      })),
      cardio: day.cardio.map((cardio) => ({ mode: cardio.mode, durationSeconds: cardio.durationSeconds })),
    })),
  };
}

function expectedShape(answers: TrainingProfileAnswers, equipment: "dumbbells" | "barbell", name?: string) {
  const routine = generateStarterRoutine({ ...answers, equipment });
  return {
    name: name ?? routine.name,
    days: routine.days.map((day) => ({
      name: day.name,
      sections: day.sections.map((section) => ({
        kind: section.kind,
        title: section.title,
        movements: section.movements.map((movement) => ({
          slug: movement.exerciseSlug,
          setCount: movement.setCount,
          minimumReps: movement.minimumReps,
          maximumReps: movement.maximumReps,
          minimumSeconds: movement.minimumSeconds,
          maximumSeconds: movement.maximumSeconds,
          restSeconds: movement.restSeconds,
          targetWeightKg: null,
        })),
      })),
      cardio: day.cardio.map((cardio) => ({ mode: cardio.mode, durationSeconds: cardio.durationSeconds })),
    })),
  };
}

async function generatedOnboarding(
  database: Database,
  uid: string,
  answers: TrainingProfileAnswers = fatLossAnswers,
  idempotencyKey = `${uid}-onboard`,
) {
  return createProfileProgramRepository(database).onboard(viewer(uid), {
    equipmentProfileKind: "dumbbells",
    idempotencyKey,
    mode: "generated",
    reducedMotion: false,
    timezone: "UTC",
    trainingProfile: answers,
    unitSystem: "metric",
  });
}

async function ownerRowCounts(raw: PGlite, uid: string) {
  const result = await raw.query<Record<string, number>>(`
    SELECT
      (SELECT count(*)::int FROM user_programs WHERE owner_firebase_uid = $1) AS programs,
      (SELECT count(*)::int FROM program_revisions WHERE owner_firebase_uid = $1) AS revisions,
      (SELECT count(*)::int FROM program_days WHERE owner_firebase_uid = $1) AS days,
      (SELECT count(*)::int FROM program_prescriptions WHERE owner_firebase_uid = $1) AS prescriptions,
      (SELECT count(*)::int FROM program_cardio_prescriptions WHERE owner_firebase_uid = $1) AS cardio,
      (SELECT count(*)::int FROM user_training_profiles WHERE owner_firebase_uid = $1) AS training;
  `, [uid]);
  return result.rows[0]!;
}

describe("generated onboarding", () => {
  it("creates the generated routine and saves the answers in one step", async () => {
    const { database, raw } = await openDatabase();
    const result = await generatedOnboarding(database, "alice");

    expect(result.trainingProfile).toMatchObject(fatLossAnswers);
    expect(result.trainingProfile?.updatedAt).toEqual(expect.any(String));
    expect(result.equipment).toEqual({ profileKind: "dumbbells" });
    expect(result.programs).toHaveLength(1);
    const program = result.activeProgram!;
    expect(program.programKey).toBe("generated-routine");
    expect(program.revisionNumber).toBe(1);
    expect(program.sourceTemplateRevisionId).toBeNull();
    expect(routineShape(program)).toEqual(expectedShape(fatLossAnswers, "dumbbells"));
    expect(
      program.days.flatMap((day) => day.prescriptions).every(({ targetWeightKg }) => targetWeightKg === null),
    ).toBe(true);

    // The member-facing parser accepts the exact server response.
    expect(parseOnboardingResponse({ mode: "generated", profileProgram: result }, {
      equipmentProfileKind: "dumbbells",
      mode: "generated",
      reducedMotion: false,
      timezone: "UTC",
      trainingProfile: fatLossAnswers,
      unitSystem: "metric",
    }).id).toBe(program.id);

    expect(await ownerRowCounts(raw, "alice")).toMatchObject({ programs: 1, revisions: 1, days: 3, training: 1 });
  });

  it("replays the same request without new rows and rejects a changed request under the same key", async () => {
    const { database, raw } = await openDatabase();
    const first = await generatedOnboarding(database, "alice");
    const before = await ownerRowCounts(raw, "alice");
    const replay = await generatedOnboarding(database, "alice");
    expect(replay).toEqual(first);
    expect(await ownerRowCounts(raw, "alice")).toEqual(before);

    await expect(
      generatedOnboarding(database, "alice", strengthAnswers),
    ).rejects.toBeInstanceOf(RepositoryConflictError);
    await expect(
      generatedOnboarding(database, "alice", strengthAnswers, "alice-onboard-second-key"),
    ).rejects.toBeInstanceOf(RepositoryConflictError);
    expect(await ownerRowCounts(raw, "alice")).toEqual(before);
  });

  it("requires answers for generated mode and rejects extra or ownership fields", async () => {
    const { database, raw } = await openDatabase();
    const repository = createProfileProgramRepository(database);
    await expect(repository.onboard(viewer("alice"), {
      equipmentProfileKind: "dumbbells",
      mode: "generated",
    })).rejects.toBeInstanceOf(RepositoryValidationError);
    await expect(repository.onboard(viewer("alice"), {
      equipmentProfileKind: "dumbbells",
      mode: "generated",
      trainingProfile: { ...fatLossAnswers, ownerFirebaseUid: "bob" } as TrainingProfileAnswers,
    })).rejects.toBeInstanceOf(RepositoryValidationError);
    await expect(repository.onboard(viewer("alice"), {
      equipmentProfileKind: "dumbbells",
      mode: "generated",
      ownerFirebaseUid: "bob",
      trainingProfile: fatLossAnswers,
    } as never)).rejects.toBeInstanceOf(RepositoryValidationError);
    await expect(repository.onboard(viewer("alice"), {
      equipmentProfileKind: "dumbbells",
      mode: "generated",
      trainingProfile: { ...fatLossAnswers, daysPerWeek: 6 } as unknown as TrainingProfileAnswers,
    })).rejects.toBeInstanceOf(RepositoryValidationError);
    expect(await ownerRowCounts(raw, "alice")).toMatchObject({ programs: 0, training: 0 });
  });

  it("keeps example and blank onboarding unchanged and without answers", async () => {
    const { database } = await openDatabase();
    const repository = createProfileProgramRepository(database);
    const example = await repository.onboard(viewer("example-member"), {
      equipmentProfileKind: "barbell",
      idempotencyKey: "example-onboard",
      mode: "example",
    });
    expect(example.activeProgram?.programKey).toBe("five-day-starter-route");
    expect(example.trainingProfile).toBeNull();

    const blank = await repository.onboard(viewer("blank-member"), {
      equipmentProfileKind: "dumbbells",
      firstExerciseSlug: "goblet-squat",
      idempotencyKey: "blank-onboard",
      mode: "blank",
    });
    expect(blank.activeProgram?.programKey).toBe("blank-routine");
    expect(blank.trainingProfile).toBeNull();
  });

  it("can keep the answers when the member starts from a blank routine instead", async () => {
    const { database } = await openDatabase();
    const blank = await createProfileProgramRepository(database).onboard(viewer("blank-member"), {
      equipmentProfileKind: "dumbbells",
      firstExerciseSlug: "goblet-squat",
      idempotencyKey: "blank-onboard",
      mode: "blank",
      trainingProfile: strengthAnswers,
    });
    expect(blank.activeProgram?.programKey).toBe("blank-routine");
    expect(blank.trainingProfile).toMatchObject(strengthAnswers);
  });
});

describe("training profile updates", () => {
  it("creates answers for a member who onboarded before answers existed, then updates them optimistically", async () => {
    const { database, raw } = await openDatabase();
    const repository = createProfileProgramRepository(database);
    const onboarded = await repository.onboard(viewer("legacy"), { equipmentProfileKind: "dumbbells" });
    const activeBefore = onboarded.activeProgram!;

    const created = await repository.updateTrainingProfile(viewer("legacy"), {
      expectedUpdatedAt: null,
      idempotencyKey: "legacy-answers-1",
      trainingProfile: fatLossAnswers,
    });
    expect(created.trainingProfile).toMatchObject(fatLossAnswers);
    const replay = await repository.updateTrainingProfile(viewer("legacy"), {
      expectedUpdatedAt: null,
      idempotencyKey: "legacy-answers-1",
      trainingProfile: fatLossAnswers,
    });
    expect(replay.trainingProfile).toEqual(created.trainingProfile);

    await expect(repository.updateTrainingProfile(viewer("legacy"), {
      expectedUpdatedAt: null,
      idempotencyKey: "legacy-answers-1",
      trainingProfile: strengthAnswers,
    })).rejects.toBeInstanceOf(RepositoryConflictError);
    await expect(repository.updateTrainingProfile(viewer("legacy"), {
      expectedUpdatedAt: null,
      idempotencyKey: "legacy-answers-stale-create",
      trainingProfile: strengthAnswers,
    })).rejects.toBeInstanceOf(RepositoryConflictError);
    await expect(repository.updateTrainingProfile(viewer("legacy"), {
      expectedUpdatedAt: "2020-01-01T00:00:00.000Z",
      idempotencyKey: "legacy-answers-stale-update",
      trainingProfile: strengthAnswers,
    })).rejects.toBeInstanceOf(RepositoryConflictError);

    const updated = await repository.updateTrainingProfile(viewer("legacy"), {
      expectedUpdatedAt: created.trainingProfile!.updatedAt,
      idempotencyKey: "legacy-answers-2",
      trainingProfile: strengthAnswers,
    });
    expect(updated.trainingProfile).toMatchObject(strengthAnswers);
    expect(Date.parse(updated.trainingProfile!.updatedAt)).toBeGreaterThan(
      Date.parse(created.trainingProfile!.updatedAt),
    );
    // Changing answers never rewrites the active routine.
    expect(updated.activeProgram).toEqual(activeBefore);
    expect(await ownerRowCounts(raw, "legacy")).toMatchObject({ programs: 1, revisions: 1, training: 1 });
  });

  it("rejects ownership fields and unverified members", async () => {
    const { database } = await openDatabase();
    const repository = createProfileProgramRepository(database);
    await generatedOnboarding(database, "alice");
    await expect(repository.updateTrainingProfile(viewer("alice"), {
      expectedUpdatedAt: null,
      idempotencyKey: "alice-owner-field",
      ownerFirebaseUid: "bob",
      trainingProfile: strengthAnswers,
    } as never)).rejects.toBeInstanceOf(RepositoryValidationError);
    await expect(repository.updateTrainingProfile(viewer("alice"), {
      expectedUpdatedAt: null,
      idempotencyKey: "alice-nested-owner",
      trainingProfile: { ...strengthAnswers, ownerFirebaseUid: "bob" } as TrainingProfileAnswers,
    })).rejects.toBeInstanceOf(RepositoryValidationError);
    await expect(repository.updateTrainingProfile(viewer("alice", false), {
      expectedUpdatedAt: null,
      idempotencyKey: "alice-unverified",
      trainingProfile: strengthAnswers,
    })).rejects.toMatchObject({ code: "email_unverified" });
  });

  it("keeps each member's answers private to that member", async () => {
    const { database } = await openDatabase();
    const repository = createProfileProgramRepository(database);
    const alice = await generatedOnboarding(database, "alice");
    const bob = await repository.onboard(viewer("bob"), { equipmentProfileKind: "barbell" });
    expect(bob.trainingProfile).toBeNull();

    // Bob presenting Alice's timestamp cannot touch Alice's row; he only
    // ever addresses his own (absent) row and gets a conflict.
    await expect(repository.updateTrainingProfile(viewer("bob"), {
      expectedUpdatedAt: alice.trainingProfile!.updatedAt,
      idempotencyKey: "bob-foreign-timestamp",
      trainingProfile: strengthAnswers,
    })).rejects.toBeInstanceOf(RepositoryConflictError);
    // Reusing Alice's idempotency key is scoped to Bob and does not replay Alice's result.
    const bobCreated = await repository.updateTrainingProfile(viewer("bob"), {
      expectedUpdatedAt: null,
      idempotencyKey: "alice-onboard",
      trainingProfile: strengthAnswers,
    });
    expect(bobCreated.trainingProfile).toMatchObject(strengthAnswers);
    expect((await repository.getViewerData(viewer("alice"))).trainingProfile).toEqual(alice.trainingProfile);
    expect((await repository.getViewerData(viewer("bob"))).trainingProfile).toEqual(bobCreated.trainingProfile);

    await expect(repository.updateTrainingProfile(viewer("nobody"), {
      expectedUpdatedAt: null,
      idempotencyKey: "nobody-answers",
      trainingProfile: strengthAnswers,
    })).rejects.toBeInstanceOf(RepositoryNotFoundError);
  });
});

describe("building a new routine from answers", () => {
  it("adds a generated routine to the collection, optionally making it active, with replay", async () => {
    const { database, raw } = await openDatabase();
    const repository = createProfileProgramRepository(database);
    const onboarded = await generatedOnboarding(database, "alice");
    const originalActive = onboarded.activeProgram!;

    const inactive = await repository.createProgramFromAnswers(viewer("alice"), {
      activate: false,
      equipmentProfileKind: "barbell",
      idempotencyKey: "alice-build-1",
      trainingProfile: strengthAnswers,
    });
    expect(inactive.replayed).toBe(false);
    expect(inactive.programs).toHaveLength(2);
    expect(inactive.activeProgram?.id).toBe(originalActive.id);
    const created = inactive.programs.find(({ id }) => id === inactive.affectedProgramId)!;
    expect(created).toMatchObject({ isActive: false, name: "4-day upper and lower", dayCount: 4, equipmentProfileKind: "barbell" });
    // Equipment and answers stay as they were until the member activates it.
    expect(inactive.equipment).toEqual({ profileKind: "dumbbells" });
    expect(inactive.trainingProfile).toEqual(onboarded.trainingProfile);
    expect(parseGeneratedProgramResponse({ profileProgram: inactive }, {
      activate: false,
      equipmentProfileKind: "barbell",
    }).affectedProgramId).toBe(created.id);
    const createdModel = await repository.getActiveProgram(viewer("alice"), created.id);
    expect(routineShape(createdModel)).toEqual(expectedShape(strengthAnswers, "barbell"));

    const replay = await repository.createProgramFromAnswers(viewer("alice"), {
      activate: false,
      equipmentProfileKind: "barbell",
      idempotencyKey: "alice-build-1",
      trainingProfile: strengthAnswers,
    });
    expect(replay).toEqual({ ...inactive, replayed: true });
    await expect(repository.createProgramFromAnswers(viewer("alice"), {
      activate: true,
      equipmentProfileKind: "barbell",
      idempotencyKey: "alice-build-1",
      trainingProfile: strengthAnswers,
    })).rejects.toBeInstanceOf(RepositoryConflictError);

    const active = await repository.createProgramFromAnswers(viewer("alice"), {
      activate: true,
      equipmentProfileKind: "barbell",
      idempotencyKey: "alice-build-2",
      name: "My gym plan",
      trainingProfile: strengthAnswers,
    });
    expect(active.activeProgram?.id).toBe(active.affectedProgramId);
    expect(active.activeProgram?.name).toBe("My gym plan");
    expect(active.equipment).toEqual({ profileKind: "barbell" });
    expect(routineShape(active.activeProgram!)).toEqual(expectedShape(strengthAnswers, "barbell", "My gym plan"));
    // History is untouched: the original routine still has its single revision.
    expect((await repository.getActiveProgram(viewer("alice"), originalActive.id)).revisionId)
      .toBe(originalActive.revisionId);
    expect(await ownerRowCounts(raw, "alice")).toMatchObject({ programs: 3, revisions: 3 });
  });

  it("respects the 24-routine cap and keeps other members' collections apart", async () => {
    const { database, raw } = await openDatabase();
    const repository = createProfileProgramRepository(database);
    await generatedOnboarding(database, "alice");
    await repository.onboard(viewer("bob"), { equipmentProfileKind: "dumbbells" });
    for (let index = 1; index < 24; index += 1) {
      await repository.createProgramFromAnswers(viewer("alice"), {
        activate: false,
        equipmentProfileKind: "dumbbells",
        idempotencyKey: `alice-fill-${index}`,
        trainingProfile: fatLossAnswers,
      });
    }
    await expect(repository.createProgramFromAnswers(viewer("alice"), {
      activate: false,
      equipmentProfileKind: "dumbbells",
      idempotencyKey: "alice-over-cap",
      trainingProfile: fatLossAnswers,
    })).rejects.toBeInstanceOf(RepositoryValidationError);
    expect(await ownerRowCounts(raw, "alice")).toMatchObject({ programs: 24 });

    const bobBuilt = await repository.createProgramFromAnswers(viewer("bob"), {
      activate: false,
      equipmentProfileKind: "dumbbells",
      idempotencyKey: "alice-fill-1",
      trainingProfile: fatLossAnswers,
    });
    expect(bobBuilt.replayed).toBe(false);
    expect(bobBuilt.programs).toHaveLength(2);
    expect(bobBuilt.profile.firebaseUid).toBe("bob");
  });

  it("rejects ownership fields and incomplete answers", async () => {
    const { database } = await openDatabase();
    const repository = createProfileProgramRepository(database);
    await generatedOnboarding(database, "alice");
    await expect(repository.createProgramFromAnswers(viewer("alice"), {
      activate: false,
      equipmentProfileKind: "dumbbells",
      idempotencyKey: "alice-owner",
      ownerFirebaseUid: "bob",
      trainingProfile: fatLossAnswers,
    } as never)).rejects.toBeInstanceOf(RepositoryValidationError);
    await expect(repository.createProgramFromAnswers(viewer("alice"), {
      activate: false,
      equipmentProfileKind: "dumbbells",
      idempotencyKey: "alice-partial",
      trainingProfile: { goal: "sport", experience: "new" } as TrainingProfileAnswers,
    })).rejects.toBeInstanceOf(RepositoryValidationError);
  });
});
