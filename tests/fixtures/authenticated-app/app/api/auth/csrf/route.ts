import { NextResponse, type NextRequest } from "next/server";

import { csrfTokenForRequest } from "@/server/auth/csrf-token";
import { HARNESS_CSRF_COOKIE_NAME } from "../../../../server/csrf";

export const runtime = "nodejs";

export function GET(request: NextRequest) {
  const token = csrfTokenForRequest(request, HARNESS_CSRF_COOKIE_NAME);
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
