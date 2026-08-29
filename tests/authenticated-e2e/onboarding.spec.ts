import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type BrowserContextOptions,
  type Page,
  type Request,
  type TestInfo,
} from "@playwright/test";

import {
  HARNESS_SCENARIO_HEADER,
  HARNESS_SCOPE_HEADER,
  HARNESS_VIEWER_HEADER,
  type HarnessScenario,
} from "../fixtures/authenticated-app/server/harness-context";
import type { ProfileProgramReadModel } from "@/server/repositories/profile-program";

type ActiveProgramIds = Readonly<{ id: string; revisionId: string }>;
type HarnessScopeSummary = Readonly<{
  counts: Readonly<{
    customExercises: number;
    personalRecords: number;
    preferences: number;
    prescriptions: number;
    programRevisions: number;
    programRoots: number;
    programSections: number;
    progressSources: number;
    workoutSnapshots: number;
  }>;
  programs: number;
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

function headers(
  scope: string,
  viewer: "alice" | "alice-unverified" | "bob",
  scenario: HarnessScenario = "ready",
): Record<string, string> {
  return {
    [HARNESS_SCENARIO_HEADER]: scenario,
    [HARNESS_SCOPE_HEADER]: scope,
    [HARNESS_VIEWER_HEADER]: viewer,
  };
}

function isSupersededNextFlightRequest(request: Request): boolean {
  // Next cancels an in-flight RSC payload when a newer client navigation wins.
  // Only that exact flight-request cancellation is non-fatal; every other
  // first-party request failure remains evidence of a broken flow.
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
  viewer: "alice" | "alice-unverified" | "bob",
  testInfo: TestInfo,
  scenario: HarnessScenario = "ready",
): Promise<BrowserContext> {
  const context = await browser.newContext(projectContextOptions(testInfo));
  await context.route(/^http:\/\/127\.0\.0\.1:\d+\//, async (route) => {
    await route.continue({
      headers: { ...route.request().headers(), ...headers(scope, viewer, scenario) },
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

async function openPage(
  browser: Browser,
  scope: string,
  viewer: "alice" | "alice-unverified" | "bob",
  testInfo: TestInfo,
  scenario: HarnessScenario = "ready",
): Promise<Readonly<{
  close: () => Promise<void>;
  failedResponses: string[];
  failedRequests: string[];
  page: Page;
}>> {
  const context = await createHarnessContext(browser, scope, viewer, testInfo, scenario);
  const page = await context.newPage();
  const errors: string[] = [];
  const failedResponses: string[] = [];
  const failedRequests: string[] = [];
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
    failedRequests,
    failedResponses,
    page,
  };
}

async function assertAccessible(page: Page) {
  const results = await new AxeBuilder({ page })
    .exclude('iframe[src*="youtube-nocookie.com"]')
    .analyze();
  expect(results.violations.filter((violation) => ["critical", "serious"].includes(violation.impact ?? ""))).toEqual([]);
}

function activeProgramIds(body: unknown): ActiveProgramIds {
  if (typeof body !== "object" || body === null) throw new Error("Missing onboarding response body.");
  const profileProgram = (body as Record<string, unknown>)["profileProgram"];
  if (typeof profileProgram !== "object" || profileProgram === null) {
    throw new Error("Missing profile program response.");
  }
  const activeProgram = (profileProgram as Record<string, unknown>)["activeProgram"];
  if (typeof activeProgram !== "object" || activeProgram === null) {
    throw new Error("Missing active program response.");
  }
  const record = activeProgram as Record<string, unknown>;
  if (typeof record["id"] !== "string" || typeof record["revisionId"] !== "string") {
    throw new Error("Malformed active program identifiers.");
  }
  return { id: record["id"], revisionId: record["revisionId"] };
}

async function submitOnboarding(page: Page, profile: "barbell" | "dumbbells") {
  if (profile === "barbell") {
    await page.getByRole("radio", { name: /Barbell \+ rack/ }).check();
  }
  const responsePromise = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/app/profile-program/onboard" &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Save the five-day example" }).click();
  const response = await responsePromise;
  return { body: await response.json(), response };
}

async function privateMutation(page: Page, path: string, body: unknown) {
  return page.evaluate(
    async ({ body: requestBody, path: requestPath }) => {
      const csrf = await fetch("/api/auth/csrf", { cache: "no-store", credentials: "same-origin" });
      const csrfBody = (await csrf.json()) as { token?: unknown };
      if (typeof csrfBody.token !== "string") throw new Error("CSRF fixture failed");
      const response = await fetch(requestPath, {
        body: JSON.stringify(requestBody),
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfBody.token },
        method: "POST",
      });
      return {
        body: await response.json(),
        cacheControl: response.headers.get("cache-control"),
        status: response.status,
      };
    },
    { body, path },
  );
}

async function privateRead(page: Page, path: string) {
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
  const response = await privateRead(page, "/api/app/profile-program");
  expect(response.status).toBe(200);
  expect(response.cacheControl).toContain("no-store");
  const body = response.body as { profileProgram?: unknown };
  if (typeof body.profileProgram !== "object" || body.profileProgram === null) {
    throw new Error("The authenticated fixture profile-program response is malformed.");
  }
  return body.profileProgram as ProfileProgramReadModel;
}

function programDayMeaning(
  model: ProfileProgramReadModel,
  dayKey: string,
) {
  return model.activeProgram?.days
    .find((day) => day.dayKey === dayKey)
    ?.prescriptions.map((prescription) => ({
      catalogExerciseId: prescription.catalogExerciseId,
      customExerciseId: prescription.customExerciseId,
      label: prescription.label,
      measurementKind: prescription.measurementKind,
      notes: prescription.notes,
      restSeconds: prescription.restSeconds,
      setCount: prescription.setCount,
      targetDistanceM: prescription.targetDistanceM,
      targetWeightKg: prescription.targetWeightKg,
    }));
}

async function readScopeSummary(page: Page): Promise<HarnessScopeSummary> {
  return page.evaluate(async () => {
    const response = await fetch("/api/harness/scope", { cache: "no-store" });
    const body = (await response.json()) as Partial<HarnessScopeSummary>;
    if (
      !response.ok ||
      typeof body.programs !== "number" ||
      typeof body.counts !== "object" ||
      body.counts === null ||
      Object.values(body.counts).some((value) => typeof value !== "number")
    ) {
      throw new Error("The harness scope summary boundary failed.");
    }
    return body as HarnessScopeSummary;
  });
}

async function programCount(page: Page): Promise<number> {
  return (await readScopeSummary(page)).programs;
}

async function saveWeightSet(
  page: Page,
  weight: string,
  repetitions: string,
  activation: "keyboard" | "pointer" = "pointer",
) {
  await page.getByLabel("Weight (lb)").fill(weight);
  await page.getByLabel("Repetitions").fill(repetitions);
  const responsePromise = page.waitForResponse(
    (response) =>
      /\/api\/app\/workouts\/[^/]+\/operations$/u.test(new URL(response.url()).pathname) &&
      response.request().method() === "POST",
  );
  const saveButton = page.getByRole("button", { name: "Save set" });
  if (activation === "keyboard") {
    await saveButton.focus();
    await expect(saveButton).toBeFocused();
    await saveButton.press("Enter");
  } else {
    await saveButton.click();
  }
  return responsePromise;
}

async function submitRunnerAction(page: Page, name: string | RegExp) {
  const responsePromise = page.waitForResponse(
    (response) =>
      /\/api\/app\/workouts\/[^/]+\/operations$/u.test(new URL(response.url()).pathname) &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name }).click();
  return responsePromise;
}

