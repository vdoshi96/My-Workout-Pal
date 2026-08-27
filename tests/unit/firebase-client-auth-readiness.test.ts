import { afterEach, describe, expect, it, vi } from "vitest";

import {
  classifyFirebaseClientIdentity,
  resolveFirebaseClientIdentity,
} from "@/client/firebase-client-auth-readiness";

afterEach(() => {
  vi.useRealTimers();
});

describe("Firebase client auth readiness", () => {
  it("waits for Firebase's initial state before reading the current user", async () => {
    let releaseReadiness: (() => void) | undefined;
    const waitForInitialState = vi.fn(
      () => new Promise<void>((resolve) => {
        releaseReadiness = resolve;
      }),
    );
    const getCurrentUser = vi.fn(() => ({ uid: "alice" }));

    const result = resolveFirebaseClientIdentity(
      { getCurrentUser, waitForInitialState },
      "alice",
      5_000,
    );

    await Promise.resolve();
    expect(getCurrentUser).not.toHaveBeenCalled();

    releaseReadiness?.();
    await expect(result).resolves.toEqual({ status: "ready" });
    expect(getCurrentUser).toHaveBeenCalledOnce();
  });

  it("classifies settled matching, missing, and mismatched identities without exposing UIDs", () => {
    expect(classifyFirebaseClientIdentity({ uid: "alice" }, "alice")).toEqual({
      status: "ready",
    });
    expect(classifyFirebaseClientIdentity(null, "alice")).toEqual({
      status: "missing",
    });
    expect(classifyFirebaseClientIdentity({ uid: "bob" }, "alice")).toEqual({
      status: "mismatch",
    });
  });

  it("maps Firebase initialization rejection to a safe unavailable state", async () => {
    const getCurrentUser = vi.fn(() => ({ uid: "sensitive-owner" }));

    await expect(resolveFirebaseClientIdentity(
      {
        getCurrentUser,
        waitForInitialState: vi.fn().mockRejectedValue(
          new Error("provider detail for sensitive-owner"),
        ),
      },
      "sensitive-owner",
      5_000,
    )).resolves.toEqual({ status: "unavailable" });

    expect(getCurrentUser).not.toHaveBeenCalled();
  });

  it("fails closed after the bounded wait and clears the timeout after success", async () => {
    vi.useFakeTimers();
    const timeout = resolveFirebaseClientIdentity(
      {
        getCurrentUser: vi.fn(() => ({ uid: "alice" })),
        waitForInitialState: vi.fn(() => new Promise<void>(() => undefined)),
      },
      "alice",
      2_000,
    );

    await vi.advanceTimersByTimeAsync(2_000);
    await expect(timeout).resolves.toEqual({ status: "unavailable" });

    const settled = await resolveFirebaseClientIdentity(
      {
        getCurrentUser: vi.fn(() => ({ uid: "alice" })),
        waitForInitialState: vi.fn().mockResolvedValue(undefined),
      },
      "alice",
      2_000,
    );
    expect(settled).toEqual({ status: "ready" });
    expect(vi.getTimerCount()).toBe(0);
  });
});
