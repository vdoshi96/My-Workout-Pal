import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { evaluateYouTubeCandidate, rankEligibleCandidates } from "./eligibility.ts";
import { normalizeYouTubeReference } from "./normalization.ts";
import type {
  CurationCheckpoint,
  CurationRunBudget,
  CurationQueryOrder,
  CurationReport,
  CurationReportCandidate,
  CurationReviewStatus,
  ProposedVideoPair,
  RequiredVideoVariation,
  YouTubeCandidate,
  YouTubeCurationTarget,
  YouTubeDataApi,
  YouTubeHydrateResponse,
  YouTubeRejectionCode,
  YouTubeSearchRequest,
  YouTubeSearchResponse,
} from "./types.ts";

export const DEFAULT_YOUTUBE_CURATION_STATE_DIR = ".local/youtube-curation";
export const YOUTUBE_CURATION_CHECKPOINT_SCHEMA_VERSION = 3;
export const MISSING_YOUTUBE_API_KEY_MESSAGE = "Missing YOUTUBE_API_KEY; refusing to run YouTube curation.";
export const YOUTUBE_CURATION_CHECKPOINT_FILENAME = "checkpoint.json";
export const YOUTUBE_CURATION_REPORT_FILENAME = "review-report.json";
export const DEFAULT_YOUTUBE_REGION_CODE = "US";
export const DEFAULT_YOUTUBE_MAX_RESULTS = 25;
export const YOUTUBE_SEARCH_REQUEST_UNITS = 1;
export const YOUTUBE_HYDRATE_REQUEST_UNITS = 1;
export const DEFAULT_YOUTUBE_CURATION_BUDGET: CurationRunBudget = {
  maxQuotaUnits: 1_000,
  maxSearchRequests: 10,
  maxHydrateRequests: 10,
  maxPagesPerQuery: 1,
};

type JsonRecord = Record<string, unknown> & {
  schemaVersion?: unknown;
  updatedAt?: unknown;
  completedQueries?: unknown;
  queryKey?: unknown;
  pageToken?: unknown;
  hydratedVideoIds?: unknown;
  unavailableVideoIds?: unknown;
  hydratedCandidates?: unknown;
  discoveredCandidates?: unknown;
  target?: JsonRecord;
  item?: JsonRecord;
  canonicalExerciseSlug?: unknown;
  variationId?: unknown;
  exerciseName?: unknown;
  movement?: unknown;
  movementTerms?: unknown;
  aliases?: unknown;
  requiredEquipmentTerms?: unknown;
  equipment?: unknown;
  disallowedEquipmentTerms?: unknown;
  disallowedMovementTerms?: unknown;
  queryKeys?: unknown;
  rejectionCodes?: unknown;
  pageTokens?: unknown;
  queryPageCounts?: unknown;
  reviewStatus?: unknown;
  quota?: JsonRecord;
  searchRequests?: unknown;
  hydrateRequests?: unknown;
  unitsEstimated?: unknown;
  code?: unknown;
  error?: JsonRecord;
  message?: unknown;
  items?: unknown;
  nextPageToken?: unknown;
  id?: JsonRecord | string;
  videoId?: unknown;
  snippet?: JsonRecord;
  title?: unknown;
  description?: unknown;
  channelTitle?: unknown;
  channelId?: unknown;
  publishedAt?: unknown;
  contentDetails?: JsonRecord;
  status?: JsonRecord;
  statistics?: JsonRecord;
  regionRestriction?: JsonRecord;
  blocked?: unknown;
  allowed?: unknown;
  viewCount?: unknown;
  duration?: unknown;
  privacyStatus?: unknown;
  uploadStatus?: unknown;
  embeddable?: unknown;
  license?: unknown;
  liveBroadcastContent?: unknown;
  defaultLanguage?: unknown;
  defaultAudioLanguage?: unknown;
};

type CurationTarget = YouTubeCurationTarget & RequiredVideoVariation;

export function getYouTubeCandidateStateKey(
  canonicalExerciseSlug: string,
  variationId: string,
  videoId: string,
): string {
  return `${canonicalExerciseSlug}::${variationId}::${videoId}`;
}

