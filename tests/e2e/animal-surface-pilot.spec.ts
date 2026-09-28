import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { expect, test, type Locator, type Page } from "@playwright/test";

const heroReproductionPath = resolve(
  process.cwd(),
  ".impeccable/review/hero-repro.png",
);
const landingFramePath = resolve(
  process.cwd(),
  "docs/qa/latest/animal-surface-pilot/landing-1440x1024.png",
);

async function visibleBox(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return box!;
}

async function expectNoIntersection(first: Locator, second: Locator) {
  const [firstBox, secondBox] = await Promise.all([
    visibleBox(first),
    visibleBox(second),
  ]);
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

async function expectCompanionSemantics(page: Page, variant: string) {
  const placement = page.locator(variant === "landing" ? ".quiet-studio" : `[data-companion-placement="${variant}"]`);
  const image = placement.locator("img");
  await expect(placement).toBeVisible();
  if (variant !== "landing") await expect(placement).toHaveAttribute("aria-hidden", "true");
  await expect(placement.locator("a, button, input, select, textarea, [tabindex]")).toHaveCount(0);
  await expect(image).toHaveAttribute("alt", "");
  await expect(image).toHaveAttribute("aria-hidden", "true");
  await expect(image).not.toHaveAttribute("tabindex", /.+/u);
  await expect
    .poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
  expect(
    await placement.evaluate((element) => getComputedStyle(element).pointerEvents),
  ).toBe("none");
  await expectPointerInert(placement);
  return placement;
}

async function expectLandingControls(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  const protectedAreas = [
    page.getByRole("heading", { level: 1 }),
    page.locator(".quiet-welcome-copy > p"),
    page.getByRole("link", { name: "Try one set", exact: true }),
    page.getByRole("link", { name: "Create my routine", exact: true }),
    page.getByRole("navigation", { name: "Primary" }),
  ];
  expect(await protectedAreas[0]!.evaluate((element) => element.textContent?.replace(/\s+/gu, " ").trim()))
    .toBe("A little space for your next set.");
  for (const area of protectedAreas) {
    await area.scrollIntoViewIfNeeded();
    await expect(area).toBeVisible();
    expect(await area.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return hit === element || (hit !== null && element.contains(hit));
    })).toBe(true);
    // The studio is a background scene. Any foreground decoration still must
    // leave each protected rectangle clear, with the original 1 px limit.
    for (const decoration of await page.locator(".quiet-studio, .quiet-welcome .decorative-companion").all()) {
      const foreground = await decoration.evaluate((element) => getComputedStyle(element).zIndex !== "-1");
      if (foreground && await decoration.isVisible()) await expectNoIntersection(area, decoration);
    }
  }
  for (const link of await page.locator(".quiet-welcome-copy > a, .public-nav a").all()) {
    await expect(link).toHaveAttribute("href", /^\//u);
    await link.focus();
    await expect(link).toBeFocused();
    const scale = await page.evaluate(() => window.visualViewport?.scale ?? 1);
    if (scale > 1) {
      // CDP page scaling changes pointer coordinates. Verify real keyboard
      // activation at that scale, then restore the landing scene for each link.
      const landingUrl = page.url();
      const destination = new URL((await link.getAttribute("href"))!, landingUrl).href;
      await link.press("Enter");
      await expect(page).toHaveURL(new URL(destination).pathname === "/app"
        ? new URL("/sign-in?returnTo=%2Fapp", landingUrl).href
        : destination);
      await page.goto(landingUrl);
      const devtools = await page.context().newCDPSession(page);
      await devtools.send("Emulation.setPageScaleFactor", { pageScaleFactor: scale });
      await devtools.detach();
    } else {
      await link.click({ trial: true });
    }
  }
}

async function openLanding(page: Page) {
  await page.goto("/");
  await expectCompanionSemantics(page, "landing");
  await expectLandingControls(page);
}

test("landing first viewport reproduces the selected board hierarchy", async ({
  browserName,
  page,
}) => {
  test.skip(browserName !== "chromium", "The canonical reproduction uses Chromium.");
  test.setTimeout(60_000);

  await page.setViewportSize({ height: 1024, width: 1536 });
  await openLanding(page);
  mkdirSync(dirname(heroReproductionPath), { recursive: true });
  await page.screenshot({ path: heroReproductionPath });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(1536);

  await page.setViewportSize({ height: 1024, width: 1440 });
  await openLanding(page);
  mkdirSync(dirname(landingFramePath), { recursive: true });
  await page.screenshot({ path: landingFramePath });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(1440);
});

