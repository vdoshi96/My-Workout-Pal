// Every interactive state on the public pages meets WCAG AA in both themes: text 4.5:1 (3:1 large),
// focus rings and selected edges 3:1. Hover and keyboard focus are sampled on desktop.
import { expect, test } from "@playwright/test";

import { contrastFailures, sampleStates, settle } from "../support/state-contrast";

const screens = ["/", "/try", "/program", "/program/push", "/library", "/library/goblet-squat", "/progress", "/sample-workout", "/sign-in", "/offline"] as const;

for (const colorScheme of ["light", "dark"] as const) {
  test(`public states meet AA contrast in ${colorScheme} mode`, async ({ page, context }, info) => {
    test.skip(!["chromium-phone", "chromium-desktop"].includes(info.project.name), "Sampled on one phone and one desktop.");
    test.setTimeout(240_000);
    await context.route(/youtube-nocookie\.com|youtube\.com/, (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>Demo omitted in local QA</title>" }),
    );
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    const failures: string[] = [];
    for (const path of screens) {
      await page.goto(path);
      await settle(page);
      failures.push(...contrastFailures(await sampleStates(page, path, { interactive: info.project.name === "chromium-desktop" })));
    }
    // Selected states that only appear after a choice.
    await page.goto("/sign-in");
    const register = page.getByRole("button", { name: /Create account|Register/u }).first();
    if (await register.isVisible().catch(() => false)) await register.click();
    failures.push(...contrastFailures(await sampleStates(page, "/sign-in (register)", { interactive: false })));
    await page.goto("/program?equipment=barbell");
    failures.push(...contrastFailures(await sampleStates(page, "/program (barbell)", { interactive: false })));
    expect(failures).toEqual([]);
  });
}
