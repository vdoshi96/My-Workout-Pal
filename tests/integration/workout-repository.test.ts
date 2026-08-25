import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq, sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import type { Database } from "@/db/client";
import {
  catalogExercises,
  customExercises,
  customExerciseEquipment,
  programCardioPrescriptions,
  programDays,
  programPrescriptions,
  programRevisions,
  programSections,
  userProfiles,
  userEquipmentProfiles,
  idempotencyKeys,
  setLogs,
  workoutExerciseSnapshots,
  workoutExerciseStates,
  workoutSessions,
  userPrograms,
  schema,
} from "@/db/schema";
import { seedStarterDatabase } from "@/db/starter-seed";
import type { WorkoutMeasurement } from "@/domain/analytics";
import type { RunnerOperation } from "@/domain/workout-runner";
import { buildStarterDatabaseRows } from "@/domain/seed/starter-database-rows";
import type { ViewerContext } from "@/server/auth/viewer";
import {
  WorkoutRepositoryError,
  createWorkoutRepository,
} from "@/server/repositories/workout-repository";

const migrationUrl = new URL("../../drizzle/0000_initial.sql", import.meta.url);
const upgradeMigrationUrl = new URL("../../drizzle/0001_workout_canonical_measurements.sql", import.meta.url);
const openDatabases: PGlite[] = [];

async function openDatabase(): Promise<{ raw: PGlite; database: Database }> {
  const raw = new PGlite();
  await raw.waitReady;
  await raw.exec(await readFile(migrationUrl, "utf8"));
  await raw.exec(await readFile(upgradeMigrationUrl, "utf8"));
  openDatabases.push(raw);
  const database = drizzle(raw, { schema }) as unknown as Database;
  return { raw, database };
}

afterEach(async () => {
  await Promise.all(openDatabases.splice(0).map((database) => database.close()));
});

function viewer(uid: string, eligibleForPermanentMutations = true): ViewerContext {
  return {
    uid,
    displayName: uid,
    email: `${uid}@example.test`,
    emailVerified: eligibleForPermanentMutations,
    provider: "password",
    authTimeSeconds: 1,
    eligibleForPermanentMutations,
  };
}

type Fixture = Readonly<{
  database: Database;
  ownerUid: string;
  otherUid: string;
  programId: string;
  dayId: string;
  compatibleCustomId: string;
  barbellExerciseId: string;
}>;

async function createFixture(database: Database): Promise<Fixture> {
  // The fixture intentionally uses the real deterministic catalog/template
  // graph. Only owner/program rows are test-owned.
  await seedStarterDatabase(database);
  const rows = buildStarterDatabaseRows();
  const ownerUid = "workout-owner-a";
  const otherUid = "workout-owner-b";
  const sourceRevision = rows.programTemplateRevisions.find(
    ({ equipmentProfileKind }) => equipmentProfileKind === "dumbbells",
  )!;
  const sourceDays = rows.templateDays.filter(({ revisionId }) => revisionId === sourceRevision.id);
  const sourceSections = rows.templateSections.filter(({ revisionId }) => revisionId === sourceRevision.id);
  const sourcePrescriptions = rows.templatePrescriptions.filter(({ revisionId }) => revisionId === sourceRevision.id);
  const sourceCardio = rows.templateCardioPrescriptions.filter(({ revisionId }) => revisionId === sourceRevision.id);
  const programId = randomUUID();
  const revisionId = randomUUID();
  const dayIds = new Map(sourceDays.map(({ id }) => [id, randomUUID()] as const));
  const sectionIds = new Map(sourceSections.map(({ id }) => [id, randomUUID()] as const));
  const customId = randomUUID();
  const compatibleCustomId = randomUUID();
  const barbellExerciseId = rows.catalogExercises.find(({ slug }) => slug === "barbell-bench-press")!.id;

  await database.insert(userProfiles).values([
    { firebaseUid: ownerUid, displayName: "Owner A" },
    { firebaseUid: otherUid, displayName: "Owner B" },
  ]);
  await database.insert(userEquipmentProfiles).values({ ownerFirebaseUid: ownerUid, profileKind: "dumbbells" });
  await database.insert(customExercises).values([
    {
      id: customId,
      ownerFirebaseUid: ownerUid,
      exerciseKey: "custom-distance-run",
      name: "Custom distance run",
      loggingKind: "distance_duration",
    },
    {
      id: compatibleCustomId,
      ownerFirebaseUid: ownerUid,
      exerciseKey: "custom-dumbbell-row",
      name: "Custom dumbbell row",
      loggingKind: "weight_reps",
    },
  ]);
  await database.insert(customExerciseEquipment).values([
    { ownerFirebaseUid: ownerUid, customExerciseId: customId, equipmentId: "bodyweight" },
    { ownerFirebaseUid: ownerUid, customExerciseId: compatibleCustomId, equipmentId: "dumbbells" },
  ]);
  await database.insert(userPrograms).values({
    id: programId,
    ownerFirebaseUid: ownerUid,
    programKey: "fixture-program",
    name: "Fixture program",
  });
  await database.insert(programRevisions).values({
    id: revisionId,
    ownerFirebaseUid: ownerUid,
    programId,
    revisionNumber: 1,
    status: "draft",
    equipmentProfileKind: "dumbbells",
    sourceTemplateRevisionId: sourceRevision.id,
  });
  await database.insert(programDays).values(
    sourceDays.map((day) => ({
      id: dayIds.get(day.id)!,
      ownerFirebaseUid: ownerUid,
      programId,
      revisionId,
      dayNumber: day.dayNumber,
      dayKey: day.dayKey,
      displayName: day.displayName,
    })),
  );
  await database.insert(programSections).values(
    sourceSections.map((section) => ({
      id: sectionIds.get(section.id)!,
      ownerFirebaseUid: ownerUid,
      programId,
      revisionId,
      dayId: dayIds.get(section.dayId)!,
      kind: section.kind,
      displayOrder: section.displayOrder,
      title: section.title,
    })),
  );
  await database.insert(programPrescriptions).values([
    ...sourcePrescriptions.map((prescription) => ({
      id: randomUUID(),
      ownerFirebaseUid: ownerUid,
      programId,
      revisionId,
      sectionId: sectionIds.get(prescription.sectionId)!,
      catalogExerciseId: prescription.exerciseId,
      customExerciseId: null,
      displayName: prescription.displayName,
      displayOrder: prescription.displayOrder,
      setKind: prescription.setKind,
      setCount: prescription.setCount,
      measurementKind: prescription.measurementKind,
      minimumReps: prescription.minimumReps,
      maximumReps: prescription.maximumReps,
      minimumSeconds: prescription.minimumSeconds,
      maximumSeconds: prescription.maximumSeconds,
      restSeconds: prescription.restSeconds,
      targetWeightKg: prescription.targetWeightKg,
      targetDistanceM: prescription.targetDistanceM,
      notes: prescription.notes,
      targetMetadata: {},
    })),
    {
      id: randomUUID(),
      ownerFirebaseUid: ownerUid,
      programId,
      revisionId,
      sectionId: sectionIds.get(sourceSections.find(({ kind }) => kind === "core")!.id)!,
      catalogExerciseId: null,
      customExerciseId: customId,
      displayName: null,
      displayOrder: 3,
      setKind: "work",
      setCount: 1,
      measurementKind: "distance_duration",
      minimumReps: null,
      maximumReps: null,
      minimumSeconds: 30,
      maximumSeconds: 60,
      restSeconds: 30,
      targetWeightKg: null,
      targetDistanceM: 100,
      notes: null,
      targetMetadata: {},
    },
  ]);
  await database.insert(programCardioPrescriptions).values(
    sourceCardio.map((cardio) => ({
      id: randomUUID(),
      ownerFirebaseUid: ownerUid,
      programId,
      revisionId,
      dayId: dayIds.get(cardio.dayId)!,
      mode: cardio.mode,
      durationSeconds: cardio.durationSeconds,
      distanceM: cardio.distanceM,
      paceSecondsPerKm: cardio.paceSecondsPerKm,
      inclinePercent: cardio.inclinePercent,
      notes: cardio.notes,
    })),
  );
  await database
    .update(programRevisions)
    .set({ status: "published", publishedAt: new Date("2026-08-25T00:00:00.000Z") })
    .where(eq(programRevisions.id, revisionId));
  await database.update(userPrograms).set({ activeRevisionId: revisionId }).where(eq(userPrograms.id, programId));

  const pushDay = sourceDays.find(({ dayKey }) => dayKey === "push")!;
  // Verify the exercise fixture really contains all four canonical shapes.
  const exerciseKinds = await database
    .select({ loggingKind: catalogExercises.loggingKind })
    .from(catalogExercises);
  expect(new Set(exerciseKinds.map(({ loggingKind }) => loggingKind))).toEqual(
    new Set(["weight_reps", "bodyweight_reps", "duration"]),
  );
  return { database, ownerUid, otherUid, programId, dayId: dayIds.get(pushDay.id)!, compatibleCustomId, barbellExerciseId };
}

