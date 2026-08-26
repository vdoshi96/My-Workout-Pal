import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import HomePage from "@/app/page";

describe("guest-first landing page", () => {
  it("states the public and account boundaries without gating the five-day plan", () => {
    const markup = renderToStaticMarkup(<HomePage />);

    expect(markup).toContain("Your whole five-day plan. No account required.");
    expect(markup).toContain("Every exercise instruction and both approved videos");
    expect(markup).toContain("Change sets, targets, weights, notes, and rest periods");
    expect(markup).toContain('href="/program"');
    expect(markup).toContain('href="/sign-in"');
    for (const day of ["push", "pull", "legs", "upper", "lower"]) {
      expect(markup).toContain(`/program/${day}?equipment=dumbbells`);
    }
  });

  it("uses the generated cartoon gym as descriptive artwork without hidden hotspots", () => {
    const markup = renderToStaticMarkup(<HomePage />);

    expect(markup).toContain("A lively hand-drawn cartoon gym");
    expect(markup).toContain("workout-pals-gym.webp");
    expect(markup).toContain('src="/illustrations/workout-pals-gym.webp"');
    expect(markup).toContain(
      'srcSet="/illustrations/workout-pals-gym-768.webp 768w, /illustrations/workout-pals-gym.webp 1536w"',
    );
    expect(markup).toContain('loading="lazy"');
    expect(markup).not.toContain('fetchPriority="high"');
    expect(markup).not.toContain("/_next/image?url=");
    expect(markup).not.toContain("gym-hotspot");
  });
});
