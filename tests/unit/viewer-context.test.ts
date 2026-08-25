import { describe, expect, it } from "vitest";

import { viewerContextFromToken } from "@/server/auth/viewer";

describe("server-derived viewer context", () => {
  it("derives a verified Google viewer from Firebase claims", () => {
    expect(
      viewerContextFromToken({
        uid: "firebase-user-a",
        email: "athlete@example.com",
        email_verified: true,
        name: "Route Athlete",
        auth_time: 1_787_681_000,
        firebase: { identities: {}, sign_in_provider: "google.com" },
      }),
    ).toEqual({
      uid: "firebase-user-a",
      displayName: "Route Athlete",
      email: "athlete@example.com",
      emailVerified: true,
      provider: "google",
      authTimeSeconds: 1_787_681_000,
      eligibleForPermanentMutations: true,
    });
  });

  it("keeps an unverified password viewer read-only", () => {
    expect(
      viewerContextFromToken({
        uid: "firebase-user-b",
        email: "pending@example.com",
        email_verified: false,
        firebase: { identities: {}, sign_in_provider: "password" },
      }),
    ).toEqual({
      uid: "firebase-user-b",
      displayName: "Athlete",
      email: "pending@example.com",
      emailVerified: false,
      provider: "password",
      authTimeSeconds: undefined,
      eligibleForPermanentMutations: false,
    });
  });

  it("does not promote absent or malformed claim values", () => {
    const viewer = viewerContextFromToken({
      uid: "firebase-user-c",
      email: 42,
      email_verified: "true",
      name: "   ",
      auth_time: -1,
      firebase: { identities: {}, sign_in_provider: "custom" },
    } as never);

    expect(viewer).toEqual({
      uid: "firebase-user-c",
      displayName: "Athlete",
      email: undefined,
      emailVerified: false,
      provider: "other",
      authTimeSeconds: undefined,
      eligibleForPermanentMutations: false,
    });
  });
});
