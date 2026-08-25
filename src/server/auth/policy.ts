import { timingSafeEqual } from "node:crypto";

export type AuthPolicyCode =
  | "csrf_invalid"
  | "email_unverified"
  | "forbidden"
  | "reauth_required"
  | "session_expired"
  | "session_invalid"
  | "session_revoked";

export class AuthPolicyError extends Error {
  readonly code: AuthPolicyCode;
  readonly status: number;

  constructor(code: AuthPolicyCode, message: string, status: number) {
    super(message);
    this.name = "AuthPolicyError";
    this.code = code;
    this.status = status;
  }
}

function tokensEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function assertCsrf({
  allowedOrigins,
  cookieToken,
  headerToken,
  origin,
}: Readonly<{
  allowedOrigins: readonly string[];
  cookieToken: string | undefined;
  headerToken: string | undefined;
  origin: string | undefined;
}>): void {
  let normalizedOrigin: string | undefined;
  try {
    normalizedOrigin = origin ? new URL(origin).origin : undefined;
  } catch {
    normalizedOrigin = undefined;
  }

  const allowed = normalizedOrigin
    ? allowedOrigins.some((candidate) => {
        try {
          return new URL(candidate).origin === normalizedOrigin;
        } catch {
          return false;
        }
      })
    : false;

  if (!allowed || !cookieToken || !headerToken || !tokensEqual(cookieToken, headerToken)) {
    throw new AuthPolicyError("csrf_invalid", "The request could not be verified.", 403);
  }
}

export function assertVerifiedMutationIdentity(
  claims: Readonly<{ email_verified?: boolean; uid: string }>,
): string {
  if (!claims.email_verified) {
    throw new AuthPolicyError(
      "email_unverified",
      "Verify your email before changing permanent account data.",
      403,
    );
  }
  return claims.uid;
}

export function assertRecentAuthentication(
  claims: Readonly<{ auth_time?: number; uid: string }>,
  nowSeconds = Math.floor(Date.now() / 1_000),
  maximumAgeSeconds = 300,
): void {
  if (
    claims.auth_time === undefined ||
    claims.auth_time > nowSeconds ||
    nowSeconds - claims.auth_time > maximumAgeSeconds
  ) {
    throw new AuthPolicyError(
      "reauth_required",
      "Sign in again before deleting your account.",
      401,
    );
  }
}

export function assertOwnsResource(authenticatedUid: string, resourceOwnerUid: string): void {
  if (!tokensEqual(authenticatedUid, resourceOwnerUid)) {
    throw new AuthPolicyError("forbidden", "This resource is not available.", 403);
  }
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

export function classifySessionVerificationFailure(error: unknown): AuthPolicyError {
  const code = errorCode(error);
  if (code === "auth/session-cookie-expired") {
    return new AuthPolicyError("session_expired", "Your session expired. Sign in again.", 401);
  }
  if (code === "auth/session-cookie-revoked") {
    return new AuthPolicyError("session_revoked", "Your session is no longer active.", 401);
  }
  return new AuthPolicyError("session_invalid", "A valid session is required.", 401);
}
