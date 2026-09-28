// Acceptance contract for docs/plans/PRODUCTION-GRADE-IMPLEMENTATION.md (public surfaces).
// Do not edit these expectations to make them pass; implement the plan instead.
import { expect, test, type Page } from "@playwright/test";

const bannedVocabulary =
  /\b(immutable|canonical|seeded|topology|idempotent|reconcil\w*|snapshots?|namespace|firebase|credential gate|off the trail|field guide|field notes|guest browsing)\b/i;

const publicPages = [
  "/",
  "/try",
  "/program",
  "/program/push",
  "/library",
  "/library/push-up",
  "/progress",
  "/sample-workout",
  "/sign-in",
  "/offline",
] as const;

async function expectPlainPage(page: Page, path: string) {
  const text = await page.locator("body").innerText();
  expect(text.match(bannedVocabulary)?.[0] ?? null, path).toBeNull();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, `${path} horizontal overflow`).toBeLessThanOrEqual(0);
  const heading = await page.getByRole("heading", { level: 1 }).first().boundingBox();
  expect(heading, `${path} has a visible h1`).not.toBeNull();
  expect(heading!.x, `${path} h1 keeps the page gutter`).toBeGreaterThanOrEqual(16);
}

test.describe("production audit: public surfaces", () => {
  test.beforeEach(async ({ context }, info) => {
    test.skip(!["chromium-phone", "chromium-desktop"].includes(info.project.name), "Checked on one phone and one desktop project.");
    await context.route(/youtube-nocookie\.com|youtube\.com/, (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>Demo omitted in local QA</title>" }),
    );
  });

  test("every public page reads plainly, keeps its gutter, and fits the screen", async ({ page }) => {
    for (const path of publicPages) {
      await page.goto(path);
      await expectPlainPage(page, path);
      await expect(page.getByRole("navigation", { name: "Primary" }), path).toBeVisible();
    }
  });

  test("guest navigation uses clear labels that fit on one line", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Primary" });
    const labels = ["Example", "Library", "Progress", "Sign in"];
    for (const label of labels) await expect(nav.getByRole("link", { name: label, exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Sign in", exact: true })).toHaveAttribute("href", "/sign-in");
    const heights = await Promise.all(labels.map(async (label) => (await nav.getByRole("link", { name: label, exact: true }).boundingBox())!.height));
    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1);
    expect(await page.content()).not.toContain("data-design-contract");
  });

  test("the example routine uses the shared design, not the retired route map", async ({ page }) => {
    await page.goto("/program");
    await expect(page).toHaveTitle(/Five-day example routine/);
    await expect(page.getByRole("heading", { level: 1, name: "Five-day example routine" })).toBeVisible();
    await expect(page.locator(".route-map, .route-lines, .map-legend, .atlas-grid, .guest-map-stamp")).toHaveCount(0);
    for (const day of ["Push", "Pull", "Legs", "Upper", "Lower"]) {
      await expect(page.locator(`main a[href^="/program/${day.toLowerCase()}"]`).first()).toBeVisible();
    }

    await page.goto("/program/push");
    await expect(page.getByRole("heading", { level: 1, name: "Push day" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Example routine", exact: true })).toHaveAttribute("href", /^\/program/);
    await expect(page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Example", exact: true })).toHaveAttribute("aria-current", "page");
  });

  test("the library is searchable, compact, and its guides lead with the demo", async ({ page }, info) => {
    await page.goto("/library");
    await expect(page.getByRole("search")).toBeVisible();
    if (info.project.name === "chromium-desktop") {
      const cards = page.locator('main a[href^="/library/"]');
      const first = await cards.nth(0).boundingBox();
      const second = await cards.nth(1).boundingBox();
      expect(Math.abs(first!.y - second!.y), "guides render in a multi-column grid on desktop").toBeLessThanOrEqual(2);
    }

    await page.goto("/library/push-up");
    await expect(page.getByRole("heading", { level: 1, name: "Push-up" })).toBeVisible();
    await expect(page.getByText(/^Works with /).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Report a problem" })).toHaveCount(0);
    const demo = page.getByRole("heading", { level: 2, name: "Demo" });
    const steps = page.getByRole("heading", { level: 2, name: "How to do it" });
    await expect(demo).toBeVisible();
    await expect(steps).toBeVisible();
    const demoFirst = await demo.evaluate((element, other) => Boolean(element.compareDocumentPosition(other as Node) & Node.DOCUMENT_POSITION_FOLLOWING), await steps.elementHandle());
    expect(demoFirst, "demo comes before the written steps").toBe(true);
  });

  test("preview pages are labelled plainly", async ({ page }) => {
    await page.goto("/progress");
    await expect(page.getByText("Example data", { exact: true }).first()).toBeVisible();
    await page.goto("/sample-workout");
    await expect(page.getByRole("heading", { level: 1, name: "Example workout" })).toBeVisible();
    await page.goto("/sign-in");
    await expect(page.getByRole("heading", { level: 1, name: "Sign in to save your workouts" })).toBeVisible();
    await page.goto("/try");
    await expect(page.getByRole("button", { name: "Reset practice" })).toHaveCount(0);
  });

  test("recovery pages give a way forward", async ({ page }) => {
    const missing = await page.goto("/this-page-does-not-exist");
    expect(missing?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Go home" })).toHaveAttribute("href", "/");
    await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();

    await page.goto("/offline");
    await expect(page.getByRole("heading", { level: 1, name: "You're offline" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Primary" }).locator('[aria-current="page"]')).toHaveCount(0);

    await page.goto("/?account=deleted");
    await expect(page.getByRole("status").filter({ hasText: "Your account and workout data were deleted." })).toBeVisible();
  });
});
