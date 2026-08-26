import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { parseYouTubeReference } from "./normalization.ts";
import type { RequiredVideoVariation, YouTubeCurationTarget } from "./types.ts";

export const YOUTUBE_BROWSER_CANDIDATE_FILENAME = "browser-candidates.json";
export const YOUTUBE_BROWSER_IMPORT_RECEIPT_FILENAME = "browser-imports.json";
export const YOUTUBE_BROWSER_DISCOVERY_PROVENANCE = "browser-rendered-search";
export const YOUTUBE_BROWSER_RESULT_LIMIT = 15;

type BrowserTarget = YouTubeCurationTarget & RequiredVideoVariation;
type JsonRecord = Record<string, unknown>;

export type BrowserYouTubeQueryRun = Readonly<{
  canonicalExerciseSlug: string;
  variationId: string;
  query: string;
  observedAt: string;
  resultLimit: typeof YOUTUBE_BROWSER_RESULT_LIMIT;
  resultCount: typeof YOUTUBE_BROWSER_RESULT_LIMIT;
  boundedWindowComplete: true;
  standardVideoCardsOnly: true;
  provenance: typeof YOUTUBE_BROWSER_DISCOVERY_PROVENANCE;
}>;

export type BrowserYouTubeCandidateObservation = Readonly<{
  canonicalExerciseSlug: string;
  variationId: string;
  videoId: string;
  url: string;
  title: string;
  channelTitle: string;
  durationText: string;
  visibleViewText?: string | undefined;
  query: string;
  position: number;
  discoveredAt: string;
  provenance: typeof YOUTUBE_BROWSER_DISCOVERY_PROVENANCE;
}>;

export type BrowserYouTubeCandidateArtifact = Readonly<{
  schemaVersion: 2;
  queryRuns: readonly BrowserYouTubeQueryRun[];
  candidates: readonly BrowserYouTubeCandidateObservation[];
}>;

export type BrowserYouTubeImportReceipt = Readonly<{
  schemaVersion: 2;
  updatedAt: string;
  queryRuns: Readonly<Record<string, BrowserYouTubeQueryRun>>;
  observations: Readonly<Record<string, BrowserYouTubeCandidateObservation>>;
}>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}

