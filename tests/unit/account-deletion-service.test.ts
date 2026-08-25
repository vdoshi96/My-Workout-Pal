import { describe, expect, it, vi } from "vitest";

import type { ViewerContext } from "@/server/auth/viewer";
import {
  executeAccountDeletion,
  type AccountDeletionOperations,
} from "@/server/services/account-deletion";

const now = new Date("2026-08-25T21:00:00.000Z");
const viewer: ViewerContext = {
  authTimeSeconds: Math.floor(now.getTime() / 1_000),
  displayName: "Alice",
  eligibleForPermanentMutations: true,
  email: "alice@example.test",
  emailVerified: true,
  provider: "password",
  uid: "alice",
};
const input = { confirmation: "DELETE", idempotencyKey: "alice-delete" } as const;

function job(
  overrides: Partial<Awaited<ReturnType<AccountDeletionOperations["complete"]>>> = {},
) {
  return {
    attemptCount: 1,
    completedAt: null,
    lastErrorCode: null,
    phase: "firebase" as const,
    requestedAt: now,
    status: "running" as const,
    updatedAt: now,
    ...overrides,
  };
}

function operations(
  overrides: Partial<AccountDeletionOperations> = {},
): AccountDeletionOperations {
  return {
    begin: vi.fn().mockResolvedValue({ action: "delete_firebase", duplicate: false, job: job() }),
    complete: vi.fn().mockResolvedValue(job({ completedAt: now, phase: "complete", status: "completed" })),
    recordFailure: vi.fn().mockResolvedValue(job({ lastErrorCode: "firebase_unavailable", status: "failed" })),
    ...overrides,
  };
}

describe("account deletion service", () => {
  it("requires configured Firebase before reserving or deleting database data", async () => {
    const repository = operations();

    await expect(executeAccountDeletion({
      getFirebaseAuth: () => {
        throw new Error("configuration gate");
      },
      getRepository: () => repository,
    }, viewer, input, now)).rejects.toThrow("configuration gate");

    expect(repository.begin).not.toHaveBeenCalled();
  });

  it("deletes only the server-derived Firebase UID and completes the durable job", async () => {
    const repository = operations();
    const deleteUser = vi.fn().mockResolvedValue(undefined);

    const result = await executeAccountDeletion({
      getFirebaseAuth: () => ({ deleteUser }),
      getRepository: () => repository,
    }, viewer, input, now);

    expect(deleteUser).toHaveBeenCalledWith("alice");
    expect(repository.complete).toHaveBeenCalledWith(viewer, now);
    expect(result).toMatchObject({ duplicate: false, status: "completed" });
  });

  it("treats an already-absent Firebase identity as completed replay", async () => {
    const completed = job({ completedAt: now, phase: "complete", status: "completed" });
    const repository = operations({ recordFailure: vi.fn().mockResolvedValue(completed) });

    const result = await executeAccountDeletion({
      getFirebaseAuth: () => ({
        deleteUser: vi.fn().mockRejectedValue({ code: "auth/user-not-found", message: "private" }),
      }),
      getRepository: () => repository,
    }, viewer, input, now);

    expect(repository.recordFailure).toHaveBeenCalledWith(
      viewer,
      { alreadyDeleted: true, code: "firebase_user_absent", retryable: false },
      now,
    );
    expect(result).toMatchObject({ status: "completed" });
  });

  it("returns an honest retryable result after database deletion when Firebase is unavailable", async () => {
    const repository = operations();

    const result = await executeAccountDeletion({
      getFirebaseAuth: () => ({ deleteUser: vi.fn().mockRejectedValue(new Error("private socket detail")) }),
      getRepository: () => repository,
    }, viewer, input, now);

    expect(result).toMatchObject({
      databaseDeleted: true,
      errorCode: "firebase_unavailable",
      retryable: true,
      status: "identity_deletion_failed",
    });
    expect(JSON.stringify(result)).not.toContain("private socket detail");
  });

  it("does not classify a completion-write failure as a Firebase deletion failure", async () => {
    const repository = operations({
      complete: vi.fn().mockRejectedValue(new Error("completion write failed")),
    });

    await expect(executeAccountDeletion({
      getFirebaseAuth: () => ({ deleteUser: vi.fn().mockResolvedValue(undefined) }),
      getRepository: () => repository,
    }, viewer, input, now)).rejects.toThrow("completion write failed");

    expect(repository.recordFailure).not.toHaveBeenCalled();
  });
});
