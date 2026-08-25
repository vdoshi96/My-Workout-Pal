import { createHash } from "node:crypto";

import { z } from "zod";

export const accountDeletionRequestSchema = z
  .object({
    confirmation: z.literal("DELETE"),
    idempotencyKey: z.string().trim().min(1).max(180),
  })
  .strict();

export type AccountDeletionRequest = z.infer<typeof accountDeletionRequestSchema>;
export type AccountDeletionJobState = Readonly<{
  attemptCount: number;
  completedAt: Date | null;
  lastErrorCode: string | null;
  phase: "database" | "firebase" | "complete";
  status: "pending" | "running" | "blocked" | "completed" | "failed";
}>;

export type AccountDeletionJobEvent = Readonly<
  | { type: "begin_database" }
  | { type: "database_committed" }
  | { type: "begin_firebase" }
  | {
      errorCode: string;
      retryable: boolean;
      type: "firebase_failed";
    }
  | { type: "firebase_completed" }
>;

export type FirebaseDeletionFailure = Readonly<{
  alreadyDeleted: boolean;
  code: "firebase_configuration" | "firebase_unavailable" | "firebase_user_absent";
  retryable: boolean;
}>;

export function accountDeletionRequestHash(input: AccountDeletionRequest): string {
  return createHash("sha256")
    .update(JSON.stringify({ confirmation: input.confirmation, version: 1 }))
    .digest("hex");
}

function transitionError(): never {
  throw new Error("The account deletion job transition is invalid.");
}

export function transitionAccountDeletionJob(
  current: AccountDeletionJobState,
  event: AccountDeletionJobEvent,
  now: Date,
): AccountDeletionJobState {
  if (current.status === "completed") return current;
  if (!Number.isInteger(current.attemptCount) || current.attemptCount < 0) transitionError();

  if (event.type === "begin_database") {
    if (current.phase !== "database" || !["pending", "failed"].includes(current.status)) {
      transitionError();
    }
    return {
      ...current,
      attemptCount: current.attemptCount + 1,
      lastErrorCode: null,
      status: "running",
    };
  }
  if (event.type === "database_committed") {
    if (current.phase !== "database" || current.status !== "running") transitionError();
    return { ...current, lastErrorCode: null, phase: "firebase", status: "running" };
  }
  if (event.type === "begin_firebase") {
    if (current.phase !== "firebase" || !["failed", "blocked"].includes(current.status)) {
      transitionError();
    }
    return {
      ...current,
      attemptCount: current.attemptCount + 1,
      lastErrorCode: null,
      status: "running",
    };
  }
  if (event.type === "firebase_failed") {
    if (current.phase !== "firebase" || current.status !== "running") transitionError();
    return {
      ...current,
      lastErrorCode: event.errorCode,
      status: event.retryable ? "failed" : "blocked",
    };
  }
  if (current.phase !== "firebase" || current.status !== "running") transitionError();
  return {
    ...current,
    completedAt: now,
    lastErrorCode: null,
    phase: "complete",
    status: "completed",
  };
}

function providerCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

export function classifyFirebaseDeletionError(error: unknown): FirebaseDeletionFailure {
  const code = providerCode(error);
  if (code === "auth/user-not-found") {
    return { alreadyDeleted: true, code: "firebase_user_absent", retryable: false };
  }
  if (
    code === "auth/insufficient-permission" ||
    code === "auth/invalid-credential" ||
    code === "auth/invalid-uid"
  ) {
    return { alreadyDeleted: false, code: "firebase_configuration", retryable: false };
  }
  return { alreadyDeleted: false, code: "firebase_unavailable", retryable: true };
}
