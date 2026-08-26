import { randomBytes } from "node:crypto";

import { NextResponse } from "next/server";

import { HARNESS_CSRF_COOKIE_NAME } from "../../../../server/csrf";

export const runtime = "nodejs";

export function GET() {
  const token = randomBytes(32).toString("base64url");
  const response = NextResponse.json({ token });
  response.cookies.set(HARNESS_CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    maxAge: 60 * 60,
    path: "/",
    sameSite: "strict",
    secure: false,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
