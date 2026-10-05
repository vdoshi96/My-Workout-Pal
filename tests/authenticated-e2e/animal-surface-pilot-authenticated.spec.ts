import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type BrowserContextOptions,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  HARNESS_SCENARIO_HEADER,
  HARNESS_SCOPE_HEADER,
  HARNESS_VIEWER_HEADER,
  type HarnessScenario,
} from "../fixtures/authenticated-app/server/harness-context";
import { saveExampleFromOnboarding } from "./support/member";

type HarnessViewer = "alice" | "alice-unverified";
type HarnessControl = { scenario: HarnessScenario };

function projectContextOptions(testInfo: TestInfo): BrowserContextOptions {
  const projectUse = testInfo.project.use;
  const viewport = projectUse.viewport;
  if (
    !viewport ||
    typeof viewport !== "object" ||
    typeof viewport.width !== "number" ||
    typeof viewport.height !== "number"
  ) {
    throw new Error("Authenticated animal pilot projects require an explicit viewport.");
  }
  return {
    ...(typeof projectUse.deviceScaleFactor === "number"
      ? { deviceScaleFactor: projectUse.deviceScaleFactor }
      : {}),
    ...(typeof projectUse.hasTouch === "boolean"
      ? { hasTouch: projectUse.hasTouch }
      : {}),
    ...(typeof projectUse.isMobile === "boolean"
      ? { isMobile: projectUse.isMobile }
      : {}),
    ...(typeof projectUse.userAgent === "string"
      ? { userAgent: projectUse.userAgent }
      : {}),
    viewport: { height: viewport.height, width: viewport.width },
  };
}

async function createHarnessContext(
  browser: Browser,
  scope: string,
  testInfo: TestInfo,
  viewer: HarnessViewer,
  control: HarnessControl = { scenario: "ready" },
): Promise<BrowserContext> {
  const context = await browser.newContext(projectContextOptions(testInfo));
  await context.route(/^http:\/\/127\.0\.0\.1:\d+\//u, async (route) => {
    await route.continue({
      headers: {
        ...route.request().headers(),
        [HARNESS_SCENARIO_HEADER]: control.scenario,
        [HARNESS_SCOPE_HEADER]: scope,
        [HARNESS_VIEWER_HEADER]: viewer,
      },
    });
  });
  return context;
}

async function expectNoIntersection(first: Locator, second: Locator) {
  const [firstBox, secondBox] = await Promise.all([
    first.boundingBox(),
    second.boundingBox(),
  ]);
  expect(firstBox).not.toBeNull();
  expect(secondBox).not.toBeNull();
  if (!firstBox || !secondBox) throw new Error("Required geometry participant is hidden.");
  const overlapWidth = Math.max(
    0,
    Math.min(firstBox.x + firstBox.width, secondBox.x + secondBox.width) -
      Math.max(firstBox.x, secondBox.x),
  );
  const overlapHeight = Math.max(
    0,
    Math.min(firstBox.y + firstBox.height, secondBox.y + secondBox.height) -
      Math.max(firstBox.y, secondBox.y),
  );
  expect(overlapWidth * overlapHeight).toBeLessThanOrEqual(1);
}

const PROTECTED_TODAY = [
  ".member-header a", ".member-header button", ".member-nav a", ".pal-today-copy h1", ".pal-today-copy > p",
  ".pal-today-actions :is(button, a)", ".pal-days h2", ".pal-day-pill", ".verification-banner",
].join(", ");

/** The control is the topmost element at its own centre, so decoration never covers it. */
async function expectOnTop(area: Locator) {
  await area.scrollIntoViewIfNeeded();
  await expect(area).toBeVisible();
  expect(await area.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return hit === element || (hit !== null && element.contains(hit));
  })).toBe(true);
}

async function expectMemberCompanion(page: Page) {
  const placement = page.locator(".pal-today-stage .pal-scene");
  const image = placement.locator("img");
  await expect(placement).toBeVisible();
  await expect(placement).toHaveAttribute("aria-hidden", "true");
  await expect(image).toHaveAttribute("alt", "");
  await expect(image).toHaveAttribute("aria-hidden", "true");
  await expect(image).not.toHaveAttribute("tabindex", /.+/u);
  await expect
    .poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
  expect(
    await placement.evaluate((element) => getComputedStyle(element).pointerEvents),
  ).toBe("none");
  // The scene is a background behind the copy by design, so "no overlap" becomes "never on top".
  for (const region of await page.locator(PROTECTED_TODAY).all()) {
    if (await region.isVisible()) await expectOnTop(region);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(1);
  return placement;
}

async function assertAccessible(page: Page) {
  await expect.poll(() => page.title()).not.toBe("");
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter(({ impact }) =>
      impact === "critical" || impact === "serious",
    ),
  ).toEqual([]);
}

