import { NextRequest } from "next/server";

import { CSRF_COOKIE_NAME } from "@/server/auth/cookies";
import { HARNESS_CSRF_COOKIE_NAME } from "./csrf";

function appendCookie(header: string | null, name: string, value: string): string {
  const encoded = `${name}=${encodeURIComponent(value)}`;
  return header ? `${header}; ${encoded}` : encoded;
}

/**
 * The fixture runs a production Next build over HTTP loopback. Production's
 * `__Host-` CSRF cookie is Secure and therefore cannot be installed by that
 * origin. Copy only the already double-submitted harness token into the cookie
 * name expected by the production parser, then delegate the untouched body.
 */
export async function adaptHarnessWorkoutMutation(
  request: NextRequest,
): Promise<NextRequest> {
  const token = request.cookies.get(HARNESS_CSRF_COOKIE_NAME)?.value;
  if (!token) return request;

  const headers = new Headers(request.headers);
  headers.set(
    "cookie",
    appendCookie(headers.get("cookie"), CSRF_COOKIE_NAME, token),
  );
  return new NextRequest(request.url, {
    body: await request.arrayBuffer(),
    headers,
    method: request.method,
  });
}
