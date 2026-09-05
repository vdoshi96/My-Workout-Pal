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
  type HarnessScenario,
} from "../fixtures/authenticated-app/server/harness-context";
import { isSupersededCompanionImageRequest } from "./companion-request-policy";

type SyntheticViewer = "alice" | "bob";
type ResilienceControl = {
  abortNextOperation: boolean;
  scenario: HarnessScenario;
  viewer: SyntheticViewer;
};

type ResiliencePage = Readonly<{
  close(): Promise<void>;
  control: ResilienceControl;
  failedRequests: string[];
  failedResponses: string[];
  operationRequests: Request[];
  page: Page;
}>;

type ResilienceSignals = {
  browserErrors: string[];
  failedRequests: string[];
  failedResponses: string[];
  operationRequests: Request[];
};

type SharedResiliencePages = Readonly<{
  close(): Promise<void>;
  context: BrowserContext;
  control: ResilienceControl;
  pages: readonly [Page, Page];
  signals: ResilienceSignals;
}>;

function projectContextOptions(testInfo: TestInfo): BrowserContextOptions {
  const use = testInfo.project.use;
  const viewport = use.viewport;
  if (
    !viewport ||
    typeof viewport !== "object" ||
    typeof viewport.width !== "number" ||
    typeof viewport.height !== "number"
  ) {
    throw new Error("Runner resilience projects require an explicit viewport.");
  }
  return {
    ...(typeof use.deviceScaleFactor === "number"
      ? { deviceScaleFactor: use.deviceScaleFactor }
      : {}),
    ...(typeof use.hasTouch === "boolean" ? { hasTouch: use.hasTouch } : {}),
    ...(typeof use.isMobile === "boolean" ? { isMobile: use.isMobile } : {}),
    ...(typeof use.userAgent === "string" ? { userAgent: use.userAgent } : {}),
    viewport: { height: viewport.height, width: viewport.width },
  };
}

function isOperationRequest(request: Request): boolean {
  return (
    request.method() === "POST" &&
    /\/api\/app\/workouts\/[^/]+\/operations$/u.test(
      new URL(request.url()).pathname,
    )
  );
}

function isSupersededNextFlightRequest(request: Request): boolean {
  const url = new URL(request.url());
  const failure = request.failure()?.errorText ?? "";
  const headers = request.headers();
  return (
    request.method() === "GET" &&
    url.hostname === "127.0.0.1" &&
    url.searchParams.has("_rsc") &&
    headers["rsc"] === "1" &&
    (["net::ERR_ABORTED", "cancelled"].includes(failure) ||
      (failure === "WebKit encountered an internal error" &&
        request.resourceType() === "fetch" &&
        headers["next-router-prefetch"] === "1" &&
        headers["sec-fetch-dest"] === "empty"))
  );
}

function isExpectedNavigationFontCancellation(request: Request): boolean {
  const url = new URL(request.url());
  return (
    request.method() === "GET" &&
    request.resourceType() === "font" &&
    /^\/_next\/static\/media\/[^/]+\.woff2$/u.test(url.pathname) &&
    request.failure()?.errorText === "cancelled"
  );
}

async function createResilienceContext(
  browser: Browser,
  scope: string,
  testInfo: TestInfo,
): Promise<Readonly<{ context: BrowserContext; control: ResilienceControl }>> {
  const context = await browser.newContext(projectContextOptions(testInfo));
  const control: ResilienceControl = {
    abortNextOperation: false,
    scenario: "ready",
    viewer: "alice",
  };
  await context.route(/^http:\/\/127\.0\.0\.1:\d+\//, async (route) => {
    const request = route.request();
    if (control.abortNextOperation && isOperationRequest(request)) {
      control.abortNextOperation = false;
      await route.abort("internetdisconnected");
      return;
    }
    await route.continue({
      headers: {
        ...request.headers(),
        [HARNESS_SCENARIO_HEADER]: control.scenario,
        [HARNESS_SCOPE_HEADER]: scope,
        [HARNESS_VIEWER_HEADER]: control.viewer,
      },
    });
  });
  await context.route(
    /^https:\/\/www\.youtube-nocookie\.com\/embed\//,
    async (route) => {
      await route.fulfill({
        body: '<!doctype html><html lang="en"><title>External demo omitted from authenticated harness</title></html>',
        contentType: "text/html; charset=utf-8",
        headers: { "cache-control": "no-store" },
        status: 200,
      });
    },
  );
  return { context, control };
}

async function openResiliencePage(
  browser: Browser,
  scope: string,
  testInfo: TestInfo,
): Promise<ResiliencePage> {
  const { context, control } = await createResilienceContext(
    browser,
    scope,
    testInfo,
  );
  const page = await context.newPage();
  const signals: ResilienceSignals = {
    browserErrors: [],
    failedRequests: [],
    failedResponses: [],
    operationRequests: [],
  };
  monitorResiliencePage(page, signals);
  return {
    close: async () => {
      expect(signals.browserErrors).toEqual([]);
      await context.close();
    },
    control,
    failedRequests: signals.failedRequests,
    failedResponses: signals.failedResponses,
    operationRequests: signals.operationRequests,
    page,
  };
}

