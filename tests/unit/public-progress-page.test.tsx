import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const permanentRedirect = vi.hoisted(() => vi.fn(() => {
  throw new Error("NEXT_REDIRECT");
}));

vi.mock("next/navigation", () => ({ permanentRedirect }));

import ProgressPage, { metadata } from "@/app/progress/page";
import SampleProgressCompatibilityPage from "@/app/sample-progress/page";

describe("public Progress preview", () => {
  it("uses one sample-data disclosure and ordinary progress labels", () => {
    const markup = renderToStaticMarkup(<ProgressPage />);

    expect(metadata.title).toBe("Progress");
    expect(markup).toContain("Sample data · not your history");
    expect(markup.match(/Sample data · not your history/g)).toHaveLength(1);
    expect(markup).toContain("Workouts");
    expect(markup).toContain("Consistency");
    expect(markup).toContain("Cardio");
    expect(markup).not.toContain("Sample workouts");
    expect(markup).not.toContain("Sample consistency");
    expect(markup).not.toContain("Sample cardio");
    expect(markup).not.toContain("Sample only");
    expect(markup).toContain('data-companion-placement="progress-preview"');
    expect(markup).toContain(
      'src="/illustrations/quiet-set/pip-complete.webp"',
    );
    expect(markup.indexOf('data-companion-placement="progress-preview"')).toBeLessThan(
      markup.indexOf('class="sample-metrics"'),
    );
    expect(markup).not.toContain("See your progress");
  });

  it("redirects the previous sample URL to the canonical route", () => {
    expect(() => SampleProgressCompatibilityPage()).toThrow("NEXT_REDIRECT");
    expect(permanentRedirect).toHaveBeenCalledWith("/progress");
  });
});
