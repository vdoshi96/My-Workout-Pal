import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/auth/viewer", () => ({
  getCurrentViewer: vi.fn().mockResolvedValue(null),
}));

import {
  GET as getCustomExercises,
  POST as createCustomExercise,
} from "@/app/api/app/custom-exercises/route";
import { GET as getCustomExercise } from "@/app/api/app/custom-exercises/[id]/route";
import { CSRF_COOKIE_NAME } from "@/server/auth/cookies";

const origin = "http://127.0.0.1:3000";

function request(
  pathname: string,
  options: Readonly<{ body?: unknown; method?: string; requestOrigin?: string }> = {},
) {
  const token = "custom-exercise-csrf";
  return new NextRequest(`${origin}${pathname}`, {
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    headers: {
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      Cookie: `${CSRF_COOKIE_NAME}=${token}`,
      Host: "127.0.0.1:3000",
      Origin: options.requestOrigin ?? origin,
      "X-CSRF-Token": token,
    },
    method: options.method ?? "GET",
  });
}

describe("custom-exercise route authorization order", () => {
  it("returns an uncacheable authentication denial before opening private storage", async () => {
    const response = await getCustomExercises();
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    await expect(response.json()).resolves.toMatchObject({ error: "session_invalid" });
  });

  it("rejects cross-origin creation before identity and body processing", async () => {
    const response = await createCustomExercise(
      request("/api/app/custom-exercises", {
        body: { clientOwnerUid: "other-user" },
        method: "POST",
        requestOrigin: "https://attacker.example",
      }),
    );
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ error: "csrf_invalid" });
  });

  it("does not disclose identifier validity without an authenticated viewer", async () => {
    const response = await getCustomExercise(
      request("/api/app/custom-exercises/client-controlled"),
      { params: Promise.resolve({ id: "client-controlled" }) },
    );
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: "session_invalid" });
  });
});
