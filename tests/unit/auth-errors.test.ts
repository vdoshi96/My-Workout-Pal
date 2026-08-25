import { describe, expect, it } from "vitest";

import { mapFirebaseAuthError } from "@/client/auth-errors";

describe("Firebase client error mapping", () => {
  it.each([
    ["auth/email-already-in-use", "An account already uses this email. Sign in or reset the password."],
    ["auth/invalid-credential", "The email or password is not valid."],
    ["auth/network-request-failed", "The network request failed. Check the connection and try again."],
    ["auth/too-many-requests", "Too many attempts were made. Wait before trying again."],
  ])("maps %s without exposing raw provider details", (code, expected) => {
    expect(mapFirebaseAuthError({ code, message: "raw provider detail" })).toBe(expected);
  });

  it("uses a generic message for unknown values", () => {
    expect(mapFirebaseAuthError(new Error("sensitive raw detail"))).toBe(
      "Authentication could not be completed. Try again.",
    );
  });
});
