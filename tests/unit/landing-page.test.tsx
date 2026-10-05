import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HomePage, { metadata } from "@/app/page";

describe("Studio Pals welcome", () => {
  it("offers a disposable test drive before account creation and keeps the example secondary", () => {
    const markup = renderToStaticMarkup(<HomePage />);
    expect(metadata.title).toBe("Your new gym buddy");
    expect(markup).toContain('href="/try"');
    expect(markup).toContain("No account needed for the test drive.");
    expect(markup).toContain('href="/app"');
    expect(markup).toContain("Peek at a five-day routine");
    expect(markup.indexOf('href="/try"')).toBeLessThan(markup.indexOf("Peek at a five-day routine"));
    expect(markup).not.toContain("both approved videos");
  });
  it("reserves a decorative responsive studio without an image optimization URL", () => {
    const markup = renderToStaticMarkup(<HomePage />);
    expect(markup).toContain('alt=""');
    expect(markup).toContain("/illustrations/quiet-set/pip-studio.webp");
    expect(markup).toContain("/illustrations/quiet-set/pip-studio-phone.webp");
    expect(markup).toContain('width="1200"');
    expect(markup).toContain('height="800"');
    expect(markup).toContain('fetchPriority="high"');
    expect(markup).not.toContain("/_next/image?url=");
  });
});
