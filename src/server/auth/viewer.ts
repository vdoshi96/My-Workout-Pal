import { cache } from "react";

import { getCurrentSession } from "@/server/auth/session";

export type ViewerProvider = "google" | "password" | "other";

export type ViewerContext = Readonly<{
  uid: string;
  displayName: string;
  email: string | undefined;
  emailVerified: boolean;
  provider: ViewerProvider;
  authTimeSeconds: number | undefined;
  eligibleForPermanentMutations: boolean;
}>;

type ViewerTokenClaims = Readonly<{
  uid: unknown;
  name?: unknown;
  email?: unknown;
  email_verified?: unknown;
  auth_time?: unknown;
  firebase?:
    | Readonly<{ sign_in_provider?: unknown } & Record<string, unknown>>
    | undefined;
}>;

function nonblankString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function providerFromClaim(value: unknown): ViewerProvider {
  if (value === "google.com") return "google";
  if (value === "password") return "password";
  return "other";
}

export function viewerContextFromToken(token: ViewerTokenClaims): ViewerContext {
  const uid = nonblankString(token.uid);
  if (!uid) throw new TypeError("A verified Firebase UID is required.");

  const emailVerified = token.email_verified === true;
  const authTimeSeconds =
    typeof token.auth_time === "number" &&
    Number.isSafeInteger(token.auth_time) &&
    token.auth_time >= 0
      ? token.auth_time
      : undefined;

  return {
    uid,
    displayName: nonblankString(token.name) ?? "Athlete",
    email: nonblankString(token.email),
    emailVerified,
    provider: providerFromClaim(token.firebase?.sign_in_provider),
    authTimeSeconds,
    eligibleForPermanentMutations: emailVerified,
  };
}

/**
 * Request-memoized viewer lookup. The UID always comes from a revocation-aware
 * Firebase Admin session-cookie verification performed on the server.
 */
export const getCurrentViewer = cache(async (): Promise<ViewerContext | null> => {
  const token = await getCurrentSession();
  return token ? viewerContextFromToken(token) : null;
});
