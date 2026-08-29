import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type BrowserContextOptions,
  type Locator,
  type Page,
  type Request,
  type TestInfo,
} from "@playwright/test";

import {
  HARNESS_SCENARIO_HEADER,
  HARNESS_SCOPE_HEADER,
  HARNESS_VIEWER_HEADER,
} from "../fixtures/authenticated-app/server/harness-context";
import type { ProfileProgramReadModel } from "@/server/repositories/profile-program";

type OpenHarnessPage = Readonly<{
  close: () => Promise<void>;
  failedResponses: string[];
  page: Page;
}>;

type ResumeReadModel = Readonly<{
  setLogs: readonly Readonly<{
    measurement: Readonly<{
      distanceMeters?: number;
      durationSeconds?: number;
      kind: string;
    }>;
  }>[];
}>;

function projectContextOptions(testInfo: TestInfo): BrowserContextOptions {
  const projectUse = testInfo.project.use;
  const viewport = projectUse.viewport;
  if (
    !viewport ||
    typeof viewport !== "object" ||
    typeof viewport.width !== "number" ||
    typeof viewport.height !== "number"
  ) {
    throw new Error(`Authenticated project ${testInfo.project.name} requires an explicit viewport.`);
  }
  return {
    ...(typeof projectUse.deviceScaleFactor === "number"
      ? { deviceScaleFactor: projectUse.deviceScaleFactor }
      : {}),
    ...(typeof projectUse.hasTouch === "boolean" ? { hasTouch: projectUse.hasTouch } : {}),
    ...(typeof projectUse.isMobile === "boolean" ? { isMobile: projectUse.isMobile } : {}),
    ...(typeof projectUse.userAgent === "string" ? { userAgent: projectUse.userAgent } : {}),
    viewport: { height: viewport.height, width: viewport.width },
  };
}

function harnessHeaders(scope: string): Record<string, string> {
  return {
    [HARNESS_SCENARIO_HEADER]: "ready",
    [HARNESS_SCOPE_HEADER]: scope,
    [HARNESS_VIEWER_HEADER]: "alice",
  };
}

function isSupersededNextFlightRequest(request: Request): boolean {
  const url = new URL(request.url());
  return (
    request.method() === "GET" &&
    url.searchParams.has("_rsc") &&
    request.headers()["rsc"] === "1" &&
    ["net::ERR_ABORTED", "cancelled"].includes(request.failure()?.errorText ?? "")
  );
}

async function createHarnessContext(
  browser: Browser,
  scope: string,
  testInfo: TestInfo,
): Promise<BrowserContext> {
  const context = await browser.newContext(projectContextOptions(testInfo));
  await context.route(/^http:\/\/127\.0\.0\.1:\d+\//, async (route) => {
    await route.continue({
      headers: { ...route.request().headers(), ...harnessHeaders(scope) },
    });
  });
  await context.route(/^https:\/\/www\.youtube-nocookie\.com\/embed\//, async (route) => {
    await route.fulfill({
      body: "<!doctype html><html lang=\"en\"><title>External demo omitted from authenticated harness</title></html>",
      contentType: "text/html; charset=utf-8",
      headers: { "cache-control": "no-store" },
      status: 200,
    });
  });
  return context;
}

async function openHarnessPage(
  browser: Browser,
  scope: string,
  testInfo: TestInfo,
): Promise<OpenHarnessPage> {
  const context = await createHarnessContext(browser, scope, testInfo);
  const page = await context.newPage();
  const errors: string[] = [];
  const failedRequests: string[] = [];
  const failedResponses: string[] = [];

  page.on("console", (message) => {
    if (
      (message.type() === "error" || message.type() === "warning") &&
      !message.text().startsWith("Failed to load resource: the server responded with a status of")
    ) {
      errors.push(message.text());
    }
  });
  page.on("pageerror", (error) => errors.push(error.message));
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

  return {
    close: async () => {
      expect(errors).toEqual([]);
      expect(failedRequests).toEqual([]);
      await context.close();
    },
    failedResponses,
    page,
  };
}

async function assertAccessible(page: Page) {
  const results = await new AxeBuilder({ page })
    .exclude('iframe[src*="youtube-nocookie.com"]')
    .analyze();
  expect(
    results.violations.filter((violation) =>
      ["critical", "serious"].includes(violation.impact ?? ""),
    ),
  ).toEqual([]);
}

async function privateRequest(page: Page, path: string) {
  return page.evaluate(async (requestPath) => {
    const response = await fetch(requestPath, {
      cache: "no-store",
      credentials: "same-origin",
    });
    return {
      body: await response.json(),
      cacheControl: response.headers.get("cache-control"),
      status: response.status,
    };
  }, path);
}

async function readProfileProgram(page: Page): Promise<ProfileProgramReadModel> {
  const response = await privateRequest(page, "/api/app/profile-program");
  expect(response.status).toBe(200);
  expect(response.cacheControl).toContain("no-store");
  const body = response.body as { profileProgram?: unknown };
  if (typeof body.profileProgram !== "object" || body.profileProgram === null) {
    throw new Error("The authenticated fixture profile-program response is malformed.");
  }
  return body.profileProgram as ProfileProgramReadModel;
}

