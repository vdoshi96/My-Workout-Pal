import { z } from "zod";

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
