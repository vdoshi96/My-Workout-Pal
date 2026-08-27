import { randomBytes, randomUUID } from "node:crypto";

const allowedOrigin = "https://my-workout-pal-chi.vercel.app";
const allowedProjectId = "my-workout-pal-92819";
const allowedAuthDomain = "my-workout-pal-92819.firebaseapp.com";

export type HostedAuthQaConfigurationCode =
  | "approval_required"
  | "firebase_unavailable"
  | "origin_invalid"
  | "project_mismatch";

export class HostedAuthQaConfigurationError extends Error {
  readonly code: HostedAuthQaConfigurationCode;

  constructor(code: HostedAuthQaConfigurationCode) {
    super("Hosted authentication QA configuration is invalid.");
    this.name = "HostedAuthQaConfigurationError";
    this.code = code;
  }
}

type HostedAuthEnvironment = Readonly<Record<string, string | undefined>>;

function nonblank(environment: HostedAuthEnvironment, name: string): string | undefined {
  const value = environment[name]?.trim();
  return value ? value : undefined;
}

function validatedOrigin(value: string | undefined): string {
  if (!value) throw new HostedAuthQaConfigurationError("origin_invalid");
  try {
    const parsed = new URL(value);
    if (
      parsed.protocol !== "https:" ||
      parsed.origin !== allowedOrigin ||
      parsed.username ||
      parsed.password ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash
    ) {
      throw new HostedAuthQaConfigurationError("origin_invalid");
    }
    return parsed.origin;
  } catch (error) {
    if (error instanceof HostedAuthQaConfigurationError) throw error;
    throw new HostedAuthQaConfigurationError("origin_invalid");
  }
}

export type HostedAuthQaConfig = Readonly<{
  apiKey: string;
  authDomain: string;
  origin: string;
  projectId: string;
}>;

export function parseHostedAuthQaConfig(environment: HostedAuthEnvironment): HostedAuthQaConfig {
  if (environment["MWP_HOSTED_AUTH_EXTERNAL_ACCOUNT_APPROVED"] !== "1") {
    throw new HostedAuthQaConfigurationError("approval_required");
  }

  const origin = validatedOrigin(
    nonblank(environment, "MWP_HOSTED_AUTH_ORIGIN") ?? allowedOrigin,
  );
  const publicProjectId = nonblank(environment, "NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  const adminProjectId = nonblank(environment, "FIREBASE_PROJECT_ID");
  if (
    publicProjectId !== allowedProjectId ||
    adminProjectId !== allowedProjectId ||
    publicProjectId !== adminProjectId
  ) {
    throw new HostedAuthQaConfigurationError("project_mismatch");
  }

  const apiKey = nonblank(environment, "NEXT_PUBLIC_FIREBASE_API_KEY");
  const authDomain = nonblank(environment, "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
  if (
    !apiKey ||
    !authDomain ||
    !nonblank(environment, "NEXT_PUBLIC_FIREBASE_APP_ID") ||
    !nonblank(environment, "FIREBASE_CLIENT_EMAIL") ||
    !nonblank(environment, "FIREBASE_PRIVATE_KEY")
  ) {
    throw new HostedAuthQaConfigurationError("firebase_unavailable");
  }
  if (authDomain !== allowedAuthDomain) {
    throw new HostedAuthQaConfigurationError("project_mismatch");
  }

  return {
    apiKey,
    authDomain,
    origin,
    projectId: allowedProjectId,
  };
}

export type HostedAuthQaIdentity = Readonly<{
  displayMarker: "My Workout Pal hosted QA";
  email: string;
  password: string;
  recoveredPassword: string;
}>;

export function createHostedAuthQaIdentity(): HostedAuthQaIdentity {
  const suffix = randomUUID().replaceAll("-", "");
  const password = `Aq1!${randomBytes(32).toString("base64url")}`;
  let recoveredPassword = `Rq2!${randomBytes(32).toString("base64url")}`;
  while (recoveredPassword === password) {
    recoveredPassword = `Rq2!${randomBytes(32).toString("base64url")}`;
  }
  return {
    displayMarker: "My Workout Pal hosted QA",
    email: `mwp-qa-${suffix}@example.com`,
    password,
    recoveredPassword,
  };
}

export type HostedAuthQaActionMode = "resetPassword" | "verifyEmail";

type HostedAuthQaActionExpectation = Readonly<{
  apiKey: string;
  authDomain: string;
  mode: HostedAuthQaActionMode;
}>;

function invalidActionLink(): never {
  throw new Error("Hosted authentication QA action link is invalid.");
}

export function parseHostedAuthQaActionLink(
  value: string,
  expected: HostedAuthQaActionExpectation,
): Readonly<{ oobCode: string }> {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return invalidActionLink();
  }

  if (
    parsed.protocol !== "https:" ||
    parsed.host !== expected.authDomain ||
    parsed.pathname !== "/__/auth/action" ||
    parsed.username ||
    parsed.password ||
    parsed.hash
  ) {
    return invalidActionLink();
  }

  const allowedParameters = new Set(["apiKey", "lang", "mode", "oobCode"]);
  for (const key of parsed.searchParams.keys()) {
    if (!allowedParameters.has(key) || parsed.searchParams.getAll(key).length !== 1) {
      return invalidActionLink();
    }
  }

  const apiKey = parsed.searchParams.getAll("apiKey");
  const mode = parsed.searchParams.getAll("mode");
  const oobCode = parsed.searchParams.getAll("oobCode");
  if (
    apiKey.length !== 1 ||
    apiKey[0] !== expected.apiKey ||
    mode.length !== 1 ||
    mode[0] !== expected.mode ||
    oobCode.length !== 1 ||
    !oobCode[0]?.trim()
  ) {
    return invalidActionLink();
  }

  return { oobCode: oobCode[0] };
}

function actionResponseRecord(value: unknown): Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Hosted authentication QA action response is invalid.");
  }
  return value as Readonly<Record<string, unknown>>;
}

export function parseHostedAuthQaEmailVerificationResponse(
  value: unknown,
  expected: Readonly<{ email: string; uid: string }>,
): Readonly<{ emailVerified: true }> {
  const record = actionResponseRecord(value);
  if (record["email"] !== expected.email || record["localId"] !== expected.uid) {
    throw new Error("Hosted authentication QA action response is invalid.");
  }
  return { emailVerified: true };
}

export function parseHostedAuthQaPasswordResetResponse(
  value: unknown,
  expectedEmail: string,
): Readonly<{ requestType: "PASSWORD_RESET" }> {
  const record = actionResponseRecord(value);
  if (record["email"] !== expectedEmail || record["requestType"] !== "PASSWORD_RESET") {
    throw new Error("Hosted authentication QA action response is invalid.");
  }
  return { requestType: "PASSWORD_RESET" };
}
