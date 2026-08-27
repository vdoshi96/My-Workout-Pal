import { z } from "zod";

export { programPublishRequestSchema } from "@/domain/programs/publication";
import { AuthPolicyError } from "@/server/auth/policy";
import { FirebaseConfigurationError } from "@/server/firebase/admin";
import {
  privateJson,
  PrivateApiBodyError,
} from "@/server/http/custom-exercise-api";
import {
  RepositoryConflictError,
  RepositoryNotFoundError,
  RepositoryValidationError,
} from "@/server/repositories/profile-program";

const profileKindSchema = z.enum(["dumbbells", "barbell"]);
const idempotencyKeySchema = z.string().trim().min(1).max(180);

export const onboardingRequestSchema = z
  .object({
    equipmentProfileKind: profileKindSchema,
    idempotencyKey: idempotencyKeySchema,
    reducedMotion: z.boolean().default(false),
    timezone: z.string().trim().min(1).max(64).default("UTC"),
    unitSystem: z.enum(["metric", "imperial"]).default("metric"),
  })
  .strict();

export const equipmentChangeRequestSchema = z
  .object({
    baseRevisionId: z.string().uuid(),
    equipmentProfileKind: profileKindSchema,
    idempotencyKey: idempotencyKeySchema,
    programId: z.string().uuid(),
  })
  .strict();

export const preferencesUpdateRequestSchema = z
  .object({
    expectedUpdatedAt: z.string().datetime({ offset: true }),
    idempotencyKey: idempotencyKeySchema,
    reducedMotion: z.boolean(),
    timezone: z.string().trim().min(1).max(64),
    unitSystem: z.enum(["metric", "imperial"]),
  })
  .strict();

const programNameSchema = z.string().trim().min(1).max(80);

export const programCollectionMutationRequestSchema = z.discriminatedUnion(
  "mode",
  [
    z
      .object({
        equipmentProfileKind: profileKindSchema,
        idempotencyKey: idempotencyKeySchema,
        mode: z.literal("starter"),
        name: programNameSchema,
      })
      .strict(),
    z
      .object({
        dayName: z.string().trim().min(1).max(120),
        equipmentProfileKind: profileKindSchema,
        firstCatalogExerciseId: z.string().uuid(),
        idempotencyKey: idempotencyKeySchema,
        mode: z.literal("custom"),
        name: programNameSchema,
        sectionName: z.string().trim().min(1).max(120),
      })
      .strict(),
    z
      .object({
        idempotencyKey: idempotencyKeySchema,
        mode: z.literal("clone"),
        name: programNameSchema,
        sourceProgramId: z.string().uuid(),
        sourceRevisionId: z.string().uuid(),
      })
      .strict(),
  ],
);

export const activateProgramRequestSchema = z
  .object({
    expectedActiveProgramId: z.string().uuid(),
    idempotencyKey: idempotencyKeySchema,
    programId: z.string().uuid(),
    revisionId: z.string().uuid(),
  })
  .strict();

export function profileProgramApiError(error: unknown): Response {
  if (
    error instanceof RepositoryNotFoundError ||
    error instanceof RepositoryConflictError ||
    error instanceof RepositoryValidationError
  ) {
    return privateJson({ error: error.code, message: error.message }, { status: error.status });
  }
  if (error instanceof AuthPolicyError) {
    return privateJson({ error: error.code, message: error.message }, { status: error.status });
  }
  if (error instanceof FirebaseConfigurationError) {
    return privateJson(
      { error: "auth_unavailable", message: "Authentication is not configured." },
      { status: 503 },
    );
  }
  if (error instanceof PrivateApiBodyError) {
    return privateJson({ error: error.code, message: error.message }, { status: error.status });
  }
  if (error instanceof z.ZodError || error instanceof RangeError) {
    return privateJson(
      { error: "invalid_request", message: "The request is invalid." },
      { status: 400 },
    );
  }
  return privateJson(
    { error: "server_error", message: "The request could not be completed." },
    { status: 500 },
  );
}
