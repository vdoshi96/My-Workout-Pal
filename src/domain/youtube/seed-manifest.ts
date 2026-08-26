import {
  buildDefaultRequiredVideoVariations,
  validateCuratedVideoSeed,
} from "./seed-validation.ts";
import type { CuratedVideoSeed } from "./types.ts";

export const CURATED_VIDEO_SEED_MANIFEST_SCHEMA_VERSION = 1 as const;

export type CuratedVideoSeedManifest = Readonly<{
  schemaVersion: typeof CURATED_VIDEO_SEED_MANIFEST_SCHEMA_VERSION;
  videos: readonly CuratedVideoSeed[];
}>;

type JsonRecord = Record<string, unknown>;

const MANIFEST_KEYS = new Set(["schemaVersion", "videos"]);
const SEED_ROW_KEYS = new Set([
  "canonicalExerciseSlug",
  "variationId",
  "videoId",
  "displayOrder",
  "title",
  "channelTitle",
  "approvalState",
  "reviewer",
  "reviewedAt",
  "fullWatchConfirmed",
]);

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: JsonRecord, allowed: ReadonlySet<string>, label: string): void {
  const unsupported = Object.keys(value).filter((key) => !allowed.has(key));
  if (unsupported.length > 0) {
    throw new TypeError(`${label} contains unsupported field(s): ${unsupported.join(", ")}.`);
  }
}

function requiredString(value: JsonRecord, key: string, label: string): string {
  const field = value[key];
  if (typeof field !== "string" || !field.trim()) {
    throw new TypeError(`${label} requires ${key}.`);
  }
  return field.trim();
}

function proposalKey(canonicalExerciseSlug: string, variationId: string): string {
  return `${canonicalExerciseSlug}::${variationId}`;
}

function assertValidProductionRows(videos: readonly CuratedVideoSeed[]): void {
  const validation = validateCuratedVideoSeed(
    buildDefaultRequiredVideoVariations(),
    videos,
    { requireDefaultCatalogCoverage: true },
  );
  if (!validation.valid) {
    const summary = validation.errors
      .map(({ code, canonicalExerciseSlug, videoId }) =>
        [code, canonicalExerciseSlug, videoId].filter(Boolean).join(":"),
      )
      .join(", ");
    throw new TypeError(`Curated video production manifest is invalid: ${summary}.`);
  }
}

export function parseCuratedVideoSeedManifest(input: unknown): CuratedVideoSeedManifest {
  if (!isRecord(input)) throw new TypeError("Curated video seed manifest must be an object.");
  exactKeys(input, MANIFEST_KEYS, "Curated video seed manifest");
  if (input["schemaVersion"] !== CURATED_VIDEO_SEED_MANIFEST_SCHEMA_VERSION) {
    throw new TypeError("Curated video seed manifest schemaVersion is unsupported.");
  }
  if (!Array.isArray(input["videos"])) {
    throw new TypeError("Curated video seed manifest requires a videos array.");
  }

  const videos = input["videos"].map((value, index): CuratedVideoSeed => {
    const label = `Curated video seed row ${index}`;
    if (!isRecord(value)) throw new TypeError(`${label} must be an object.`);
    exactKeys(value, SEED_ROW_KEYS, label);
    const displayOrder = value["displayOrder"];
    if (displayOrder !== 1 && displayOrder !== 2) {
      throw new TypeError(`${label} requires displayOrder 1 or 2.`);
    }
    if (value["approvalState"] !== "approved") {
      throw new TypeError(`${label} must be approved.`);
    }
    if (value["fullWatchConfirmed"] !== true) {
      throw new TypeError(`${label} requires fullWatchConfirmed.`);
    }
    const reviewedAt = requiredString(value, "reviewedAt", label);
    if (Number.isNaN(Date.parse(reviewedAt))) {
      throw new TypeError(`${label} requires a valid reviewedAt timestamp.`);
    }
    return {
      canonicalExerciseSlug: requiredString(value, "canonicalExerciseSlug", label),
      variationId: requiredString(value, "variationId", label),
      videoId: requiredString(value, "videoId", label),
      displayOrder,
      title: requiredString(value, "title", label),
      channelTitle: requiredString(value, "channelTitle", label),
      approvalState: "approved",
      reviewer: requiredString(value, "reviewer", label),
      reviewedAt: new Date(reviewedAt).toISOString(),
      fullWatchConfirmed: true,
    };
  });
  assertValidProductionRows(videos);
  return { schemaVersion: CURATED_VIDEO_SEED_MANIFEST_SCHEMA_VERSION, videos };
}

