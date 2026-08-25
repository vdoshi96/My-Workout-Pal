import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  secureCookieOptions,
} from "@/server/auth/cookies";
import { AuthPolicyError, assertRecentAuthentication } from "@/server/auth/policy";
import { assertValidMutationRequest } from "@/server/auth/request";
import { FirebaseConfigurationError, getFirebaseAdminAuth } from "@/server/firebase/admin";

export const runtime = "nodejs";

const sessionInput = z.object({ idToken: z.string().min(100).max(10_000) }).strict();

function errorResponse(error: unknown): NextResponse {
  if (error instanceof AuthPolicyError) {
    return NextResponse.json({ error: error.code, message: error.message }, { status: error.status });
  }
  if (error instanceof FirebaseConfigurationError) {
    return NextResponse.json(
      { error: "auth_unavailable", message: "Authentication is not configured." },
      { status: 503 },
    );
  }
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: "invalid_request", message: "The request is invalid." }, { status: 400 });
  }
  return NextResponse.json(
    { error: "authentication_failed", message: "The session could not be created." },
    { status: 401 },
  );
}

export async function POST(request: NextRequest) {
  try {
    assertValidMutationRequest(request);
    const input = sessionInput.parse(await request.json());
    const auth = getFirebaseAdminAuth();
    const claims = await auth.verifyIdToken(input.idToken, true);
    assertRecentAuthentication(claims);
    const sessionCookie = await auth.createSessionCookie(input.idToken, {
      expiresIn: SESSION_MAX_AGE_SECONDS * 1_000,
    });
    const response = NextResponse.json({ authenticated: true });
    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, secureCookieOptions());
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    assertValidMutationRequest(request);
    const response = NextResponse.json({ authenticated: false });
    response.cookies.set(SESSION_COOKIE_NAME, "", {
      ...secureCookieOptions(),
      maxAge: 0,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
