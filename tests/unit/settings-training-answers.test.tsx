import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
}));

import { TrainingAnswersSection } from "@/components/settings/training-answers-section";

const saved = {
  daysPerWeek: 3,
  experience: "some",
  goal: "muscle",
  updatedAt: "2026-09-30T12:00:00.000Z",
} as const;

function render(overrides: Partial<Parameters<typeof TrainingAnswersSection>[0]> = {}) {
  return renderToStaticMarkup(
    <TrainingAnswersSection
      activeProgramId="00000000-0000-4000-8000-000000000001"
      canMutate
      disabled={false}
      equipmentProfileKind="dumbbells"
      initialTrainingProfile={saved}
      {...overrides}
    />,
  );
}

describe("Settings: Your training", () => {
  it("points to routine setup before a routine exists", () => {
    const markup = render({ activeProgramId: null, initialTrainingProfile: null });
    expect(markup).toContain("Your training");
    expect(markup).toContain('href="/app"');
    expect(markup).toContain("Set up your routine");
    expect(markup).not.toContain('type="radio"');
  });

  it("shows the saved answers as chosen tiles and offers a new routine without touching the current one", () => {
    const markup = render();
    expect(markup).toContain("Changing these answers won&#x27;t change your current routine.");
    expect(markup).toMatch(/<input type="radio" name="training-goal" checked=""\/><span><strong>Build muscle<\/strong>/);
    expect(markup).toMatch(/<input type="radio" name="training-experience" checked=""\/><span><strong>Some<\/strong>/);
    expect(markup).toMatch(/<input type="radio" name="training-days" checked=""\/><span><strong>3 days<\/strong>/);
    expect(markup.match(/checked=""/g)).toHaveLength(3);
    // Nothing changed yet, so saving is off and building is on.
    expect(markup).toMatch(/<button class="primary-action" disabled="" type="button">Save answers<\/button>/);
    expect(markup).toMatch(/<button class="secondary-action" type="button">Build a new routine from these answers<\/button>/);
    expect(markup).toContain("Make it your active routine?");
  });

  it("asks older members for their answers before building", () => {
    const markup = render({ initialTrainingProfile: null });
    expect(markup).not.toContain('checked=""');
    expect(markup).toMatch(/<button class="secondary-action" disabled="" type="button">Build a new routine from these answers<\/button>/);
    expect(markup).toContain("Answer all three to save.");
  });

  it("locks the answers until the member can save changes", () => {
    const markup = render({ canMutate: false });
    expect(markup.match(/<fieldset class="pal-settings-question" disabled="">/g)).toHaveLength(3);
    expect(markup).toMatch(/<button class="secondary-action" disabled="" type="button">Build a new routine/);
  });
});
