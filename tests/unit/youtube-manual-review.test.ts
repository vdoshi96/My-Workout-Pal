import { mkdtemp, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  createEmptyCurationCheckpoint,
  getYouTubeCandidateStateKey,
  saveCurationCheckpoint,
} from "@/domain/youtube/curation";
import {
  loadManualYouTubeReviews,
  recordManualYouTubeReview,
} from "@/domain/youtube/manual-review";

const target = {
  canonicalExerciseSlug: "dumbbell-bench-press",
  variationId: "canonical",
  exerciseName: "Dumbbell bench press",
  requiredEquipmentTerms: ["dumbbell"],
} as const;
const videoId = "AbCdEfGhI01";

async function seedCandidate(directory: string): Promise<void> {
  const checkpoint = createEmptyCurationCheckpoint();
  const key = getYouTubeCandidateStateKey(target.canonicalExerciseSlug, target.variationId, videoId);
  checkpoint.discoveredCandidates[key] = {
    target,
    queryKeys: ["dumbbell-bench-press:canonical:relevance:0"],
    item: { videoId, title: "Dumbbell bench press tutorial" },
  };
  await saveCurationCheckpoint(directory, checkpoint);
}

describe("manual YouTube review evidence", () => {
  it("records a pending playback result without claiming unavailable visual evidence", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mwp-youtube-manual-pending-"));

    try {
      await seedCandidate(directory);
      const filePath = await recordManualYouTubeReview({
        stateDirectory: directory,
        now: () => "2026-08-26T13:19:08.000Z",
        review: {
          canonicalExerciseSlug: target.canonicalExerciseSlug,
          variationId: target.variationId,
          videoId,
          decision: "pending",
          reviewer: "Codex GPT-5.6 Sol",
          playbackCompletedAt: "2026-08-26T13:19:08.000Z",
          fullWatchConfirmed: false,
          visualReviewConfirmed: false,
          audioReviewConfirmed: false,
          exactVariation: false,
          conciseInstruction: false,
          safeInstruction: false,
          addsMaterialValue: false,
          blockerReason: "visual-evidence-unavailable",
        },
      });
      const saved = await loadManualYouTubeReviews(directory);
      const key = getYouTubeCandidateStateKey(target.canonicalExerciseSlug, target.variationId, videoId);

      expect(filePath).toBe(path.join(directory, "manual-reviews.json"));
      expect(saved.reviews[key]).toMatchObject({
        decision: "pending",
        playbackCompletedAt: "2026-08-26T13:19:08.000Z",
        fullWatchConfirmed: false,
        visualReviewConfirmed: false,
        blockerReason: "visual-evidence-unavailable",
      });
      expect((await stat(filePath)).mode & 0o777).toBe(0o600);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("refuses an approval that lacks full visual and audio review evidence", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mwp-youtube-manual-invalid-approval-"));

    try {
      await seedCandidate(directory);
      await expect(recordManualYouTubeReview({
        stateDirectory: directory,
        now: () => "2026-08-26T13:19:08.000Z",
        review: {
          canonicalExerciseSlug: target.canonicalExerciseSlug,
          variationId: target.variationId,
          videoId,
          decision: "approved",
          reviewer: "Codex GPT-5.6 Sol",
          playbackCompletedAt: "2026-08-26T13:19:08.000Z",
          fullWatchConfirmed: true,
          visualReviewConfirmed: false,
          audioReviewConfirmed: false,
          exactVariation: true,
          conciseInstruction: true,
          safeInstruction: true,
          addsMaterialValue: true,
        },
      })).rejects.toThrow(/visual and audio review/i);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("records a complete approval and prevents an implicit downgrade", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mwp-youtube-manual-approved-"));
    const approvedReview = {
      canonicalExerciseSlug: target.canonicalExerciseSlug,
      variationId: target.variationId,
      videoId,
      decision: "approved" as const,
      reviewer: "Codex GPT-5.6 Sol",
      playbackCompletedAt: "2026-08-26T13:19:08.000Z",
      fullWatchConfirmed: true,
      visualReviewConfirmed: true,
      audioReviewConfirmed: true,
      exactVariation: true,
      conciseInstruction: true,
      safeInstruction: true,
      addsMaterialValue: true,
    };

    try {
      await seedCandidate(directory);
      await recordManualYouTubeReview({
        stateDirectory: directory,
        now: () => "2026-08-26T13:20:00.000Z",
        review: approvedReview,
      });
      const saved = await loadManualYouTubeReviews(directory);
      const key = getYouTubeCandidateStateKey(target.canonicalExerciseSlug, target.variationId, videoId);
      expect(saved.reviews[key]).toMatchObject({
        ...approvedReview,
        reviewedAt: "2026-08-26T13:20:00.000Z",
      });

      await expect(recordManualYouTubeReview({
        stateDirectory: directory,
        review: {
          ...approvedReview,
          decision: "rejected",
          rejectionReason: "wrong-movement",
        },
      })).rejects.toThrow(/replace-approved/i);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("rejects unknown candidates and rejections without a stable reason", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mwp-youtube-manual-unknown-"));
    const baseReview = {
      canonicalExerciseSlug: target.canonicalExerciseSlug,
      variationId: target.variationId,
      videoId,
      decision: "rejected" as const,
      reviewer: "Codex GPT-5.6 Sol",
      fullWatchConfirmed: false,
      visualReviewConfirmed: false,
      audioReviewConfirmed: false,
      exactVariation: false,
      conciseInstruction: false,
      safeInstruction: false,
      addsMaterialValue: false,
    };

    try {
      await expect(recordManualYouTubeReview({
        stateDirectory: directory,
        review: { ...baseReview, rejectionReason: "wrong-movement" },
      })).rejects.toThrow(/unknown candidate/i);

      await seedCandidate(directory);
      await expect(recordManualYouTubeReview({
        stateDirectory: directory,
        review: baseReview,
      })).rejects.toThrow(/rejection reason/i);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