async function insertCompletedHistoricalOutcome(
  database: Database,
  fixture: Fixture,
  options: Readonly<{
    sourceSnapshotId: string;
    historicalSnapshotId: string;
    setCount: number;
    setPositions: readonly number[];
    completedAt: Date;
    weightKg?: number;
    repetitions?: number;
    effectiveCatalogExerciseId?: string;
    effectiveCustomExerciseId?: string;
  }>,
): Promise<void> {
  const program = await database
    .select({ activeRevisionId: userPrograms.activeRevisionId })
    .from(userPrograms)
    .where(eq(userPrograms.id, fixture.programId))
    .limit(1);
  const revisionId = program[0]?.activeRevisionId;
  if (!revisionId) throw new Error("fixture revision is missing");
  const sourceSnapshots = await database
    .select({
      catalogExerciseId: workoutExerciseSnapshots.catalogExerciseId,
      customExerciseId: workoutExerciseSnapshots.customExerciseId,
      displayName: workoutExerciseSnapshots.displayName,
      loggingKind: workoutExerciseSnapshots.loggingKind,
      minimumReps: workoutExerciseSnapshots.minimumReps,
      maximumReps: workoutExerciseSnapshots.maximumReps,
    })
    .from(workoutExerciseSnapshots)
    .where(eq(workoutExerciseSnapshots.id, options.sourceSnapshotId))
    .limit(1);
  const sourceSnapshot = sourceSnapshots[0];
  if (!sourceSnapshot) throw new Error("fixture snapshot is missing");
  const sessionId = randomUUID();
  const startedAt = new Date(options.completedAt.getTime() - 60_000);
  await database.insert(workoutSessions).values({
    id: sessionId,
    ownerFirebaseUid: fixture.ownerUid,
    programId: fixture.programId,
    programRevisionId: revisionId,
    state: "active",
    idempotencyKey: `historical-${sessionId}`,
    startedAt,
  });
  await database.insert(workoutExerciseSnapshots).values({
    id: options.historicalSnapshotId,
    ownerFirebaseUid: fixture.ownerUid,
    sessionId,
    position: 1,
    sectionKind: "strength",
    displayName: sourceSnapshot.displayName,
    loggingKind: sourceSnapshot.loggingKind,
    catalogExerciseId: sourceSnapshot.catalogExerciseId,
    customExerciseId: sourceSnapshot.customExerciseId,
    minimumReps: sourceSnapshot.minimumReps,
    maximumReps: sourceSnapshot.maximumReps,
    setCount: options.setCount,
    prescriptionSnapshot: {
      schemaVersion: 1,
      revisionId,
      dayId: fixture.dayId,
      dayName: "Push",
      setKind: "work",
      availableEquipment: ["dumbbells", "bodyweight", "bench"],
    },
  });
  const effectiveCatalogExerciseId = options.effectiveCustomExerciseId ? null : (options.effectiveCatalogExerciseId ?? sourceSnapshot.catalogExerciseId);
  const effectiveCustomExerciseId = options.effectiveCustomExerciseId ?? (options.effectiveCatalogExerciseId ? null : sourceSnapshot.customExerciseId);
  await database.insert(workoutExerciseStates).values({
    ownerFirebaseUid: fixture.ownerUid,
    sessionId,
    snapshotId: options.historicalSnapshotId,
    status: "pending",
    effectiveCatalogExerciseId,
    effectiveCustomExerciseId,
    effectiveDisplayName: sourceSnapshot.displayName,
    effectiveLoggingKind: sourceSnapshot.loggingKind,
    lastClientOperationId: `historical-create-${sessionId}`,
    version: 1,
  });
  await database.insert(setLogs).values(options.setPositions.map((setPosition) => ({
    ownerFirebaseUid: fixture.ownerUid,
    sessionId,
    snapshotId: options.historicalSnapshotId,
    setPosition,
    measurementKind: sourceSnapshot.loggingKind,
    setKind: "work" as const,
    weightKg: options.weightKg ?? 30,
    repetitions: options.repetitions ?? 9,
    clientIdempotencyKey: `historical-set-${sessionId}-${setPosition}`,
    recordedAt: new Date(options.completedAt.getTime() - 30_000),
  })));
  await database
    .update(workoutExerciseStates)
    .set({ status: "completed", version: 2, lastClientOperationId: `historical-complete-${sessionId}` })
    .where(eq(workoutExerciseStates.snapshotId, options.historicalSnapshotId));
  await database
    .update(workoutSessions)
    .set({ state: "completed", completedAt: options.completedAt })
    .where(eq(workoutSessions.id, sessionId));
}

