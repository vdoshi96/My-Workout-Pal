import {
  getYouTubeEmbedVerificationKey,
  loadYouTubeEmbedVerificationEvidence,
  saveYouTubeEmbedVerificationEvidence,
  validateYouTubeEmbedVerificationRecord,
  type YouTubeEmbedVerificationRecord,
} from "./embed-evidence.ts";
import {
  getYouTubeCandidateStateKey,
  loadCurationCheckpoint,
} from "./curation.ts";

export { loadYouTubeEmbedVerificationEvidence as loadYouTubeEmbedVerifications } from "./embed-evidence.ts";

type VerificationInput = Omit<
  YouTubeEmbedVerificationRecord,
  | "verifiedAt"
  | "privacyEnhancedEmbedConfirmed"
  | "outsideYouTubePlaybackConfirmed"
  | "visibleControlsConfirmed"
  | "keyboardControlsConfirmed"
  | "directFallbackConfirmed"
> & Readonly<{
  verifiedAt?: string | undefined;
  privacyEnhancedEmbedConfirmed: boolean;
  outsideYouTubePlaybackConfirmed: boolean;
  visibleControlsConfirmed: boolean;
  keyboardControlsConfirmed: boolean;
  directFallbackConfirmed: boolean;
}>;

export async function recordYouTubeEmbedVerification(options: Readonly<{
  stateDirectory: string;
  verification: VerificationInput;
  now?: () => string;
}>): Promise<string> {
  const timestamp = options.verification.verifiedAt
    ?? (options.now ?? (() => new Date().toISOString()))();
  const record = validateYouTubeEmbedVerificationRecord({
    ...options.verification,
    verifiedAt: timestamp,
  });
  const checkpoint = await loadCurationCheckpoint(options.stateDirectory);
  const candidateKey = getYouTubeCandidateStateKey(
    record.canonicalExerciseSlug,
    record.variationId,
    record.videoId,
  );
  if (!checkpoint.discoveredCandidates[candidateKey]) {
    throw new Error(`YouTube embed verification references an unknown candidate: ${candidateKey}.`);
  }
  const hydrated = checkpoint.hydratedCandidates[record.videoId];
  if (!checkpoint.hydratedVideoIds.includes(record.videoId) || !hydrated) {
    throw new Error("YouTube embed verification requires a hydrated candidate.");
  }
  if (
    hydrated.available === false
    || hydrated.privacyStatus !== "public"
    || hydrated.uploadStatus !== "processed"
    || hydrated.embeddable !== true
    || hydrated.regionAvailable !== true
  ) {
    throw new Error("YouTube embed verification requires currently available, public, processed, embeddable, region-available metadata.");
  }
  const existing = await loadYouTubeEmbedVerificationEvidence(options.stateDirectory);
  const updated = {
    schemaVersion: 1 as const,
    updatedAt: timestamp,
    verifications: {
      ...existing.verifications,
      [getYouTubeEmbedVerificationKey(record)]: record,
    },
  };
  return saveYouTubeEmbedVerificationEvidence(options.stateDirectory, updated);
}
