import { describe, expect, it } from "vitest";

import {
  createHostedDeletionQaIdentities,
  HostedDeletionQaConfigurationError,
  parseHostedDeletionQaConfig,
} from "@/domain/hosted-deletion-qa";

const validEnvironment = {
  DATABASE_URL: "postgresql://fixture.invalid/workout-pal",
  FIREBASE_CLIENT_EMAIL: "firebase-admin@example.iam.gserviceaccount.com",
  FIREBASE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\nfixture\n-----END PRIVATE KEY-----",
  FIREBASE_PROJECT_ID: "my-workout-pal-92819",
  MWP_HOSTED_DELETION_EXTERNAL_ACCOUNTS_APPROVED: "1",
  MWP_HOSTED_AUTH_ORIGIN: "https://my-workout-pal-chi.vercel.app",
  NEXT_PUBLIC_FIREBASE_API_KEY: "fixture-public-api-key",
  NEXT_PUBLIC_FIREBASE_APP_ID: "1:381810672975:web:fixture",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "my-workout-pal-92819.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "my-workout-pal-92819",
} as const;

describe("hosted deletion QA boundary", () => {
  it("accepts only explicit destructive approval with Firebase and Neon configuration", () => {
    expect(parseHostedDeletionQaConfig(validEnvironment)).toEqual({
      origin: "https://my-workout-pal-chi.vercel.app",
      projectId: "my-workout-pal-92819",
    });
  });

  it.each([
    ["approval_required", { MWP_HOSTED_DELETION_EXTERNAL_ACCOUNTS_APPROVED: undefined }],
    ["database_unavailable", { DATABASE_URL: undefined }],
    ["origin_invalid", { MWP_HOSTED_AUTH_ORIGIN: "https://example.com" }],
    ["project_mismatch", { FIREBASE_PROJECT_ID: "wrong-project" }],
  ] as const)("rejects %s before external work", (code, override) => {
    expect(() => parseHostedDeletionQaConfig({
      ...validEnvironment,
      ...override,
    })).toThrowError(
      expect.objectContaining<Partial<HostedDeletionQaConfigurationError>>({ code }),
    );
  });

  it("generates two distinct reserved-domain identities in memory", () => {
    const identities = createHostedDeletionQaIdentities();

    expect(identities).toHaveLength(2);
    expect(identities[0]?.email).not.toBe(identities[1]?.email);
    expect(identities[0]?.password).not.toBe(identities[1]?.password);
    for (const identity of identities) {
      expect(identity.email).toMatch(/^mwp-qa-[a-f0-9]{32}@example\.com$/u);
      expect(identity.password).toHaveLength(47);
    }
  });
});
