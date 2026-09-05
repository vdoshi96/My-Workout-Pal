import { describe, expect, it } from "vitest";

import {
  buildYouTubeEmbedUrl,
  buildYouTubeWatchUrl,
  createCuratedVideoPair,
  createAvailableCuratedVideos,
} from "@/domain/youtube/embed";
import type { CuratedVideoSeed } from "@/domain/youtube/types";

const reviewedAt = "2026-08-25T20:00:00.000Z";

function video(
  videoId: string,
  displayOrder: 1 | 2,
  overrides: Partial<CuratedVideoSeed> = {},
): CuratedVideoSeed {
  return {
    canonicalExerciseSlug: "dumbbell-bench-press",
    variationId: "canonical",
    videoId,
    displayOrder,
    title: `Bench press demonstration ${displayOrder}`,
    channelTitle: `Coach ${displayOrder}`,
    approvalState: "approved" as const,
    reviewer: "primary-reviewer",
    reviewedAt,
    fullWatchConfirmed: true,
    ...overrides,
  };
}

describe("YouTube embed presentation", () => {
  it("keeps a valid single legacy demo without weakening new pair publication", () => {
    expect(createAvailableCuratedVideos([video("AbCdEfGhI01", 1)])).toHaveLength(1);
    expect(() => createAvailableCuratedVideos([video("AbCdEfGhI01", 1, {fullWatchConfirmed:false})])).toThrow();
    expect(() => createCuratedVideoPair([video("AbCdEfGhI01", 1)])).toThrow();
  });
  it("binds embeds to the supplied HTTP page origin", () => {
    expect(new URL(buildYouTubeEmbedUrl("AbCdEfGhI01", "https://my-workout-pal-chi.vercel.app/path")).searchParams.get("origin")).toBe("https://my-workout-pal-chi.vercel.app");
    expect(new URL(buildYouTubeEmbedUrl("AbCdEfGhI01", "file:///tmp/a")).searchParams.has("origin")).toBe(false);
  });
  it("builds a non-autoplay privacy-enhanced player URL with usable controls", () => {
    const url = new URL(buildYouTubeEmbedUrl("AbCdEfGhI01"));

    expect(url.origin).toBe("https://www.youtube-nocookie.com");
    expect(url.pathname).toBe("/embed/AbCdEfGhI01");
    expect(url.searchParams.get("autoplay")).toBe("0");
    expect(url.searchParams.get("controls")).toBe("1");
    expect(url.searchParams.get("playsinline")).toBe("1");
    expect(url.searchParams.get("rel")).toBe("0");
    expect(url.searchParams.has("modestbranding")).toBe(false);
    expect(url.searchParams.has("enablejsapi")).toBe(false);
  });

  it("builds a direct canonical YouTube fallback and rejects malformed IDs", () => {
    expect(buildYouTubeWatchUrl("AbCdEfGhI01")).toBe(
      "https://www.youtube.com/watch?v=AbCdEfGhI01",
    );
    expect(() => buildYouTubeEmbedUrl("not-valid")).toThrow(/video ID/i);
    expect(() => buildYouTubeWatchUrl("https://youtu.be/AbCdEfGhI01")).toThrow(
      /video ID/i,
    );
  });

  it("accepts exactly two ordered, approved, fully watched videos for one variation", () => {
    const pair = createCuratedVideoPair([
      video("ZyXwVuTsR98", 2),
      video("AbCdEfGhI01", 1),
    ]);

    expect(pair.map(({ displayOrder, videoId }) => ({ displayOrder, videoId }))).toEqual([
      { displayOrder: 1, videoId: "AbCdEfGhI01" },
      { displayOrder: 2, videoId: "ZyXwVuTsR98" },
    ]);
    expect(Object.isFrozen(pair)).toBe(true);
    expect(Object.isFrozen(pair[0])).toBe(true);
  });

  it("rejects cross-variation, duplicate, pending, or incompletely watched pairs", () => {
    const valid = video("AbCdEfGhI01", 1);

    expect(() => createCuratedVideoPair([valid])).toThrow(/exactly two/i);
    expect(() =>
      createCuratedVideoPair([
        valid,
        video("ZyXwVuTsR98", 2, { variationId: "barbell" }),
      ]),
    ).toThrow(/variation/i);
    expect(() =>
      createCuratedVideoPair([valid, video("AbCdEfGhI01", 2)]),
    ).toThrow(/duplicate/i);
    expect(() =>
      createCuratedVideoPair([
        valid,
        video("ZyXwVuTsR98", 2, { approvalState: "pending" }),
      ]),
    ).toThrow(/approved/i);
    expect(() =>
      createCuratedVideoPair([
        valid,
        video("ZyXwVuTsR98", 2, { fullWatchConfirmed: false }),
      ]),
    ).toThrow(/watched/i);
  });
});
