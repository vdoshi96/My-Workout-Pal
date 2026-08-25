import type { NextRequest } from "next/server";

import { CSRF_COOKIE_NAME } from "@/server/auth/cookies";
import { assertCsrf } from "@/server/auth/policy";

function allowedOrigins(request: NextRequest): readonly string[] {
  const configured = process.env["APP_ORIGIN"];
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost ?? request.headers.get("host");
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProtocol ?? request.nextUrl.protocol.replace(":", "");
  const requestHostOrigin = host ? `${protocol}://${host}` : undefined;
  return [request.nextUrl.origin, requestHostOrigin, configured].filter(
    (value): value is string => value !== undefined,
  );
}

export function assertValidMutationRequest(request: NextRequest): void {
  assertCsrf({
    allowedOrigins: allowedOrigins(request),
    cookieToken: request.cookies.get(CSRF_COOKIE_NAME)?.value,
    headerToken: request.headers.get("x-csrf-token") ?? undefined,
    origin: request.headers.get("origin") ?? undefined,
  });
}
