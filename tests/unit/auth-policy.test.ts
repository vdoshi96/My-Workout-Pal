import { describe, expect, it } from "vitest";

import {
  AuthPolicyError,
  assertCsrf,
  assertOwnsResource,
  assertRecentAuthentication,
  assertVerifiedMutationIdentity,
  classifySessionVerificationFailure,
} from "@/server/auth/policy";

describe("server authentication policy", () => {
  it("requires an allowed origin and matching double-submit CSRF values", () => {
    expect(() =>
      assertCsrf({
        allowedOrigins: ["https://my-workout-pal.vercel.app"],
        cookieToken: "same-token",
        headerToken: "same-token",
        origin: "https://my-workout-pal.vercel.app",
      }),
    ).not.toThrow();

    for (const input of [
      { cookieToken: "same-token", headerToken: "different", origin: "https://my-workout-pal.vercel.app" },
      { cookieToken: "same-token", headerToken: "same-token", origin: "https://attacker.example" },
      { cookieToken: undefined, headerToken: "same-token", origin: "https://my-workout-pal.vercel.app" },
    ]) {
      expect(() =>
        assertCsrf({ allowedOrigins: ["https://my-workout-pal.vercel.app"], ...input }),
      ).toThrowError(AuthPolicyError);
    }
  });

  it("blocks unverified password identities from permanent mutations", () => {
    expect(() =>
      assertVerifiedMutationIdentity({ uid: "firebase-a", email_verified: false }),
    ).toThrowError(expect.objectContaining({ code: "email_unverified" }));

    expect(assertVerifiedMutationIdentity({ uid: "firebase-a", email_verified: true })).toBe(
      "firebase-a",
    );
  });

  it("requires recent authentication for deletion", () => {
    expect(() =>
      assertRecentAuthentication({ auth_time: 1_000, uid: "firebase-a" }, 1_299),
    ).not.toThrow();
    expect(() =>
      assertRecentAuthentication({ auth_time: 1_000, uid: "firebase-a" }, 1_301),
    ).toThrowError(expect.objectContaining({ code: "reauth_required" }));
  });

  it("rejects cross-user resource access", () => {
    expect(() => assertOwnsResource("firebase-a", "firebase-a")).not.toThrow();
    expect(() => assertOwnsResource("firebase-a", "firebase-b")).toThrowError(
      expect.objectContaining({ code: "forbidden" }),
    );
  });

  it("classifies expired, revoked, and invalid session failures without leaking details", () => {
    expect(classifySessionVerificationFailure({ code: "auth/session-cookie-expired" }).code).toBe(
      "session_expired",
    );
    expect(classifySessionVerificationFailure({ code: "auth/session-cookie-revoked" }).code).toBe(
      "session_revoked",
    );
    expect(classifySessionVerificationFailure(new Error("raw verifier detail")).code).toBe(
      "session_invalid",
    );
  });
});
