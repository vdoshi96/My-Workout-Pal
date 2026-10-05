// Guest test drive: a guided taste of a real workout with an approved demo, logging, rest and a progress peek.
import { expect, test } from "@playwright/test";

test.describe("guest test drive", () => {
  test.beforeEach(async ({ context }, info) => {
    test.skip(!["chromium-phone", "chromium-desktop", "webkit-phone"].includes(info.project.name), "Checked on two phones and one desktop.");
    await context.route(/youtube-nocookie\.com|youtube\.com/, (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>Demo omitted in local QA</title>" }),
    );
  });

  test("a guest walks the plan, watches a demo in place, logs, rests and finishes without signing in", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Take a test drive" }).first().click();
    await expect(page).toHaveURL(/\/try$/u);
    await expect(page.getByText("Test drive. Nothing is saved.")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Here's today's workout." })).toBeVisible();
    await expect(page.getByText("Step 1 of 5")).toBeVisible();

    // The demo opens in a sheet on the same page and closing it returns to the same trigger.
    const demo = page.getByRole("button", { name: "Watch demo for Goblet squat" });
    await demo.click();
    const sheet = page.getByRole("dialog", { name: "Goblet squat" });
    await expect(sheet).toBeVisible();
    await expect(sheet.locator("iframe")).toHaveCount(1);
    await sheet.getByRole("button", { name: "Close" }).click();
    await expect(sheet).toBeHidden();
    await expect(page.locator("dialog iframe")).toHaveCount(0);
    await expect(demo).toBeFocused();
    await expect(page).toHaveURL(/\/try$/u);

    await page.getByRole("button", { name: "Let's go" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Goblet squat" })).toBeFocused();
    await page.getByRole("button", { name: "Log set & rest" }).click();
    const reps = page.getByLabel("Repetitions");
    await expect(reps).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText("Enter how many reps you did, from 1 to 1,000.")).toBeVisible();
    await page.getByLabel(/^Weight/u).fill("25");
    await reps.fill("10");
    await page.getByRole("button", { name: "Log set & rest" }).click();

    await expect(page.getByRole("heading", { level: 1, name: "Catch your breath." })).toBeFocused();
    await expect(page.getByRole("timer")).toBeVisible();
    await page.getByRole("button", { name: "Add 30 seconds" }).click();
    await page.getByRole("button", { name: /Skip rest|Next move/u }).click();

    await expect(page.getByRole("heading", { level: 1, name: "Front plank" })).toBeFocused();
    await page.getByLabel("Seconds").fill("30");
    await page.getByRole("button", { name: "Finish workout" }).click();

    await expect(page.getByRole("heading", { level: 1, name: "Workout done! Nice work." })).toBeFocused();
    await expect(page.getByRole("figure").getByText("Example", { exact: true })).toBeVisible();
    await expect(page.getByText("30s")).toBeVisible();
    await expect(page.getByRole("link", { name: "Make my routine" })).toHaveAttribute("href", "/app");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
