import type { NextRequest } from "next/server";

import { assertCsrf } from "@/server/auth/policy";

export const HARNESS_CSRF_COOKIE_NAME = "mwp_harness_csrf";

function allowedOrigins(request: NextRequest): readonly string[] {
  const host = request.headers.get("host");
  const protocol = request.nextUrl.protocol.replace(":", "");
  return [request.nextUrl.origin, host ? `${protocol}://${host}` : undefined].filter(
    (value): value is string => value !== undefined,
  );
}

export function assertHarnessMutationRequest(request: NextRequest): void {
  assertCsrf({
    allowedOrigins: allowedOrigins(request),
    cookieToken: request.cookies.get(HARNESS_CSRF_COOKIE_NAME)?.value,
    headerToken: request.headers.get("x-csrf-token") ?? undefined,
    origin: request.headers.get("origin") ?? undefined,
  });
}
