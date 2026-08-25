import { describe, expect, it } from "vitest";

import {
  equipmentChangeRequestSchema,
  onboardingRequestSchema,
  preferencesUpdateRequestSchema,
  programPublishRequestSchema,
  profileProgramApiError,
} from "@/server/http/profile-program-api";
import { AuthPolicyError } from "@/server/auth/policy";
import {
  RepositoryConflictError,
  RepositoryNotFoundError,
  RepositoryValidationError,
} from "@/server/repositories/profile-program";

describe("profile program API contract", () => {
  it("accepts strict onboarding and equipment envelopes", () => {
    expect(
      onboardingRequestSchema.safeParse({
        equipmentProfileKind: "dumbbells",
        idempotencyKey: "onboard-1",
        reducedMotion: true,
        timezone: "America/Chicago",
        unitSystem: "imperial",
      }).success,
    ).toBe(true);
    expect(
      onboardingRequestSchema.safeParse({
        equipmentProfileKind: "dumbbells",
        idempotencyKey: "onboard-1",
        ownerUid: "must-never-be-accepted",
      }).success,
    ).toBe(false);

    expect(
      equipmentChangeRequestSchema.safeParse({
        baseRevisionId: "11111111-1111-4111-8111-111111111111",
        equipmentProfileKind: "barbell",
        idempotencyKey: "equipment-1",
        programId: "22222222-2222-4222-8222-222222222222",
      }).success,
    ).toBe(true);
    expect(
      equipmentChangeRequestSchema.safeParse({
        baseRevisionId: "not-a-revision",
        equipmentProfileKind: "barbell",
        idempotencyKey: "equipment-1",
        programId: "22222222-2222-4222-8222-222222222222",
      }).success,
    ).toBe(false);

    expect(
      preferencesUpdateRequestSchema.safeParse({
        expectedUpdatedAt: "2026-08-25T12:00:00.000Z",
        idempotencyKey: "preferences-1",
        reducedMotion: false,
        timezone: "America/Chicago",
        unitSystem: "imperial",
      }).success,
    ).toBe(true);
    expect(
      preferencesUpdateRequestSchema.safeParse({
        expectedUpdatedAt: "2026-08-25T12:00:00.000Z",
        idempotencyKey: "preferences-1",
        ownerUid: "other-user",
        reducedMotion: false,
        timezone: "America/Chicago",
        unitSystem: "imperial",
      }).success,
    ).toBe(false);
  });

  it("accepts only an owner-free, canonical five-day program publication", () => {
    const prescription = {
      catalogExerciseId: "11111111-1111-4111-8111-111111111111",
      customExerciseId: null,
      displayName: null,
      maximumReps: 12,
      maximumSeconds: null,
      minimumReps: 8,
      minimumSeconds: null,
      notes: "Keep two repetitions in reserve.",
      restSeconds: 90,
      setCount: 3,
      setKind: "work",
      sourcePrescriptionId: null,
      targetDistanceM: null,
      targetWeightKg: 20,
    };
    const cardio = [
      {
        distanceM: null,
        durationSeconds: 1_200,
        inclinePercent: 2,
        mode: "walker",
        notes: null,
        paceSecondsPerKm: null,
      },
      {
        distanceM: 5_000,
        durationSeconds: 1_800,
        inclinePercent: null,
        mode: "runner",
        notes: null,
        paceSecondsPerKm: 360,
      },
    ];
    const day = (dayKey: string, dayNumber: number) => ({
      cardio,
      dayKey,
      dayNumber,
      displayName: dayKey[0]!.toUpperCase() + dayKey.slice(1),
      sections: [
        {
          kind: "strength",
          prescriptions: [prescription],
          title: "Strength",
        },
      ],
    });
    const valid = {
      baseRevisionId: "22222222-2222-4222-8222-222222222222",
      days: [
        day("push", 1),
        day("pull", 2),
        day("legs", 3),
        day("upper", 4),
        day("lower", 5),
      ],
      idempotencyKey: "publish-program-1",
      name: "My five-day plan",
      programId: "33333333-3333-4333-8333-333333333333",
    };

    expect(programPublishRequestSchema.safeParse(valid).success).toBe(true);
    expect(
      programPublishRequestSchema.safeParse({ ...valid, ownerUid: "other-user" }).success,
    ).toBe(false);
    expect(
      programPublishRequestSchema.safeParse({
        ...valid,
        days: valid.days.slice(0, 4),
      }).success,
    ).toBe(false);
    expect(
      programPublishRequestSchema.safeParse({
        ...valid,
        days: valid.days.map((entry, index) =>
          index === 0
            ? {
                ...entry,
                sections: [
                  {
                    ...entry.sections[0],
                    prescriptions: [
                      { ...prescription, measurementKind: "weight_reps" },
                    ],
                  },
                ],
              }
            : entry,
        ),
      }).success,
    ).toBe(false);
    expect(
      programPublishRequestSchema.safeParse({
        ...valid,
        days: valid.days.map((entry, index) =>
          index === 0
            ? {
                ...entry,
                sections: [
                  {
                    ...entry.sections[0],
                    prescriptions: [
                      {
                        ...prescription,
                        catalogExerciseId: null,
                        customExerciseId: null,
                      },
                    ],
                  },
                ],
              }
            : entry,
        ),
      }).success,
    ).toBe(false);
    expect(
      programPublishRequestSchema.safeParse({
        ...valid,
        days: valid.days.map((entry, index) =>
          index === 0 || index === 1
            ? {
                ...entry,
                sections: [
                  {
                    ...entry.sections[0],
                    prescriptions: [
                      {
                        ...prescription,
                        catalogExerciseId: index === 1 ? null : prescription.catalogExerciseId,
                        customExerciseId:
                          index === 1 ? "55555555-5555-4555-8555-555555555555" : null,
                        sourcePrescriptionId: "44444444-4444-4444-8444-444444444444",
                      },
                    ],
                  },
                ],
              }
            : entry,
        ),
      }).success,
    ).toBe(false);
  });

  it.each([
    [new RepositoryNotFoundError(), 404, "not_found"],
    [new RepositoryConflictError(), 409, "conflict"],
    [new RepositoryValidationError(), 400, "validation"],
    [new AuthPolicyError("email_unverified", "Verify first.", 403), 403, "email_unverified"],
  ])("maps expected private errors without leaking internals", async (error, status, code) => {
    const response = profileProgramApiError(error);

    expect(response.status).toBe(status);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("vary")).toBe("Cookie");
    await expect(response.json()).resolves.toMatchObject({ error: code });
  });

  it("uses a stable generic shape for unexpected failures", async () => {
    const response = profileProgramApiError(new Error("postgresql://secret@host/database"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "server_error",
      message: "The request could not be completed.",
    });
  });
});