async function insertCustomProgramForHistory(database: Database, fixture: Fixture): Promise<Readonly<{ programId: string; dayId: string }>> {
  const programId = randomUUID();
  const revisionId = randomUUID();
  const dayId = randomUUID();
  const sectionId = randomUUID();
  await database.insert(userPrograms).values({
    id: programId,
    ownerFirebaseUid: fixture.ownerUid,
    programKey: `replacement-history-${programId}`,
    name: "Replacement history program",
  });
  await database.insert(programRevisions).values({
    id: revisionId,
    ownerFirebaseUid: fixture.ownerUid,
    programId,
    revisionNumber: 1,
    status: "draft",
    equipmentProfileKind: "dumbbells",
  });
  await database.insert(programDays).values({
    id: dayId,
    ownerFirebaseUid: fixture.ownerUid,
    programId,
    revisionId,
    dayNumber: 1,
    dayKey: "replacement-history-day",
    displayName: "Replacement history day",
  });
  await database.insert(programSections).values({
    id: sectionId,
    ownerFirebaseUid: fixture.ownerUid,
    programId,
    revisionId,
    dayId,
    kind: "strength",
    displayOrder: 1,
    title: "Replacement",
  });
  await database.insert(programPrescriptions).values({
    id: randomUUID(),
    ownerFirebaseUid: fixture.ownerUid,
    programId,
    revisionId,
    sectionId,
    catalogExerciseId: null,
    customExerciseId: fixture.compatibleCustomId,
    displayName: null,
    displayOrder: 1,
    setKind: "work",
    setCount: 1,
    measurementKind: "weight_reps",
    minimumReps: 1,
    maximumReps: 12,
    minimumSeconds: null,
    maximumSeconds: null,
    restSeconds: 30,
    targetWeightKg: null,
    targetDistanceM: null,
    notes: null,
    targetMetadata: {},
  });
  await database
    .update(programRevisions)
    .set({ status: "published", publishedAt: new Date("2026-08-25T00:00:00.000Z") })
    .where(eq(programRevisions.id, revisionId));
  await database.update(userPrograms).set({ activeRevisionId: revisionId }).where(eq(userPrograms.id, programId));
  return { programId, dayId };
}

