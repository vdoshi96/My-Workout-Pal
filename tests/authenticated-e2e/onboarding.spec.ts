import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

import {
  HARNESS_SCENARIO_HEADER,
  HARNESS_SCOPE_HEADER,
  HARNESS_VIEWER_HEADER,
  type HarnessScenario,
} from "../fixtures/authenticated-app/server/harness-context";

type ActiveProgramIds = Readonly<{ id: string; revisionId: string }>;

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

async function createHarnessContext(
  browser: Browser,
  scope: string,
  viewer: "alice" | "alice-unverified" | "bob",
  scenario: HarnessScenario = "ready",
): Promise<BrowserContext> {
  const context = await browser.newContext();
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
  scenario: HarnessScenario = "ready",
): Promise<Readonly<{
  close: () => Promise<void>;
  failedResponses: string[];
  page: Page;
}>> {
  const context = await createHarnessContext(browser, scope, viewer, scenario);
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
  return {
    close: async () => {
      expect(errors).toEqual([]);
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
  await page.getByRole("button", { name: "Create my program" }).click();
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

async function programCount(page: Page): Promise<number> {
  return page.evaluate(async () => {
    const response = await fetch("/api/harness/scope", { cache: "no-store" });
    const body = (await response.json()) as { programs?: unknown };
    if (!response.ok || typeof body.programs !== "number") {
      throw new Error("The harness count boundary failed.");
    }
    return body.programs;
  });
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

test("both synthetic owners onboard while unverified and foreign states fail closed", async ({ browser, browserName }, testInfo) => {
  const scope = testInfo.project.name;

  for (const scenario of ["expire-session", "revoke-session"] as const) {
    const rejected = await openPage(browser, scope, "alice", scenario);
    await rejected.page.goto("/app");
    await expect(rejected.page.getByRole("heading", { name: "Sign in required" })).toBeVisible();
    expect(rejected.failedResponses).toEqual([]);
    await rejected.close();
  }

  const unverified = await openPage(browser, scope, "alice-unverified");
  await unverified.page.goto("/app");
  await expect(unverified.page.getByText("Read-only account.")).toBeVisible();
  await expect(unverified.page.getByRole("button", { name: "Create my program" })).toBeDisabled();
  await assertAccessible(unverified.page);
  expect(unverified.failedResponses).toEqual([]);
  await unverified.close();

  const alice = await openPage(browser, scope, "alice");
  await alice.page.goto("/app");
  await alice.page.keyboard.press(browserName === "webkit" ? "Alt+Tab" : "Tab");
  const skipLink = alice.page.getByRole("link", { name: "Skip to content" });
  await expect(skipLink).toBeFocused();
  await skipLink.press("Enter");
  await expect(alice.page).toHaveURL(/#main-content$/);
  const aliceOnboarding = await submitOnboarding(alice.page, "dumbbells");
  expect(aliceOnboarding.response.status()).toBe(201);
  const aliceProgram = activeProgramIds(aliceOnboarding.body);
  await expect(alice.page.getByRole("heading", { name: "Choose a training day" })).toBeVisible();
  await expect(alice.page.locator(".member-day-grid > li")).toHaveCount(5);
  await expect(alice.page.getByText("Revision 1 · Dumbbells · five days")).toBeVisible();
  await assertAccessible(alice.page);
  expect(await alice.page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(alice.failedResponses).toEqual([]);

  const bob = await openPage(browser, scope, "bob");
  await bob.page.goto("/app");
  const bobOnboarding = await submitOnboarding(bob.page, "barbell");
  expect(bobOnboarding.response.status()).toBe(201);
  await expect(bob.page.getByText("Revision 1 · Barbell + rack · five days")).toBeVisible();
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
  await (testInfo.project.name === "chromium-desktop" ? alice.page : bob.page).screenshot({
    fullPage: true,
    path: evidencePath,
  });
  await testInfo.attach(evidenceName, { contentType: "image/png", path: evidencePath });

  await bob.page.evaluate(() => fetch("/api/harness/scope", { method: "DELETE" }));

  await bob.close();
  await alice.close();
});

test("a failed onboarding retry keeps the same idempotency key and never claims success early", async ({ browser }, testInfo) => {
  const scope = `${testInfo.project.name}-retry`;
  const context = await createHarnessContext(browser, scope, "alice", "fail-next-save");
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
  await expect(page.getByRole("heading", { name: "Build your starter route" })).toBeVisible();
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

test("an accepted runner save reconciles after an error response, replays once, and reaches immutable history", async ({ browser }, testInfo) => {
  const scope = `${testInfo.project.name}-runner-recovery`;
  const alice = await openPage(
    browser,
    scope,
    "alice",
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

  const bob = await openPage(browser, scope, "bob");
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

  await alice.page.evaluate(() => fetch("/api/harness/scope", { method: "DELETE" }));
  await bob.close();
  await alice.close();
});