const publicPilotSurfaces = [
  {
    copy: ".quiet-welcome-copy",
    heading: "A little space for your next set.",
    path: "/",
    variant: "landing",
  },
  {
    copy: ".sample-hero-copy",
    heading: "Progress",
    path: "/progress",
    variant: "progress-preview",
  },
] as const;

const responsiveWidths = [320, 390, 430, 820, 1280, 1440] as const;

test("public pilot surfaces stay decorative, bounded, and truthful across required widths", async ({
  browserName,
  page,
}, testInfo) => {
  test.skip(
    !["chromium-desktop", "webkit-phone"].includes(testInfo.project.name),
    "The pilot width matrix runs once in Chromium and repeats its phone boundary in WebKit.",
  );
  const widths = browserName === "webkit" ? [320, 390, 430] : responsiveWidths;

  for (const width of widths) {
    const height = width <= 430 ? 844 : width === 820 ? 1180 : 1024;
    await page.setViewportSize({ height, width });
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "no-preference" });

    for (const surface of publicPilotSurfaces) {
      await page.goto(surface.path);
      await expect(
        page.getByRole("heading", { level: 1, name: surface.heading }),
      ).toBeVisible();
      const placement = await expectCompanionSemantics(page, surface.variant);
      if (surface.path === "/") {
        await expectLandingControls(page);
      } else {
        await expectNoIntersection(placement, page.locator(surface.copy));
        await expectNoIntersection(placement, page.locator(".public-header"));
        await expectNoIntersection(placement, page.locator(".public-nav"));
        await expect(page.getByText("Example data", { exact: true })).toHaveCount(1);
        await expectNoIntersection(placement, page.locator(".sample-warning"));
        await expectNoIntersection(placement, page.locator(".sample-metrics"));
        await expectNoIntersection(placement, page.locator(".sample-chart"));
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
      ).toBeLessThanOrEqual(1);

      if (
        browserName === "chromium" &&
        (width === 390 || width === 1440)
      ) {
        const evidencePath = resolve(
          process.cwd(),
          "docs/qa/latest/animal-surface-pilot",
          `${surface.variant}-${width}x${height}-light.png`,
        );
        mkdirSync(dirname(evidencePath), { recursive: true });
        await page.screenshot({ path: evidencePath });
      }
    }
  }
});

test("dark and reduced-motion rendering keep both public companions intact", async ({
  browserName,
  page,
}, testInfo) => {
  test.skip(
    !["chromium-desktop", "webkit-phone"].includes(testInfo.project.name),
    "The pilot theme check runs in desktop Chromium and phone WebKit.",
  );
  const width = browserName === "webkit" ? 390 : 1280;
  const height = browserName === "webkit" ? 844 : 1024;
  await page.setViewportSize({ height, width });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });

  for (const surface of publicPilotSurfaces) {
    await page.goto(surface.path);
    const placement = await expectCompanionSemantics(page, surface.variant);
    const imagePresentation = await placement.locator("img").evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        animationName: style.animationName,
        transform: style.transform,
        transitionDuration: style.transitionDuration,
      };
    });
    expect(imagePresentation.animationName).toBe("none");
    expect(imagePresentation.transform).toBe("none");
    expect(imagePresentation.transitionDuration).toBe("0s");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(1);
    if (surface.path === "/") await expectLandingControls(page);
    else await expectNoIntersection(placement, page.locator(".public-nav"));

    if (browserName === "chromium") {
      const evidencePath = resolve(
        process.cwd(),
        "docs/qa/latest/animal-surface-pilot",
        `${surface.variant}-${width}x${height}-dark-reduced.png`,
      );
      mkdirSync(dirname(evidencePath), { recursive: true });
      await page.screenshot({ path: evidencePath });
    }
  }
});

