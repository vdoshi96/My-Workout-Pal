import { Buffer } from "node:buffer";

import { NextResponse } from "next/server";
import { z } from "zod";

import { CustomExerciseValidationError } from "@/domain/exercises/custom";
import { AuthPolicyError } from "@/server/auth/policy";
import type { ViewerContext } from "@/server/auth/viewer";
import { CustomExerciseRepositoryError } from "@/server/repositories/custom-exercises";
import { FirebaseConfigurationError } from "@/server/firebase/admin";

export const PRIVATE_JSON_BODY_LIMIT_BYTES = 32 * 1_024;

export class PrivateApiBodyError extends Error {
  readonly code: "invalid_json" | "request_too_large";
  readonly status: 400 | 413;

  constructor(code: PrivateApiBodyError["code"], message: string, status: PrivateApiBodyError["status"]) {
    super(message);
    this.name = "PrivateApiBodyError";
    this.code = code;
    this.status = status;
  }
}

export const customExerciseDraftSchema = z
  .object({
    aliases: z.array(z.string()).optional(),
    equipmentIds: z.array(z.string()),
    instructions: z.string().optional(),
    loggingKind: z.string(),
    name: z.string(),
    videoUrls: z.array(z.string()).optional(),
  })
  .strict();

export const createCustomExerciseRequestSchema = z
  .object({
    draft: customExerciseDraftSchema,
    idempotencyKey: z.string(),
  })
  .strict();

export const updateCustomExerciseRequestSchema = createCustomExerciseRequestSchema
  .extend({ expectedUpdatedAt: z.string() })
  .strict();

export const deleteCustomExerciseRequestSchema = z
  .object({ idempotencyKey: z.string() })
  .strict();

export const customExerciseIdSchema = z.string().uuid();

export async function readBoundedJson(
  request: Request,
  maximumBytes = PRIVATE_JSON_BODY_LIMIT_BYTES,
): Promise<unknown> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    const bytes = Number(declaredLength);
    if (!Number.isSafeInteger(bytes) || bytes < 0) {
      throw new PrivateApiBodyError("invalid_json", "The request body is invalid.", 400);
    }
    if (bytes > maximumBytes) {
      throw new PrivateApiBodyError("request_too_large", "The request body is too large.", 413);
    }
  }

  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > maximumBytes) {
    throw new PrivateApiBodyError("request_too_large", "The request body is too large.", 413);
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new PrivateApiBodyError("invalid_json", "The request body must be valid JSON.", 400);
  }
}

export function requirePrivateViewer(viewer: ViewerContext | null): ViewerContext {
  if (!viewer) {
    throw new AuthPolicyError("session_invalid", "A valid session is required.", 401);
  }
  return viewer;
}

export function privateJson(value: unknown, init?: ResponseInit): NextResponse {
  const response = NextResponse.json(value, init);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Vary", "Cookie");
  return response;
}

export function customExerciseApiError(error: unknown): NextResponse {
  if (error instanceof CustomExerciseRepositoryError) {
    return privateJson({ error: error.code, message: error.message }, { status: error.status });
  }
  if (error instanceof CustomExerciseValidationError) {
    return privateJson({ error: error.code, message: error.message }, { status: 400 });
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
    return privateJson({ error: "invalid_request", message: "The request is invalid." }, { status: 400 });
  }
  return privateJson(
    { error: "server_error", message: "The request could not be completed." },
    { status: 500 },
  );
}
