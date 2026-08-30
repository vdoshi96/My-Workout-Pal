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

async function expectNoHorizontalOverlap(first: Locator, second: Locator) {
  const [firstBox, secondBox] = await Promise.all([
    visibleBox(first),
    visibleBox(second),
  ]);
  expect(
    firstBox.x + firstBox.width <= secondBox.x + 1 ||
      secondBox.x + secondBox.width <= firstBox.x + 1,
  ).toBe(true);
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
  const placement = page.locator(`[data-companion-placement="${variant}"]`);
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
  await expectPointerInert(placement);
  return placement;
}

async function headingWordLines(heading: Locator) {
  return heading.evaluate((element) => {
    const textNode = element.firstChild;
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
      throw new Error("Landing heading must remain one text node for line measurement.");
    }
    const text = textNode.textContent ?? "";
    const tokens = ["Your", "workout.", "Your", "way."];
    let cursor = 0;
    return tokens.map((token) => {
      const start = text.indexOf(token, cursor);
      if (start < 0) throw new Error(`Missing heading token: ${token}`);
      cursor = start + token.length;
      const range = document.createRange();
      range.setStart(textNode, start);
      range.setEnd(textNode, cursor);
      return Math.round(range.getBoundingClientRect().top);
    });
  });
}

async function openLanding(page: Page) {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Your workout. Your way." }),
  ).toBeVisible();
  const placement = await expectCompanionSemantics(page, "landing");
  if ((await page.viewportSize())!.width >= 1024) {
    await expectNoHorizontalOverlap(page.locator(".landing-copy"), placement);
  } else {
    await expectNoIntersection(page.locator(".landing-copy"), placement);
  }
}

test("landing first viewport reproduces the selected board hierarchy", async ({
  browserName,
  page,
}) => {
  test.skip(browserName !== "chromium", "The canonical reproduction uses Chromium.");
  test.setTimeout(60_000);

  await page.setViewportSize({ height: 1024, width: 1536 });
  await openLanding(page);
  const lines = await headingWordLines(
    page.getByRole("heading", { level: 1, name: "Your workout. Your way." }),
  );
  const [yourLine, workoutLine, secondYourLine, wayLine] = lines;
  expect(yourLine).toBeDefined();
  expect(workoutLine).toBeDefined();
  expect(secondYourLine).toBeDefined();
  expect(wayLine).toBeDefined();
  expect(yourLine).toBe(workoutLine);
  expect(secondYourLine).toBe(wayLine);
  expect(secondYourLine!).toBeGreaterThan(yourLine!);
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
    copy: ".landing-copy",
    heading: "Your workout. Your way.",
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
      await expectNoIntersection(placement, page.locator(surface.copy));
      await expectNoIntersection(placement, page.locator(".public-header"));
      await expectNoIntersection(placement, page.locator(".public-nav"));
      if (surface.path === "/") {
        await expectNoIntersection(placement, page.locator(".landing-actions"));
      } else {
        await expect(
          page.getByText("Sample data · not your history", { exact: true }),
        ).toHaveCount(1);
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
    await expectNoIntersection(placement, page.locator(".public-nav"));

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
    const placement = page.locator(
      `[data-companion-placement="${surface.variant}"]`,
    );
    await expect(placement).toBeHidden();
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
    const placement = page.locator(
      `[data-companion-placement="${surface.variant}"]`,
    );
    await expectCompanionSemantics(page, surface.variant);
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
  await expectNoIntersection(
    page.locator('[data-companion-placement="landing"]'),
    page.locator(".landing-actions"),
  );
  await expectNoIntersection(
    page.locator('[data-companion-placement="landing"]'),
    page.locator(".public-nav"),
  );
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
  await expectNoIntersection(
    page.locator('[data-companion-placement="landing"]'),
    page.locator(".landing-actions"),
  );
  await expectNoIntersection(
    page.locator('[data-companion-placement="landing"]'),
    page.locator(".public-nav"),
  );
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
  const placement = page.locator('[data-companion-placement="landing"]');
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
});
