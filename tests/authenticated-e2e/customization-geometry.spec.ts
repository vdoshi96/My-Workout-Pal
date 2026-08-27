import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page, type Request } from "@playwright/test";

import {
  HARNESS_SCENARIO_HEADER,
  HARNESS_SCOPE_HEADER,
  HARNESS_VIEWER_HEADER,
} from "../fixtures/authenticated-app/server/harness-context";

async function assertAccessible(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((violation) =>
      ["critical", "serious"].includes(violation.impact ?? ""),
    ),
  ).toEqual([]);
}

function isSupersededNextFlightRequest(request: Request): boolean {
  // A newer App Router navigation may supersede an in-flight RSC payload.
  // Assets, documents, APIs, non-RSC fetches, and other failure texts remain fatal.
  const url = new URL(request.url());
  return (
    request.method() === "GET" &&
    url.searchParams.has("_rsc") &&
    request.headers()["rsc"] === "1" &&
    ["net::ERR_ABORTED", "cancelled"].includes(request.failure()?.errorText ?? "")
  );
}

async function assertViewportGeometry(page: Page) {
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("The authenticated geometry project requires a viewport.");
  const geometry = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    mainRight: document.querySelector("main")?.getBoundingClientRect().right ?? 0,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(geometry.clientWidth).toBe(viewport.width);
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth);
  expect(geometry.mainRight).toBeLessThanOrEqual(viewport.width + 1);
}

async function assertDialogFitsViewport(page: Page) {
  const viewport = page.viewportSize();
  const dialog = page.getByRole("dialog");
  const box = await dialog.boundingBox();
  if (!viewport || !box) throw new Error("The expected authenticated review dialog is unavailable.");
  const viewportHeight = viewport.height;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box.height).toBeLessThanOrEqual(viewportHeight + 1);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(viewportHeight + 1);
  await expect(dialog).toBeVisible();

  async function assertReachable(control: Locator) {
    await control.scrollIntoViewIfNeeded();
    await expect(control).toBeVisible();
    const controlBox = await control.boundingBox();
    if (!controlBox) throw new Error("A required dialog control has no rendered box.");
    expect(controlBox.y).toBeGreaterThanOrEqual(0);
    expect(controlBox.y + controlBox.height).toBeLessThanOrEqual(viewportHeight + 1);
  }

  await assertReachable(dialog.getByRole("heading").first());
  await assertReachable(dialog.getByRole("button").last());
}

async function assertMemberTargets(page: Page) {
  const sizes = await page.locator(".member-nav a").evaluateAll((links) =>
    links.map((link) => {
      const box = link.getBoundingClientRect();
      return { height: box.height, width: box.width };
    }),
  );
  expect(sizes).toHaveLength(5);
  for (const size of sizes) {
    expect(size.height).toBeGreaterThanOrEqual(44);
    expect(size.width).toBeGreaterThanOrEqual(44);
  }
}

async function assertMaterialTarget(control: Locator) {
  const box = await control.boundingBox();
  if (!box) throw new Error("A material authenticated control has no rendered box.");
  expect(box.height).toBeGreaterThanOrEqual(44);
  expect(box.width).toBeGreaterThanOrEqual(44);
}

