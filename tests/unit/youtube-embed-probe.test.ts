import { describe, expect, it } from "vitest";

import {
  renderYouTubeEmbedProbe,
  startYouTubeEmbedProbeServer,
  YOUTUBE_EMBED_PROBE_HOST,
} from "@/domain/youtube/embed-probe";

describe("localhost YouTube embed probe", () => {
  it("renders a privacy-enhanced responsive player with a valid referrer and direct fallback", () => {
    const html = renderYouTubeEmbedProbe("https://www.youtube.com/watch?v=AbCdEfGhI01");

    expect(html).toContain("https://www.youtube-nocookie.com/embed/AbCdEfGhI01?autoplay=0&amp;controls=1&amp;rel=0");
    expect(html).toContain('referrerpolicy="strict-origin-when-cross-origin"');
    expect(html).toContain('width="560"');
    expect(html).toContain('height="315"');
    expect(html).toContain("min-height: 315px");
    expect(html).toContain('href="https://www.youtube.com/watch?v=AbCdEfGhI01"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("This page does not record evidence");
  });

  it("serves only on loopback with explicit response policy headers", async () => {
    const probe = await startYouTubeEmbedProbeServer({ videoReference: "AbCdEfGhI01" });
    try {
      expect(new URL(probe.url).hostname).toBe(YOUTUBE_EMBED_PROBE_HOST);
      const response = await fetch(probe.url);
      const html = await response.text();
      expect(response.status).toBe(200);
      expect(response.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
      expect(response.headers.get("content-security-policy")).toContain("https://www.youtube-nocookie.com");
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
      expect(html).toContain("Private YouTube embed playback probe");
    } finally {
      await probe.close();
    }
  });

  it("rejects invalid and Shorts references before opening the server", async () => {
    await expect(startYouTubeEmbedProbeServer({ videoReference: "bad!" })).rejects.toThrow(/valid URL/i);
    await expect(startYouTubeEmbedProbeServer({
      videoReference: "https://www.youtube.com/shorts/AbCdEfGhI01",
    })).rejects.toThrow(/shorts/i);
  });
});
