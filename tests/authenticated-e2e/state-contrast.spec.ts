// Every interactive state on member screens meets WCAG AA in both themes: text 4.5:1 (3:1 large),
// focus rings and selected edges 3:1. Hover and keyboard focus are sampled on desktop.
import { expect, test } from "@playwright/test";

import { contrastFailures, sampleStates, settle } from "../support/state-contrast";
import { answerOnboarding, saveRoutineAndSkipTour, useViewer } from "./support/member";

for (const colorScheme of ["light", "dark"] as const) {
  test(`member states meet AA contrast in ${colorScheme} mode`, async ({ page, context }, info) => {
    test.setTimeout(300_000);
    await useViewer(context, `contrast-${colorScheme}-${info.project.name}-${Date.now()}`);
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    const interactive = info.project.name === "chromium-desktop";
    const failures: string[] = [];
    const sample = async (name: string) => {
      await settle(page);
      failures.push(...contrastFailures(await sampleStates(page, name, { interactive })));
    };
    try {
      await page.goto("/app");
      await page.getByRole("radio", { name: /^Build muscle/u }).check();
      await sample("onboarding (choice selected)");
      await answerOnboarding(page);
      await sample("onboarding (routine)");
      await saveRoutineAndSkipTour(page);
      await page.getByRole("button", { name: /^Day 2/u }).click();
      await sample("today (day selected)");
      for (const path of ["/app/program/edit", "/app/programs", "/app/library", "/app/progress", "/app/history", "/app/prs", "/app/settings"]) {
        await page.goto(path);
        await sample(path);
      }
      await page.goto("/app");
      await page.getByRole("button", { name: /^Start / }).click();
      await page.waitForURL(/\/workout\//u);
      await sample("workout");
      expect(failures).toEqual([]);
    } finally {
      await page.request.delete("/api/harness/scope").catch(() => undefined);
    }
  });
}