function validTimestamp(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function requiredString(record: JsonRecord, field: string, context: string): string {
  const value = record[field];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${context} ${field} is required.`);
  }
  return value.trim();
}

function targetKey(value: Pick<BrowserTarget, "canonicalExerciseSlug" | "variationId">): string {
  return `${value.canonicalExerciseSlug}::${value.variationId}`;
}

function encoded(parts: readonly (string | number)[]): string {
  return parts.map((part) => encodeURIComponent(String(part))).join("::");
}

export function getBrowserYouTubeQueryRunKey(run: BrowserYouTubeQueryRun): string {
  return encoded([
    run.canonicalExerciseSlug,
    run.variationId,
    run.query,
    run.observedAt,
  ]);
}

export function getBrowserYouTubeObservationKey(observation: BrowserYouTubeCandidateObservation): string {
  return encoded([
    observation.canonicalExerciseSlug,
    observation.variationId,
    observation.query,
    observation.discoveredAt,
    observation.position,
    observation.videoId,
  ]);
}

function parseQueryRun(value: unknown): BrowserYouTubeQueryRun {
  if (!isRecord(value)) throw new Error("Browser YouTube query run must be an object.");
  const canonicalExerciseSlug = requiredString(value, "canonicalExerciseSlug", "Browser YouTube query run");
  const variationId = requiredString(value, "variationId", "Browser YouTube query run");
  const query = requiredString(value, "query", "Browser YouTube query run");
  if (!validTimestamp(value["observedAt"])) {
    throw new Error("Browser YouTube query run observedAt must be a valid timestamp.");
  }
  if (value["resultLimit"] !== YOUTUBE_BROWSER_RESULT_LIMIT) {
    throw new Error(`Browser YouTube query run resultLimit must be ${YOUTUBE_BROWSER_RESULT_LIMIT}.`);
  }
  if (value["resultCount"] !== YOUTUBE_BROWSER_RESULT_LIMIT || value["boundedWindowComplete"] !== true) {
    throw new Error(`Browser YouTube query run must contain a complete bounded window of ${YOUTUBE_BROWSER_RESULT_LIMIT} standard watch cards.`);
  }
  if (value["standardVideoCardsOnly"] !== true) {
    throw new Error("Browser YouTube query run must contain standard video cards only.");
  }
  if (value["provenance"] !== YOUTUBE_BROWSER_DISCOVERY_PROVENANCE) {
    throw new Error("Browser YouTube query run provenance is invalid.");
  }
  return {
    canonicalExerciseSlug,
    variationId,
    query,
    observedAt: value["observedAt"],
    resultLimit: YOUTUBE_BROWSER_RESULT_LIMIT,
    resultCount: YOUTUBE_BROWSER_RESULT_LIMIT,
    boundedWindowComplete: true,
    standardVideoCardsOnly: true,
    provenance: YOUTUBE_BROWSER_DISCOVERY_PROVENANCE,
  };
}

function parseCandidateObservation(value: unknown): BrowserYouTubeCandidateObservation {
  if (!isRecord(value)) throw new Error("Browser YouTube candidate observation must be an object.");
  const canonicalExerciseSlug = requiredString(value, "canonicalExerciseSlug", "Browser YouTube candidate");
  const variationId = requiredString(value, "variationId", "Browser YouTube candidate");
  const url = requiredString(value, "url", "Browser YouTube candidate");
  const parsed = parseYouTubeReference(url);
  if (!parsed.ok) throw new Error(`Browser YouTube candidate URL is invalid: ${parsed.message}`);
  if (parsed.kind !== "watch") {
    throw new Error("Browser YouTube candidate URL must be a standard watch URL; Shorts and alternate URL shapes are not accepted.");
  }
  const title = requiredString(value, "title", "Browser YouTube candidate");
  const channelTitle = requiredString(value, "channelTitle", "Browser YouTube candidate");
  const durationText = requiredString(value, "durationText", "Browser YouTube candidate");
  if (!/^(?:\d+:)?[0-5]?\d:[0-5]\d$/.test(durationText)) {
    throw new Error("Browser YouTube candidate durationText must be a rendered video duration.");
  }
  const query = requiredString(value, "query", "Browser YouTube candidate");
  if (!Number.isSafeInteger(value["position"]) || Number(value["position"]) < 1) {
    throw new Error("Browser YouTube candidate position must be a positive integer.");
  }
  if (!validTimestamp(value["discoveredAt"])) {
    throw new Error("Browser YouTube candidate discoveredAt must be a valid timestamp.");
  }
  if (value["provenance"] !== YOUTUBE_BROWSER_DISCOVERY_PROVENANCE) {
    throw new Error("Browser YouTube candidate provenance is invalid.");
  }
  const visibleViewText = value["visibleViewText"];
  if (visibleViewText !== undefined && (typeof visibleViewText !== "string" || !visibleViewText.trim())) {
    throw new Error("Browser YouTube candidate visibleViewText must be a non-empty string when present.");
  }
  return {
    canonicalExerciseSlug,
    variationId,
    videoId: parsed.videoId,
    url: `https://www.youtube.com/watch?v=${parsed.videoId}`,
    title,
    channelTitle,
    durationText,
    ...(typeof visibleViewText === "string" ? { visibleViewText: visibleViewText.trim() } : {}),
    query,
    position: Number(value["position"]),
    discoveredAt: value["discoveredAt"],
    provenance: YOUTUBE_BROWSER_DISCOVERY_PROVENANCE,
  };
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function assertReceiptConsistency(receipt: BrowserYouTubeImportReceipt): void {
  const observationsByRun = new Map<string, BrowserYouTubeCandidateObservation[]>();
  for (const observation of Object.values(receipt.observations)) {
    const runKey = getBrowserYouTubeQueryRunKey({
      canonicalExerciseSlug: observation.canonicalExerciseSlug,
      variationId: observation.variationId,
      query: observation.query,
      observedAt: observation.discoveredAt,
      resultLimit: YOUTUBE_BROWSER_RESULT_LIMIT,
      resultCount: YOUTUBE_BROWSER_RESULT_LIMIT,
      boundedWindowComplete: true,
      standardVideoCardsOnly: true,
      provenance: YOUTUBE_BROWSER_DISCOVERY_PROVENANCE,
    });
    const values = observationsByRun.get(runKey) ?? [];
    values.push(observation);
    observationsByRun.set(runKey, values);
  }
  for (const [key, observation] of Object.entries(receipt.observations)) {
    if (getBrowserYouTubeObservationKey(observation) !== key) {
      throw new Error("Browser YouTube observation key does not match its provenance.");
    }
    const runKey = getBrowserYouTubeQueryRunKey({
      canonicalExerciseSlug: observation.canonicalExerciseSlug,
      variationId: observation.variationId,
      query: observation.query,
      observedAt: observation.discoveredAt,
      resultLimit: YOUTUBE_BROWSER_RESULT_LIMIT,
      resultCount: YOUTUBE_BROWSER_RESULT_LIMIT,
      boundedWindowComplete: true,
      standardVideoCardsOnly: true,
      provenance: YOUTUBE_BROWSER_DISCOVERY_PROVENANCE,
    });
    if (!receipt.queryRuns[runKey]) {
      throw new Error("Browser YouTube candidate does not match a recorded query run.");
    }
  }
  for (const [key, run] of Object.entries(receipt.queryRuns)) {
    if (getBrowserYouTubeQueryRunKey(run) !== key) {
      throw new Error("Browser YouTube query-run key does not match its provenance.");
    }
    const observations = observationsByRun.get(key) ?? [];
    const positions = observations.map((observation) => observation.position).sort((left, right) => left - right);
    const expectedPositions = Array.from({ length: run.resultCount }, (_, index) => index + 1);
    if (positions.length !== expectedPositions.length || positions.some((position, index) => position !== expectedPositions[index])) {
      throw new Error("Browser YouTube query run has incomplete, duplicate, or gapped result positions.");
    }
  }
}

export function parseBrowserYouTubeCandidateArtifact(options: Readonly<{
  input: unknown;
  targets: readonly BrowserTarget[];
  expectedQueries: (target: BrowserTarget) => readonly string[];
}>): BrowserYouTubeCandidateArtifact {
  if (!isRecord(options.input) || options.input["schemaVersion"] !== 2) {
    throw new Error("Browser YouTube candidate artifact has an unsupported schema.");
  }
  if (!Array.isArray(options.input["queryRuns"]) || !Array.isArray(options.input["candidates"])) {
    throw new Error("Browser YouTube candidate artifact requires queryRuns and candidates arrays.");
  }
  const targets = new Map(options.targets.map((target) => [targetKey(target), target]));
  const queryRuns = options.input["queryRuns"].map(parseQueryRun);
  const candidates = options.input["candidates"].map(parseCandidateObservation);
  const runRecords: Record<string, BrowserYouTubeQueryRun> = {};
  for (const run of queryRuns) {
    const target = targets.get(targetKey(run));
    if (!target) throw new Error(`Browser YouTube query run references an unknown target: ${targetKey(run)}.`);
    if (!options.expectedQueries(target).includes(run.query)) {
      throw new Error(`Browser YouTube query run uses an unknown query for ${targetKey(run)}.`);
    }
    const key = getBrowserYouTubeQueryRunKey(run);
    const existing = runRecords[key];
    if (existing && !sameJson(existing, run)) throw new Error(`Conflicting browser query run: ${key}.`);
    runRecords[key] = run;
  }
  const observationRecords: Record<string, BrowserYouTubeCandidateObservation> = {};
  for (const candidate of candidates) {
    const target = targets.get(targetKey(candidate));
    if (!target) throw new Error(`Browser YouTube candidate references an unknown target: ${targetKey(candidate)}.`);
    if (!options.expectedQueries(target).includes(candidate.query)) {
      throw new Error(`Browser YouTube candidate uses an unknown query for ${targetKey(candidate)}.`);
    }
    const key = getBrowserYouTubeObservationKey(candidate);
    const existing = observationRecords[key];
    if (existing && !sameJson(existing, candidate)) throw new Error(`Conflicting browser observation: ${key}.`);
    observationRecords[key] = candidate;
  }
  const temporaryReceipt: BrowserYouTubeImportReceipt = {
    schemaVersion: 2,
    updatedAt: new Date(0).toISOString(),
    queryRuns: runRecords,
    observations: observationRecords,
  };
  assertReceiptConsistency(temporaryReceipt);
  return {
    schemaVersion: 2,
    queryRuns: Object.values(runRecords),
    candidates: Object.values(observationRecords),
  };
}

export function getBrowserYouTubeImportReceiptPath(stateDirectory: string): string {
  return path.join(stateDirectory, YOUTUBE_BROWSER_IMPORT_RECEIPT_FILENAME);
}

function emptyReceipt(): BrowserYouTubeImportReceipt {
  return {
    schemaVersion: 2,
    updatedAt: new Date(0).toISOString(),
    queryRuns: {},
    observations: {},
  };
}

export async function loadBrowserYouTubeImportReceipt(stateDirectory: string): Promise<BrowserYouTubeImportReceipt> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(getBrowserYouTubeImportReceiptPath(stateDirectory), "utf8")) as unknown;
  } catch (error) {
    if (isRecord(error) && error["code"] === "ENOENT") return emptyReceipt();
    throw error;
  }
  if (isRecord(parsed) && parsed["schemaVersion"] === 1) {
    // Schema one allowed a collector to mark 5–8 lazily rendered cards complete.
    // It cannot contribute to schema-two window completeness; the next valid
    // schema-two import atomically supersedes it while checkpoint candidates stay intact.
    return emptyReceipt();
  }
  if (!isRecord(parsed) || parsed["schemaVersion"] !== 2 || !isRecord(parsed["queryRuns"]) || !isRecord(parsed["observations"])) {
    throw new Error("Browser YouTube import receipt has an unsupported schema.");
  }
  if (!validTimestamp(parsed["updatedAt"])) throw new Error("Browser YouTube import receipt has an invalid timestamp.");
  const queryRuns: Record<string, BrowserYouTubeQueryRun> = {};
  for (const [key, value] of Object.entries(parsed["queryRuns"])) {
    queryRuns[key] = parseQueryRun(value);
  }
  const observations: Record<string, BrowserYouTubeCandidateObservation> = {};
  for (const [key, value] of Object.entries(parsed["observations"])) {
    observations[key] = parseCandidateObservation(value);
  }
  const receipt: BrowserYouTubeImportReceipt = {
    schemaVersion: 2,
    updatedAt: parsed["updatedAt"],
    queryRuns,
    observations,
  };
  assertReceiptConsistency(receipt);
  return receipt;
}

