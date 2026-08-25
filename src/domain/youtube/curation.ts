import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { evaluateYouTubeCandidate, rankEligibleCandidates } from "@/domain/youtube/eligibility";
import { normalizeYouTubeReference } from "@/domain/youtube/normalization";
import type {
  CurationCheckpoint,
  CurationQueryOrder,
  CurationReport,
  CurationReportCandidate,
  CurationReviewStatus,
  RequiredVideoVariation,
  YouTubeCandidate,
  YouTubeCurationTarget,
  YouTubeDataApi,
  YouTubeHydrateResponse,
  YouTubeRejectionCode,
  YouTubeSearchRequest,
  YouTubeSearchResponse,
} from "@/domain/youtube/types";

export const DEFAULT_YOUTUBE_CURATION_STATE_DIR = ".local/youtube-curation";
export const MISSING_YOUTUBE_API_KEY_MESSAGE = "Missing YOUTUBE_API_KEY; refusing to run YouTube curation.";
export const YOUTUBE_CURATION_CHECKPOINT_FILENAME = "checkpoint.json";
export const YOUTUBE_CURATION_REPORT_FILENAME = "review-report.json";
export const DEFAULT_YOUTUBE_REGION_CODE = "US";
export const DEFAULT_YOUTUBE_MAX_RESULTS = 25;
export const YOUTUBE_SEARCH_REQUEST_UNITS = 100;
export const YOUTUBE_HYDRATE_REQUEST_UNITS = 1;

type JsonRecord = Record<string, unknown> & {
  schemaVersion?: unknown;
  updatedAt?: unknown;
  completedQueries?: unknown;
  queryKey?: unknown;
  pageToken?: unknown;
  hydratedVideoIds?: unknown;
  hydratedCandidates?: unknown;
  discoveredCandidates?: unknown;
  target?: JsonRecord;
  item?: JsonRecord;
  canonicalExerciseSlug?: unknown;
  variationId?: unknown;
  exerciseName?: unknown;
  movement?: unknown;
  aliases?: unknown;
  requiredEquipmentTerms?: unknown;
  equipment?: unknown;
  queryKeys?: unknown;
  rejectionCodes?: unknown;
  pageTokens?: unknown;
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

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}

function checkpointPath(stateDirectory: string): string {
  return path.join(stateDirectory, YOUTUBE_CURATION_CHECKPOINT_FILENAME);
}