async function captureMemberEvidence(
  page: Page,
  state: "active" | "ready" | "unverified",
  testInfo: TestInfo,
) {
  await page.evaluate(
    () =>
      new Promise<void>((resolveScroll) => {
        window.scrollTo(0, 0);
        requestAnimationFrame(() => {
          window.scrollTo(0, 0);
          resolveScroll();
        });
      }),
  );
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  const evidencePath = resolve(
    process.cwd(),
    "docs/qa/latest/animal-surface-pilot",
    `member-home-${state}-${testInfo.project.name}.png`,
  );
  mkdirSync(dirname(evidencePath), { recursive: true });
  await page.screenshot({ path: evidencePath });
}

test("verified, unverified, empty, and active member states keep the fox decorative", async ({
  browser,
  browserName,
}, testInfo) => {
  const scope = `animal-pilot-${testInfo.project.name}`;
  const verified = await createHarnessContext(browser, scope, testInfo, "alice");
  const page = await verified.newPage();
  await page.goto("/app");
  await saveExampleFromOnboarding(page);
  await expect(page.getByRole("heading", { name: "Your week" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Hey Alice! Ready for Push?" })).toBeVisible();
  await expect(page.locator(".pal-today-copy > p").first()).toHaveText(/ · Dumbbells$/u);
  await expect(page.getByText("Five-day starter route · 5 days a week", { exact: true })).toBeVisible();
  const nextWorkout = page.locator(".pal-today-copy");
  await expect(page.getByRole("region", { name: "Your week" }).getByRole("button", { name: /Push/u })).toHaveAttribute("aria-pressed", "true");
  await expect(nextWorkout.getByRole("button", { name: "Start Push", exact: true })).toBeEnabled();
  await expect(page.getByRole("link", { name: "See the whole day" })).toHaveAttribute("href", /^\/app\/program\/push\?from=/u);
  await expect(page.locator(".pal-day-pills > li")).toHaveCount(5);
  await expect(page.locator(".pal-glance")).toHaveCount(0);
  await expectMemberCompanion(page);
  await assertAccessible(page);

  const widths = browserName === "webkit"
    ? [320, 390, 430]
    : [320, 390, 430, 820, 1280, 1440];
  for (const width of widths) {
    await page.setViewportSize({
      height: width <= 430 ? 844 : width === 820 ? 1180 : 1000,
      width,
    });
    await page.reload();
    await expectMemberCompanion(page);
  }
  await captureMemberEvidence(page, "ready", testInfo);

  await page.getByRole("link", { name: "See the whole day" }).click();
  const startResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/app/workouts" &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Start Push" }).click();
  expect((await startResponse).status()).toBe(201);
  await page.waitForURL(/\/workout\//u);
  await page.goto("/app");
  await expect(page.getByRole("heading", { name: "Keep going with Push", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Resume Push" })).toBeVisible();
  for (const width of widths) {
    await page.setViewportSize({
      height: width <= 430 ? 844 : width === 820 ? 1180 : 1000,
      width,
    });
    await page.reload();
    // The scene now shows at every width; Resume must stay clear of the phone tab bar.
    await expectMemberCompanion(page);
    await expectNoIntersection(page.locator(".pal-today-actions a"), page.locator(".member-nav"));
  }
  await page.setViewportSize({
    height: browserName === "webkit" ? 844 : 1000,
    width: browserName === "webkit" ? 390 : 1440,
  });
  await page.reload();
  await captureMemberEvidence(page, "active", testInfo);

  const unverified = await createHarnessContext(
    browser,
    scope,
    testInfo,
    "alice-unverified",
  );
  const unverifiedPage = await unverified.newPage();
  await unverifiedPage.goto("/app");
  await expect(unverifiedPage.getByText("Your Push workout is waiting. Verify your email to keep going.")).toBeVisible();
  await expect(unverifiedPage.getByRole("heading", { name: "Verify to resume Push" })).toBeVisible();
  await expect(unverifiedPage.getByRole("link", { name: "Review Push" })).toBeVisible();
  // The verification banner and Review link are in PROTECTED_TODAY, so they must sit above the scene.
  await expectMemberCompanion(unverifiedPage);
  await assertAccessible(unverifiedPage);
  await captureMemberEvidence(unverifiedPage, "unverified", testInfo);

  await page.evaluate(() => fetch("/api/harness/scope", { method: "DELETE" }));
  await unverified.close();
  await verified.close();
});

test("member decoration is static, forced-color safe, and failure safe", async ({
  browser,
}, testInfo) => {
  const scope = `animal-pilot-resilience-${testInfo.project.name}`;
  const context = await createHarnessContext(browser, scope, testInfo, "alice");
  const page = await context.newPage();
  await page.goto("/app");
  await saveExampleFromOnboarding(page);
  await expect(page.getByRole("heading", { name: "Your week" })).toBeVisible();

  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.reload();
  const placement = await expectMemberCompanion(page);
  const presentation = await placement.locator("img").evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      animationName: style.animationName,
      transform: style.transform,
      transitionDuration: style.transitionDuration,
    };
  });
  expect(presentation).toEqual({
    animationName: "none",
    transform: "none",
    transitionDuration: "0s",
  });

  await page.emulateMedia({ colorScheme: "light", forcedColors: "active" });
  await page.reload();
  await expect(page.locator(".pal-today-stage .pal-scene")).toBeHidden();
  expect(
    await page.locator(".pal-today-stage > .pal-today-copy:visible").count(),
  ).toBe(1);
  const protectedControls = page.locator(".pal-today-copy h1, .pal-today-copy > p, .pal-today-actions button, .pal-today-actions a, .pal-days h2, .pal-day-pill, .member-nav a");
  for (const control of await protectedControls.all()) {
    await expect(control).toBeVisible();
    await control.scrollIntoViewIfNeeded();
    expect(await control.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return hit === element || (hit !== null && element.contains(hit));
    })).toBe(true);
  }

  await page.emulateMedia({ colorScheme: "light", forcedColors: "none" });
  await page.reload();
  const failedPlacement = await expectMemberCompanion(page);
  const copyWidth = () => page.locator(".pal-today-copy").evaluate((element) => element.getBoundingClientRect().width);
  const copyWidthWithArt = await copyWidth();
  await failedPlacement.locator("img").evaluate((image) => {
    image.dispatchEvent(new Event("error"));
  });
  await expect(failedPlacement).toBeHidden();
  // The copy never shared a column with the art, so it keeps its width when the art fails.
  const copyRatio = (await copyWidth()) / copyWidthWithArt;
  expect(copyRatio).toBeGreaterThan(0.8);
  for (const control of await protectedControls.all()) await expect(control).toBeVisible();

  await page.evaluate(() => fetch("/api/harness/scope", { method: "DELETE" }));
  await context.close();
});

