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
  programCardioPrescriptions,
  programDays,
  programPrescriptions,
  programRevisions,
  programSections,
  userProfiles,
  userPrograms,
  schema,
} from "@/db/schema";
import { seedStarterDatabase } from "@/db/starter-seed";
import type { WorkoutMeasurement } from "@/domain/analytics";
import { buildStarterDatabaseRows } from "@/domain/seed/starter-database-rows";
import type { ViewerContext } from "@/server/auth/viewer";
import {
  WorkoutRepositoryError,
  createWorkoutRepository,
} from "@/server/repositories/workout-repository";

const migrationUrl = new URL("../../drizzle/0000_initial.sql", import.meta.url);
const openDatabases: PGlite[] = [];

async function openDatabase(): Promise<{ raw: PGlite; database: Database }> {
  const raw = new PGlite();
  await raw.waitReady;
  await raw.exec(await readFile(migrationUrl, "utf8"));
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

  await database.insert(userProfiles).values([
    { firebaseUid: ownerUid, displayName: "Owner A" },
    { firebaseUid: otherUid, displayName: "Owner B" },
  ]);
  await database.insert(customExercises).values({
    id: customId,
    ownerFirebaseUid: ownerUid,
    exerciseKey: "custom-distance-run",
    name: "Custom distance run",
    loggingKind: "distance_duration",
  });
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
  return { database, ownerUid, otherUid, programId, dayId: dayIds.get(pushDay.id)! };
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
      const saved = await operation({ sessionId: started.model.session.id, idempotencyKey: `set-${kind}`, kind: "save_set", payload });
      expect(saved.status).toBe("saved");
      const duplicate = await operation({ sessionId: started.model.session.id, idempotencyKey: `set-${kind}`, kind: "save_set", payload });
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
      payload: { kind: "save_set", setId: `${weightExercise.id}:99`, exerciseId: weightExercise.id, phase: "work", measurement: measurements.weight_reps },
    })).rejects.toMatchObject({ code: "invalid_request" });
    const firstState = started.model.exerciseStates.find(({ snapshotId }) => snapshotId === weightExercise.id)!;
    const noteResult = await operation({ sessionId: started.model.session.id, idempotencyKey: "note-1", kind: "save_note", expectedVersion: firstState.version, payload: { kind: "save_note", exerciseId: weightExercise.id, note: "steady" } });
    expect(noteResult.exerciseVersion).toBe(firstState.version + 1);
    await expect(operation({ sessionId: started.model.session.id, idempotencyKey: "note-stale", kind: "save_note", expectedVersion: firstState.version, payload: { kind: "save_note", exerciseId: weightExercise.id, note: "stale" } })).rejects.toMatchObject({ code: "stale_version" });

    await operation({ sessionId: started.model.session.id, idempotencyKey: "cardio-1", kind: "save_cardio", payload: { kind: "save_cardio", mode: "walker", cardio: { mode: "walker", durationSeconds: 1200, distanceMeters: 1500, paceSecondsPerKilometer: 800, paceSource: "derived", inclinePercent: 2, notes: "walk" } } });
    for (const exercise of started.model.snapshot.exercises) {
      const state = started.model.exerciseStates.find(({ snapshotId }) => snapshotId === exercise.id)!;
      if (state.status === "pending") {
        await operation({ sessionId: started.model.session.id, idempotencyKey: `skip-${exercise.id}`, kind: "skip_exercise", payload: { kind: "skip_exercise", exerciseId: exercise.id, reason: "not today" } });
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
    const replacementRow = (await fixture.database
      .select({ id: catalogExercises.id, name: catalogExercises.name, loggingKind: catalogExercises.loggingKind })
      .from(catalogExercises)
      .where(eq(catalogExercises.loggingKind, "weight_reps")))
      .find(({ id }) => id !== started.model.snapshot.exercises[0]?.id)!;
    const initialState = started.model.exerciseStates.find(({ snapshotId }) => snapshotId === target.id)!;
    const substitute = await repository.submitOperation(viewer(fixture.ownerUid), {
      sessionId: started.model.session.id,
      idempotencyKey: "substitute-1",
      kind: "substitute_exercise",
      expectedVersion: initialState.version,
      payload: {
        kind: "substitute_exercise",
        exerciseId: target.id,
        replacement: {
          id: replacementRow.id,
          name: "Client supplied spoof",
          loggingKind: "duration",
        },
        reason: "equipment",
      },
    });
    expect(substitute.exerciseVersion).toBe(initialState.version + 1);
    const resumed = await repository.loadResume(viewer(fixture.ownerUid), { sessionId: started.model.session.id });
    expect(resumed.snapshot.exercises.find(({ id }) => id === target.id)?.name).toBe(replacementRow.name);
    expect(resumed.exerciseStates.find(({ snapshotId }) => snapshotId === target.id)?.effectiveLoggingKind).toBe(replacementRow.loggingKind);

    const operation = (input: Parameters<typeof repository.submitOperation>[1]) => repository.submitOperation(viewer(fixture.ownerUid), input);
    const exercise = resumed.snapshot.exercises.find(({ id }) => id === target.id)!;
    for (const set of exercise.sets) {
      await operation({
        sessionId: started.model.session.id,
        idempotencyKey: `substitute-set-${set.position}`,
        kind: "save_set",
        payload: {
          kind: "save_set",
          setId: set.id,
          exerciseId: exercise.id,
          phase: set.phase,
          measurement: { kind: "weight_reps", weightKg: 10, repetitions: 10 },
        },
      });
    }
    const afterSubstitution = resumed.exerciseStates.find(({ snapshotId }) => snapshotId === target.id)!;
    const completed = await operation({
      sessionId: started.model.session.id,
      idempotencyKey: "complete-exercise-1",
      kind: "complete_exercise",
      expectedVersion: afterSubstitution.version,
      payload: { kind: "complete_exercise", exerciseId: exercise.id },
    });
    expect(completed.exerciseVersion).toBe(afterSubstitution.version + 1);
    expect((await repository.loadResume(viewer(fixture.ownerUid), { sessionId: started.model.session.id })).exerciseStates.find(({ snapshotId }) => snapshotId === exercise.id)?.status).toBe("completed");
  });
});
