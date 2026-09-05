import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HomePage, { metadata } from "@/app/page";

describe("Quiet Set welcome", () => {
  it("offers a disposable trial before account creation and keeps the example secondary", () => {
    const markup = renderToStaticMarkup(<HomePage />);
    expect(metadata.title).toBe("A little space for your next set");
    expect(markup).toContain('href="/try"');
    expect(markup).toContain("No account needed. Practice stays temporary.");
    expect(markup).toContain('href="/app"');
    expect(markup).toContain("Explore the five-day example");
    expect(markup.indexOf('href="/try"')).toBeLessThan(markup.indexOf("Explore the five-day example"));
    expect(markup).not.toContain("both approved videos");
  });
  it("reserves a decorative responsive studio without an image optimization URL", () => {
    const markup = renderToStaticMarkup(<HomePage />);
    expect(markup).toContain('alt=""');
    expect(markup).toContain('/illustrations/quiet-set/dawn-studio.webp');
    expect(markup).toContain('/illustrations/quiet-set/dawn-studio-phone.webp');
    expect(markup).toContain('width="1200" height="800"');
    expect(markup).toContain('fetchPriority="high"');
    expect(markup).not.toContain("/_next/image?url=");
  });
});