async function completePullWorkoutForInsights(page: Page): Promise<string> {
  const pullDay = page.getByRole("link", { name: /Pull/ });
  await pullDay.focus();
  await expect(pullDay).toBeFocused();
  await pullDay.press("Enter");
  await expect(page).toHaveURL(/\/app\/program\/pull$/u);

  const startPromise = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/app/workouts" &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Start or resume workout" }).click();
  expect((await startPromise).status()).toBe(201);
  await expect(page).toHaveURL(/\/workout\/[0-9a-f-]+$/u);
  const sessionId = new URL(page.url()).pathname.split("/").at(-1);
  if (!sessionId) throw new Error("The fixture workout session ID is unavailable.");

  for (const [index, label] of [
    [0, /1 Work Not logged/],
    [1, /2 Work Not logged/],
    [2, /3 Work Not logged/],
  ] as const) {
    if (index > 0) await page.getByRole("button", { name: label }).click();
    expect((await saveWeightSet(page, "25", "12", index === 0 ? "keyboard" : "pointer")).status()).toBe(200);
  }
  expect((await submitRunnerAction(page, "Complete exercise")).status()).toBe(200);

  for (const exerciseName of [
    "One-arm dumbbell row",
    "Dumbbell pullover",
    "Dumbbell curl",
    "Bird dog",
    "Side plank",
  ]) {
    await page.getByRole("button", { name: new RegExp(exerciseName, "i") }).click();
    expect((await submitRunnerAction(page, "Skip exercise")).status()).toBe(200);
  }

  await page.getByRole("button", { name: /Walker/ }).click();
  await page.getByLabel("Duration (seconds)").last().fill("1200");
  await page.getByLabel("Distance (mi)").last().fill("1");
  await page.getByLabel("Incline (%)").fill("2");
  await page.getByLabel("Cardio notes").fill("Immutable QA walk");
  expect((await submitRunnerAction(page, "Save cardio")).status()).toBe(200);
  const completionPromise = submitRunnerAction(page, "Complete workout");
  await expect(page).toHaveURL(`/app/history/${sessionId}`);
  expect((await completionPromise).status()).toBe(200);
  await expect(page.getByText(/25 lb · 12 reps/i).first()).toBeVisible();
  await expect(page.locator(".history-sets > li")).toHaveCount(3);
  await expect(page.getByText("Immutable QA walk")).toBeVisible();
  await expect(page.getByText("Chest-supported dumbbell row", { exact: true })).toBeVisible();
  await expect(page.getByText("Dumbbells", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("55 lb", { exact: true })).toBeVisible();
  await expect(page.getByText("QA retained substitution note", { exact: true })).toBeVisible();
  await expect(page.getByText("20:00 / mi", { exact: true })).toBeVisible();
  return sessionId;
}

