import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  getYouTubeEmbedVerificationKey,
  loadYouTubeEmbedVerificationEvidence,
} from "./embed-evidence.ts";
import { normalizeYouTubeReference } from "./normalization.ts";
import type {
  ManualYouTubeInstructionEvidence,
  ManualYouTubeReviewBlocker,
  ManualYouTubeReviewDecision,
  ManualYouTubeReviewFile,
  ManualYouTubeReviewRecord,
  ManualYouTubeRejectionReason,
} from "./types.ts";

export const YOUTUBE_MANUAL_REVIEW_FILENAME = "manual-reviews.json";
const YOUTUBE_CURATION_CHECKPOINT_FILENAME = "checkpoint.json";

type ManualYouTubeReviewInput = Omit<ManualYouTubeReviewRecord, "reviewedAt"> & Readonly<{
  reviewedAt?: string | undefined;
}>;

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}

function validTimestamp(value: string | undefined): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function stateKey(record: Pick<ManualYouTubeReviewRecord, "canonicalExerciseSlug" | "variationId" | "videoId">): string {
  return `${record.canonicalExerciseSlug}::${record.variationId}::${record.videoId}`;
}

function isDecision(value: unknown): value is ManualYouTubeReviewDecision {
  return value === "pending" || value === "approved" || value === "rejected";
}

function isRejectionReason(value: unknown): value is ManualYouTubeRejectionReason {
  return [
    "wrong-movement",
    "wrong-equipment",
    "unsafe-instruction",
    "not-concise",
    "no-material-value",
    "unavailable",
    "non-english",
    "shorts-content",
    "other-policy-rejection",
  ].includes(String(value));
}

function isBlockerReason(value: unknown): value is ManualYouTubeReviewBlocker {
  return [
    "review-in-progress",
    "playback-interrupted",
    "visual-evidence-unavailable",
    "audio-evidence-unavailable",
  ].includes(String(value));
}

function isInstructionEvidence(value: unknown): value is ManualYouTubeInstructionEvidence {
  return value === "narration" || value === "captions" || value === "visual";
}

function validateRecord(value: unknown): ManualYouTubeReviewRecord {
  if (!isRecord(value)) throw new Error("Manual YouTube review record must be an object.");
  const requiredStrings = ["canonicalExerciseSlug", "variationId", "videoId", "reviewer"] as const;
  for (const field of requiredStrings) {
    if (typeof value[field] !== "string" || !value[field].trim()) {
      throw new Error(`Manual YouTube review ${field} is required.`);
    }
  }
  if (!isDecision(value["decision"])) throw new Error("Manual YouTube review decision is invalid.");
  const booleanFields = [
    "fullWatchConfirmed",
    "visualReviewConfirmed",
    "exactVariation",
    "conciseInstruction",
    "safeInstruction",
    "addsMaterialValue",
  ] as const;
  for (const field of booleanFields) {
    if (typeof value[field] !== "boolean") throw new Error(`Manual YouTube review ${field} must be boolean.`);
  }

  const videoId = normalizeYouTubeReference(value["videoId"] as string);
  if (videoId !== value["videoId"]) throw new Error("Manual YouTube review videoId must be normalized.");
  const playbackCompletedAt = typeof value["playbackCompletedAt"] === "string"
    ? value["playbackCompletedAt"]
    : undefined;
  const reviewedAt = typeof value["reviewedAt"] === "string" ? value["reviewedAt"] : undefined;
  if (playbackCompletedAt !== undefined && !validTimestamp(playbackCompletedAt)) {
    throw new Error("Manual YouTube review playbackCompletedAt must be a valid timestamp.");
  }
  if (reviewedAt !== undefined && !validTimestamp(reviewedAt)) {
    throw new Error("Manual YouTube review reviewedAt must be a valid timestamp.");
  }

  const rejectionReason = value["rejectionReason"];
  const blockerReason = value["blockerReason"];
  const instructionEvidence = value["instructionEvidence"];
  if (instructionEvidence !== undefined && !isInstructionEvidence(instructionEvidence)) {
    throw new Error("Manual YouTube review instruction evidence is invalid.");
  }
  if (value["decision"] === "rejected" && !isRejectionReason(rejectionReason)) {
    throw new Error("A rejected manual YouTube review requires a stable rejection reason.");
  }
  if (rejectionReason !== undefined && !isRejectionReason(rejectionReason)) {
    throw new Error("Manual YouTube review rejection reason is invalid.");
  }
  if (blockerReason !== undefined && !isBlockerReason(blockerReason)) {
    throw new Error("Manual YouTube review blocker reason is invalid.");
  }
  if (value["decision"] === "approved" && (rejectionReason !== undefined || blockerReason !== undefined)) {
    throw new Error("An approved review can't include a rejection or blocker reason.");
  }
  if (value["decision"] === "rejected" && blockerReason !== undefined) {
    throw new Error("A rejected review can't include a pending blocker reason.");
  }
  if (value["decision"] === "pending" && rejectionReason !== undefined) {
    throw new Error("A pending review can't include a rejection reason.");
  }
  if (value["decision"] === "approved") {
    if (!playbackCompletedAt || value["fullWatchConfirmed"] !== true) {
      throw new Error("An approved manual YouTube review requires completed full-watch evidence.");
    }
    if (value["visualReviewConfirmed"] !== true || !isInstructionEvidence(instructionEvidence)) {
      throw new Error("An approved manual YouTube review requires a full visual review and truthful narration, captions, or visual instruction evidence.");
    }
    if (
      value["exactVariation"] !== true
      || value["conciseInstruction"] !== true
      || value["safeInstruction"] !== true
      || value["addsMaterialValue"] !== true
    ) {
      throw new Error("An approved manual YouTube review requires every quality decision.");
    }
    if (!reviewedAt) throw new Error("An approved manual YouTube review requires a review timestamp.");
  }

  return {
    canonicalExerciseSlug: value["canonicalExerciseSlug"] as string,
    variationId: value["variationId"] as string,
    videoId,
    decision: value["decision"],
    reviewer: (value["reviewer"] as string).trim(),
    ...(reviewedAt ? { reviewedAt } : {}),
    ...(playbackCompletedAt ? { playbackCompletedAt } : {}),
    fullWatchConfirmed: value["fullWatchConfirmed"] as boolean,
    visualReviewConfirmed: value["visualReviewConfirmed"] as boolean,
    ...(isInstructionEvidence(instructionEvidence) ? { instructionEvidence } : {}),
    exactVariation: value["exactVariation"] as boolean,
    conciseInstruction: value["conciseInstruction"] as boolean,
    safeInstruction: value["safeInstruction"] as boolean,
    addsMaterialValue: value["addsMaterialValue"] as boolean,
    ...(isRejectionReason(rejectionReason) ? { rejectionReason } : {}),
    ...(isBlockerReason(blockerReason) ? { blockerReason } : {}),
  };
}