export function deduplicateYouTubeCurationTargets(
  targets: readonly CurationTarget[],
): readonly CurationTarget[] {
  const seen = new Set<string>();
  return targets.filter((target) => {
    const key = `${target.canonicalExerciseSlug}::${target.variationId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}

function checkpointPath(stateDirectory: string): string {
  return path.join(stateDirectory, YOUTUBE_CURATION_CHECKPOINT_FILENAME);
}

export function createEmptyCurationCheckpoint(updatedAt: string = new Date().toISOString()): CurationCheckpoint {
  return {
    schemaVersion: YOUTUBE_CURATION_CHECKPOINT_SCHEMA_VERSION,
    updatedAt,
    completedQueries: [],
    pageTokens: {},
    queryPageCounts: {},
    hydratedVideoIds: [],
    unavailableVideoIds: [],
    hydratedCandidates: {},
    discoveredCandidates: {},
    rejectionCodes: {},
    quota: {
      searchRequests: 0,
      hydrateRequests: 0,
      unitsEstimated: 0,
    },
    reviewStatus: {},
  };
}

function parseCheckpoint(input: unknown): CurationCheckpoint {
  if (!isRecord(input)) {
    throw new Error("YouTube curation checkpoint has an unsupported schema version.");
  }
  const isLegacySchemaTwo = input.schemaVersion === 2;
  if (input.schemaVersion !== YOUTUBE_CURATION_CHECKPOINT_SCHEMA_VERSION && !isLegacySchemaTwo) {
    if (input.schemaVersion === 1) {
      throw new Error(
        "YouTube curation checkpoint schema version 1 is incompatible with scoped candidate state; start a new checkpoint or migrate it explicitly.",
      );
    }
    throw new Error("YouTube curation checkpoint has an unsupported schema version.");
  }

  const empty = createEmptyCurationCheckpoint(
    typeof input.updatedAt === "string" ? input.updatedAt : new Date().toISOString(),
  );
  const completedQueries = Array.isArray(input.completedQueries)
    ? input.completedQueries.filter(
        (item): item is { queryKey: string; pageToken: string | null } =>
          isRecord(item) && typeof item.queryKey === "string" && (typeof item.pageToken === "string" || item.pageToken === null),
      )
    : [];
  const hydratedVideoIds = Array.isArray(input.hydratedVideoIds)
    ? [...new Set(input.hydratedVideoIds.filter((value): value is string => typeof value === "string"))]
    : [];
  const unavailableVideoIds = Array.isArray(input.unavailableVideoIds)
    ? [...new Set(input.unavailableVideoIds.filter((value): value is string => typeof value === "string"))]
    : [];
  const hydratedCandidates: Record<string, YouTubeCandidate> = {};
  if (isRecord(input.hydratedCandidates)) {
    for (const [videoId, candidate] of Object.entries(input.hydratedCandidates)) {
      if (isRecord(candidate) && typeof candidate.videoId === "string" && typeof candidate.title === "string") {
        hydratedCandidates[videoId] = candidate as unknown as YouTubeCandidate;
      }
    }
  }
  const discoveredCandidates: CurationCheckpoint["discoveredCandidates"] = {};
  if (isRecord(input.discoveredCandidates)) {
    for (const discovered of Object.values(input.discoveredCandidates)) {
      if (!isRecord(discovered) || !isRecord(discovered.target) || !isRecord(discovered.item)) continue;
      if (
        typeof discovered.target.canonicalExerciseSlug !== "string" ||
        typeof discovered.target.variationId !== "string" ||
        typeof discovered.target.exerciseName !== "string" ||
        !Array.isArray(discovered.queryKeys) ||
        !discovered.queryKeys.every((value) => typeof value === "string") ||
        typeof discovered.item.videoId !== "string" ||
        typeof discovered.item.title !== "string"
      ) continue;
      const scopedCandidateKey = getYouTubeCandidateStateKey(
        discovered.target.canonicalExerciseSlug,
        discovered.target.variationId,
        discovered.item.videoId,
      );
      discoveredCandidates[scopedCandidateKey] = {
        target: {
          canonicalExerciseSlug: discovered.target.canonicalExerciseSlug,
          variationId: discovered.target.variationId,
          exerciseName: discovered.target.exerciseName,
          ...(typeof discovered.target.movement === "string" ? { movement: discovered.target.movement } : {}),
          ...(Array.isArray(discovered.target.movementTerms)
            ? { movementTerms: discovered.target.movementTerms.filter((value): value is string => typeof value === "string") }
            : {}),
          ...(Array.isArray(discovered.target.aliases) ? { aliases: discovered.target.aliases.filter((value): value is string => typeof value === "string") } : {}),
          ...(Array.isArray(discovered.target.requiredEquipmentTerms)
            ? { requiredEquipmentTerms: discovered.target.requiredEquipmentTerms.filter((value): value is string => typeof value === "string") }
            : {}),
          ...(typeof discovered.target.equipment === "string" ? { equipment: discovered.target.equipment } : {}),
          ...(Array.isArray(discovered.target.disallowedEquipmentTerms)
            ? { disallowedEquipmentTerms: discovered.target.disallowedEquipmentTerms.filter((value): value is string => typeof value === "string") }
            : {}),
          ...(Array.isArray(discovered.target.disallowedMovementTerms)
            ? { disallowedMovementTerms: discovered.target.disallowedMovementTerms.filter((value): value is string => typeof value === "string") }
            : {}),
        },
        queryKeys: discovered.queryKeys,
        item: discovered.item as unknown as YouTubeCandidate,
      };
    }
  }
  const rejectionCodes: Record<string, YouTubeRejectionCode[]> = {};
  if (isRecord(input.rejectionCodes)) {
    for (const [videoId, codes] of Object.entries(input.rejectionCodes)) {
      if (Array.isArray(codes)) {
        rejectionCodes[videoId] = codes.filter((code): code is YouTubeRejectionCode => typeof code === "string");
      }
    }
  }
  const pageTokens: Record<string, string | null> = {};
  if (isRecord(input.pageTokens)) {
    for (const [key, token] of Object.entries(input.pageTokens)) {
      if (typeof token === "string" || token === null) pageTokens[key] = token;
    }
  }
  const queryPageCounts: Record<string, number> = {};
  if (isRecord(input.queryPageCounts)) {
    for (const [key, count] of Object.entries(input.queryPageCounts)) {
      if (typeof count === "number" && Number.isSafeInteger(count) && count >= 0) {
        queryPageCounts[key] = count;
      }
    }
  }
  for (const key of Object.keys(pageTokens)) {
    queryPageCounts[key] ??= 1;
  }
  const reviewStatus: Record<string, CurationReviewStatus> = {};
  if (isRecord(input.reviewStatus)) {
    for (const [videoId, status] of Object.entries(input.reviewStatus)) {
      if (status === "pending" || status === "approved" || status === "rejected") reviewStatus[videoId] = status;
    }
  }
  const quota = isRecord(input.quota) ? input.quota : {};
  const numberOrZero = (value: unknown) => (
    typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : 0
  );
  const searchRequests = numberOrZero(quota.searchRequests);
  const hydrateRequests = numberOrZero(quota.hydrateRequests);
  const documentedUnits = searchRequests * YOUTUBE_SEARCH_REQUEST_UNITS
    + hydrateRequests * YOUTUBE_HYDRATE_REQUEST_UNITS;

  return {
    ...empty,
    completedQueries,
    hydratedVideoIds,
    unavailableVideoIds,
    hydratedCandidates,
    discoveredCandidates,
    rejectionCodes,
    pageTokens,
    queryPageCounts,
    reviewStatus,
    quota: {
      searchRequests,
      hydrateRequests,
      unitsEstimated: isLegacySchemaTwo
        ? documentedUnits
        : Math.max(numberOrZero(quota.unitsEstimated), documentedUnits),
    },
    ...(typeof input["blockedReason"] === "string" ? { blockedReason: input["blockedReason"] } : {}),
  };
}

export async function loadCurationCheckpoint(
  stateDirectory: string = DEFAULT_YOUTUBE_CURATION_STATE_DIR,
): Promise<CurationCheckpoint> {
  try {
    const contents = await readFile(checkpointPath(stateDirectory), "utf8");
    return parseCheckpoint(JSON.parse(contents) as unknown);
  } catch (error) {
    if (isRecord(error) && error.code === "ENOENT") return createEmptyCurationCheckpoint();
    throw error;
  }
}

async function writeJsonAtomically(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp-${process.pid}`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporaryPath, filePath);
}

export async function saveCurationCheckpoint(
  stateDirectory: string,
  checkpoint: CurationCheckpoint,
): Promise<string> {
  const updated: CurationCheckpoint = {
    ...checkpoint,
    updatedAt: new Date().toISOString(),
    quota: {
      ...checkpoint.quota,
      unitsEstimated: Math.max(
        checkpoint.quota.unitsEstimated,
        checkpoint.quota.searchRequests * YOUTUBE_SEARCH_REQUEST_UNITS +
          checkpoint.quota.hydrateRequests * YOUTUBE_HYDRATE_REQUEST_UNITS,
      ),
    },
  };
  const filePath = checkpointPath(stateDirectory);
  await writeJsonAtomically(filePath, updated);
  return filePath;
}

export async function writeCurationReport(
  stateDirectory: string,
  report: CurationReport,
): Promise<string> {
  const filePath = path.join(stateDirectory, YOUTUBE_CURATION_REPORT_FILENAME);
  await writeJsonAtomically(filePath, report);
  return filePath;
}

export const loadYouTubeCurationCheckpoint = loadCurationCheckpoint;
export const saveYouTubeCurationCheckpoint = saveCurationCheckpoint;

function queryKey(target: YouTubeCurationTarget, query: string, order: CurationQueryOrder, index: number): string {
  const variationId = "variationId" in target && typeof target.variationId === "string" ? target.variationId : "canonical";
  return `${target.canonicalExerciseSlug}:${variationId}:${order}:${index}:${query}`;
}

function expectedQueryKeys(target: CurationTarget): readonly string[] {
  return buildCurationQueries(target).flatMap((query, index) =>
    (["relevance", "viewCount"] as const).map((order) => queryKey(target, query, order, index))
  );
}

export function buildCurationQueries(target: YouTubeCurationTarget): readonly string[] {
  const movement = target.movement ?? target.exerciseName;
  const equipment = target.equipment ?? target.requiredEquipmentTerms?.join(" ") ?? "";
  const aliases = target.aliases ?? [];
  const exclusion = "-shorts -challenge -reaction -compilation";
  return [...new Set([
    [movement, equipment].filter(Boolean).join(" "),
    ...aliases.map((alias) => [alias, equipment].filter(Boolean).join(" ")),
  ].map((query) => `${query} ${exclusion}`.trim()))];
}

export function buildYouTubeSearchRequest(
  target: YouTubeCurationTarget,
  query: string,
  order: CurationQueryOrder,
  index = 0,
  options: Readonly<{ pageToken?: string | undefined; regionCode?: string | undefined; maxResults?: number | undefined }> = {},
): YouTubeSearchRequest {
  return {
    queryKey: queryKey(target, query, order, index),
    query,
    order,
    ...(options.pageToken ? { pageToken: options.pageToken } : {}),
    maxResults: options.maxResults ?? DEFAULT_YOUTUBE_MAX_RESULTS,
    regionCode: options.regionCode ?? DEFAULT_YOUTUBE_REGION_CODE,
  };
}

function encodeSearchParams(request: YouTubeSearchRequest, apiKey: string): URLSearchParams {
  const params = new URLSearchParams({
    key: apiKey,
    part: "snippet",
    q: request.query,
    type: "video",
    order: request.order,
    videoEmbeddable: "true",
    videoSyndicated: "true",
    safeSearch: "strict",
    relevanceLanguage: "en",
    regionCode: request.regionCode ?? DEFAULT_YOUTUBE_REGION_CODE,
    videoDuration: "short",
    maxResults: String(request.maxResults ?? DEFAULT_YOUTUBE_MAX_RESULTS),
  });
  if (request.pageToken) params.set("pageToken", request.pageToken);
  return params;
}

function encodeHydrateParams(videoIds: readonly string[], apiKey: string): URLSearchParams {
  return new URLSearchParams({
    key: apiKey,
    part: "snippet,contentDetails,status,statistics",
    id: videoIds.join(","),
  });
}

async function fetchJson(
  endpoint: string,
  params: URLSearchParams,
  fetchImpl: typeof fetch,
): Promise<JsonRecord> {
  const response = await fetchImpl(`${endpoint}?${params.toString()}`, {
    method: "GET",
    headers: { accept: "application/json" },
  });
  const body = (await response.json()) as unknown;
  if (!response.ok) {
    const reason = isRecord(body) && isRecord(body.error) && typeof body.error.message === "string"
      ? body.error.message
      : "YouTube Data API request failed.";
    throw new Error(reason);
  }
  if (!isRecord(body)) throw new Error("YouTube Data API returned an invalid response.");
  return body;
}

export function createYouTubeDataApiClient(options: Readonly<{
  apiKey: string;
  fetchImpl?: typeof fetch;
  endpoint?: string;
}>): YouTubeDataApi {
  const apiKey = options.apiKey.trim();
  if (!apiKey) throw new Error("YOUTUBE_API_KEY is required to create the YouTube Data API client.");
  const fetchImpl = options.fetchImpl ?? fetch;
  const endpoint = options.endpoint ?? "https://www.googleapis.com/youtube/v3";

  return {
    async searchVideos(request) {
      const body = await fetchJson(`${endpoint}/search`, encodeSearchParams(request, apiKey), fetchImpl);
      const items = Array.isArray(body.items)
        ? body.items.flatMap((item): YouTubeSearchResponse["items"][number][] => {
            if (!isRecord(item) || !isRecord(item.id) || typeof item.id.videoId !== "string" || !isRecord(item.snippet)) return [];
            return [{
              videoId: item.id.videoId,
              title: typeof item.snippet.title === "string" ? item.snippet.title : "",
              description: typeof item.snippet.description === "string" ? item.snippet.description : undefined,
              channelTitle: typeof item.snippet.channelTitle === "string" ? item.snippet.channelTitle : undefined,
              channelId: typeof item.snippet.channelId === "string" ? item.snippet.channelId : undefined,
              publishedAt: typeof item.snippet.publishedAt === "string" ? item.snippet.publishedAt : undefined,
            }];
          })
        : [];
      return {
        items,
        nextPageToken: typeof body.nextPageToken === "string" ? body.nextPageToken : undefined,
        quotaUnits: YOUTUBE_SEARCH_REQUEST_UNITS,
      };
    },
    async hydrateVideos(videoIds, regionCode = DEFAULT_YOUTUBE_REGION_CODE) {
      if (videoIds.length === 0) return { items: [], quotaUnits: 0 };
      const body = await fetchJson(`${endpoint}/videos`, encodeHydrateParams(videoIds, apiKey), fetchImpl);
      const items = Array.isArray(body.items)
        ? body.items.flatMap((item): YouTubeCandidate[] => {
            if (!isRecord(item) || typeof item.id !== "string") return [];
            const snippet = isRecord(item.snippet) ? item.snippet : {};
            const contentDetails = isRecord(item.contentDetails) ? item.contentDetails : {};
            const status = isRecord(item.status) ? item.status : {};
            const statistics = isRecord(item.statistics) ? item.statistics : {};
            const regionRestriction = isRecord(contentDetails.regionRestriction) ? contentDetails.regionRestriction : undefined;
            const blocked = Array.isArray(regionRestriction?.blocked) && regionRestriction.blocked.includes(regionCode);
            const allowed = Array.isArray(regionRestriction?.allowed) && regionRestriction.allowed.length > 0
              ? regionRestriction.allowed.includes(regionCode)
              : true;
            const viewCount = typeof statistics.viewCount === "string" ? Number(statistics.viewCount) : undefined;
            return [{
              videoId: item.id,
              url: `https://www.youtube.com/watch?v=${item.id}`,
              title: typeof snippet.title === "string" ? snippet.title : "",
              description: typeof snippet.description === "string" ? snippet.description : undefined,
              channelTitle: typeof snippet.channelTitle === "string" ? snippet.channelTitle : undefined,
              channelId: typeof snippet.channelId === "string" ? snippet.channelId : undefined,
              duration: typeof contentDetails.duration === "string" ? contentDetails.duration : undefined,
              privacyStatus: typeof status.privacyStatus === "string" ? status.privacyStatus : undefined,
              uploadStatus: typeof status.uploadStatus === "string" ? status.uploadStatus : undefined,
              embeddable: typeof status.embeddable === "boolean" ? status.embeddable : undefined,
              syndicated: undefined,
              syndicationEvidence: "unknown",
              regionAvailable: !blocked && allowed,
              liveBroadcastContent: typeof snippet.liveBroadcastContent === "string" ? snippet.liveBroadcastContent : undefined,
              language: typeof snippet.defaultLanguage === "string" ? snippet.defaultLanguage : undefined,
              defaultLanguage: typeof snippet.defaultLanguage === "string" ? snippet.defaultLanguage : undefined,
              defaultAudioLanguage: typeof snippet.defaultAudioLanguage === "string" ? snippet.defaultAudioLanguage : undefined,
              viewCount: Number.isFinite(viewCount) ? viewCount : undefined,
              publishedAt: typeof snippet.publishedAt === "string" ? snippet.publishedAt : undefined,
            }];
          })
        : [];
      return { items, quotaUnits: YOUTUBE_HYDRATE_REQUEST_UNITS };
    },
  };
}

function addQuota(checkpoint: CurationCheckpoint, searchUnits: number, hydrateUnits: number): void {
  checkpoint.quota.searchRequests += searchUnits > 0 ? 1 : 0;
  checkpoint.quota.hydrateRequests += hydrateUnits > 0 ? 1 : 0;
  checkpoint.quota.unitsEstimated += searchUnits + hydrateUnits;
}

type CurationRunUsage = {
  searchRequests: number;
  hydrateRequests: number;
  unitsEstimated: number;
};

function nonNegativeIntegerOrFallback(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : fallback;
}

function resolveCurationBudget(input: Partial<CurationRunBudget> | undefined): CurationRunBudget {
  return {
    maxQuotaUnits: nonNegativeIntegerOrFallback(input?.maxQuotaUnits, DEFAULT_YOUTUBE_CURATION_BUDGET.maxQuotaUnits),
    maxSearchRequests: nonNegativeIntegerOrFallback(input?.maxSearchRequests, DEFAULT_YOUTUBE_CURATION_BUDGET.maxSearchRequests),
    maxHydrateRequests: nonNegativeIntegerOrFallback(input?.maxHydrateRequests, DEFAULT_YOUTUBE_CURATION_BUDGET.maxHydrateRequests),
    maxPagesPerQuery: nonNegativeIntegerOrFallback(input?.maxPagesPerQuery, DEFAULT_YOUTUBE_CURATION_BUDGET.maxPagesPerQuery),
  };
}

function canSpend(
  usage: CurationRunUsage,
  budget: CurationRunBudget,
  kind: "search" | "hydrate",
  units: number,
): boolean {
  if (usage.unitsEstimated + units > budget.maxQuotaUnits) return false;
  if (kind === "search") return usage.searchRequests < budget.maxSearchRequests;
  return usage.hydrateRequests < budget.maxHydrateRequests;
}

function recordRunUsage(usage: CurationRunUsage, kind: "search" | "hydrate", units: number): void {
  usage.unitsEstimated += units;
  if (kind === "search") usage.searchRequests += 1;
  else usage.hydrateRequests += 1;
}

function isProviderSearchQuotaError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const normalized = error.message.toLocaleLowerCase("en-US");
  return normalized.includes("quota exceeded") && normalized.includes("search quer");
}

