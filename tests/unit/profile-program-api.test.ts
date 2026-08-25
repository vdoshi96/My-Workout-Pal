import { describe, expect, it } from "vitest";

import {
  equipmentChangeRequestSchema,
  onboardingRequestSchema,
  preferencesUpdateRequestSchema,
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
