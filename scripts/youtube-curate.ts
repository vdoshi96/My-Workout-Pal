import process from "node:process";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  curateYouTubeCandidates,
  createYouTubeDataApiClient,
  DEFAULT_YOUTUBE_CURATION_STATE_DIR,
  MISSING_YOUTUBE_API_KEY_MESSAGE,
} from "../src/domain/youtube/curation.ts";
import { buildDefaultYouTubeCurationTargets } from "../src/domain/youtube/targets.ts";
import type { CurationRunBudget, RequiredVideoVariation, YouTubeCurationTarget } from "../src/domain/youtube/types.ts";

function optionValue(args: readonly string[], name: string): string | undefined {
  const index = args.indexOf(name);
  const value = index >= 0 ? args[index + 1] : undefined;
  return value && !value.startsWith("--") ? value : undefined;
}

function positiveInteger(value: string | undefined): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : undefined;
}

function nonNegativeInteger(value: string | undefined): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

function isTarget(value: unknown): value is YouTubeCurationTarget & RequiredVideoVariation {
  if (typeof value !== "object" || value === null) return false;
  const target = value as Record<string, unknown>;
  return typeof target["canonicalExerciseSlug"] === "string"
    && typeof target["variationId"] === "string"
    && typeof target["exerciseName"] === "string";
}

async function loadTargets(targetPath: string | undefined): Promise<readonly (YouTubeCurationTarget & RequiredVideoVariation)[]> {
  if (!targetPath) return [];
  const parsed: unknown = JSON.parse(await readFile(targetPath, "utf8"));
  const targets = Array.isArray(parsed)
    ? parsed
    : typeof parsed === "object" && parsed !== null && Array.isArray((parsed as { targets?: unknown }).targets)
      ? (parsed as { targets: unknown[] }).targets
      : undefined;
  if (!targets) throw new Error("YouTube target manifest must contain a targets array.");
  const invalidIndex = targets.findIndex((target) => !isTarget(target));
  if (invalidIndex >= 0) {
    throw new Error(`YouTube target at index ${invalidIndex} must include canonicalExerciseSlug, variationId, and exerciseName.`);
  }
  return targets as readonly (YouTubeCurationTarget & RequiredVideoVariation)[];
}

function budgetFromEnvironment(args: readonly string[]): Partial<CurationRunBudget> {
  const maxQuotaUnits = nonNegativeInteger(optionValue(args, "--max-quota-units") ?? process.env["YOUTUBE_CURATION_MAX_QUOTA_UNITS"]);
  const maxSearchRequests = nonNegativeInteger(optionValue(args, "--max-search-requests") ?? process.env["YOUTUBE_CURATION_MAX_SEARCH_REQUESTS"]);
  const maxHydrateRequests = nonNegativeInteger(optionValue(args, "--max-hydrate-requests") ?? process.env["YOUTUBE_CURATION_MAX_HYDRATE_REQUESTS"]);
  const maxPagesPerQuery = nonNegativeInteger(optionValue(args, "--max-pages-per-query") ?? process.env["YOUTUBE_CURATION_MAX_PAGES_PER_QUERY"]);
  return {
    ...(maxQuotaUnits === undefined ? {} : { maxQuotaUnits }),
    ...(maxSearchRequests === undefined ? {} : { maxSearchRequests }),
    ...(maxHydrateRequests === undefined ? {} : { maxHydrateRequests }),
    ...(maxPagesPerQuery === undefined ? {} : { maxPagesPerQuery }),
  };
}

async function main(): Promise<void> {
  const apiKey = process.env["YOUTUBE_API_KEY"]?.trim();
  if (!apiKey) {
    console.error(MISSING_YOUTUBE_API_KEY_MESSAGE);
    process.exitCode = 1;
    return;
  }

  const args = process.argv.slice(2);
  const stateDirectory = optionValue(args, "--state-dir") ?? process.env["YOUTUBE_CURATION_STATE_DIR"] ?? DEFAULT_YOUTUBE_CURATION_STATE_DIR;
  const targetPath = optionValue(args, "--targets") ?? process.env["YOUTUBE_CURATION_TARGETS"];
  const targets = targetPath ? await loadTargets(targetPath) : buildDefaultYouTubeCurationTargets();
  const api = createYouTubeDataApiClient({ apiKey });
  const maxResults = positiveInteger(process.env["YOUTUBE_CURATION_MAX_RESULTS"]);
  const result = await curateYouTubeCandidates({
    api,
    targets,
    stateDirectory,
    regionCode: process.env["YOUTUBE_REGION_CODE"] ?? "US",
    ...(maxResults === undefined ? {} : { maxResults }),
    budget: budgetFromEnvironment(args),
  });
  const checkpointPath = path.join(stateDirectory, "checkpoint.json");
  console.log(`YouTube curation status: ${result.report.status}`);
  console.log(`YouTube curation checkpoint saved to ${checkpointPath}`);
  console.log(`Private review report saved to ${result.reportPath}`);
  console.log(JSON.stringify(result.report, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "YouTube curation failed safely.");
  process.exitCode = 1;
});
