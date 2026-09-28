// Acceptance contract for docs/plans/PRODUCTION-GRADE-IMPLEMENTATION.md (member surfaces).
// Do not edit these expectations to make them pass; implement the plan instead.
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const bannedVocabulary =
  /\b(immutable|canonical|seeded|topology|idempotent|reconcil\w*|snapshots?|namespace|firebase|owned programs?|owner-only|field guide|field notes)\b/i;

async function useViewer(context: BrowserContext, scope: string) {
  await context.setExtraHTTPHeaders({
    "x-mwp-harness-viewer": "alice",
    "x-mwp-harness-scope": scope,
    "x-mwp-harness-scenario": "ready",
  });
  await context.route(/youtube-nocookie\.com|youtube\.com/, (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>Demo omitted in local QA</title>" }),
  );
}

async function saveExampleRoutine(page: Page) {
  await page.goto("/app");
  await page.getByRole("radio", { name: /Example routine/ }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Save routine" }).click();
  await expect(page.getByRole("button", { name: "Start workout", exact: true })).toBeVisible();
}

async function expectPlainPage(page: Page) {
  const text = await page.locator("body").innerText();
  expect(text.match(bannedVocabulary)?.[0] ?? null).toBeNull();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe("production audit: member surfaces", () => {
  test.afterEach(async ({ page }) => {
    await page.request.delete("/api/harness/scope").catch(() => undefined);
  });

  test("account pages work before a routine exists", async ({ page, context }, info) => {
    await useViewer(context, `audit-presetup-${info.project.name}-${Date.now()}`);
    await page.goto("/app/settings");
    await expect(page).toHaveURL(/\/app\/settings$/);
    await expect(page).toHaveTitle("Settings · My Workout Pal");
    await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Delete my account" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Equipment" })).toHaveCount(0);
    expect(await page.getByLabel("Time zone").evaluate((element) => element.tagName)).toBe("SELECT");
    await expectPlainPage(page);
  });

  test("onboarding moves focus to each step heading", async ({ page, context }, info) => {
    await useViewer(context, `audit-onboarding-${info.project.name}-${Date.now()}`);
    await page.goto("/app");
    await expect(page).toHaveTitle("Today · My Workout Pal");
    await expect(page.getByRole("heading", { name: "Where would you like to start?" })).toBeVisible();
    await page.getByRole("radio", { name: /Example routine/ }).check();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: "Your preferences" })).toBeFocused();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: "Equipment" })).toBeFocused();
    await expect(page.getByRole("link", { name: "Skip to content" })).not.toBeFocused();
    await expectPlainPage(page);
  });

  test("routine management: naming, custom start, discard, readable errors, equipment link", async ({ page, context }, info) => {
    await useViewer(context, `audit-routine-${info.project.name}-${Date.now()}`);
    await saveExampleRoutine(page);

    await page.goto("/app/programs");
    await expect(page).toHaveTitle("Your routines · My Workout Pal");
    await expect(page.getByRole("heading", { level: 1, name: "Your routines" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Account" }).getByRole("link", { name: "Routine" })).toHaveAttribute("aria-current", "page");
    await page.getByRole("radio", { name: /Custom starting point/ }).check();
    expect(await page.getByLabel("First movement").locator("option").count()).toBeGreaterThan(20);
    await expectPlainPage(page);

    await page.goto("/app/program/edit");
    await expect(page).toHaveTitle("Routine · My Workout Pal");
    const sets = page.getByLabel("Sets", { exact: true }).first();
    const originalSets = await sets.inputValue();
    await sets.fill(originalSets === "5" ? "4" : "5");
    await page.getByRole("button", { name: "Discard changes" }).click();
    const discardDialog = page.getByRole("dialog", { name: "Discard your changes?" });
    await expect(discardDialog).toBeVisible();
    await discardDialog.getByRole("button", { name: "Discard", exact: true }).click();
    await expect(discardDialog).toBeHidden();
    await expect(page.getByLabel("Sets", { exact: true }).first()).toHaveValue(originalSets);
    await expect(page.getByRole("button", { name: "Discard changes" })).toHaveCount(0);

    await page.getByLabel("Minimum reps", { exact: true }).first().fill("12");
    await page.getByLabel("Maximum reps", { exact: true }).first().fill("8");
    await page.getByRole("button", { name: "Save routine", exact: true }).click();
    await expect(page.getByText(/^Push › /).first()).toBeVisible();
    await expect(page.getByText("→")).toHaveCount(0);
    await expect(page.getByLabel("Maximum reps", { exact: true }).first()).toHaveAttribute("aria-invalid", "true");
    await expectPlainPage(page);

    await page.goto("/app/program/edit#program-editor-equipment-title");
    await expect(page.locator("details:has(#program-editor-equipment-title)")).toHaveAttribute("open", "");
  });

  test("library guides stay inside the member app and unknown pages recover", async ({ page, context }, info) => {
    await useViewer(context, `audit-library-${info.project.name}-${Date.now()}`);
    await saveExampleRoutine(page);

    await page.goto("/app/library");
    await expect(page).toHaveTitle("Library · My Workout Pal");
    await expect(page.locator('main a[href^="/library/"]')).toHaveCount(0);
    const guide = page.locator('main a[href^="/app/library/"]:not([href^="/app/library/custom"])').first();
    await expect(guide).toBeVisible();
    await guide.click();
    await expect(page).toHaveURL(/\/app\/library\/[a-z0-9-]+$/);
    await expect(page.getByRole("navigation", { name: "Account" }).getByRole("link", { name: "Today" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Library", exact: true }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "How to do it" })).toBeVisible();
    await expectPlainPage(page);

    await page.goto("/app/this-page-does-not-exist");
    await expect(page.getByText("We couldn't find that page.")).toBeVisible();
    await page.getByRole("link", { name: "Back to Today" }).click();
    await expect(page).toHaveURL(/\/app$/);
  });

  test("runner: readable validation, kept rest, prefill, focus, and confirmations", async ({ page, context }, info) => {
    await useViewer(context, `audit-runner-${info.project.name}-${Date.now()}`);
    await saveExampleRoutine(page);
    await page.getByRole("button", { name: "Start workout", exact: true }).click();
    await expect(page).toHaveURL(/\/workout\//);
    const heading = page.locator("#runner-active-heading");
    await expect(heading).toHaveText("Dumbbell bench press");

    await page.getByRole("button", { name: "Log set & rest" }).click();
    await expect(page.getByText("Enter weight and reps to log this set.")).toBeVisible();
    const weight = page.getByLabel(/^Weight \((lb|kg)\)$/);
    await expect(weight).toHaveAttribute("aria-invalid", "true");
    await expect(weight).toBeFocused();

    await weight.fill("25");
    await page.getByLabel("Repetitions", { exact: true }).fill("10");
    await page.getByRole("button", { name: "Log set & rest" }).click();
    await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Next set", exact: true }).click();
    await expect(heading).toBeFocused();
    await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
    await expect(weight).toHaveValue("25");
    await expect(page.getByLabel("Repetitions", { exact: true })).toHaveValue("10");

    await page.getByText("More options", { exact: true }).click();
    await page.getByRole("button", { name: "Skip exercise", exact: true }).click();
    const skipDialog = page.getByRole("dialog", { name: "Skip Dumbbell bench press?" });
    await expect(skipDialog).toBeVisible();
    await skipDialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(skipDialog).toBeHidden();
    await expect(heading).toHaveText("Dumbbell bench press");

    await page.getByRole("button", { name: "End workout", exact: true }).click();
    const endDialog = page.getByRole("dialog", { name: "End this workout?" });
    await expect(endDialog).toBeVisible();
    await expect(endDialog.getByText("Sets you logged stay in your history.")).toBeVisible();
    await endDialog.getByRole("button", { name: "Keep going", exact: true }).click();
    await expect(endDialog).toBeHidden();
    await expect(page).toHaveURL(/\/workout\//);
    await expect(page.getByLabel("Abandonment note (optional)")).toHaveCount(0);
    await expectPlainPage(page);
  });

  test("the saved motion preference is applied", async ({ page, context }, info) => {
    await useViewer(context, `audit-motion-${info.project.name}-${Date.now()}`);
    await saveExampleRoutine(page);
    await page.goto("/app/settings");
    await page.getByRole("checkbox", { name: /Reduce interface motion/ }).check();
    await page.getByRole("button", { name: "Save preferences" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();
    await expect(page.locator('[data-reduced-motion="true"]')).toHaveCount(1);
    await page.reload();
    await expect(page.locator('[data-reduced-motion="true"]')).toHaveCount(1);
    await page.getByRole("checkbox", { name: /Reduce interface motion/ }).uncheck();
    await page.getByRole("button", { name: "Save preferences" }).click();
    await expect(page.locator('[data-reduced-motion="true"]')).toHaveCount(0);
  });

  test("member pages read plainly and fit the screen", async ({ page, context }, info) => {
    await useViewer(context, `audit-pages-${info.project.name}-${Date.now()}`);
    await saveExampleRoutine(page);
    const titles: ReadonlyArray<readonly [string, string]> = [
      ["/app", "Today · My Workout Pal"],
      ["/app/library", "Library · My Workout Pal"],
      ["/app/library/custom", "Custom movements · My Workout Pal"],
      ["/app/program/edit", "Routine · My Workout Pal"],
      ["/app/programs", "Your routines · My Workout Pal"],
      ["/app/progress", "Progress · My Workout Pal"],
      ["/app/history", "History · My Workout Pal"],
      ["/app/prs", "Personal records · My Workout Pal"],
      ["/app/settings", "Settings · My Workout Pal"],
    ];
    for (const [path, title] of titles) {
      await page.goto(path);
      await expect(page, path).toHaveTitle(title);
      await expectPlainPage(page);
    }
  });
});
