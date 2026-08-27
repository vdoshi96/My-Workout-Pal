import { randomBytes, randomUUID } from "node:crypto";

const allowedOrigin = "https://my-workout-pal-chi.vercel.app";
const allowedProjectId = "my-workout-pal-92819";

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

  const requiredFirebaseValues = [
    nonblank(environment, "NEXT_PUBLIC_FIREBASE_API_KEY"),
    nonblank(environment, "NEXT_PUBLIC_FIREBASE_APP_ID"),
    nonblank(environment, "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
    nonblank(environment, "FIREBASE_CLIENT_EMAIL"),
    nonblank(environment, "FIREBASE_PRIVATE_KEY"),
  ];
  if (requiredFirebaseValues.some((value) => value === undefined)) {
    throw new HostedAuthQaConfigurationError("firebase_unavailable");
  }

  return { origin, projectId: allowedProjectId };
}

export type HostedAuthQaIdentity = Readonly<{
  displayMarker: "My Workout Pal hosted QA";
  email: string;
  password: string;
}>;

export function createHostedAuthQaIdentity(): HostedAuthQaIdentity {
  const suffix = randomUUID().replaceAll("-", "");
  const entropy = randomBytes(32).toString("base64url");
  return {
    displayMarker: "My Workout Pal hosted QA",
    email: `mwp-qa-${suffix}@example.com`,
    password: `Aq1!${entropy}`,
  };
}