export function mergeBrowserYouTubeImportReceipt(options: Readonly<{
  existing: BrowserYouTubeImportReceipt;
  artifact: BrowserYouTubeCandidateArtifact;
  updatedAt: string;
}>): Readonly<{
  receipt: BrowserYouTubeImportReceipt;
  importedQueryRuns: number;
  existingQueryRuns: number;
  importedObservations: number;
  existingObservations: number;
}> {
  if (!validTimestamp(options.updatedAt)) throw new Error("Browser YouTube import clock returned an invalid timestamp.");
  const queryRuns = { ...options.existing.queryRuns };
  const observations = { ...options.existing.observations };
  let importedQueryRuns = 0;
  let existingQueryRuns = 0;
  let importedObservations = 0;
  let existingObservations = 0;
  for (const run of options.artifact.queryRuns) {
    const key = getBrowserYouTubeQueryRunKey(run);
    const existing = queryRuns[key];
    if (existing) {
      if (!sameJson(existing, run)) throw new Error(`Conflicting browser query run: ${key}.`);
      existingQueryRuns += 1;
    } else {
      queryRuns[key] = run;
      importedQueryRuns += 1;
    }
  }
  for (const observation of options.artifact.candidates) {
    const key = getBrowserYouTubeObservationKey(observation);
    const existing = observations[key];
    if (existing) {
      if (!sameJson(existing, observation)) throw new Error(`Conflicting browser observation: ${key}.`);
      existingObservations += 1;
    } else {
      observations[key] = observation;
      importedObservations += 1;
    }
  }
  const receipt: BrowserYouTubeImportReceipt = {
    schemaVersion: 2,
    updatedAt: options.updatedAt,
    queryRuns,
    observations,
  };
  assertReceiptConsistency(receipt);
  return { receipt, importedQueryRuns, existingQueryRuns, importedObservations, existingObservations };
}