test("slow and failed personal-home reads stay truthful and recover through retry", async ({
  browser,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium-desktop",
    "Chromium supplies the canonical streamed loading and recovery evidence.",
  );
  const scope = `animal-pilot-route-states-${testInfo.project.name}`;
  const control: HarnessControl = { scenario: "ready" };
  const context = await createHarnessContext(browser, scope, testInfo, "alice", control);
  const page = await context.newPage();
  await page.goto("/app");
  await saveExampleFromOnboarding(page);
  await expect(page.getByRole("heading", { name: "Your week" })).toBeVisible();

  await page.goto("/sign-in?returnTo=/app");
  control.scenario = "slow-member-home";
  const slowNavigation = page
    .getByRole("link", { name: "Return as the current synthetic viewer" })
    .click();
  const loading = page.locator('.member-state[aria-busy="true"]');
  await expect(loading).toContainText("Loading…");
  await expect(loading).toHaveAttribute("aria-busy", "true");
  await expect(page.locator(".pal-scene")).toHaveCount(0);
  await slowNavigation;
  await expect(page.getByRole("heading", { name: /^Hey Alice! Ready for /u })).toBeVisible();

  control.scenario = "ready";
  await page.goto("/sign-in?returnTo=/app");
  control.scenario = "fail-member-home";
  await page
    .getByRole("link", { name: "Return as the current synthetic viewer" })
    .click();
  const error = page.locator('.member-state[role="alert"]');
  await expect(error).toContainText("This page didn't load");
  await expect(error).toContainText("Nothing was changed.");
  await expect(page.locator(".pal-scene")).toHaveCount(0);
  control.scenario = "ready";
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { name: /^Hey Alice! Ready for /u })).toBeVisible();
  await expectMemberCompanion(page);

  await page.evaluate(() => fetch("/api/harness/scope", { method: "DELETE" }));
  await context.close();
});
