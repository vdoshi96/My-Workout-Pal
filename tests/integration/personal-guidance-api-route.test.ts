import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/auth/viewer", () => ({
  getCurrentViewer: vi.fn().mockResolvedValue(null),
}));

import {
  GET as getPersonalGuidance,
  PUT as replacePersonalGuidance,
} from "@/app/api/app/personal-guidance/route";
import { GET as getMovementChooser } from "@/app/api/app/movement-chooser/route";
import { CSRF_COOKIE_NAME } from "@/server/auth/cookies";
import { replacePersonalGuidanceRequestSchema } from "@/server/http/personal-guidance-api";

const origin = "http://127.0.0.1:3000";

function request(
  pathname: string,
  options: Readonly<{
    body?: unknown;
    method?: string;
    requestOrigin?: string;
  }> = {},
): NextRequest {
  const token = "personal-guidance-csrf";
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

describe("personal-guidance API contract", () => {
  it("accepts no client ownership field", () => {
    const body = {
      source: {
        kind: "catalog",
        id: "00000000-0000-4000-8000-000000000001",
      },
      links: ["https://example.com/guide"],
      idempotencyKey: "guidance-save-1",
    } as const;
    expect(replacePersonalGuidanceRequestSchema.parse(body)).toEqual(body);
    expect(() =>
      replacePersonalGuidanceRequestSchema.parse({
        ...body,
        ownerFirebaseUid: "client-controlled-owner",
      }),
    ).toThrow();
  });

  it("returns an uncacheable authentication denial before parsing a read source", async () => {
    const response = await getPersonalGuidance(
      request("/api/app/personal-guidance?kind=custom&id=client-controlled"),
    );
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(response.headers.get("vary")).toBe("Cookie");
    await expect(response.json()).resolves.toMatchObject({ error: "session_invalid" });
  });

  it("keeps the chooser catalog behind the private no-store boundary", async () => {
    const response = await getMovementChooser();
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    await expect(response.json()).resolves.toMatchObject({ error: "session_invalid" });
  });

  it("rejects cross-origin replacement before identity and body processing", async () => {
    const response = await replacePersonalGuidance(
      request("/api/app/personal-guidance", {
        body: { ownerFirebaseUid: "other-user" },
        method: "PUT",
        requestOrigin: "https://attacker.example",
      }),
    );
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ error: "csrf_invalid" });
  });
});