function monitorResiliencePage(page: Page, signals: ResilienceSignals): void {
  page.on("console", (message) => {
    if (
      (message.type() === "error" || message.type() === "warning") &&
      !message.text().startsWith("Failed to load resource:")
    ) {
      signals.browserErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => signals.browserErrors.push(error.message));
  page.on("request", (request) => {
    if (isOperationRequest(request)) signals.operationRequests.push(request);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      signals.failedResponses.push(
        `${response.request().method()} ${new URL(response.url()).pathname} ${response.status()}`,
      );
    }
  });
  page.on("requestfailed", (request) => {
    const url = new URL(request.url());
    if (
      url.hostname === "127.0.0.1" &&
      !isSupersededNextFlightRequest(request) &&
      // WebKit can cancel an in-flight local font when the test intentionally
      // replaces the document at the synthetic reauthentication boundary.
      !isExpectedNavigationFontCancellation(request) &&
      !isSupersededCompanionImageRequest(request)
    ) {
      signals.failedRequests.push(
        `${request.method()} ${url.pathname} ${request.failure()?.errorText ?? "unknown request failure"}`,
      );
    }
  });
}

async function openSharedResiliencePages(
  browser: Browser,
  scope: string,
  testInfo: TestInfo,
): Promise<SharedResiliencePages> {
  const { context, control } = await createResilienceContext(
    browser,
    scope,
    testInfo,
  );
  const signals: ResilienceSignals = {
    browserErrors: [],
    failedRequests: [],
    failedResponses: [],
    operationRequests: [],
  };
  const first = await context.newPage();
  const second = await context.newPage();
  monitorResiliencePage(first, signals);
  monitorResiliencePage(second, signals);
  return {
    close: async () => {
      expect(signals.browserErrors).toEqual([]);
      await context.close();
    },
    context,
    control,
    pages: [first, second],
    signals,
  };
}

async function assertAccessible(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .exclude('iframe[src*="youtube-nocookie.com"]')
    .analyze();
  expect(
    results.violations.filter((violation) =>
      ["critical", "serious"].includes(violation.impact ?? ""),
    ),
  ).toEqual([]);
}

async function attachRunnerEvidence(
  page: Page,
  testInfo: TestInfo,
  name: string,
): Promise<void> {
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ fullPage: true, path });
  await testInfo.attach(name, { contentType: "image/png", path });
}

async function attachRunnerRegionEvidence(
  region: Locator,
  testInfo: TestInfo,
  name: string,
): Promise<void> {
  const path = testInfo.outputPath(`${name}.png`);
  await region.screenshot({ path });
  await testInfo.attach(name, { contentType: "image/png", path });
}

async function onboardAndOpenPush(page: Page): Promise<string> {
  await page.goto("/app");
  const onboard = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/app/profile-program/onboard" &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Save routine", exact: true }).click();
  expect((await onboard).status()).toBe(201);
  await page.getByRole("link", { name: /Push/ }).click();
  const start = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/app/workouts" &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Start workout" }).click();
  expect((await start).status()).toBe(201);
  await expect(page).toHaveURL(/\/workout\/[0-9a-f-]+$/u);
  const sessionId = new URL(page.url()).pathname.split("/").at(-1);
  if (!sessionId) throw new Error("The runner session route has no ID.");
  await expect(
    page.getByRole("heading", { name: "Dumbbell bench press" }),
  ).toBeVisible();
  return sessionId;
}

async function enterFirstSet(page: Page, weight = "25"): Promise<void> {
  await page.getByLabel("Weight (lb)").fill(weight);
  await page.getByLabel("Repetitions").fill("12");
  await page.getByRole("button", { name: /^(Log|Update) set & rest$/ }).click();
}

function operationKey(request: Request): string {
  const body = request.postDataJSON() as Record<string, unknown>;
  if (typeof body["idempotencyKey"] !== "string") {
    throw new Error("The runner request omitted its idempotency key.");
  }
  expect(body).not.toHaveProperty("ownerUid");
  return body["idempotencyKey"];
}

type StoredRunnerOperation = Readonly<{
  errorCode: string | undefined;
  idempotencyKey: string;
  kind: string;
  setId: string | undefined;
  status: string;
  weightKg: number | undefined;
}>;

type StoredRunnerSummary = Readonly<{
  draftWeightKg: number | undefined;
  revision: number;
  schemaVersion: number;
  stateStatus: string;
  operations: readonly StoredRunnerOperation[];
}>;

