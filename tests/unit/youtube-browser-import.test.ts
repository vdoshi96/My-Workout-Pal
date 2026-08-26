import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  importBrowserYouTubeCandidates,
  loadBrowserYouTubeImportReceipt,
} from "@/domain/youtube/browser-import";
import {
  buildCurationQueries,
  curateYouTubeCandidates,
  getYouTubeCandidateStateKey,
  loadCurationCheckpoint,
  saveCurationCheckpoint,
} from "@/domain/youtube/curation";
import { recordYouTubeEmbedVerification } from "@/domain/youtube/embed-verification";
import type { YouTubeDataApi } from "@/domain/youtube/types";
import { buildDefaultYouTubeCurationTargets } from "@/domain/youtube/targets";

const target = {
  canonicalExerciseSlug: "barbell-bench-press",
  variationId: "canonical",
  exerciseName: "Barbell bench press",
  movement: "bench press",
  aliases: ["barbell chest press", "barbell bench"],
  requiredEquipmentTerms: ["barbell"],
} as const;

const requiredQueries = buildCurationQueries(target);
const firstQuery = requiredQueries[0] ?? "";

function videoId(index: number, prefix = "A"): string {
  return `${prefix}${String(index).padStart(10, "0")}`;
}

function queryRun(query: string, observedAt = "2026-08-26T20:00:00.000Z", overrides: Record<string, unknown> = {}) {
  return {
    canonicalExerciseSlug: target.canonicalExerciseSlug,
    variationId: target.variationId,
    query,
    observedAt,
    resultLimit: 15,
    resultCount: 15,
    boundedWindowComplete: true,
    standardVideoCardsOnly: true,
    provenance: "browser-rendered-search",
    ...overrides,
  };
}

function observationsFor(
  query: string,
  observedAt = "2026-08-26T20:00:00.000Z",
  prefix = "A",
  overrides: Record<string, unknown> = {},
) {
  return Array.from({ length: 15 }, (_, index) => ({
    canonicalExerciseSlug: target.canonicalExerciseSlug,
    variationId: target.variationId,
    url: `https://www.youtube.com/watch?v=${videoId(index, prefix)}`,
    title: `How to Barbell Bench Press ${index + 1}`,
    channelTitle: `Example Coach ${index + 1}`,
    durationText: "2:14",
    visibleViewText: `${index + 1}K views`,
    query,
    position: index + 1,
    discoveredAt: observedAt,
    provenance: "browser-rendered-search",
    ...(index === 0 ? overrides : {}),
  }));
}

function artifact(options: Readonly<{
  query?: string;
  observedAt?: string;
  prefix?: string;
  runOverrides?: Record<string, unknown>;
  candidateOverrides?: Record<string, unknown>;
}> = {}): Record<string, unknown> {
  const query = options.query ?? firstQuery;
  const observedAt = options.observedAt ?? "2026-08-26T20:00:00.000Z";
  return {
    schemaVersion: 2,
    queryRuns: [queryRun(query, observedAt, options.runOverrides)],
    candidates: observationsFor(query, observedAt, options.prefix, options.candidateOverrides),
  };
}

async function saveArtifact(directory: string, value: unknown): Promise<string> {
  const inputPath = path.join(directory, "browser-candidates.json");
  await writeFile(inputPath, `${JSON.stringify(value)}\n`, { mode: 0o600 });
  return inputPath;
}

function hydrated(videoIds: readonly string[]) {
  return videoIds.map((id, index) => ({
    videoId: id,
    title: `Official barbell bench press ${index + 1}`,
    description: "A concise barbell bench press tutorial.",
    channelTitle: `Official channel ${index + 1}`,
    channelId: `channel-${index + 1}`,
    duration: "PT2M14S",
    privacyStatus: "public" as const,
    uploadStatus: "processed" as const,
    embeddable: true,
    syndicated: undefined,
    syndicationEvidence: "unknown" as const,
    regionAvailable: true,
    liveBroadcastContent: "none" as const,
    language: "en",
    viewCount: 10_000 - index,
  }));
}

