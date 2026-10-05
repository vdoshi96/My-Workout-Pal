import AxeBuilder from "@axe-core/playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type BrowserContextOptions,
  type Page,
  type TestInfo,
} from "@playwright/test";

import {
  HARNESS_SCENARIO_HEADER,
  HARNESS_SCOPE_HEADER,
  HARNESS_VIEWER_HEADER,
  type HarnessScenario,
} from "../fixtures/authenticated-app/server/harness-context";
import { saveExampleFromOnboarding } from "./support/member";

type HarnessViewer = "alice" | "alice-unverified";
type HarnessControl = { scenario: HarnessScenario };

const requiredWidths = [320, 390, 430, 820, 1280, 1440] as const;

function projectContextOptions(testInfo: TestInfo): BrowserContextOptions {
  const projectUse = testInfo.project.use;
  const viewport = projectUse.viewport;
  if (
    !viewport ||
    typeof viewport !== "object" ||
    typeof viewport.width !== "number" ||
    typeof viewport.height !== "number"
  ) {
    throw new Error("Authenticated rollout projects require an explicit viewport.");
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
  control: HarnessControl,
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

/**
 * Studio Pals insights and Settings pages open on a decorative SceneStage behind the content.
 * It must stay outside meaning, pointer and focus semantics and never sit on top of a protected region.
 */
async function expectInsightsScene(
  page: Page,
  scene: "library" | "progress" | "routine" | "settings" | "workout",
  protectedSelectors: readonly string[],
) {
  const stage = page.locator(`.pal-scene[data-scene="${scene}"]`);
  const image = stage.locator("img");
  await expect(stage).toHaveCount(1);
  await expect(stage).toHaveAttribute("aria-hidden", "true");
  await expect(image).toHaveAttribute("alt", "");
  await expect
    .poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
  await expect(stage.locator("a, button, input, select, textarea, [tabindex]")).toHaveCount(0);
  expect(await stage.evaluate((element) => getComputedStyle(element).pointerEvents)).toBe("none");
  for (const selector of protectedSelectors) {
    for (const protectedRegion of await page.locator(selector).all()) {
      if (!(await protectedRegion.isVisible())) continue;
      await protectedRegion.scrollIntoViewIfNeeded();
      expect(
        await protectedRegion.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          // Tall regions: sample the middle of their visible part.
          const top = Math.max(rect.top, 0);
          const bottom = Math.min(rect.bottom, innerHeight);
          const target = document.elementFromPoint(rect.left + rect.width / 2, top + (bottom - top) / 2);
          return target !== null && !target.closest(".pal-scene");
        }),
      ).toBe(true);
    }
  }
  return stage;
}

async function expectNoOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(1);
}

async function assertAccessible(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter(({ impact }) =>
      impact === "critical" || impact === "serious",
    ),
  ).toEqual([]);
}

function currentWidth(testInfo: TestInfo): number {
  const viewport = projectContextOptions(testInfo).viewport;
  if (!viewport) throw new Error("Missing viewport.");
  return viewport.width;
}

function widthMatrix(testInfo: TestInfo): readonly number[] {
  return testInfo.project.name === "chromium-desktop"
    ? requiredWidths
    : [currentWidth(testInfo)];
}

async function capture(page: Page, name: string) {
  const path = resolve(
    process.cwd(),
    "docs/qa/latest/animal-surface-rollout",
    `${name}.png`,
  );
  mkdirSync(dirname(path), { recursive: true });
  await page.screenshot({ path });
}

function sendNativeBrowserZoomKey(key: "+" | "0"): void {
  execFileSync(
    "osascript",
    [
      "-e",
      `tell application "System Events" to keystroke "${key}" using {command down}`,
    ],
    { stdio: "ignore" },
  );
}