async function readStoredRunner(
  page: Page,
  sessionId: string,
): Promise<StoredRunnerSummary> {
  return page.evaluate(async (expectedSessionId) => {
    const records = await new Promise<unknown[]>((resolve, reject) => {
      const open = indexedDB.open("my-workout-pal-runner");
      open.onerror = () =>
        reject(open.error ?? new Error("IndexedDB open failed"));
      open.onsuccess = () => {
        const database = open.result;
        const transaction = database.transaction("runnerStates", "readonly");
        const request = transaction.objectStore("runnerStates").getAll();
        request.onerror = () =>
          reject(request.error ?? new Error("IndexedDB read failed"));
        request.onsuccess = () => resolve(request.result as unknown[]);
        transaction.oncomplete = () => database.close();
      };
    });
    const record = records.find(
      (value) =>
        typeof value === "object" &&
        value !== null &&
        (value as { sessionId?: unknown }).sessionId === expectedSessionId,
    ) as
      | {
          revision?: unknown;
          schemaVersion?: unknown;
          state?: {
            drafts?: Record<string, { weightKg?: unknown }>;
            operations?: unknown[];
            status?: unknown;
          };
        }
      | undefined;
    if (
      record?.schemaVersion !== 2 ||
      typeof record.revision !== "number" ||
      typeof record.state?.status !== "string" ||
      !Array.isArray(record.state?.operations)
    ) {
      throw new Error("The expected schema-two runner record is unavailable.");
    }
    return {
      draftWeightKg: Object.values(record.state.drafts ?? {}).find(
        ({ weightKg }) => typeof weightKg === "number",
      )?.weightKg as number | undefined,
      revision: record.revision,
      schemaVersion: record.schemaVersion,
      stateStatus: record.state.status,
      operations: record.state.operations.map((value) => {
        const operation = value as {
          errorCode?: unknown;
          idempotencyKey?: unknown;
          kind?: unknown;
          payload?: {
            measurement?: { weightKg?: unknown };
            setId?: unknown;
          };
          status?: unknown;
        };
        if (
          typeof operation.idempotencyKey !== "string" ||
          typeof operation.kind !== "string" ||
          typeof operation.status !== "string"
        ) {
          throw new Error("A stored runner operation is malformed.");
        }
        return {
          errorCode:
            typeof operation.errorCode === "string"
              ? operation.errorCode
              : undefined,
          idempotencyKey: operation.idempotencyKey,
          kind: operation.kind,
          setId:
            typeof operation.payload?.setId === "string"
              ? operation.payload.setId
              : undefined,
          status: operation.status,
          weightKg:
            typeof operation.payload?.measurement?.weightKg === "number"
              ? operation.payload.measurement.weightKg
              : undefined,
        };
      }),
    };
  }, sessionId);
}

async function cleanup(page: Page): Promise<void> {
  await page.evaluate(() => fetch("/api/harness/scope", { method: "DELETE" }));
}

async function saveWeightSet(
  page: Page,
  weight: string,
  repetitions = "12",
): Promise<void> {
  await page.getByLabel("Weight (lb)").fill(weight);
  await page.getByLabel("Repetitions").fill(repetitions);
  const response = page.waitForResponse((candidate) =>
    isOperationRequest(candidate.request()),
  );
  await page.getByRole("button", { name: /^(Log|Update) set & rest$/ }).click();
  expect((await response).status()).toBe(200);
}

async function submitRunnerAction(
  page: Page,
  name: string | RegExp,
): Promise<void> {
  const response = page.waitForResponse((candidate) =>
    isOperationRequest(candidate.request()),
  );
  await page.getByRole("button", { name }).click();
  expect((await response).status()).toBe(200);
}

async function preparePushCompletion(page: Page): Promise<void> {
  for (const index of [1, 2]) {
    await page.locator(".runner-set-tab").nth(index).click();
    await saveWeightSet(page, "25");
  }
  await submitRunnerAction(page, "Complete exercise");
  await page.locator(".runner-outline > summary").click();

  for (const exerciseName of [
    "Seated dumbbell shoulder press",
    "Incline dumbbell press",
    "Overhead dumbbell triceps extension",
    "Dead bug",
    "Front plank",
  ]) {
    await page
      .getByRole("button", { name: new RegExp(exerciseName, "iu") })
      .click();
    await submitRunnerAction(page, "Skip exercise");
  }

  await page.getByRole("button", { name: /Walker/iu }).click();
  await page.getByLabel("Duration (seconds)").last().fill("1200");
  await page.getByLabel("Distance (mi)").last().fill("1");
  await page.getByLabel("Incline (%)").fill("2");
  await page.getByLabel("Cardio notes").fill("Terminal tab recovery walk");
  await submitRunnerAction(page, "Save cardio");
}

