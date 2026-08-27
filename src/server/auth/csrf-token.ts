import { randomBytes } from "node:crypto";

import type { NextRequest } from "next/server";

const csrfTokenPattern = /^[A-Za-z0-9_-]{43}$/u;

export function csrfTokenForRequest(
  request: NextRequest,
  cookieName: string,
): string {
  const existing = request.cookies.get(cookieName)?.value;
  return existing && csrfTokenPattern.test(existing)
    ? existing
    : randomBytes(32).toString("base64url");
}
