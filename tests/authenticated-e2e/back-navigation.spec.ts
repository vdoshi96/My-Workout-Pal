// Every drill-down shows where "back" goes and returns to the exact origin: the same day,
// the same movement, the same search, and the video sheet never leaves the page.
import { expect, test, type Page } from "@playwright/test";

import { saveExampleRoutine, startBlankRoutine, useViewer } from "./support/member";

async function expectFocusedRow(page: Page, id: string) {
  await expect(page.locator(`#${id}`)).toBeInViewport();
  await expect(page.locator(`#${id}`)).toBeFocused();
}

test.describe("back to the exact origin", () => {
  test.afterEach(async ({ page }) => {
    await page.request.delete("/api/harness/scope").catch(() => undefined);
  });

  test("Today, day, guide and demo all return to where you were", async ({ page, context }, info) => {
    await useViewer(context, `back-member-${info.project.name}-${Date.now()}`);
    await saveExampleRoutine(page);

    // Pick a day on Today; it is kept in the address.
    await page.getByRole("button", { name: /Day 2\s*Pull/u }).click();
    await expect(page).toHaveURL(/\/app\?day=pull$/u);
    await expect(page.getByRole("button", { name: /Day 2\s*Pull/u })).toHaveAttribute("aria-pressed", "true");

    // Today → guide → back lands on Today, same day, same movement.
    await page.locator("#movement-3 .pal-move-name").click();
    await expect(page).toHaveURL(/\/app\/library\/[^?]+\?from=/u);
    const backToToday = page.getByRole("link", { name: "Back to Today" });
    await expect(backToToday).toBeVisible();
    await backToToday.click();
    await expect(page).toHaveURL(/\/app\?day=pull(#movement-3)?$/u);
    await expect(page.getByRole("button", { name: /Day 2\s*Pull/u })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#movement-3")).toBeInViewport();

    // Today → whole day → guide → back to the day at that movement → back to Today on Pull.
    await page.getByRole("link", { name: "See the whole day" }).click();
    await expect(page.getByRole("heading", { level: 1, name: /Pull/u })).toBeVisible();
    await expect(page.getByRole("link", { name: "Today", exact: true })).toHaveAttribute("aria-current", "page");
    await page.locator("#movement-4").getByRole("link").first().click();
    await page.getByRole("link", { name: "Back to Day 2 · Pull" }).click();
    await expect(page).toHaveURL(/\/app\/program\/pull/u);
    await expectFocusedRow(page, "movement-4");
    await page.getByRole("link", { name: "Back to Today" }).click();
    await expect(page.getByRole("button", { name: /Day 2\s*Pull/u })).toHaveAttribute("aria-pressed", "true");

    // A demo opens in place on the day page and closing it returns focus to the same trigger.
    await page.getByRole("link", { name: "See the whole day" }).click();
    const url = page.url();
    const trigger = page.getByRole("button", { name: /^Watch demo for / }).first();
    await trigger.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Close" }).click();
    await expect(trigger).toBeFocused();
    expect(page.url()).toBe(url);
  });

  test("Library keeps the search and returns to the movement", async ({ page, context }, info) => {
    await useViewer(context, `back-library-${info.project.name}-${Date.now()}`);
    await saveExampleRoutine(page);
    await page.goto("/app/library?q=row");
    const row = page.locator("li[id^='movement-']").nth(1);
    const rowId = await row.getAttribute("id");
    await row.locator(".pal-move-name").click();
    await page.getByRole("link", { name: "Back to Library" }).click();
    await expect(page).toHaveURL(/\/app\/library\?q=row/u);
    await expect(page.getByLabel("Search movements")).toHaveValue("row");
    await expectFocusedRow(page, rowId!);
  });

  test("a deep link without an origin falls back to its parent", async ({ page, context }, info) => {
    await useViewer(context, `back-deep-${info.project.name}-${Date.now()}`);
    await saveExampleRoutine(page);
    await page.goto("/app/library/goblet-squat");
    await expect(page.getByRole("link", { name: "Back to Library" })).toHaveAttribute("href", "/app/library");
    await page.goto("/app/library/goblet-squat?from=https%3A%2F%2Fexample.com");
    await expect(page.getByRole("link", { name: "Back to Library" })).toHaveAttribute("href", "/app/library");
    await page.goto("/app/program/push");
    await expect(page.getByRole("link", { name: "Back to Today" })).toBeVisible();
  });

  test("finishing celebrates, and history, records and Progress return to their origin", async ({ page, context }, info) => {
    await useViewer(context, `back-insights-${info.project.name}-${Date.now()}`);
    await startBlankRoutine(page, "push-up", /^Push-up/u);
    await page.getByLabel("Sets", { exact: true }).fill("1");
    await page.getByRole("button", { name: "Save routine", exact: true }).click();
    await page.getByRole("link", { name: "Today", exact: true }).click();
    await page.getByRole("button", { name: /^Start / }).click();
    await page.waitForURL(/\/workout\//u);
    await page.getByLabel("Repetitions", { exact: true }).fill("12");
    await page.getByRole("button", { name: "Log set & rest", exact: true }).click();
    await page.getByRole("button", { name: "Finish exercise", exact: true }).first().click();
    await page.getByRole("button", { name: "Finish workout", exact: true }).click();

    // The finish lands on the workout with a celebration and a way back to Today.
    await page.waitForURL(/\/app\/history\/[^?]+\?from=%2Fapp&done=1/u);
    await expect(page.getByRole("heading", { name: "Workout done! Nice work." })).toBeVisible();
    await page.getByRole("link", { name: "Back to Today" }).first().click();
    await expect(page).toHaveURL(/\/app$/u);

    // Records → source workout → back to the same record.
    await page.goto("/app/prs");
    const source = page.getByRole("link", { name: /source workout/iu }).first();
    await source.click();
    await page.getByRole("link", { name: "Back to your records" }).click();
    await expect(page).toHaveURL(/\/app\/prs/u);
    await expect(page.locator("[id^='record-']").first()).toBeInViewport();

    // Progress → workout → back to Progress at that session.
    await page.goto("/app/progress");
    await page.locator("a[href*='/app/history/']").first().click();
    await page.getByRole("link", { name: "Back to Progress" }).click();
    await expect(page).toHaveURL(/\/app\/progress/u);
  });
});
