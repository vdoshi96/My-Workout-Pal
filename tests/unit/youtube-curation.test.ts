import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildYouTubeSearchRequest,
  createYouTubeDataApiClient,
  curateYouTubeCandidates,
  createEmptyCurationCheckpoint,
  loadCurationCheckpoint,
  saveCurationCheckpoint,
  writeCurationReport,
} from "@/domain/youtube/curation";
import type { YouTubeDataApi } from "@/domain/youtube/types";

describe("resumable YouTube curation state", () => {
  it("persists completed queries, hydrated IDs, rejection codes, quota, and review status", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mwp-youtube-"));

    try {
      const checkpoint = createEmptyCurationCheckpoint("2026-08-25T12:00:00.000Z");
      checkpoint.completedQueries.push({ queryKey: "dumbbell-bench-press:relevance:0", pageToken: null });
      checkpoint.hydratedVideoIds.push("AbCdEfGhI01");
      checkpoint.rejectionCodes["AbCdEfGhI01"] = ["duration-too-short"];
      checkpoint.quota.searchRequests = 1;
      checkpoint.quota.hydrateRequests = 1;
      checkpoint.reviewStatus["AbCdEfGhI01"] = "pending";

      await saveCurationCheckpoint(directory, checkpoint);
      const loaded = await loadCurationCheckpoint(directory);

      expect(loaded.completedQueries).toEqual(checkpoint.completedQueries);
      expect(loaded.hydratedVideoIds).toEqual(["AbCdEfGhI01"]);
      expect(loaded.rejectionCodes["AbCdEfGhI01"]).toEqual(["duration-too-short"]);
      expect(loaded.quota).toEqual({ searchRequests: 1, hydrateRequests: 1, unitsEstimated: 101 });
      expect(loaded.reviewStatus["AbCdEfGhI01"]).toBe("pending");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("writes a report without secrets and keeps it under the local state directory", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mwp-youtube-report-"));

    try {
      const reportPath = await writeCurationReport(directory, {
        generatedAt: "2026-08-25T12:00:00.000Z",
        status: "ready-for-review",
        candidates: [],
      });
      const report = await readFile(reportPath, "utf8");

      expect(reportPath).toBe(path.join(directory, "review-report.json"));
      expect(report).not.toContain("YOUTUBE_API_KEY");
      expect(JSON.parse(report)).toMatchObject({ status: "ready-for-review", candidates: [] });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("builds both hard-gated API search sources without using search order as approval", () => {
    const request = buildYouTubeSearchRequest(
      {
        canonicalExerciseSlug: "dumbbell-bench-press",
        exerciseName: "Dumbbell bench press",
        requiredEquipmentTerms: ["dumbbell"],
      },
      "dumbbell bench press",
      "viewCount",
      0,
      { regionCode: "US", pageToken: "next-page" },
    );

    expect(request).toMatchObject({ query: "dumbbell bench press", order: "viewCount", pageToken: "next-page" });
  });

  it("resumes completed search and hydration work from the local checkpoint", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mwp-youtube-resume-"));
    let searchCalls = 0;
    let hydrateCalls = 0;
    const api: YouTubeDataApi = {
      async searchVideos() {
        searchCalls += 1;
        return { items: [{ videoId: "AbCdEfGhI01", title: "Dumbbell bench press tutorial" }] };
      },
      async hydrateVideos() {
        hydrateCalls += 1;
        return {
          items: [
            {
              videoId: "AbCdEfGhI01",
              title: "Dumbbell bench press tutorial",
              description: "A concise dumbbell bench press guide.",
              duration: "PT2M",
              privacyStatus: "public",
              uploadStatus: "processed",
              embeddable: true,
              syndicated: true,
              regionAvailable: true,
              liveBroadcastContent: "none",
              language: "en",
            },
          ],
        };
      },
    };
    const target = {
      canonicalExerciseSlug: "dumbbell-bench-press",
      variationId: "dumbbells",
      exerciseName: "Dumbbell bench press",
      requiredEquipmentTerms: ["dumbbell"],
    } as const;

    try {
      const first = await curateYouTubeCandidates({ api, targets: [target], stateDirectory: directory });
      expect(first.report.candidates).toHaveLength(1);
      expect(searchCalls).toBe(2);
      expect(hydrateCalls).toBe(1);

      const second = await curateYouTubeCandidates({ api, targets: [target], stateDirectory: directory });
      expect(second.report.candidates).toHaveLength(1);
      expect(searchCalls).toBe(2);
      expect(hydrateCalls).toBe(1);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("hydrates API metadata through an injected fetch implementation", async () => {
    const requests: string[] = [];
    const client = createYouTubeDataApiClient({
      apiKey: "test-key",
      fetchImpl: async (input) => {
        requests.push(String(input));
        const url = String(input);
        const body = url.includes("/search?")
          ? { items: [{ id: { videoId: "AbCdEfGhI01" }, snippet: { title: "Dumbbell bench press" } }] }
          : {
              items: [
                {
                  id: "AbCdEfGhI01",
                  snippet: { title: "Dumbbell bench press", liveBroadcastContent: "none", defaultLanguage: "en" },
                  contentDetails: { duration: "PT2M" },
                  status: { privacyStatus: "public", uploadStatus: "processed", embeddable: true },
                  statistics: { viewCount: "12" },
                },
              ],
            };
        return new Response(JSON.stringify(body), { status: 200 });
      },
    });

    await client.searchVideos({ queryKey: "fixture", query: "bench press", order: "relevance" });
    const hydrated = await client.hydrateVideos(["AbCdEfGhI01"]);

    expect(new URL(requests[0]!).searchParams.get("safeSearch")).toBe("strict");
    expect(new URL(requests[0]!).searchParams.get("videoEmbeddable")).toBe("true");
    expect(new URL(requests[0]!).searchParams.get("videoSyndicated")).toBe("true");
    expect(new URL(requests[1]!).searchParams.get("part")).toBe("snippet,contentDetails,status,statistics");
    expect(hydrated.items[0]).toMatchObject({ duration: "PT2M", viewCount: 12, embeddable: true });
  });
});
