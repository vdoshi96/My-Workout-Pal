import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";

import { type NextRequest, NextResponse } from "next/server";

import { buildSecurityHeaders } from "@/server/security/headers";

export function proxy(request: NextRequest): NextResponse {
  const nonce = Buffer.from(randomUUID()).toString("base64");
  const development = process.env.NODE_ENV === "development";
  const forwardedProtocol = request.headers
    .get("x-forwarded-proto")
    ?.split(",", 1)[0]
    ?.trim()
    .toLowerCase();
  const secureTransport =
    request.nextUrl.protocol === "https:" || forwardedProtocol === "https";
  const securityHeaders = buildSecurityHeaders(
    nonce,
    development,
    secureTransport,
  );
  const requestHeaders = new Headers(request.headers);

  requestHeaders.set("x-nonce", nonce);
  for (const [name, value] of securityHeaders) requestHeaders.set(name, value);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  for (const [name, value] of securityHeaders) response.headers.set(name, value);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
