import {
  HostedAuthQaConfigurationError,
  parseHostedAuthQaConfig,
  type HostedAuthQaConfig,
} from "@/domain/hosted-auth-qa";

export type HostedAuthenticatedMediaQaConfigurationCode =
  | "approval_required"
  | "database_unavailable"
  | "firebase_unavailable"
  | "native_zoom_required"
  | "origin_invalid"
  | "project_mismatch";

export class HostedAuthenticatedMediaQaConfigurationError extends Error {
  readonly code: HostedAuthenticatedMediaQaConfigurationCode;

  constructor(code: HostedAuthenticatedMediaQaConfigurationCode) {
    super("Hosted authenticated media QA configuration is invalid.");
    this.name = "HostedAuthenticatedMediaQaConfigurationError";
    this.code = code;
  }
}

type HostedAuthenticatedMediaEnvironment = Readonly<
  Record<string, string | undefined>
>;

export function parseHostedAuthenticatedMediaQaConfig(
  environment: HostedAuthenticatedMediaEnvironment,
): HostedAuthQaConfig {
  if (environment["MWP_HOSTED_AUTHENTICATED_MEDIA_APPROVED"] !== "1") {
    throw new HostedAuthenticatedMediaQaConfigurationError("approval_required");
  }
  if (environment["MWP_HOSTED_AUTHENTICATED_MEDIA_NATIVE_ZOOM"] !== "1") {
    throw new HostedAuthenticatedMediaQaConfigurationError("native_zoom_required");
  }
  if (!environment["DATABASE_URL"]?.trim()) {
    throw new HostedAuthenticatedMediaQaConfigurationError("database_unavailable");
  }

  try {
    return parseHostedAuthQaConfig({
      ...environment,
      MWP_HOSTED_AUTH_EXTERNAL_ACCOUNT_APPROVED: "1",
    });
  } catch (error) {
    if (error instanceof HostedAuthQaConfigurationError) {
      throw new HostedAuthenticatedMediaQaConfigurationError(error.code);
    }
    throw new HostedAuthenticatedMediaQaConfigurationError("firebase_unavailable");
  }
}

const youtubeVideoIdPattern = /^[A-Za-z0-9_-]{11}$/u;

type MediaEvidence = Readonly<{
  activeIframeCount: number;
  directFallbackVideoIds: readonly string[];
  playingVideoIds: readonly string[];
  selectedVideoId: string;
  videos: readonly Readonly<{
    displayOrder: number;
    videoId: string;
  }>[];
}>;

function exactIds(values: readonly string[], expected: readonly string[]): boolean {
  return values.length === expected.length &&
    new Set(values).size === values.length &&
    values.toSorted().join(":") === expected.toSorted().join(":");
}

export function mediaEvidenceIsComplete(input: MediaEvidence): boolean {
  if (input.videos.length !== 2 || input.activeIframeCount !== 1) return false;
  const ordered = input.videos.toSorted((left, right) =>
    left.displayOrder - right.displayOrder
  );
  const videoIds = ordered.map(({ videoId }) => videoId);
  return ordered[0]?.displayOrder === 1 &&
    ordered[1]?.displayOrder === 2 &&
    videoIds.every((videoId) => youtubeVideoIdPattern.test(videoId)) &&
    new Set(videoIds).size === 2 &&
    videoIds.includes(input.selectedVideoId) &&
    exactIds(input.directFallbackVideoIds, videoIds) &&
    exactIds(input.playingVideoIds, videoIds);
}

type BrowserZoomEvidence = Readonly<{
  devicePixelRatioAfter: number;
  devicePixelRatioBefore: number;
  emulationUsed: boolean;
  reportedPercent: number;
  restoredPercent: number;
}>;

export function browserZoomEvidenceIsExact(input: BrowserZoomEvidence): boolean {
  return input.reportedPercent === 200 &&
    input.restoredPercent === 100 &&
    input.emulationUsed === false &&
    Number.isFinite(input.devicePixelRatioBefore) &&
    input.devicePixelRatioBefore > 0 &&
    Number.isFinite(input.devicePixelRatioAfter) &&
    Math.abs(input.devicePixelRatioAfter / input.devicePixelRatioBefore - 2) < 0.01;
}

type CleanupPostcondition = Readonly<{
  firebaseCountAfter: number;
  firebaseCountBefore: number;
  globalDigestAfter: string;
  globalDigestBefore: string;
  identityAbsent: boolean;
  ownerRowCount: number;
  terminalDeletionJob: boolean;
}>;

export function cleanupPostconditionIsConfirmed(
  input: CleanupPostcondition,
): boolean {
  return input.firebaseCountAfter === input.firebaseCountBefore &&
    input.globalDigestAfter.length > 0 &&
    input.globalDigestAfter === input.globalDigestBefore &&
    input.identityAbsent &&
    input.ownerRowCount === 0 &&
    input.terminalDeletionJob;
}
