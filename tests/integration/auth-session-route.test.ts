import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { POST } from "@/app/api/auth/session/route";
import { CSRF_COOKIE_NAME } from "@/server/auth/cookies";

const origin = "http://127.0.0.1:3000";

function sessionRequest({
  body,
  cookieToken = "csrf-token",
  headerToken = "csrf-token",
  requestOrigin = origin,
}: Readonly<{
  body: unknown;
  cookieToken?: string;
  headerToken?: string;
  requestOrigin?: string;
}>) {
  return new NextRequest(`${origin}/api/auth/session`, {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      Cookie: `${CSRF_COOKIE_NAME}=${cookieToken}`,
      Host: "127.0.0.1:3000",
      Origin: requestOrigin,
      "X-CSRF-Token": headerToken,
    },
    method: "POST",
  });
}

describe("session route failure boundaries", () => {
  it("rejects a cross-origin request before parsing identity", async () => {
    const response = await POST(
      sessionRequest({ body: { idToken: "x".repeat(200) }, requestOrigin: "https://attacker.example" }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ error: "csrf_invalid" });
  });

  it("rejects malformed identity input after CSRF succeeds", async () => {
    const response = await POST(sessionRequest({ body: { uid: "client-controlled" } }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: "invalid_request" });
  });

  it("reports the credential gate without accepting a syntactically valid fake token", async () => {
    const response = await POST(sessionRequest({ body: { idToken: "x".repeat(200) } }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: "auth_unavailable" });
  });
});
