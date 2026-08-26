import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildCurationQueries,
  buildYouTubeSearchRequest,
  createYouTubeDataApiClient,
  curateYouTubeCandidates,
  createEmptyCurationCheckpoint,
  getYouTubeCandidateStateKey,
  loadCurationCheckpoint,
  rankCurationReportCandidates,
  saveCurationCheckpoint,
  writeCurationReport,
  proposeVideoPair,
} from "@/domain/youtube/curation";
import type { YouTubeDataApi } from "@/domain/youtube/types";
import { recordYouTubeEmbedVerification } from "@/domain/youtube/embed-verification";
import { recordManualYouTubeReview } from "@/domain/youtube/manual-review";
import { assessApprovedVideoPair } from "@/domain/youtube/refresh";

describe("resumable YouTube curation state", () => {
  it("persists completed queries, hydrated IDs, rejection codes, quota, and review status", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mwp-youtube-"));

    try {
      const checkpoint = createEmptyCurationCheckpoint("2026-08-25T12:00:00.000Z");
      checkpoint.completedQueries.push({ queryKey: "dumbbell-bench-press:relevance:0", pageToken: null });
      checkpoint.hydratedVideoIds.push("AbCdEfGhI01");
      checkpoint.rejectionCodes[getYouTubeCandidateStateKey("dumbbell-bench-press", "dumbbells", "AbCdEfGhI01")] = ["duration-too-short"];
      checkpoint.quota.searchRequests = 1;
      checkpoint.quota.hydrateRequests = 1;
      checkpoint.reviewStatus[getYouTubeCandidateStateKey("dumbbell-bench-press", "dumbbells", "AbCdEfGhI01")] = "pending";

      await saveCurationCheckpoint(directory, checkpoint);
      const loaded = await loadCurationCheckpoint(directory);

      expect(loaded.completedQueries).toEqual(checkpoint.completedQueries);
      expect(loaded.hydratedVideoIds).toEqual(["AbCdEfGhI01"]);
      expect(loaded.rejectionCodes[getYouTubeCandidateStateKey("dumbbell-bench-press", "dumbbells", "AbCdEfGhI01")]).toEqual(["duration-too-short"]);
      expect(loaded.quota).toEqual({ searchRequests: 1, hydrateRequests: 1, unitsEstimated: 2 });
      expect(loaded.reviewStatus[getYouTubeCandidateStateKey("dumbbell-bench-press", "dumbbells", "AbCdEfGhI01")]).toBe("pending");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("infers one fetched page when loading a schema-two checkpoint from before durable page counts", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mwp-youtube-page-count-migration-"));

    try {
      const checkpoint = createEmptyCurationCheckpoint("2026-08-25T12:00:00.000Z");
      checkpoint.pageTokens["bench-press-query"] = "resume-token";
      const legacyCheckpoint: Record<string, unknown> = { ...checkpoint, schemaVersion: 2 };
      delete legacyCheckpoint["queryPageCounts"];
      await writeFile(
        path.join(directory, "checkpoint.json"),
        `${JSON.stringify(legacyCheckpoint)}\n`,
      );

      const loaded = await loadCurationCheckpoint(directory);
      expect(loaded.queryPageCounts).toEqual({ "bench-press-query": 1 });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("migrates schema-two quota accounting without losing resumable progress", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mwp-youtube-quota-migration-"));

    try {
      const legacyCheckpoint = {
        ...createEmptyCurationCheckpoint("2026-08-25T12:00:00.000Z"),
        schemaVersion: 2,
        completedQueries: [{ queryKey: "bench-press-query", pageToken: null }],
        quota: { searchRequests: 1, hydrateRequests: 1, unitsEstimated: 101 },
      };
      await writeFile(
        path.join(directory, "checkpoint.json"),
        `${JSON.stringify(legacyCheckpoint)}\n`,
      );

      const loaded = await loadCurationCheckpoint(directory);
      expect(loaded.schemaVersion).toBe(3);
      expect(loaded.completedQueries).toEqual([{ queryKey: "bench-press-query", pageToken: null }]);
      expect(loaded.quota).toEqual({ searchRequests: 1, hydrateRequests: 1, unitsEstimated: 2 });
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

  it("reevaluates checkpoint candidates with current exact-movement target rules", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mwp-youtube-target-rule-refresh-"));
    const videoId = "AbCdEfGhI01";
    const candidateKey = getYouTubeCandidateStateKey("dumbbell-bench-press", "canonical", videoId);
    const savedTarget = {
      canonicalExerciseSlug: "dumbbell-bench-press",
      variationId: "canonical",
      exerciseName: "Dumbbell bench press",
      movement: "bench press",
      requiredEquipmentTerms: ["dumbbell"],
    } as const;
    const currentTarget = {
      ...savedTarget,
      disallowedMovementTerms: ["decline"],
    } as const;

    try {
      const checkpoint = createEmptyCurationCheckpoint();
      checkpoint.discoveredCandidates[candidateKey] = {
        target: savedTarget,
        queryKeys: ["dumbbell-bench-press-query"],
        item: { videoId, title: "Decline Dumbbell Bench Press" },
      };
      checkpoint.hydratedVideoIds.push(videoId);
      checkpoint.hydratedCandidates[videoId] = {
        videoId,
        title: "Decline Dumbbell Bench Press",
        description: "How to perform the decline dumbbell bench press.",
        duration: "PT1M",
        privacyStatus: "public",
        uploadStatus: "processed",
        embeddable: true,
        syndicated: true,
        regionAvailable: true,
        liveBroadcastContent: "none",
        language: "en",
      };
      await saveCurationCheckpoint(directory, checkpoint);

      const result = await curateYouTubeCandidates({
        api: {
          async searchVideos() {
            throw new Error("search should be blocked by the zero request cap");
          },
          async hydrateVideos() {
            throw new Error("hydration should not repeat for a hydrated ID");
          },
        },
        targets: [currentTarget],
        stateDirectory: directory,
        budget: { maxQuotaUnits: 0, maxSearchRequests: 0, maxHydrateRequests: 0, maxPagesPerQuery: 1 },
      });

      expect(result.report.candidates[0]?.decision.rejectionCodes).toContain("wrong-movement");
      expect(result.checkpoint.discoveredCandidates[candidateKey]?.target).toMatchObject({
        disallowedMovementTerms: ["decline"],
      });
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
      expect(first.report.candidates[0]).toMatchObject({
        videoId: "AbCdEfGhI01",
        decision: { eligible: true, rejectionCodes: [] },
      });
      expect(first.report.candidates[0]?.queryKeys.length).toBe(2);
      expect(first.checkpoint.discoveredCandidates[getYouTubeCandidateStateKey("dumbbell-bench-press", "dumbbells", "AbCdEfGhI01")]).toBeDefined();
      expect(first.report.rankedEligibleCandidates).toMatchObject([
        { videoId: "AbCdEfGhI01", rank: 1 },
      ]);
      expect(first.report.proposedPairs).toMatchObject([
        {
          status: "needs-second-candidate",
          videoIds: ["AbCdEfGhI01"],
          reason: "fewer-than-two-eligible-candidates",
        },
      ]);
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

  it("persists omitted hydration IDs as unavailable report candidates and retries only after refresh", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mwp-youtube-missing-hydration-"));
    let searchCalls = 0;
    let hydrateCalls = 0;
    const api: YouTubeDataApi = {
      async searchVideos() {
        searchCalls += 1;
        return { items: [{ videoId: "AbCdEfGhI01", title: "Dumbbell bench press tutorial" }] };
      },
      async hydrateVideos() {
        hydrateCalls += 1;
        return { items: [] };
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
      expect(first.report.candidates[0]?.decision.rejectionCodes).toContain("video-unavailable");
      expect(first.checkpoint.unavailableVideoIds).toEqual(["AbCdEfGhI01"]);

      const second = await curateYouTubeCandidates({ api, targets: [target], stateDirectory: directory });
      expect(second.report.candidates).toHaveLength(1);
      expect(hydrateCalls).toBe(1);
      expect(searchCalls).toBe(2);

      const refreshed = await curateYouTubeCandidates({
        api,
        targets: [target],
        stateDirectory: directory,
        refreshUnavailable: true,
      });
      expect(refreshed.report.candidates).toHaveLength(1);
      expect(hydrateCalls).toBe(2);
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
    expect(hydrated.items[0]).toMatchObject({
      duration: "PT2M",
      viewCount: 12,
      embeddable: true,
      syndicated: undefined,
      syndicationEvidence: "unknown",
    });
  });

  it("stops before an over-budget request and preserves the next page token", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mwp-youtube-budget-"));
    let searchCalls = 0;
    let hydrateCalls = 0;
    const api: YouTubeDataApi = {
      async searchVideos() {
        searchCalls += 1;
        return {
          items: [{ videoId: "AbCdEfGhI01", title: "Dumbbell bench press tutorial" }],
          nextPageToken: "resume-token",
        };
      },
      async hydrateVideos() {
        hydrateCalls += 1;
        return { items: [] };
      },
    };

    try {
      const result = await curateYouTubeCandidates({
        api,
        targets: [
          {
            canonicalExerciseSlug: "dumbbell-bench-press",
            variationId: "dumbbells",
            exerciseName: "Dumbbell bench press",
            requiredEquipmentTerms: ["dumbbell"],
          },
        ],
        stateDirectory: directory,
        budget: {
          maxQuotaUnits: 1,
          maxSearchRequests: 1,
          maxHydrateRequests: 1,
          maxPagesPerQuery: 5,
        },
      });

      expect(searchCalls).toBe(1);
      expect(hydrateCalls).toBe(0);
      expect(result.report.status).toBe("quota-blocked");
      expect(result.report.blockedReason).toContain("quota");
      expect(Object.values(result.checkpoint.pageTokens)).toContain("resume-token");
      expect(result.checkpoint.completedQueries).toEqual([]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("hydrates discovered IDs after the search request cap stops remaining queries", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mwp-youtube-hydrate-after-search-cap-"));
    let searchCalls = 0;
    let hydrateCalls = 0;
    const api: YouTubeDataApi = {
      async searchVideos() {
        searchCalls += 1;
        return {
          items: [{ videoId: "AbCdEfGhI01", title: "Dumbbell bench press tutorial" }],
        };
      },
      async hydrateVideos(videoIds) {
        hydrateCalls += 1;
        expect(videoIds).toEqual(["AbCdEfGhI01"]);
        return {
          items: [{
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
          }],
        };
      },
    };

    try {
      const result = await curateYouTubeCandidates({
        api,
        targets: [{
          canonicalExerciseSlug: "dumbbell-bench-press",
          variationId: "dumbbells",
          exerciseName: "Dumbbell bench press",
          requiredEquipmentTerms: ["dumbbell"],
        }],
        stateDirectory: directory,
        budget: {
          maxQuotaUnits: 1_000,
          maxSearchRequests: 1,
          maxHydrateRequests: 1,
          maxPagesPerQuery: 1,
        },
      });

      expect(searchCalls).toBe(1);
      expect(hydrateCalls).toBe(1);
      expect(result.checkpoint.quota).toEqual({
        searchRequests: 1,
        hydrateRequests: 1,
        unitsEstimated: 2,
      });
      expect(result.report.candidates).toHaveLength(1);
      expect(result.report.status).toBe("quota-blocked");
      expect(result.report.blockedReason).toContain("search request");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("records provider search quota exhaustion safely and still hydrates discovered IDs", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mwp-youtube-provider-quota-"));
    let searchCalls = 0;
    let hydrateCalls = 0;
    const api: YouTubeDataApi = {
      async searchVideos() {
        searchCalls += 1;
        if (searchCalls > 1) {
          throw new Error("Quota exceeded for Search Queries for project_number:SENSITIVE_PROVIDER_PROJECT");
        }
        return { items: [{ videoId: "AbCdEfGhI01", title: "Dumbbell bench press tutorial" }] };
      },
      async hydrateVideos(videoIds) {
        hydrateCalls += 1;
        expect(videoIds).toEqual(["AbCdEfGhI01"]);
        return {
          items: [{
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
          }],
        };
      },
    };

    try {
      const result = await curateYouTubeCandidates({
        api,
        targets: [{
          canonicalExerciseSlug: "dumbbell-bench-press",
          variationId: "canonical",
          exerciseName: "Dumbbell bench press",
          movement: "bench press",
          aliases: ["db bench press"],
          requiredEquipmentTerms: ["dumbbell"],
        }],
        stateDirectory: directory,
        budget: {
          maxQuotaUnits: 10,
          maxSearchRequests: 10,
          maxHydrateRequests: 10,
          maxPagesPerQuery: 1,
        },
      });

      expect(searchCalls).toBe(2);
      expect(hydrateCalls).toBe(1);
      expect(result.report.status).toBe("quota-blocked");
      expect(result.report.blockedReason).toContain("provider search quota");
      expect(result.report.blockedReason).not.toContain("SENSITIVE_PROVIDER_PROJECT");
      expect(result.report.candidates).toHaveLength(1);
      expect(result.checkpoint.quota).toEqual({ searchRequests: 1, hydrateRequests: 1, unitsEstimated: 2 });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("does not present a provisional pair as ready when target discovery is incomplete", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mwp-youtube-incomplete-discovery-"));
    const target = {
      canonicalExerciseSlug: "dumbbell-bench-press",
      variationId: "dumbbells",
      exerciseName: "Dumbbell bench press",
      requiredEquipmentTerms: ["dumbbell"],
    } as const;
    const candidates = [
      {
        videoId: "AbCdEfGhI01",
        title: "Dumbbell bench press tutorial",
        channelId: "channel-a",
        channelTitle: "Coach A",
      },
      {
        videoId: "ZyXwVuTsR98",
        title: "Dumbbell bench press form guide",
        channelId: "channel-b",
        channelTitle: "Coach B",
      },
    ] as const;
    const hydrated = candidates.map((candidate) => ({
      ...candidate,
      description: "A concise dumbbell bench press guide.",
      duration: "PT2M",
      privacyStatus: "public" as const,
      uploadStatus: "processed" as const,
      embeddable: true,
      syndicated: true,
      regionAvailable: true,
      liveBroadcastContent: "none" as const,
      language: "en",
    }));
    const api: YouTubeDataApi = {
      async searchVideos() {
        throw new Error("Incomplete discovery test must not call the provider.");
      },
      async hydrateVideos() {
        throw new Error("Fully hydrated test state must not call the provider.");
      },
    };

    try {
      const checkpoint = createEmptyCurationCheckpoint();
      const query = buildCurationQueries(target)[0];
      if (!query) throw new Error("Expected one curation query.");
      checkpoint.completedQueries.push({
        queryKey: buildYouTubeSearchRequest(target, query, "relevance", 0).queryKey,
        pageToken: null,
      });
      for (const candidate of hydrated) {
        const key = getYouTubeCandidateStateKey(target.canonicalExerciseSlug, target.variationId, candidate.videoId);
        checkpoint.discoveredCandidates[key] = {
          target,
          queryKeys: [checkpoint.completedQueries[0]?.queryKey ?? ""],
          item: candidate,
        };
        checkpoint.hydratedVideoIds.push(candidate.videoId);
        checkpoint.hydratedCandidates[candidate.videoId] = candidate;
      }
      await saveCurationCheckpoint(directory, checkpoint);

      const result = await curateYouTubeCandidates({
        api,
        targets: [target],
        stateDirectory: directory,
        budget: { maxQuotaUnits: 0, maxSearchRequests: 0, maxHydrateRequests: 0, maxPagesPerQuery: 1 },
      });

      expect(result.report.status).toBe("quota-blocked");
      expect(result.report.proposedPairs).toEqual([
        expect.objectContaining({
          status: "discovery-incomplete",
          reason: "discovery-incomplete",
          videoIds: ["AbCdEfGhI01", "ZyXwVuTsR98"],
        }),
      ]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("excludes a watch-URL candidate proven to be Shorts and proposes only a fully approved exact pair for seeding", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mwp-youtube-reviewed-pair-"));
    const target = {
      canonicalExerciseSlug: "dumbbell-bench-press",
      variationId: "canonical",
      exerciseName: "Dumbbell bench press",
      requiredEquipmentTerms: ["dumbbell"],
    } as const;
    const candidates = [
      { videoId: "AbCdEfGhI01", channelId: "channel-a", channelTitle: "Coach A", viewCount: 300 },
      { videoId: "ZyXwVuTsR98", channelId: "channel-b", channelTitle: "Coach B", viewCount: 200 },
      { videoId: "QqRrSsTtUuV", channelId: "channel-c", channelTitle: "Coach C", viewCount: 100 },
    ].map((candidate) => ({
      ...candidate,
      title: "Dumbbell bench press tutorial",
      description: "A concise dumbbell bench press guide.",
      duration: "PT2M",
      privacyStatus: "public" as const,
      uploadStatus: "processed" as const,
      embeddable: true,
      syndicated: true,
      regionAvailable: true,
      liveBroadcastContent: "none" as const,
      language: "en",
    }));
    const api: YouTubeDataApi = {
      async searchVideos() {
        throw new Error("Complete discovery test must not call the provider.");
      },
      async hydrateVideos() {
        throw new Error("Fully hydrated test state must not call the provider.");
      },
    };

    try {
      const checkpoint = createEmptyCurationCheckpoint();
      const query = buildCurationQueries(target)[0];
      if (!query) throw new Error("Expected one curation query.");
      for (const order of ["relevance", "viewCount"] as const) {
        checkpoint.completedQueries.push({
          queryKey: buildYouTubeSearchRequest(target, query, order, 0).queryKey,
          pageToken: null,
        });
      }
      for (const candidate of candidates) {
        const key = getYouTubeCandidateStateKey(target.canonicalExerciseSlug, target.variationId, candidate.videoId);
        checkpoint.discoveredCandidates[key] = {
          target,
          queryKeys: [checkpoint.completedQueries[0]?.queryKey ?? ""],
          item: candidate,
        };
        checkpoint.hydratedVideoIds.push(candidate.videoId);
        checkpoint.hydratedCandidates[candidate.videoId] = candidate;
      }
      await saveCurationCheckpoint(directory, checkpoint);
      for (const candidate of candidates.slice(1)) {
        await recordYouTubeEmbedVerification({
          stateDirectory: directory,
          verification: {
            canonicalExerciseSlug: target.canonicalExerciseSlug,
            variationId: target.variationId,
            videoId: candidate.videoId,
            verifier: "Primary reviewer",
            privacyEnhancedEmbedConfirmed: true,
            outsideYouTubePlaybackConfirmed: true,
            visibleControlsConfirmed: true,
            keyboardControlsConfirmed: true,
            directFallbackConfirmed: true,
          },
        });
        await recordManualYouTubeReview({
          stateDirectory: directory,
          now: () => "2026-08-26T14:00:00.000Z",
          review: {
            canonicalExerciseSlug: target.canonicalExerciseSlug,
            variationId: target.variationId,
            videoId: candidate.videoId,
            decision: "approved",
            reviewer: "Primary reviewer",
            playbackCompletedAt: "2026-08-26T13:59:00.000Z",
            fullWatchConfirmed: true,
            visualReviewConfirmed: true,
            instructionEvidence: "captions",
            exactVariation: true,
            conciseInstruction: true,
            safeInstruction: true,
            addsMaterialValue: true,
          },
        });
      }

      const pendingResult = await curateYouTubeCandidates({
        api,
        targets: [target],
        stateDirectory: directory,
        budget: { maxQuotaUnits: 0, maxSearchRequests: 0, maxHydrateRequests: 0, maxPagesPerQuery: 1 },
      });
      expect(pendingResult.report.proposedPairs).toEqual([
        expect.objectContaining({
          status: "ready-for-review",
          videoIds: ["AbCdEfGhI01", "ZyXwVuTsR98"],
        }),
      ]);

      await recordManualYouTubeReview({
        stateDirectory: directory,
        review: {
          canonicalExerciseSlug: target.canonicalExerciseSlug,
          variationId: target.variationId,
          videoId: candidates[0]?.videoId ?? "",
          decision: "rejected",
          reviewer: "Primary reviewer",
          fullWatchConfirmed: false,
          visualReviewConfirmed: true,
          exactVariation: false,
          conciseInstruction: true,
          safeInstruction: true,
          addsMaterialValue: false,
          rejectionReason: "shorts-content",
        },
      });

      await writeFile(path.join(directory, "embed-verifications.json"), `${JSON.stringify({
        schemaVersion: 1,
        updatedAt: "2026-08-26T14:01:00.000Z",
        verifications: {},
      })}\n`);
      const missingEmbedResult = await curateYouTubeCandidates({
        api,
        targets: [target],
        stateDirectory: directory,
        budget: { maxQuotaUnits: 0, maxSearchRequests: 0, maxHydrateRequests: 0, maxPagesPerQuery: 1 },
      });
      expect(missingEmbedResult.report.proposedPairs).toEqual([
        expect.objectContaining({
          status: "ready-for-review",
          videoIds: ["ZyXwVuTsR98", "QqRrSsTtUuV"],
        }),
      ]);
      for (const candidate of candidates.slice(1)) {
        await recordYouTubeEmbedVerification({
          stateDirectory: directory,
          verification: {
            canonicalExerciseSlug: target.canonicalExerciseSlug,
            variationId: target.variationId,
            videoId: candidate.videoId,
            verifier: "Primary reviewer",
            privacyEnhancedEmbedConfirmed: true,
            outsideYouTubePlaybackConfirmed: true,
            visibleControlsConfirmed: true,
            keyboardControlsConfirmed: true,
            directFallbackConfirmed: true,
          },
        });
      }

      const result = await curateYouTubeCandidates({
        api,
        targets: [target],
        stateDirectory: directory,
        budget: { maxQuotaUnits: 0, maxSearchRequests: 0, maxHydrateRequests: 0, maxPagesPerQuery: 1 },
      });

      expect(result.report.proposedPairs).toEqual([
        expect.objectContaining({
          status: "approved-for-seed",
          videoIds: ["ZyXwVuTsR98", "QqRrSsTtUuV"],
        }),
      ]);
      expect(result.report.candidates.map((candidate) => [candidate.videoId, candidate.reviewStatus])).toEqual([
        ["AbCdEfGhI01", "rejected"],
        ["ZyXwVuTsR98", "approved"],
        ["QqRrSsTtUuV", "approved"],
      ]);
      expect(result.report.rankedEligibleCandidates?.map((candidate) => candidate.videoId)).toEqual([
        "ZyXwVuTsR98",
        "QqRrSsTtUuV",
      ]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("treats the per-query page limit as a durable cap across resumes", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mwp-youtube-page-cap-"));
    let searchCalls = 0;
    const api: YouTubeDataApi = {
      async searchVideos() {
        searchCalls += 1;
        return {
          items: [{ videoId: "AbCdEfGhI01", title: "Dumbbell bench press tutorial" }],
          nextPageToken: "another-page",
        };
      },
      async hydrateVideos() {
        return {
          items: [{
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
          }],
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
      const first = await curateYouTubeCandidates({
        api,
        targets: [target],
        stateDirectory: directory,
        budget: { maxQuotaUnits: 1_000, maxSearchRequests: 10, maxHydrateRequests: 10, maxPagesPerQuery: 1 },
      });
      expect(searchCalls).toBe(2);
      expect(first.report.status).toBe("ready-for-review");

      const second = await curateYouTubeCandidates({
        api,
        targets: [target],
        stateDirectory: directory,
        budget: { maxQuotaUnits: 1_000, maxSearchRequests: 10, maxHydrateRequests: 10, maxPagesPerQuery: 1 },
      });
      expect(searchCalls).toBe(2);
      expect(second.report.status).toBe("ready-for-review");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("deduplicates repeated targets and hydrates a shared video ID only once", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mwp-youtube-target-dedupe-"));
    let searchCalls = 0;
    let hydrateCalls = 0;
    const api: YouTubeDataApi = {
      async searchVideos() {
        searchCalls += 1;
        return { items: [{ videoId: "AbCdEfGhI01", title: "Dumbbell bench press tutorial" }] };
      },
      async hydrateVideos(videoIds) {
        hydrateCalls += 1;
        expect(videoIds).toEqual(["AbCdEfGhI01"]);
        return {
          items: [{
            videoId: "AbCdEfGhI01",
            title: "Dumbbell bench press tutorial",
            duration: "PT2M",
            privacyStatus: "public",
            uploadStatus: "processed",
            embeddable: true,
            syndicated: true,
            regionAvailable: true,
            liveBroadcastContent: "none",
            language: "en",
          }],
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
      const result = await curateYouTubeCandidates({
        api,
        targets: [target, target],
        stateDirectory: directory,
      });

      expect(searchCalls).toBe(2);
      expect(hydrateCalls).toBe(1);
      expect(result.report.candidates).toHaveLength(1);
      expect(result.report.proposedPairs).toHaveLength(1);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("keeps review and rejection state scoped when a video appears under two variations", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mwp-youtube-state-scope-"));
    const api: YouTubeDataApi = {
      async searchVideos() {
        return { items: [{ videoId: "AbCdEfGhI01", title: "Dumbbell bench press tutorial" }] };
      },
      async hydrateVideos() {
        return {
          items: [{
            videoId: "AbCdEfGhI01",
            title: "Dumbbell bench press tutorial",
            duration: "PT2M",
            privacyStatus: "public",
            uploadStatus: "processed",
            embeddable: true,
            syndicated: true,
            regionAvailable: true,
            liveBroadcastContent: "none",
            language: "en",
          }],
        };
      },
    };
    const targets = [
      {
        canonicalExerciseSlug: "dumbbell-bench-press",
        variationId: "dumbbells",
        exerciseName: "Dumbbell bench press",
        requiredEquipmentTerms: ["dumbbell"],
      },
      {
        canonicalExerciseSlug: "barbell-bent-over-row",
        variationId: "barbell",
        exerciseName: "Barbell bent-over row",
        requiredEquipmentTerms: ["barbell"],
      },
    ] as const;

    try {
      const result = await curateYouTubeCandidates({ api, targets, stateDirectory: directory });
      const firstKey = getYouTubeCandidateStateKey(targets[0].canonicalExerciseSlug, targets[0].variationId, "AbCdEfGhI01");
      const secondKey = getYouTubeCandidateStateKey(targets[1].canonicalExerciseSlug, targets[1].variationId, "AbCdEfGhI01");

      expect(result.report.candidates).toHaveLength(2);
      expect(result.checkpoint.rejectionCodes[firstKey]).toEqual([]);
      expect(result.checkpoint.rejectionCodes[secondKey]).toContain("wrong-movement");
      expect(result.checkpoint.reviewStatus[firstKey]).toBe("pending");
      expect(result.checkpoint.reviewStatus[secondKey]).toBe("pending");
      expect(result.checkpoint.rejectionCodes["AbCdEfGhI01"]).toBeUndefined();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("rejects incompatible schema-one checkpoints instead of reusing unscoped state", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mwp-youtube-schema-"));

    try {
      await writeFile(
        path.join(directory, "checkpoint.json"),
        `${JSON.stringify({ ...createEmptyCurationCheckpoint(), schemaVersion: 1 })}\n`,
      );

      await expect(loadCurationCheckpoint(directory)).rejects.toThrow("incompatible");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("proposes a distinct-channel second candidate and flags redundant seconds", () => {
    const base = {
      title: "Dumbbell bench press tutorial",
      description: "A concise dumbbell bench press guide.",
      duration: "PT2M",
      privacyStatus: "public" as const,
      uploadStatus: "processed" as const,
      embeddable: true,
      syndicated: true,
      regionAvailable: true,
      liveBroadcastContent: "none" as const,
      language: "en",
    };
    const target = {
      canonicalExerciseSlug: "dumbbell-bench-press",
      variationId: "dumbbells",
      exerciseName: "Dumbbell bench press",
      requiredEquipmentTerms: ["dumbbell"],
    } as const;
    const distinct = proposeVideoPair(
      target,
      [
        { ...base, videoId: "AbCdEfGhI01", channelId: "channel-a", viewCount: 100 },
        { ...base, videoId: "ZyXwVuTsR98", channelId: "channel-a", viewCount: 90 },
        { ...base, videoId: "QqRrSsTtUuV", channelId: "channel-b", viewCount: 80 },
      ],
    );
    expect(distinct).toMatchObject({ status: "ready-for-review", videoIds: ["AbCdEfGhI01", "QqRrSsTtUuV"], distinctChannels: true });

    const redundant = proposeVideoPair(target, [
      { ...base, videoId: "AbCdEfGhI01", channelId: "channel-a", materialFingerprint: "same-material" },
      { ...base, videoId: "ZyXwVuTsR98", channelId: "channel-a", materialFingerprint: "same-material" },
    ]);
    expect(redundant).toMatchObject({ status: "needs-second-candidate", reason: "materially-redundant-second" });
  });

  it("scopes report ranking to the requested variation when one is supplied", () => {
    const target = {
      canonicalExerciseSlug: "shared-exercise",
      variationId: "dumbbells",
      exerciseName: "Dumbbell bench press",
      requiredEquipmentTerms: ["dumbbell"],
    } as const;
    const candidate = {
      videoId: "AbCdEfGhI01",
      title: "Dumbbell bench press tutorial",
      duration: "PT2M",
      privacyStatus: "public" as const,
      uploadStatus: "processed" as const,
      embeddable: true,
      syndicated: true,
      regionAvailable: true,
      liveBroadcastContent: "none" as const,
      language: "en",
    };
    const rows = [
      {
        videoId: candidate.videoId,
        target: { canonicalExerciseSlug: "shared-exercise", variationId: "dumbbells" },
        queryKeys: ["dumbbells"],
        candidate,
        decision: { eligible: true, rejectionCodes: [], durationSeconds: 120, relevanceScore: 15, normalizedVideoId: candidate.videoId },
        reviewStatus: "pending" as const,
      },
      {
        ...candidate,
        videoId: "ZyXwVuTsR98",
        title: "Dumbbell bench press tutorial",
        target: { canonicalExerciseSlug: "shared-exercise", variationId: "barbell" },
        queryKeys: ["barbell"],
        candidate: { ...candidate, videoId: "ZyXwVuTsR98" },
        decision: { eligible: true, rejectionCodes: [], durationSeconds: 120, relevanceScore: 15, normalizedVideoId: "ZyXwVuTsR98" },
        reviewStatus: "pending" as const,
      },
    ];

    expect(rankCurationReportCandidates(rows, target).map((row) => row.target.variationId)).toEqual(["dumbbells"]);
  });

  it("assesses existing pairs without mutating them and retains an available fallback", () => {
    const assessment = assessApprovedVideoPair(
      [
        { videoId: "AbCdEfGhI01", displayOrder: 1 },
        { videoId: "ZyXwVuTsR98", displayOrder: 2 },
      ],
      new Map([
        ["AbCdEfGhI01", {
          videoId: "AbCdEfGhI01",
          title: "Dumbbell bench press",
          privacyStatus: "public",
          uploadStatus: "processed",
          embeddable: true,
          syndicated: true,
          syndicationEvidence: "search-filter",
          regionAvailable: true,
        }],
        ["ZyXwVuTsR98", {
          videoId: "ZyXwVuTsR98",
          title: "Dumbbell bench press",
          privacyStatus: "private",
          uploadStatus: "processed",
          embeddable: true,
          syndicated: true,
          syndicationEvidence: "search-filter",
          regionAvailable: true,
        }],
      ]),
    );

    expect(assessment).toMatchObject({
      replacementRequired: true,
      fallbackVideoId: "AbCdEfGhI01",
      proposal: { action: "replacement-required" },
    });
    expect(assessment.videos).toEqual([
      { videoId: "AbCdEfGhI01", displayOrder: 1, status: "available", available: true },
      { videoId: "ZyXwVuTsR98", displayOrder: 2, status: "private", available: false },
    ]);
  });
});