function candidateChannelKey(candidate: YouTubeCandidate): string | undefined {
  const value = candidate.channelId ?? candidate.channelTitle;
  const normalized = value?.trim().toLocaleLowerCase("en-US");
  return normalized || undefined;
}

function materiallyRedundant(left: YouTubeCandidate, right: YouTubeCandidate): boolean {
  if (left.materialFingerprint && right.materialFingerprint && left.materialFingerprint === right.materialFingerprint) {
    return true;
  }
  return left.nearDuplicateOf === right.videoId || right.nearDuplicateOf === left.videoId;
}

export function proposeVideoPair(
  target: YouTubeCurationTarget & RequiredVideoVariation,
  candidates: readonly YouTubeCandidate[],
): ProposedVideoPair {
  const eligibleCandidates = candidates.filter((candidate) => evaluateYouTubeCandidate(candidate, target).eligible);
  const ranked = rankEligibleCandidates(candidates, target);
  const first = ranked[0]?.candidate;
  if (!first) {
    return {
      target: { canonicalExerciseSlug: target.canonicalExerciseSlug, variationId: target.variationId },
      status: "needs-second-candidate",
      videoIds: [],
      distinctChannels: false,
      reason: "fewer-than-two-eligible-candidates",
    };
  }

  const nonRedundant = eligibleCandidates.filter(
    (candidate) => candidate.videoId !== first.videoId && !materiallyRedundant(first, candidate),
  );
  if (nonRedundant.length === 0) {
    return {
      target: { canonicalExerciseSlug: target.canonicalExerciseSlug, variationId: target.variationId },
      status: "needs-second-candidate",
      videoIds: [first.videoId],
      distinctChannels: false,
      reason: eligibleCandidates.length > 1 ? "materially-redundant-second" : "fewer-than-two-eligible-candidates",
    };
  }

  const rankedAlternatives = rankEligibleCandidates(nonRedundant, target);
  const bestAlternativeRanked = rankedAlternatives[0];
  const bestAlternative = bestAlternativeRanked?.candidate;
  const firstChannel = candidateChannelKey(first);
  const distinctAlternative = rankedAlternatives.find((rankedCandidate) => {
    const channel = candidateChannelKey(rankedCandidate.candidate);
    return Boolean(firstChannel && channel && channel !== firstChannel);
  });
  // A distinct channel wins when its hard-gated relevance is comparable. View count
  // is already a final tie-breaker inside rankEligibleCandidates.
  const second = distinctAlternative && bestAlternativeRanked
    ? distinctAlternative.decision.relevanceScore >= bestAlternativeRanked.decision.relevanceScore - 2
      ? distinctAlternative.candidate
      : bestAlternative
    : bestAlternative ?? distinctAlternative?.candidate;
  if (!second) {
    return {
      target: { canonicalExerciseSlug: target.canonicalExerciseSlug, variationId: target.variationId },
      status: "needs-second-candidate",
      videoIds: [first.videoId],
      distinctChannels: false,
      reason: "fewer-than-two-eligible-candidates",
    };
  }
  const secondChannel = candidateChannelKey(second);
  return {
    target: { canonicalExerciseSlug: target.canonicalExerciseSlug, variationId: target.variationId },
    status: "ready-for-review",
    videoIds: [first.videoId, second.videoId],
    distinctChannels: Boolean(firstChannel && secondChannel && firstChannel !== secondChannel),
  };
}

