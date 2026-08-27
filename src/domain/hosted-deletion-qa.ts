import {
  createHostedAuthQaIdentity,
  HostedAuthQaConfigurationError,
  parseHostedAuthQaConfig,
  type HostedAuthQaConfig,
  type HostedAuthQaIdentity,
} from "@/domain/hosted-auth-qa";

export type HostedDeletionQaConfigurationCode =
  | "approval_required"
  | "database_unavailable"
  | "firebase_unavailable"
  | "origin_invalid"
  | "project_mismatch";

export class HostedDeletionQaConfigurationError extends Error {
  readonly code: HostedDeletionQaConfigurationCode;

  constructor(code: HostedDeletionQaConfigurationCode) {
    super("Hosted deletion QA configuration is invalid.");
    this.name = "HostedDeletionQaConfigurationError";
    this.code = code;
  }
}

type HostedDeletionEnvironment = Readonly<Record<string, string | undefined>>;

export function parseHostedDeletionQaConfig(
  environment: HostedDeletionEnvironment,
): HostedAuthQaConfig {
  if (environment["MWP_HOSTED_DELETION_EXTERNAL_ACCOUNTS_APPROVED"] !== "1") {
    throw new HostedDeletionQaConfigurationError("approval_required");
  }
  if (!environment["DATABASE_URL"]?.trim()) {
    throw new HostedDeletionQaConfigurationError("database_unavailable");
  }

  try {
    return parseHostedAuthQaConfig({
      ...environment,
      MWP_HOSTED_AUTH_EXTERNAL_ACCOUNT_APPROVED: "1",
    });
  } catch (error) {
    if (error instanceof HostedAuthQaConfigurationError) {
      throw new HostedDeletionQaConfigurationError(error.code);
    }
    throw new HostedDeletionQaConfigurationError("firebase_unavailable");
  }
}

export function createHostedDeletionQaIdentities(): readonly [
  HostedAuthQaIdentity,
  HostedAuthQaIdentity,
] {
  const first = createHostedAuthQaIdentity();
  let second = createHostedAuthQaIdentity();
  while (second.email === first.email) second = createHostedAuthQaIdentity();
  return [first, second];
}
