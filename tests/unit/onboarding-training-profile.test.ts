import { afterEach, describe, expect, it, vi } from "vitest";

import {
  onboardingRequestSchema,
  programCollectionMutationRequestSchema,
  trainingProfileUpdateRequestSchema,
} from "@/server/http/profile-program-api";

const answers = { goal: "general", experience: "new", daysPerWeek: 3 } as const;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("generated onboarding request", () => {
  const base = {
    equipmentProfileKind: "dumbbells",
    idempotencyKey: "onboard-generated-1",
    mode: "generated",
    trainingProfile: answers,
  } as const;

  it("accepts strict answers and applies the usual preference defaults", () => {
    const parsed = onboardingRequestSchema.parse(base);
    expect(parsed).toMatchObject({
      mode: "generated",
      reducedMotion: false,
      timezone: "UTC",
      trainingProfile: answers,
      unitSystem: "metric",
    });
  });

  it("requires the answers and rejects ownership, extra, or client-built routine fields", () => {
    const withoutAnswers: { -readonly [K in keyof typeof base]?: (typeof base)[K] } = { ...base };
    delete withoutAnswers.trainingProfile;
    expect(onboardingRequestSchema.safeParse(withoutAnswers).success).toBe(false);
    expect(onboardingRequestSchema.safeParse({ ...base, ownerUid: "someone-else" }).success).toBe(false);
    expect(onboardingRequestSchema.safeParse({
      ...base,
      trainingProfile: { ...answers, ownerFirebaseUid: "someone-else" },
    }).success).toBe(false);
    expect(onboardingRequestSchema.safeParse({ ...base, routine: { days: [] } }).success).toBe(false);
    expect(onboardingRequestSchema.safeParse({
      ...base,
      trainingProfile: { ...answers, daysPerWeek: 7 },
    }).success).toBe(false);
    expect(onboardingRequestSchema.safeParse({
      ...base,
      trainingProfile: { ...answers, goal: "bulk" },
    }).success).toBe(false);
  });

  it("keeps example and blank onboarding valid without answers", () => {
    expect(onboardingRequestSchema.safeParse({
      equipmentProfileKind: "barbell",
      idempotencyKey: "onboard-example",
      mode: "example",
    }).success).toBe(true);
    expect(onboardingRequestSchema.safeParse({
      equipmentProfileKind: "dumbbells",
      firstExerciseSlug: "goblet-squat",
      idempotencyKey: "onboard-blank",
      mode: "blank",
    }).success).toBe(true);
  });
});

describe("training answers update request", () => {
  it("accepts a first save and an optimistic update", () => {
    expect(trainingProfileUpdateRequestSchema.safeParse({
      expectedUpdatedAt: null,
      idempotencyKey: "answers-1",
      trainingProfile: answers,
    }).success).toBe(true);
    expect(trainingProfileUpdateRequestSchema.safeParse({
      expectedUpdatedAt: "2026-10-05T12:00:00.000Z",
      idempotencyKey: "answers-2",
      trainingProfile: answers,
    }).success).toBe(true);
  });

  it("rejects ownership fields, missing keys, and missing expectations", () => {
    expect(trainingProfileUpdateRequestSchema.safeParse({
      expectedUpdatedAt: null,
      idempotencyKey: "answers-1",
      ownerFirebaseUid: "someone-else",
      trainingProfile: answers,
    }).success).toBe(false);
    expect(trainingProfileUpdateRequestSchema.safeParse({
      expectedUpdatedAt: null,
      trainingProfile: answers,
    }).success).toBe(false);
    expect(trainingProfileUpdateRequestSchema.safeParse({
      idempotencyKey: "answers-1",
      trainingProfile: answers,
    }).success).toBe(false);
  });
});

