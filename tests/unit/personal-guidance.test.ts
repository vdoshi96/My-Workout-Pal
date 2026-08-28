import { describe, expect, it } from "vitest";

import {
  PERSONAL_GUIDANCE_MAX_LINKS,
  PERSONAL_GUIDANCE_MAX_URL_LENGTH,
  PersonalGuidanceValidationError,
  normalizePersonalGuidanceLink,
  normalizePersonalGuidanceLinks,
  validatePersonalGuidanceLinks,
} from "@/domain/exercises/personal-guidance";

const VIDEO_ID = "AbCdEfGhI01";

describe("personal guidance URL domain", () => {
  it("normalizes an ordered pair and preserves the safe presentation shape", () => {
    expect(
      normalizePersonalGuidanceLinks([
        " https://www.youtube.com/watch?v=AbCdEfGhI01&t=30 ",
        "https://EXAMPLE.com:443/how-to/../article?topic=strength",
      ]),
    ).toEqual([
      {
        kind: "youtube",
        canonicalUrl: "https://www.youtube.com/watch?v=AbCdEfGhI01",
        videoId: VIDEO_ID,
        embedUrl: "https://www.youtube-nocookie.com/embed/AbCdEfGhI01",
      },
      {
        kind: "external",
        canonicalUrl: "https://example.com/article?topic=strength",
      },
    ]);
  });

  it("recognizes every supported YouTube URL shape and deduplicates by video ID", () => {
    expect(
      normalizePersonalGuidanceLink(`https://youtu.be/${VIDEO_ID}?si=fixture`),
    ).toEqual({
      kind: "youtube",
      canonicalUrl: `https://www.youtube.com/watch?v=${VIDEO_ID}`,
      videoId: VIDEO_ID,
      embedUrl: `https://www.youtube-nocookie.com/embed/${VIDEO_ID}`,
    });

    expect(
      normalizePersonalGuidanceLinks([
        `https://youtu.be/${VIDEO_ID}`,
        `https://www.youtube-nocookie.com/embed/${VIDEO_ID}`,
      ]),
    ).toEqual([
      {
        kind: "youtube",
        canonicalUrl: `https://www.youtube.com/watch?v=${VIDEO_ID}`,
        videoId: VIDEO_ID,
        embedUrl: `https://www.youtube-nocookie.com/embed/${VIDEO_ID}`,
      },
    ]);

    const result = validatePersonalGuidanceLinks([
      `https://www.youtube.com/watch?v=${VIDEO_ID}`,
      `https://www.youtube.com/embed/${VIDEO_ID}`,
    ]);
    expect(result).toEqual({
      ok: true,
      links: [
        {
          kind: "youtube",
          canonicalUrl: `https://www.youtube.com/watch?v=${VIDEO_ID}`,
          videoId: VIDEO_ID,
          embedUrl: `https://www.youtube-nocookie.com/embed/${VIDEO_ID}`,
        },
      ],
    });
  });

  it("rejects a non-array, blank, non-string, and more than two links", () => {
    expect(validatePersonalGuidanceLinks(undefined)).toEqual({
      ok: false,
      code: "invalid_input",
      message: "Personal guidance links must be supplied as a list.",
    });
    expect(validatePersonalGuidanceLinks(["   "])).toEqual({
      ok: false,
      code: "blank_url",
      message: "A personal guidance URL is required.",
    });
    expect(validatePersonalGuidanceLinks([42])).toEqual({
      ok: false,
      code: "invalid_url",
      message: "Personal guidance links must be valid HTTPS URLs.",
    });
    expect(
      validatePersonalGuidanceLinks([
        "https://one.example/article",
        "https://two.example/article",
        "https://three.example/article",
      ]),
    ).toEqual({
      ok: false,
      code: "too_many_links",
      message: `Personal guidance can contain at most ${PERSONAL_GUIDANCE_MAX_LINKS} links.`,
    });
  });

  it.each([
    ["http://example.com/article", "https_required"],
    ["https://user:password@example.com/article", "credentials_not_allowed"],
    ["https://example.com/article#form", "fragment_not_allowed"],
    ["https://example.com:8443/article", "port_not_allowed"],
    ["https://example.com/article\nnext", "control_character"],
    ["https://example.com/article%00", "control_character"],
    ["https://www.youtube.com/channel/example", "youtube_unsupported_path"],
  ] as const)("rejects unsafe URL shape %s with code %s", (input, code) => {
    expect(() => normalizePersonalGuidanceLink(input)).toThrow(
      expect.objectContaining({
        name: "PersonalGuidanceValidationError",
        code,
      }) as PersonalGuidanceValidationError,
    );
  });

  it.each([
    "https://localhost/article",
    "https://api.localhost/article",
    "https://127.0.0.1/article",
    "https://10.0.0.12/article",
    "https://172.16.4.2/article",
    "https://192.168.1.8/article",
    "https://169.254.169.254/latest",
    "https://[::1]/article",
    "https://[fc00::1]/article",
    "https://[fd12:3456::1]/article",
    "https://[fe80::1]/article",
    "https://[::ffff:127.0.0.1]/article",
  ])("rejects local or private host %s without echoing it", (input) => {
    const result = validatePersonalGuidanceLinks([input]);
    expect(result).toMatchObject({
      ok: false,
      code: "unsafe_host",
      message: "Personal guidance links cannot target local or private hosts.",
    });
    expect(JSON.stringify(result)).not.toContain(input);
  });

  it("enforces the encoded URL bound before persistence", () => {
    const result = validatePersonalGuidanceLinks([
      `https://example.com/${"é".repeat(PERSONAL_GUIDANCE_MAX_URL_LENGTH)}`,
    ]);
    expect(result).toEqual({
      ok: false,
      code: "url_too_long",
      message: `Personal guidance URLs must be ${PERSONAL_GUIDANCE_MAX_URL_LENGTH} encoded characters or fewer.`,
    });
  });

  it("does not fetch or accept a YouTube URL with an unsupported path as an article", () => {
    let fetchCalls = 0;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      fetchCalls += 1;
      throw new Error("fetch should not be called");
    }) as typeof fetch;

    try {
      expect(validatePersonalGuidanceLinks(["https://www.youtube.com/@channel"])).toEqual({
        ok: false,
        code: "youtube_unsupported_path",
        message: "This YouTube URL path is not supported for personal guidance.",
      });
      expect(fetchCalls).toBe(0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
