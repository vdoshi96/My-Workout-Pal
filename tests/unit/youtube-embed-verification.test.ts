import { mkdtemp, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  createEmptyCurationCheckpoint,
  getYouTubeCandidateStateKey,
  loadCurationCheckpoint,
  saveCurationCheckpoint,
} from "@/domain/youtube/curation";
import {
  loadYouTubeEmbedVerifications,
  recordYouTubeEmbedVerification,
} from "@/domain/youtube/embed-verification";

const target = {
  canonicalExerciseSlug: "barbell-bench-press",
  variationId: "canonical",
  exerciseName: "Barbell bench press",
} as const;
const videoId = "AbCdEfGhI01";

async function seedHydratedCandidate(directory: string): Promise<void> {
  const checkpoint = createEmptyCurationCheckpoint();
  const key = getYouTubeCandidateStateKey(target.canonicalExerciseSlug, target.variationId, videoId);
  checkpoint.discoveredCandidates[key] = {
    target,
    queryKeys: [],
    item: { videoId, title: "Barbell bench press tutorial", syndicationEvidence: "unknown" },
  };
  checkpoint.hydratedVideoIds.push(videoId);
  checkpoint.hydratedCandidates[videoId] = {
    videoId,
    title: "Barbell bench press tutorial",
    duration: "PT2M",
    privacyStatus: "public",
    uploadStatus: "processed",
    embeddable: true,
    syndicated: undefined,
    syndicationEvidence: "unknown",
    regionAvailable: true,
    liveBroadcastContent: "none",
    language: "en",
  };
  await saveCurationCheckpoint(directory, checkpoint);
}

function validVerification() {
  return {
    canonicalExerciseSlug: target.canonicalExerciseSlug,
    variationId: target.variationId,
    videoId,
    verifier: "Primary reviewer",
    privacyEnhancedEmbedConfirmed: true,
    outsideYouTubePlaybackConfirmed: true,
    visibleControlsConfirmed: true,
    keyboardControlsConfirmed: true,
    directFallbackConfirmed: true,
  } as const;
}

describe("outside-YouTube embed verification evidence", () => {
  it("records complete scoped evidence in a private mode-0600 file", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mwp-youtube-embed-verified-"));

    try {
      await seedHydratedCandidate(directory);
      const filePath = await recordYouTubeEmbedVerification({
        stateDirectory: directory,
        now: () => "2026-08-26T20:30:00.000Z",
        verification: validVerification(),
      });
      const saved = await loadYouTubeEmbedVerifications(directory);
      const key = getYouTubeCandidateStateKey(target.canonicalExerciseSlug, target.variationId, videoId);

      expect(saved.verifications[key]).toMatchObject({
        ...validVerification(),
        verifiedAt: "2026-08-26T20:30:00.000Z",
      });
      expect((await stat(filePath)).mode & 0o777).toBe(0o600);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("refuses incomplete evidence, an unknown scope, and an unhydrated candidate", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mwp-youtube-embed-invalid-"));

    try {
      await seedHydratedCandidate(directory);
      await expect(recordYouTubeEmbedVerification({
        stateDirectory: directory,
        verification: { ...validVerification(), outsideYouTubePlaybackConfirmed: false },
      })).rejects.toThrow(/every embed verification check/i);
      await expect(recordYouTubeEmbedVerification({
        stateDirectory: directory,
        verification: { ...validVerification(), variationId: "another-variation" },
      })).rejects.toThrow(/unknown candidate/i);

      const emptyDirectory = await mkdtemp(path.join(os.tmpdir(), "mwp-youtube-embed-unhydrated-"));
      try {
        const checkpoint = createEmptyCurationCheckpoint();
        const key = getYouTubeCandidateStateKey(target.canonicalExerciseSlug, target.variationId, videoId);
        checkpoint.discoveredCandidates[key] = {
          target,
          queryKeys: [],
          item: { videoId, title: "Barbell bench press tutorial" },
        };
        await saveCurationCheckpoint(emptyDirectory, checkpoint);
        await expect(recordYouTubeEmbedVerification({
          stateDirectory: emptyDirectory,
          verification: validVerification(),
        })).rejects.toThrow(/hydrated candidate/i);
      } finally {
        await rm(emptyDirectory, { recursive: true, force: true });
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("keeps verification isolated when one video ID is discovered under two variations", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mwp-youtube-embed-scope-"));
    try {
      await seedHydratedCandidate(directory);
      const checkpoint = createEmptyCurationCheckpoint();
      const secondTarget = {
        canonicalExerciseSlug: target.canonicalExerciseSlug,
        variationId: "dumbbells",
        exerciseName: target.exerciseName,
      };
      const firstKey = getYouTubeCandidateStateKey(target.canonicalExerciseSlug, target.variationId, videoId);
      const secondKey = getYouTubeCandidateStateKey(secondTarget.canonicalExerciseSlug, secondTarget.variationId, videoId);
      const current = await loadCurationCheckpoint(directory);
      checkpoint.discoveredCandidates[firstKey] = current.discoveredCandidates[firstKey]!;
      checkpoint.discoveredCandidates[secondKey] = {
        target: secondTarget,
        queryKeys: [],
        item: current.discoveredCandidates[firstKey]!.item,
      };
      checkpoint.hydratedVideoIds.push(videoId);
      checkpoint.hydratedCandidates[videoId] = current.hydratedCandidates[videoId]!;
      await saveCurationCheckpoint(directory, checkpoint);

      await recordYouTubeEmbedVerification({ stateDirectory: directory, verification: validVerification() });
      const evidence = await loadYouTubeEmbedVerifications(directory);
      expect(evidence.verifications[firstKey]).toBeDefined();
      expect(evidence.verifications[secondKey]).toBeUndefined();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