test("both synthetic owners onboard while unverified and foreign states fail closed", async ({ browser, browserName }, testInfo) => {
  const scope = testInfo.project.name;

  for (const scenario of ["expire-session", "revoke-session"] as const) {
    const rejected = await openPage(browser, scope, "alice", testInfo, scenario);
    await rejected.page.goto("/app");
    await expect(rejected.page.getByRole("heading", { name: "Sign in required" })).toBeVisible();
    expect(rejected.failedResponses).toEqual([]);
    await rejected.close();
  }

  const unverified = await openPage(browser, scope, "alice-unverified", testInfo);
  await unverified.page.goto("/app");
  await expect(unverified.page.getByText("Read-only account.")).toBeVisible();
  await expect(unverified.page.getByRole("button", { name: "Save the five-day example" })).toBeDisabled();
  await assertAccessible(unverified.page);
  expect(unverified.failedResponses).toEqual([]);
  await unverified.close();

  const alice = await openPage(browser, scope, "alice", testInfo);
  await alice.page.goto("/app");
  await alice.page.keyboard.press(browserName === "webkit" ? "Alt+Tab" : "Tab");
  const skipLink = alice.page.getByRole("link", { name: "Skip to content" });
  await expect(skipLink).toBeFocused();
  await skipLink.press("Enter");
  await expect(alice.page).toHaveURL(/#main-content$/);
  await expect(alice.page.locator("#main-content")).toBeFocused();
  const aliceOnboarding = await submitOnboarding(alice.page, "dumbbells");
  expect(aliceOnboarding.response.status()).toBe(201);
  const aliceProgram = activeProgramIds(aliceOnboarding.body);
  await expect(alice.page.getByRole("heading", { name: "Choose a training day" })).toBeVisible();
  await expect(alice.page.getByRole("heading", { name: "Welcome back, Alice QA" })).toBeVisible();
  await expect(alice.page.getByText("No completed workouts yet")).toBeVisible();
  await expect(alice.page.getByRole("link", { name: "Manage routines" })).toBeVisible();
  await expect(alice.page.getByRole("link", { name: "Edit routine" })).toBeVisible();
  await expect(
    alice.page.locator(".member-program-actions").getByRole("link", { name: "Library", exact: true }),
  ).toHaveAttribute("href", "/app/library");
  await expect(alice.page.getByRole("link", { name: "Review history" })).toHaveAttribute("href", "/app/history");
  await expect(alice.page.getByRole("link", { name: "Open progress" })).toHaveAttribute("href", "/app/progress");
  await expect(alice.page.locator(".member-day-grid > li")).toHaveCount(5);
  await expect(alice.page.getByText("Revision 1 · Dumbbells · 5 days")).toBeVisible();
  await assertAccessible(alice.page);
  expect(await alice.page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(alice.failedResponses).toEqual([]);

  await alice.page.getByRole("link", { name: /Open Push to start/ }).click();
  const startResponse = alice.page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/app/workouts" &&
      response.request().method() === "POST",
  );
  await alice.page.getByRole("button", { name: "Start or resume workout" }).click();
  expect((await startResponse).status()).toBe(201);
  await expect(alice.page).toHaveURL(/\/workout\/[0-9a-f-]+$/u);
  const activeSessionPath = new URL(alice.page.url()).pathname;
  await alice.page.goto("/app");
  await expect(alice.page.getByRole("link", { name: "Resume Push" })).toHaveAttribute("href", activeSessionPath);
  await expect(alice.page.getByText("Workout in progress")).toBeVisible();
  await expect(alice.page.getByText("Open Push to start")).toHaveCount(0);
  await expect(alice.page.getByRole("link", { name: "Manage routines" })).toBeVisible();
  await assertAccessible(alice.page);

  const unverifiedActive = await openPage(browser, scope, "alice-unverified", testInfo);
  if (testInfo.project.name === "webkit-phone") {
    await unverifiedActive.page.setViewportSize({ width: 320, height: 700 });
  }
  await unverifiedActive.page.goto("/app");
  await expect(unverifiedActive.page.getByRole("heading", { name: "Verify to resume Push" })).toBeVisible();
  await expect(unverifiedActive.page.getByRole("link", { name: "Review Push", exact: true })).toHaveAttribute("href", activeSessionPath);
  await expect(unverifiedActive.page.getByText("Open Push to start")).toHaveCount(0);
  await expect(unverifiedActive.page.getByRole("link", { name: "Manage routines" })).toBeVisible();
  await expect(unverifiedActive.page.getByRole("link", { name: "Edit routine" })).toHaveCount(0);
  await assertAccessible(unverifiedActive.page);
  if (testInfo.project.name === "webkit-phone") {
    const narrowLayout = await unverifiedActive.page.evaluate(() => {
      const frame = document.querySelector<HTMLElement>(".member-frame");
      const nav = document.querySelector<HTMLElement>(".member-nav");
      return {
        clientWidth: document.documentElement.clientWidth,
        framePaddingBottom: frame ? Number.parseFloat(getComputedStyle(frame).paddingBottom) : 0,
        navHeight: nav?.getBoundingClientRect().height ?? 0,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });
    expect(narrowLayout.clientWidth).toBe(320);
    expect(narrowLayout.scrollWidth).toBeLessThanOrEqual(narrowLayout.clientWidth);
    expect(narrowLayout.framePaddingBottom).toBeGreaterThanOrEqual(narrowLayout.navHeight);
    const materialTargetSizes = await unverifiedActive.page
      .locator(".member-program-actions a, .member-resume-card a, .member-home-insight-links a")
      .evaluateAll((links) => links.map((link) => {
        const box = link.getBoundingClientRect();
        return { height: box.height, width: box.width };
      }));
    expect(materialTargetSizes.length).toBeGreaterThan(0);
    for (const size of materialTargetSizes) {
      expect(size.height).toBeGreaterThanOrEqual(44);
      expect(size.width).toBeGreaterThanOrEqual(44);
    }
  }

  const bob = await openPage(browser, scope, "bob", testInfo);
  await bob.page.goto("/app");
  const bobOnboarding = await submitOnboarding(bob.page, "barbell");
  expect(bobOnboarding.response.status()).toBe(201);
  await expect(bob.page.getByText("Revision 1 · Barbell + rack · 5 days")).toBeVisible();
  await expect(bob.page.locator(".member-day-grid > li")).toHaveCount(5);
  const bobProgramsBefore = await programCount(bob.page);

  const foreign = await privateMutation(bob.page, "/api/app/programs", {
    idempotencyKey: "bob-foreign-clone",
    mode: "clone",
    name: "Foreign copy",
    sourceProgramId: aliceProgram.id,
    sourceRevisionId: aliceProgram.revisionId,
  });
  const missing = await privateMutation(bob.page, "/api/app/programs", {
    idempotencyKey: "bob-missing-clone",
    mode: "clone",
    name: "Missing copy",
    sourceProgramId: "00000000-0000-4000-8000-000000000091",
    sourceRevisionId: "00000000-0000-4000-8000-000000000092",
  });
  expect(foreign).toEqual(missing);
  expect(foreign).toMatchObject({
    status: 404,
    body: { error: "not_found" },
  });
  expect(foreign.cacheControl).toContain("no-store");
  expect(await programCount(bob.page)).toBe(bobProgramsBefore);
  expect(bobProgramsBefore).toBe(1);
  expect(bob.failedResponses).toEqual([
    "POST /api/app/programs 404",
    "POST /api/app/programs 404",
  ]);
  await bob.page.reload();
  await expect(bob.page.getByRole("heading", { name: "Choose a training day" })).toBeVisible();
  await assertAccessible(bob.page);
  const evidenceName =
    testInfo.project.name === "chromium-desktop"
      ? "authenticated-dumbbells-desktop"
      : "authenticated-barbell-phone";
  const evidencePath = testInfo.outputPath(`${evidenceName}.png`);
  await (testInfo.project.name === "chromium-desktop" ? alice.page : unverifiedActive.page).screenshot({
    fullPage: true,
    path: evidencePath,
  });
  await testInfo.attach(evidenceName, { contentType: "image/png", path: evidencePath });

  await bob.page.evaluate(() => fetch("/api/harness/scope", { method: "DELETE" }));

  await bob.close();
  await unverifiedActive.close();
  await alice.close();
});

test("a failed onboarding retry keeps the same idempotency key and never claims success early", async ({ browser }, testInfo) => {
  const scope = `${testInfo.project.name}-retry`;
  const context = await createHarnessContext(
    browser,
    scope,
    "alice",
    testInfo,
    "fail-next-save",
  );
  const page = await context.newPage();
  const errors: string[] = [];
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
  await page.goto("/app");

  const first = await submitOnboarding(page, "dumbbells");
  expect(first.response.status()).toBe(500);
  await expect(page.getByText("The request could not be completed.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Start with the five-day example" })).toBeVisible();
  const firstBody = first.response.request().postDataJSON() as { idempotencyKey?: unknown };

  const retry = await submitOnboarding(page, "dumbbells");
  expect(retry.response.status()).toBe(201);
  const retryBody = retry.response.request().postDataJSON() as { idempotencyKey?: unknown };
  expect(retryBody.idempotencyKey).toBe(firstBody.idempotencyKey);
  await expect(page.getByRole("heading", { name: "Choose a training day" })).toBeVisible();

  await page.evaluate(() => fetch("/api/harness/scope", { method: "DELETE" }));

  expect(failedResponses).toEqual(["POST /api/app/profile-program/onboard 500"]);
  expect(errors).toEqual([]);
  await context.close();
});

test("imperial editor typing stays literal and browser Back protects a dirty draft", async ({ browser }, testInfo) => {
  const scope = `${testInfo.project.name}-editor-input-back`;
  const alice = await openPage(browser, scope, "alice", testInfo);
  await alice.page.goto("/app");
  expect((await submitOnboarding(alice.page, "dumbbells")).response.status()).toBe(201);

  await alice.page.getByRole("link", { name: /Edit routine/ }).click();
  await expect(alice.page).toHaveURL(/\/app\/program\/edit$/u);
  const targetWeight = alice.page.getByLabel("Target lb (optional)").first();
  await targetWeight.selectText();
  await targetWeight.pressSequentially("44.1");
  await expect(targetWeight).toHaveValue("44.1");
  await expect(alice.page.getByText("Unpublished changes")).toBeVisible();

  const barbellProfile = alice.page
    .getByRole("group", { name: "Equipment profile" })
    .getByRole("button", { name: /Barbell \+ rack/ });
  await barbellProfile.click();
  const equipmentReview = alice.page.getByRole("heading", { name: "Review Barbell + rack" });
  await expect(equipmentReview).toBeFocused();
  const reviewId = await barbellProfile.getAttribute("aria-controls");
  expect(reviewId).toBeTruthy();
  await expect(barbellProfile).toHaveAttribute("aria-expanded", "true");
  await expect(equipmentReview).toHaveAttribute("id", reviewId!);
  await expect(
    alice.page.getByText(/Your unpublished editor changes are not included/),
  ).toBeVisible();
  await expect(
    alice.page.getByRole("button", { name: "Confirm Barbell + rack" }),
  ).toBeDisabled();
  await alice.page.getByRole("button", { name: "Cancel" }).click();
  await expect(barbellProfile).toBeFocused();
  await expect(targetWeight).toHaveValue("44.1");

  alice.page.once("dialog", async (dialog) => {
    expect(dialog.type()).toBe("confirm");
    expect(dialog.message()).toBe("Discard this unpublished program draft?");
    await dialog.dismiss();
  });
  await alice.page.goBack();
  await expect(alice.page).toHaveURL(/\/app\/program\/edit$/u);
  await expect(targetWeight).toHaveValue("44.1");

  const cardioDistance = alice.page.getByLabel("Distance miles").first();
  await cardioDistance.selectText();
  await cardioDistance.pressSequentially("0.1");
  await expect(cardioDistance).toHaveValue("0.1");
  await expect(alice.page.getByText("Unpublished changes")).toBeVisible();
  await assertAccessible(alice.page);

  alice.page.once("dialog", async (dialog) => {
    expect(dialog.type()).toBe("confirm");
    await dialog.accept();
  });
  await alice.page.goBack();
  await expect(alice.page).toHaveURL(/\/app$/u);
  await expect(alice.page.getByRole("heading", { name: "Choose a training day" })).toBeVisible();

  await alice.page.goto("/app/library?q=not-a-movement&q=squat");
  await expect(alice.page.getByRole("heading", { name: "Exercise library" })).toBeVisible();
  await expect(alice.page.getByLabel("Search movements")).toHaveValue("");
  await expect(alice.page.getByText("No compatible match")).toHaveCount(0);

  expect(alice.failedResponses).toEqual([]);
  await alice.page.evaluate(() => fetch("/api/harness/scope", { method: "DELETE" }));
  await alice.close();
});

test("owned customization publishes once, preserves history, and derives private insights", async ({ browser }, testInfo) => {
  test.slow();
  const scope = `${testInfo.project.name}-custom-insights`;
  const alice = await openPage(
    browser,
    scope,
    "alice",
    testInfo,
    "accept-next-program-publish-then-error",
  );
  await alice.page.goto("/app");
  await alice.page.getByLabel("Time zone").fill("UTC");
  expect((await submitOnboarding(alice.page, "dumbbells")).response.status()).toBe(201);
  await assertAccessible(alice.page);
  const onboardingSummary = await readScopeSummary(alice.page);

  await alice.page.getByRole("link", { name: "Home", exact: true }).click();
  await alice.page.getByRole("link", { name: /Manage routines/ }).click();
  await alice.page.getByLabel("Program name").fill("QA barbell route");
  await alice.page.getByRole("radio", { name: /Barbell \+ rack/ }).check();
  const createProgramResponse = alice.page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/app/programs" &&
      response.request().method() === "POST",
  );
  await alice.page.getByRole("button", { name: "Create from example" }).click();
  expect((await createProgramResponse).status()).toBe(201);
  await expect(alice.page.getByText("Revision 1 · Barbell + rack · 5 days")).toBeVisible();
  await expect(alice.page.locator(".member-day-grid > li")).toHaveCount(5);

  await alice.page.getByRole("link", { name: /Manage routines/ }).click();
  const barbellProgramCard = alice.page
    .locator(".program-collection-list > li")
    .filter({ has: alice.page.getByRole("heading", { level: 3, name: "QA barbell route" }) });
  await barbellProgramCard.getByRole("button", { name: "Clone" }).click();
  await alice.page.getByLabel("New program name").fill("QA cloned route");
  const cloneProgramResponse = alice.page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/app/programs" &&
      response.request().method() === "POST",
  );
  await alice.page.getByRole("button", { name: "Clone and activate" }).click();
  expect((await cloneProgramResponse).status()).toBe(201);
  await expect(alice.page.getByRole("heading", { name: "QA cloned route" })).toBeVisible();
  const collectionSummary = await readScopeSummary(alice.page);
  expect(collectionSummary.counts.programRoots).toBe(
    onboardingSummary.counts.programRoots + 2,
  );
  expect(collectionSummary.counts.programRevisions).toBe(
    onboardingSummary.counts.programRevisions + 2,
  );

  await alice.page.getByRole("link", { name: /Manage routines/ }).click();
  const originalProgramCard = alice.page
    .locator(".program-collection-list > li")
    .filter({ has: alice.page.getByRole("heading", { level: 3, name: "Five-day starter route" }) });
  const activateOriginalResponse = alice.page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/app/programs/activate" &&
      response.request().method() === "POST",
  );
  const activateOriginal = originalProgramCard.getByRole("button", { name: "Make active" });
  await activateOriginal.focus();
  await expect(activateOriginal).toBeFocused();
  await alice.page.keyboard.press("Enter");
  expect((await activateOriginalResponse).status()).toBe(200);
  await expect(alice.page.getByText("Revision 1 · Dumbbells · 5 days")).toBeVisible();

  await alice.page.getByRole("link", { name: /Manage private exercises/ }).click();
  await alice.page.getByRole("link", { name: "Create exercise" }).click();
  await alice.page.getByLabel("Exercise name").fill("QA supported row");
  await alice.page.getByLabel("Instructions").fill("Brace on the bench and row with control.");
  await alice.page.getByLabel("Search aliases").fill("supported row\nbench row");
  const createCustomResponse = alice.page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/app/custom-exercises" &&
      response.request().method() === "POST",
  );
  await alice.page.getByRole("button", { name: "Create exercise" }).click();
  expect((await createCustomResponse).status()).toBe(201);
  await expect(alice.page).toHaveURL(/\/app\/library\/custom\/[0-9a-f-]+$/u);
  const customExerciseId = new URL(alice.page.url()).pathname.split("/").at(-1);
  if (!customExerciseId) throw new Error("The custom exercise ID is unavailable.");
  expect((await readScopeSummary(alice.page)).counts.customExercises).toBe(
    collectionSummary.counts.customExercises + 1,
  );
  await expect(alice.page.getByRole("heading", { level: 1, name: "Edit movement" })).toBeVisible();
  await expect(alice.page.getByLabel("Exercise name")).toHaveValue("QA supported row");
  await alice.page.getByRole("link", { name: /Custom library/ }).click();
  await expect(alice.page.getByRole("link", { name: /QA supported row/ })).toBeVisible();

  await alice.page.getByRole("link", { name: "Home", exact: true }).click();
  await alice.page.getByRole("link", { name: /Edit routine/ }).click();
  await expect(alice.page.getByRole("button", { name: "Add core section" })).toBeEnabled();
  const accessorySection = alice.page
    .locator("fieldset.program-editor-section")
    .filter({ has: alice.page.getByLabel("Section name for accessory") });
  const accessoryName = await accessorySection.getByLabel("Section name for accessory").inputValue();
  const removeAccessory = accessorySection.getByRole("button", {
    name: `Remove ${accessoryName} section`,
  });
  await removeAccessory.click();
  await expect(alice.page.getByRole("heading", { name: `Remove ${accessoryName}?` })).toBeVisible();
  await expect(
    alice.page.getByRole("dialog").getByText("Overhead dumbbell triceps extension", {
      exact: true,
    }),
  ).toBeVisible();
  await alice.page.getByRole("button", { name: "Keep section" }).click();
  await expect(removeAccessory).toBeFocused();
  await removeAccessory.click();
  await alice.page.getByRole("button", { name: "Remove section and movements" }).click();
  await expect(alice.page.getByText(/Overhead dumbbell triceps extension removed/)).toBeVisible();
  await expect(alice.page.getByLabel("Section name for core")).toBeVisible();

  await alice.page.getByRole("button", { name: "Add accessory section" }).click();
  const newAccessorySection = alice.page
    .locator("fieldset.program-editor-section")
    .filter({ has: alice.page.getByLabel("Section name for accessory") });
  await newAccessorySection.getByLabel("Section name for accessory").fill("Custom assistance");
  await newAccessorySection.getByRole("button", { name: "Add movement" }).click();
  await expect(alice.page.getByRole("heading", { name: "Add movement" })).toBeVisible();
  await alice.page.getByLabel("Search compatible movements").fill("QA supported row");
  await alice.page.getByRole("button", { name: /QA supported row/ }).click();
  const customPrescription = alice.page
    .locator("li.program-editor-prescription")
    .filter({ has: alice.page.getByRole("heading", { level: 3, name: "QA supported row" }) });
  await customPrescription.getByLabel("Sets").fill("4");
  await customPrescription.getByLabel("Rest seconds").fill("75");
  await customPrescription.getByLabel("Minimum reps").fill("6");
  await customPrescription.getByLabel("Maximum reps").fill("10");
  const customTarget = customPrescription.getByLabel("Target lb (optional)");
  await customTarget.selectText();
  await customTarget.pressSequentially("44.1");
  await expect(customTarget).toHaveValue("44.1");
  await customPrescription.getByLabel("Notes").fill("QA immutable program note");
  await newAccessorySection.getByRole("button", { name: "Add movement" }).click();
  await alice.page.getByLabel("Search compatible movements").fill("Dumbbell curl");
  await alice.page.getByRole("button", { name: /Dumbbell curl/ }).click();
  const moveCustomDown = customPrescription.getByRole("button", {
    name: "Move QA supported row down",
  });
  await moveCustomDown.focus();
  await expect(moveCustomDown).toBeFocused();
  await moveCustomDown.press("Enter");
  await expect(newAccessorySection.locator("li.program-editor-prescription h3")).toHaveText([
    "Dumbbell curl",
    "QA supported row",
  ]);
  await alice.page.getByRole("button", { name: "Move Custom assistance section up" }).click();

  const walkerEditor = alice.page
    .locator("fieldset.program-editor-cardio section")
    .filter({ has: alice.page.getByRole("heading", { exact: true, level: 3, name: "walker" }) });
  await walkerEditor.getByLabel("Duration seconds").fill("900");
  const walkerDistance = walkerEditor.getByLabel("Distance miles");
  await walkerDistance.selectText();
  await walkerDistance.pressSequentially("0.1");
  await expect(walkerDistance).toHaveValue("0.1");
  await walkerEditor.getByLabel("Notes").fill("QA walker target");
  await alice.page.getByLabel("Day name").fill("Power Push");
  await alice.page
    .locator(".program-editor-outline")
    .getByRole("button", { name: /Pull \d+ movements$/u })
    .click();
  const substitutedRow = alice.page
    .locator("li.program-editor-prescription")
    .filter({ has: alice.page.getByRole("heading", { level: 3, name: "Chest-supported dumbbell row" }) });
  const substitutedTarget = substitutedRow.getByLabel("Target lb (optional)");
  await substitutedTarget.selectText();
  await substitutedTarget.pressSequentially("55");
  await expect(substitutedTarget).toHaveValue("55");
  await substitutedRow.getByLabel("Notes").fill("QA retained substitution note");
  await assertAccessible(alice.page);
  const beforePublishSummary = await readScopeSummary(alice.page);

  const firstPublishResponse = alice.page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/app/program/publish" &&
      response.request().method() === "POST",
  );
  await alice.page.getByRole("button", { name: "Publish new revision" }).click();
  const failedPublish = await firstPublishResponse;
  expect(failedPublish.status()).toBe(500);
  const failedPublishBody = failedPublish.request().postDataJSON() as { idempotencyKey?: unknown };
  expect(failedPublishBody.idempotencyKey).toEqual(expect.any(String));
  expect((failedPublishBody.idempotencyKey as string).trim().length).toBeGreaterThan(0);
  await expect(
    alice.page.getByText("The synthetic transport lost the accepted publication response."),
  ).toBeVisible();
  await assertAccessible(alice.page);
  const acceptedPublishSummary = await readScopeSummary(alice.page);
  expect(acceptedPublishSummary.counts.programRevisions).toBe(
    beforePublishSummary.counts.programRevisions + 1,
  );

  const retryPublishResponse = alice.page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/app/program/publish" &&
      response.request().method() === "POST",
  );
  await alice.page.getByRole("button", { name: "Publish new revision" }).click();
  const reconciledPublish = await retryPublishResponse;
  expect(reconciledPublish.status()).toBe(200);
  expect((reconciledPublish.request().postDataJSON() as { idempotencyKey?: unknown }).idempotencyKey)
    .toBe(failedPublishBody.idempotencyKey);
  await expect(alice.page.getByText(/Published revision 2/)).toBeVisible();
  await expect(alice.page.getByText("Draft matches the active revision")).toBeVisible();
  expect(await readScopeSummary(alice.page)).toEqual(acceptedPublishSummary);
  await alice.page
    .locator(".program-editor-outline")
    .getByRole("button", { name: /Power Push \d+ movements$/u })
    .click();
  if (testInfo.project.name === "chromium-desktop") {
    const editorEvidence = testInfo.outputPath("authenticated-custom-editor-desktop.png");
    await alice.page.screenshot({ fullPage: true, path: editorEvidence });
    await testInfo.attach("authenticated-custom-editor-desktop", {
      contentType: "image/png",
      path: editorEvidence,
    });
  }

  await alice.page.getByRole("link", { name: "Back to program" }).click();
  await expect(alice.page.getByRole("heading", { name: "Welcome back, Alice QA" })).toBeVisible();
  await expect(alice.page.getByText("Five-day starter route", { exact: false })).toBeVisible();
  const sessionId = await completePullWorkoutForInsights(alice.page);
  await assertAccessible(alice.page);
  await alice.page.getByRole("link", { name: "Home", exact: true }).click();
  await expect(alice.page.getByRole("heading", { name: "Welcome back, Alice QA" })).toBeVisible();
  const completedHomeTotals = alice.page.locator(".member-home-totals");
  await expect(completedHomeTotals.getByText("Completed", { exact: true })).toBeVisible();
  await expect(completedHomeTotals.locator("dd").first()).toHaveText("1");
  await expect(alice.page.getByText("No completed workouts yet")).toHaveCount(0);
  await expect(alice.page.getByRole("link", { name: /Resume/ })).toHaveCount(0);
  const beforeEquipment = await readProfileProgram(alice.page);
  const beforeEquipmentSummary = await readScopeSummary(alice.page);
  expect(beforeEquipmentSummary.counts.workoutSnapshots).toBeGreaterThan(0);
  expect(beforeEquipmentSummary.counts.personalRecords).toBeGreaterThan(0);
  await alice.page.getByRole("link", { name: /Edit routine/ }).click();
  await expect(alice.page).toHaveURL(/\/app\/program\/edit$/u);
  await expect(alice.page.getByRole("heading", { name: "Edit your route" })).toBeVisible();
  const editorBarbellProfile = alice.page
    .getByRole("group", { name: "Equipment profile" })
    .getByRole("button", { name: /Barbell \+ rack/ });
  await editorBarbellProfile.click();
  const equipmentReviewHeading = alice.page.getByRole("heading", {
    name: "Review Barbell + rack",
  });
  await expect(equipmentReviewHeading).toBeFocused();
  const substitutionRows = alice.page.locator(".equipment-change-list > li");
  await expect(substitutionRows).toHaveCount(6);
  expect(await substitutionRows.locator("span").allTextContents()).toEqual([
    "Pull",
    "Upper",
    "Upper",
    "Lower",
    "Lower",
    "Lower",
  ]);
  await expect(substitutionRows.getByText("Push", { exact: true })).toHaveCount(0);
  await expect(substitutionRows.getByText("Legs", { exact: true })).toHaveCount(0);
  expect(await substitutionRows.locator("strong").allTextContents()).toEqual([
    "Chest-supported dumbbell row → Barbell bent-over row",
    "Dumbbell bench press → Barbell bench press",
    "Chest-supported dumbbell row → Barbell bent-over row",
    "Heavy goblet squat → Barbell back squat",
    "Dumbbell Romanian deadlift → Barbell Romanian deadlift",
    "Dumbbell hip thrust → Barbell hip thrust",
  ]);
  await expect(
    alice.page.getByText(
      "Sets, range, rest, position, and notes stay. Movement-specific targets clear.",
    ),
  ).toHaveCount(6);
  await expect(alice.page.getByText("Resolve incompatible custom movements first.")).toHaveCount(0);
  await assertAccessible(alice.page);
  if (testInfo.project.name === "webkit-phone") {
    const equipmentEvidence = testInfo.outputPath("authenticated-equipment-review-phone.png");
    await equipmentReviewHeading.evaluate((heading) => heading.scrollIntoView({ block: "start" }));
    await alice.page.screenshot({ path: equipmentEvidence });
    await testInfo.attach("authenticated-equipment-review-phone", {
      contentType: "image/png",
      path: equipmentEvidence,
    });
  }
  const equipmentResponse = alice.page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/app/profile-program/equipment" &&
      response.request().method() === "POST",
  );
  await alice.page.getByRole("button", { name: "Confirm Barbell + rack" }).click();
  expect((await equipmentResponse).status()).toBe(200);
  await expect(alice.page.getByText(/Saved revision 3/)).toBeVisible();
  const afterEquipmentSummary = await readScopeSummary(alice.page);
  expect(afterEquipmentSummary.counts.programRevisions).toBe(
    beforeEquipmentSummary.counts.programRevisions + 1,
  );
  expect(afterEquipmentSummary.counts.programRoots).toBe(
    beforeEquipmentSummary.counts.programRoots,
  );
  expect(afterEquipmentSummary.counts.customExercises).toBe(
    beforeEquipmentSummary.counts.customExercises,
  );

  const beforePreferences = await readProfileProgram(alice.page);
  expect(beforePreferences.activeProgram?.equipmentProfileKind).toBe("barbell");
  expect(programDayMeaning(beforePreferences, "push")).toEqual(
    programDayMeaning(beforeEquipment, "push"),
  );
  expect(programDayMeaning(beforePreferences, "legs")).toEqual(
    programDayMeaning(beforeEquipment, "legs"),
  );
  const compatibleCustomPrescription = beforePreferences.activeProgram?.days
    .flatMap(({ prescriptions }) => prescriptions)
    .find((prescription) => prescription.customExerciseId === customExerciseId);
  expect(compatibleCustomPrescription).toMatchObject({
    notes: "QA immutable program note",
    restSeconds: 75,
    targetWeightKg: 20.003,
  });
  const substitutedBarbellRow = beforePreferences.activeProgram?.days
    .find(({ dayKey }) => dayKey === "pull")
    ?.prescriptions.find(({ label }) => label === "Barbell bent-over row");
  expect(substitutedBarbellRow).toMatchObject({
    notes: "QA retained substitution note",
    targetWeightKg: null,
  });
  const canonicalBeforePreferences = JSON.stringify(beforePreferences.activeProgram);

  await alice.page.getByRole("link", { name: "Settings" }).click();
  await alice.page.getByLabel("Display units").selectOption("metric");
  await alice.page.getByLabel("IANA time zone").fill("America/Chicago");
  await alice.page.getByRole("checkbox", { name: /Reduce interface motion/ }).check();
  const preferencesResponse = alice.page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/app/preferences" &&
      response.request().method() === "PATCH",
  );
  await alice.page.getByRole("button", { name: "Save preferences" }).click();
  expect((await preferencesResponse).status()).toBe(200);
  await expect(alice.page.getByText(/Stored workout measurements remain in canonical/)).toBeVisible();
  const afterPreferences = await readProfileProgram(alice.page);
  expect(afterPreferences.preferences).toMatchObject({
    timezone: "America/Chicago",
    unitSystem: "metric",
  });
  expect(JSON.stringify(afterPreferences.activeProgram)).toBe(canonicalBeforePreferences);

  await alice.page.getByRole("link", { name: "Home", exact: true }).click();
  await alice.page.getByRole("link", { name: /Edit routine/ }).click();
  await alice.page
    .locator(".program-editor-outline")
    .getByRole("button", { name: /Power Push \d+ movements$/u })
    .click();
  const metricCustomPrescription = alice.page
    .locator("li.program-editor-prescription")
    .filter({ has: alice.page.getByRole("heading", { level: 3, name: "QA supported row" }) });
  await expect(metricCustomPrescription.getByLabel("Target kg (optional)")).toHaveValue("20.003");
  await expect(metricCustomPrescription.getByLabel("Notes")).toHaveValue(
    "QA immutable program note",
  );
  const metricWalker = alice.page
    .locator("fieldset.program-editor-cardio section")
    .filter({ has: alice.page.getByRole("heading", { exact: true, level: 3, name: "walker" }) });
  await expect(metricWalker.getByLabel("Distance metres")).toHaveValue("160.934");
  await expect(alice.page.getByText("Draft matches the active revision")).toBeVisible();
  await alice.page.getByRole("link", { name: "Back to program" }).click();

  await alice.page.getByRole("link", { name: "History", exact: true }).click();
  const pullHistory = alice.page.locator(".history-list > li").filter({
    has: alice.page.locator(".history-main strong", { hasText: "Pull" }),
  });
  await expect(pullHistory.locator(".history-main strong")).toHaveText("Pull");
  await expect(alice.page.locator(".history-main strong", { hasText: "Power Push" })).toHaveCount(0);
  await pullHistory.getByRole("link").click();
  await expect(alice.page.getByRole("heading", { level: 1, name: "Pull" })).toBeVisible();
  await expect(alice.page.getByText("Chest-supported dumbbell row", { exact: true })).toBeVisible();
  await expect(alice.page.getByText("Barbell bent-over row", { exact: true })).toHaveCount(0);
  const savedRow = alice.page.locator(".history-exercises > li").filter({
    has: alice.page.getByText("Chest-supported dumbbell row", { exact: true }),
  });
  await expect(savedRow.getByText("Dumbbells", { exact: true })).toBeVisible();
  await expect(savedRow.getByText("24.9 kg", { exact: true })).toBeVisible();
  await expect(savedRow.getByText("QA retained substitution note", { exact: true })).toBeVisible();
  await expect(savedRow.getByText("3 work sets", { exact: true })).toBeVisible();
  await expect(savedRow.getByText("8–12 reps", { exact: true })).toBeVisible();
  await expect(savedRow.getByText("1m 30s", { exact: true })).toBeVisible();
  await expect(savedRow.getByText(/11\.3 kg · 12 reps/i).first()).toBeVisible();
  await expect(savedRow.locator(".history-sets > li")).toHaveCount(3);
  await expect(alice.page.getByText("Immutable QA walk")).toBeVisible();
  await expect(alice.page.getByText("12:26 / km", { exact: true })).toBeVisible();
  await assertAccessible(alice.page);

  await alice.page.getByRole("link", { name: "Progress", exact: true }).click();
  await expect(alice.page.getByRole("heading", { name: "Progress" })).toBeVisible();
  await expect(alice.page.getByText("Logged distance")).toBeVisible();
  const progressTotals = alice.page.locator(".progress-totals");
  await expect(progressTotals.getByText("408.2 kg·reps", { exact: true })).toBeVisible();
  await expect(progressTotals.getByText("1.61 km", { exact: true })).toBeVisible();
  await alice.page.getByRole("link", { name: /Personal records/ }).click();
  await expect(alice.page.getByText("11.3 kg").first()).toBeVisible();
  await expect(alice.page.getByText("Tied best · 3 exact source sets").first()).toBeVisible();
  await expect(alice.page.getByRole("link", { name: /View tied workout/ }).first()).toHaveAttribute(
    "href",
    `/app/history/${sessionId}`,
  );
  await assertAccessible(alice.page);
  if (testInfo.project.name === "chromium-desktop") {
    const recordsEvidence = testInfo.outputPath("authenticated-personal-records-desktop.png");
    await alice.page.screenshot({ fullPage: true, path: recordsEvidence });
    await testInfo.attach("authenticated-personal-records-desktop", {
      contentType: "image/png",
      path: recordsEvidence,
    });
  }

  const aliceFinalProfile = await readProfileProgram(alice.page);
  const aliceActiveProgram = aliceFinalProfile.activeProgram;
  if (!aliceActiveProgram) throw new Error("Alice's active program is unavailable.");
  const bob = await openPage(browser, scope, "bob", testInfo);
  await bob.page.goto("/app");
  expect((await submitOnboarding(bob.page, "dumbbells")).response.status()).toBe(201);
  const bobScopeBefore = await readScopeSummary(bob.page);
  const missingCustomId = "00000000-0000-4000-8000-000000000088";
  const [foreignCustom, missingCustom] = await Promise.all([
    privateRead(bob.page, `/api/app/custom-exercises/${customExerciseId}`),
    privateRead(bob.page, `/api/app/custom-exercises/${missingCustomId}`),
  ]);
  expect(foreignCustom).toEqual(missingCustom);
  expect(foreignCustom).toMatchObject({ status: 404, body: { error: "not_found" } });
  expect(foreignCustom.cacheControl).toContain("no-store");

  const missingProgramId = "00000000-0000-4000-8000-000000000089";
  const missingRevisionId = "00000000-0000-4000-8000-000000000090";
  const foreignProgram = await privateMutation(bob.page, "/api/app/programs", {
    idempotencyKey: "bob-custom-foreign-clone",
    mode: "clone",
    name: "Unavailable copy",
    sourceProgramId: aliceActiveProgram.id,
    sourceRevisionId: aliceActiveProgram.revisionId,
  });
  const missingProgram = await privateMutation(bob.page, "/api/app/programs", {
    idempotencyKey: "bob-custom-missing-clone",
    mode: "clone",
    name: "Unavailable copy",
    sourceProgramId: missingProgramId,
    sourceRevisionId: missingRevisionId,
  });
  expect(foreignProgram).toEqual(missingProgram);
  expect(foreignProgram).toMatchObject({ status: 404, body: { error: "not_found" } });
  expect(await readScopeSummary(bob.page)).toEqual(bobScopeBefore);

  await bob.page.getByRole("link", { name: "Progress", exact: true }).click();
  await expect(bob.page.getByText("No completed data")).toBeVisible();
  await bob.page.getByRole("link", { name: /Personal records/ }).click();
  await expect(bob.page.getByText("No record rows yet")).toBeVisible();
  const bobMarkup = await bob.page.locator("main").innerText();
  expect(bobMarkup).not.toContain("QA supported row");
  expect(bobMarkup).not.toContain("Immutable QA walk");
  expect(bobMarkup).not.toContain("11.34 kg");
  await assertAccessible(bob.page);

  expect(alice.failedResponses).toEqual(["POST /api/app/program/publish 500"]);
  expect([...bob.failedResponses].sort()).toEqual(
    [
      `GET /api/app/custom-exercises/${customExerciseId} 404`,
      `GET /api/app/custom-exercises/${missingCustomId} 404`,
      "POST /api/app/programs 404",
      "POST /api/app/programs 404",
    ].sort(),
  );
  await alice.page.evaluate(() => fetch("/api/harness/scope", { method: "DELETE" }));
  await bob.close();
  await alice.close();
});