test("the active runner keeps one-axis geometry at the 200-percent CSS viewport", async ({
  browser,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-desktop");
  const harness = await openResiliencePage(
    browser,
    `${testInfo.project.name}-runner-200-percent-reflow`,
    testInfo,
  );
  try {
    await onboardAndOpenPush(harness.page);
    await harness.page.setViewportSize({ height: 500, width: 720 });
    const geometry = await harness.page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      outliers: [...document.querySelectorAll<HTMLElement>("body *")]
        .flatMap((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 &&
              (rect.left < -1 || rect.right > document.documentElement.clientWidth + 1)
            ? [{
                className: element.className,
                left: Math.round(rect.left),
                right: Math.round(rect.right),
                tagName: element.tagName,
              }]
            : [];
        })
        .slice(0, 20),
      scrollWidth: document.documentElement.scrollWidth,
    }));

    expect(geometry.outliers).toEqual([]);
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
    await expect(harness.page.getByRole("main")).toBeVisible();
    await assertAccessible(harness.page);
  } finally {
    await cleanup(harness.page);
    await harness.close();
  }
});

test("a real aborted operation retries explicitly with the same key and no online event", async ({
  browser,
}, testInfo) => {
  const harness = await openResiliencePage(
    browser,
    `${testInfo.project.name}-literal-offline`,
    testInfo,
  );
  const sessionId = await onboardAndOpenPush(harness.page);

  harness.control.abortNextOperation = true;
  await enterFirstSet(harness.page);
  await expect(
    harness.page.getByRole("heading", { name: "Offline queued" }),
  ).toBeVisible();
  const retry = harness.page.getByRole("button", { name: "Retry connection" });
  await assertAccessible(harness.page);

  expect(harness.operationRequests).toHaveLength(1);
  const originalKey = operationKey(harness.operationRequests[0]!);
  expect(harness.failedRequests).toHaveLength(1);
  expect(harness.failedRequests[0]).toMatch(
    new RegExp(`^POST /api/app/workouts/${sessionId}/operations `, "u"),
  );
  harness.failedRequests.length = 0;

  harness.control.abortNextOperation = true;
  // The recovery contract depends on a real browser reload and hydrated runner
  // state, not on Playwright's WebKit reload lifecycle waiter. In a long
  // WebKit project that waiter can remain pending at every readiness level.
  // Trigger the native reload after this evaluation returns, observe the main
  // frame commit directly, then let the product assertions prove hydration.
  const reloadedUrl = harness.page.url();
  const reloadCommitted = harness.page.waitForEvent("framenavigated", {
    predicate: (frame) =>
      frame === harness.page.mainFrame() && frame.url() === reloadedUrl,
  });
  await harness.page.evaluate(() => {
    setTimeout(() => window.location.reload(), 0);
  });
  await reloadCommitted;
  await expect(
    harness.page.getByRole("heading", { name: "Offline queued" }),
  ).toBeVisible();
  expect(
    await harness.page.evaluate(
      () =>
        (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming)
          ?.type,
    ),
  ).toBe("reload");
  if (testInfo.project.name === "chromium-desktop") {
    await attachRunnerRegionEvidence(
      harness.page.locator(
        'section[aria-labelledby="runner-offline-title"]',
      ),
      testInfo,
      "runner-offline-recovery-desktop",
    );
  }
  expect(harness.operationRequests).toHaveLength(2);
  expect(operationKey(harness.operationRequests[1]!)).toBe(originalKey);
  expect(harness.failedRequests).toHaveLength(1);
  expect(harness.failedRequests[0]).toMatch(
    new RegExp(`^POST /api/app/workouts/${sessionId}/operations `, "u"),
  );
  harness.failedRequests.length = 0;

  const savedResponse = harness.page.waitForResponse((response) =>
    isOperationRequest(response.request()),
  );
  await retry.focus();
  await expect(retry).toBeFocused();
  await retry.press("Enter");
  expect((await savedResponse).status()).toBe(200);
  await expect(
    harness.page.getByRole("progressbar", {
      name: /1 of \d+ work sets logged/,
    }),
  ).toBeVisible();
  await expect(
    harness.page
      .locator(".runner-progress")
      .getByText("Saved", { exact: true }),
  ).toBeVisible();

  expect(harness.operationRequests).toHaveLength(3);
  expect(operationKey(harness.operationRequests[2]!)).toBe(originalKey);
  expect(harness.failedResponses).toEqual([]);
  expect(harness.failedRequests).toEqual([]);
  await cleanup(harness.page);
  await harness.close();
});