describe("owner-scoped workout repository", () => {
  it("requires a verified server viewer and hides foreign sessions as missing", async () => {
    const { database } = await openDatabase();
    const fixture = await createFixture(database);
    const repository = createWorkoutRepository(fixture.database);
    await expect(
      repository.startOrResume(viewer(fixture.ownerUid, false), {
        programId: fixture.programId,
        dayId: fixture.dayId,
        idempotencyKey: "start-unverified",
      }),
    ).rejects.toMatchObject({ code: "mutation_forbidden" });
    const started = await repository.startOrResume(viewer(fixture.ownerUid), {
      programId: fixture.programId,
      dayId: fixture.dayId,
      idempotencyKey: "start-owner",
    });
    await expect(
      repository.loadResume(viewer(fixture.otherUid), { sessionId: started.model.session.id }),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("maps malformed resource UUIDs to stable errors before typed database predicates", async () => {
    const { database } = await openDatabase();
    const fixture = await createFixture(database);
    const repository = createWorkoutRepository(fixture.database);
    await expect(repository.startOrResume(viewer(fixture.ownerUid), {
      programId: "not-a-uuid",
      dayId: fixture.dayId,
      idempotencyKey: "bad-program-id",
    })).rejects.toMatchObject({ code: "not_found" });
    await expect(repository.startOrResume(viewer(fixture.ownerUid), {
      programId: fixture.programId,
      dayId: "not-a-uuid",
      idempotencyKey: "bad-day-id",
    })).rejects.toMatchObject({ code: "not_found" });

    const started = await repository.startOrResume(viewer(fixture.ownerUid), {
      programId: fixture.programId,
      dayId: fixture.dayId,
      idempotencyKey: "valid-resource-session",
    });
    await expect(repository.loadResume(viewer(fixture.ownerUid), { sessionId: "not-a-uuid" }))
      .rejects.toMatchObject({ code: "not_found" });
    await expect(repository.submitOperation(viewer(fixture.ownerUid), {
      sessionId: "not-a-uuid",
      idempotencyKey: "bad-operation-session",
      kind: "abandon_session",
      payload: { kind: "abandon_session", sessionId: "not-a-uuid", reason: "bad id" },
    })).rejects.toMatchObject({ code: "not_found" });
    await expect(repository.submitOperation(viewer(fixture.ownerUid), {
      sessionId: started.model.session.id,
      idempotencyKey: "bad-exercise-id",
      kind: "save_note",
      expectedVersion: 1,
      payload: { kind: "save_note", exerciseId: "not-a-uuid", note: "bad id" },
    })).rejects.toMatchObject({ code: "not_found" });
    await expect(repository.submitOperation(viewer(fixture.ownerUid), {
      sessionId: started.model.session.id,
      idempotencyKey: "bad-set-snapshot-id",
      kind: "save_set",
      expectedVersion: 1,
      payload: {
        kind: "save_set",
        setId: "not-a-uuid:1",
        exerciseId: "not-a-uuid",
        phase: "work",
        measurement: { kind: "weight_reps", weightKg: 20, repetitions: 8 },
      },
    })).rejects.toMatchObject({ code: "not_found" });
    const target = started.model.snapshot.exercises.find(({ loggingKind }) => loggingKind === "weight_reps")!;
    await expect(repository.submitOperation(viewer(fixture.ownerUid), {
      sessionId: started.model.session.id,
      idempotencyKey: "bad-replacement-id",
      kind: "substitute_exercise",
      expectedVersion: 1,
      payload: {
        kind: "substitute_exercise",
        exerciseId: target.id,
        replacement: { id: "not-a-uuid", name: "spoof", loggingKind: "weight_reps" },
        reason: "bad id",
      },
    })).rejects.toMatchObject({ code: "not_found" });

    const runnerOperation: RunnerOperation = {
      idempotencyKey: "bad-runner-revision",
      kind: "complete_session",
      payload: { kind: "complete_session", sessionId: started.model.session.id },
      ownerUid: fixture.ownerUid,
      sessionId: started.model.session.id,
      baseRevision: "not-a-uuid",
      sequence: 1,
      createdAt: Date.now(),
      attempts: 0,
      status: "pending",
      persistedId: undefined,
      errorCode: undefined,
      errorMessage: undefined,
      retryable: undefined,
      failureKind: undefined,
    };
    await expect(repository.submitRunnerOperation(viewer(fixture.ownerUid), runnerOperation))
      .resolves.toMatchObject({ status: "failed", code: "not_found" });
    const malformedCursor = Buffer.from(JSON.stringify({
      occurredAt: new Date().toISOString(),
      sessionId: "not-a-uuid",
    }), "utf8").toString("base64url");
    await expect(repository.history(viewer(fixture.ownerUid), { cursor: malformedCursor }))
      .rejects.toMatchObject({ code: "invalid_request" });
  });

  it("atomically starts one snapshot and resumes it for duplicate/concurrent calls", async () => {
    const { database } = await openDatabase();
    const fixture = await createFixture(database);
    const repository = createWorkoutRepository(fixture.database);
    const first = await repository.startOrResume(viewer(fixture.ownerUid), {
      programId: fixture.programId,
      dayId: fixture.dayId,
      idempotencyKey: "start-one",
    });
    const second = await repository.startOrResume(viewer(fixture.ownerUid), {
      programId: fixture.programId,
      dayId: fixture.dayId,
      idempotencyKey: "start-two",
    });
    expect(second.resumed).toBe(true);
    expect(second.model.session.id).toBe(first.model.session.id);
    const count = await fixture.database.execute(sql`SELECT count(*)::int AS count FROM workout_sessions WHERE owner_firebase_uid = ${fixture.ownerUid}`);
    expect(Number((count as unknown as { rows: Array<{ count: number }> }).rows[0]?.count)).toBe(1);
    expect(first.model.snapshot.exercises.every((exercise) => exercise.sets.length > 0)).toBe(true);
    expect(first.model.snapshot.cardioOptions).toHaveLength(2);
    const persistedSnapshot = await fixture.database
      .select({ meaning: workoutExerciseSnapshots.prescriptionSnapshot })
      .from(workoutExerciseSnapshots)
      .where(eq(workoutExerciseSnapshots.sessionId, first.model.session.id))
      .limit(1);
    expect(persistedSnapshot[0]?.meaning).toMatchObject({
      equipmentProfileKind: "dumbbells",
      availableEquipment: ["dumbbells", "bodyweight", "bench"],
    });

    const concurrent = await Promise.all([
      repository.startOrResume(viewer(fixture.ownerUid), {
        programId: fixture.programId,
        dayId: fixture.dayId,
        idempotencyKey: "start-concurrent-a",
      }),
      repository.startOrResume(viewer(fixture.ownerUid), {
        programId: fixture.programId,
        dayId: fixture.dayId,
        idempotencyKey: "start-concurrent-b",
      }),
    ]);
    expect(new Set(concurrent.map(({ model }) => model.session.id))).toEqual(new Set([first.model.session.id]));
  });

  it("validates every measurement shape, bounds, hash replay, versions, terminal freeze, and history isolation", async () => {
    const { database } = await openDatabase();
    const fixture = await createFixture(database);
    const repository = createWorkoutRepository(fixture.database);
    const started = await repository.startOrResume(viewer(fixture.ownerUid), {
      programId: fixture.programId,
      dayId: fixture.dayId,
      idempotencyKey: "start-measurements",
    });
    const operation = (input: Parameters<typeof repository.submitOperation>[1]) => repository.submitOperation(viewer(fixture.ownerUid), input);
    const exerciseByKind = new Map(started.model.snapshot.exercises.map((exercise) => [exercise.loggingKind, exercise] as const));
    const versions = new Map(started.model.exerciseStates.map(({ snapshotId, version }) => [snapshotId, version] as const));
    const measurements: Readonly<Record<"weight_reps" | "bodyweight_reps" | "duration" | "distance_duration", WorkoutMeasurement>> = {
      weight_reps: { kind: "weight_reps", weightKg: 20, repetitions: 10 },
      bodyweight_reps: { kind: "bodyweight_reps", repetitions: 12, addedWeightKg: 5 },
      duration: { kind: "duration", durationSeconds: 30 },
      distance_duration: { kind: "distance_duration", distanceMeters: 100, durationSeconds: 45 },
    };
    for (const [kind, measurement] of Object.entries(measurements) as Array<[keyof typeof measurements, WorkoutMeasurement]>) {
      const exercise = exerciseByKind.get(kind);
      expect(exercise, `fixture has ${kind}`).toBeDefined();
      const set = exercise!.sets[0]!;
      const payload = { kind: "save_set" as const, setId: set.id, exerciseId: exercise!.id, phase: set.phase, measurement };
      const version = versions.get(exercise!.id)!;
      const saved = await operation({ sessionId: started.model.session.id, idempotencyKey: `set-${kind}`, kind: "save_set", expectedVersion: version, payload });
      expect(saved.status).toBe("saved");
      expect(saved.exerciseVersion).toBe(version + 1);
      versions.set(exercise!.id, saved.exerciseVersion!);
      const duplicate = await operation({ sessionId: started.model.session.id, idempotencyKey: `set-${kind}`, kind: "save_set", expectedVersion: version, payload });
      expect(duplicate.status).toBe("duplicate");
      const differentMeasurement = kind === "weight_reps"
        ? { ...measurement, weightKg: 21 }
        : kind === "bodyweight_reps"
          ? { ...measurement, repetitions: 13 }
          : kind === "duration"
            ? { ...measurement, durationSeconds: 31 }
            : { ...measurement, distanceMeters: 101 };
      await expect(operation({ sessionId: started.model.session.id, idempotencyKey: `set-${kind}`, kind: "save_set", payload: { ...payload, measurement: differentMeasurement } as never })).rejects.toMatchObject({ code: "conflict" });
    }
    const weightExercise = exerciseByKind.get("weight_reps")!;
    await expect(operation({
      sessionId: started.model.session.id,
      idempotencyKey: "bad-set-position",
      kind: "save_set",
      expectedVersion: versions.get(weightExercise.id)!,
      payload: { kind: "save_set", setId: `${weightExercise.id}:99`, exerciseId: weightExercise.id, phase: "work", measurement: measurements.weight_reps },
    })).rejects.toMatchObject({ code: "invalid_request" });
    const firstState = started.model.exerciseStates.find(({ snapshotId }) => snapshotId === weightExercise.id)!;
    const currentWeightVersion = versions.get(weightExercise.id)!;
    const noteResult = await operation({ sessionId: started.model.session.id, idempotencyKey: "note-1", kind: "save_note", expectedVersion: currentWeightVersion, payload: { kind: "save_note", exerciseId: weightExercise.id, note: "steady" } });
    expect(noteResult.exerciseVersion).toBe(currentWeightVersion + 1);
    versions.set(weightExercise.id, noteResult.exerciseVersion!);
    await expect(operation({ sessionId: started.model.session.id, idempotencyKey: "note-stale", kind: "save_note", expectedVersion: firstState.version, payload: { kind: "save_note", exerciseId: weightExercise.id, note: "stale" } })).rejects.toMatchObject({ code: "stale_version" });

    await operation({ sessionId: started.model.session.id, idempotencyKey: "cardio-1", kind: "save_cardio", payload: { kind: "save_cardio", mode: "walker", cardio: { mode: "walker", durationSeconds: 1200, distanceMeters: 1500, paceSecondsPerKilometer: 800, paceSource: "derived", inclinePercent: 2, notes: "walk" } } });
    expect((await repository.loadResume(viewer(fixture.ownerUid), { sessionId: started.model.session.id })).cardioLog?.cardio.paceSource).toBe("derived");
    for (const exercise of started.model.snapshot.exercises) {
      const state = started.model.exerciseStates.find(({ snapshotId }) => snapshotId === exercise.id)!;
      if (state.status === "pending") {
        const skipped = await operation({ sessionId: started.model.session.id, idempotencyKey: `skip-${exercise.id}`, kind: "skip_exercise", expectedVersion: versions.get(exercise.id)!, payload: { kind: "skip_exercise", exerciseId: exercise.id, reason: "not today" } });
        expect(skipped.exerciseVersion).toBe(versions.get(exercise.id)! + 1);
        versions.set(exercise.id, skipped.exerciseVersion!);
        await expect(operation({ sessionId: started.model.session.id, idempotencyKey: `reskip-${exercise.id}`, kind: "skip_exercise", expectedVersion: versions.get(exercise.id)!, payload: { kind: "skip_exercise", exerciseId: exercise.id, reason: "again" } })).rejects.toMatchObject({ code: "terminal" });
      }
    }
    const completed = await operation({ sessionId: started.model.session.id, idempotencyKey: "complete-session", kind: "complete_session", payload: { kind: "complete_session", sessionId: started.model.session.id } });
    expect(completed.sessionState).toBe("completed");
    await expect(operation({ sessionId: started.model.session.id, idempotencyKey: "after-terminal", kind: "save_note", payload: { kind: "save_note", exerciseId: weightExercise.id, note: "late" } })).rejects.toMatchObject({ code: "terminal" });
    const history = await repository.history(viewer(fixture.ownerUid));
    expect(history.sessions).toHaveLength(1);
    expect(history.sessions[0]?.exercises.find(({ snapshot }) => snapshot.id === weightExercise.id)?.snapshot.name).toBe(weightExercise.name);
    expect(history.sessions[0]?.exercises.flatMap(({ setLogs }) => setLogs).some(({ measurement }) => measurement.kind === "bodyweight_reps" && measurement.addedWeightKg === 5)).toBe(true);
    expect((await repository.history(viewer(fixture.otherUid))).sessions).toHaveLength(0);
  });

  it("returns stable errors and freezes an abandoned session", async () => {
    const { database } = await openDatabase();
    const fixture = await createFixture(database);
    const repository = createWorkoutRepository(fixture.database);
    const started = await repository.startOrResume(viewer(fixture.ownerUid), { programId: fixture.programId, dayId: fixture.dayId, idempotencyKey: "start-abandon" });
    const result = await repository.submitOperation(viewer(fixture.ownerUid), {
      sessionId: started.model.session.id,
      idempotencyKey: "abandon-1",
      kind: "abandon_session",
      payload: { kind: "abandon_session", sessionId: started.model.session.id, reason: "interrupted" },
    });
    expect(result.sessionState).toBe("abandoned");
    const duplicate = await repository.submitOperation(viewer(fixture.ownerUid), {
      sessionId: started.model.session.id,
      idempotencyKey: "abandon-1",
      kind: "abandon_session",
      payload: { kind: "abandon_session", sessionId: started.model.session.id, reason: "interrupted" },
    });
    expect(duplicate.status).toBe("duplicate");
    await expect(repository.loadResume(viewer(fixture.ownerUid), { sessionId: started.model.session.id })).rejects.toMatchObject({ code: "not_found" });
    await expect(repository.submitOperation(viewer(fixture.ownerUid), {
      sessionId: started.model.session.id,
      idempotencyKey: "abandon-2",
      kind: "abandon_session",
      payload: { kind: "abandon_session", sessionId: started.model.session.id, reason: "again" },
    })).rejects.toBeInstanceOf(WorkoutRepositoryError);
  });

  it("rejects fractional integer measurements before integer-column writes", async () => {
    const { database } = await openDatabase();
    const fixture = await createFixture(database);
    const repository = createWorkoutRepository(fixture.database);
    const started = await repository.startOrResume(viewer(fixture.ownerUid), {
      programId: fixture.programId,
      dayId: fixture.dayId,
      idempotencyKey: "fractional-measurements",
    });
    const durationExercise = started.model.snapshot.exercises.find(({ loggingKind }) => loggingKind === "duration")!;
    const durationSet = durationExercise.sets[0]!;
    await expect(repository.submitOperation(viewer(fixture.ownerUid), {
      sessionId: started.model.session.id,
      idempotencyKey: "fractional-set-duration",
      kind: "save_set",
      expectedVersion: 1,
      payload: {
        kind: "save_set",
        setId: durationSet.id,
        exerciseId: durationExercise.id,
        phase: durationSet.phase,
        measurement: { kind: "duration", durationSeconds: 30.5 },
      },
    })).rejects.toMatchObject({ code: "invalid_request" });
    await expect(repository.submitOperation(viewer(fixture.ownerUid), {
      sessionId: started.model.session.id,
      idempotencyKey: "fractional-cardio-duration",
      kind: "save_cardio",
      payload: {
        kind: "save_cardio",
        mode: "walker",
        cardio: {
          mode: "walker",
          durationSeconds: 1200.5,
          distanceMeters: 1500.25,
          paceSecondsPerKilometer: 800,
          paceSource: "entered",
          inclinePercent: 2.5,
          notes: "fractional duration",
        },
      },
    })).rejects.toMatchObject({ code: "invalid_request" });
    await expect(repository.submitOperation(viewer(fixture.ownerUid), {
      sessionId: started.model.session.id,
      idempotencyKey: "fractional-cardio-pace",
      kind: "save_cardio",
      payload: {
        kind: "save_cardio",
        mode: "walker",
        cardio: {
          mode: "walker",
          durationSeconds: 1200,
          distanceMeters: 1500.25,
          paceSecondsPerKilometer: 800.5,
          paceSource: "entered",
          inclinePercent: 2.5,
          notes: "fractional pace",
        },
      },
    })).rejects.toMatchObject({ code: "invalid_request" });
  });

  it("accepts repository derived pace after canonical whole-second rounding", async () => {
    const { database } = await openDatabase();
    const fixture = await createFixture(database);
    const repository = createWorkoutRepository(fixture.database);
    const started = await repository.startOrResume(viewer(fixture.ownerUid), {
      programId: fixture.programId,
      dayId: fixture.dayId,
      idempotencyKey: "rounded-derived-pace",
    });
    const saved = await repository.submitOperation(viewer(fixture.ownerUid), {
      sessionId: started.model.session.id,
      idempotencyKey: "rounded-derived-cardio",
      kind: "save_cardio",
      payload: {
        kind: "save_cardio",
        mode: "walker",
        cardio: {
          mode: "walker",
          durationSeconds: 100,
          distanceMeters: 333.25,
          paceSecondsPerKilometer: 300,
          paceSource: "derived",
          inclinePercent: 1.25,
          notes: "rounded pace",
        },
      },
    });
    expect(saved.status).toBe("saved");
    expect((await repository.loadResume(viewer(fixture.ownerUid), { sessionId: started.model.session.id })).cardioLog?.cardio).toMatchObject({
      durationSeconds: 100,
      distanceMeters: 333.25,
      paceSecondsPerKilometer: 300,
      paceSource: "derived",
    });
  });

  it("does not return an unvalidated stored idempotency payload", async () => {
    const { database } = await openDatabase();
    const fixture = await createFixture(database);
    const repository = createWorkoutRepository(fixture.database);
    const started = await repository.startOrResume(viewer(fixture.ownerUid), {
      programId: fixture.programId,
      dayId: fixture.dayId,
      idempotencyKey: "corrupt-idempotency-start",
    });
    const target = started.model.snapshot.exercises.find(({ loggingKind }) => loggingKind === "weight_reps")!;
    const set = target.sets[0]!;
    const payload = {
      kind: "save_set" as const,
      setId: set.id,
      exerciseId: target.id,
      phase: set.phase,
      measurement: { kind: "weight_reps" as const, weightKg: 20, repetitions: 8 },
    };
    await repository.submitOperation(viewer(fixture.ownerUid), {
      sessionId: started.model.session.id,
      idempotencyKey: "corrupt-idempotency",
      kind: "save_set",
      expectedVersion: 1,
      payload,
    });
    await database
      .update(idempotencyKeys)
      .set({ resultPayload: { unexpected: true } })
      .where(eq(idempotencyKeys.idempotencyKey, "corrupt-idempotency"));
    await expect(repository.submitOperation(viewer(fixture.ownerUid), {
      sessionId: started.model.session.id,
      idempotencyKey: "corrupt-idempotency",
      kind: "save_set",
      expectedVersion: 1,
      payload,
    })).rejects.toMatchObject({ code: "conflict" });
  });

  it("validates runner operation identity without using client ownership selectors", async () => {
    const { database } = await openDatabase();
    const fixture = await createFixture(database);
    const repository = createWorkoutRepository(fixture.database);
    const started = await repository.startOrResume(viewer(fixture.ownerUid), {
      programId: fixture.programId,
      dayId: fixture.dayId,
      idempotencyKey: "start-runner-identity",
    });
    const operation = (ownerUid: string, baseRevision: string): RunnerOperation => ({
      idempotencyKey: `runner-${ownerUid}-${baseRevision}`,
      kind: "complete_session",
      payload: { kind: "complete_session", sessionId: started.model.session.id },
      ownerUid,
      sessionId: started.model.session.id,
      baseRevision,
      sequence: 1,
      createdAt: Date.now(),
      attempts: 0,
      status: "pending",
      persistedId: undefined,
      errorCode: undefined,
      errorMessage: undefined,
      retryable: undefined,
      failureKind: undefined,
    });
    await expect(repository.submitRunnerOperation(viewer(fixture.ownerUid), operation(fixture.otherUid, started.model.session.programRevisionId))).resolves.toMatchObject({
      status: "failed",
      code: "conflict",
    });
    await expect(repository.submitRunnerOperation(viewer(fixture.ownerUid), operation(fixture.ownerUid, "00000000-0000-4000-8000-000000000000"))).resolves.toMatchObject({
      status: "failed",
      code: "conflict",
    });
    const exerciseId = started.model.snapshot.exercises[0]!.id;
    const valid = {
      ...operation(fixture.ownerUid, started.model.session.programRevisionId),
      idempotencyKey: "runner-valid-note",
      kind: "save_note" as const,
      payload: { kind: "save_note" as const, exerciseId, note: "runner note" },
    } satisfies RunnerOperation;
    await expect(repository.submitRunnerOperation(viewer(fixture.ownerUid), valid)).resolves.toMatchObject({ status: "saved" });
    expect((await repository.loadResume(viewer(fixture.ownerUid), { sessionId: started.model.session.id })).exerciseStates.find(({ snapshotId }) => snapshotId === exerciseId)?.note).toBe("runner note");
  });

  it("stores the latest completed value in an immutable set snapshot", async () => {
    const { database } = await openDatabase();
    const fixture = await createFixture(database);
    const repository = createWorkoutRepository(fixture.database);
    const first = await repository.startOrResume(viewer(fixture.ownerUid), {
      programId: fixture.programId,
      dayId: fixture.dayId,
      idempotencyKey: "start-previous-first",
      now: new Date("2026-08-25T01:00:00.000Z"),
    });
    const target = first.model.snapshot.exercises.find(({ loggingKind }) => loggingKind === "weight_reps")!;
    let targetVersion = first.model.exerciseStates.find(({ snapshotId }) => snapshotId === target.id)!.version;
    for (const set of target.sets) {
      const saved = await repository.submitOperation(viewer(fixture.ownerUid), {
        sessionId: first.model.session.id,
        idempotencyKey: `previous-set-${set.position}`,
        kind: "save_set",
        expectedVersion: targetVersion,
        payload: {
          kind: "save_set",
          setId: set.id,
          exerciseId: target.id,
          phase: set.phase,
          measurement: { kind: "weight_reps", weightKg: 30, repetitions: 9 },
        },
        now: new Date("2026-08-25T01:10:00.000Z"),
      });
      targetVersion = saved.exerciseVersion!;
    }
    const completedExercise = await repository.submitOperation(viewer(fixture.ownerUid), {
      sessionId: first.model.session.id,
      idempotencyKey: "previous-complete-exercise",
      kind: "complete_exercise",
      expectedVersion: targetVersion,
      payload: { kind: "complete_exercise", exerciseId: target.id },
    });
    expect(completedExercise.exerciseVersion).toBe(targetVersion + 1);
    for (const exercise of first.model.snapshot.exercises) {
      if (exercise.id === target.id) continue;
      const state = first.model.exerciseStates.find(({ snapshotId }) => snapshotId === exercise.id)!;
      if (state.status === "pending") {
        await repository.submitOperation(viewer(fixture.ownerUid), {
          sessionId: first.model.session.id,
          idempotencyKey: `previous-skip-${exercise.id}`,
          kind: "skip_exercise",
          expectedVersion: state.version,
          payload: { kind: "skip_exercise", exerciseId: exercise.id, reason: "not today" },
        });
      }
    }
    await repository.submitOperation(viewer(fixture.ownerUid), {
      sessionId: first.model.session.id,
      idempotencyKey: "previous-cardio",
      kind: "save_cardio",
      payload: {
        kind: "save_cardio",
        mode: "walker",
        cardio: {
          mode: "walker",
          durationSeconds: 1200,
          distanceMeters: 1500,
          paceSecondsPerKilometer: 800,
          paceSource: "entered",
          inclinePercent: 2,
          notes: "first workout",
        },
      },
    });
    await repository.submitOperation(viewer(fixture.ownerUid), {
      sessionId: first.model.session.id,
      idempotencyKey: "previous-complete-session",
      kind: "complete_session",
      payload: { kind: "complete_session", sessionId: first.model.session.id },
      now: new Date("2026-08-25T02:00:00.000Z"),
    });

    const second = await repository.startOrResume(viewer(fixture.ownerUid), {
      programId: fixture.programId,
      dayId: fixture.dayId,
      idempotencyKey: "start-previous-second",
      now: new Date("2026-08-25T03:00:00.000Z"),
    });
    const secondTarget = second.model.snapshot.exercises.find(({ loggingKind }) => loggingKind === "weight_reps")!;
    expect(secondTarget.sets.map(({ previous }) => previous)).toEqual(
      secondTarget.sets.map(() => ({ kind: "weight_reps", weightKg: 30, repetitions: 9 })),
    );
    await database
      .update(catalogExercises)
      .set({ name: "Catalog meaning edited after start" })
      .where(eq(catalogExercises.name, target.name));
    const reloaded = await repository.loadResume(viewer(fixture.ownerUid), { sessionId: second.model.session.id });
    const reloadedTarget = reloaded.snapshot.exercises.find(({ id }) => id === secondTarget.id)!;
    expect(reloadedTarget.name).toBe(secondTarget.name);
    expect(reloadedTarget.sets.map(({ previous }) => previous)).toEqual(secondTarget.sets.map(({ previous }) => previous));
    const history = await repository.history(viewer(fixture.ownerUid));
    expect(history.sessions).toHaveLength(1);
    expect(history.sessions[0]?.cardioLog?.cardio.paceSource).toBe("entered");
  });

  it("uses only one latest completed outcome per effective meaning without hybrid positions", async () => {
    const { database } = await openDatabase();
    const fixture = await createFixture(database);
    const repository = createWorkoutRepository(fixture.database);
    const seed = await repository.startOrResume(viewer(fixture.ownerUid), {
      programId: fixture.programId,
      dayId: fixture.dayId,
      idempotencyKey: "previous-bound-seed",
    });
    const target = seed.model.snapshot.exercises.find(({ loggingKind }) => loggingKind === "weight_reps")!;
    await repository.submitOperation(viewer(fixture.ownerUid), {
      sessionId: seed.model.session.id,
      idempotencyKey: "previous-bound-seed-abandon",
      kind: "abandon_session",
      payload: { kind: "abandon_session", sessionId: seed.model.session.id, reason: "fixture history" },
      now: new Date("2026-08-25T00:30:00.000Z"),
    });
    await insertCompletedHistoricalOutcome(database, fixture, {
      sourceSnapshotId: target.id,
      historicalSnapshotId: randomUUID(),
      setCount: 3,
      setPositions: [1, 2, 3],
      weightKg: 30,
      repetitions: 9,
      completedAt: new Date("2026-08-25T01:00:00.000Z"),
    });
    await insertCompletedHistoricalOutcome(database, fixture, {
      sourceSnapshotId: target.id,
      historicalSnapshotId: randomUUID(),
      setCount: 2,
      setPositions: [1, 2],
      weightKg: 40,
      repetitions: 8,
      completedAt: new Date("2026-08-25T02:00:00.000Z"),
    });
    const current = await repository.startOrResume(viewer(fixture.ownerUid), {
      programId: fixture.programId,
      dayId: fixture.dayId,
      idempotencyKey: "previous-bound-current",
      now: new Date("2026-08-25T03:00:00.000Z"),
    });
    const currentTarget = current.model.snapshot.exercises.find(({ loggingKind }) => loggingKind === "weight_reps")!;
    expect(currentTarget.sets.map(({ previous }) => previous)).toEqual([
      { kind: "weight_reps", weightKg: 40, repetitions: 8 },
      { kind: "weight_reps", weightKg: 40, repetitions: 8 },
      undefined,
    ]);
  });

  it("follows substituted history by effective identity without attributing it to the original", async () => {
    const { database } = await openDatabase();
    const fixture = await createFixture(database);
    const repository = createWorkoutRepository(fixture.database);
    const seed = await repository.startOrResume(viewer(fixture.ownerUid), {
      programId: fixture.programId,
      dayId: fixture.dayId,
      idempotencyKey: "previous-substitution-seed",
    });
    const target = seed.model.snapshot.exercises.find(({ loggingKind }) => loggingKind === "weight_reps")!;
    await repository.submitOperation(viewer(fixture.ownerUid), {
      sessionId: seed.model.session.id,
      idempotencyKey: "previous-substitution-seed-abandon",
      kind: "abandon_session",
      payload: { kind: "abandon_session", sessionId: seed.model.session.id, reason: "fixture history" },
    });
    await insertCompletedHistoricalOutcome(database, fixture, {
      sourceSnapshotId: target.id,
      historicalSnapshotId: randomUUID(),
      setCount: 1,
      setPositions: [1],
      effectiveCustomExerciseId: fixture.compatibleCustomId,
      weightKg: 55,
      repetitions: 5,
      completedAt: new Date("2026-08-25T02:00:00.000Z"),
    });
    const current = await repository.startOrResume(viewer(fixture.ownerUid), {
      programId: fixture.programId,
      dayId: fixture.dayId,
      idempotencyKey: "previous-substitution-current",
    });
    const currentTarget = current.model.snapshot.exercises.find(({ loggingKind }) => loggingKind === "weight_reps")!;
    expect(currentTarget.sets.every(({ previous }) => previous === undefined)).toBe(true);
    await repository.submitOperation(viewer(fixture.ownerUid), {
      sessionId: current.model.session.id,
      idempotencyKey: "previous-substitution-current-abandon",
      kind: "abandon_session",
      payload: { kind: "abandon_session", sessionId: current.model.session.id, reason: "fixture history" },
    });
    const replacementProgram = await insertCustomProgramForHistory(database, fixture);
    const replacement = await repository.startOrResume(viewer(fixture.ownerUid), {
      programId: replacementProgram.programId,
      dayId: replacementProgram.dayId,
      idempotencyKey: "previous-substitution-replacement",
    });
    expect(replacement.model.snapshot.exercises[0]?.sets[0]?.previous).toEqual({
      kind: "weight_reps",
      weightKg: 55,
      repetitions: 5,
    });
  });

  it("bounds history pages and advances with an opaque cursor", async () => {
    const { database } = await openDatabase();
    const fixture = await createFixture(database);
    const repository = createWorkoutRepository(fixture.database);
    const first = await repository.startOrResume(viewer(fixture.ownerUid), {
      programId: fixture.programId,
      dayId: fixture.dayId,
      idempotencyKey: "history-page-first",
      now: new Date("2026-08-25T01:00:00.000Z"),
    });
    await repository.submitOperation(viewer(fixture.ownerUid), {
      sessionId: first.model.session.id,
      idempotencyKey: "history-page-abandon-first",
      kind: "abandon_session",
      payload: { kind: "abandon_session", sessionId: first.model.session.id, reason: "first" },
      now: new Date("2026-08-25T01:10:00.000Z"),
    });
    const second = await repository.startOrResume(viewer(fixture.ownerUid), {
      programId: fixture.programId,
      dayId: fixture.dayId,
      idempotencyKey: "history-page-second",
      now: new Date("2026-08-25T02:00:00.000Z"),
    });
    await repository.submitOperation(viewer(fixture.ownerUid), {
      sessionId: second.model.session.id,
      idempotencyKey: "history-page-abandon-second",
      kind: "abandon_session",
      payload: { kind: "abandon_session", sessionId: second.model.session.id, reason: "second" },
      now: new Date("2026-08-25T02:10:00.000Z"),
    });
    const firstPage = await repository.history(viewer(fixture.ownerUid), { limit: 1 });
    expect(firstPage.sessions).toHaveLength(1);
    expect(firstPage.sessions[0]?.session.id).toBe(second.model.session.id);
    expect(firstPage.nextCursor).toEqual(expect.any(String));
    const secondPage = await repository.history(viewer(fixture.ownerUid), { limit: 1, ...(firstPage.nextCursor === undefined ? {} : { cursor: firstPage.nextCursor }) });
    expect(secondPage.sessions).toHaveLength(1);
    expect(secondPage.sessions[0]?.session.id).toBe(first.model.session.id);
    expect(secondPage.nextCursor).toBeUndefined();
    await expect(repository.history(viewer(fixture.ownerUid), { limit: 101 })).rejects.toMatchObject({ code: "invalid_request" });
  });

  it("verifies substitutions server-side, advances outcome versions, and completes one exercise", async () => {
    const { database } = await openDatabase();
    const fixture = await createFixture(database);
    const repository = createWorkoutRepository(fixture.database);
    const started = await repository.startOrResume(viewer(fixture.ownerUid), {
      programId: fixture.programId,
      dayId: fixture.dayId,
      idempotencyKey: "start-substitution",
    });
    const target = started.model.snapshot.exercises.find(
      (exercise) => exercise.loggingKind === "weight_reps",
    )!;
    const initialState = started.model.exerciseStates.find(({ snapshotId }) => snapshotId === target.id)!;
    expect(fixture.barbellExerciseId).not.toBe(target.id);
    await expect(repository.submitOperation(viewer(fixture.ownerUid), {
      sessionId: started.model.session.id,
      idempotencyKey: "substitute-barbell-incompatible",
      kind: "substitute_exercise",
      expectedVersion: initialState.version,
      payload: {
        kind: "substitute_exercise",
        exerciseId: target.id,
        replacement: {
          id: fixture.barbellExerciseId,
          name: "Client supplied spoof",
          loggingKind: "weight_reps",
        },
        reason: "equipment",
      },
    })).rejects.toMatchObject({ code: "not_found" });
    const substitute = await repository.submitOperation(viewer(fixture.ownerUid), {
      sessionId: started.model.session.id,
      idempotencyKey: "substitute-1",
      kind: "substitute_exercise",
      expectedVersion: initialState.version,
      payload: {
        kind: "substitute_exercise",
        exerciseId: target.id,
        replacement: {
          id: fixture.compatibleCustomId,
          name: "Client supplied spoof",
          loggingKind: "duration",
        },
        reason: "equipment",
      },
    });
    expect(substitute.exerciseVersion).toBe(initialState.version + 1);
    const resumed = await repository.loadResume(viewer(fixture.ownerUid), { sessionId: started.model.session.id });
    expect(resumed.snapshot.exercises.find(({ id }) => id === target.id)?.name).toBe("Custom dumbbell row");
    expect(resumed.exerciseStates.find(({ snapshotId }) => snapshotId === target.id)?.effectiveCustomExerciseId).toBe(fixture.compatibleCustomId);
    expect(resumed.exerciseStates.find(({ snapshotId }) => snapshotId === target.id)?.effectiveLoggingKind).toBe("weight_reps");

    const operation = (input: Parameters<typeof repository.submitOperation>[1]) => repository.submitOperation(viewer(fixture.ownerUid), input);
    const exercise = resumed.snapshot.exercises.find(({ id }) => id === target.id)!;
    let version = resumed.exerciseStates.find(({ snapshotId }) => snapshotId === exercise.id)!.version;
    for (const set of exercise.sets) {
      const saved = await operation({
        sessionId: started.model.session.id,
        idempotencyKey: `substitute-set-${set.position}`,
        kind: "save_set",
        expectedVersion: version,
        payload: {
          kind: "save_set",
          setId: set.id,
          exerciseId: exercise.id,
          phase: set.phase,
          measurement: { kind: "weight_reps", weightKg: 10, repetitions: 10 },
        },
      });
      expect(saved.exerciseVersion).toBe(version + 1);
      version = saved.exerciseVersion!;
    }
    const completed = await operation({
      sessionId: started.model.session.id,
      idempotencyKey: "complete-exercise-1",
      kind: "complete_exercise",
      expectedVersion: version,
      payload: { kind: "complete_exercise", exerciseId: exercise.id },
    });
    expect(completed.exerciseVersion).toBe(version + 1);
    await expect(operation({
      sessionId: started.model.session.id,
      idempotencyKey: "complete-exercise-again",
      kind: "complete_exercise",
      expectedVersion: completed.exerciseVersion!,
      payload: { kind: "complete_exercise", exerciseId: exercise.id },
    })).rejects.toMatchObject({ code: "terminal" });
    await expect(operation({
      sessionId: started.model.session.id,
      idempotencyKey: "complete-exercise-note-after",
      kind: "save_note",
      expectedVersion: completed.exerciseVersion!,
      payload: { kind: "save_note", exerciseId: exercise.id, note: "late" },
    })).rejects.toMatchObject({ code: "terminal" });
    expect((await repository.loadResume(viewer(fixture.ownerUid), { sessionId: started.model.session.id })).exerciseStates.find(({ snapshotId }) => snapshotId === exercise.id)?.status).toBe("completed");
  });
});
