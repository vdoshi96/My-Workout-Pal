import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { normalizeYouTubeReference } from "./normalization.ts";

export const YOUTUBE_EMBED_VERIFICATION_FILENAME = "embed-verifications.json";

type JsonRecord = Record<string, unknown>;

export type YouTubeEmbedVerificationRecord = Readonly<{
  canonicalExerciseSlug: string;
  variationId: string;
  videoId: string;
  verifier: string;
  verifiedAt: string;
  privacyEnhancedEmbedConfirmed: true;
  outsideYouTubePlaybackConfirmed: true;
  visibleControlsConfirmed: true;
  keyboardControlsConfirmed: true;
  directFallbackConfirmed: true;
}>;

export type YouTubeEmbedVerificationFile = Readonly<{
  schemaVersion: 1;
  updatedAt: string;
  verifications: Readonly<Record<string, YouTubeEmbedVerificationRecord>>;
}>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}

function validTimestamp(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function requiredString(record: JsonRecord, field: string): string {
  const value = record[field];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`YouTube embed verification ${field} is required.`);
  }
  return value.trim();
}

export function getYouTubeEmbedVerificationKey(
  value: Pick<YouTubeEmbedVerificationRecord, "canonicalExerciseSlug" | "variationId" | "videoId">,
): string {
  return `${value.canonicalExerciseSlug}::${value.variationId}::${value.videoId}`;
}

export function validateYouTubeEmbedVerificationRecord(value: unknown): YouTubeEmbedVerificationRecord {
  if (!isRecord(value)) throw new Error("YouTube embed verification record must be an object.");
  const canonicalExerciseSlug = requiredString(value, "canonicalExerciseSlug");
  const variationId = requiredString(value, "variationId");
  const rawVideoId = requiredString(value, "videoId");
  const videoId = normalizeYouTubeReference(rawVideoId);
  if (videoId !== rawVideoId) throw new Error("YouTube embed verification videoId must be normalized.");
  const verifier = requiredString(value, "verifier");
  if (!validTimestamp(value["verifiedAt"])) {
    throw new Error("YouTube embed verification verifiedAt must be a valid timestamp.");
  }
  const checks = [
    "privacyEnhancedEmbedConfirmed",
    "outsideYouTubePlaybackConfirmed",
    "visibleControlsConfirmed",
    "keyboardControlsConfirmed",
    "directFallbackConfirmed",
  ] as const;
  if (checks.some((field) => value[field] !== true)) {
    throw new Error("Every embed verification check must be confirmed before recording verified syndication evidence.");
  }
  return {
    canonicalExerciseSlug,
    variationId,
    videoId,
    verifier,
    verifiedAt: value["verifiedAt"],
    privacyEnhancedEmbedConfirmed: true,
    outsideYouTubePlaybackConfirmed: true,
    visibleControlsConfirmed: true,
    keyboardControlsConfirmed: true,
    directFallbackConfirmed: true,
  };
}

function emptyFile(): YouTubeEmbedVerificationFile {
  return {
    schemaVersion: 1,
    updatedAt: new Date(0).toISOString(),
    verifications: {},
  };
}

function verificationPath(stateDirectory: string): string {
  return path.join(stateDirectory, YOUTUBE_EMBED_VERIFICATION_FILENAME);
}

export async function loadYouTubeEmbedVerificationEvidence(
  stateDirectory: string,
): Promise<YouTubeEmbedVerificationFile> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(verificationPath(stateDirectory), "utf8")) as unknown;
  } catch (error) {
    if (isRecord(error) && error["code"] === "ENOENT") return emptyFile();
    throw error;
  }
  if (!isRecord(parsed) || parsed["schemaVersion"] !== 1 || !isRecord(parsed["verifications"])) {
    throw new Error("YouTube embed verification file has an unsupported schema.");
  }
  if (!validTimestamp(parsed["updatedAt"])) {
    throw new Error("YouTube embed verification file has an invalid timestamp.");
  }
  const verifications: Record<string, YouTubeEmbedVerificationRecord> = {};
  for (const [key, value] of Object.entries(parsed["verifications"])) {
    const record = validateYouTubeEmbedVerificationRecord(value);
    if (getYouTubeEmbedVerificationKey(record) !== key) {
      throw new Error("YouTube embed verification key does not match its scoped candidate.");
    }
    verifications[key] = record;
  }
  return {
    schemaVersion: 1,
    updatedAt: parsed["updatedAt"],
    verifications,
  };
}

export async function saveYouTubeEmbedVerificationEvidence(
  stateDirectory: string,
  value: YouTubeEmbedVerificationFile,
): Promise<string> {
  if (!validTimestamp(value.updatedAt)) throw new Error("YouTube embed verification file has an invalid timestamp.");
  for (const [key, rawRecord] of Object.entries(value.verifications)) {
    const record = validateYouTubeEmbedVerificationRecord(rawRecord);
    if (getYouTubeEmbedVerificationKey(record) !== key) {
      throw new Error("YouTube embed verification key does not match its scoped candidate.");
    }
  }
  const filePath = verificationPath(stateDirectory);
  await mkdir(stateDirectory, { recursive: true });
  const temporaryPath = `${filePath}.tmp-${process.pid}`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporaryPath, filePath);
  return filePath;
}
