import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import { createWorkoutApi } from "@/server/http/workout-api";
import { CSRF_COOKIE_NAME } from "@/server/auth/cookies";
import { AuthPolicyError } from "@/server/auth/policy";
import type { ViewerContext } from "@/server/auth/viewer";
import {
  WorkoutRepositoryError,
  type WorkoutRepository,
  type WorkoutResumeReadModel,
} from "@/server/repositories/workout-repository";

const origin = "http://127.0.0.1:3000";
const programId = "11111111-1111-4111-8111-111111111111";
const dayId = "22222222-2222-4222-8222-222222222222";
const sessionId = "33333333-3333-4333-8333-333333333333";
const exerciseId = "44444444-4444-4444-8444-444444444444";

const viewer: ViewerContext = {
  uid: "server-verified-user",
  displayName: "Athlete",
  email: "athlete@example.com",
  emailVerified: true,
  provider: "password",
  authTimeSeconds: 1_800_000_000,
  eligibleForPermanentMutations: true,
};

function workoutRequest(
  path: string,
  options: Readonly<{
    body?: unknown;
    contentLength?: string;
    method?: "GET" | "POST";
    requestOrigin?: string;
  }> = {},
): NextRequest {
  const method = options.method ?? "POST";
  const body = options.body === undefined ? undefined : JSON.stringify(options.body);
  const headers = new Headers({
    Cookie: `${CSRF_COOKIE_NAME}=csrf-token`,
    Host: "127.0.0.1:3000",
    Origin: options.requestOrigin ?? origin,
    "X-CSRF-Token": "csrf-token",
  });
  if (body !== undefined) headers.set("Content-Type", "application/json");
  if (options.contentLength !== undefined) headers.set("Content-Length", options.contentLength);
  return new NextRequest(`${origin}${path}`, {
    ...(body === undefined ? {} : { body }),
    headers,
    method,
  });
}

function resumeModel(): WorkoutResumeReadModel {
  const now = new Date("2026-08-25T12:00:00.000Z");
  return {
    session: {
      id: sessionId,
      ownerUid: viewer.uid,
      programId,
      programRevisionId: "55555555-5555-4555-8555-555555555555",
      state: "active",
      dayId,
      dayName: "Push",
      startedAt: now,
      completedAt: undefined,
      abandonedAt: undefined,
      createdAt: now,
      updatedAt: now,
    },
    snapshot: {
      sessionId,
      ownerUid: viewer.uid,
      programRevisionId: "55555555-5555-4555-8555-555555555555",
      dayId,
      dayName: "Push",
      exercises: [],
      cardioOptions: [],
    },
    exerciseStates: [],
    setLogs: [],
    cardioLog: undefined,
  };
}

function repository(overrides: Partial<WorkoutRepository> = {}): WorkoutRepository {
  return {
    startOrResume: vi.fn(),
    loadResume: vi.fn(),
    submitOperation: vi.fn(),
    history: vi.fn(),
    submitRunnerOperation: vi.fn(),
    ...overrides,
  };
}

