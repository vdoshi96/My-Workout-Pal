import { describe, expect, it } from "vitest";

import {
  evaluateYouTubeCandidate,
  parseYouTubeDuration,
  rankEligibleCandidates,
} from "@/domain/youtube/eligibility";
import type { YouTubeCandidate, YouTubeCurationTarget } from "@/domain/youtube/types";

const VIDEO_ID_ONE = "AbCdEfGhI01";
const VIDEO_ID_TWO = "ZyXwVuTsR98";

const target: YouTubeCurationTarget = {
  canonicalExerciseSlug: "dumbbell-bench-press",
  exerciseName: "Dumbbell bench press",
  requiredEquipmentTerms: ["dumbbell"],
};

function candidate(overrides: Partial<YouTubeCandidate> = {}): YouTubeCandidate {
  return {
    videoId: VIDEO_ID_ONE,
    title: "Dumbbell bench press tutorial",
    description: "A concise form guide for the dumbbell bench press.",
    channelTitle: "Example Strength",
    duration: "PT2M10S",
    privacyStatus: "public",
    uploadStatus: "processed",
    embeddable: true,
    syndicated: true,
    regionAvailable: true,
    liveBroadcastContent: "none",
    language: "en-US",
    viewCount: 100,
    ...overrides,
  };
}

describe("YouTube candidate eligibility", () => {
  it("accepts an exact, embeddable, syndicated candidate in the duration window", () => {
    const decision = evaluateYouTubeCandidate(candidate(), target);

    expect(decision.eligible).toBe(true);
    expect(decision.rejectionCodes).toEqual([]);
    expect(decision.durationSeconds).toBe(130);
  });

  it("rejects hard failures even when the candidate has a large view count", () => {
    const decision = evaluateYouTubeCandidate(
      candidate({
        viewCount: 50_000_000,
        embeddable: false,
        syndicated: false,
        duration: "PT12S",
        title: "Dumbbell bench press challenge #shorts",
      }),
      target,
    );

    expect(decision.eligible).toBe(false);
    expect(decision.rejectionCodes).toEqual(
      expect.arrayContaining([
        "not-embeddable",
        "not-syndicated",
        "duration-too-short",
        "shorts-not-allowed",
        "disallowed-title-category",
      ]),
    );
  });

  it("rejects wrong movement and equipment variations", () => {
    const wrongMovement = evaluateYouTubeCandidate(
      candidate({ title: "Dumbbell row tutorial", description: "How to do a dumbbell row." }),
      target,
    );
    const wrongEquipment = evaluateYouTubeCandidate(
      candidate({ title: "Barbell bench press tutorial", description: "Barbell bench press form." }),
      target,
    );

    expect(wrongMovement.rejectionCodes).toContain("wrong-movement");
    expect(wrongEquipment.rejectionCodes).toContain("wrong-equipment-variation");
  });

  it("ranks only hard-gate survivors and uses views only as a tie-break", () => {
    const ranked = rankEligibleCandidates(
      [
        candidate({ videoId: VIDEO_ID_ONE, viewCount: 10 }),
        candidate({
          videoId: VIDEO_ID_TWO,
          viewCount: 100_000_000,
          embeddable: false,
        }),
        candidate({ videoId: "QqRrSsTtUuV", viewCount: 20 }),
      ],
      target,
    );

    expect(ranked.map((item) => item.candidate.videoId)).toEqual(["QqRrSsTtUuV", VIDEO_ID_ONE]);
    expect(ranked.every((item) => item.decision.eligible)).toBe(true);
  });

  it("parses ISO 8601 durations without making a network request", () => {
    expect(parseYouTubeDuration("PT30S")).toBe(30);
    expect(parseYouTubeDuration("PT6M")).toBe(360);
    expect(parseYouTubeDuration("PT1H2M3S")).toBe(3723);
    expect(parseYouTubeDuration("not-a-duration")).toBeUndefined();
  });
});
