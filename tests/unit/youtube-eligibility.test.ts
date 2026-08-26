import { describe, expect, it } from "vitest";

import {
  evaluateYouTubeCandidate,
  parseYouTubeDuration,
  rankEligibleCandidates,
} from "@/domain/youtube/eligibility";
import { buildDefaultYouTubeCurationTargets } from "@/domain/youtube/targets";
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

  it("allows complete reviewed evidence to correct only semantic classifier false negatives", () => {
    const backSquatTarget: YouTubeCurationTarget = {
      canonicalExerciseSlug: "barbell-back-squat",
      exerciseName: "Barbell back squat",
      requiredEquipmentTerms: ["barbell"],
    };
    const fullyReviewed = candidate({
      videoId: "ultWZbUMPL8",
      title: "The Back Squat",
      description: "Back squat setup and execution.",
      duration: "PT1M7S",
      humanReview: {
        approved: true,
        reviewer: "Codex GPT-5.6 Sol",
        reviewedAt: "2026-08-26T17:00:00.000Z",
        fullWatchConfirmed: true,
        exactVariation: true,
        conciseInstruction: true,
        safeInstruction: true,
        addsMaterialValue: true,
        instructionEvidence: "captions",
      },
    });

    expect(evaluateYouTubeCandidate(fullyReviewed, backSquatTarget).rejectionCodes)
      .toContain("wrong-equipment-variation");
    expect(evaluateYouTubeCandidate(fullyReviewed, backSquatTarget, {
      allowReviewedSemanticOverride: true,
    })).toMatchObject({ eligible: true, rejectionCodes: [] });

    const hardFailure = evaluateYouTubeCandidate({
      ...fullyReviewed,
      available: false,
      isShort: true,
    }, backSquatTarget, { allowReviewedSemanticOverride: true });
    expect(hardFailure.eligible).toBe(false);
    expect(hardFailure.rejectionCodes).toEqual(expect.arrayContaining([
      "video-unavailable",
      "shorts-not-allowed",
    ]));
  });

  it("rejects exact-movement modifiers, commentary, claims, and non-English title cues", () => {
    const targets = new Map(
      buildDefaultYouTubeCurationTargets().map((item) => [item.canonicalExerciseSlug, item]),
    );
    const cases = [
      {
        slug: "dumbbell-bench-press",
        title: "Decline Dumbbell Bench Press - Chest Exercise",
        description: "How to perform the decline dumbbell bench press.",
        rejectionCode: "wrong-movement",
      },
      {
        slug: "seated-dumbbell-shoulder-press",
        title: "Floor Seated Dumbbell Shoulder Press",
        description: "A floor seated dumbbell shoulder press guide.",
        rejectionCode: "wrong-movement",
      },
      {
        slug: "dumbbell-curl",
        title: "Dumbbell Curl to Press",
        description: "Combine a dumbbell curl with an overhead press.",
        rejectionCode: "wrong-movement",
      },
      {
        slug: "dumbbell-curl",
        title: "Incline Dumbbell Bicep Curl",
        description: "Perform a dumbbell curl while lying on an incline bench.",
        rejectionCode: "wrong-movement",
      },
      {
        slug: "incline-dumbbell-press",
        title: "Floor Dumbbell Incline Press Without Bench",
        description: "Use the floor instead of a bench for an incline dumbbell press.",
        rejectionCode: "wrong-movement",
      },
      {
        slug: "reverse-lunge",
        title: "Dumbbell Reverse Lunge and Rotation",
        description: "Add torso rotation to every dumbbell reverse lunge.",
        rejectionCode: "wrong-movement",
      },
      {
        slug: "incline-dumbbell-press",
        title: "Incline Dumbbell Press: Why It Is Overrated",
        description: "Commentary about the incline dumbbell press.",
        rejectionCode: "disallowed-title-category",
      },
      {
        slug: "side-plank",
        title: "Lose Love Handles with Side Planks",
        description: "A side plank tutorial with guaranteed fat loss.",
        rejectionCode: "unsafe-or-misleading",
      },
      {
        slug: "side-plank",
        title: "Side Plank Tutorial (Hindi / Punjabi)",
        description: "Side plank instructions.",
        rejectionCode: "non-english",
      },
    ] as const;

    for (const item of cases) {
      const curationTarget = targets.get(item.slug);
      expect(curationTarget, item.slug).toBeDefined();
      const decision = evaluateYouTubeCandidate(
        candidate({
          title: item.title,
          description: item.description,
        }),
        curationTarget!,
      );
      expect(decision.rejectionCodes, item.title).toContain(item.rejectionCode);
    }
  });

  it("ranks hard-gate survivors by current views instead of relevance score", () => {
    const ranked = rankEligibleCandidates(
      [
        candidate({ videoId: VIDEO_ID_ONE, viewCount: 10 }),
        candidate({
          videoId: VIDEO_ID_TWO,
          viewCount: 100_000_000,
          embeddable: false,
        }),
        candidate({
          videoId: "QqRrSsTtUuV",
          title: "Dumbbell tutorial",
          description: "Bench press form using a dumbbell.",
          viewCount: 20,
        }),
      ],
      target,
    );

    expect(ranked.map((item) => item.candidate.videoId)).toEqual(["QqRrSsTtUuV", VIDEO_ID_ONE]);
    expect(ranked.every((item) => item.decision.eligible)).toBe(true);
    expect(ranked[0]?.decision.relevanceScore).toBeLessThan(ranked[1]?.decision.relevanceScore ?? 0);
  });

  it("puts known view counts before missing counts and resolves exact ties by video ID", () => {
    const ranked = rankEligibleCandidates(
      [
        candidate({ videoId: "ZyXwVuTsR98", viewCount: undefined }),
        candidate({ videoId: "QqRrSsTtUuV", viewCount: 0 }),
        candidate({ videoId: "AbCdEfGhI01", viewCount: 0 }),
      ],
      target,
    );

    expect(ranked.map((item) => item.candidate.videoId)).toEqual([
      "AbCdEfGhI01",
      "QqRrSsTtUuV",
      "ZyXwVuTsR98",
    ]);
  });

  it("parses ISO 8601 durations without making a network request", () => {
    expect(parseYouTubeDuration("PT30S")).toBe(30);
    expect(parseYouTubeDuration("PT6M")).toBe(360);
    expect(parseYouTubeDuration("PT1H2M3S")).toBe(3723);
    expect(parseYouTubeDuration("not-a-duration")).toBeUndefined();
  });
});
