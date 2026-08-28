import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import HomePage, { metadata } from "@/app/page";

describe("guest-first landing page", () => {
  it("positions a customizable companion and keeps the five-day route an example", () => {
    const markup = renderToStaticMarkup(<HomePage />);

    expect(metadata.title).toBe("Your customizable workout companion");
    expect(metadata.description?.toLowerCase()).toContain("plan your own routine");
    expect(markup).toContain("A workout companion built around your routine.");
    expect(markup).toContain("Plan your days, use guidance while you train, log your work, and review progress");
    expect(markup).toContain("Explore the five-day example");
    expect(markup).toContain("Five-day starter example · not saved");
    expect(markup).not.toContain("Your whole five-day plan");
    expect(markup).toContain('href="/program"');
    expect(markup).toContain('href="/app"');
    expect(markup).toContain("Open my workouts");
    expect(markup).toContain('href="/progress"');
    expect(markup).toContain(">Progress<");
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