describe("private browser-discovered YouTube candidate import", () => {
  it("uses the exact deduplicated API query manifest for browser fallback coverage", () => {
    const backSquat = buildDefaultYouTubeCurationTargets().find(
      (candidate) => candidate.canonicalExerciseSlug === "barbell-back-squat",
    );
    if (!backSquat) throw new Error("Expected the barbell back squat target.");

    const queries = buildCurationQueries(backSquat);
    expect(queries).toHaveLength(new Set(queries).size);
    expect(queries).toHaveLength(2);
  });

  it("imports bounded scoped provenance without claiming official discovery and hydrates only through videos.list", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mwp-youtube-browser-import-"));
    let hydrateCalls = 0;
    const ids = Array.from({ length: 15 }, (_, index) => videoId(index));
    const api: YouTubeDataApi = {
      async searchVideos() {
        throw new Error("Browser import hydration must not call search.list.");
      },
      async hydrateVideos(videoIds) {
        hydrateCalls += 1;
        expect(videoIds).toEqual(ids);
        return { items: hydrated(videoIds) };
      },
    };

    try {
      const inputPath = await saveArtifact(directory, artifact());
      const imported = await importBrowserYouTubeCandidates({
        inputPath,
        stateDirectory: directory,
        targets: [target],
        now: () => "2026-08-26T20:01:00.000Z",
      });
      const key = getYouTubeCandidateStateKey(target.canonicalExerciseSlug, target.variationId, ids[0] ?? "");

      expect(imported.summary).toEqual({
        inputQueryRuns: 1,
        importedQueryRuns: 1,
        existingQueryRuns: 0,
        inputObservations: 15,
        importedObservations: 15,
        existingObservations: 0,
        newScopedCandidates: 15,
      });
      expect(imported.checkpoint.completedQueries).toEqual([]);
      expect(imported.checkpoint.quota.searchRequests).toBe(0);
      expect(imported.checkpoint.discoveredCandidates[key]).toMatchObject({
        target,
        queryKeys: [],
        item: { videoId: ids[0], title: "How to Barbell Bench Press 1", syndicationEvidence: "unknown" },
      });

      const result = await curateYouTubeCandidates({
        api,
        targets: [target],
        stateDirectory: directory,
        budget: { maxQuotaUnits: 10, maxSearchRequests: 0, maxHydrateRequests: 10, maxPagesPerQuery: 1 },
      });

      expect(hydrateCalls).toBe(1);
      expect(result.checkpoint.quota).toEqual({ searchRequests: 0, hydrateRequests: 1, unitsEstimated: 1 });
      expect(result.report.candidates[0]?.queryKeys).toEqual([]);
      expect(result.report.proposedPairs).toEqual([
        expect.objectContaining({ status: "discovery-incomplete", reason: "discovery-incomplete" }),
      ]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("is idempotent and keeps the private receipt mode restricted", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mwp-youtube-browser-idempotent-"));
    try {
      const inputPath = await saveArtifact(directory, artifact());
      await importBrowserYouTubeCandidates({ inputPath, stateDirectory: directory, targets: [target] });
      const second = await importBrowserYouTubeCandidates({ inputPath, stateDirectory: directory, targets: [target] });
      const receipt = await loadBrowserYouTubeImportReceipt(directory);

      expect(second.summary).toMatchObject({
        importedQueryRuns: 0,
        existingQueryRuns: 1,
        importedObservations: 0,
        existingObservations: 15,
        newScopedCandidates: 0,
      });
      expect(Object.values(receipt.observations)).toHaveLength(15);
      expect((await stat(second.receiptPath)).mode & 0o777).toBe(0o600);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it.each([
    ["Shorts", { candidateOverrides: { url: "https://www.youtube.com/shorts/AbCdEfGhI01" } }, /shorts/i],
    ["unknown target", { candidateOverrides: { canonicalExerciseSlug: "not-a-catalog-target" } }, /unknown target/i],
    ["unknown query", { candidateOverrides: { query: "unexpected rendered query" } }, /unknown query/i],
    ["timestamp mismatch", { candidateOverrides: { discoveredAt: "2026-08-26T20:00:01.000Z" } }, /does not match a recorded query run/i],
    ["negative position", { candidateOverrides: { position: -1 } }, /position/i],
    ["gapped positions", { candidateOverrides: { position: 2 } }, /gapped result positions/i],
    ["below-limit completion", { runOverrides: { resultCount: 8 } }, /complete bounded window of 15/i],
    ["false bounded state", { runOverrides: { boundedWindowComplete: false } }, /complete bounded window of 15/i],
  ])("rejects %s before mutating the checkpoint", async (_label, fixtureOptions, message) => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mwp-youtube-browser-invalid-"));
    try {
      const inputPath = await saveArtifact(directory, artifact(fixtureOptions));
      await expect(importBrowserYouTubeCandidates({ inputPath, stateDirectory: directory, targets: [target] }))
        .rejects.toThrow(message);
      expect((await loadCurationCheckpoint(directory)).discoveredCandidates).toEqual({});
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("rejects the original lazy 5-to-8-card shape even when it claims completion", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mwp-youtube-browser-false-window-"));
    const fixture = artifact();
    try {
      const inputPath = await saveArtifact(directory, {
        ...fixture,
        queryRuns: [queryRun(firstQuery, "2026-08-26T20:00:00.000Z", { resultCount: 8 })],
        candidates: (fixture["candidates"] as unknown[]).slice(0, 8),
      });
      await expect(importBrowserYouTubeCandidates({ inputPath, stateDirectory: directory, targets: [target] }))
        .rejects.toThrow(/complete bounded window of 15/i);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("treats only the latest run for each exact query as canonical", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mwp-youtube-browser-latest-"));
    const oldAt = "2026-08-26T20:00:00.000Z";
    const newAt = "2026-08-26T21:00:00.000Z";
    const oldIds = Array.from({ length: 15 }, (_, index) => videoId(index, "A"));
    try {
      const inputPath = await saveArtifact(directory, {
        schemaVersion: 2,
        queryRuns: [queryRun(firstQuery, oldAt), queryRun(firstQuery, newAt)],
        candidates: [...observationsFor(firstQuery, oldAt, "A"), ...observationsFor(firstQuery, newAt, "B")],
      });
      await importBrowserYouTubeCandidates({ inputPath, stateDirectory: directory, targets: [target] });
      const checkpoint = await loadCurationCheckpoint(directory);
      checkpoint.hydratedVideoIds = [...oldIds];
      for (const item of hydrated(oldIds)) checkpoint.hydratedCandidates[item.videoId] = item;
      await saveCurationCheckpoint(directory, checkpoint);

      const result = await curateYouTubeCandidates({
        api: { async searchVideos() { return { items: [] }; }, async hydrateVideos() { return { items: [] }; } },
        targets: [target],
        stateDirectory: directory,
        budget: { maxQuotaUnits: 0, maxSearchRequests: 0, maxHydrateRequests: 0, maxPagesPerQuery: 1 },
      });
      expect(result.report.proposedPairs).toEqual([
        expect.objectContaining({ status: "discovery-incomplete", reason: "discovery-incomplete" }),
      ]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("recovers checkpoint candidates from the durable receipt after a receipt-first failure", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mwp-youtube-browser-recovery-"));
    try {
      const inputPath = await saveArtifact(directory, artifact());
      await expect(importBrowserYouTubeCandidates({
        inputPath,
        stateDirectory: directory,
        targets: [target],
        persistCheckpoint: async () => { throw new Error("simulated checkpoint interruption"); },
      })).rejects.toThrow(/simulated checkpoint interruption/i);
      expect(Object.values((await loadBrowserYouTubeImportReceipt(directory)).observations)).toHaveLength(15);
      expect((await loadCurationCheckpoint(directory)).discoveredCandidates).toEqual({});

      const recovered = await importBrowserYouTubeCandidates({
        inputPath: path.join(directory, "missing-artifact.json"),
        stateDirectory: directory,
        targets: [target],
      });
      expect(recovered.summary).toMatchObject({ inputQueryRuns: 0, inputObservations: 0, newScopedCandidates: 15 });
      expect(Object.keys(recovered.checkpoint.discoveredCandidates)).toHaveLength(15);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("treats missing and whitespace-empty artifacts as no-ops without creating a receipt", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mwp-youtube-browser-empty-"));
    try {
      const missing = await importBrowserYouTubeCandidates({
        inputPath: path.join(directory, "missing.json"), stateDirectory: directory, targets: [target],
      });
      const emptyPath = path.join(directory, "empty.json");
      await writeFile(emptyPath, "  \n", { mode: 0o600 });
      const empty = await importBrowserYouTubeCandidates({ inputPath: emptyPath, stateDirectory: directory, targets: [target] });
      expect(missing.summary).toMatchObject({ inputQueryRuns: 0, inputObservations: 0, newScopedCandidates: 0 });
      expect(empty.summary).toMatchObject({ inputQueryRuns: 0, inputObservations: 0, newScopedCandidates: 0 });
      await expect(readFile(path.join(directory, "browser-imports.json"), "utf8")).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("supersedes a legacy lazy-window receipt without discarding checkpoint candidates", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mwp-youtube-browser-legacy-receipt-"));
    try {
      await writeFile(path.join(directory, "browser-imports.json"), `${JSON.stringify({
        schemaVersion: 1,
        updatedAt: "2026-08-26T19:00:00.000Z",
        queryRuns: { legacy: { complete: true, resultCount: 6 } },
        observations: { legacy: { position: 1 } },
      })}\n`, { mode: 0o600 });
      const checkpoint = await loadCurationCheckpoint(directory);
      checkpoint.discoveredCandidates["legacy::canonical::AbCdEfGhI01"] = {
        target: { canonicalExerciseSlug: "legacy", variationId: "canonical", exerciseName: "Legacy" },
        queryKeys: [],
        item: { videoId: "AbCdEfGhI01", title: "Preserved legacy candidate" },
      };
      await saveCurationCheckpoint(directory, checkpoint);
      const inputPath = await saveArtifact(directory, artifact());

      const imported = await importBrowserYouTubeCandidates({ inputPath, stateDirectory: directory, targets: [target] });
      const receipt = await loadBrowserYouTubeImportReceipt(directory);
      expect(receipt.schemaVersion).toBe(2);
      expect(Object.values(receipt.queryRuns)).toHaveLength(1);
      expect(imported.checkpoint.discoveredCandidates["legacy::canonical::AbCdEfGhI01"]).toBeDefined();
      expect(imported.summary).toMatchObject({ importedQueryRuns: 1, existingQueryRuns: 0 });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("reaches browser-window completeness only after all exact-query IDs are checked", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mwp-youtube-browser-complete-"));
    const observedAt = "2026-08-26T20:00:00.000Z";
    const ids = requiredQueries.flatMap((_, queryIndex) => (
      Array.from({ length: 15 }, (_, index) => videoId(queryIndex * 15 + index))
    ));
    const fullArtifact = {
      schemaVersion: 2,
      queryRuns: requiredQueries.map((query) => queryRun(query, observedAt)),
      candidates: requiredQueries.flatMap((query, queryIndex) => observationsFor(query, observedAt, "A").map((candidate, index) => ({
        ...candidate,
        url: `https://www.youtube.com/watch?v=${videoId(queryIndex * 15 + index)}`,
      }))),
    };
    const api: YouTubeDataApi = {
      async searchVideos() { throw new Error("Complete browser fallback must not call search.list."); },
      async hydrateVideos(videoIds) { return { items: hydrated(videoIds) }; },
    };

    try {
      const inputPath = await saveArtifact(directory, fullArtifact);
      await importBrowserYouTubeCandidates({ inputPath, stateDirectory: directory, targets: [target] });
      const result = await curateYouTubeCandidates({
        api, targets: [target], stateDirectory: directory,
        budget: { maxQuotaUnits: 10, maxSearchRequests: 0, maxHydrateRequests: 10, maxPagesPerQuery: 1 },
      });

      expect(result.checkpoint.completedQueries).toEqual([]);
      expect(result.checkpoint.quota.searchRequests).toBe(0);
      expect(result.report.status).toBe("ready-for-review");
      expect(result.report.candidates).toHaveLength(ids.length);
      expect(result.report.candidates.every((candidate) => candidate.decision.rejectionCodes.includes("not-syndicated"))).toBe(true);
      expect(result.report.proposedPairs).toEqual([
        expect.objectContaining({ status: "needs-second-candidate", discoveryStatus: "browser-window-complete" }),
      ]);

      for (const id of ids.slice(0, 2)) {
        await recordYouTubeEmbedVerification({
          stateDirectory: directory,
          verification: {
            canonicalExerciseSlug: target.canonicalExerciseSlug,
            variationId: target.variationId,
            videoId: id,
            verifier: "Primary reviewer",
            privacyEnhancedEmbedConfirmed: true,
            outsideYouTubePlaybackConfirmed: true,
            visibleControlsConfirmed: true,
            keyboardControlsConfirmed: true,
            directFallbackConfirmed: true,
          },
        });
      }
      const verified = await curateYouTubeCandidates({
        api, targets: [target], stateDirectory: directory,
        budget: { maxQuotaUnits: 0, maxSearchRequests: 0, maxHydrateRequests: 0, maxPagesPerQuery: 1 },
      });
      expect(verified.report.proposedPairs).toEqual([
        expect.objectContaining({ status: "ready-for-review", discoveryStatus: "browser-window-complete", videoIds: ids.slice(0, 2) }),
      ]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("records a hydration omission as checked unavailable without making it eligible", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mwp-youtube-browser-unavailable-"));
    try {
      const inputPath = await saveArtifact(directory, artifact());
      await importBrowserYouTubeCandidates({ inputPath, stateDirectory: directory, targets: [target] });
      const result = await curateYouTubeCandidates({
        api: { async searchVideos() { throw new Error("search.list forbidden"); }, async hydrateVideos() { return { items: [] }; } },
        targets: [target], stateDirectory: directory,
        budget: { maxQuotaUnits: 1, maxSearchRequests: 0, maxHydrateRequests: 1, maxPagesPerQuery: 1 },
      });
      expect(result.checkpoint.unavailableVideoIds).toHaveLength(15);
      expect(result.report.candidates.every((candidate) => candidate.decision.rejectionCodes.includes("video-unavailable"))).toBe(true);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("rejects conflicting copies of one browser observation before persistence", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mwp-youtube-browser-conflict-"));
    const fixture = artifact();
    const first = (fixture["candidates"] as Record<string, unknown>[])[0];
    try {
      const inputPath = await saveArtifact(directory, {
        schemaVersion: 2,
        queryRuns: fixture["queryRuns"],
        candidates: [...(fixture["candidates"] as unknown[]), { ...first, title: "Conflicting rendered title" }],
      });
      await expect(importBrowserYouTubeCandidates({ inputPath, stateDirectory: directory, targets: [target] }))
        .rejects.toThrow(/conflicting browser observation/i);
      await expect(readFile(path.join(directory, "browser-imports.json"), "utf8")).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
