// Public drill-downs show where "back" goes and return to the exact origin.
import { expect, test } from "@playwright/test";

test.describe("public back to the exact origin", () => {
  test.beforeEach(async ({ context }, info) => {
    test.skip(!["chromium-phone", "chromium-desktop", "webkit-phone"].includes(info.project.name), "Checked on two phones and one desktop.");
    await context.route(/youtube-nocookie\.com|youtube\.com/u, (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>Demo omitted in local QA</title>" }),
    );
  });

  test("day → guide → back returns to the same movement", async ({ page }) => {
    await page.goto("/program/legs?equipment=barbell");
    await page.locator("#movement-2 .pal-move-name").click();
    await expect(page).toHaveURL(/\/library\/[^?]+\?equipment=barbell&from=/u);
    await page.getByRole("link", { name: "Back to the Legs day" }).click();
    await expect(page).toHaveURL(/\/program\/legs\?equipment=barbell(#movement-2)?$/u);
    await expect(page.locator("#movement-2")).toBeInViewport();
  });

  test("Library keeps the search and equipment and returns to the movement", async ({ page }) => {
    await page.goto("/library?equipment=barbell&q=row");
    const row = page.locator("li[id^='movement-']").first();
    const rowId = await row.getAttribute("id");
    await row.locator(".pal-move-name").click();
    await page.getByRole("link", { name: "Back to Library" }).click();
    await expect(page).toHaveURL(/\/library\?equipment=barbell&q=row/u);
    await expect(page.getByLabel("Search movements")).toHaveValue("row");
    await expect(page.locator(`#${rowId}`)).toBeInViewport();
  });

  test("demos open in place and a deep link falls back to the Library", async ({ page }) => {
    await page.goto("/program/push");
    const url = page.url();
    const trigger = page.getByRole("button", { name: /^Watch demo for / }).first();
    await trigger.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    expect(page.url()).toBe(url);
    await page.goto("/library/goblet-squat?from=%2F%2Fevil.example");
    await expect(page.getByRole("link", { name: "Back to Library" })).toHaveAttribute("href", "/library?equipment=dumbbells");
  });
});
