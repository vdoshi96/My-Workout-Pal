import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const MISSING_YOUTUBE_API_KEY_MESSAGE = "Missing YOUTUBE_API_KEY; refusing to run YouTube curation.";
const DEFAULT_STATE_DIRECTORY = ".local/youtube-curation";
const SEARCH_UNITS = 100;
const HYDRATE_UNITS = 1;

function optionValue(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function now() {
  return new Date().toISOString();
}

function emptyCheckpoint() {
  return {
    schemaVersion: 1,
    updatedAt: now(),
    completedQueries: [],
    pageTokens: {},
    hydratedVideoIds: [],
    hydratedCandidates: {},
    discoveredCandidates: {},
    rejectionCodes: {},
    quota: { searchRequests: 0, hydrateRequests: 0, unitsEstimated: 0 },
    reviewStatus: {},
  };
}

async function atomicWrite(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp-${process.pid}`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporaryPath, filePath);
}

async function loadCheckpoint(filePath) {
  try {
    const parsed = JSON.parse(await readFile(filePath, "utf8"));
    if (parsed?.schemaVersion !== 1) throw new Error("The YouTube curation checkpoint schema is unsupported.");
    return { ...emptyCheckpoint(), ...parsed };
  } catch (error) {
    if (error?.code === "ENOENT") return emptyCheckpoint();
    throw error;
  }
}

function queryStrings(target) {
  const movement = target.movement ?? target.exerciseName ?? "";
  const equipment = target.equipment ?? target.requiredEquipmentTerms?.join(" ") ?? "";
  const aliases = Array.isArray(target.aliases) ? target.aliases : [];
  return [...new Set([
    [movement, equipment].filter(Boolean).join(" "),
    ...aliases.map((alias) => [alias, equipment].filter(Boolean).join(" ")),
  ].map((query) => `${query} -shorts -challenge -reaction -compilation`.trim()))];
}

function queryKey(target, query, order, index) {
  return `${target.canonicalExerciseSlug}:${order}:${index}:${query}`;
}

async function youtubeRequest(resource, params, apiKey) {
  params.set("key", apiKey);
  const response = await fetch(`https://www.googleapis.com/youtube/v3/${resource}?${params.toString()}`, {
    headers: { accept: "application/json" },
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error?.message ?? "YouTube Data API request failed.");
  }
  return body;
}

async function loadTargets(targetPath) {
  if (!targetPath) return [];
  const parsed = JSON.parse(await readFile(targetPath, "utf8"));
  const targets = Array.isArray(parsed) ? parsed : parsed?.targets;
  if (!Array.isArray(targets)) throw new Error("YouTube target manifest must contain a targets array.");
  return targets.filter((target) => target && typeof target.canonicalExerciseSlug === "string" && typeof target.exerciseName === "string");
}

