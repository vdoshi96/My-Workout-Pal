import { describe, expect, it } from "vitest";

import {
  buildCuratedVideoSeedManifestFromReport,
  parseCuratedVideoSeedManifest,
} from "@/domain/youtube/seed-manifest";
import { buildDefaultRequiredVideoVariations } from "@/domain/youtube/seed-validation";
import type {
  CurationReport,
  CurationReportCandidate,
  ManualYouTubeInstructionEvidence,
  ProposedVideoPair,
} from "@/domain/youtube/types";

type ReportOptions = Readonly<{
  omitFirstProposal?: boolean;
  firstProposalStatus?: ProposedVideoPair["status"];
  omitFirstCandidate?: boolean;
  duplicateFirstCandidate?: boolean;
  firstEligible?: boolean;
  firstSyndicationEvidence?: "search-filter" | "verified" | "unknown";
  firstExactVariation?: boolean;
  firstInstructionEvidence?: ManualYouTubeInstructionEvidence;
  firstReviewedAt?: string;
}>;

function completeReport(options: ReportOptions = {}): CurationReport {
  const candidates: CurationReportCandidate[] = [];
  const proposedPairs: ProposedVideoPair[] = [];
  buildDefaultRequiredVideoVariations().forEach((target, targetIndex) => {
    const videoIds = [
      `A${String(targetIndex * 2).padStart(10, "0")}`,
      `B${String(targetIndex * 2 + 1).padStart(10, "0")}`,
    ];
    if (!(options.omitFirstProposal && targetIndex === 0)) {
      proposedPairs.push({
        target,
        status: targetIndex === 0
          ? options.firstProposalStatus ?? "approved-for-seed"
          : "approved-for-seed",
        videoIds,
        distinctChannels: true,
        discoveryStatus: "api-discovery-complete",
      });
    }
    videoIds.forEach((videoId, videoIndex) => {
      const first = targetIndex === 0 && videoIndex === 0;
      if (first && options.omitFirstCandidate) return;
      const instructionEvidence = first
        ? options.firstInstructionEvidence ?? "visual"
        : "visual";
      const candidate: CurationReportCandidate = {
        videoId,
        target,
        queryKeys: [],
        candidate: {
          videoId,
          title: `${target.canonicalExerciseSlug} demonstration ${videoIndex + 1}`,
          channelTitle: `Coach ${videoIndex + 1}`,
          syndicated: true,
          syndicationEvidence: first
            ? options.firstSyndicationEvidence ?? "verified"
            : "verified",
          humanReview: {
            approved: true,
            reviewer: "Codex GPT-5.6 Sol",
            reviewedAt: first
              ? options.firstReviewedAt ?? "2026-08-26T17:00:00.000Z"
              : "2026-08-26T17:00:00.000Z",
            fullWatchConfirmed: true,
            exactVariation: first ? options.firstExactVariation ?? true : true,
            conciseInstruction: true,
            safeInstruction: true,
            addsMaterialValue: true,
            instructionEvidence,
          },
        },
        decision: {
          eligible: first ? options.firstEligible ?? true : true,
          rejectionCodes: [],
          durationSeconds: 60,
          relevanceScore: 20,
          normalizedVideoId: videoId,
        },
        reviewStatus: "approved",
      };
      candidates.push(candidate);
      if (first && options.duplicateFirstCandidate) candidates.push(candidate);
    });
  });
  return {
    generatedAt: "2026-08-26T17:30:00.000Z",
    status: "complete",
    candidates,
    proposedPairs,
  };
}

describe("approved YouTube seed manifest boundary", () => {
  it("derives exactly 54 durable rows from a complete approved report", () => {
    const manifest = buildCuratedVideoSeedManifestFromReport(completeReport({
      firstReviewedAt: "2026-08-26T17:00:00Z",
    }));

    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.videos).toHaveLength(54);
    expect(new Set(manifest.videos.map(({ videoId }) => videoId)).size).toBe(54);
    expect(manifest.videos[0]?.reviewedAt).toBe("2026-08-26T17:00:00.000Z");
    expect(Object.keys(manifest.videos[0]!).sort()).toEqual([
      "approvalState",
      "canonicalExerciseSlug",
      "channelTitle",
      "displayOrder",
      "fullWatchConfirmed",
      "reviewedAt",
      "reviewer",
      "title",
      "variationId",
      "videoId",
    ]);
  });

  it.each([
    ["missing proposal", { omitFirstProposal: true }, /not approved for seed/i],
    ["unapproved proposal", { firstProposalStatus: "ready-for-review" }, /not approved for seed/i],
    ["missing scoped candidate", { omitFirstCandidate: true }, /has 0 scoped candidate records/i],
    ["duplicate scoped candidate", { duplicateFirstCandidate: true }, /has 2 scoped candidate records/i],
    ["ineligible decision", { firstEligible: false }, /is not eligible/i],
    ["missing verified syndication", { firstSyndicationEvidence: "search-filter" }, /lacks scoped embed verification/i],
    ["incomplete manual gate", { firstExactVariation: false }, /lacks terminal full-watch approval/i],
    ["malformed review time", { firstReviewedAt: "not-a-time" }, /invalid review timestamp/i],
  ] as const)("rejects %s", (_label, options, message) => {
    expect(() => buildCuratedVideoSeedManifestFromReport(completeReport(options))).toThrow(message);
  });

  it("rejects forbidden durable fields, duplicate IDs, and duplicate display orders", () => {
    const manifest = buildCuratedVideoSeedManifestFromReport(completeReport());
    const first = manifest.videos[0]!;
    const second = manifest.videos[1]!;
    const remaining = manifest.videos.slice(2);

    expect(() => parseCuratedVideoSeedManifest({
      ...manifest,
      videos: [{ ...first, viewCount: 123 }, second, ...remaining],
    })).toThrow(/unsupported field.*viewCount/i);
    expect(() => parseCuratedVideoSeedManifest({
      ...manifest,
      videos: [first, { ...second, videoId: first.videoId }, ...remaining],
    })).toThrow(/duplicate-video-id/i);
    expect(() => parseCuratedVideoSeedManifest({
      ...manifest,
      videos: [first, { ...second, displayOrder: 1 }, ...remaining],
    })).toThrow(/duplicate-display-order/i);
  });
});