async function submitOnboarding(page: Page) {
  const responsePromise = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/app/profile-program/onboard" &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Start with example" }).click();
  return responsePromise;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

async function chooseMovement(page: Page, query: string, name: string) {
  const chooser = page.getByRole("dialog", { name: "Add movement" });
  await chooser.getByRole("searchbox", { name: "Search movements" }).fill(query);
  const result = chooser.getByRole("button", {
    name: new RegExp(
      `^${escapeRegExp(name)} (?:weight reps|bodyweight reps|duration|distance duration) ·`,
      "u",
    ),
  });
  await expect(result).toHaveCount(1);
  await result.click();
  await chooser.getByRole("button", { name: "Use this movement" }).click();
}

async function addMovement(page: Page, section: Locator, query: string, name: string) {
  await section.getByRole("button", { name: "Add movement" }).click();
  await chooseMovement(page, query, name);
}

function prescriptionRow(page: Page, section: Locator, name: string) {
  return section
    .locator("li.program-editor-prescription")
    .filter({ has: page.getByRole("heading", { level: 3, name }) });
}

function workoutApiPath(workoutUrl: string): string {
  const sessionId = new URL(workoutUrl).pathname.split("/").at(-1);
  if (!sessionId) throw new Error("The workout session URL is malformed.");
  return `/api/app/workouts/${sessionId}`;
}

