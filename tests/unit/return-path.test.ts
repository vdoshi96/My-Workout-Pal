import { describe, expect, it } from "vitest";

import { normalizeReturnPath } from "@/server/navigation/return-path";

describe("authenticated return paths", () => {
  it("keeps a bounded private path, query, and fragment", () => {
    expect(normalizeReturnPath("/app/history?day=push#session-2")).toBe(
      "/app/history?day=push#session-2",
    );
    expect(normalizeReturnPath("/app/settings")).toBe("/app/settings");
    expect(normalizeReturnPath("/workout/123e4567-e89b-42d3-a456-426614174000")).toBe(
      "/workout/123e4567-e89b-42d3-a456-426614174000",
    );
  });

  it.each([
    "https://attacker.example/steal",
    "//attacker.example/steal",
    "\\attacker.example/steal",
    "javascript:alert(1)",
    "/api/auth/session",
    "/api/app/programs",
    "/_next/static/chunk.js",
    "/APP/settings",
    "/app//settings",
    "/app%2Fsettings",
    "/app2",
    "/program",
    "/sign-in?returnTo=%2Fsign-in",
    "/workout/session-2",
    "/workout/123e4567-e89b-42d3-a456-426614174000/notes",
    "/\u0000history",
  ])("falls back for unsafe return target %s", (input) => {
    expect(normalizeReturnPath(input)).toBe("/app");
  });

  it("uses the member home for a missing, repeated, or oversized target", () => {
    expect(normalizeReturnPath(undefined)).toBe("/app");
    expect(normalizeReturnPath(["/app/history", "/app"])).toBe("/app");
    expect(normalizeReturnPath(`/${"x".repeat(2_048)}`)).toBe("/app");
  });
});
