import { describe, expect, it } from "vitest";

import {
  accountDeletionRequestHash,
  accountDeletionRequestSchema,
  classifyFirebaseDeletionError,
  transitionAccountDeletionJob,
  type AccountDeletionJobState,
} from "@/domain/account-deletion";

const now = new Date("2026-08-25T20:00:00.000Z");

function pendingJob(): AccountDeletionJobState {
  return {
    attemptCount: 0,
    completedAt: null,
    lastErrorCode: null,
    phase: "database",
    status: "pending",
  };
}

describe("account deletion domain", () => {
  it("accepts only the exact owner-free confirmation envelope", () => {
    const input = {
      confirmation: "DELETE",
      idempotencyKey: "delete-once",
    };

    expect(accountDeletionRequestSchema.parse(input)).toEqual(input);
    expect(() => accountDeletionRequestSchema.parse({ ...input, confirmation: "delete" })).toThrow();
    expect(() => accountDeletionRequestSchema.parse({ ...input, ownerUid: "other-user" })).toThrow();
    expect(() => accountDeletionRequestSchema.parse({ ...input, idempotencyKey: " " })).toThrow();
  });

  it("hashes deletion intent deterministically without the retry key", () => {
    expect(accountDeletionRequestHash({ confirmation: "DELETE", idempotencyKey: "first" })).toBe(
      accountDeletionRequestHash({ confirmation: "DELETE", idempotencyKey: "second" }),
    );
    expect(accountDeletionRequestHash({ confirmation: "DELETE", idempotencyKey: "first" })).toMatch(
      /^[0-9a-f]{64}$/u,
    );
  });

  it("moves monotonically from database work through Firebase completion", () => {
    const runningDatabase = transitionAccountDeletionJob(pendingJob(), { type: "begin_database" }, now);
    expect(runningDatabase).toEqual({
      attemptCount: 1,
      completedAt: null,
      lastErrorCode: null,
      phase: "database",
      status: "running",
    });
    const runningFirebase = transitionAccountDeletionJob(
      runningDatabase,
      { type: "database_committed" },
      now,
    );
    expect(runningFirebase).toMatchObject({ phase: "firebase", status: "running" });
    const completed = transitionAccountDeletionJob(
      runningFirebase,
      { type: "firebase_completed" },
      now,
    );
    expect(completed).toEqual({
      attemptCount: 1,
      completedAt: now,
      lastErrorCode: null,
      phase: "complete",
      status: "completed",
    });
    expect(transitionAccountDeletionJob(completed, { type: "begin_database" }, now)).toEqual(completed);
  });

  it("keeps Firebase failures resumable without accepting an invalid transition", () => {
    const runningFirebase: AccountDeletionJobState = {
      attemptCount: 1,
      completedAt: null,
      lastErrorCode: null,
      phase: "firebase",
      status: "running",
    };
    expect(
      transitionAccountDeletionJob(
        runningFirebase,
        { errorCode: "firebase_unavailable", retryable: true, type: "firebase_failed" },
        now,
      ),
    ).toEqual({
      attemptCount: 1,
      completedAt: null,
      lastErrorCode: "firebase_unavailable",
      phase: "firebase",
      status: "failed",
    });
    expect(() => transitionAccountDeletionJob(pendingJob(), { type: "firebase_completed" }, now)).toThrow(
      /transition/i,
    );
  });

  it("classifies Firebase outcomes without returning raw provider messages", () => {
    expect(classifyFirebaseDeletionError({ code: "auth/user-not-found", message: "private detail" })).toEqual({
      alreadyDeleted: true,
      code: "firebase_user_absent",
      retryable: false,
    });
    expect(classifyFirebaseDeletionError({ code: "auth/insufficient-permission", message: "secret" })).toEqual({
      alreadyDeleted: false,
      code: "firebase_configuration",
      retryable: false,
    });
    expect(classifyFirebaseDeletionError(new Error("socket contained secret details"))).toEqual({
      alreadyDeleted: false,
      code: "firebase_unavailable",
      retryable: true,
    });
  });
});
