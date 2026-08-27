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
  return (
    request.method() === "GET" &&
    url.searchParams.has("_rsc") &&
    request.headers()["rsc"] === "1" &&
    request.failure()?.errorText === "net::ERR_ABORTED"
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
  const browserErrors: string[] = [];
  const failedRequests: string[] = [];
  const failedResponses: string[] = [];
  const operationRequests: Request[] = [];
  page.on("console", (message) => {
    if (
      (message.type() === "error" || message.type() === "warning") &&
      !message.text().startsWith("Failed to load resource:")
    ) {
      browserErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("request", (request) => {
    if (isOperationRequest(request)) operationRequests.push(request);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      failedResponses.push(
        `${response.request().method()} ${new URL(response.url()).pathname} ${response.status()}`,
      );
    }
  });
  page.on("requestfailed", (request) => {
    const url = new URL(request.url());
    if (
      url.hostname === "127.0.0.1" &&
      !isSupersededNextFlightRequest(request)
    ) {
      failedRequests.push(
        `${request.method()} ${url.pathname} ${request.failure()?.errorText ?? "unknown request failure"}`,
      );
    }
  });
  return {
    close: async () => {
      expect(browserErrors).toEqual([]);
      await context.close();
    },
    control,
    failedRequests,
    failedResponses,
    operationRequests,
    page,
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

async function onboardAndOpenPush(page: Page): Promise<string> {
  await page.goto("/app");
  const onboard = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/app/profile-program/onboard" &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Create my program" }).click();
  expect((await onboard).status()).toBe(201);
  await page.getByRole("link", { name: /Push/ }).click();
  const start = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/app/workouts" &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Start or resume workout" }).click();
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
  await page.getByRole("button", { name: "Save set" }).click();
}

function operationKey(request: Request): string {
  const body = request.postDataJSON() as Record<string, unknown>;
  if (typeof body["idempotencyKey"] !== "string") {
    throw new Error("The runner request omitted its idempotency key.");
  }
  expect(body).not.toHaveProperty("ownerUid");
  return body["idempotencyKey"];
}

async function cleanup(page: Page): Promise<void> {
  await page.evaluate(() => fetch("/api/harness/scope", { method: "DELETE" }));
}

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
  await harness.page.reload();
  await expect(
    harness.page.getByRole("heading", { name: "Offline queued" }),
  ).toBeVisible();
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
