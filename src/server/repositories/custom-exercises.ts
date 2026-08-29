import { createHash, randomUUID } from "node:crypto";

import { and, asc, count, eq, sql } from "drizzle-orm";

import type { Database } from "@/db/client";
import {
  catalogEquipment,
  customExerciseAliases,
  customExerciseEquipment,
  customExercises,
  customExerciseVideos,
  idempotencyKeys,
  personalGuidanceLinks,
  personalRecords,
  programPrescriptions,
  progressSummaries,
  workoutExerciseSnapshots,
} from "@/db/schema";
import {
  normalizeCustomExerciseDraft,
  type CustomExerciseDraftInput,
  type NormalizedCustomExerciseDraft,
} from "@/domain/exercises/custom";
import type { EquipmentId } from "@/domain/equipment";
import type { LoggingKind } from "@/domain/exercises/catalog";
import type { ViewerContext } from "@/server/auth/viewer";

export type CustomExerciseRepositoryCode =
  | "verification_required"
  | "not_found"
  | "idempotency_conflict"
  | "stale"
  | "semantic_clone_required"
  | "in_use";

export class CustomExerciseRepositoryError extends Error {
  readonly code: CustomExerciseRepositoryCode;
  readonly status: number;

  constructor(code: CustomExerciseRepositoryCode, message: string, status: number) {
    super(message);
    this.name = "CustomExerciseRepositoryError";
    this.code = code;
    this.status = status;
  }
}

export type CustomExerciseView = Readonly<{
  id: string;
  name: string;
  loggingKind: LoggingKind;
  instructions: string;
  equipmentIds: readonly EquipmentId[];
  aliases: readonly Readonly<{
    alias: string;
    normalizedAlias: string;
  }>[];
  youtubeVideoIds: readonly string[];
  updatedAt: string;
}>;

export type CustomExerciseMutationResult = Readonly<{
  exercise: CustomExerciseView;
  duplicate: boolean;
}>;

export type CustomExerciseDeleteResult = Readonly<{
  exerciseId: string;
  duplicate: boolean;
}>;

type ExerciseMutationInput = Readonly<{
  idempotencyKey: string;
  draft: CustomExerciseDraftInput;
}>;

type UpdateExerciseInput = ExerciseMutationInput &
  Readonly<{
    exerciseId: string;
    expectedUpdatedAt: string;
  }>;

type DeleteExerciseInput = Readonly<{
  exerciseId: string;
  idempotencyKey: string;
}>;

type StoredResult = Readonly<Record<string, unknown>>;

function assertEligible(viewer: ViewerContext): void {
  if (!viewer.eligibleForPermanentMutations) {
    throw new CustomExerciseRepositoryError(
      "verification_required",
      "Verify your email before changing permanent account data.",
      403,
    );
  }
}

function assertIdempotencyKey(value: string): void {
  if (
    typeof value !== "string" ||
    value.trim().length === 0 ||
    value.length > 180
  ) {
    throw new RangeError("idempotencyKey must contain 1 to 180 characters.");
  }
}

