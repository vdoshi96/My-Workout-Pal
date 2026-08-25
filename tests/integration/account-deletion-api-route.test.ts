import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import { createAccountDeletionHandler } from "@/server/http/account-deletion-route";
import { CSRF_COOKIE_NAME, SESSION_COOKIE_NAME } from "@/server/auth/cookies";
import type { ViewerContext } from "@/server/auth/viewer";

const origin = "http://127.0.0.1:3000";
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
const completed = {
  databaseDeleted: true,
  duplicate: false,
  identityDeletion: "deleted_or_absent",
  job: {
    attemptCount: 1,
    completedAt: now,
    lastErrorCode: null,
    phase: "complete",
    requestedAt: now,
    status: "completed",
    updatedAt: now,
  },
  status: "completed",
} as const;

function deletionRequest(
  body: string | unknown,
  requestOrigin = origin,
): NextRequest {
  const token = "account-deletion-csrf";
  return new NextRequest(`${origin}/api/app/account`, {
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      Cookie: `${CSRF_COOKIE_NAME}=${token}; ${SESSION_COOKIE_NAME}=session-value`,
      Host: "127.0.0.1:3000",
      Origin: requestOrigin,
      "X-CSRF-Token": token,
    },
    method: "DELETE",
  });
}

describe("account deletion route", () => {
  it("rejects cross-origin requests before identity, body, or deletion work", async () => {
    const getViewer = vi.fn().mockResolvedValue(viewer);
    const execute = vi.fn().mockResolvedValue(completed);
    const handler = createAccountDeletionHandler({ execute, getViewer, now: () => now });

    const response = await handler(deletionRequest("{", "https://attacker.example"));

    expect(response.status).toBe(403);
    expect(getViewer).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });

  it("rejects an absent viewer before parsing hostile JSON", async () => {
    const execute = vi.fn().mockResolvedValue(completed);
    const handler = createAccountDeletionHandler({
      execute,
      getViewer: vi.fn().mockResolvedValue(null),
      now: () => now,
    });

    const response = await handler(deletionRequest("{"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: "session_invalid" });
    expect(execute).not.toHaveBeenCalled();
  });

  it("rejects owner input and malformed confirmation before deletion work", async () => {
    const execute = vi.fn().mockResolvedValue(completed);
    const handler = createAccountDeletionHandler({
      execute,
      getViewer: vi.fn().mockResolvedValue(viewer),
      now: () => now,
    });

    const response = await handler(deletionRequest({
      confirmation: "delete",
      idempotencyKey: "delete-once",
      ownerUid: "bob",
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: "invalid_request" });
    expect(execute).not.toHaveBeenCalled();
  });

  it("clears the secure session only after completed database and identity deletion", async () => {
    const execute = vi.fn().mockResolvedValue(completed);
    const handler = createAccountDeletionHandler({
      execute,
      getViewer: vi.fn().mockResolvedValue(viewer),
      now: () => now,
    });

    const response = await handler(deletionRequest({
      confirmation: "DELETE",
      idempotencyKey: "delete-once",
    }));

    expect(execute).toHaveBeenCalledWith(
      viewer,
      { confirmation: "DELETE", idempotencyKey: "delete-once" },
      now,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(response.headers.get("vary")).toBe("Cookie");
    expect(response.headers.get("set-cookie")).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    await expect(response.json()).resolves.toEqual({
      deletion: {
        attemptCount: 1,
        databaseDeleted: true,
        duplicate: false,
        identityDeletion: "deleted_or_absent",
        status: "completed",
      },
    });
  });

  it("preserves the session and returns only safe retry metadata on Firebase failure", async () => {
    const execute = vi.fn().mockResolvedValue({
      databaseDeleted: true,
      duplicate: false,
      errorCode: "firebase_unavailable",
      identityDeletion: "unknown",
      job: {
        ...completed.job,
        completedAt: null,
        lastErrorCode: "firebase_unavailable",
        phase: "firebase",
        status: "failed",
      },
      retryable: true,
      status: "identity_deletion_failed",
    });
    const handler = createAccountDeletionHandler({
      execute,
      getViewer: vi.fn().mockResolvedValue(viewer),
      now: () => now,
    });

    const response = await handler(deletionRequest({
      confirmation: "DELETE",
      idempotencyKey: "delete-once",
    }));

    expect(response.status).toBe(503);
    expect(response.headers.get("set-cookie")).toBeNull();
    await expect(response.json()).resolves.toEqual({
      deletion: {
        attemptCount: 1,
        databaseDeleted: true,
        duplicate: false,
        errorCode: "firebase_unavailable",
        identityDeletion: "unknown",
        retryable: true,
        status: "identity_deletion_failed",
      },
      error: "identity_deletion_pending",
      message: "Your fitness data is deleted, but identity deletion is not confirmed. Retry after signing in again.",
    });
  });
});
