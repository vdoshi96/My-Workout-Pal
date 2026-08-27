import { describe, expect, it, vi } from "vitest";

import {
  createInMemoryRunnerStorage,
  createRunnerState,
  createWorkoutSnapshot,
  runnerReducer,
  syncRunnerOperations,
  type ActiveWorkoutState,
} from "@/domain/workout-runner";

function queuedSetState(): ActiveWorkoutState {
  const snapshot = createWorkoutSnapshot({
    sessionId: "resilience-session",
    ownerUid: "resilience-owner",
    programRevisionId: "resilience-revision",
    dayId: "resilience-day",
    dayName: "Push",
    exercises: [
      {
        id: "resilience-press",
        name: "Dumbbell bench press",
        loggingKind: "weight_reps",
        sets: [
          {
            id: "resilience-set",
            position: 1,
            phase: "work",
            target: {
              kind: "weight_reps",
              minimumReps: 8,
              maximumReps: 12,
              restSeconds: 90,
            },
          },
        ],
      },
    ],
    cardioOptions: [],
  });
  const initial = createRunnerState(snapshot, { now: 1_000 });
  const drafted = runnerReducer(initial, {
    type: "update_set_draft",
    setId: "resilience-set",
    draft: { kind: "weight_reps", weightKg: 12.5, repetitions: 10 },
  });
  return runnerReducer(drafted, {
    type: "save_set",
    setId: "resilience-set",
    now: 1_002,
  });
}

describe("runner authentication and connectivity resilience", () => {
  it("classifies the server's thrown session_revoked code as a revoked auth blocker", async () => {
    const storage = createInMemoryRunnerStorage();
    const queued = queuedSetState();
    const originalKey = queued.operations[0]?.idempotencyKey;

    const result = await syncRunnerOperations(queued, {
      storage,
      submit: async () => {
        throw Object.assign(new Error("Sign-in session revoked."), {
          code: "session_revoked",
        });
      },
      now: 1_003,
    });

    expect(result.auth).toBe("revoked");
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0]).toMatchObject({
      idempotencyKey: originalKey,
      status: "pending",
      attempts: 1,
    });
  });

  it("classifies a returned session_revoked failure without replacing the queued key", async () => {
    const storage = createInMemoryRunnerStorage();
    const queued = queuedSetState();
    const originalKey = queued.operations[0]?.idempotencyKey;

    const result = await syncRunnerOperations(queued, {
      storage,
      submit: async () => ({
        status: "failed",
        code: "session_revoked",
        message: "Sign-in session revoked.",
        retryable: false,
      }),
      now: 1_004,
    });

    expect(result.auth).toBe("revoked");
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0]?.idempotencyKey).toBe(originalKey);
    expect(result.operations[0]?.status).toBe("pending");
  });

  it("retries a transport failure with the same key without an online event", async () => {
    const storage = createInMemoryRunnerStorage();
    const queued = queuedSetState();
    const originalKey = queued.operations[0]?.idempotencyKey;
    const submit = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({ status: "saved", persistedId: "saved-set" });

    const offline = await syncRunnerOperations(queued, {
      storage,
      submit,
      now: 1_005,
    });
    expect(offline.connectivity).toBe("offline");
    expect(offline.operations[0]?.idempotencyKey).toBe(originalKey);

    const explicitRetry = runnerReducer(offline, {
      type: "set_connectivity",
      connectivity: "online",
      now: 1_006,
    });
    const saved = await syncRunnerOperations(explicitRetry, {
      storage,
      submit,
      now: 1_007,
    });

    expect(submit).toHaveBeenCalledTimes(2);
    expect(submit.mock.calls[0]?.[0].idempotencyKey).toBe(originalKey);
    expect(submit.mock.calls[1]?.[0].idempotencyKey).toBe(originalKey);
    expect(saved.operations).toHaveLength(1);
    expect(saved.operations[0]).toMatchObject({
      idempotencyKey: originalKey,
      status: "saved",
      persistedId: "saved-set",
    });
  });
});
