// New-member onboarding: four questions, a routine built from the answers, approved demos in place,
// and a short tour that can be skipped at any point.
import { expect, test } from "@playwright/test";

import { answerOnboarding, saveExampleRoutine, useViewer } from "./support/member";

test.describe("playful onboarding", () => {
  test.afterEach(async ({ page }) => {
    await page.request.delete("/api/harness/scope").catch(() => undefined);
  });

  test("answers build a fitting routine, the demo opens in place, and the tour can be skipped", async ({ page, context }, info) => {
    await useViewer(context, `playful-onboarding-${info.project.name}-${Date.now()}`);
    await page.goto("/app");
    await expect(page.getByText("Step 1 of 5")).toBeVisible();

    // A choice is required before moving on, and the message says so next to the question.
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Pick one" })).toHaveText("Pick one to continue.");

    await answerOnboarding(page, { goal: "Get stronger", experience: "I'm new to this", days: "2 days", equipment: "Dumbbells" });
    await expect(page.getByRole("heading", { level: 1, name: "Here's your routine." })).toBeFocused();
    await expect(page.getByText("2-day full body", { exact: false })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: /^Day 1 · / })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: /^Day 2 · / })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: /^Day 3 · / })).toHaveCount(0);

    // Demos open in a sheet on the same screen and close back to their trigger.
    const demo = page.getByRole("button", { name: /^Watch demo for / }).first();
    await demo.click();
    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();
    await expect(sheet.locator("iframe")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await expect(page.locator("dialog iframe")).toHaveCount(0);
    await expect(demo).toBeFocused();

    await page.getByRole("button", { name: "Save my routine" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Your next workout lives on Today." })).toBeFocused();
    await page.getByRole("button", { name: "Skip tour" }).click();
    // The tour's controls disappear, so focus moves to Today's heading.
    await expect(page.getByRole("heading", { level: 1, name: /^Hey Alice! Ready for / })).toBeFocused();
    await expect(page.getByRole("link", { name: "Skip to content" })).not.toBeFocused();
    await expect(page.getByRole("button", { name: /^Start / })).toBeVisible();

    // The answers persist and stay editable; reload keeps the same routine.
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: /^Hey Alice! Ready for / })).toBeVisible();
    await page.goto("/app/settings");
    await expect(page.getByRole("heading", { name: "Your training" })).toBeVisible();
    await expect(page.getByRole("radio", { name: /^Get stronger/ })).toBeChecked();
  });

  test("the tour walks through Today, logging, demos and progress", async ({ page, context }, info) => {
    await useViewer(context, `playful-tour-${info.project.name}-${Date.now()}`);
    await answerOnboarding(page);
    await page.getByRole("button", { name: "Save my routine" }).click();
    for (const heading of ["Your next workout lives on Today.", "Log what you actually did.", "Not sure how a move goes?", "Every set adds up."]) {
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeFocused();
      if (heading !== "Every set adds up.") await page.getByRole("button", { name: "Next" }).click();
    }
    await expect(page.getByText("Example", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Go to Today" }).click();
    await expect(page.getByRole("button", { name: /^Start / })).toBeVisible();
  });

  test("the five-day example and a blank start stay available", async ({ page, context }, info) => {
    await useViewer(context, `playful-example-${info.project.name}-${Date.now()}`);
    await saveExampleRoutine(page);
    await expect(page.getByRole("heading", { level: 1, name: "Hey Alice! Ready for Push?" })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("an unverified member can answer but not save", async ({ page, context }, info) => {
    await useViewer(context, `playful-unverified-${info.project.name}-${Date.now()}`, "alice-unverified");
    await answerOnboarding(page);
    await expect(page.getByRole("status").filter({ hasText: "Verify your email" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save my routine" })).toBeDisabled();
  });
});