export function buildCuratedVideoSeedManifestFromReport(input: unknown): CuratedVideoSeedManifest {
  if (!isRecord(input)) throw new TypeError("YouTube curation report must be an object.");
  if (!Array.isArray(input["candidates"]) || !Array.isArray(input["proposedPairs"])) {
    throw new TypeError("YouTube curation report requires candidates and proposedPairs arrays.");
  }

  const required = buildDefaultRequiredVideoVariations();
  const requiredKeys = new Set(required.map((target) => proposalKey(target.canonicalExerciseSlug, target.variationId)));
  const proposals = new Map<string, JsonRecord>();
  for (const value of input["proposedPairs"]) {
    if (!isRecord(value) || !isRecord(value["target"])) {
      throw new TypeError("Every curation proposal requires a target object.");
    }
    const canonicalExerciseSlug = requiredString(value["target"], "canonicalExerciseSlug", "Curation proposal target");
    const variationId = requiredString(value["target"], "variationId", "Curation proposal target");
    const key = proposalKey(canonicalExerciseSlug, variationId);
    if (!requiredKeys.has(key)) throw new TypeError(`Curation report contains unsupported proposal ${key}.`);
    if (proposals.has(key)) throw new TypeError(`Curation report contains duplicate proposal ${key}.`);
    proposals.set(key, value);
  }

  const candidates = input["candidates"];
  const videos: CuratedVideoSeed[] = [];
  for (const target of required) {
    const key = proposalKey(target.canonicalExerciseSlug, target.variationId);
    const proposal = proposals.get(key);
    if (!proposal || proposal["status"] !== "approved-for-seed") {
      throw new TypeError(`Curation proposal ${key} is not approved for seed.`);
    }
    const videoIds = proposal["videoIds"];
    if (!Array.isArray(videoIds) || videoIds.length !== 2 || videoIds.some((videoId) => typeof videoId !== "string")) {
      throw new TypeError(`Curation proposal ${key} must select exactly two video IDs.`);
    }

    videoIds.forEach((videoId, index) => {
      const matches = candidates.filter((candidate) => {
        if (!isRecord(candidate) || !isRecord(candidate["target"])) return false;
        return candidate["videoId"] === videoId
          && candidate["target"]["canonicalExerciseSlug"] === target.canonicalExerciseSlug
          && candidate["target"]["variationId"] === target.variationId;
      });
      if (matches.length !== 1) {
        throw new TypeError(`Approved proposal ${key} has ${matches.length} scoped candidate records for ${String(videoId)}.`);
      }
      const reportCandidate = matches[0];
      if (!reportCandidate || reportCandidate["reviewStatus"] !== "approved") {
        throw new TypeError(`Approved proposal ${key} candidate ${String(videoId)} lacks approved review status.`);
      }
      if (!isRecord(reportCandidate["decision"]) || reportCandidate["decision"]["eligible"] !== true) {
        throw new TypeError(`Approved proposal ${key} candidate ${String(videoId)} is not eligible.`);
      }
      if (!isRecord(reportCandidate["candidate"])) {
        throw new TypeError(`Approved proposal ${key} candidate ${String(videoId)} lacks human review evidence.`);
      }
      const candidate = reportCandidate["candidate"];
      const humanReviewValue = candidate["humanReview"];
      if (!isRecord(humanReviewValue)) {
        throw new TypeError(`Approved proposal ${key} candidate ${String(videoId)} lacks human review evidence.`);
      }
      const humanReview = humanReviewValue;
      if (candidate["syndicationEvidence"] !== "verified") {
        throw new TypeError(`Approved proposal ${key} candidate ${String(videoId)} lacks scoped embed verification.`);
      }
      const instructionEvidence = humanReview["instructionEvidence"];
      if (
        candidate["videoId"] !== videoId
        || humanReview["approved"] !== true
        || humanReview["fullWatchConfirmed"] !== true
        || humanReview["exactVariation"] !== true
        || humanReview["conciseInstruction"] !== true
        || humanReview["safeInstruction"] !== true
        || humanReview["addsMaterialValue"] !== true
        || (instructionEvidence !== "narration" && instructionEvidence !== "captions" && instructionEvidence !== "visual")
      ) {
        throw new TypeError(`Approved proposal ${key} candidate ${String(videoId)} lacks terminal full-watch approval.`);
      }
      const reviewedAt = requiredString(humanReview, "reviewedAt", `Approved proposal ${key} candidate ${String(videoId)}`);
      if (Number.isNaN(Date.parse(reviewedAt))) {
        throw new TypeError(`Approved proposal ${key} candidate ${String(videoId)} has an invalid review timestamp.`);
      }
      videos.push({
        canonicalExerciseSlug: target.canonicalExerciseSlug,
        variationId: target.variationId,
        videoId: String(videoId),
        displayOrder: index + 1,
        title: requiredString(candidate, "title", `Approved proposal ${key} candidate ${String(videoId)}`),
        channelTitle: requiredString(candidate, "channelTitle", `Approved proposal ${key} candidate ${String(videoId)}`),
        approvalState: "approved",
        reviewer: requiredString(humanReview, "reviewer", `Approved proposal ${key} candidate ${String(videoId)}`),
        reviewedAt,
        fullWatchConfirmed: true,
      });
    });
  }

  const manifest: CuratedVideoSeedManifest = {
    schemaVersion: CURATED_VIDEO_SEED_MANIFEST_SCHEMA_VERSION,
    videos,
  };
  return parseCuratedVideoSeedManifest(manifest);
}