test("a verified member publishes, reloads, and starts all owned logging shapes", async ({
  browser,
}, testInfo) => {
  test.slow();
  const scope = `${testInfo.project.name}-library-core-conditioning`;
  const alice = await openHarnessPage(browser, scope, testInfo);

  await alice.page.goto("/app");
  expect((await submitOnboarding(alice.page)).status()).toBe(201);
  await expect(alice.page.getByRole("heading", { name: "Choose a training day" })).toBeVisible();
  await alice.page.waitForLoadState("networkidle");
  const onboarded = await readProfileProgram(alice.page);
  const usesImperialUnits = onboarded.preferences.unitSystem === "imperial";
  const targetDistanceInput = usesImperialUnits ? "0.025" : "40";
  const expectedTargetDistanceM = usesImperialUnits ? 0.025 * 1_609.344 : 40;
  const runnerDistanceInput = usesImperialUnits ? "0.015" : "24";
  const expectedRunnerDistanceM = usesImperialUnits ? 0.015 * 1_609.344 : 24;
  const targetDistanceLabel = usesImperialUnits ? "Target miles" : "Target metres";
  const runnerDistanceLabel = usesImperialUnits ? "Distance (mi)" : "Distance (meters)";
  await alice.page.goto("/app/program/edit");

  const section = alice.page.locator("fieldset.program-editor-section").first();
  await addMovement(alice.page, section, "DB clean", "Dumbbell clean");
  await addMovement(alice.page, section, "Crunch", "Crunch");
  await addMovement(alice.page, section, "flutter kicks", "Flutter kick");
  await addMovement(alice.page, section, "farmers walk", "Dumbbell farmer carry");

  const clean = prescriptionRow(alice.page, section, "Dumbbell clean");
  const crunch = prescriptionRow(alice.page, section, "Crunch");
  const flutter = prescriptionRow(alice.page, section, "Flutter kick");
  const carry = prescriptionRow(alice.page, section, "Dumbbell farmer carry");

  await expect(clean.getByText("strength · weight reps", { exact: true })).toBeVisible();
  await expect(clean.getByLabel("Minimum reps")).toHaveValue("8");
  await expect(clean.getByLabel("Maximum reps")).toHaveValue("12");
  await expect(crunch.getByText("strength · bodyweight reps", { exact: true })).toBeVisible();
  await expect(crunch.getByLabel("Minimum reps")).toHaveValue("8");
  await expect(crunch.getByLabel("Maximum reps")).toHaveValue("12");
  await expect(flutter.getByText("strength · duration", { exact: true })).toBeVisible();
  await expect(flutter.getByLabel("Minimum seconds")).toHaveValue("20");
  await expect(flutter.getByLabel("Maximum seconds")).toHaveValue("45");
  await expect(carry.getByText("strength · distance duration", { exact: true })).toBeVisible();
  await expect(carry.getByLabel("Minimum seconds")).toHaveValue("20");
  await expect(carry.getByLabel("Maximum seconds")).toHaveValue("45");
  await expect(carry.getByLabel(targetDistanceLabel)).toHaveValue("");

  let publishRequests = 0;
  alice.page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      new URL(request.url()).pathname === "/api/app/program/publish"
    ) {
      publishRequests += 1;
    }
  });
  await alice.page.getByRole("button", { name: "Publish new revision" }).click();
  await expect(alice.page.locator(".program-editor-errors")).toContainText(
    "Dumbbell farmer carry needs a positive distance target before publication.",
  );
  expect(publishRequests).toBe(0);

  await carry.getByLabel(targetDistanceLabel).fill(targetDistanceInput);
  await carry.getByLabel(targetDistanceLabel).press("Tab");
  await assertAccessible(alice.page);
  await alice.page.screenshot({
    fullPage: true,
    path: `docs/qa/wave-2-core-conditioning-expansion/library-core-conditioning-editor-${testInfo.project.name}.png`,
  });

  const publishResponse = alice.page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/app/program/publish" &&
      response.request().method() === "POST",
  );
  const refreshedEditorResponse = alice.page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      response.request().method() === "GET" &&
      response.request().headers()["rsc"] === "1" &&
      url.pathname === "/app/program/edit" &&
      url.searchParams.has("_rsc")
    );
  });
  await alice.page.getByRole("button", { name: "Publish new revision" }).click();
  expect((await publishResponse).status()).toBe(200);
  expect(publishRequests).toBe(1);
  await expect(alice.page.getByText(/Published revision 2/u)).toBeVisible();
  expect((await refreshedEditorResponse).status()).toBe(200);

  await alice.page.reload();
  for (const name of ["Dumbbell clean", "Crunch", "Flutter kick", "Dumbbell farmer carry"]) {
    await expect(alice.page.getByRole("heading", { level: 3, name })).toBeVisible();
  }
  const profile = await readProfileProgram(alice.page);
  const activeProgram = profile.activeProgram;
  if (!activeProgram) throw new Error("The published Wave 2 routine is unavailable.");
  const day = activeProgram.days[0];
  if (!day) throw new Error("The published Wave 2 day is unavailable.");
  const ownedPrescriptions = day.prescriptions.filter(({ exercise }) =>
    ["dumbbell-clean", "crunch", "flutter-kick", "dumbbell-farmer-carry"].includes(
      exercise.slug,
    ),
  );
  expect(
    ownedPrescriptions.map(({ exercise }) => [exercise.slug, exercise.loggingKind]),
  ).toEqual([
    ["dumbbell-clean", "weight_reps"],
    ["crunch", "bodyweight_reps"],
    ["flutter-kick", "duration"],
    ["dumbbell-farmer-carry", "distance_duration"],
  ]);
  const publishedCarry = ownedPrescriptions.find(
    ({ exercise }) => exercise.slug === "dumbbell-farmer-carry",
  );
  expect(publishedCarry).toMatchObject({
    maximumSeconds: 45,
    minimumSeconds: 20,
  });
  expect(publishedCarry?.targetDistanceM).toBeCloseTo(expectedTargetDistanceM, 3);

  await alice.page.goto(`/app/program/${day.dayKey}`);
  const startResponse = alice.page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/app/workouts" &&
      response.request().method() === "POST",
  );
  await alice.page.getByRole("button", { name: "Start or resume workout" }).click();
  expect((await startResponse).status()).toBe(201);
  await expect(alice.page).toHaveURL(/\/workout\/[0-9a-f-]+$/u);
  const workoutUrl = alice.page.url();

  await alice.page.getByRole("button", { name: /Dumbbell farmer carry/u }).click();
  await expect(alice.page.getByRole("heading", { level: 2, name: "Dumbbell farmer carry" })).toBeVisible();
  await expect(alice.page.getByRole("heading", { name: "Technique guidance" })).toBeVisible();
  await expect(alice.page.getByText("Unavailable", { exact: true })).toBeVisible();
  await expect(
    alice.page.getByText(
      "No approved catalog pair is available for this movement. Workout logging remains available.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(alice.page.locator("iframe")).toHaveCount(0);

  await alice.page.getByLabel(runnerDistanceLabel).fill(runnerDistanceInput);
  await alice.page.getByLabel("Duration (seconds)").fill("35");
  const saveResponse = alice.page.waitForResponse(
    (response) =>
      /\/api\/app\/workouts\/[^/]+\/operations$/u.test(new URL(response.url()).pathname) &&
      response.request().method() === "POST",
  );
  await alice.page.getByRole("button", { name: "Save set" }).click();
  expect((await saveResponse).status()).toBe(200);
  await expect(alice.page.getByText("Saved", { exact: true }).last()).toBeVisible();

  const resumed = await privateRequest(alice.page, workoutApiPath(workoutUrl));
  expect(resumed.status).toBe(200);
  expect(resumed.cacheControl).toContain("no-store");
  const savedCarrySet = (resumed.body as ResumeReadModel).setLogs.find(
    ({ measurement }) => measurement.kind === "distance_duration",
  );
  expect(savedCarrySet?.measurement).toMatchObject({
    durationSeconds: 35,
    kind: "distance_duration",
  });
  expect(savedCarrySet?.measurement.distanceMeters).toBeCloseTo(
    expectedRunnerDistanceM,
    3,
  );
  await assertAccessible(alice.page);
  await alice.page.screenshot({
    fullPage: true,
    path: `docs/qa/wave-2-core-conditioning-expansion/library-core-conditioning-runner-${testInfo.project.name}.png`,
  });

  expect(alice.failedResponses).toEqual([]);
  await alice.page.evaluate(() => fetch("/api/harness/scope", { method: "DELETE" }));
  await alice.close();
});
