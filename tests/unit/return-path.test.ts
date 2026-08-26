import { describe, expect, it } from "vitest";

import { normalizeReturnPath } from "@/server/navigation/return-path";

describe("authenticated return paths", () => {
  it("keeps a bounded local path, query, and fragment", () => {
    expect(normalizeReturnPath("/history?day=push#session-2")).toBe(
      "/history?day=push#session-2",
    );
  });

  it.each([
    "https://attacker.example/steal",
    "//attacker.example/steal",
    "\\attacker.example/steal",
    "javascript:alert(1)",
    "/api/auth/session",
    "/sign-in?returnTo=%2Fsign-in",
    "/\u0000history",
  ])("falls back for unsafe return target %s", (input) => {
    expect(normalizeReturnPath(input)).toBe("/");
  });

  it("falls back for a missing or oversized target", () => {
    expect(normalizeReturnPath(undefined)).toBe("/");
    expect(normalizeReturnPath(["/history", "/app"])).toBe("/");
    expect(normalizeReturnPath(`/${"x".repeat(2_048)}`)).toBe("/");
  });
});