export async function curateYouTubeCandidates(options: Readonly<{
  api: YouTubeDataApi;
  targets: readonly CurationTarget[];
  stateDirectory?: string;
  now?: () => string;
  maxResults?: number;
  regionCode?: string;
  budget?: Partial<CurationRunBudget>;
  refreshUnavailable?: boolean;
}>): Promise<Readonly<{ checkpoint: CurationCheckpoint; report: CurationReport; reportPath: string }>> {
  const stateDirectory = options.stateDirectory ?? DEFAULT_YOUTUBE_CURATION_STATE_DIR;
  const now = options.now ?? (() => new Date().toISOString());
  const regionCode = options.regionCode ?? DEFAULT_YOUTUBE_REGION_CODE;
  const budget = resolveCurationBudget(options.budget);
  const usage: CurationRunUsage = { searchRequests: 0, hydrateRequests: 0, unitsEstimated: 0 };
  const checkpoint = await loadCurationCheckpoint(stateDirectory);
  const refreshUnavailableIds = options.refreshUnavailable
    ? new Set(checkpoint.unavailableVideoIds)
    : new Set<string>();
  delete checkpoint.blockedReason;
  const targets = deduplicateYouTubeCurationTargets(options.targets);
  const activeTargetKeys = new Set(targets.map((target) => `${target.canonicalExerciseSlug}::${target.variationId}`));
  const targetByKey = new Map(targets.map((target) => [
    `${target.canonicalExerciseSlug}::${target.variationId}`,
    target,
  ]));
  const queryItems = new Map<string, { target: CurationTarget; queryKeys: string[]; item: YouTubeCandidate }>();
  for (const [candidateKey, discovered] of Object.entries(checkpoint.discoveredCandidates)) {
    const currentTarget = targetByKey.get(
      `${discovered.target.canonicalExerciseSlug}::${discovered.target.variationId}`,
    ) ?? discovered.target;
    queryItems.set(candidateKey, {
      target: currentTarget,
      queryKeys: [...discovered.queryKeys],
      item: discovered.item,
    });
    checkpoint.discoveredCandidates[candidateKey] = {
      ...discovered,
      target: currentTarget,
    };
  }

  let searchBlockedReason: string | undefined;
  curationLoop: for (const target of targets) {
    for (const [index, query] of buildCurationQueries(target).entries()) {
      for (const order of ["relevance", "viewCount"] as const) {
        const request = buildYouTubeSearchRequest(target, query, order, index, {
          regionCode,
          maxResults: options.maxResults,
          ...(typeof checkpoint.pageTokens[queryKey(target, query, order, index)] === "string"
            ? { pageToken: checkpoint.pageTokens[queryKey(target, query, order, index)] ?? undefined }
            : {}),
        });
        if (checkpoint.completedQueries.some((completed) => completed.queryKey === request.queryKey)) continue;
        let pageToken = checkpoint.pageTokens[request.queryKey] ?? undefined;
        let pagesFetched = checkpoint.queryPageCounts[request.queryKey] ?? 0;
        if (pagesFetched >= budget.maxPagesPerQuery) {
          checkpoint.completedQueries.push({ queryKey: request.queryKey, pageToken: pageToken ?? null });
          await saveCurationCheckpoint(stateDirectory, checkpoint);
          continue;
        }
        while (!searchBlockedReason) {
          if (!canSpend(usage, budget, "search", YOUTUBE_SEARCH_REQUEST_UNITS)) {
            searchBlockedReason = `quota budget would be exceeded before the next search request for ${request.queryKey}.`;
            checkpoint.blockedReason = searchBlockedReason;
            await saveCurationCheckpoint(stateDirectory, checkpoint);
            break curationLoop;
          }
          const pageRequest = buildYouTubeSearchRequest(target, query, order, index, {
            regionCode,
            maxResults: options.maxResults,
            ...(pageToken ? { pageToken } : {}),
          });
          let response: YouTubeSearchResponse;
          try {
            response = await options.api.searchVideos(pageRequest);
          } catch (error) {
            if (!isProviderSearchQuotaError(error)) throw error;
            searchBlockedReason = "provider search quota is exhausted; resume after the provider reset.";
            checkpoint.blockedReason = searchBlockedReason;
            await saveCurationCheckpoint(stateDirectory, checkpoint);
            break curationLoop;
          }
          recordRunUsage(usage, "search", YOUTUBE_SEARCH_REQUEST_UNITS);
          addQuota(checkpoint, YOUTUBE_SEARCH_REQUEST_UNITS, 0);
          pagesFetched += 1;
          checkpoint.queryPageCounts[request.queryKey] = pagesFetched;
          checkpoint.pageTokens[request.queryKey] = response.nextPageToken ?? null;
          for (const item of response.items) {
            let normalizedId: string;
            try {
              normalizedId = normalizeYouTubeReference(item.videoId);
            } catch {
              continue;
            }
            const key = getYouTubeCandidateStateKey(
              target.canonicalExerciseSlug,
              target.variationId,
              normalizedId,
            );
            const existing = queryItems.get(key);
            if (existing) {
              if (!existing.queryKeys.includes(request.queryKey)) existing.queryKeys.push(request.queryKey);
              existing.item = {
                ...existing.item,
                syndicated: existing.item.syndicated === false ? false : true,
                syndicationEvidence: "search-filter",
                searchSources: [...new Set([...(existing.item.searchSources ?? []), order])],
                queryKeys: [...new Set([...(existing.item.queryKeys ?? []), request.queryKey])],
              };
              const discovered = checkpoint.discoveredCandidates[key];
              if (discovered && !discovered.queryKeys.includes(request.queryKey)) {
                discovered.queryKeys.push(request.queryKey);
              }
              if (discovered) discovered.item = existing.item;
            } else {
              const discovered = {
                target,
                queryKeys: [request.queryKey],
                item: {
                  ...item,
                  videoId: normalizedId,
                  syndicated: true,
                  syndicationEvidence: "search-filter" as const,
                  searchSources: [order],
                  queryKeys: [request.queryKey],
                },
              };
              queryItems.set(key, discovered);
              checkpoint.discoveredCandidates[key] = discovered;
            }
          }
          await saveCurationCheckpoint(stateDirectory, checkpoint);
          if (!response.nextPageToken) {
            if (!checkpoint.completedQueries.some((completed) => completed.queryKey === request.queryKey)) {
              checkpoint.completedQueries.push({ queryKey: request.queryKey, pageToken: null });
            }
            await saveCurationCheckpoint(stateDirectory, checkpoint);
            break;
          }
          pageToken = response.nextPageToken;
          if (pagesFetched >= budget.maxPagesPerQuery) {
            checkpoint.completedQueries.push({ queryKey: request.queryKey, pageToken: pageToken ?? null });
            await saveCurationCheckpoint(stateDirectory, checkpoint);
            break;
          }
        }
      }
    }
  }

  const hydratedIds = new Set(checkpoint.hydratedVideoIds);
  const unavailableIds = new Set(checkpoint.unavailableVideoIds);
  const pendingIds = [...new Set(
    [...queryItems.values()]
      .filter((entry) => activeTargetKeys.has(`${entry.target.canonicalExerciseSlug}::${entry.target.variationId}`))
      .map((entry) => entry.item.videoId)
      .filter((videoId) => !hydratedIds.has(videoId) && (!unavailableIds.has(videoId) || refreshUnavailableIds.has(videoId))),
  )];
  const hydratedById = new Map<string, YouTubeCandidate>();
  for (const [videoId, candidate] of Object.entries(checkpoint.hydratedCandidates)) {
    hydratedById.set(videoId, candidate);
  }
  let hydrationBlockedReason: string | undefined;
  for (let index = 0; index < pendingIds.length && !hydrationBlockedReason; index += 50) {
    const batch = pendingIds.slice(index, index + 50);
    if (!canSpend(usage, budget, "hydrate", YOUTUBE_HYDRATE_REQUEST_UNITS)) {
      hydrationBlockedReason = "quota budget would be exceeded before the next hydration request.";
      checkpoint.blockedReason = hydrationBlockedReason;
      await saveCurationCheckpoint(stateDirectory, checkpoint);
      break;
    }
    const response: YouTubeHydrateResponse = await options.api.hydrateVideos(batch, regionCode);
    recordRunUsage(usage, "hydrate", YOUTUBE_HYDRATE_REQUEST_UNITS);
    addQuota(checkpoint, 0, YOUTUBE_HYDRATE_REQUEST_UNITS);
    const returnedIds = new Set<string>();
    for (const candidate of response.items) {
      let normalizedId: string;
      try {
        normalizedId = normalizeYouTubeReference(candidate.videoId);
      } catch {
        continue;
      }
      returnedIds.add(normalizedId);
      hydratedById.set(normalizedId, { ...candidate, videoId: normalizedId });
      checkpoint.hydratedCandidates[normalizedId] = { ...candidate, videoId: normalizedId };
      if (!checkpoint.hydratedVideoIds.includes(normalizedId)) checkpoint.hydratedVideoIds.push(normalizedId);
      checkpoint.unavailableVideoIds = checkpoint.unavailableVideoIds.filter((videoId) => videoId !== normalizedId);
    }
    for (const requestedId of batch) {
      if (returnedIds.has(requestedId)) continue;
      const discovered = [...queryItems.values()].find((entry) => entry.item.videoId === requestedId);
      const unavailableCandidate: YouTubeCandidate = {
        ...(discovered?.item ?? { videoId: requestedId, title: requestedId }),
        videoId: requestedId,
        url: discovered?.item.url ?? `https://www.youtube.com/watch?v=${requestedId}`,
        available: false,
      };
      hydratedById.set(requestedId, unavailableCandidate);
      checkpoint.hydratedCandidates[requestedId] = unavailableCandidate;
      if (!checkpoint.unavailableVideoIds.includes(requestedId)) checkpoint.unavailableVideoIds.push(requestedId);
    }
    await saveCurationCheckpoint(stateDirectory, checkpoint);
  }

  const reportCandidates: CurationReportCandidate[] = [];
  for (const entry of queryItems.values()) {
    if (!activeTargetKeys.has(`${entry.target.canonicalExerciseSlug}::${entry.target.variationId}`)) continue;
    const hydrated = hydratedById.get(entry.item.videoId);
    if (!hydrated) continue;
    const evidence = hydrated.syndicationEvidence === "verified"
      ? "verified"
      : entry.item.syndicationEvidence ?? hydrated.syndicationEvidence ?? "unknown";
    const merged: YouTubeCandidate = {
      ...entry.item,
      ...hydrated,
      videoId: entry.item.videoId,
      title: hydrated.title || entry.item.title,
      ...(hydrated.description === undefined && entry.item.description !== undefined ? { description: entry.item.description } : {}),
      syndicated: hydrated.syndicated === undefined
        ? evidence === "search-filter"
          ? true
          : undefined
        : hydrated.syndicated,
      syndicationEvidence: evidence,
      searchSources: [...new Set([...(entry.item.searchSources ?? []), ...(hydrated.searchSources ?? [])])],
      queryKeys: [...new Set([...(entry.item.queryKeys ?? []), ...(hydrated.queryKeys ?? []), ...entry.queryKeys])],
    };
    hydratedById.set(entry.item.videoId, merged);
    checkpoint.hydratedCandidates[entry.item.videoId] = merged;
    const decision = evaluateYouTubeCandidate(merged, entry.target);
    const candidateStateKey = getYouTubeCandidateStateKey(
      entry.target.canonicalExerciseSlug,
      entry.target.variationId,
      entry.item.videoId,
    );
    checkpoint.rejectionCodes[candidateStateKey] = [...decision.rejectionCodes];
    if (!checkpoint.reviewStatus[candidateStateKey]) checkpoint.reviewStatus[candidateStateKey] = "pending";
    reportCandidates.push({
      videoId: entry.item.videoId,
      target: { canonicalExerciseSlug: entry.target.canonicalExerciseSlug, variationId: entry.target.variationId },
      queryKeys: entry.queryKeys,
      candidate: merged,
      decision,
      reviewStatus: checkpoint.reviewStatus[candidateStateKey] ?? "pending",
    });
  }

  const rankedEligibleCandidates: CurationReportCandidate[] = [];
  const proposedPairs: ProposedVideoPair[] = [];
  const completedQueryKeys = new Set(checkpoint.completedQueries.map((query) => query.queryKey));
  for (const target of targets) {
    const targetCandidates = reportCandidates.filter(
      (candidate) => candidate.target.canonicalExerciseSlug === target.canonicalExerciseSlug && candidate.target.variationId === target.variationId,
    );
    const ranked = rankEligibleCandidates(targetCandidates.map((candidate) => candidate.candidate), target);
    const byId = new Map(targetCandidates.map((candidate) => [candidate.videoId, candidate]));
    ranked.forEach((rankedCandidate, rank) => {
      const original = byId.get(rankedCandidate.candidate.videoId);
      if (original) rankedEligibleCandidates.push({ ...original, rank: rank + 1 });
    });
    const proposedPair = proposeVideoPair(target, targetCandidates.map((candidate) => candidate.candidate));
    proposedPairs.push(expectedQueryKeys(target).every((key) => completedQueryKeys.has(key))
      ? proposedPair
      : {
          ...proposedPair,
          status: "discovery-incomplete",
          reason: "discovery-incomplete",
        });
  }

  const quotaBlockedReason = searchBlockedReason ?? hydrationBlockedReason;
  const status: CurationReport["status"] = quotaBlockedReason
    ? "quota-blocked"
    : targets.length === 0
        ? "blocked"
        : "ready-for-review";
  const blockedReason = quotaBlockedReason
    ?? (targets.length === 0 ? "No curation targets were provided." : undefined);
  if (blockedReason) checkpoint.blockedReason = blockedReason;
  else delete checkpoint.blockedReason;
  const report: CurationReport = {
    generatedAt: now(),
    status,
    candidates: reportCandidates,
    rankedEligibleCandidates,
    proposedPairs,
    quota: { ...checkpoint.quota, budget },
    ...(blockedReason ? { blockedReason } : {}),
    nextPageTokens: { ...checkpoint.pageTokens },
  };
  const reportPath = await writeCurationReport(stateDirectory, report);
  await saveCurationCheckpoint(stateDirectory, checkpoint);
  return { checkpoint, report, reportPath };
}

export function rankCurationReportCandidates(
  candidates: readonly CurationReportCandidate[],
  target: YouTubeCurationTarget & Partial<RequiredVideoVariation>,
): readonly CurationReportCandidate[] {
  const targetVariationId = target.variationId;
  const scopedCandidates = candidates
    .filter((candidate) => candidate.target.canonicalExerciseSlug === target.canonicalExerciseSlug)
    .filter((candidate) => targetVariationId === undefined || candidate.target.variationId === targetVariationId);
  const eligible = rankEligibleCandidates(
    scopedCandidates.map((candidate) => candidate.candidate),
    target,
  );
  const byId = new Map(scopedCandidates.map((candidate) => [candidate.videoId, candidate]));
  return eligible.flatMap((item) => {
    const original = byId.get(item.candidate.videoId);
    return original ? [original] : [];
  });
}