test("an incompatible private movement blocks an editor equipment change without writing a revision", async ({
  browser,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium-desktop",
    "The bounded incompatible-equipment proof runs once in Chromium desktop.",
  );
  const scope = `${testInfo.project.name}-incompatible-equipment`;
  const alice = await openPage(browser, scope, "alice", testInfo);
  await alice.page.goto("/app");
  expect((await submitOnboarding(alice.page, "barbell")).response.status()).toBe(201);

  await alice.page.getByRole("link", { name: /Manage private exercises/ }).click();
  await alice.page.getByRole("link", { name: "Create exercise" }).click();
  await alice.page.getByLabel("Exercise name").fill("QA rack press");
  await alice.page
    .getByLabel("Instructions")
    .fill("Set the bar in the rack, brace, and press under control.");
  const equipment = alice.page.getByRole("group", { name: "Required equipment" });
  await equipment.getByLabel("Dumbbells").uncheck();
  await equipment.getByLabel("Barbell").check();
  await equipment.getByLabel("Rack").check();
  const createResponse = alice.page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/app/custom-exercises" &&
      response.request().method() === "POST",
  );
  await alice.page.getByRole("button", { name: "Create exercise" }).click();
  expect((await createResponse).status()).toBe(201);

  await alice.page.getByRole("link", { name: "Home", exact: true }).click();
  await alice.page.getByRole("link", { name: /Edit routine/ }).click();
  const accessorySection = alice.page
    .locator("fieldset.program-editor-section")
    .filter({ has: alice.page.getByLabel("Section name for accessory") });
  await accessorySection.getByRole("button", { name: "Add movement" }).click();
  await alice.page.getByLabel("Search compatible movements").fill("QA rack press");
  await alice.page.getByRole("button", { name: /QA rack press/ }).click();
  const publishResponse = alice.page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/app/program/publish" &&
      response.request().method() === "POST",
  );
  await alice.page.getByRole("button", { name: "Publish new revision" }).click();
  expect((await publishResponse).status()).toBe(200);
  await expect(alice.page.getByText(/Published revision 2/)).toBeVisible();

  const beforeProfile = await readProfileProgram(alice.page);
  const beforeScope = await readScopeSummary(alice.page);
  const dumbbellProfile = alice.page.getByRole("button", { name: /^Dumbbells/ });
  await dumbbellProfile.click();
  const reviewHeading = alice.page.getByRole("heading", { name: "Review Dumbbells" });
  await expect(reviewHeading).toBeFocused();
  await expect(alice.page.getByText("Resolve incompatible custom movements first.")).toBeVisible();
  await expect(
    alice.page.getByText("Push: QA rack press requires barbell, rack."),
  ).toBeVisible();
  await expect(
    alice.page.getByRole("button", { name: "Confirm Dumbbells" }),
  ).toBeDisabled();
  await assertAccessible(alice.page);
  await alice.page.getByRole("button", { name: "Cancel" }).click();
  await expect(dumbbellProfile).toBeFocused();
  await expect(reviewHeading).not.toBeVisible();
  expect(await readProfileProgram(alice.page)).toEqual(beforeProfile);
  expect(await readScopeSummary(alice.page)).toEqual(beforeScope);

  expect(alice.failedResponses).toEqual([]);
  await alice.page.evaluate(() => fetch("/api/harness/scope", { method: "DELETE" }));
  await alice.close();
});

