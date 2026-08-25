import { randomBytes } from "node:crypto";

import { NextResponse } from "next/server";

import { CSRF_COOKIE_NAME, secureCookieOptions } from "@/server/auth/cookies";

export const runtime = "nodejs";

export function GET() {
  const token = randomBytes(32).toString("base64url");
  const response = NextResponse.json({ token });
  response.cookies.set(CSRF_COOKIE_NAME, token, secureCookieOptions());
  response.headers.set("Cache-Control", "no-store");
  return response;
}