test("customization surfaces preserve geometry and media preferences", async ({
  browserName,
  context,
  page,
}, testInfo) => {
  const scope = `${testInfo.project.name}-customization-geometry`;
  const consoleErrors: string[] = [];
  const failedResponses: string[] = [];
  const failedRequests: string[] = [];

  await context.route(/^http:\/\/127\.0\.0\.1:\d+\//u, async (route) => {
    await route.continue({
      headers: {
        ...route.request().headers(),
        [HARNESS_SCENARIO_HEADER]: "ready",
        [HARNESS_SCOPE_HEADER]: scope,
        [HARNESS_VIEWER_HEADER]: "alice",
      },
    });
  });
  await context.route(/^https:\/\/www\.youtube-nocookie\.com\/embed\//u, async (route) => {
    await route.fulfill({ body: "<!doctype html><title>Fixture video</title>", status: 200 });
  });
  page.on("console", (message) => {
    if (
      (message.type() === "error" || message.type() === "warning") &&
      !message.text().startsWith("Failed to load resource: the server responded with a status of")
    ) {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400) {
      failedResponses.push(
        `${response.request().method()} ${new URL(response.url()).pathname} ${response.status()}`,
      );
    }
  });
  page.on("requestfailed", (request) => {
    const url = new URL(request.url());
    if (url.hostname === "127.0.0.1" && !isSupersededNextFlightRequest(request)) {
      failedRequests.push(
        `${request.method()} ${url.pathname} ${request.failure()?.errorText ?? "unknown request failure"}`,
      );
    }
  });

  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/app");
  const mobileProject = /-(?:phone|tablet)$/u.test(testInfo.project.name);
  expect(testInfo.project.use.hasTouch).toBe(mobileProject);
  expect(testInfo.project.use.isMobile).toBe(mobileProject);
  const deviceSemantics = await page.evaluate(() => ({
    coarsePointer: matchMedia("(pointer: coarse)").matches,
    maxTouchPoints: navigator.maxTouchPoints,
    userAgent: navigator.userAgent,
  }));
  if (mobileProject) {
    expect(deviceSemantics.userAgent).toMatch(/Android|iPad|iPhone|Mobile/iu);
    if (browserName === "chromium") {
      expect(deviceSemantics.maxTouchPoints).toBeGreaterThan(0);
      expect(deviceSemantics.coarsePointer).toBe(true);
    }
  } else {
    expect(deviceSemantics.maxTouchPoints).toBe(0);
    expect(deviceSemantics.coarsePointer).toBe(false);
  }
  await expect(page.getByRole("heading", { name: "Build your starter route" })).toBeVisible();
  await page.getByLabel("Time zone").fill("America/Chicago");
  const onboardingResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/app/profile-program/onboard" &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Create my program" }).click();
  expect((await onboardingResponse).status()).toBe(201);
  await expect(page.getByRole("heading", { name: "Choose a training day" })).toBeVisible();

  expect(
    await page.evaluate(() => ({
      dark: matchMedia("(prefers-color-scheme: dark)").matches,
      paper: getComputedStyle(document.documentElement).getPropertyValue("--paper").trim(),
      reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
      scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
    })),
  ).toEqual({ dark: true, paper: "#0b252b", reduced: true, scrollBehavior: "auto" });
  await assertViewportGeometry(page);
  await assertMemberTargets(page);
  await assertAccessible(page);

  await page.getByRole("link", { name: /Manage programs/ }).click();
  await expect(page.getByRole("heading", { name: "Your routes" })).toBeVisible();
  await expect(page.getByLabel("Program name")).toHaveAttribute("maxlength", "80");
  const cloneButton = page.getByRole("button", { name: "Clone" }).first();
  await assertMaterialTarget(cloneButton);
  await cloneButton.click();
  await expect(page.getByRole("heading", { name: /Clone Five-day starter route/ })).toBeVisible();
  await expect(page.getByLabel("New program name")).toHaveAttribute("maxlength", "80");
  await assertDialogFitsViewport(page);
  await assertViewportGeometry(page);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();

  await page.goto("/app/program/edit");
  await expect(page.getByRole("heading", { name: "Edit your route" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Core section is required on every day" }),
  ).toBeDisabled();
  const accessorySection = page
    .locator("fieldset.program-editor-section")
    .filter({ has: page.getByLabel("Section name for accessory") });
  const accessoryName = await accessorySection.getByLabel("Section name for accessory").inputValue();
  const removeAccessory = accessorySection.getByRole("button", {
    name: `Remove ${accessoryName} section`,
  });
  await assertMaterialTarget(removeAccessory);
  await assertMaterialTarget(accessorySection.getByRole("button", { name: "Add movement" }));
  await removeAccessory.click();
  await expect(page.getByRole("heading", { name: `Remove ${accessoryName}?` })).toBeVisible();
  await assertDialogFitsViewport(page);
  await assertViewportGeometry(page);
  await assertAccessible(page);
  await page.getByRole("button", { name: "Keep section" }).click();

  await page.goto("/app");
  const barbellButton = page.getByRole("button", { name: /Barbell \+ rack/ });
  await assertMaterialTarget(barbellButton);
  await barbellButton.click();
  await expect(page.getByRole("heading", { name: "Review Barbell + rack" })).toBeVisible();
  await assertViewportGeometry(page);
  await assertAccessible(page);
  await page.getByRole("button", { name: "Cancel" }).click();

  await page.goto("/app/settings");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await expect(page.getByLabel("Display units")).toHaveValue("imperial");
  await assertMaterialTarget(page.getByRole("button", { name: "Save preferences" }));
  await assertViewportGeometry(page);

  await page.goto("/app/library/custom/new");
  await expect(page.getByRole("heading", { name: "Create a movement" })).toBeVisible();
  await expect(page.getByLabel("Exercise name")).toBeVisible();
  await expect(page.getByLabel("Instructions")).toBeVisible();
  await assertMaterialTarget(page.getByRole("button", { name: "Create exercise" }));
  await assertViewportGeometry(page);
  await assertAccessible(page);

  await page.goto("/app/prs");
  await expect(page.getByRole("heading", { name: "Personal records" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Review history" })).toBeVisible();
  await assertViewportGeometry(page);

  await page.goto("/app/progress");
  await expect(page.getByRole("heading", { name: "Progress" })).toBeVisible();
  await assertViewportGeometry(page);
  await assertAccessible(page);

  if (browserName === "chromium") {
    await page.emulateMedia({
      colorScheme: "dark",
      forcedColors: "active",
      reducedMotion: "reduce",
    });
    expect(await page.evaluate(() => matchMedia("(forced-colors: active)").matches)).toBe(true);
    const progressLink = page.getByRole("link", { name: "Progress", exact: true });
    await progressLink.focus();
    await expect(progressLink).toBeFocused();
    expect(
      await progressLink.evaluate((element) => {
        const style = getComputedStyle(element);
        return Number.parseFloat(style.outlineWidth) >= 2 && style.outlineStyle !== "none";
      }),
    ).toBe(true);
    await assertViewportGeometry(page);
  }

  expect(failedResponses).toEqual([]);
  expect(failedRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);
  await page.evaluate(async () => {
    const response = await fetch("/api/harness/scope", { method: "DELETE" });
    if (!response.ok) throw new Error("The synthetic geometry scope could not be removed.");
  });
});