function reviewPath(stateDirectory: string): string {
  return path.join(stateDirectory, YOUTUBE_MANUAL_REVIEW_FILENAME);
}

function emptyReviewFile(updatedAt: string): ManualYouTubeReviewFile {
  return { schemaVersion: 2, updatedAt, reviews: {} };
}

export async function loadManualYouTubeReviews(stateDirectory: string): Promise<ManualYouTubeReviewFile> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(reviewPath(stateDirectory), "utf8")) as unknown;
  } catch (error) {
    if (isRecord(error) && error["code"] === "ENOENT") return emptyReviewFile(new Date(0).toISOString());
    throw error;
  }
  if (!isRecord(parsed) || (parsed["schemaVersion"] !== 1 && parsed["schemaVersion"] !== 2) || !isRecord(parsed["reviews"])) {
    throw new Error("Manual YouTube review file has an unsupported schema.");
  }
  const isLegacy = parsed["schemaVersion"] === 1;
  const reviews: Record<string, ManualYouTubeReviewRecord> = {};
  for (const [key, value] of Object.entries(parsed["reviews"])) {
    const migrated = isLegacy && isRecord(value)
      ? {
          ...value,
          ...(value["decision"] === "approved" && value["audioReviewConfirmed"] === true
            ? { instructionEvidence: "narration" }
            : {}),
        }
      : value;
    const record = validateRecord(migrated);
    if (stateKey(record) !== key) throw new Error("Manual YouTube review key does not match its scoped candidate.");
    reviews[key] = record;
  }
  return {
    schemaVersion: 2,
    updatedAt: validTimestamp(typeof parsed["updatedAt"] === "string" ? parsed["updatedAt"] : undefined)
      ? parsed["updatedAt"] as string
      : new Date(0).toISOString(),
    reviews,
  };
}

async function candidateExists(stateDirectory: string, key: string): Promise<boolean> {
  try {
    const checkpoint = JSON.parse(
      await readFile(path.join(stateDirectory, YOUTUBE_CURATION_CHECKPOINT_FILENAME), "utf8"),
    ) as unknown;
    return isRecord(checkpoint)
      && isRecord(checkpoint["discoveredCandidates"])
      && isRecord(checkpoint["discoveredCandidates"][key]);
  } catch (error) {
    if (isRecord(error) && error["code"] === "ENOENT") return false;
    throw error;
  }
}

async function writeReviewFile(filePath: string, value: ManualYouTubeReviewFile): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp-${process.pid}`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporaryPath, filePath);
}

export async function recordManualYouTubeReview(options: Readonly<{
  stateDirectory: string;
  review: ManualYouTubeReviewInput;
  now?: () => string;
  replaceApproved?: boolean;
}>): Promise<string> {
  const now = options.now ?? (() => new Date().toISOString());
  const timestamp = now();
  if (!validTimestamp(timestamp)) throw new Error("Manual YouTube review clock returned an invalid timestamp.");
  const candidateKey = stateKey(options.review);
  if (!await candidateExists(options.stateDirectory, candidateKey)) {
    throw new Error(`Manual YouTube review references an unknown candidate: ${candidateKey}.`);
  }
  const existingFile = await loadManualYouTubeReviews(options.stateDirectory);
  const existing = existingFile.reviews[candidateKey];
  if (existing?.decision === "rejected" && existing.rejectionReason === "shorts-content" && options.review.decision !== "rejected") {
    throw new Error("Refusing to approve or reopen a candidate with verified Shorts-player evidence.");
  }
  if (existing?.decision === "approved" && options.review.decision !== "approved" && !options.replaceApproved) {
    throw new Error("Refusing to replace an approved review without --replace-approved.");
  }
  const record = validateRecord({
    ...options.review,
    ...(options.review.decision === "pending"
      ? {}
      : { reviewedAt: options.review.reviewedAt ?? timestamp }),
  });
  if (record.decision === "approved") {
    const evidence = await loadYouTubeEmbedVerificationEvidence(options.stateDirectory);
    if (!evidence.verifications[getYouTubeEmbedVerificationKey(record)]) {
      throw new Error("An approved manual YouTube review requires scoped outside-YouTube embed verification.");
    }
  }
  const updated: ManualYouTubeReviewFile = {
    schemaVersion: 2,
    updatedAt: timestamp,
    reviews: { ...existingFile.reviews, [candidateKey]: record },
  };
  const filePath = reviewPath(options.stateDirectory);
  await writeReviewFile(filePath, updated);
  return filePath;
}