for (const authCase of [
  {
    banner: "Your sign-in expired",
    scenario: "expire-next-runner-operation",
    status: "session_expired",
  },
  {
    banner: "Your sign-in was revoked",
    scenario: "revoke-next-runner-operation",
    status: "session_revoked",
  },
] as const) {
  test(`${authCase.status} returns through sign-in with the same queued key`, async ({
    browser,
  }, testInfo) => {
    const harness = await openResiliencePage(
      browser,
      `${testInfo.project.name}-${authCase.status}`,
      testInfo,
    );
    const sessionId = await onboardAndOpenPush(harness.page);
    harness.control.scenario = authCase.scenario;

    const rejectedResponse = harness.page.waitForResponse((response) =>
      isOperationRequest(response.request()),
    );
    await enterFirstSet(
      harness.page,
      authCase.status === "session_revoked" ? "30" : "25",
    );
    const rejected = await rejectedResponse;
    expect(rejected.status()).toBe(401);
    expect(rejected.headers()["cache-control"]).toContain("no-store");
    expect(await rejected.json()).toMatchObject({ error: authCase.status });
    await expect(
      harness.page.getByRole("heading", { name: authCase.banner }),
    ).toBeVisible();
    await assertAccessible(harness.page);
    if (
      authCase.status === "session_revoked" &&
      testInfo.project.name === "webkit-phone"
    ) {
      await attachRunnerRegionEvidence(
        harness.page.locator(
          'section[aria-labelledby="runner-auth-blocked-title"]',
        ),
        testInfo,
        "runner-revoked-reauthentication-phone",
      );
    }

    expect(harness.operationRequests).toHaveLength(1);
    const originalKey = operationKey(harness.operationRequests[0]!);
    const returnPath = `/workout/${sessionId}`;
    const signInPath = `/sign-in?returnTo=${encodeURIComponent(returnPath)}`;
    const reauthenticate = harness.page.getByRole("link", {
      name: "Reauthenticate and return",
    });
    await expect(reauthenticate).toHaveAttribute("href", signInPath);
    await reauthenticate.click();
    await expect(harness.page).toHaveURL(signInPath);
    await expect(
      harness.page.getByRole("heading", {
        name: "Synthetic reauthentication boundary",
      }),
    ).toBeVisible();

    if (authCase.status === "session_revoked") {
      harness.control.viewer = "bob";
      harness.control.scenario = "ready";
      await harness.page
        .getByRole("link", { name: "Return as the current synthetic viewer" })
        .click();
      await expect(
        harness.page.getByRole("heading", {
          name: "This page could not be found.",
        }),
      ).toBeVisible();
      const foreignDocument = await harness.page.goto(returnPath);
      expect(foreignDocument?.status()).toBe(404);
      expect(harness.operationRequests).toHaveLength(1);
      expect(harness.failedResponses).toContain(`GET ${returnPath} 404`);
      harness.control.viewer = "alice";
      await harness.page.goto(signInPath);
    } else {
      harness.control.scenario = "ready";
    }

    const savedResponse = harness.page.waitForResponse((response) =>
      isOperationRequest(response.request()),
    );
    await harness.page
      .getByRole("link", { name: "Return as the current synthetic viewer" })
      .click();
    expect((await savedResponse).status()).toBe(200);
    await expect(
      harness.page.getByRole("progressbar", {
        name: /1 of \d+ work sets logged/,
      }),
    ).toBeVisible();
    await expect(
      harness.page
        .locator(".runner-progress")
        .getByText("Saved", { exact: true }),
    ).toBeVisible();
    expect(harness.operationRequests).toHaveLength(2);
    expect(operationKey(harness.operationRequests[1]!)).toBe(originalKey);

    expect(harness.failedResponses).toEqual([
      `POST /api/app/workouts/${sessionId}/operations 401`,
      ...(authCase.status === "session_revoked"
        ? [`GET ${returnPath} 404`]
        : []),
    ]);
    expect(harness.failedRequests).toEqual([]);
    await cleanup(harness.page);
    await harness.close();
  });
}

