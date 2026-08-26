import { mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  createEmptyCurationCheckpoint,
  getYouTubeCandidateStateKey,
  saveCurationCheckpoint,
} from "@/domain/youtube/curation";
import { recordYouTubeEmbedVerification } from "@/domain/youtube/embed-verification";
import {
  loadManualYouTubeReviews,
  recordManualYouTubeReview,
} from "@/domain/youtube/manual-review";
import type { ManualYouTubeInstructionEvidence } from "@/domain/youtube/types";

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
  const item = {
    videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    title: "Dumbbell bench press tutorial",
    duration: "PT2M",
    privacyStatus: "public" as const,
    uploadStatus: "processed" as const,
    embeddable: true,
    regionAvailable: true,
    liveBroadcastContent: "none" as const,
  };
  checkpoint.discoveredCandidates[key] = {
    target,
    queryKeys: ["dumbbell-bench-press:canonical:relevance:0"],
    item,
  };
  checkpoint.hydratedVideoIds.push(videoId);
  checkpoint.hydratedCandidates[videoId] = item;
  await saveCurationCheckpoint(directory, checkpoint);
}

async function recordEmbed(directory: string): Promise<void> {
  await recordYouTubeEmbedVerification({
    stateDirectory: directory,
    verification: {
      canonicalExerciseSlug: target.canonicalExerciseSlug,
      variationId: target.variationId,
      videoId,
      verifier: "Codex GPT-5.6 Sol",
      privacyEnhancedEmbedConfirmed: true,
      outsideYouTubePlaybackConfirmed: true,
      visibleControlsConfirmed: true,
      keyboardControlsConfirmed: true,
      directFallbackConfirmed: true,
    },
  });
}

function approvedReview(instructionEvidence: ManualYouTubeInstructionEvidence) {
  return {
    canonicalExerciseSlug: target.canonicalExerciseSlug,
    variationId: target.variationId,
    videoId,
    decision: "approved" as const,
    reviewer: "Codex GPT-5.6 Sol",
    playbackCompletedAt: "2026-08-26T13:19:08.000Z",
    fullWatchConfirmed: true,
    visualReviewConfirmed: true,
    instructionEvidence,
    exactVariation: true,
    conciseInstruction: true,
    safeInstruction: true,
    addsMaterialValue: true,
  };
}