function hashRequest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function notFound(): CustomExerciseRepositoryError {
  return new CustomExerciseRepositoryError(
    "not_found",
    "This custom exercise is not available.",
    404,
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseStoredExercise(payload: StoredResult): CustomExerciseView {
  const exercise = payload["exercise"];
  if (!isObject(exercise)) {
    throw new CustomExerciseRepositoryError(
      "idempotency_conflict",
      "The earlier operation result is unavailable.",
      409,
    );
  }
  return exercise as CustomExerciseView;
}

async function reserveOperation(
  database: Database,
  input: Readonly<{
    ownerUid: string;
    idempotencyKey: string;
    operation: string;
    requestHash: string;
    initialPayload: StoredResult;
  }>,
): Promise<Readonly<{ duplicate: false } | { duplicate: true; payload: StoredResult }>> {
  const inserted = await database
    .insert(idempotencyKeys)
    .values({
      ownerFirebaseUid: input.ownerUid,
      idempotencyKey: input.idempotencyKey,
      operation: input.operation,
      requestHash: input.requestHash,
      resultPayload: input.initialPayload,
    })
    .onConflictDoNothing()
    .returning({ id: idempotencyKeys.id });
  if (inserted.length > 0) return { duplicate: false };

  const existing = await database
    .select({
      operation: idempotencyKeys.operation,
      requestHash: idempotencyKeys.requestHash,
      resultPayload: idempotencyKeys.resultPayload,
    })
    .from(idempotencyKeys)
    .where(
      and(
        eq(idempotencyKeys.ownerFirebaseUid, input.ownerUid),
        eq(idempotencyKeys.idempotencyKey, input.idempotencyKey),
      ),
    )
    .limit(1);
  const row = existing[0];
  if (
    !row ||
    row.operation !== input.operation ||
    row.requestHash !== input.requestHash
  ) {
    throw new CustomExerciseRepositoryError(
      "idempotency_conflict",
      "This operation key was already used for different input.",
      409,
    );
  }
  return { duplicate: true, payload: row.resultPayload };
}

async function saveOperationResult(
  database: Database,
  ownerUid: string,
  idempotencyKey: string,
  payload: StoredResult,
): Promise<void> {
  await database
    .update(idempotencyKeys)
    .set({ resultPayload: payload })
    .where(
      and(
        eq(idempotencyKeys.ownerFirebaseUid, ownerUid),
        eq(idempotencyKeys.idempotencyKey, idempotencyKey),
      ),
    );
}

async function loadExercise(
  database: Database,
  ownerUid: string,
  exerciseId: string,
): Promise<CustomExerciseView | undefined> {
  const bases = await database
    .select({
      id: customExercises.id,
      name: customExercises.name,
      loggingKind: customExercises.loggingKind,
      instructions: customExercises.instructions,
      updatedAt: customExercises.updatedAt,
    })
    .from(customExercises)
    .where(
      and(
        eq(customExercises.ownerFirebaseUid, ownerUid),
        eq(customExercises.id, exerciseId),
      ),
    )
    .limit(1);
  const base = bases[0];
  if (!base) return undefined;

  const [equipment, aliases, videos] = await Promise.all([
    database
      .select({ id: customExerciseEquipment.equipmentId })
      .from(customExerciseEquipment)
      .innerJoin(
        catalogEquipment,
        eq(catalogEquipment.id, customExerciseEquipment.equipmentId),
      )
      .where(
        and(
          eq(customExerciseEquipment.ownerFirebaseUid, ownerUid),
          eq(customExerciseEquipment.customExerciseId, exerciseId),
        ),
      )
      .orderBy(asc(catalogEquipment.sortOrder)),
    database
      .select({
        alias: customExerciseAliases.alias,
        normalizedAlias: customExerciseAliases.normalizedAlias,
      })
      .from(customExerciseAliases)
      .where(
        and(
          eq(customExerciseAliases.ownerFirebaseUid, ownerUid),
          eq(customExerciseAliases.customExerciseId, exerciseId),
        ),
      )
      .orderBy(asc(customExerciseAliases.createdAt), asc(customExerciseAliases.id)),
    database
      .select({ id: customExerciseVideos.youtubeVideoId })
      .from(customExerciseVideos)
      .where(
        and(
          eq(customExerciseVideos.ownerFirebaseUid, ownerUid),
          eq(customExerciseVideos.customExerciseId, exerciseId),
        ),
      )
      .orderBy(asc(customExerciseVideos.displayOrder)),
  ]);

  return {
    id: base.id,
    name: base.name,
    loggingKind: base.loggingKind,
    instructions: base.instructions ?? "",
    equipmentIds: equipment.map(({ id }) => id as EquipmentId),
    aliases,
    youtubeVideoIds: videos.map(({ id }) => id),
    updatedAt: base.updatedAt.toISOString(),
  };
}

async function insertChildren(
  database: Database,
  ownerUid: string,
  exerciseId: string,
  draft: NormalizedCustomExerciseDraft,
): Promise<void> {
  if (draft.equipmentIds.length > 0) {
    await database.insert(customExerciseEquipment).values(
      draft.equipmentIds.map((equipmentId) => ({
        ownerFirebaseUid: ownerUid,
        customExerciseId: exerciseId,
        equipmentId,
      })),
    );
  }
  if (draft.aliases.length > 0) {
    await database.insert(customExerciseAliases).values(
      draft.aliases.map((alias) => ({
        id: randomUUID(),
        ownerFirebaseUid: ownerUid,
        customExerciseId: exerciseId,
        ...alias,
      })),
    );
  }
  if (draft.youtubeVideoIds.length > 0) {
    await database.insert(customExerciseVideos).values(
      draft.youtubeVideoIds.map((youtubeVideoId, index) => ({
        id: randomUUID(),
        ownerFirebaseUid: ownerUid,
        customExerciseId: exerciseId,
        youtubeVideoId,
        displayOrder: index + 1,
      })),
    );
  }
}

export async function getCustomExercise(
  database: Database,
  viewer: ViewerContext,
  exerciseId: string,
): Promise<CustomExerciseView> {
  const exercise = await loadExercise(database, viewer.uid, exerciseId);
  if (!exercise) throw notFound();
  return exercise;
}

export async function listCustomExercises(
  database: Database,
  viewer: ViewerContext,
): Promise<readonly CustomExerciseView[]> {
  const rows = await database
    .select({ id: customExercises.id })
    .from(customExercises)
    .where(eq(customExercises.ownerFirebaseUid, viewer.uid))
    .orderBy(asc(customExercises.name), asc(customExercises.id));
  return Promise.all(rows.map(({ id }) => loadExercise(database, viewer.uid, id)))
    .then((exercises) => exercises.filter((exercise): exercise is CustomExerciseView => exercise !== undefined));
}

export async function createCustomExercise(
  database: Database,
  viewer: ViewerContext,
  input: ExerciseMutationInput,
): Promise<CustomExerciseMutationResult> {
  assertEligible(viewer);
  assertIdempotencyKey(input.idempotencyKey);
  const draft = normalizeCustomExerciseDraft(input.draft);
  const operation = "custom_exercise.create";
  const requestHash = hashRequest({ operation, draft });

  return database.transaction(async (transaction) => {
    const tx = transaction as unknown as Database;
    const exerciseId = randomUUID();
    const reservation = await reserveOperation(tx, {
      ownerUid: viewer.uid,
      idempotencyKey: input.idempotencyKey,
      operation,
      requestHash,
      initialPayload: { pending: true, exerciseId },
    });
    if (reservation.duplicate) {
      return { exercise: parseStoredExercise(reservation.payload), duplicate: true };
    }

    await tx.insert(customExercises).values({
      id: exerciseId,
      ownerFirebaseUid: viewer.uid,
      exerciseKey: `custom-${exerciseId}`,
      name: draft.name,
      loggingKind: draft.loggingKind,
      instructions: draft.instructions || null,
    });
    await insertChildren(tx, viewer.uid, exerciseId, draft);
    const exercise = await loadExercise(tx, viewer.uid, exerciseId);
    if (!exercise) throw notFound();
    await saveOperationResult(tx, viewer.uid, input.idempotencyKey, { exercise });
    return { exercise, duplicate: false };
  });
}

async function semanticReferenceCount(
  database: Database,
  ownerUid: string,
  exerciseId: string,
): Promise<number> {
  const [programs, snapshots] = await Promise.all([
    database
      .select({ value: count() })
      .from(programPrescriptions)
      .where(
        and(
          eq(programPrescriptions.ownerFirebaseUid, ownerUid),
          eq(programPrescriptions.customExerciseId, exerciseId),
        ),
      ),
    database
      .select({ value: count() })
      .from(workoutExerciseSnapshots)
      .where(
        and(
          eq(workoutExerciseSnapshots.ownerFirebaseUid, ownerUid),
          eq(workoutExerciseSnapshots.customExerciseId, exerciseId),
        ),
      ),
  ]);
  return (programs[0]?.value ?? 0) + (snapshots[0]?.value ?? 0);
}

export async function updateCustomExercise(
  database: Database,
  viewer: ViewerContext,
  input: UpdateExerciseInput,
): Promise<CustomExerciseMutationResult> {
  assertEligible(viewer);
  assertIdempotencyKey(input.idempotencyKey);
  const draft = normalizeCustomExerciseDraft(input.draft);
  const operation = "custom_exercise.update";
  const requestHash = hashRequest({
    operation,
    exerciseId: input.exerciseId,
    expectedUpdatedAt: input.expectedUpdatedAt,
    draft,
  });

  return database.transaction(async (transaction) => {
    const tx = transaction as unknown as Database;
    const reservation = await reserveOperation(tx, {
      ownerUid: viewer.uid,
      idempotencyKey: input.idempotencyKey,
      operation,
      requestHash,
      initialPayload: { pending: true, exerciseId: input.exerciseId },
    });
    if (reservation.duplicate) {
      return { exercise: parseStoredExercise(reservation.payload), duplicate: true };
    }

    const existing = await loadExercise(tx, viewer.uid, input.exerciseId);
    if (!existing) throw notFound();
    if (
      existing.loggingKind !== draft.loggingKind &&
      (await semanticReferenceCount(tx, viewer.uid, input.exerciseId)) > 0
    ) {
      throw new CustomExerciseRepositoryError(
        "semantic_clone_required",
        "Clone this exercise before changing its logging kind because a program or workout already references it.",
        409,
      );
    }

    const expectedUpdatedAt = new Date(input.expectedUpdatedAt);
    if (Number.isNaN(expectedUpdatedAt.getTime())) {
      throw new CustomExerciseRepositoryError("stale", "Reload this exercise before saving.", 409);
    }
    const updated = await tx
      .update(customExercises)
      .set({
        name: draft.name,
        loggingKind: draft.loggingKind,
        instructions: draft.instructions || null,
        updatedAt: sql`greatest(clock_timestamp(), ${customExercises.updatedAt} + interval '1 millisecond')`,
      })
      .where(
        and(
          eq(customExercises.ownerFirebaseUid, viewer.uid),
          eq(customExercises.id, input.exerciseId),
          sql`date_trunc('milliseconds', ${customExercises.updatedAt}) = ${expectedUpdatedAt}`,
        ),
      )
      .returning({ id: customExercises.id });
    if (updated.length === 0) {
      throw new CustomExerciseRepositoryError("stale", "Reload this exercise before saving.", 409);
    }

    await tx
      .delete(customExerciseVideos)
      .where(
        and(
          eq(customExerciseVideos.ownerFirebaseUid, viewer.uid),
          eq(customExerciseVideos.customExerciseId, input.exerciseId),
        ),
      );
    await tx
      .delete(customExerciseAliases)
      .where(
        and(
          eq(customExerciseAliases.ownerFirebaseUid, viewer.uid),
          eq(customExerciseAliases.customExerciseId, input.exerciseId),
        ),
      );
    await tx
      .delete(customExerciseEquipment)
      .where(
        and(
          eq(customExerciseEquipment.ownerFirebaseUid, viewer.uid),
          eq(customExerciseEquipment.customExerciseId, input.exerciseId),
        ),
      );
    await insertChildren(tx, viewer.uid, input.exerciseId, draft);
    const exercise = await loadExercise(tx, viewer.uid, input.exerciseId);
    if (!exercise) throw notFound();
    await saveOperationResult(tx, viewer.uid, input.idempotencyKey, { exercise });
    return { exercise, duplicate: false };
  });
}

async function deletionReferenceCount(
  database: Database,
  ownerUid: string,
  exerciseId: string,
): Promise<number> {
  const [semantic, records, summaries] = await Promise.all([
    semanticReferenceCount(database, ownerUid, exerciseId),
    database
      .select({ value: count() })
      .from(personalRecords)
      .where(
        and(
          eq(personalRecords.ownerFirebaseUid, ownerUid),
          eq(personalRecords.customExerciseId, exerciseId),
        ),
      ),
    database
      .select({ value: count() })
      .from(progressSummaries)
      .where(
        and(
          eq(progressSummaries.ownerFirebaseUid, ownerUid),
          eq(progressSummaries.customExerciseId, exerciseId),
        ),
      ),
  ]);
  return semantic + (records[0]?.value ?? 0) + (summaries[0]?.value ?? 0);
}

export async function deleteCustomExercise(
  database: Database,
  viewer: ViewerContext,
  input: DeleteExerciseInput,
): Promise<CustomExerciseDeleteResult> {
  assertEligible(viewer);
  assertIdempotencyKey(input.idempotencyKey);
  const operation = "custom_exercise.delete";
  const requestHash = hashRequest({ operation, exerciseId: input.exerciseId });

  return database.transaction(async (transaction) => {
    const tx = transaction as unknown as Database;
    const reservation = await reserveOperation(tx, {
      ownerUid: viewer.uid,
      idempotencyKey: input.idempotencyKey,
      operation,
      requestHash,
      initialPayload: { pending: true, exerciseId: input.exerciseId },
    });
    if (reservation.duplicate) {
      if (reservation.payload["exerciseId"] !== input.exerciseId) {
        throw new CustomExerciseRepositoryError(
          "idempotency_conflict",
          "The earlier operation result is unavailable.",
          409,
        );
      }
      return { exerciseId: input.exerciseId, duplicate: true };
    }

    const existing = await loadExercise(tx, viewer.uid, input.exerciseId);
    if (!existing) throw notFound();
    if ((await deletionReferenceCount(tx, viewer.uid, input.exerciseId)) > 0) {
      throw new CustomExerciseRepositoryError(
        "in_use",
        "This exercise is still referenced by a program or workout.",
        409,
      );
    }
    await tx
      .delete(personalGuidanceLinks)
      .where(
        and(
          eq(personalGuidanceLinks.ownerFirebaseUid, viewer.uid),
          eq(personalGuidanceLinks.customExerciseId, input.exerciseId),
        ),
      );
    await tx
      .delete(customExerciseVideos)
      .where(
        and(
          eq(customExerciseVideos.ownerFirebaseUid, viewer.uid),
          eq(customExerciseVideos.customExerciseId, input.exerciseId),
        ),
      );
    await tx
      .delete(customExerciseAliases)
      .where(
        and(
          eq(customExerciseAliases.ownerFirebaseUid, viewer.uid),
          eq(customExerciseAliases.customExerciseId, input.exerciseId),
        ),
      );
    await tx
      .delete(customExerciseEquipment)
      .where(
        and(
          eq(customExerciseEquipment.ownerFirebaseUid, viewer.uid),
          eq(customExerciseEquipment.customExerciseId, input.exerciseId),
        ),
      );
    await tx
      .delete(customExercises)
      .where(
        and(
          eq(customExercises.ownerFirebaseUid, viewer.uid),
          eq(customExercises.id, input.exerciseId),
        ),
      );
    await saveOperationResult(tx, viewer.uid, input.idempotencyKey, {
      exerciseId: input.exerciseId,
      deleted: true,
    });
    return { exerciseId: input.exerciseId, duplicate: false };
  });
}
