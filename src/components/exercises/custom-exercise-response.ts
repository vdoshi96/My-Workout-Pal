import { z } from "zod";

import {
  normalizeCustomExerciseDraft,
  type CustomExerciseDraftInput,
} from "@/domain/exercises/custom";
import type {
  CustomExerciseDeleteResult,
  CustomExerciseMutationResult,
} from "@/server/repositories/custom-exercises";

const equipmentId = z.enum(["bodyweight", "dumbbells", "bench", "barbell", "plates", "rack"]);
const exerciseSchema = z.object({
  aliases: z.array(z.object({
    alias: z.string().min(1).max(180),
    normalizedAlias: z.string().min(1).max(180),
  }).strict()).max(12),
  equipmentIds: z.array(equipmentId).min(1),
  id: z.string().uuid(),
  instructions: z.string().max(4_000),
  loggingKind: z.enum(["weight_reps", "bodyweight_reps", "duration", "distance_duration"]),
  name: z.string().min(1).max(180),
  updatedAt: z.string().datetime({ offset: true }),
  youtubeVideoIds: z.array(z.string().regex(/^[A-Za-z0-9_-]{11}$/u)).max(2),
}).strict();

const mutationSchema = z.object({
  duplicate: z.boolean(),
  exercise: exerciseSchema,
}).strict();

const deleteSchema = z.object({
  duplicate: z.boolean(),
  exerciseId: z.string().uuid(),
}).strict();

function same(value: unknown, expected: unknown): boolean {
  return JSON.stringify(value) === JSON.stringify(expected);
}

export function parseCustomExerciseMutationResponse(
  value: unknown,
  draft: CustomExerciseDraftInput,
  expectedExerciseId?: string,
): CustomExerciseMutationResult {
  const parsed = mutationSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error("The server returned an invalid custom exercise response.");
  }
  const normalized = normalizeCustomExerciseDraft(draft);
  const exercise = parsed.data.exercise;
  if (expectedExerciseId && exercise.id !== expectedExerciseId) {
    throw new Error("The server response does not match the edited exercise.");
  }
  if (
    exercise.name !== normalized.name ||
    exercise.loggingKind !== normalized.loggingKind ||
    exercise.instructions !== normalized.instructions ||
    !same(exercise.equipmentIds, normalized.equipmentIds) ||
    !same(exercise.aliases, normalized.aliases) ||
    !same(exercise.youtubeVideoIds, normalized.youtubeVideoIds)
  ) {
    throw new Error("The server response does not match the saved custom exercise.");
  }
  return parsed.data;
}

export function parseCustomExerciseDeleteResponse(
  value: unknown,
  expectedExerciseId: string,
): CustomExerciseDeleteResult {
  const parsed = deleteSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error("The server returned an invalid custom exercise deletion response.");
  }
  if (parsed.data.exerciseId !== expectedExerciseId) {
    throw new Error("The server response does not match the deleted exercise.");
  }
  return parsed.data;
}
