import { expect, test, type Page } from "@playwright/test";

import { answerOnboarding, saveExampleRoutine, startBlankRoutine, useViewer } from "../authenticated-e2e/support/member";
import { capture, step } from "./capture-kit";

async function firstHref(page: Page, pattern: RegExp) {
  const hrefs = await page.locator("a[href]").evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""));
  return hrefs.find((href) => pattern.test(href));
}

test("member screens", async ({ page, context }, info) => {
  const scope = `capture-${info.project.name}-${Date.now()}`;
  await useViewer(context, scope);
  try {
    await step("settings-presetup", async () => {
      await page.goto("/app/settings");
      await capture(page, info, "member-settings-presetup");
    });
    await step("onboarding", async () => {
      await page.goto("/app");
      await page.getByRole("radio", { name: /^Build muscle/u }).check();
      await capture(page, info, "member-onboarding-goal", { fullPage: false });
      await answerOnboarding(page);
      await capture(page, info, "member-onboarding-routine");
      await page.getByRole("button", { name: "Save my routine" }).click();
      await expect(page.getByRole("button", { name: "Skip tour" })).toBeVisible();
      await capture(page, info, "member-onboarding-tour", { fullPage: false });
      await page.getByRole("button", { name: "Skip tour" }).click();
      await expect(page.getByRole("button", { name: /^Start / })).toBeVisible();
    });
    await step("today", async () => {
      await page.goto("/app");
      await capture(page, info, "member-today");
    });
    await step("today-demo", async () => {
      await page.getByRole("button", { name: /^Watch demo/u }).first().click();
      await capture(page, info, "member-today-demo", { fullPage: false });
      await page.keyboard.press("Escape");
    });
    await step("day-and-guide", async () => {
      const day = await firstHref(page, /^\/app\/program\/(?!edit)[^/?#]+/u);
      if (!day) throw new Error("no day link on Today");
      await page.goto(day);
      await capture(page, info, "member-day");
      const guide = await firstHref(page, /^\/app\/library\/(?!custom|chooser)[^/?#]+/u);
      if (!guide) throw new Error("no movement link on the day page");
      await page.goto(guide);
      await capture(page, info, "member-library-guide");
    });
    for (const [name, path] of [
      ["member-routine-editor", "/app/program/edit"],
      ["member-routines", "/app/programs"],
      ["member-library", "/app/library"],
      ["member-library-custom", "/app/library/custom"],
      ["member-library-custom-new", "/app/library/custom/new"],
      ["member-progress-empty", "/app/progress"],
      ["member-history-empty", "/app/history"],
      ["member-prs-empty", "/app/prs"],
      ["member-settings", "/app/settings"],
      ["member-not-found", "/app/this-page-does-not-exist"],
    ] as const) {
      await step(name, async () => {
        await page.goto(path);
        await capture(page, info, name);
      });
    }
    await step("runner", async () => {
      await page.goto("/app");
      await page.getByRole("button", { name: /^Start / }).first().click();
      await page.waitForURL(/\/workout\//u);
      await capture(page, info, "runner-set-entry");
      const weight = page.getByLabel(/^Weight/u);
      if (await weight.isVisible().catch(() => false)) await weight.fill("25");
      await page.getByLabel("Repetitions", { exact: true }).fill("10");
      await page.getByRole("button", { name: "Log set & rest", exact: true }).click();
      await page.getByRole("button", { name: "Pause", exact: true }).click();
      await capture(page, info, "runner-rest", { fullPage: false });
      await page.getByRole("button", { name: "End workout", exact: true }).first().click();
      await capture(page, info, "runner-end-dialog", { fullPage: false });
      await page.keyboard.press("Escape");
    });
  } finally {
    await page.request.delete("/api/harness/scope").catch(() => undefined);
  }

  // A second account with one finished workout, so Progress, History and Records have content.
  await useViewer(context, `${scope}-done`);
  try {
    await step("finished-workout", async () => {
      await startBlankRoutine(page, "push-up", /^Push-up/u);
      await page.getByLabel("Sets", { exact: true }).fill("1");
      await page.getByRole("button", { name: "Save routine", exact: true }).click();
      await page.getByRole("link", { name: "Today", exact: true }).click();
      await page.getByRole("button", { name: /^Start / }).first().click();
      await page.waitForURL(/\/workout\//u);
      await page.getByLabel("Repetitions", { exact: true }).fill("12");
      await page.getByRole("button", { name: "Log set & rest", exact: true }).click();
      await page.getByRole("button", { name: "Finish exercise", exact: true }).first().click();
      await capture(page, info, "runner-ready-to-finish", { fullPage: false });
      await page.getByRole("button", { name: "Finish workout", exact: true }).click();
      await page.waitForURL(/\/app\/history\//u);
      await capture(page, info, "member-workout-done");
    });
    for (const [name, path] of [
      ["member-today-after-workout", "/app"],
      ["member-progress", "/app/progress"],
      ["member-history", "/app/history"],
      ["member-prs", "/app/prs"],
    ] as const) {
      await step(name, async () => {
        await page.goto(path);
        await capture(page, info, name);
      });
    }
  } finally {
    await page.request.delete("/api/harness/scope").catch(() => undefined);
  }

  // The five-day example, for routines with many days.
  await useViewer(context, `${scope}-example`);
  try {
    await step("example-today", async () => {
      await saveExampleRoutine(page);
      await capture(page, info, "member-today-example");
    });
  } finally {
    await page.request.delete("/api/harness/scope").catch(() => undefined);
  }
});