test("an accepted runner save reconciles after an error response, replays once, and reaches immutable history", async ({ browser }, testInfo) => {
  const scope = `${testInfo.project.name}-runner-recovery`;
  const alice = await openPage(
    browser,
    scope,
    "alice",
    testInfo,
    "accept-next-runner-then-error",
  );
  await alice.page.goto("/app");
  const onboarded = await submitOnboarding(alice.page, "dumbbells");
  expect(onboarded.response.status()).toBe(201);

  const pushDay = alice.page.getByRole("link", { name: /Push/ });
  await pushDay.focus();
  await expect(pushDay).toBeFocused();
  await pushDay.press("Enter");
  await expect(alice.page).toHaveURL(/\/app\/program\/push$/u);
  await expect(alice.page.getByRole("heading", { name: "Push" })).toBeVisible();
  await assertAccessible(alice.page);

  const startPromise = alice.page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/app/workouts" &&
      response.request().method() === "POST",
  );
  await alice.page.getByRole("button", { name: "Start or resume workout" }).click();
  const startResponse = await startPromise;
  expect(startResponse.status()).toBe(201);
  expect(startResponse.request().postDataJSON()).not.toHaveProperty("ownerUid");
  await expect(alice.page).toHaveURL(/\/workout\/[0-9a-f-]+$/u);
  const sessionId = new URL(alice.page.url()).pathname.split("/").at(-1)!;
  await expect(
    alice.page.getByRole("heading", { name: "Dumbbell bench press" }),
  ).toBeVisible();
  await assertAccessible(alice.page);

  const interrupted = await saveWeightSet(alice.page, "25", "12", "keyboard");
  expect(interrupted.status()).toBe(500);
  const interruptedBody = interrupted.request().postDataJSON() as Record<string, unknown>;
  expect(interruptedBody).not.toHaveProperty("ownerUid");
  expect(interruptedBody).not.toHaveProperty("sequence");
  await expect(alice.page.getByRole("heading", { name: "Save activity" })).toBeVisible();
  await expect(alice.page.getByText("1 failed")).toBeVisible();
  await expect(
    alice.page.getByText("Local authenticated QA harness · synthetic data only"),
  ).toBeVisible();
  await assertAccessible(alice.page);
  const interruptedEvidencePath = testInfo.outputPath(
    "authenticated-runner-interrupted.png",
  );
  await alice.page.screenshot({ fullPage: true, path: interruptedEvidencePath });
  await testInfo.attach("authenticated-runner-interrupted", {
    contentType: "image/png",
    path: interruptedEvidencePath,
  });

  const duplicate = await privateMutation(
    alice.page,
    `/api/app/workouts/${sessionId}/operations`,
    interruptedBody,
  );
  expect(duplicate).toMatchObject({
    body: { status: "duplicate" },
    status: 200,
  });
  expect(duplicate.cacheControl).toContain("no-store");
  expect(alice.failedResponses).toEqual([
    `POST /api/app/workouts/${sessionId}/operations 500`,
  ]);

  await alice.page.reload();
  await expect(
    alice.page.getByRole("progressbar", { name: /1 of \d+ work sets logged/ }),
  ).toBeVisible();
  await expect(alice.page.getByRole("heading", { name: "Save activity" })).toHaveCount(0);
  await assertAccessible(alice.page);

  await alice.page.getByRole("button", { name: /2 Work Not logged/ }).click();
  expect((await saveWeightSet(alice.page, "25", "11")).status()).toBe(200);
  await alice.page.getByRole("button", { name: /3 Work Not logged/ }).click();
  expect((await saveWeightSet(alice.page, "25", "10")).status()).toBe(200);
  expect((await submitRunnerAction(alice.page, "Complete exercise")).status()).toBe(200);

  for (const exerciseName of [
    "Seated dumbbell shoulder press",
    "Incline dumbbell press",
    "Overhead dumbbell triceps extension",
    "Dead bug",
    "Front plank",
  ]) {
    await alice.page
      .getByRole("button", { name: new RegExp(exerciseName, "i") })
      .click();
    expect((await submitRunnerAction(alice.page, "Skip exercise")).status()).toBe(200);
  }

  await alice.page.getByRole("button", { name: /Walker/ }).click();
  await alice.page.getByLabel("Duration (seconds)").last().fill("1200");
  await alice.page.getByLabel("Distance (mi)").last().fill("1");
  await alice.page.getByLabel("Incline (%)").fill("2");
  await alice.page.getByLabel("Cardio notes").fill("Synthetic QA walk");
  expect((await submitRunnerAction(alice.page, "Save cardio")).status()).toBe(200);

  const completionPromise = submitRunnerAction(alice.page, "Complete workout");
  await expect(alice.page).toHaveURL(`/app/history/${sessionId}`);
  expect((await completionPromise).status()).toBe(200);
  await expect(alice.page.getByText("Completed workout")).toBeVisible();
  await expect(alice.page.getByRole("heading", { name: "Push" })).toBeVisible();
  await expect(alice.page.getByText(/25 lb · 12 reps/i)).toBeVisible();
  await expect(alice.page.locator(".history-sets > li")).toHaveCount(3);
  await expect(alice.page.getByRole("heading", { name: "Walker cardio" })).toBeVisible();
  await expect(alice.page.getByText("Synthetic QA walk")).toBeVisible();
  await assertAccessible(alice.page);
  expect(
    await alice.page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);

  const evidencePath = testInfo.outputPath("authenticated-runner-history.png");
  await alice.page.screenshot({ fullPage: true, path: evidencePath });
  await testInfo.attach("authenticated-runner-history", {
    contentType: "image/png",
    path: evidencePath,
  });

  const bob = await openPage(browser, scope, "bob", testInfo);
  await bob.page.goto("/app");
  expect((await submitOnboarding(bob.page, "barbell")).response.status()).toBe(201);
  const unknownId = "00000000-0000-4000-8000-000000000099";
  const readWorkout = (id: string) =>
    bob.page.evaluate(async (targetId) => {
      const response = await fetch(`/api/app/workouts/${targetId}`, {
        cache: "no-store",
        credentials: "same-origin",
      });
      return {
        body: await response.json(),
        cacheControl: response.headers.get("cache-control"),
        status: response.status,
      };
    }, id);
  const [foreign, missing] = await Promise.all([
    readWorkout(sessionId),
    readWorkout(unknownId),
  ]);
  expect(foreign).toEqual(missing);
  expect(foreign).toMatchObject({ status: 404, body: { error: "not_found" } });
  expect(foreign.cacheControl).toContain("no-store");

  const foreignRouteResponse = await bob.page.goto(`/workout/${sessionId}`);
  expect(foreignRouteResponse).not.toBeNull();
  const foreignRouteBody = await foreignRouteResponse!.text();
  expect(foreignRouteBody).toContain(sessionId);
  const foreignRoute = {
    body: foreignRouteBody.replaceAll(sessionId, "<requested-session-id>"),
    cacheControl: foreignRouteResponse!.headers()["cache-control"],
    status: foreignRouteResponse!.status(),
  };
  await expect(bob.page.getByText("This page could not be found.")).toBeVisible();
  const missingRouteResponse = await bob.page.goto(`/workout/${unknownId}`);
  expect(missingRouteResponse).not.toBeNull();
  const missingRouteBody = await missingRouteResponse!.text();
  expect(missingRouteBody).toContain(unknownId);
  const missingRoute = {
    body: missingRouteBody.replaceAll(unknownId, "<requested-session-id>"),
    cacheControl: missingRouteResponse!.headers()["cache-control"],
    status: missingRouteResponse!.status(),
  };
  await expect(bob.page.getByText("This page could not be found.")).toBeVisible();
  expect(foreignRoute).toEqual(missingRoute);
  expect(foreignRoute).toMatchObject({ status: 404 });
  expect(foreignRoute.cacheControl).toContain("no-store");

  expect([...bob.failedResponses].sort()).toEqual(
    [
      `GET /api/app/workouts/${sessionId} 404`,
      `GET /api/app/workouts/${unknownId} 404`,
      `GET /workout/${sessionId} 404`,
      `GET /workout/${unknownId} 404`,
    ].sort(),
  );
  expect(alice.failedResponses).toEqual([
    `POST /api/app/workouts/${sessionId}/operations 500`,
  ]);

  await alice.page.evaluate(() => fetch("/api/harness/scope", { method: "DELETE" }));
  await bob.close();
  await alice.close();
});
