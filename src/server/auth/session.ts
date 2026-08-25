import type { DecodedIdToken } from "firebase-admin/auth";
import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME } from "@/server/auth/cookies";
import {
  AuthPolicyError,
  classifySessionVerificationFailure,
} from "@/server/auth/policy";
import { FirebaseConfigurationError, getFirebaseAdminAuth } from "@/server/firebase/admin";

export async function getCurrentSession(): Promise<DecodedIdToken | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;

  try {
    return await getFirebaseAdminAuth().verifySessionCookie(sessionCookie, true);
  } catch (error) {
    if (error instanceof FirebaseConfigurationError) throw error;
    return null;
  }
}

export async function requireCurrentSession(): Promise<DecodedIdToken> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) {
    throw new AuthPolicyError("session_invalid", "A valid session is required.", 401);
  }

  try {
    return await getFirebaseAdminAuth().verifySessionCookie(sessionCookie, true);
  } catch (error) {
    if (error instanceof FirebaseConfigurationError) throw error;
    throw classifySessionVerificationFailure(error);
  }
}
