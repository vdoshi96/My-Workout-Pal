import AxeBuilder from "@axe-core/playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";

const requiredWidths = [320, 390, 430, 820, 1280, 1440] as const;

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

async function expectSemanticSilence(placement: Locator) {
  const image = placement.locator("img");
  await expect(placement).toHaveAttribute("aria-hidden", "true");
  await expect(image).toHaveAttribute("alt", "");
  await expect(image).toHaveAttribute("aria-hidden", "true");
  await expect(image).not.toHaveAttribute("role", /.+/u);
  await expect(image).not.toHaveAttribute("tabindex", /.+/u);
  await expect(
    placement.locator("a, button, input, select, textarea, [tabindex]"),
  ).toHaveCount(0);
  expect(
    await placement.evaluate((element) => ({
      labelled: element.getAttribute("aria-label") ?? "",
      pointerEvents: getComputedStyle(element).pointerEvents,
      role: element.getAttribute("role") ?? "",
      focusable: element.matches(":focus, :focus-within"),
    })),
  ).toEqual({ labelled: "", pointerEvents: "none", role: "", focusable: false });
}

async function expectPointerInert(placement: Locator) {
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
}

async function assertPublicLibrary(page: Page, width: number) {
  await page.goto("/library");
  await expect(
    page.getByRole("heading", { level: 1, name: "Exercise library" }),
  ).toBeVisible();
  const placement = page.locator('[data-companion-placement="library"]');
  await expect(placement).toHaveCount(1);
  await expectSemanticSilence(placement);

  if (width < 1024) {
    await expect(placement).toBeHidden();
  } else {
    await expect(placement).toBeVisible();
    await expect
      .poll(() => placement.locator("img").evaluate(
        (element) => (element as HTMLImageElement).naturalWidth,
      ))
      .toBeGreaterThan(0);
    await expectPointerInert(placement);
    for (const protectedSelector of [
      ".public-header",
      ".public-nav",
      ".public-library-hero > div:first-child",
      ".guest-stamp",
      ".library-tools",
      ".profile-links",
      ".library-search",
      ".library-results",
    ]) {
      await expectNoIntersection(placement, page.locator(protectedSelector));
    }
  }

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(1);
}

function projectWidth(testInfo: TestInfo): number {
  const viewport = testInfo.project.use.viewport;
  if (!viewport || typeof viewport !== "object" || typeof viewport.width !== "number") {
    throw new Error("Rollout projects require an explicit viewport.");
  }
  return viewport.width;
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

test("public Library companion is silent and non-overlapping across the rollout matrix", async ({
  page,
}, testInfo) => {
  const widths = testInfo.project.name === "chromium-desktop"
    ? requiredWidths
    : [projectWidth(testInfo)];

  for (const width of widths) {
    const height = width <= 430 ? 844 : width === 820 ? 1180 : 1000;
    await page.setViewportSize({ height, width });
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "no-preference" });
    await assertPublicLibrary(page, width);

    if (
      testInfo.project.name === "chromium-desktop" &&
      [390, 820, 1440].includes(width)
    ) {
      const evidencePath = resolve(
        process.cwd(),
        "docs/qa/latest/animal-surface-rollout",
        `public-library-${width}x${height}-light.png`,
      );
      mkdirSync(dirname(evidencePath), { recursive: true });
      await page.screenshot({ path: evidencePath });
    }
  }
});

test("public Library keeps keyboard and screen-reader meaning independent from art", async ({
  page,
}, testInfo) => {
  const width = projectWidth(testInfo);
  await assertPublicLibrary(page, width);
  await page.getByLabel("Search movements").focus();
  await expect(page.getByLabel("Search movements")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Search" })).toBeFocused();
  await expect(page.locator('[data-companion-placement="library"]')).not.toBeFocused();
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter(({ impact }) =>
      impact === "critical" || impact === "serious",
    ),
  ).toEqual([]);
});

test("public Library decoration is dark, reduced-motion, forced-color, and failure safe", async ({
  browserName,
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-desktop", "One Chromium lane owns resilience evidence.");
  await page.setViewportSize({ height: 1000, width: 1440 });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await assertPublicLibrary(page, 1440);
  const placement = page.locator('[data-companion-placement="library"]');
  expect(
    await placement.locator("img").evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        animationName: style.animationName,
        transform: style.transform,
        transitionDuration: style.transitionDuration,
      };
    }),
  ).toEqual({ animationName: "none", transform: "none", transitionDuration: "0s" });

  await page.emulateMedia({ colorScheme: "light", forcedColors: "active" });
  await page.reload();
  await expect(placement).toBeHidden();
  await expect(page.getByLabel("Search movements")).toBeVisible();

  await page.emulateMedia({ colorScheme: "light", forcedColors: "none" });
  await page.reload();
  await expect(placement).toBeVisible();
  await placement.locator("img").evaluate((image) => image.dispatchEvent(new Event("error")));
  await expect(placement).toBeHidden();
  await expect(page.getByLabel("Search movements")).toBeVisible();
  expect(browserName).toBe("chromium");
});

test("CDP page scale simulation is recorded separately from native 200 percent zoom", async ({
  browserName,
  page,
}, testInfo) => {
  test.skip(
    browserName !== "chromium" || testInfo.project.name !== "chromium-desktop",
    "CDP page scale is Chromium-only and is not native zoom proof.",
  );
  await page.setViewportSize({ height: 1000, width: 1440 });
  await assertPublicLibrary(page, 1440);
  const devtools = await page.context().newCDPSession(page);
  await devtools.send("Emulation.setPageScaleFactor", { pageScaleFactor: 2 });
  await expectNoIntersection(
    page.locator('[data-companion-placement="library"]'),
    page.locator(".library-tools"),
  );
  await expect(page.getByLabel("Search movements")).toBeVisible();
  await devtools.send("Emulation.setPageScaleFactor", { pageScaleFactor: 1 });
});

test("headed native 200 percent zoom reflows public Library", async ({
  page,
}, testInfo) => {
  test.skip(
    process.env["MWP_NATIVE_ZOOM_QA"] !== "1" ||
      process.platform !== "darwin" ||
      testInfo.project.name !== "chromium-desktop",
    "Native zoom evidence is an explicit headed macOS Chromium gate.",
  );

  let baseDevicePixelRatio: number | undefined;
  try {
    await page.setViewportSize({ height: 1000, width: 1440 });
    await assertPublicLibrary(page, 1440);
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
    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter(({ impact }) =>
        impact === "critical" || impact === "serious",
      ),
    ).toEqual([]);

    const evidencePath = resolve(
      process.cwd(),
      "docs/qa/latest/animal-surface-rollout/public-library-native-200-chromium.png",
    );
    mkdirSync(dirname(evidencePath), { recursive: true });
    await page.screenshot({ path: evidencePath });
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
    }
  }
});
