import { describe, expect, it, vi } from "vitest";

import {
  WorkoutApiContractError,
  createWorkoutRunnerSubmitter,
  runnerOperationRequest,
} from "@/client/workout-api";
import type { RunnerOperation } from "@/domain/workout-runner";

const sessionId = "33333333-3333-4333-8333-333333333333";
const exerciseId = "44444444-4444-4444-8444-444444444444";

function operation(): RunnerOperation {
  return {
    idempotencyKey: "note-1",
    kind: "save_note",
    payload: { kind: "save_note", exerciseId, note: "Felt steady" },
    ownerUid: "server-verified-user",
    sessionId,
    baseRevision: "55555555-5555-4555-8555-555555555555",
    sequence: 9,
    createdAt: 1_800_000_000_000,
    attempts: 2,
    status: "pending",
    persistedId: undefined,
    errorCode: undefined,
    errorMessage: undefined,
    retryable: undefined,
    failureKind: undefined,
  };
}

describe("workout API runner adapter", () => {
  it("maps a queued operation to the owner-free route envelope", () => {
    expect(runnerOperationRequest(operation())).toEqual({
      url: `/api/app/workouts/${sessionId}/operations`,
      body: {
        idempotencyKey: "note-1",
        baseRevision: "55555555-5555-4555-8555-555555555555",
        kind: "save_note",
        payload: { kind: "save_note", exerciseId, note: "Felt steady" },
      },
    });
  });

  it("rejects a corrupt restored operation before making a request", () => {
    const corrupt = {
      ...operation(),
      kind: "complete_exercise",
    } as unknown as RunnerOperation;

    expect(() => runnerOperationRequest(corrupt)).toThrowError(
      expect.objectContaining({
        name: "WorkoutApiContractError",
        code: "invalid_operation",
      }),
    );
  });

  it("submits through the private mutation boundary and validates saved responses", async () => {
    const mutate = vi.fn(async () => ({ status: "saved", persistedId: exerciseId }));
    const submit = createWorkoutRunnerSubmitter(mutate);

    await expect(submit(operation())).resolves.toEqual({
      status: "saved",
      persistedId: exerciseId,
    });
    expect(mutate).toHaveBeenCalledWith(
      `/api/app/workouts/${sessionId}/operations`,
      {
        method: "POST",
        body: {
          idempotencyKey: "note-1",
          baseRevision: "55555555-5555-4555-8555-555555555555",
          kind: "save_note",
          payload: { kind: "save_note", exerciseId, note: "Felt steady" },
        },
      },
    );
  });

  it("preserves structured failed results for runner conflict and auth handling", async () => {
    const mutate = vi.fn(async () => ({
      status: "failed",
      code: "session_expired",
      message: "Sign in again.",
      retryable: false,
      authExpired: true,
      conflict: false,
    }));
    const submit = createWorkoutRunnerSubmitter(mutate);

    await expect(submit(operation())).resolves.toEqual({
      status: "failed",
      code: "session_expired",
      message: "Sign in again.",
      retryable: false,
      authExpired: true,
      conflict: false,
    });
  });

  it.each([
    null,
    { status: "saved", persistedId: 123 },
    { status: "failed" },
    { status: "failed", code: "conflict", unexpected: true },
    { status: "invented" },
  ])("rejects malformed success responses instead of claiming a save: %j", async (response) => {
    const submit = createWorkoutRunnerSubmitter(vi.fn(async () => response));

    await expect(submit(operation())).rejects.toMatchObject({
      name: "WorkoutApiContractError",
      code: "invalid_response",
    });
  });

  it("preserves a private-client network failure for offline classification", async () => {
    const networkFailure = Object.assign(new Error("Network unavailable"), {
      code: "network_error",
    });
    const submit = createWorkoutRunnerSubmitter(
      vi.fn(async () => {
        throw networkFailure;
      }),
    );

    await expect(submit(operation())).rejects.toBe(networkFailure);
    expect(networkFailure).not.toBeInstanceOf(WorkoutApiContractError);
  });
});
