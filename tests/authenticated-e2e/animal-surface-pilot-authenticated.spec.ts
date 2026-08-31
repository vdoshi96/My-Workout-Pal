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

async function expectMemberCompanion(page: Page) {
  const placement = page.locator('[data-companion-placement="member-home"]');
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
  await expectNoIntersection(placement, page.locator(".member-header"));
  await expectNoIntersection(placement, page.locator(".member-nav"));
  await expectNoIntersection(placement, page.locator(".member-program-copy"));
  await expectNoIntersection(placement, page.locator(".member-program-actions"));
  await expectNoIntersection(placement, page.locator(".member-home-progress"));
  await expectNoIntersection(placement, page.locator(".member-week"));
  await expectNoIntersection(placement, page.locator(".member-equipment"));
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
  await page.getByRole("button", { name: "Start with example" }).click();
  await expect(page.getByRole("heading", { name: "Choose a training day" })).toBeVisible();
  await expect(page.getByText("No completed workouts yet")).toBeVisible();
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

  await page.getByRole("link", { name: /Open Push to start/u }).click();
  const startResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/app/workouts" &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Start or resume workout" }).click();
  expect((await startResponse).status()).toBe(201);
  await page.waitForURL(/\/workout\//u);
  await page.goto("/app");
  await expect(page.getByText("Workout in progress")).toBeVisible();
  await expect(page.getByRole("link", { name: "Resume Push" })).toBeVisible();
  for (const width of widths) {
    await page.setViewportSize({
      height: width <= 430 ? 844 : width === 820 ? 1180 : 1000,
      width,
    });
    await page.reload();
    const placement = page.locator('[data-companion-placement="member-home"]');
    if (width <= 767) {
      await expect(placement).toBeHidden();
      if (width === 390) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await expectNoIntersection(page.locator(".member-resume-card"), page.locator(".member-nav"));
      }
    } else {
      await expectMemberCompanion(page);
      await expectNoIntersection(placement, page.locator(".member-resume-card"));
      await expectNoIntersection(page.locator(".member-resume-card"), page.locator(".member-nav"));
    }
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
  await expect(unverifiedPage.getByText("Your routine is available to review.")).toBeVisible();
  await expect(unverifiedPage.getByRole("heading", { name: "Verify to resume Push" })).toBeVisible();
  await expect(unverifiedPage.getByRole("link", { name: "Review Push" })).toBeVisible();
  const unverifiedPlacement = unverifiedPage.locator(
    '[data-companion-placement="member-home"]',
  );
  if (browserName === "webkit") {
    await expect(unverifiedPlacement).toBeHidden();
  } else {
    await expectMemberCompanion(unverifiedPage);
    await expectNoIntersection(
      unverifiedPlacement,
      unverifiedPage.locator(".member-home-verification"),
    );
    await expectNoIntersection(
      unverifiedPlacement,
      unverifiedPage.locator(".member-resume-card"),
    );
  }
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
  await page.getByRole("button", { name: "Start with example" }).click();
  await expect(page.getByRole("heading", { name: "Choose a training day" })).toBeVisible();

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
  await expect(page.locator('[data-companion-placement="member-home"]')).toBeHidden();
  expect(
    await page.locator(".member-program-hero").evaluate(
      (element) => getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/u).length,
    ),
  ).toBe(1);

  await page.emulateMedia({ colorScheme: "light", forcedColors: "none" });
  await page.reload();
  const failedPlacement = await expectMemberCompanion(page);
  await failedPlacement.locator("img").evaluate((image) => {
    image.dispatchEvent(new Event("error"));
  });
  await expect(failedPlacement).toBeHidden();
  const copyRatio = await page.locator(".member-program-copy").evaluate((element) => {
    const hero = element.parentElement;
    if (!hero) throw new Error("Member hero wrapper is missing.");
    return element.getBoundingClientRect().width / hero.getBoundingClientRect().width;
  });
  expect(copyRatio).toBeGreaterThan(0.8);

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
  await page.getByRole("button", { name: "Start with example" }).click();
  await expect(page.getByRole("heading", { name: "Choose a training day" })).toBeVisible();

  await page.goto("/sign-in?returnTo=/app");
  control.scenario = "slow-member-home";
  const slowNavigation = page
    .getByRole("link", { name: "Return as the current synthetic viewer" })
    .click();
  const loading = page.locator('.member-state[role="status"]');
  await expect(loading).toContainText("Loading your home…");
  await expect(loading).toHaveAttribute("aria-busy", "true");
  await expect(page.locator('[data-companion-placement="member-home"]')).toHaveCount(0);
  await slowNavigation;
  await expect(page.getByRole("heading", { name: /Welcome back/u })).toBeVisible();

  control.scenario = "ready";
  await page.goto("/sign-in?returnTo=/app");
  control.scenario = "fail-member-home";
  await page
    .getByRole("link", { name: "Return as the current synthetic viewer" })
    .click();
  const error = page.locator('.member-state[role="alert"]');
  await expect(error).toContainText("Your home did not load.");
  await expect(error).toContainText("No routine or workout changes were made.");
  await expect(page.locator('[data-companion-placement="member-home"]')).toHaveCount(0);
  control.scenario = "ready";
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { name: /Welcome back/u })).toBeVisible();
  await expectMemberCompanion(page);

  await page.evaluate(() => fetch("/api/harness/scope", { method: "DELETE" }));
  await context.close();
});
