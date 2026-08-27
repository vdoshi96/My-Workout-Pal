import { describe, expect, it } from "vitest";

import {
  createHostedAuthQaIdentity,
  HostedAuthQaConfigurationError,
  parseHostedAuthQaConfig,
  type HostedAuthQaConfigurationCode,
} from "@/domain/hosted-auth-qa";

const validEnvironment = {
  FIREBASE_CLIENT_EMAIL: "firebase-admin@example.iam.gserviceaccount.com",
  FIREBASE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\nfixture-not-a-real-private-key-value\n-----END PRIVATE KEY-----",
  FIREBASE_PROJECT_ID: "my-workout-pal-92819",
  MWP_HOSTED_AUTH_EXTERNAL_ACCOUNT_APPROVED: "1",
  MWP_HOSTED_AUTH_ORIGIN: "https://my-workout-pal-chi.vercel.app",
  NEXT_PUBLIC_FIREBASE_API_KEY: "fixture-public-api-key",
  NEXT_PUBLIC_FIREBASE_APP_ID: "1:381810672975:web:fixture",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "my-workout-pal-92819.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "my-workout-pal-92819",
} as const;

const invalidCases: readonly Readonly<[
  name: string,
  override: Readonly<Record<string, string | undefined>>,
  code: HostedAuthQaConfigurationCode,
]>[] = [
  ["approval missing", { MWP_HOSTED_AUTH_EXTERNAL_ACCOUNT_APPROVED: undefined }, "approval_required"],
  ["HTTP origin", { MWP_HOSTED_AUTH_ORIGIN: "http://my-workout-pal-chi.vercel.app" }, "origin_invalid"],
  ["unknown host", { MWP_HOSTED_AUTH_ORIGIN: "https://example.com" }, "origin_invalid"],
  ["credential URL", { MWP_HOSTED_AUTH_ORIGIN: "https://user:secret@my-workout-pal-chi.vercel.app" }, "origin_invalid"],
  ["path URL", { MWP_HOSTED_AUTH_ORIGIN: "https://my-workout-pal-chi.vercel.app/sign-in" }, "origin_invalid"],
  ["query URL", { MWP_HOSTED_AUTH_ORIGIN: "https://my-workout-pal-chi.vercel.app/?token=secret" }, "origin_invalid"],
  ["public project mismatch", { NEXT_PUBLIC_FIREBASE_PROJECT_ID: "another-project" }, "project_mismatch"],
  ["Admin project mismatch", { FIREBASE_PROJECT_ID: "another-project" }, "project_mismatch"],
  ["Admin credential missing", { FIREBASE_PRIVATE_KEY: undefined }, "firebase_unavailable"],
];

describe("hosted authentication QA boundary", () => {
  it("accepts only the approved production origin and matching Firebase project", () => {
    expect(parseHostedAuthQaConfig(validEnvironment)).toEqual({
      origin: "https://my-workout-pal-chi.vercel.app",
      projectId: "my-workout-pal-92819",
    });
  });

  it.each(invalidCases)("rejects %s before browser or provider work", (_name, override, code) => {
    expect(() => parseHostedAuthQaConfig({
      ...validEnvironment,
      ...override,
    })).toThrowError(expect.objectContaining<Partial<HostedAuthQaConfigurationError>>({ code }));
  });

  it("generates a reserved-domain identity with a high-entropy password and no personal name", () => {
    const identity = createHostedAuthQaIdentity();

    expect(identity.email).toMatch(/^mwp-qa-[a-f0-9]{32}@example\.com$/u);
    expect(identity.password).toHaveLength(47);
    expect(identity.password).toMatch(/[A-Z]/u);
    expect(identity.password).toMatch(/[a-z]/u);
    expect(identity.password).toMatch(/[0-9]/u);
    expect(identity.password).toContain("!");
    expect(identity.displayMarker).toBe("My Workout Pal hosted QA");
    expect(JSON.stringify(identity)).not.toContain("@gmail.com");
  });
});