describe("manual YouTube review evidence", () => {
  it("records a pending playback result without inventing instruction evidence", async () => {
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
          exactVariation: false,
          conciseInstruction: false,
          safeInstruction: false,
          addsMaterialValue: false,
          blockerReason: "visual-evidence-unavailable",
        },
      });
      const saved = await loadManualYouTubeReviews(directory);
      const key = getYouTubeCandidateStateKey(target.canonicalExerciseSlug, target.variationId, videoId);

      expect(saved.schemaVersion).toBe(2);
      expect(saved.reviews[key]).toMatchObject({
        decision: "pending",
        fullWatchConfirmed: false,
        visualReviewConfirmed: false,
        blockerReason: "visual-evidence-unavailable",
      });
      expect(saved.reviews[key]?.instructionEvidence).toBeUndefined();
      expect((await stat(filePath)).mode & 0o777).toBe(0o600);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it.each(["narration", "captions", "visual"] as const)(
    "accepts truthful %s instruction evidence after full visual playback and scoped embed verification",
    async (instructionEvidence) => {
      const directory = await mkdtemp(path.join(os.tmpdir(), `mwp-youtube-manual-${instructionEvidence}-`));
      try {
        await seedCandidate(directory);
        await recordEmbed(directory);
        await recordManualYouTubeReview({
          stateDirectory: directory,
          now: () => "2026-08-26T13:20:00.000Z",
          review: approvedReview(instructionEvidence),
        });
        const saved = await loadManualYouTubeReviews(directory);
        const key = getYouTubeCandidateStateKey(target.canonicalExerciseSlug, target.variationId, videoId);
        expect(saved.reviews[key]).toMatchObject({
          decision: "approved",
          instructionEvidence,
          fullWatchConfirmed: true,
          visualReviewConfirmed: true,
        });
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    },
  );

  it("refuses approval without a truthful instruction basis or full visual review", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mwp-youtube-manual-invalid-approval-"));
    try {
      await seedCandidate(directory);
      await recordEmbed(directory);
      const review = approvedReview("captions");
      await expect(recordManualYouTubeReview({
        stateDirectory: directory,
        review: { ...review, instructionEvidence: undefined },
      })).rejects.toThrow(/narration, captions, or visual instruction evidence/i);
      await expect(recordManualYouTubeReview({
        stateDirectory: directory,
        review: { ...review, visualReviewConfirmed: false },
      })).rejects.toThrow(/full visual review/i);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("refuses an otherwise complete approval without scoped embed verification", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mwp-youtube-manual-no-embed-"));
    try {
      await seedCandidate(directory);
      await expect(recordManualYouTubeReview({
        stateDirectory: directory,
        review: approvedReview("captions"),
      })).rejects.toThrow(/scoped outside-YouTube embed verification/i);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("keeps a standard-watch candidate proven to open the Shorts player permanently rejected", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mwp-youtube-manual-shorts-"));
    try {
      await seedCandidate(directory);
      await recordEmbed(directory);
      await recordManualYouTubeReview({
        stateDirectory: directory,
        review: {
          canonicalExerciseSlug: target.canonicalExerciseSlug,
          variationId: target.variationId,
          videoId,
          decision: "rejected",
          reviewer: "Codex GPT-5.6 Sol",
          fullWatchConfirmed: true,
          visualReviewConfirmed: true,
          exactVariation: true,
          conciseInstruction: true,
          safeInstruction: true,
          addsMaterialValue: false,
          rejectionReason: "shorts-content",
        },
      });
      const key = getYouTubeCandidateStateKey(target.canonicalExerciseSlug, target.variationId, videoId);
      expect((await loadManualYouTubeReviews(directory)).reviews[key]).toMatchObject({
        decision: "rejected",
        rejectionReason: "shorts-content",
      });
      await expect(recordManualYouTubeReview({
        stateDirectory: directory,
        review: approvedReview("visual"),
      })).rejects.toThrow(/verified Shorts-player evidence/i);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it.each([
    {
      decision: "approved" as const,
      rejectionReason: "wrong-movement" as const,
      blockerReason: undefined,
      message: /approved review can't include a rejection or blocker reason/i,
    },
    {
      decision: "approved" as const,
      rejectionReason: undefined,
      blockerReason: "review-in-progress" as const,
      message: /approved review can't include a rejection or blocker reason/i,
    },
    {
      decision: "rejected" as const,
      rejectionReason: "wrong-movement" as const,
      blockerReason: "review-in-progress" as const,
      message: /rejected review can't include a pending blocker reason/i,
    },
  ])("refuses stale terminal-review metadata for $decision", async ({ decision, rejectionReason, blockerReason, message }) => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mwp-youtube-manual-stale-state-"));
    try {
      await seedCandidate(directory);
      await expect(recordManualYouTubeReview({
        stateDirectory: directory,
        review: {
          ...approvedReview("captions"),
          decision,
          fullWatchConfirmed: decision === "approved",
          exactVariation: decision === "approved",
          addsMaterialValue: decision === "approved",
          ...(rejectionReason ? { rejectionReason } : {}),
          ...(blockerReason ? { blockerReason } : {}),
        },
      })).rejects.toThrow(message);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("prevents an implicit downgrade of a complete approval", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mwp-youtube-manual-approved-"));
    try {
      await seedCandidate(directory);
      await recordEmbed(directory);
      await recordManualYouTubeReview({ stateDirectory: directory, review: approvedReview("captions") });
      await expect(recordManualYouTubeReview({
        stateDirectory: directory,
        review: { ...approvedReview("captions"), decision: "rejected", rejectionReason: "wrong-movement" },
      })).rejects.toThrow(/replace-approved/i);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("migrates legacy records without inventing evidence and maps an audio-confirmed approval to narration", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mwp-youtube-manual-migrate-"));
    const pendingKey = getYouTubeCandidateStateKey(target.canonicalExerciseSlug, target.variationId, videoId);
    const approvedId = "ZyXwVuTsR98";
    const approvedKey = getYouTubeCandidateStateKey(target.canonicalExerciseSlug, target.variationId, approvedId);
    const legacyBase = {
      canonicalExerciseSlug: target.canonicalExerciseSlug,
      variationId: target.variationId,
      reviewer: "Legacy reviewer",
      fullWatchConfirmed: false,
      visualReviewConfirmed: false,
      audioReviewConfirmed: false,
      exactVariation: false,
      conciseInstruction: false,
      safeInstruction: false,
      addsMaterialValue: false,
    };
    try {
      await writeFile(path.join(directory, "manual-reviews.json"), `${JSON.stringify({
        schemaVersion: 1,
        updatedAt: "2026-08-26T13:20:00.000Z",
        reviews: {
          [pendingKey]: { ...legacyBase, videoId, decision: "pending" },
          [approvedKey]: {
            ...legacyBase,
            videoId: approvedId,
            decision: "approved",
            playbackCompletedAt: "2026-08-26T13:19:00.000Z",
            reviewedAt: "2026-08-26T13:20:00.000Z",
            fullWatchConfirmed: true,
            visualReviewConfirmed: true,
            audioReviewConfirmed: true,
            exactVariation: true,
            conciseInstruction: true,
            safeInstruction: true,
            addsMaterialValue: true,
          },
        },
      })}\n`, { mode: 0o600 });

      const migrated = await loadManualYouTubeReviews(directory);
      expect(migrated.schemaVersion).toBe(2);
      expect(migrated.reviews[pendingKey]?.instructionEvidence).toBeUndefined();
      expect(migrated.reviews[approvedKey]?.instructionEvidence).toBe("narration");
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
      await expect(recordManualYouTubeReview({ stateDirectory: directory, review: baseReview }))
        .rejects.toThrow(/rejection reason/i);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