test("forced colors, image failure, and 200 percent zoom collapse decoration safely", async ({
  browserName,
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium-desktop",
    "Chromium supplies the canonical forced-colors and zoom evidence.",
  );
  await page.setViewportSize({ height: 1024, width: 1280 });

  await page.emulateMedia({ colorScheme: "light", forcedColors: "active" });
  for (const surface of publicPilotSurfaces) {
    await page.goto(surface.path);
    const placement = page.locator(surface.path === "/" ? ".quiet-studio" : `[data-companion-placement="${surface.variant}"]`);
    await expect(placement).toBeHidden();
    if (surface.path === "/") {
      await expectLandingControls(page);
      continue;
    }
    const collapsedLayout = await page.locator(surface.copy).evaluate((element) => {
      const hero = element.parentElement;
      if (!hero) throw new Error("Pilot hero wrapper is missing.");
      const copy = element.getBoundingClientRect();
      const wrapper = hero.getBoundingClientRect();
      return {
        copyRatio: copy.width / wrapper.width,
        gridTemplateColumns: getComputedStyle(hero).gridTemplateColumns,
      };
    });
    expect(collapsedLayout.copyRatio).toBeGreaterThan(0.8);
    expect(collapsedLayout.gridTemplateColumns.trim().split(/\s+/u)).toHaveLength(1);
  }

  await page.emulateMedia({ colorScheme: "light", forcedColors: "none" });
  for (const surface of publicPilotSurfaces) {
    await page.goto(surface.path);
    const placement = page.locator(surface.path === "/" ? ".quiet-studio" : `[data-companion-placement="${surface.variant}"]`);
    await expectCompanionSemantics(page, surface.variant);
    if (surface.path === "/") {
      await page.route("**/illustrations/quiet-set/**", (route) => route.abort());
      await placement.evaluate((picture) => {
        for (const source of picture.querySelectorAll("source")) source.removeAttribute("srcset");
        const image = picture.querySelector("img");
        if (!image) throw new Error("Landing image is missing.");
        image.removeAttribute("srcset");
        image.src = "/illustrations/quiet-set/missing-pilot-image.webp";
      });
      await expect.poll(() => placement.locator("img").evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBe(0);
      await expectLandingControls(page);
      await page.unroute("**/illustrations/quiet-set/**");
      continue;
    }
    await placement.locator("img").evaluate((image) => {
      image.dispatchEvent(new Event("error"));
    });
    await expect(placement).toBeHidden();
    const copyRatio = await page.locator(surface.copy).evaluate((element) => {
      const hero = element.parentElement;
      if (!hero) throw new Error("Pilot hero wrapper is missing.");
      return element.getBoundingClientRect().width / hero.getBoundingClientRect().width;
    });
    expect(copyRatio).toBeGreaterThan(0.8);
  }

  expect(browserName).toBe("chromium");
  const devtools = await page.context().newCDPSession(page);
  await page.setViewportSize({ height: 1024, width: 1280 });
  await page.goto("/");
  await devtools.send("Emulation.setPageScaleFactor", { pageScaleFactor: 2 });
  await expect.poll(() => page.evaluate(() => window.visualViewport?.scale ?? 1)).toBe(2);
  await expectLandingControls(page);
  const pageScaleEvidence = resolve(
    process.cwd(),
    "docs/qa/latest/animal-surface-pilot/landing-1280x1024-page-scale-200.png",
  );
  mkdirSync(dirname(pageScaleEvidence), { recursive: true });
  await page.screenshot({ path: pageScaleEvidence });
  await devtools.send("Emulation.setPageScaleFactor", { pageScaleFactor: 1 });

  // Browser zoom also halves the available CSS viewport. This second check
  // proves the 1280 by 1024 layout reflows correctly at that 200% boundary.
  await page.setViewportSize({ height: 512, width: 640 });
  await page.goto("/");
  await expectCompanionSemantics(page, "landing");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(1);
  await expectLandingControls(page);
  const zoomEvidence = resolve(
    process.cwd(),
    "docs/qa/latest/animal-surface-pilot/landing-1280x1024-zoom-200.png",
  );
  mkdirSync(dirname(zoomEvidence), { recursive: true });
  await page.screenshot({ path: zoomEvidence });
});

test("public companion stays outside keyboard focus and the accessibility name graph", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium-desktop",
    "Chromium supplies the canonical keyboard and accessibility-tree evidence.",
  );
  await page.setViewportSize({ height: 844, width: 390 });
  await openLanding(page);
  const placement = page.locator(".quiet-studio");
  for (let step = 0; step < 8; step += 1) {
    await page.keyboard.press("Tab");
    expect(
      await placement.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    ).toBe(false);
  }
  const ariaGraph = await page.locator("body").ariaSnapshot();
  expect(ariaGraph).not.toContain("planning-hedgehog");
  expect(ariaGraph).not.toContain("illustrations/companions");
  expect(ariaGraph).not.toContain("illustrations/quiet-set");
});
