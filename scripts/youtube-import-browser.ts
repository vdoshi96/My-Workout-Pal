import process from "node:process";
import path from "node:path";

import {
  importBrowserYouTubeCandidates,
} from "../src/domain/youtube/browser-import.ts";
import {
  YOUTUBE_BROWSER_CANDIDATE_FILENAME,
} from "../src/domain/youtube/browser-discovery.ts";
import {
  createYouTubeDataApiClient,
  curateYouTubeCandidates,
  DEFAULT_YOUTUBE_CURATION_STATE_DIR,
} from "../src/domain/youtube/curation.ts";
import { buildDefaultYouTubeCurationTargets } from "../src/domain/youtube/targets.ts";

function optionValue(args: readonly string[], name: string): string | undefined {
  const index = args.indexOf(name);
  const value = index >= 0 ? args[index + 1] : undefined;
  return value && !value.startsWith("--") ? value : undefined;
}

function nonNegativeInteger(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(value)) throw new Error("youtube:import-browser hydration request limit must be a non-negative integer.");
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new Error("youtube:import-browser hydration request limit is too large.");
  return parsed;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const stateDirectory = optionValue(args, "--state-dir")
    ?? process.env["YOUTUBE_CURATION_STATE_DIR"]
    ?? DEFAULT_YOUTUBE_CURATION_STATE_DIR;
  const inputPath = optionValue(args, "--input")
    ?? path.join(stateDirectory, YOUTUBE_BROWSER_CANDIDATE_FILENAME);
  const targets = buildDefaultYouTubeCurationTargets();
  const imported = await importBrowserYouTubeCandidates({ inputPath, stateDirectory, targets });
  console.log(`Browser YouTube query runs: ${imported.summary.importedQueryRuns} imported, ${imported.summary.existingQueryRuns} already present.`);
  console.log(`Browser YouTube observations: ${imported.summary.importedObservations} imported, ${imported.summary.existingObservations} already present.`);
  console.log(`New scoped candidates: ${imported.summary.newScopedCandidates}.`);
  console.log(`Private browser import receipt saved to ${imported.receiptPath}.`);

  if (args.includes("--no-hydrate")) {
    console.log("Official metadata hydration skipped by --no-hydrate; candidates remain pending provider checks.");
    return;
  }
  const apiKey = process.env["YOUTUBE_API_KEY"]?.trim();
  if (!apiKey) {
    console.log("Official metadata hydration skipped because YOUTUBE_API_KEY is unavailable; candidates remain resumable.");
    return;
  }
  const maxHydrateRequests = nonNegativeInteger(
    optionValue(args, "--max-hydrate-requests") ?? process.env["YOUTUBE_CURATION_MAX_HYDRATE_REQUESTS"],
    10,
  );
  const result = await curateYouTubeCandidates({
    api: createYouTubeDataApiClient({ apiKey }),
    targets,
    stateDirectory,
    budget: {
      maxQuotaUnits: maxHydrateRequests,
      maxSearchRequests: 0,
      maxHydrateRequests,
      maxPagesPerQuery: 1,
    },
  });
  const pendingHydration = Object.keys(result.checkpoint.discoveredCandidates).filter((candidateKey) => {
    const videoId = candidateKey.split("::").at(-1);
    return videoId
      && !result.checkpoint.hydratedVideoIds.includes(videoId)
      && !result.checkpoint.unavailableVideoIds.includes(videoId);
  }).length;
  const browserCompleteTargets = result.report.proposedPairs?.filter(
    (pair) => pair.discoveryStatus === "browser-window-complete",
  ).length ?? 0;
  console.log(`Official hydration requests recorded: ${result.checkpoint.quota.hydrateRequests}.`);
  console.log(`Pending candidate checks: ${pendingHydration}.`);
  console.log(`Browser-window-complete targets: ${browserCompleteTargets}.`);
  console.log(`Private review report saved to ${result.reportPath}.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "youtube:import-browser failed safely.");
  process.exitCode = 1;
});