describe("build a routine from answers request", () => {
  const generated = {
    activate: false,
    equipmentProfileKind: "barbell",
    idempotencyKey: "build-1",
    mode: "generated",
    trainingProfile: answers,
  } as const;

  it("accepts the answers with an explicit activation choice and an optional name", () => {
    expect(programCollectionMutationRequestSchema.safeParse(generated).success).toBe(true);
    expect(programCollectionMutationRequestSchema.safeParse({ ...generated, name: "Gym days" }).success).toBe(true);
  });

  it("rejects a missing activation choice, ownership fields, and client-built days", () => {
    const withoutActivate: { -readonly [K in keyof typeof generated]?: (typeof generated)[K] } = { ...generated };
    delete withoutActivate.activate;
    expect(programCollectionMutationRequestSchema.safeParse(withoutActivate).success).toBe(false);
    expect(programCollectionMutationRequestSchema.safeParse({ ...generated, ownerUid: "x" }).success).toBe(false);
    expect(programCollectionMutationRequestSchema.safeParse({ ...generated, days: [] }).success).toBe(false);
    expect(programCollectionMutationRequestSchema.safeParse({ ...generated, name: "" }).success).toBe(false);
  });
});

describe("training profile client helpers", () => {
  function stubFetch(body: unknown, status = 200) {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ token: "csrf-token" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(body), { status }));
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("saves answers with PUT and returns the saved answers", async () => {
    const { saveTrainingProfile } = await import("@/client/training-profile");
    const saved = { ...answers, updatedAt: "2026-10-05T12:00:00.000Z" };
    const fetchMock = stubFetch({ profileProgram: { trainingProfile: saved } });
    await expect(saveTrainingProfile({
      expectedUpdatedAt: null,
      idempotencyKey: "answers-1",
      trainingProfile: answers,
    })).resolves.toEqual(saved);
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/app/training-profile");
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      body: JSON.stringify({ expectedUpdatedAt: null, idempotencyKey: "answers-1", trainingProfile: answers }),
      method: "PUT",
    });
  });

  it("rejects a response that does not match the saved answers", async () => {
    const { saveTrainingProfile } = await import("@/client/training-profile");
    stubFetch({ profileProgram: { trainingProfile: { ...answers, daysPerWeek: 5, updatedAt: "2026-10-05T12:00:00.000Z" } } });
    await expect(saveTrainingProfile({
      expectedUpdatedAt: null,
      idempotencyKey: "answers-1",
      trainingProfile: answers,
    })).rejects.toThrow(/does not match/u);
  });

  it("posts the build request to the routines collection without any routine content", async () => {
    const { buildRoutineFromAnswers } = await import("@/client/training-profile");
    const fetchMock = stubFetch({ error: "validation", message: "An account can keep at most 24 programs." }, 400);
    await expect(buildRoutineFromAnswers({
      activate: true,
      equipmentProfileKind: "dumbbells",
      idempotencyKey: "build-1",
      trainingProfile: answers,
    })).rejects.toMatchObject({ code: "validation", status: 400 });
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/app/programs");
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      activate: true,
      equipmentProfileKind: "dumbbells",
      idempotencyKey: "build-1",
      mode: "generated",
      trainingProfile: answers,
    });
  });

  it("posts generated onboarding with the answers only", async () => {
    const { submitGeneratedOnboarding } = await import("@/client/training-profile");
    const fetchMock = stubFetch({ error: "conflict", message: "Onboarding is already complete for this account." }, 409);
    await expect(submitGeneratedOnboarding({
      equipmentProfileKind: "barbell",
      idempotencyKey: "onboard-1",
      reducedMotion: true,
      timezone: "America/Chicago",
      trainingProfile: answers,
      unitSystem: "imperial",
    })).rejects.toMatchObject({ code: "conflict", status: 409 });
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/app/profile-program/onboard");
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      equipmentProfileKind: "barbell",
      idempotencyKey: "onboard-1",
      mode: "generated",
      reducedMotion: true,
      timezone: "America/Chicago",
      trainingProfile: answers,
      unitSystem: "imperial",
    });
  });

  it("keeps one operation key across retries until the save settles", async () => {
    const { createRetryStableKey } = await import("@/client/training-profile");
    const key = createRetryStableKey();
    const first = key.current();
    expect(key.current()).toBe(first);
    key.settle();
    expect(key.current()).not.toBe(first);
  });
});
