import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/auth/viewer", () => ({
  getCurrentViewer: vi.fn().mockResolvedValue(null),
}));

import { GET as getProfileProgram } from "@/app/api/app/profile-program/route";
import { POST as onboardProfileProgram } from "@/app/api/app/profile-program/onboard/route";
import { POST as changeEquipment } from "@/app/api/app/profile-program/equipment/route";
import { PATCH as updatePreferences } from "@/app/api/app/preferences/route";
import { CSRF_COOKIE_NAME } from "@/server/auth/cookies";

const origin = "http://127.0.0.1:3000";

function request(
  pathname: string,
  options: Readonly<{ body?: unknown; requestOrigin?: string }> = {},
) {
  const token = "profile-program-csrf";
  return new NextRequest(`${origin}${pathname}`, {
    body: JSON.stringify(options.body ?? {}),
    headers: {
      "Content-Type": "application/json",
      Cookie: `${CSRF_COOKIE_NAME}=${token}`,
      Host: "127.0.0.1:3000",
      Origin: options.requestOrigin ?? origin,
      "X-CSRF-Token": token,
    },
    method: "POST",
  });
}

describe("profile-program route authorization order", () => {
  it("denies an unauthenticated read before opening private storage", async () => {
    const response = await getProfileProgram();

    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    await expect(response.json()).resolves.toMatchObject({ error: "session_invalid" });
  });

  it.each([
    ["onboarding", onboardProfileProgram, "/api/app/profile-program/onboard"],
    ["equipment change", changeEquipment, "/api/app/profile-program/equipment"],
    ["preference change", updatePreferences, "/api/app/preferences"],
  ])("rejects a cross-origin %s before identity, body, or storage", async (_name, handler, path) => {
    const response = await handler(
      request(path, {
        body: { ownerUid: "other-user" },
        requestOrigin: "https://attacker.example",
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ error: "csrf_invalid" });
  });

  it.each([
    ["onboarding", onboardProfileProgram, "/api/app/profile-program/onboard"],
    ["equipment change", changeEquipment, "/api/app/profile-program/equipment"],
    ["preference change", updatePreferences, "/api/app/preferences"],
  ])("denies unauthenticated same-origin %s before parsing a hostile body", async (_name, handler, path) => {
    const response = await handler(request(path, { body: { ownerUid: "other-user" } }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: "session_invalid" });
  });
});
