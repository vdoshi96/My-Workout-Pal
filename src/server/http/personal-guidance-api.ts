import { z } from "zod";

import { AuthPolicyError } from "@/server/auth/policy";
import { FirebaseConfigurationError } from "@/server/firebase/admin";
import {
  PrivateApiBodyError,
  privateJson,
} from "@/server/http/custom-exercise-api";
import {
  PersonalGuidanceValidationError,
} from "@/domain/exercises/personal-guidance";
import { movementSourceSchema } from "@/domain/exercises/movement-chooser-contract";
import { PersonalGuidanceRepositoryError } from "@/server/repositories/personal-guidance";

export const replacePersonalGuidanceRequestSchema = z
  .object({
    source: movementSourceSchema,
    links: z.array(z.string()).max(2),
    idempotencyKey: z.string().min(1).max(180),
  })
  .strict();

export const personalGuidanceQuerySchema = movementSourceSchema;

export function personalGuidanceApiError(error: unknown): Response {
  if (error instanceof PersonalGuidanceRepositoryError) {
    return privateJson(
      { error: error.code, message: error.message },
      { status: error.status },
    );
  }
  if (error instanceof PersonalGuidanceValidationError) {
    return privateJson(
      { error: error.code, message: error.message },
      { status: 400 },
    );
  }
  if (error instanceof AuthPolicyError) {
    return privateJson(
      { error: error.code, message: error.message },
      { status: error.status },
    );
  }
  if (error instanceof FirebaseConfigurationError) {
    return privateJson(
      { error: "auth_unavailable", message: "Authentication is not configured." },
      { status: 503 },
    );
  }
  if (error instanceof PrivateApiBodyError) {
    return privateJson(
      { error: error.code, message: error.message },
      { status: error.status },
    );
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
