import { describe, expect, it } from "vitest";

import {
  createHostedAuthQaIdentity,
  createHostedAuthQaIdentityPair,
  HostedAuthQaConfigurationError,
  parseHostedAuthQaActionLink,
  parseHostedAuthQaEmailVerificationResponse,
  parseHostedAuthQaPasswordResetResponse,
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
  ["Auth domain mismatch", { NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "another-project.firebaseapp.com" }, "project_mismatch"],
  ["Admin credential missing", { FIREBASE_PRIVATE_KEY: undefined }, "firebase_unavailable"],
];

describe("hosted authentication QA boundary", () => {
  it("accepts only the approved production origin and matching Firebase project", () => {
    expect(parseHostedAuthQaConfig(validEnvironment)).toEqual({
      apiKey: "fixture-public-api-key",
      authDomain: "my-workout-pal-92819.firebaseapp.com",
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

    expect(identity.email).toMatch(/^mwp-qa-[a-f0-9]{32}@example\.invalid$/u);
    expect(identity.password).toHaveLength(47);
    expect(identity.password).toMatch(/[A-Z]/u);
    expect(identity.password).toMatch(/[a-z]/u);
    expect(identity.password).toMatch(/[0-9]/u);
    expect(identity.password).toContain("!");
    expect(identity.recoveredPassword).toHaveLength(47);
    expect(identity.recoveredPassword).not.toBe(identity.password);
    expect(identity.recoveredPassword).toMatch(/[A-Z]/u);
    expect(identity.recoveredPassword).toMatch(/[a-z]/u);
    expect(identity.recoveredPassword).toMatch(/[0-9]/u);
    expect(identity.recoveredPassword).toContain("!");
    expect(identity.displayMarker).toBe("My Workout Pal hosted QA");
    expect(JSON.stringify(identity)).not.toContain("@gmail.com");
  });

  it("generates two distinct purpose-separated identities for one hosted run", () => {
    const identities = createHostedAuthQaIdentityPair();

    expect(identities.application.email).not.toBe(identities.actionCode.email);
    expect(identities.application.email).toMatch(/@example\.invalid$/u);
    expect(identities.actionCode.email).toMatch(/@example\.invalid$/u);
    expect(identities.application.password).not.toBe(identities.actionCode.password);
    expect(identities.application.recoveredPassword).not.toBe(
      identities.actionCode.recoveredPassword,
    );
  });

  it("accepts only the exact Firebase action handler, project key, mode, and one action code", () => {
    expect(parseHostedAuthQaActionLink(
      "https://my-workout-pal-92819.firebaseapp.com/__/auth/action?mode=verifyEmail&oobCode=verification-code&apiKey=fixture-public-api-key&lang=en",
      {
        apiKey: "fixture-public-api-key",
        authDomain: "my-workout-pal-92819.firebaseapp.com",
        mode: "verifyEmail",
      },
    )).toEqual({ oobCode: "verification-code" });

    expect(parseHostedAuthQaActionLink(
      "https://my-workout-pal-92819.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=reset-code&apiKey=fixture-public-api-key",
      {
        apiKey: "fixture-public-api-key",
        authDomain: "my-workout-pal-92819.firebaseapp.com",
        mode: "resetPassword",
      },
    )).toEqual({ oobCode: "reset-code" });
  });

  it.each([
    ["HTTP", "http://my-workout-pal-92819.firebaseapp.com/__/auth/action?mode=verifyEmail&oobCode=code&apiKey=fixture-public-api-key"],
    ["credentials", "https://user:secret@my-workout-pal-92819.firebaseapp.com/__/auth/action?mode=verifyEmail&oobCode=code&apiKey=fixture-public-api-key"],
    ["host", "https://example.com/__/auth/action?mode=verifyEmail&oobCode=code&apiKey=fixture-public-api-key"],
    ["path", "https://my-workout-pal-92819.firebaseapp.com/not-auth/action?mode=verifyEmail&oobCode=code&apiKey=fixture-public-api-key"],
    ["project key", "https://my-workout-pal-92819.firebaseapp.com/__/auth/action?mode=verifyEmail&oobCode=code&apiKey=wrong-key"],
    ["mode", "https://my-workout-pal-92819.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=code&apiKey=fixture-public-api-key"],
    ["missing code", "https://my-workout-pal-92819.firebaseapp.com/__/auth/action?mode=verifyEmail&apiKey=fixture-public-api-key"],
    ["repeated code", "https://my-workout-pal-92819.firebaseapp.com/__/auth/action?mode=verifyEmail&oobCode=one&oobCode=two&apiKey=fixture-public-api-key"],
    ["unknown query", "https://my-workout-pal-92819.firebaseapp.com/__/auth/action?mode=verifyEmail&oobCode=code&apiKey=fixture-public-api-key&token=secret"],
    ["fragment", "https://my-workout-pal-92819.firebaseapp.com/__/auth/action?mode=verifyEmail&oobCode=code&apiKey=fixture-public-api-key#secret"],
  ])("rejects a %s action link", (_name, actionLink) => {
    expect(() => parseHostedAuthQaActionLink(actionLink, {
      apiKey: "fixture-public-api-key",
      authDomain: "my-workout-pal-92819.firebaseapp.com",
      mode: "verifyEmail",
    })).toThrowError("Hosted authentication QA action link is invalid.");
  });

  it("binds action responses to the captured disposable identity", () => {
    expect(parseHostedAuthQaEmailVerificationResponse(
      { email: "member@example.com", localId: "captured-uid" },
      { email: "member@example.com", uid: "captured-uid" },
    )).toEqual({ emailVerified: true });
    expect(parseHostedAuthQaPasswordResetResponse(
      { email: "member@example.com", requestType: "PASSWORD_RESET" },
      "member@example.com",
    )).toEqual({ requestType: "PASSWORD_RESET" });

    expect(() => parseHostedAuthQaEmailVerificationResponse(
      { email: "other@example.com", localId: "captured-uid" },
      { email: "member@example.com", uid: "captured-uid" },
    )).toThrowError("Hosted authentication QA action response is invalid.");
    expect(() => parseHostedAuthQaEmailVerificationResponse(
      { email: "member@example.com", localId: "other-uid" },
      { email: "member@example.com", uid: "captured-uid" },
    )).toThrowError("Hosted authentication QA action response is invalid.");
    expect(() => parseHostedAuthQaPasswordResetResponse(
      { email: "member@example.com", requestType: "VERIFY_EMAIL" },
      "member@example.com",
    )).toThrowError("Hosted authentication QA action response is invalid.");
  });
});