test("two tabs retain distinct offline set operations through reload and retry", async ({
  browser,
}, testInfo) => {
  const harness = await openSharedResiliencePages(
    browser,
    `${testInfo.project.name}-distinct-tab-operations`,
    testInfo,
  );
  const [first, second] = harness.pages;
  const sessionId = await onboardAndOpenPush(first);
  const workoutPath = new URL(first.url()).pathname;
  await second.goto(workoutPath);
  await expect(
    second.getByRole("heading", { name: "Dumbbell bench press" }),
  ).toBeVisible();

  await harness.context.setOffline(true);
  await first.bringToFront();
  await enterFirstSet(first, "25");
  await expect
    .poll(
      async () => (await readStoredRunner(first, sessionId)).operations.length,
    )
    .toBe(1);
  await second.bringToFront();
  await second.locator(".runner-set-tab").nth(1).click();
  await enterFirstSet(second, "30");
  await expect
    .poll(
      async () => (await readStoredRunner(second, sessionId)).operations.length,
    )
    .toBe(2);
  await first.bringToFront();
  await expect(
    first.getByRole("progressbar", { name: /2 of \d+ work sets logged/u }),
  ).toBeVisible();

  const queued = await readStoredRunner(first, sessionId);
  expect(queued.schemaVersion).toBe(2);
  expect(queued.revision).toBeGreaterThanOrEqual(2);
  expect(
    queued.operations.map(({ setId, status }) => ({ setId, status })),
  ).toEqual([
    { setId: expect.any(String), status: "pending" },
    { setId: expect.any(String), status: "pending" },
  ]);
  expect(new Set(queued.operations.map(({ setId }) => setId)).size).toBe(2);
  expect(harness.signals.operationRequests).toEqual([]);

  await second.close();
  harness.control.abortNextOperation = true;
  await harness.context.setOffline(false);
  await expect(
    first.getByRole("heading", { name: "Offline queued" }),
  ).toBeVisible();
  harness.control.abortNextOperation = true;
  await first.reload();
  await expect(
    first.getByRole("progressbar", { name: /2 of \d+ work sets logged/u }),
  ).toBeVisible();
  await expect(
    first.getByRole("heading", { name: "Offline queued" }),
  ).toBeVisible();
  const restored = await readStoredRunner(first, sessionId);
  expect(restored.operations).toHaveLength(2);
  expect(restored.operations.every(({ status }) => status === "pending")).toBe(
    true,
  );

  harness.signals.failedRequests.length = 0;
  const retry = first.getByRole("button", { name: "Retry connection" });
  await retry.press("Enter");
  await expect(
    first.locator(".runner-progress").getByText("Saved", { exact: true }),
  ).toBeVisible();
  const saved = await readStoredRunner(first, sessionId);
  expect(saved.operations).toHaveLength(2);
  expect(saved.operations.every(({ status }) => status === "saved")).toBe(true);
  expect(harness.signals.failedRequests).toEqual([]);
  expect(harness.signals.failedResponses).toEqual([]);
  await cleanup(first);
  await harness.close();
});

