import { describe, expect, it } from "vitest";

import {
  normalizeCustomExerciseVideoIds,
  normalizeYouTubeUrl,
  parseYouTubeReference,
} from "@/domain/youtube/normalization";

const VIDEO_ID_ONE = "AbCdEfGhI01";
const VIDEO_ID_TWO = "ZyXwVuTsR98";

describe("YouTube reference normalization", () => {
  it("normalizes watch, youtu.be, and embed references to the same ID", () => {
    expect(normalizeYouTubeUrl(`https://www.youtube.com/watch?v=${VIDEO_ID_ONE}&t=30`)).toBe(
      VIDEO_ID_ONE,
    );
    expect(normalizeYouTubeUrl(`https://youtu.be/${VIDEO_ID_ONE}?si=fixture`)).toBe(VIDEO_ID_ONE);
    expect(normalizeYouTubeUrl(`https://www.youtube.com/embed/${VIDEO_ID_ONE}?playsinline=1`)).toBe(
      VIDEO_ID_ONE,
    );
    expect(normalizeYouTubeUrl(`https://www.youtube-nocookie.com/embed/${VIDEO_ID_ONE}`)).toBe(
      VIDEO_ID_ONE,
    );
  });

  it("rejects Shorts, malformed IDs, non-YouTube hosts, and insecure references", () => {
    expect(() => normalizeYouTubeUrl(`https://www.youtube.com/shorts/${VIDEO_ID_ONE}`)).toThrow(
      "shorts",
    );
    expect(() => normalizeYouTubeUrl("https://www.youtube.com/watch?v=too-short")).toThrow(
      "video ID",
    );
    expect(() => normalizeYouTubeUrl(`https://example.com/watch?v=${VIDEO_ID_ONE}`)).toThrow(
      "host",
    );
    expect(() => normalizeYouTubeUrl(`http://www.youtube.com/watch?v=${VIDEO_ID_ONE}`)).toThrow(
      "HTTPS",
    );
    expect(parseYouTubeReference(`https://www.youtube.com/shorts/${VIDEO_ID_ONE}`)).toMatchObject({
      ok: false,
      code: "shorts-not-allowed",
    });
  });

  it("allows at most two unique normalized custom-exercise videos", () => {
    expect(
      normalizeCustomExerciseVideoIds([
        `https://youtu.be/${VIDEO_ID_ONE}`,
        `https://www.youtube.com/embed/${VIDEO_ID_ONE}`,
        `https://www.youtube.com/watch?v=${VIDEO_ID_TWO}`,
      ]),
    ).toEqual([VIDEO_ID_ONE, VIDEO_ID_TWO]);
    expect(() =>
      normalizeCustomExerciseVideoIds([
        VIDEO_ID_ONE,
        VIDEO_ID_TWO,
        "QqRrSsTtUuV",
      ]),
    ).toThrow("two");
  });
});