describe("private workout API contract", () => {
  it("rejects cross-origin starts before viewer resolution or persistence", async () => {
    const getViewer = vi.fn(async () => viewer);
    const getRepository = vi.fn(() => repository());
    const api = createWorkoutApi({ getRepository, getViewer });

    const response = await api.start(
      workoutRequest("/api/app/workouts", {
        body: { programId, dayId, idempotencyKey: "start-1" },
        requestOrigin: "https://attacker.example",
      }),
    );

    expect(response.status).toBe(403);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toMatchObject({ error: "csrf_invalid" });
    expect(getViewer).not.toHaveBeenCalled();
    expect(getRepository).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated starts before reading the body or creating a repository", async () => {
    const getRepository = vi.fn(() => repository());
    const api = createWorkoutApi({ getRepository, getViewer: vi.fn(async () => null) });
    const request = workoutRequest("/api/app/workouts", {
      body: { programId, dayId, idempotencyKey: "start-1" },
    });
    const text = vi.spyOn(request, "text");

    const response = await api.start(request);

    expect(response.status).toBe(401);
    expect(text).not.toHaveBeenCalled();
    expect(getRepository).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({ error: "unauthenticated" });
  });

  it("rejects unverified mutation identities before reading hostile input", async () => {
    const getRepository = vi.fn(() => repository());
    const api = createWorkoutApi({
      getRepository,
      getViewer: vi.fn(async () => ({ ...viewer, eligibleForPermanentMutations: false })),
    });
    const request = workoutRequest("/api/app/workouts", { body: { invalid: true } });
    const text = vi.spyOn(request, "text");

    const response = await api.start(request);

    expect(response.status).toBe(403);
    expect(text).not.toHaveBeenCalled();
    expect(getRepository).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({ error: "mutation_forbidden" });
  });

  it("rejects oversized, malformed, and ownership-bearing start bodies before persistence", async () => {
    const getRepository = vi.fn(() => repository());
    const api = createWorkoutApi({ getRepository, getViewer: vi.fn(async () => viewer) });

    const oversized = await api.start(
      workoutRequest("/api/app/workouts", {
        body: { programId, dayId, idempotencyKey: "start-1" },
        contentLength: "32769",
      }),
    );
    const malformed = await api.start(
      new NextRequest(`${origin}/api/app/workouts`, {
        body: "{",
        headers: {
          Cookie: `${CSRF_COOKIE_NAME}=csrf-token`,
          Host: "127.0.0.1:3000",
          Origin: origin,
          "X-CSRF-Token": "csrf-token",
        },
        method: "POST",
      }),
    );
    const ownershipBearing = await api.start(
      workoutRequest("/api/app/workouts", {
        body: { programId, dayId, idempotencyKey: "start-1", ownerUid: "attacker" },
      }),
    );
    const actualOversizedBody = await api.start(
      workoutRequest("/api/app/workouts", {
        body: { programId, dayId, idempotencyKey: "x".repeat(33_000) },
      }),
    );

    expect(oversized.status).toBe(413);
    expect(malformed.status).toBe(400);
    expect(ownershipBearing.status).toBe(400);
    expect(actualOversizedBody.status).toBe(413);
    expect(getRepository).not.toHaveBeenCalled();
  });

  it("preserves an expired-session response without constructing persistence", async () => {
    const getRepository = vi.fn(() => repository());
    const api = createWorkoutApi({
      getRepository,
      getViewer: vi.fn(async () => {
        throw new AuthPolicyError("session_expired", "Your session expired. Sign in again.", 401);
      }),
    });

    const response = await api.resume(
      workoutRequest(`/api/app/workouts/${sessionId}`, { method: "GET" }),
      { sessionId },
    );

    expect(response.status).toBe(401);
    expect(getRepository).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: "session_expired",
      message: "Your session expired. Sign in again.",
    });
  });

  it("delegates a valid start with only the server-derived viewer and normalized fields", async () => {
    const startOrResume = vi.fn<WorkoutRepository["startOrResume"]>(async () => ({
      resumed: false,
      model: resumeModel(),
    }));
    const workouts = repository({ startOrResume });
    const api = createWorkoutApi({ getRepository: () => workouts, getViewer: async () => viewer });

    const response = await api.start(
      workoutRequest("/api/app/workouts", {
        body: { programId: ` ${programId} `, dayId: ` ${dayId} `, idempotencyKey: " start-1 " },
      }),
    );

    expect(response.status).toBe(201);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(startOrResume).toHaveBeenCalledWith(viewer, {
      programId,
      dayId,
      idempotencyKey: "start-1",
    });
    await expect(response.json()).resolves.toMatchObject({ resumed: false });
  });

  it("loads a resumable workout only after authentication and maps hidden resources to 404", async () => {
    const loadResume = vi.fn(async () => {
      throw new WorkoutRepositoryError("not_found", "Internal ownership detail");
    });
    const workouts = repository({ loadResume: loadResume as WorkoutRepository["loadResume"] });
    const api = createWorkoutApi({ getRepository: () => workouts, getViewer: async () => viewer });

    const response = await api.resume(
      workoutRequest(`/api/app/workouts/${sessionId}`, { method: "GET" }),
      { sessionId },
    );

    expect(response.status).toBe(404);
    expect(loadResume).toHaveBeenCalledWith(viewer, { sessionId });
    await expect(response.json()).resolves.toEqual({
      error: "not_found",
      message: "The requested workout was not found.",
    });
  });

  it.each([
    ["ownerUid", "attacker"],
    ["expectedVersion", 1],
    ["sequence", 7],
    ["status", "pending"],
  ] as const)("rejects the client-controlled %s operation field", async (field, value) => {
    const getRepository = vi.fn(() => repository());
    const api = createWorkoutApi({ getRepository, getViewer: async () => viewer });

    const response = await api.operate(
      workoutRequest(`/api/app/workouts/${sessionId}/operations`, {
        body: {
          idempotencyKey: "note-1",
          baseRevision: "55555555-5555-4555-8555-555555555555",
          kind: "save_note",
          payload: { kind: "save_note", exerciseId, note: "Felt steady" },
          [field]: value,
        },
      }),
      { sessionId },
    );

    expect(response.status).toBe(400);
    expect(getRepository).not.toHaveBeenCalled();
  });

  it("returns a structured runner conflict for local retry and recovery handling", async () => {
    const submitRunnerOperation = vi.fn(async () => ({
      status: "failed" as const,
      code: "conflict",
      message: "The workout revision changed.",
      retryable: false,
      conflict: true,
    }));
    const workouts = repository({ submitRunnerOperation });
    const api = createWorkoutApi({ getRepository: () => workouts, getViewer: async () => viewer });

    const response = await api.operate(
      workoutRequest(`/api/app/workouts/${sessionId}/operations`, {
        body: {
          idempotencyKey: "note-conflict",
          baseRevision: "55555555-5555-4555-8555-555555555555",
          kind: "save_note",
          payload: { kind: "save_note", exerciseId, note: "Felt steady" },
        },
      }),
      { sessionId },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "failed",
      code: "conflict",
      message: "The workout revision changed.",
      retryable: false,
      conflict: true,
    });
  });

  it("strictly normalizes a queued runner operation without trusting client lifecycle state", async () => {
    const submitRunnerOperation = vi.fn(async () => ({
      status: "saved" as const,
      persistedId: exerciseId,
    }));
    const workouts = repository({ submitRunnerOperation });
    const api = createWorkoutApi({
      getRepository: () => workouts,
      getViewer: async () => viewer,
      now: () => 1_800_000_000_000,
    });

    const response = await api.operate(
      workoutRequest(`/api/app/workouts/${sessionId}/operations`, {
        body: {
          idempotencyKey: " note-1 ",
          baseRevision: " 55555555-5555-4555-8555-555555555555 ",
          kind: "save_note",
          payload: { kind: "save_note", exerciseId: ` ${exerciseId} `, note: "Felt steady" },
        },
      }),
      { sessionId: ` ${sessionId} ` },
    );

    expect(response.status).toBe(200);
    expect(submitRunnerOperation).toHaveBeenCalledWith(viewer, {
      sessionId,
      ownerUid: viewer.uid,
      baseRevision: "55555555-5555-4555-8555-555555555555",
      idempotencyKey: "note-1",
      kind: "save_note",
      payload: { kind: "save_note", exerciseId, note: "Felt steady" },
      sequence: 0,
      createdAt: 1_800_000_000_000,
      attempts: 0,
      status: "pending",
      persistedId: undefined,
      errorCode: undefined,
      errorMessage: undefined,
      retryable: undefined,
      failureKind: undefined,
    });
    await expect(response.json()).resolves.toMatchObject({ status: "saved", persistedId: exerciseId });
  });

  it.each([
    ["mutation_forbidden", 403],
    ["invalid_request", 400],
    ["conflict", 409],
    ["stale_version", 409],
    ["terminal", 409],
    ["not_ready", 409],
  ] as const)("maps %s repository failures to a safe %i response", async (code, status) => {
    const submitRunnerOperation = vi.fn(async () => {
      throw new WorkoutRepositoryError(code, "Sensitive persistence detail");
    });
    const workouts = repository({
      submitRunnerOperation: submitRunnerOperation as WorkoutRepository["submitRunnerOperation"],
    });
    const api = createWorkoutApi({ getRepository: () => workouts, getViewer: async () => viewer });

    const response = await api.operate(
      workoutRequest(`/api/app/workouts/${sessionId}/operations`, {
        body: {
          idempotencyKey: "complete-1",
          baseRevision: "55555555-5555-4555-8555-555555555555",
          kind: "complete_exercise",
          payload: { kind: "complete_exercise", exerciseId },
        },
      }),
      { sessionId },
    );

    expect(response.status).toBe(status);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body = await response.json();
    expect(body).toMatchObject({ error: code });
    expect(body.message).not.toContain("Sensitive persistence detail");
  });

  it("does not expose unexpected persistence failures", async () => {
    const startOrResume = vi.fn(async () => {
      throw new Error("DATABASE_URL and internal host leaked");
    });
    const workouts = repository({ startOrResume: startOrResume as WorkoutRepository["startOrResume"] });
    const api = createWorkoutApi({ getRepository: () => workouts, getViewer: async () => viewer });

    const response = await api.start(
      workoutRequest("/api/app/workouts", {
        body: { programId, dayId, idempotencyKey: "start-1" },
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "workout_unavailable",
      message: "The workout could not be updated.",
    });
  });
});