export function createEmptyCurationCheckpoint(updatedAt: string = new Date().toISOString()): CurationCheckpoint {
  return {
    schemaVersion: 1,
    updatedAt,
    completedQueries: [],
    pageTokens: {},
    hydratedVideoIds: [],
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
  if (!isRecord(input) || input.schemaVersion !== 1) {
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
    ? input.hydratedVideoIds.filter((value): value is string => typeof value === "string")
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
    for (const [candidateKey, discovered] of Object.entries(input.discoveredCandidates)) {
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
      discoveredCandidates[candidateKey] = {
        target: {
          canonicalExerciseSlug: discovered.target.canonicalExerciseSlug,
          variationId: discovered.target.variationId,
          exerciseName: discovered.target.exerciseName,
          ...(typeof discovered.target.movement === "string" ? { movement: discovered.target.movement } : {}),
          ...(Array.isArray(discovered.target.aliases) ? { aliases: discovered.target.aliases.filter((value): value is string => typeof value === "string") } : {}),
          ...(Array.isArray(discovered.target.requiredEquipmentTerms)
            ? { requiredEquipmentTerms: discovered.target.requiredEquipmentTerms.filter((value): value is string => typeof value === "string") }
            : {}),
          ...(typeof discovered.target.equipment === "string" ? { equipment: discovered.target.equipment } : {}),
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
  const reviewStatus: Record<string, CurationReviewStatus> = {};
  if (isRecord(input.reviewStatus)) {
    for (const [videoId, status] of Object.entries(input.reviewStatus)) {
      if (status === "pending" || status === "approved" || status === "rejected") reviewStatus[videoId] = status;
    }
  }
  const quota = isRecord(input.quota) ? input.quota : {};
  const numberOrZero = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : 0);

  return {
    ...empty,
    completedQueries,
    hydratedVideoIds,
    hydratedCandidates,
    discoveredCandidates,
    rejectionCodes,
    pageTokens,
    reviewStatus,
    quota: {
      searchRequests: numberOrZero(quota.searchRequests),
      hydrateRequests: numberOrZero(quota.hydrateRequests),
      unitsEstimated: numberOrZero(quota.unitsEstimated),
    },
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
  return `${target.canonicalExerciseSlug}:${order}:${index}:${query}`;
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
              syndicated: true,
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

export async function curateYouTubeCandidates(options: Readonly<{
  api: YouTubeDataApi;
  targets: readonly (YouTubeCurationTarget & RequiredVideoVariation)[];
  stateDirectory?: string;
  now?: () => string;
  maxResults?: number;
  regionCode?: string;
}>): Promise<Readonly<{ checkpoint: CurationCheckpoint; report: CurationReport; reportPath: string }>> {
  const stateDirectory = options.stateDirectory ?? DEFAULT_YOUTUBE_CURATION_STATE_DIR;
  const now = options.now ?? (() => new Date().toISOString());
  const regionCode = options.regionCode ?? DEFAULT_YOUTUBE_REGION_CODE;
  const checkpoint = await loadCurationCheckpoint(stateDirectory);
  const queryItems = new Map<string, { target: YouTubeCurationTarget & RequiredVideoVariation; queryKeys: string[]; item: YouTubeCandidate }>();
  for (const [candidateKey, discovered] of Object.entries(checkpoint.discoveredCandidates)) {
    queryItems.set(candidateKey, {
      target: discovered.target,
      queryKeys: [...discovered.queryKeys],
      item: discovered.item,
    });
  }

  for (const target of options.targets) {
    for (const [index, query] of buildCurationQueries(target).entries()) {
      for (const order of ["relevance", "viewCount"] as const) {
        const request = buildYouTubeSearchRequest(target, query, order, index, {
          regionCode,
          maxResults: options.maxResults,
          ...(checkpoint.pageTokens[queryKey(target, query, order, index)]
            ? { pageToken: checkpoint.pageTokens[queryKey(target, query, order, index)] ?? undefined }
            : {}),
        });
        if (checkpoint.completedQueries.some((completed) => completed.queryKey === request.queryKey)) continue;
        let pageToken = checkpoint.pageTokens[request.queryKey] ?? undefined;
        while (true) {
          const pageRequest = buildYouTubeSearchRequest(target, query, order, index, {
            regionCode,
            maxResults: options.maxResults,
            ...(pageToken ? { pageToken } : {}),
          });
          const response = await options.api.searchVideos(pageRequest);
          addQuota(checkpoint, response.quotaUnits ?? YOUTUBE_SEARCH_REQUEST_UNITS, 0);
          checkpoint.pageTokens[request.queryKey] = response.nextPageToken ?? null;
          for (const item of response.items) {
            let normalizedId: string;
            try {
              normalizedId = normalizeYouTubeReference(item.videoId);
            } catch {
              continue;
            }
            const key = `${target.canonicalExerciseSlug}:${target.variationId}:${normalizedId}`;
            const existing = queryItems.get(key);
            if (existing) {
              if (!existing.queryKeys.includes(request.queryKey)) existing.queryKeys.push(request.queryKey);
              const discovered = checkpoint.discoveredCandidates[key];
              if (discovered && !discovered.queryKeys.includes(request.queryKey)) {
                discovered.queryKeys.push(request.queryKey);
              }
            } else {
              const discovered = {
                target,
                queryKeys: [request.queryKey],
                item: {
                  ...item,
                  videoId: normalizedId,
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
            checkpoint.completedQueries.push({ queryKey: request.queryKey, pageToken: null });
            await saveCurationCheckpoint(stateDirectory, checkpoint);
            break;
          }
          pageToken = response.nextPageToken;
        }
      }
    }
  }

  const hydratedIds = new Set(checkpoint.hydratedVideoIds);
  const pendingIds = [...queryItems.values()]
    .map((entry) => entry.item.videoId)
    .filter((videoId) => !hydratedIds.has(videoId));
  const hydratedById = new Map<string, YouTubeCandidate>();
  for (const [videoId, candidate] of Object.entries(checkpoint.hydratedCandidates)) {
    hydratedById.set(videoId, candidate);
  }
  for (let index = 0; index < pendingIds.length; index += 50) {
    const batch = pendingIds.slice(index, index + 50);
    const response: YouTubeHydrateResponse = await options.api.hydrateVideos(batch, regionCode);
    addQuota(checkpoint, 0, response.quotaUnits ?? YOUTUBE_HYDRATE_REQUEST_UNITS);
    for (const candidate of response.items) {
      const normalizedId = normalizeYouTubeReference(candidate.videoId);
      hydratedById.set(normalizedId, { ...candidate, videoId: normalizedId });
      checkpoint.hydratedCandidates[normalizedId] = { ...candidate, videoId: normalizedId };
      if (!checkpoint.hydratedVideoIds.includes(normalizedId)) checkpoint.hydratedVideoIds.push(normalizedId);
    }
    await saveCurationCheckpoint(stateDirectory, checkpoint);
  }

  const reportCandidates: CurationReportCandidate[] = [];
  for (const entry of queryItems.values()) {
    const hydrated = hydratedById.get(entry.item.videoId);
    if (!hydrated) continue;
    const decision = evaluateYouTubeCandidate(hydrated, entry.target);
    checkpoint.rejectionCodes[entry.item.videoId] = [...decision.rejectionCodes];
    if (!checkpoint.reviewStatus[entry.item.videoId]) checkpoint.reviewStatus[entry.item.videoId] = "pending";
    reportCandidates.push({
      videoId: entry.item.videoId,
      target: { canonicalExerciseSlug: entry.target.canonicalExerciseSlug, variationId: entry.target.variationId },
      queryKeys: entry.queryKeys,
      candidate: hydrated,
      decision,
      reviewStatus: checkpoint.reviewStatus[entry.item.videoId] ?? "pending",
    });
  }

  const report: CurationReport = {
    generatedAt: now(),
    status: "ready-for-review",
    candidates: reportCandidates,
  };
  const reportPath = await writeCurationReport(stateDirectory, report);
  await saveCurationCheckpoint(stateDirectory, checkpoint);
  return { checkpoint, report, reportPath };
}

export function rankCurationReportCandidates(
  candidates: readonly CurationReportCandidate[],
  target: YouTubeCurationTarget,
): readonly CurationReportCandidate[] {
  const eligible = rankEligibleCandidates(
    candidates
      .filter((candidate) => candidate.target.canonicalExerciseSlug === target.canonicalExerciseSlug)
      .map((candidate) => candidate.candidate),
    target,
  );
  const byId = new Map(candidates.map((candidate) => [candidate.videoId, candidate]));
  return eligible.flatMap((item) => {
    const original = byId.get(item.candidate.videoId);
    return original ? [original] : [];
  });
}
