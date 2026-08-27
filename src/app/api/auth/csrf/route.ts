import { NextResponse, type NextRequest } from "next/server";

import { CSRF_COOKIE_NAME, secureCookieOptions } from "@/server/auth/cookies";
import { csrfTokenForRequest } from "@/server/auth/csrf-token";

export const runtime = "nodejs";

export function GET(request: NextRequest) {
  const token = csrfTokenForRequest(request, CSRF_COOKIE_NAME);
  const response = NextResponse.json({ token });
  response.cookies.set(CSRF_COOKIE_NAME, token, secureCookieOptions());
  response.headers.set("Cache-Control", "no-store");
  return response;
}