test("two tabs block a divergent set until the member chooses one original key", async ({
  browser,
}, testInfo) => {
  const harness = await openSharedResiliencePages(
    browser,
    `${testInfo.project.name}-same-target-conflict`,
    testInfo,
  );
  const [first, second] = harness.pages;
  for (const page of harness.pages) {
    await page.addInitScript(() => {
      Object.defineProperty(globalThis, "BroadcastChannel", {
        configurable: true,
        value: undefined,
      });
    });
  }
  const sessionId = await onboardAndOpenPush(first);
  await second.goto(new URL(first.url()).pathname);
  await expect(
    second.getByRole("heading", { name: "Dumbbell bench press" }),
  ).toBeVisible();
  await harness.context.setOffline(true);

  await first.getByLabel("Weight (lb)").fill("25");
  await first.getByLabel("Repetitions").fill("12");
  await second.getByLabel("Weight (lb)").fill("30");
  await second.getByLabel("Repetitions").fill("12");
  await Promise.all([
    first
      .getByRole("button", { name: /^(Log|Update) set & rest$/ })
      .evaluate((button: HTMLButtonElement) => button.click()),
    second
      .getByRole("button", { name: /^(Log|Update) set & rest$/ })
      .evaluate((button: HTMLButtonElement) => button.click()),
  ]);
  await expect
    .poll(async () =>
      (await readStoredRunner(first, sessionId)).operations
        .map(({ status }) => status)
        .sort(),
    )
    .toEqual(["failed", "failed"]);
  await first.bringToFront();
  await first.evaluate(() => window.dispatchEvent(new Event("focus")));
  const conflictHeading = first.getByRole("heading", {
    name: "Choose the workout value to keep",
  });
  await expect(conflictHeading).toBeVisible();
  await expect(conflictHeading).toBeFocused();
  await assertAccessible(first);
  const choice25 = first.getByRole("button", {
    name: /Keep 25 lb · 12 reps for Set 1 · Dumbbell bench press/u,
  });
  const choice30 = first.getByRole("button", {
    name: /Keep 30 lb · 12 reps for Set 1 · Dumbbell bench press/u,
  });
  await expect(choice25).toBeVisible();
  await expect(choice30).toBeVisible();
  if (testInfo.project.name === "chromium-desktop") {
    await attachRunnerRegionEvidence(
      first.locator(
        'section[aria-labelledby="runner-local-conflict-heading"]',
      ),
      testInfo,
      "runner-local-tab-conflict-desktop",
    );
  }
  for (const choice of [choice25, choice30]) {
    const box = await choice.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
  expect(
    await first.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(harness.signals.operationRequests).toEqual([]);

  const conflicted = await readStoredRunner(first, sessionId);
  expect(conflicted.operations).toHaveLength(2);
  expect(
    conflicted.operations.every(
      ({ errorCode, status }) =>
        errorCode === "local_tab_conflict" && status === "failed",
    ),
  ).toBe(true);
  const chosenKey = [...conflicted.operations].sort(
    (left, right) => (right.weightKg ?? 0) - (left.weightKg ?? 0),
  )[0]!.idempotencyKey;

  await first
    .getByRole("button", { name: "Leave both values unresolved" })
    .click();
  await expect(conflictHeading).toBeVisible();
  expect((await readStoredRunner(first, sessionId)).operations).toEqual(
    conflicted.operations,
  );

  await choice30.click();
  await expect
    .poll(async () =>
      (await readStoredRunner(first, sessionId)).operations
        .map(({ status }) => status)
        .sort(),
    )
    .toEqual(["pending", "superseded"]);
  await expect(conflictHeading).toHaveCount(0);
  const resolved = await readStoredRunner(first, sessionId);
  expect(resolved.operations.map(({ status }) => status).sort()).toEqual([
    "pending",
    "superseded",
  ]);
  const pending = resolved.operations.find(
    ({ status }) => status === "pending",
  );
  expect(pending?.idempotencyKey).toBe(chosenKey);

  await second.close();
  const savedResponse = first.waitForResponse((response) =>
    isOperationRequest(response.request()),
  );
  // The offline portion may intentionally fail private Next chunk requests.
  // All offline conflict behavior is asserted above; clear those expected
  // transport failures before proving the restored online save is clean.
  harness.signals.failedRequests.length = 0;
  await harness.context.setOffline(false);
  expect((await savedResponse).status()).toBe(200);
  await expect(
    first.locator(".runner-progress").getByText("Saved", { exact: true }),
  ).toBeVisible();
  expect(harness.signals.operationRequests).toHaveLength(1);
  expect(operationKey(harness.signals.operationRequests[0]!)).toBe(chosenKey);
  expect(harness.signals.failedRequests).toEqual([]);
  expect(harness.signals.failedResponses).toEqual([]);
  await cleanup(first);
  await harness.close();
});

test("a confirmed save outranks a stale tab and durable completion freezes a suspended tab", async ({
  browser,
}, testInfo) => {
  const harness = await openSharedResiliencePages(
    browser,
    `${testInfo.project.name}-saved-and-terminal-tab-precedence`,
    testInfo,
  );
  const [first, second] = harness.pages;
  await second.addInitScript(() => {
    const runtime = globalThis as typeof globalThis & {
      __mwpSuspendRunnerRecovery?: boolean;
    };
    runtime.__mwpSuspendRunnerRecovery = true;
    Object.defineProperty(globalThis, "BroadcastChannel", {
      configurable: true,
      value: undefined,
    });
    type AddListener = (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ) => void;
    const addWindowListener = window.addEventListener.bind(
      window,
    ) as AddListener;
    window.addEventListener = ((
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ) => {
      if (type !== "focus") {
        addWindowListener(type, listener, options);
        return;
      }
      addWindowListener(
        type,
        (event) => {
          if (runtime.__mwpSuspendRunnerRecovery) return;
          if (typeof listener === "function") listener.call(window, event);
          else listener.handleEvent(event);
        },
        options,
      );
    }) as typeof window.addEventListener;
    const addDocumentListener = document.addEventListener.bind(
      document,
    ) as AddListener;
    document.addEventListener = ((
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ) => {
      if (type !== "visibilitychange") {
        addDocumentListener(type, listener, options);
        return;
      }
      addDocumentListener(
        type,
        (event) => {
          if (runtime.__mwpSuspendRunnerRecovery) return;
          if (typeof listener === "function") listener.call(document, event);
          else listener.handleEvent(event);
        },
        options,
      );
    }) as typeof document.addEventListener;
  });
  const sessionId = await onboardAndOpenPush(first);
  const workoutPath = new URL(first.url()).pathname;
  await second.goto(workoutPath);
  await expect(
    second.getByRole("heading", { name: "Dumbbell bench press" }),
  ).toBeVisible();
  await second.evaluate(() => {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      get: () => false,
    });
    window.dispatchEvent(new Event("offline"));
  });
  await second.getByLabel("Weight (lb)").fill("30");
  await second.getByLabel("Repetitions").fill("12");
  await expect
    .poll(async () => (await readStoredRunner(second, sessionId)).draftWeightKg)
    .toBeCloseTo(13.608, 3);
  const staleSave = second.evaluate(async (expectedSessionId) => {
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      const savedExists = await new Promise<boolean>((resolve, reject) => {
        const open = indexedDB.open("my-workout-pal-runner");
        open.onerror = () =>
          reject(open.error ?? new Error("IndexedDB open failed"));
        open.onsuccess = () => {
          const database = open.result;
          const transaction = database.transaction("runnerStates", "readonly");
          const request = transaction.objectStore("runnerStates").getAll();
          request.onerror = () =>
            reject(request.error ?? new Error("IndexedDB read failed"));
          request.onsuccess = () => {
            const records = request.result as Array<{
              sessionId?: unknown;
              state?: { operations?: Array<{ status?: unknown }> };
            }>;
            resolve(
              records.some(
                (record) =>
                  record.sessionId === expectedSessionId &&
                  record.state?.operations?.some(
                    ({ status }) => status === "saved",
                  ),
              ),
            );
          };
          transaction.oncomplete = () => database.close();
        };
      });
      if (savedExists) {
        const save = [
          ...document.querySelectorAll<HTMLButtonElement>("button"),
        ].find((button) => /^(Log|Update) set & rest$/.test(button.textContent?.trim() ?? ""));
        if (!save)
          throw new Error("The stale tab save control is unavailable.");
        const weight = document.querySelector<HTMLInputElement>(
          "fieldset.runner-editor input",
        );
        const observed = {
          broadcastType: typeof globalThis.BroadcastChannel,
          disabled: save.disabled,
          suspended: Boolean(
            (
              globalThis as typeof globalThis & {
                __mwpSuspendRunnerRecovery?: boolean;
              }
            ).__mwpSuspendRunnerRecovery,
          ),
          weight: weight?.value,
        };
        save.click();
        return observed;
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    throw new Error("The confirmed set did not reach durable storage in time.");
  }, sessionId);

  await first.bringToFront();
  await saveWeightSet(first, "25");
  const requestsAfterConfirmedSet = harness.signals.operationRequests.length;
  expect(requestsAfterConfirmedSet).toBe(1);

  await expect(staleSave).resolves.toEqual({
    broadcastType: "undefined",
    disabled: false,
    suspended: true,
    weight: "30",
  });
  await expect
    .poll(async () =>
      (await readStoredRunner(second, sessionId)).operations
        .map(({ status }) => status)
        .sort(),
    )
    .toEqual(["saved", "superseded"].sort());
  expect(harness.signals.operationRequests).toHaveLength(
    requestsAfterConfirmedSet,
  );

  await second.bringToFront();
  await expect(
    second.getByRole("progressbar", { name: /1 of \d+ work sets logged/iu }),
  ).toBeVisible();
  await expect(second.getByLabel("Weight (lb)")).toHaveValue("25");
  await expect(
    second.getByRole("heading", { name: "Choose the workout value to keep" }),
  ).toHaveCount(0);

  await first.bringToFront();
  await preparePushCompletion(first);
  const requestsBeforeStaleNote = harness.signals.operationRequests.length;
  await second
    .getByLabel(/Private note for Dumbbell bench press/iu)
    .fill("This stale tab note must not reopen a completed workout.");
  await expect(second.getByRole("button", { name: "Save note" })).toBeDisabled();
  await expect(second.getByRole("textbox", { name: /Private note/iu })).not.toHaveValue(
    "This stale tab note must not reopen a completed workout.",
  );
  expect(
    (await readStoredRunner(second, sessionId)).operations.filter(
      ({ kind }) => kind === "save_note",
    ),
  ).toEqual([]);
  expect(harness.signals.operationRequests).toHaveLength(
    requestsBeforeStaleNote,
  );

  const requestsBeforeCompletion = harness.signals.operationRequests.length;
  const completionRequest = first.waitForRequest((request) => {
    if (!isOperationRequest(request)) return false;
    const body = request.postDataJSON() as Record<string, unknown>;
    return body["kind"] === "complete_session";
  });
  const completionResponse = first.waitForResponse((response) => {
    if (!isOperationRequest(response.request())) return false;
    const body = response.request().postDataJSON() as Record<string, unknown>;
    return body["kind"] === "complete_session";
  });
  await first.getByRole("button", { name: "Complete workout" }).click();
  await completionRequest;

  expect((await completionResponse).status()).toBe(200);
  await expect(first).toHaveURL(`/app/history/${sessionId}`);
  await expect
    .poll(async () => readStoredRunner(first, sessionId))
    .toMatchObject({
      schemaVersion: 2,
      stateStatus: "completed",
      operations: expect.arrayContaining([
        expect.objectContaining({ kind: "complete_session", status: "saved" }),
      ]),
    });
  expect(
    (await readStoredRunner(first, sessionId)).operations.filter(
      ({ kind }) => kind === "save_note",
    ),
  ).toEqual([]);
  expect(harness.signals.operationRequests).toHaveLength(
    requestsBeforeCompletion + 1,
  );
  await expect(first).toHaveTitle(/\S/u);
  await assertAccessible(first);

  await second.evaluate(() => {
    const runtime = globalThis as typeof globalThis & {
      __mwpSuspendRunnerRecovery?: boolean;
    };
    runtime.__mwpSuspendRunnerRecovery = false;
    window.dispatchEvent(new Event("focus"));
  });
  await second.bringToFront();
  await expect(second).toHaveURL(`/app/history/${sessionId}`);
  await expect(
    second.getByRole("heading", { name: "Push", exact: true }),
  ).toBeVisible();
  await expect(second).toHaveTitle(/\S/u);
  await assertAccessible(second);
  if (testInfo.project.name === "webkit-phone") {
    await attachRunnerEvidence(
      second,
      testInfo,
      "runner-terminal-reconciliation-phone",
    );
  }
  expect(harness.signals.failedRequests).toEqual([]);
  expect(harness.signals.failedResponses).toEqual([]);
  await cleanup(first);
  await harness.close();
});