async function main() {
  const apiKey = process.env.YOUTUBE_API_KEY?.trim();
  if (!apiKey) {
    console.error(MISSING_YOUTUBE_API_KEY_MESSAGE);
    process.exitCode = 1;
    return;
  }

  const args = process.argv.slice(2);
  const stateDirectory = optionValue(args, "--state-dir") ?? process.env.YOUTUBE_CURATION_STATE_DIR ?? DEFAULT_STATE_DIRECTORY;
  const checkpointPath = path.join(stateDirectory, "checkpoint.json");
  const reportPath = path.join(stateDirectory, "review-report.json");
  const targets = await loadTargets(optionValue(args, "--targets") ?? process.env.YOUTUBE_CURATION_TARGETS);
  const checkpoint = await loadCheckpoint(checkpointPath);
  const discovered = new Map();
  const regionCode = process.env.YOUTUBE_REGION_CODE ?? "US";

  for (const target of targets) {
    for (const [queryIndex, query] of queryStrings(target).entries()) {
      for (const order of ["relevance", "viewCount"]) {
        const key = queryKey(target, query, order, queryIndex);
        if (checkpoint.completedQueries.some((item) => item.queryKey === key)) continue;
        let pageToken = checkpoint.pageTokens[key] ?? undefined;
        while (true) {
          const params = new URLSearchParams({
            part: "snippet",
            q: query,
            type: "video",
            order,
            videoEmbeddable: "true",
            videoSyndicated: "true",
            safeSearch: "strict",
            relevanceLanguage: "en",
            regionCode,
            videoDuration: "short",
            maxResults: "25",
          });
          if (pageToken) params.set("pageToken", pageToken);
          const response = await youtubeRequest("search", params, apiKey);
          checkpoint.quota.searchRequests += 1;
          checkpoint.quota.unitsEstimated += SEARCH_UNITS;
          checkpoint.pageTokens[key] = response.nextPageToken ?? null;
          for (const item of response.items ?? []) {
            const videoId = item?.id?.videoId;
            if (typeof videoId !== "string") continue;
            const candidateKey = `${target.canonicalExerciseSlug}:${target.variationId ?? target.equipment ?? "unassigned"}:${videoId}`;
            const previous = checkpoint.discoveredCandidates[candidateKey];
            const discoveredCandidate = {
              target,
              videoId,
              queryKeys: [...(previous?.queryKeys ?? []), key].filter((value, index, values) => values.indexOf(value) === index),
              searchItem: item.snippet ?? {},
            };
            checkpoint.discoveredCandidates[candidateKey] = discoveredCandidate;
            discovered.set(candidateKey, discoveredCandidate);
          }
          checkpoint.updatedAt = now();
          await atomicWrite(checkpointPath, checkpoint);
          if (!response.nextPageToken) {
            checkpoint.completedQueries.push({ queryKey: key, pageToken: null });
            checkpoint.updatedAt = now();
            await atomicWrite(checkpointPath, checkpoint);
            break;
          }
          pageToken = response.nextPageToken;
        }
      }
    }
  }

  for (const [candidateKey, candidate] of Object.entries(checkpoint.discoveredCandidates)) {
    discovered.set(candidateKey, candidate);
  }
  const idsToHydrate = [...discovered.values()]
    .map((item) => item.videoId)
    .filter((videoId) => !checkpoint.hydratedVideoIds.includes(videoId));
  for (let index = 0; index < idsToHydrate.length; index += 50) {
    const ids = idsToHydrate.slice(index, index + 50);
    const params = new URLSearchParams({
      part: "snippet,contentDetails,status,statistics",
      id: ids.join(","),
      regionCode,
    });
    const response = await youtubeRequest("videos", params, apiKey);
    checkpoint.quota.hydrateRequests += 1;
    checkpoint.quota.unitsEstimated += HYDRATE_UNITS;
    for (const item of response.items ?? []) {
      if (typeof item?.id !== "string") continue;
      if (!checkpoint.hydratedVideoIds.includes(item.id)) checkpoint.hydratedVideoIds.push(item.id);
      checkpoint.hydratedCandidates[item.id] = item;
    }
    checkpoint.updatedAt = now();
    await atomicWrite(checkpointPath, checkpoint);
  }

  const candidates = [...discovered.values()].map((item) => ({
    videoId: item.videoId,
    target: {
      canonicalExerciseSlug: item.target.canonicalExerciseSlug,
      variationId: item.target.variationId ?? item.target.equipment ?? "unassigned",
    },
    queryKeys: item.queryKeys,
    metadata: checkpoint.hydratedCandidates[item.videoId] ?? item.searchItem,
    mechanicalStatus: checkpoint.hydratedCandidates[item.videoId] ? "pending-mechanical-review" : "pending-hydration-review",
    reviewStatus: checkpoint.reviewStatus[item.videoId] ?? "pending",
  }));
  const report = {
    generatedAt: now(),
    status: targets.length > 0 ? "ready-for-review" : "blocked",
    candidates,
    note: targets.length > 0
      ? "Hydration metadata is a private proposal. Run mechanical checks, complete human viewing, and validate exact-two mappings before seeding."
      : "Provide a private target manifest with --targets or YOUTUBE_CURATION_TARGETS to discover candidates.",
  };
  await atomicWrite(reportPath, report);
  checkpoint.updatedAt = now();
  await atomicWrite(checkpointPath, checkpoint);
  console.log(`YouTube curation checkpoint saved to ${checkpointPath}`);
  console.log(`Private review report saved to ${reportPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "YouTube curation failed safely.");
  process.exitCode = 1;
});