test("member rollout surfaces preserve product priority across the authenticated matrix", async ({
  browser,
}, testInfo) => {
  test.setTimeout(240_000);
  const scope = `animal-rollout-${testInfo.project.name}`;
  const control: HarnessControl = { scenario: "runner-neutral-overview" };
  const context = await createHarnessContext(browser, scope, testInfo, "alice", control);
  const page = await context.newPage();
  await page.goto("/app");
  await saveExampleFromOnboarding(page);
  await expect(page.getByRole("heading", { name: "Your week" })).toBeVisible();

  for (const width of widthMatrix(testInfo)) {
    await page.setViewportSize({
      height: width <= 430 ? 844 : width === 820 ? 1180 : 1000,
      width,
    });

    await page.goto("/app/library");
    await expect(page.getByRole("heading", { name: "Exercise library" })).toBeVisible();
    await expectInsightsScene(page, "library", [
      ".member-header",
      ".member-nav",
      ".pal-page-head h1",
      ".pal-page-head p",
      ".pal-page-head .pal-actions a",
      ".pal-search",
      ".pal-moves > li",
    ]);
    await page.getByLabel("Search movements").focus();
    await expect(page.getByLabel("Search movements")).toBeFocused();
    await expectNoOverflow(page);
    if (
      (testInfo.project.name === "chromium-desktop" && width === 1440) ||
      testInfo.project.name === "webkit-phone"
    ) {
      await capture(page, `member-library-${testInfo.project.name}`);
    }

    await page.goto("/app/program/edit");
    await expect(page.getByRole("heading", { name: "Your routine" })).toBeVisible();
    await expectInsightsScene(page, "routine", [
      ".member-header",
      ".member-nav",
      ".pal-editor-head h1",
      ".pal-editor-tools",
      ".pal-editor-layout",
      ".pal-editor-savebar",
    ]);
    await expectNoOverflow(page);
    if (testInfo.project.name === "chromium-desktop" && width === 1440) {
      await capture(page, "routine-editor-chromium-desktop");
      await page.getByText("Equipment and substitutions", { exact: true }).click();
      await page.locator(".pal-equip-options button[aria-controls]").click();
      await expect(page.locator(".pal-equip-review")).toBeVisible();
      await capture(page, "routine-editor-equipment-review-chromium-desktop");
      await page.getByRole("button", { name: "Cancel" }).click();
      await expect(page.locator(".pal-equip-review")).toHaveCount(0);
    }

    await page.goto("/app/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expectInsightsScene(page, "settings", [
      ".member-header",
      ".member-nav",
      ".pal-page-head h1",
      ".pal-settings-section",
      ".pal-settings-danger",
    ]);
    await page.getByLabel("Display units").focus();
    await expect(page.getByLabel("Display units")).toBeFocused();
    await expectNoOverflow(page);
    if (
      (testInfo.project.name === "chromium-desktop" && width === 1440) ||
      testInfo.project.name === "webkit-phone"
    ) {
      await capture(page, `settings-${testInfo.project.name}`);
    }
  }

  await page.setViewportSize({
    height: currentWidth(testInfo) <= 430 ? 844 : currentWidth(testInfo) === 820 ? 1180 : 1000,
    width: currentWidth(testInfo),
  });

  await page.goto("/app/program/edit");
  await page.getByLabel("Routine name").fill("Draft state keeps the scene");
  await expect(page.locator('.pal-scene[data-scene="routine"]')).toHaveCount(1);
  await expect(page.getByText("Unsaved changes", { exact: true })).toBeVisible();

  page.once("dialog", async (dialog) => dialog.accept());
  await page.goto("/app/settings");
  // The scene stays put while you edit and save, so the page background never flips.
  const settingsPlacement = page.locator('.pal-scene[data-scene="settings"]');
  await page.getByLabel("Display units").selectOption("metric");
  await expect(settingsPlacement).toHaveCount(1);
  const saveSettings = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/app/preferences" &&
      response.request().method() === "PATCH",
  );
  const refreshSettings = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/app/settings" &&
      response.request().method() === "GET",
  );
  await page.getByRole("button", { name: "Save preferences" }).click();
  expect((await saveSettings).status()).toBe(200);
  expect((await refreshSettings).status()).toBe(200);
  await expect(page.getByText("Saved.", { exact: true })).toBeVisible();
  await expect(settingsPlacement).toHaveCount(1);

  await page.goto("/app");
  await page.getByRole("link", { name: "See the whole day" }).click();
  await page.waitForURL(/\/app\/program\/[^/?#]+\?from=/u);
  const startResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/app/workouts" &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Start Push" }).click();
  expect((await startResponse).status()).toBe(201);
  await page.waitForURL(/\/workout\/[0-9a-f-]+$/u);
  const sessionId = new URL(page.url()).pathname.split("/").at(-1);
  if (!sessionId) throw new Error("The rollout session ID is unavailable.");
  await expect(page.getByRole("heading", { name: "Push" })).toBeVisible();
  await expectInsightsScene(page, "workout", [
    ".pal-run-bar .pal-back-link",
    ".pal-run-head h1",
    ".pal-run-progress",
    ".pal-run-move h2",
    ".pal-run-sets",
    ".pal-run-entry",
    ".pal-run-footer",
  ]);
  await expectNoOverflow(page);
  if (
    testInfo.project.name === "chromium-desktop" ||
    testInfo.project.name === "webkit-phone"
  ) {
    await capture(page, `runner-neutral-${testInfo.project.name}`);
  }

  if (currentWidth(testInfo) >= 1024) {
    await page.getByRole("button", { name: /^Start \d/u }).click();
    await expect(page.getByRole("heading", { name: "Catch your breath." })).toBeVisible();
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(page.getByRole("heading", { name: "Rest timer" })).toBeVisible();
    await context.setOffline(true);
    await expect(page.getByRole("heading", { name: "You're offline" })).toBeVisible();
    await context.setOffline(false);
    await expect(page.getByRole("heading", { name: "You're offline" })).toHaveCount(0);
  }

  const unverified = await createHarnessContext(
    browser,
    scope,
    testInfo,
    "alice-unverified",
    control,
  );
  const unverifiedPage = await unverified.newPage();
  await unverifiedPage.goto("/app/settings");
  await expect(unverifiedPage.getByRole("heading", { name: "Settings" })).toBeVisible();
  await expectInsightsScene(unverifiedPage, "settings", [".pal-notice", ".pal-page-head h1"]);
  await unverifiedPage.goto(`/workout/${sessionId}`);
  await expect(
    unverifiedPage.getByRole("heading", { name: "Verify before editing this workout" }),
  ).toBeVisible();
  await expect(
    unverifiedPage.locator('.pal-scene[data-scene="workout"]'),
  ).toHaveCount(0);
  await unverified.close();

  await page.getByRole("button", { name: "Runner 20:00" }).click();
  await page.getByLabel(/^Distance \((mi|meters)\)$/u).last().fill("1");
  await page.getByLabel("Duration", { exact: true }).fill("20:00");
  const cardioResponse = page.waitForResponse(
    (response) =>
      /\/api\/app\/workouts\/[^/]+\/operations$/u.test(
        new URL(response.url()).pathname,
      ) && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Save cardio" }).click();
  expect((await cardioResponse).status()).toBe(200);

  await page.getByText("Workout outline", { exact: true }).click();
  const outlineItems = page.locator(".pal-run-outline li button");
  const exerciseCount = await outlineItems.count();
  for (let index = 0; index < exerciseCount; index += 1) {
    await outlineItems.nth(index).click();
    const skipResponse = page.waitForResponse(
      (response) =>
        /\/api\/app\/workouts\/[^/]+\/operations$/u.test(
          new URL(response.url()).pathname,
        ) && response.request().method() === "POST",
    );
    if (await page.locator(".pal-run-more").getAttribute("open") === null) {
      await page.getByText("More options", { exact: true }).click();
    }
    await page.getByRole("button", { name: "Skip exercise", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Skip exercise", exact: true }).click();
    expect((await skipResponse).status()).toBe(200);
    await expect(outlineItems.nth(index).getByText("Skipped")).toBeVisible();
  }

  const completionResponse = page.waitForResponse(
    (response) =>
      /\/api\/app\/workouts\/[^/]+\/operations$/u.test(new URL(response.url()).pathname) &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Finish workout" }).click();
  expect((await completionResponse).status()).toBe(200);
  await expect(page).toHaveURL(new RegExp(`/app/history/${sessionId}\\?from=%2Fapp(&done=1)?$`, "u"));
  await expect(page.getByText("Completed workout")).toBeVisible();
  await expectInsightsScene(page, "progress", [
    ".member-header",
    ".member-nav",
    ".pal-page-head h1",
    ".pal-page-head .pal-actions",
    ".pal-history-exercises",
    ".pal-history-cardio",
  ]);
  await expectNoOverflow(page);

  await page.goto("/app/history");
  await expect(page.getByRole("heading", { name: "History" })).toBeVisible();
  await expectInsightsScene(page, "progress", [
    ".member-header",
    ".member-nav",
    ".pal-page-head h1",
    ".pal-insights-pill",
    ".pal-insights-filter",
    ".pal-history-list",
    ".pal-insights-more",
  ]);
  await page.getByLabel("Show workouts").focus();
  await expect(page.getByLabel("Show workouts")).toBeFocused();
  await expectNoOverflow(page);
  await assertAccessible(page);

  if (
    testInfo.project.name === "chromium-desktop" ||
    testInfo.project.name === "webkit-phone"
  ) {
    await capture(page, `history-list-${testInfo.project.name}`);
  }
  await page.goto(`/app/history/${sessionId}`);
  if (
    testInfo.project.name === "chromium-desktop" ||
    testInfo.project.name === "webkit-phone"
  ) {
    await capture(page, `history-detail-${testInfo.project.name}`);
  }

  await page.evaluate(() => fetch("/api/harness/scope", { method: "DELETE" }));
  await context.close();
});

test("owned companion failure collapses without changing protected controls", async ({
  browser,
}, testInfo) => {
  test.skip(
    !["chromium-desktop", "webkit-phone"].includes(testInfo.project.name),
    "One desktop and one phone lane own image-failure evidence.",
  );
  const scope = `animal-rollout-failure-${testInfo.project.name}`;
  const control: HarnessControl = { scenario: "ready" };
  const context = await createHarnessContext(browser, scope, testInfo, "alice", control);
  const page = await context.newPage();
  await page.goto("/app");
  await saveExampleFromOnboarding(page);
  await expect(page.getByRole("heading", { name: "Your week" })).toBeVisible();
  await page.goto("/app/library");
  const placement = page.locator('.pal-scene[data-scene="library"]');
  await expect(placement).toBeVisible();
  await placement.locator("img").evaluate((image) => image.dispatchEvent(new Event("error")));
  await expect(placement).toBeHidden();
  await expect(page.getByLabel("Search movements")).toBeVisible();
  await expect(page.getByRole("link", { name: /Create private exercise/u })).toBeVisible();
  await expectNoOverflow(page);
  await page.evaluate(() => fetch("/api/harness/scope", { method: "DELETE" }));
  await context.close();
});

test("headed native 200 percent zoom reflows member Library and History", async ({
  browser,
}, testInfo) => {
  test.skip(
    process.env["MWP_NATIVE_ZOOM_QA"] !== "1" ||
      process.platform !== "darwin" ||
      testInfo.project.name !== "chromium-desktop",
    "Native zoom evidence is an explicit headed macOS Chromium gate.",
  );
  test.setTimeout(240_000);

  const scope = "animal-rollout-native-zoom";
  const control: HarnessControl = { scenario: "runner-neutral-overview" };
  const context = await createHarnessContext(browser, scope, testInfo, "alice", control);
  const page = await context.newPage();
  let baseDevicePixelRatio: number | undefined;

  try {
    await page.goto("/app");
    await saveExampleFromOnboarding(page);
    await expect(page.getByRole("heading", { name: "Your week" })).toBeVisible();
    await page.getByRole("link", { name: "See the whole day" }).click();
    await page.waitForURL(/\/app\/program\/[^/?#]+\?from=/u);
    const startResponse = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/app/workouts" &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Start Push" }).click();
    expect((await startResponse).status()).toBe(201);
    await page.waitForURL(/\/workout\/[0-9a-f-]+$/u);
    const sessionId = new URL(page.url()).pathname.split("/").at(-1);
    if (!sessionId) throw new Error("The native zoom session ID is unavailable.");

    await page.getByRole("button", { name: "Runner 20:00" }).click();
    await page.getByLabel(/^Distance \((mi|meters)\)$/u).last().fill("1");
    await page.getByLabel("Duration", { exact: true }).fill("20:00");
    const cardioResponse = page.waitForResponse(
      (response) =>
        /\/api\/app\/workouts\/[^/]+\/operations$/u.test(
          new URL(response.url()).pathname,
        ) && response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Save cardio" }).click();
    expect((await cardioResponse).status()).toBe(200);

    await page.getByText("Workout outline", { exact: true }).click();
    const outlineItems = page.locator(".pal-run-outline li button");
    const exerciseCount = await outlineItems.count();
    for (let index = 0; index < exerciseCount; index += 1) {
      await outlineItems.nth(index).click();
      const skipResponse = page.waitForResponse(
        (response) =>
          /\/api\/app\/workouts\/[^/]+\/operations$/u.test(
            new URL(response.url()).pathname,
          ) && response.request().method() === "POST",
      );
      if (await page.locator(".pal-run-more").getAttribute("open") === null) {
        await page.getByText("More options", { exact: true }).click();
      }
      await page.getByRole("button", { name: "Skip exercise", exact: true }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Skip exercise", exact: true }).click();
      expect((await skipResponse).status()).toBe(200);
      await expect(outlineItems.nth(index).getByText("Skipped")).toBeVisible();
    }
    const completionResponse = page.waitForResponse(
      (response) =>
        /\/api\/app\/workouts\/[^/]+\/operations$/u.test(
          new URL(response.url()).pathname,
        ) && response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Finish workout" }).click();
    expect((await completionResponse).status()).toBe(200);
    await expect(page).toHaveURL(new RegExp(`/app/history/${sessionId}\\?from=%2Fapp(&done=1)?$`, "u"));

    await page.goto("/app/library");
    await expect(page.getByRole("heading", { name: "Exercise library" })).toBeVisible();
    await page.bringToFront();
    sendNativeBrowserZoomKey("0");
    await page.waitForTimeout(400);
    const before = await page.evaluate(() => ({
      devicePixelRatio,
      innerWidth,
      visualScale: visualViewport?.scale ?? 1,
    }));
    baseDevicePixelRatio = before.devicePixelRatio;

    for (let step = 0; step < 5; step += 1) {
      sendNativeBrowserZoomKey("+");
      await page.waitForTimeout(200);
    }
    const zoomed = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      devicePixelRatio,
      innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      visualScale: visualViewport?.scale ?? 1,
    }));
    expect(zoomed.devicePixelRatio / before.devicePixelRatio).toBeCloseTo(2, 2);
    expect(before.innerWidth / zoomed.innerWidth).toBeCloseTo(2, 1);
    expect(zoomed.visualScale).toBe(1);
    expect(zoomed.scrollWidth - zoomed.clientWidth).toBeLessThanOrEqual(1);
    await expectInsightsScene(page, "library", [".pal-page-head h1", ".pal-search"]);
    await page.getByLabel("Search movements").focus();
    await expect(page.getByLabel("Search movements")).toBeFocused();
    await assertAccessible(page);
    await capture(page, "member-library-native-200-chromium");

    await page.goto("/app/history");
    await expect(page.getByRole("heading", { name: "History" })).toBeVisible();
    await expectInsightsScene(page, "progress", [".pal-page-head h1", ".pal-insights-filter"]);
    await page.getByLabel("Show workouts").focus();
    await expect(page.getByLabel("Show workouts")).toBeFocused();
    await expectNoOverflow(page);
    await assertAccessible(page);
    await capture(page, "history-list-native-200-chromium");
  } finally {
    if (!page.isClosed()) {
      await page.bringToFront();
      sendNativeBrowserZoomKey("0");
      await page.waitForTimeout(400);
      if (baseDevicePixelRatio !== undefined) {
        expect(await page.evaluate(() => devicePixelRatio)).toBeCloseTo(
          baseDevicePixelRatio,
          2,
        );
      }
      await page.evaluate(() => fetch("/api/harness/scope", { method: "DELETE" }));
    }
    await context.close();
  }
});