export async function saveBrowserYouTubeImportReceipt(
  stateDirectory: string,
  receipt: BrowserYouTubeImportReceipt,
): Promise<string> {
  assertReceiptConsistency(receipt);
  const filePath = getBrowserYouTubeImportReceiptPath(stateDirectory);
  await mkdir(stateDirectory, { recursive: true });
  const temporaryPath = `${filePath}.tmp-${process.pid}`;
  await writeFile(temporaryPath, `${JSON.stringify(receipt, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporaryPath, filePath);
  return filePath;
}

export function hasCompleteBrowserYouTubeDiscovery(options: Readonly<{
  receipt: BrowserYouTubeImportReceipt;
  target: BrowserTarget;
  expectedQueries: readonly string[];
  checkedVideoIds: ReadonlySet<string>;
}>): boolean {
  const observations = Object.values(options.receipt.observations);
  return [...new Set(options.expectedQueries)].every((expectedQuery) => {
    const latestRun = Object.values(options.receipt.queryRuns)
      .filter((run) => (
        run.canonicalExerciseSlug === options.target.canonicalExerciseSlug
        && run.variationId === options.target.variationId
        && run.query === expectedQuery
      ))
      .sort((left, right) => {
        const timestampOrder = Date.parse(right.observedAt) - Date.parse(left.observedAt);
        return timestampOrder || getBrowserYouTubeQueryRunKey(right).localeCompare(getBrowserYouTubeQueryRunKey(left));
      })[0];
    if (!latestRun) return false;
    const runKey = getBrowserYouTubeQueryRunKey(latestRun);
    const runObservations = observations.filter((observation) => {
      const observationRunKey = getBrowserYouTubeQueryRunKey({
        canonicalExerciseSlug: observation.canonicalExerciseSlug,
        variationId: observation.variationId,
        query: observation.query,
        observedAt: observation.discoveredAt,
        resultLimit: YOUTUBE_BROWSER_RESULT_LIMIT,
        resultCount: YOUTUBE_BROWSER_RESULT_LIMIT,
        boundedWindowComplete: true,
        standardVideoCardsOnly: true,
        provenance: YOUTUBE_BROWSER_DISCOVERY_PROVENANCE,
      });
      return observationRunKey === runKey;
    });
    return runObservations.length === latestRun.resultCount
      && runObservations.every((observation) => options.checkedVideoIds.has(observation.videoId));
  });
}
