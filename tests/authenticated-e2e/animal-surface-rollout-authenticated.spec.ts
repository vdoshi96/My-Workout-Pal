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
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";

import {
  HARNESS_SCENARIO_HEADER,
  HARNESS_SCOPE_HEADER,
  HARNESS_VIEWER_HEADER,
  type HarnessScenario,
} from "../fixtures/authenticated-app/server/harness-context";

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

async function expectCompanion(
  page: Page,
  variant: "history" | "library" | "routine-editor" | "settings" | "workout",
  visible: boolean,
  protectedSelectors: readonly string[],
) {
  const placement = page.locator(`[data-companion-placement="${variant}"]`);
  if (!visible) {
    await expect(placement).toBeHidden();
    return placement;
  }

  const image = placement.locator("img");
  await expect(placement).toBeVisible();
  await expect(placement).toHaveAttribute("aria-hidden", "true");
  await expect(image).toHaveAttribute("alt", "");
  await expect(image).toHaveAttribute("aria-hidden", "true");
  await expect(image).not.toHaveAttribute("role", /.+/u);
  await expect(image).not.toHaveAttribute("tabindex", /.+/u);
  await expect(
    placement.locator("a, button, input, select, textarea, [tabindex]"),
  ).toHaveCount(0);
  await expect
    .poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
  expect(
    await placement.evaluate((element) => ({
      labelled: element.getAttribute("aria-label") ?? "",
      pointerEvents: getComputedStyle(element).pointerEvents,
      role: element.getAttribute("role") ?? "",
      focusable: element.matches(":focus, :focus-within"),
    })),
  ).toEqual({ labelled: "", pointerEvents: "none", role: "", focusable: false });
  expect(
    await placement.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const target = document.elementFromPoint(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
      );
      return target === element || (target ? element.contains(target) : false);
    }),
  ).toBe(false);

  for (const selector of protectedSelectors) {
    const protectedRegion = page.locator(selector).first();
    if (await protectedRegion.isVisible()) {
      await expectNoIntersection(placement, protectedRegion);
    }
  }
  return placement;
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
  await page.getByRole("button", { name: "Start with example" }).click();
  await expect(page.getByRole("heading", { name: "Choose a training day" })).toBeVisible();

  for (const width of widthMatrix(testInfo)) {
    await page.setViewportSize({
      height: width <= 430 ? 844 : width === 820 ? 1180 : 1000,
      width,
    });

    await page.goto("/app/library");
    await expect(page.getByRole("heading", { name: "Exercise library" })).toBeVisible();
    await expectCompanion(page, "library", width >= 1024, [
      ".member-header",
      ".member-nav",
      ".member-library-heading > div:first-child",
      ".member-library-heading .primary-action",
      ".member-library-search",
      ".member-library-results",
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
    await expect(page.getByRole("heading", { name: "Edit your route" })).toBeVisible();
    await expectCompanion(page, "routine-editor", width >= 1024, [
      ".member-header",
      ".member-nav",
      ".program-editor-hero > div:first-child",
      ".program-editor-hero .secondary-action",
      ".program-editor-equipment-control",
      ".program-editor-layout",
      ".program-editor-footer",
    ]);
    await expectNoOverflow(page);
    if (testInfo.project.name === "chromium-desktop" && width === 1440) {
      await capture(page, "routine-editor-chromium-desktop");
    }

    await page.goto("/app/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expectCompanion(page, "settings", width >= 768, [
      ".member-header",
      ".member-nav",
      ".member-settings-heading > div:first-child",
      ".settings-form",
      ".settings-account",
      ".settings-delete-preview",
      ".member-save-status",
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
  const editorPlacement = page.locator('[data-companion-placement="routine-editor"]');
  await page.getByLabel("Program name").fill("Draft state hides decoration");
  await expect(editorPlacement).toBeHidden();
  await expect(page.getByText("Unpublished changes")).toBeVisible();

  page.once("dialog", async (dialog) => dialog.accept());
  await page.goto("/app/settings");
  const settingsPlacement = page.locator('[data-companion-placement="settings"]');
  await page.getByLabel("Display units").selectOption("metric");
  await expect(settingsPlacement).toBeHidden();
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
  await expect(page.getByText("Preferences saved.")).toBeVisible();
  await expect(settingsPlacement).toBeHidden();

  await page.goto("/app");
  await page.getByRole("link", { name: /Open Push to start/u }).click();
  const startResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/app/workouts" &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Start or resume workout" }).click();
  expect((await startResponse).status()).toBe(201);
  await page.waitForURL(/\/workout\/[0-9a-f-]+$/u);
  const sessionId = new URL(page.url()).pathname.split("/").at(-1);
  if (!sessionId) throw new Error("The rollout session ID is unavailable.");
  await expect(page.getByRole("heading", { name: "Push" })).toBeVisible();
  const runnerPlacement = await expectCompanion(
    page,
    "workout",
    currentWidth(testInfo) >= 1024,
    [
      ".owned-workout-route-bar",
      ".runner-header > div:first-child",
      ".runner-stamp",
      ".runner-identity",
      ".runner-progress",
      ".runner-layout",
      ".runner-footer",
    ],
  );
  await expectNoOverflow(page);
  if (
    testInfo.project.name === "chromium-desktop" ||
    testInfo.project.name === "webkit-phone"
  ) {
    await capture(page, `runner-neutral-${testInfo.project.name}`);
  }

  if (currentWidth(testInfo) >= 1024) {
    await page.getByRole("button", { name: /^Start \d/u }).click();
    await expect(runnerPlacement).toBeHidden();
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(runnerPlacement).toBeVisible();
    await context.setOffline(true);
    await expect(page.getByRole("heading", { name: "Offline queued" })).toBeVisible();
    await expect(runnerPlacement).toBeHidden();
    await context.setOffline(false);
    await expect(page.getByRole("heading", { name: "Offline queued" })).toHaveCount(0);
    await expect(runnerPlacement).toBeVisible();
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
  await expect(
    unverifiedPage.locator('[data-companion-placement="settings"]'),
  ).toBeHidden();
  await unverifiedPage.goto(`/workout/${sessionId}`);
  await expect(
    unverifiedPage.getByRole("heading", { name: "Verify before editing this workout" }),
  ).toBeVisible();
  await expect(
    unverifiedPage.locator('[data-companion-placement="workout"]'),
  ).toHaveCount(0);
  await unverified.close();

  await page.getByRole("button", { name: "Runner 20:00" }).click();
  await page.getByLabel(/^Distance \((mi|meters)\)$/u).last().fill("1");
  await page.getByLabel("Duration (seconds)").last().fill("1200");
  const cardioResponse = page.waitForResponse(
    (response) =>
      /\/api\/app\/workouts\/[^/]+\/operations$/u.test(
        new URL(response.url()).pathname,
      ) && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Save cardio" }).click();
  expect((await cardioResponse).status()).toBe(200);

  const outlineItems = page.locator(".runner-outline li button");
  const exerciseCount = await outlineItems.count();
  for (let index = 0; index < exerciseCount; index += 1) {
    await outlineItems.nth(index).click();
    const skipResponse = page.waitForResponse(
      (response) =>
        /\/api\/app\/workouts\/[^/]+\/operations$/u.test(
          new URL(response.url()).pathname,
        ) && response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Skip exercise" }).click();
    expect((await skipResponse).status()).toBe(200);
    await expect(outlineItems.nth(index).getByText("Skipped")).toBeVisible();
  }
  await expect(runnerPlacement).toBeHidden();

  const completionResponse = page.waitForResponse(
    (response) =>
      /\/api\/app\/workouts\/[^/]+\/operations$/u.test(new URL(response.url()).pathname) &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Complete workout" }).click();
  expect((await completionResponse).status()).toBe(200);
  await expect(page).toHaveURL(`/app/history/${sessionId}`);
  await expect(page.getByText("Completed workout")).toBeVisible();
  await expectCompanion(page, "history", currentWidth(testInfo) >= 1024, [
    ".member-header",
    ".member-nav",
    ".insights-heading > div:first-child",
    ".archive-notice",
    ".history-exercises",
    ".history-cardio",
  ]);
  await expectNoOverflow(page);

  await page.goto("/app/history");
  await expect(page.getByRole("heading", { name: "History" })).toBeVisible();
  await expectCompanion(page, "history", currentWidth(testInfo) >= 1024, [
    ".member-header",
    ".member-nav",
    ".insights-heading > div:first-child",
    ".insight-action",
    ".history-filter",
    ".history-list",
    ".insight-pagination",
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
  await page.getByRole("button", { name: "Start with example" }).click();
  await expect(page.getByRole("heading", { name: "Choose a training day" })).toBeVisible();
  await page.goto("/app/library");
  const placement = page.locator('[data-companion-placement="library"]');
  if (currentWidth(testInfo) >= 1024) {
    await expect(placement).toBeVisible();
    await placement.locator("img").evaluate((image) => image.dispatchEvent(new Event("error")));
    await expect(placement).toBeHidden();
  } else {
    await expect(placement).toBeHidden();
  }
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
    await page.getByRole("button", { name: "Start with example" }).click();
    await expect(page.getByRole("heading", { name: "Choose a training day" })).toBeVisible();
    await page.getByRole("link", { name: /Open Push to start/u }).click();
    const startResponse = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/app/workouts" &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Start or resume workout" }).click();
    expect((await startResponse).status()).toBe(201);
    await page.waitForURL(/\/workout\/[0-9a-f-]+$/u);
    const sessionId = new URL(page.url()).pathname.split("/").at(-1);
    if (!sessionId) throw new Error("The native zoom session ID is unavailable.");

    await page.getByRole("button", { name: "Runner 20:00" }).click();
    await page.getByLabel(/^Distance \((mi|meters)\)$/u).last().fill("1");
    await page.getByLabel("Duration (seconds)").last().fill("1200");
    const cardioResponse = page.waitForResponse(
      (response) =>
        /\/api\/app\/workouts\/[^/]+\/operations$/u.test(
          new URL(response.url()).pathname,
        ) && response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Save cardio" }).click();
    expect((await cardioResponse).status()).toBe(200);

    const outlineItems = page.locator(".runner-outline li button");
    const exerciseCount = await outlineItems.count();
    for (let index = 0; index < exerciseCount; index += 1) {
      await outlineItems.nth(index).click();
      const skipResponse = page.waitForResponse(
        (response) =>
          /\/api\/app\/workouts\/[^/]+\/operations$/u.test(
            new URL(response.url()).pathname,
          ) && response.request().method() === "POST",
      );
      await page.getByRole("button", { name: "Skip exercise" }).click();
      expect((await skipResponse).status()).toBe(200);
      await expect(outlineItems.nth(index).getByText("Skipped")).toBeVisible();
    }
    const completionResponse = page.waitForResponse(
      (response) =>
        /\/api\/app\/workouts\/[^/]+\/operations$/u.test(
          new URL(response.url()).pathname,
        ) && response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Complete workout" }).click();
    expect((await completionResponse).status()).toBe(200);
    await expect(page).toHaveURL(`/app/history/${sessionId}`);

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
    await expect(page.locator('[data-companion-placement="library"]')).toBeHidden();
    await page.getByLabel("Search movements").focus();
    await expect(page.getByLabel("Search movements")).toBeFocused();
    await assertAccessible(page);
    await capture(page, "member-library-native-200-chromium");

    await page.goto("/app/history");
    await expect(page.getByRole("heading", { name: "History" })).toBeVisible();
    await expect(page.locator('[data-companion-placement="history"]')).toBeHidden();
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
