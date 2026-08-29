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
} from "../fixtures/authenticated-app/server/harness-context";
import type { ProfileProgramReadModel } from "@/server/repositories/profile-program";

type HarnessSummary = Readonly<{
  counts: Readonly<{
    programRevisions: number;
    programRoots: number;
    workoutSnapshots: number;
  }>;
  programs: number;
}>;

type OpenHarnessPage = Readonly<{
  close: () => Promise<void>;
  failedResponses: string[];
  page: Page;
}>;

const UUID_KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const LEGACY_STARTER_DAY_KEYS = new Set(["push", "pull", "lower", "upper", "legs"]);

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

function harnessHeaders(
  scope: string,
  viewer: "alice" | "bob",
): Record<string, string> {
  return {
    [HARNESS_SCENARIO_HEADER]: "ready",
    [HARNESS_SCOPE_HEADER]: scope,
    [HARNESS_VIEWER_HEADER]: viewer,
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
  viewer: "alice" | "bob",
  testInfo: TestInfo,
): Promise<BrowserContext> {
  const context = await browser.newContext(projectContextOptions(testInfo));
  await context.route(/^http:\/\/127\.0\.0\.1:\d+\//, async (route) => {
    await route.continue({
      headers: { ...route.request().headers(), ...harnessHeaders(scope, viewer) },
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
  viewer: "alice" | "bob",
  testInfo: TestInfo,
): Promise<OpenHarnessPage> {
  const context = await createHarnessContext(browser, scope, viewer, testInfo);
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

async function privateRequest(
  page: Page,
  path: string,
  options: Readonly<{ body?: unknown; method?: "GET" | "POST" }> = {},
) {
  return page.evaluate(
    async ({ body, method, path: requestPath }) => {
      const headers: Record<string, string> = {};
      if (method === "POST") {
        const csrf = await fetch("/api/auth/csrf", {
          cache: "no-store",
          credentials: "same-origin",
        });
        const csrfBody = (await csrf.json()) as { token?: unknown };
        if (typeof csrfBody.token !== "string") throw new Error("CSRF fixture failed");
        headers["Content-Type"] = "application/json";
        headers["X-CSRF-Token"] = csrfBody.token;
      }
      const response = await fetch(requestPath, {
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        cache: "no-store",
        credentials: "same-origin",
        headers,
        method,
      });
      return {
        body: await response.json(),
        cacheControl: response.headers.get("cache-control"),
        status: response.status,
      };
    },
    { body: options.body, method: options.method ?? "GET", path },
  );
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

async function readHarnessSummary(page: Page): Promise<HarnessSummary> {
  const response = await privateRequest(page, "/api/harness/scope");
  expect(response.status).toBe(200);
  return response.body as HarnessSummary;
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

async function chooseEditorMovement(
  page: Page,
  query: string,
  name: string | RegExp,
) {
  const chooser = page.getByRole("dialog");
  await chooser.getByRole("searchbox", { name: "Search movements" }).fill(query);
  await chooser.getByRole("button", { name }).click();
  await chooser.getByRole("button", { name: "Use this movement" }).click();
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

function topologyKeys(program: NonNullable<ProfileProgramReadModel["activeProgram"]>) {
  return program.days.map((day) => ({
    cardio: day.cardio.map(({ cardioKey }) => cardioKey),
    dayKey: day.dayKey,
    prescriptions: day.sections.map((section) =>
      section.prescriptions.map(({ prescriptionKey }) => prescriptionKey),
    ),
    sections: day.sections.map(({ sectionKey }) => sectionKey),
  }));
}

function rowIds(program: NonNullable<ProfileProgramReadModel["activeProgram"]>) {
  return program.days.flatMap((day) => [
    day.id,
    ...day.sections.flatMap((section) => [
      section.id,
      ...section.prescriptions.map(({ id }) => id),
    ]),
    ...day.cardio.map(({ id }) => id),
  ]);
}

function workoutApiPath(workoutUrl: string): string {
  const sessionId = new URL(workoutUrl).pathname.split("/").at(-1);
  if (!sessionId) throw new Error("The workout session URL is malformed.");
  return `/api/app/workouts/${sessionId}`;
}

test("a custom flexible routine survives publication, workout snapshots, and equipment revision", async ({
  browser,
}, testInfo) => {
  test.slow();
  const scope = `${testInfo.project.name}-flexible-routine`;
  const alice = await openHarnessPage(browser, scope, "alice", testInfo);

  await alice.page.goto("/app");
  expect((await submitOnboarding(alice.page)).status()).toBe(201);
  await alice.page.getByRole("link", { name: /Manage routines/ }).click();
  await alice.page.getByRole("radio", { name: /Custom starting point/ }).check();
  await alice.page.getByLabel("Program name").fill("Weekend route");
  await alice.page.getByLabel("First day name").fill("Sunrise strength");
  await alice.page.getByLabel("First section name").fill("Main work");
  await alice.page.getByLabel("First movement").selectOption({ label: "Dumbbell bench press" });
  const createResponse = alice.page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/app/programs" &&
      response.request().method() === "POST",
  );
  await alice.page.getByRole("button", { name: "Publish custom routine" }).click();
  expect((await createResponse).status()).toBe(201);

  await expect(alice.page.getByRole("heading", { name: "Weekend route" })).toBeVisible();
  await expect(alice.page.getByText("Revision 1 · Dumbbells · 1 day")).toBeVisible();
  await expect(alice.page.locator(".member-day-grid > li")).toHaveCount(1);
  await expect(alice.page.getByText("1 movements · no cardio")).toBeVisible();
  const created = await readProfileProgram(alice.page);
  const createdProgram = created.activeProgram;
  if (!createdProgram) throw new Error("The custom program was not activated.");
  expect(createdProgram.sourceTemplateRevisionId).toBeNull();
  expect(createdProgram.days).toHaveLength(1);
  expect(createdProgram.days[0]?.dayKey).toMatch(UUID_KEY);
  expect(createdProgram.days[0]?.sections[0]?.title).toBe("Main work");
  expect(createdProgram.days[0]?.cardio).toEqual([]);
  const createdDayKey = createdProgram.days[0]!.dayKey;
  await expect(alice.page.getByRole("link", { name: /Sunrise strength/ })).toHaveAttribute(
    "href",
    `/app/program/${createdDayKey}`,
  );

  await alice.page.getByRole("link", { name: /Sunrise strength/ }).click();
  await expect(alice.page).toHaveURL(`/app/program/${createdDayKey}`);
  await expect(alice.page.getByText("1 movements · no cardio finish")).toBeVisible();
  await expect(alice.page.getByRole("heading", { name: "Strength only" })).toBeVisible();
  await expect(alice.page.getByText("This day has no configured cardio segment.")).toBeVisible();
  const firstStart = alice.page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/app/workouts" &&
      response.request().method() === "POST",
  );
  await alice.page.getByRole("button", { name: "Start or resume workout" }).click();
  expect((await firstStart).status()).toBe(201);
  await expect(alice.page).toHaveURL(/\/workout\/[0-9a-f-]+$/u);
  await expect(alice.page.getByRole("heading", { level: 1, name: "Sunrise strength" })).toBeVisible();
  await expect(alice.page.getByText("Main work", { exact: true })).toBeVisible();
  expect((await submitRunnerAction(alice.page, "Skip exercise")).status()).toBe(200);
  const completion = submitRunnerAction(alice.page, "Complete workout");
  expect((await completion).status()).toBe(200);
  await expect(alice.page).toHaveURL(/\/app\/history\/[0-9a-f-]+$/u);
  const originalHistoryUrl = alice.page.url();
  await expect(alice.page.getByRole("heading", { name: "Sunrise strength" })).toBeVisible();
  await expect(alice.page.getByText(/Main work · skipped/u)).toBeVisible();

  await alice.page.goto("/app/program/edit");
  await alice.page.getByLabel("Day name").fill("Sunrise power");
  await alice.page.getByRole("button", { name: "Add day" }).click();
  const daySetup = alice.page.getByRole("region", {
    name: "Name the day before choosing its first movement",
  });
  await daySetup.getByLabel("Day name").fill("Tempo and touch");
  await daySetup.getByLabel("First section name").fill("Tempo drills");
  await daySetup.getByRole("button", { name: "Choose first movement" }).click();
  await expect(alice.page.getByRole("dialog", { name: "Choose the first movement" })).toBeVisible();
  await chooseEditorMovement(alice.page, "Dumbbell bench press", /Dumbbell bench press/);
  await expect(alice.page.getByRole("heading", { level: 2, name: "Tempo and touch" })).toBeVisible();

  await alice.page.getByRole("button", { name: "Duplicate Tempo and touch" }).click();
  await alice.page.getByLabel("Day name").fill("Mobility reset");

  const mainWorkSection = alice.page
    .locator("fieldset.program-editor-section")
    .filter({ has: alice.page.getByLabel("Section name for strength") });
  await mainWorkSection.getByRole("button", { name: "Add movement" }).click();
  await chooseEditorMovement(alice.page, "Dumbbell curl", /Dumbbell curl/);
  const curlPrescription = mainWorkSection
    .locator("li.program-editor-prescription")
    .filter({ has: alice.page.getByRole("heading", { level: 3, name: "Dumbbell curl" }) });
  await curlPrescription.getByRole("button", { name: "Move Dumbbell curl up" }).click();
  await expect(mainWorkSection.locator("li.program-editor-prescription h3")).toHaveText([
    "Dumbbell curl",
    "Dumbbell bench press",
  ]);
  const benchPrescription = mainWorkSection
    .locator("li.program-editor-prescription")
    .filter({ has: alice.page.getByRole("heading", { level: 3, name: "Dumbbell bench press" }) });
  await benchPrescription.getByRole("button", { name: "Replace Dumbbell bench press" }).click();
  await chooseEditorMovement(alice.page, "Front plank", /Front plank/);
  const frontPlankInMain = mainWorkSection
    .locator("li.program-editor-prescription")
    .filter({ has: alice.page.getByRole("heading", { level: 3, name: "Front plank" }) });
  await frontPlankInMain.getByRole("button", { name: "Remove Front plank" }).click();
  const movementRemoval = alice.page.getByRole("dialog");
  await expect(movementRemoval.getByRole("heading", { name: "Remove Front plank?" })).toBeVisible();
  await movementRemoval.getByRole("button", { name: "Keep movement" }).click();
  await expect(frontPlankInMain).toBeVisible();
  await expect(frontPlankInMain.getByRole("button", { name: "Remove Front plank" })).toBeFocused();
  await frontPlankInMain.getByRole("button", { name: "Remove Front plank" }).click();
  await movementRemoval.getByRole("button", { name: "Remove movement" }).click();
  await expect(frontPlankInMain).toHaveCount(0);
  await expect(curlPrescription).toBeFocused();

  await alice.page.getByRole("button", { name: "Add accessory section" }).click();
  const carrySection = alice.page
    .locator("fieldset.program-editor-section")
    .filter({ has: alice.page.getByLabel("Section name for accessory") });
  await carrySection.getByLabel("Section name for accessory").fill("Carry prep");
  await carrySection.getByRole("button", { name: "Add movement" }).click();
  await chooseEditorMovement(alice.page, "Goblet squat", /Goblet squat/);
  await alice.page.getByRole("button", { name: "Move Carry prep section up" }).click();

  await alice.page.getByRole("button", { name: "Add core section" }).click();
  const trunkSection = alice.page
    .locator("fieldset.program-editor-section")
    .filter({ has: alice.page.getByLabel("Section name for core") });
  await trunkSection.getByLabel("Section name for core").fill("Trunk check");
  await trunkSection.getByRole("button", { name: "Add movement" }).click();
  const inlineChooser = alice.page.getByRole("dialog", { name: "Add movement" });
  await inlineChooser.getByRole("button", { name: "Create private movement" }).click();
  await inlineChooser.getByLabel("Movement name").fill("QA tempo hold");
  await inlineChooser.getByLabel("How results are logged").selectOption("duration");
  const inlineCreate = alice.page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/app/custom-exercises" &&
      response.request().method() === "POST",
  );
  await inlineChooser.getByRole("button", { name: "Create and use" }).click();
  expect((await inlineCreate).status()).toBe(201);
  const privatePrescription = trunkSection
    .locator("li.program-editor-prescription")
    .filter({ has: alice.page.getByRole("heading", { level: 3, name: "QA tempo hold" }) });
  await expect(privatePrescription.getByText("core · duration", { exact: true })).toBeVisible();
  await expect(privatePrescription.getByLabel("Minimum seconds")).toHaveValue("20");
  await expect(privatePrescription.getByLabel("Maximum seconds")).toHaveValue("45");
  await carrySection.getByRole("button", { name: "Remove Carry prep section" }).click();
  const sectionRemoval = alice.page.getByRole("dialog");
  await expect(sectionRemoval.getByRole("heading", { name: "Remove Carry prep?" })).toBeVisible();
  await expect(sectionRemoval.getByText("Goblet squat", { exact: true })).toBeVisible();
  await sectionRemoval.getByRole("button", { name: "Keep section" }).click();
  await expect(carrySection).toBeVisible();
  await expect(carrySection.getByRole("button", { name: "Remove Carry prep section" })).toBeFocused();
  await carrySection.getByRole("button", { name: "Remove Carry prep section" }).click();
  await sectionRemoval.getByRole("button", { name: "Remove section and movements" }).click();
  await expect(carrySection).toHaveCount(0);

  await alice.page.getByRole("button", { name: "Add walker cardio" }).click();
  await alice.page.getByRole("button", { name: "Add runner cardio" }).click();
  await alice.page.getByRole("button", { name: "Move runner cardio up" }).click();
  await expect(alice.page.locator(".program-editor-cardio-grid > section h3")).toHaveText([
    "runner",
    "walker",
  ]);
  await alice.page.getByRole("button", { name: "Remove walker cardio" }).click();
  await alice.page.getByRole("button", { name: "Add walker cardio" }).click();
  await expect(alice.page.locator(".program-editor-cardio-grid > section h3")).toHaveText([
    "runner",
    "walker",
  ]);
  await alice.page.getByRole("button", { name: "Move Mobility reset up" }).click();
  await alice.page.getByRole("button", { name: "Remove Tempo and touch" }).click();
  const removal = alice.page.getByRole("dialog");
  await expect(removal.getByRole("heading", { name: "Remove this day?" })).toBeVisible();
  await removal.getByRole("button", { name: "Remove day" }).click();
  await alice.page.getByRole("button", { name: "Move Mobility reset up" }).click();
  await expect(
    alice.page.locator(".program-editor-outline > ol > li > button strong"),
  ).toHaveText(["Mobility reset", "Sunrise power"]);
  const unpublishedDayId = await alice.page
    .getByRole("button", { name: /Mobility reset \d+ movements$/u })
    .getAttribute("id");
  const unpublishedDayKey = unpublishedDayId?.replace("program-day-", "");
  expect(unpublishedDayKey).toMatch(UUID_KEY);
  const unpublishedSectionKeys = await alice.page
    .locator("fieldset.program-editor-section legend input")
    .evaluateAll((inputs) => inputs.map((input) => input.id.replace("program-section-name-", "")));
  const unpublishedPrescriptionKeys = await alice.page
    .locator("li.program-editor-prescription")
    .evaluateAll((rows) => rows.map((row) => row.id.replace("program-prescription-", "")));
  const editorEvidence = testInfo.outputPath(`flexible-day-builder-editor-${testInfo.project.name}.png`);
  await alice.page.screenshot({ fullPage: true, path: editorEvidence });
  await testInfo.attach("flexible-day-builder-editor", {
    contentType: "image/png",
    path: editorEvidence,
  });

  const publishResponse = alice.page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/app/program/publish" &&
      response.request().method() === "POST",
  );
  await alice.page.getByRole("button", { name: "Publish new revision" }).click();
  expect((await publishResponse).status()).toBe(200);
  await expect(alice.page.getByText(/Published revision 2/)).toBeVisible();
  const publishedFromEditor = await readProfileProgram(alice.page);
  const publishedDay = publishedFromEditor.activeProgram?.days.find(
    ({ displayName }) => displayName === "Mobility reset",
  );
  if (!publishedDay) throw new Error("The published day-builder result is unavailable.");
  expect(publishedDay.dayKey).toBe(unpublishedDayKey);
  expect(publishedDay.sections.map(({ sectionKey }) => sectionKey)).toEqual(
    unpublishedSectionKeys,
  );
  expect(publishedDay.sections.flatMap(({ prescriptions }) =>
    prescriptions.map(({ prescriptionKey }) => prescriptionKey),
  )).toEqual(unpublishedPrescriptionKeys);
  expect(publishedDay.sections.map(({ title }) => title)).toEqual(["Tempo drills", "Trunk check"]);
  expect(publishedDay.sections.flatMap(({ prescriptions }) =>
    prescriptions.map(({ label }) => label),
  )).toEqual(["Dumbbell curl", "QA tempo hold"]);
  expect(publishedDay.cardio.map(({ mode }) => mode)).toEqual(["runner", "walker"]);
  await assertAccessible(alice.page);

  await alice.page.getByRole("link", { name: "Open saved day" }).click();
  await expect(alice.page).toHaveURL(`/app/program/${publishedDay.dayKey}`);
  await alice.page.reload();
  await expect(alice.page.getByRole("heading", { level: 1, name: "Mobility reset" })).toBeVisible();
  await expect(alice.page.getByText("2 movements · 2 cardio options")).toBeVisible();
  await expect(alice.page.locator(".member-cardio-card li strong")).toHaveText(["Runner", "Walker"]);
  await expect(alice.page.locator(".member-cardio-card li span")).toHaveText(["20 minutes", "20 minutes"]);
  await expect(alice.page.getByRole("heading", { level: 2, name: "Tempo drills" })).toBeVisible();
  await expect(alice.page.getByRole("heading", { level: 2, name: "Trunk check" })).toBeVisible();
  const savedDayEvidence = testInfo.outputPath(`flexible-day-builder-saved-day-${testInfo.project.name}.png`);
  await alice.page.screenshot({ fullPage: true, path: savedDayEvidence });
  await testInfo.attach("flexible-day-builder-saved-day", {
    contentType: "image/png",
    path: savedDayEvidence,
  });

  await alice.page.goto("/app");
  await expect(alice.page.getByText("Revision 2 · Dumbbells · 2 days")).toBeVisible();
  await expect(alice.page.locator(".member-day-grid > li")).toHaveCount(2);
  const published = await readProfileProgram(alice.page);
  const publishedProgram = published.activeProgram;
  if (!publishedProgram) throw new Error("The flexible publication was not activated.");
  expect(publishedProgram.days.map(({ displayName }) => displayName)).toEqual([
    "Mobility reset",
    "Sunrise power",
  ]);
  expect(publishedProgram.days.map(({ cardio }) => cardio.length)).toEqual([2, 0]);
  for (const day of publishedProgram.days) {
    expect(day.dayKey).toMatch(UUID_KEY);
    expect(LEGACY_STARTER_DAY_KEYS.has(day.dayKey)).toBe(false);
    await expect(alice.page.getByRole("link", { name: new RegExp(day.displayName, "u") })).toHaveAttribute(
      "href",
      `/app/program/${day.dayKey}`,
    );
  }

  await alice.page.getByRole("link", { name: /Mobility reset/ }).click();
  await expect(alice.page.getByText("2 movements · 2 cardio options")).toBeVisible();
  await expect(alice.page.getByRole("heading", { name: "Choose a finish" })).toBeVisible();
  await expect(alice.page.locator(".member-cardio-card li strong")).toHaveText(["Runner", "Walker"]);
  await expect(alice.page.locator(".member-cardio-card li span")).toHaveText(["20 minutes", "20 minutes"]);
  const secondStart = alice.page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/app/workouts" &&
      response.request().method() === "POST",
  );
  await alice.page.getByRole("button", { name: "Start or resume workout" }).click();
  expect((await secondStart).status()).toBe(201);
  await expect(alice.page).toHaveURL(/\/workout\/[0-9a-f-]+$/u);
  const activeSessionUrl = alice.page.url();
  await expect(alice.page.getByRole("heading", { level: 1, name: "Mobility reset" })).toBeVisible();
  await expect(alice.page.getByText("Tempo drills", { exact: true })).toBeVisible();
  await expect(alice.page.getByRole("button", { name: /Dumbbell curl/i })).toBeVisible();
  await expect(alice.page.getByRole("button", { name: /QA tempo hold/i })).toBeVisible();
  await expect(alice.page.getByText(publishedProgram.revisionId, { exact: true })).toBeVisible();

  const equipmentPage = await alice.page.context().newPage();
  await equipmentPage.goto("/app");
  const beforeEquipmentSummary = await readHarnessSummary(equipmentPage);
  const beforeEquipment = await readProfileProgram(equipmentPage);
  await equipmentPage
    .getByRole("group", { name: "Equipment profile" })
    .getByRole("button", { name: /Barbell \+ rack/ })
    .click();
  await expect(equipmentPage.getByRole("heading", { name: "Review Barbell + rack" })).toBeVisible();
  const equipmentResponse = equipmentPage.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/app/profile-program/equipment" &&
      response.request().method() === "POST",
  );
  await equipmentPage.getByRole("button", { name: "Confirm Barbell + rack" }).click();
  expect((await equipmentResponse).status()).toBe(200);
  await expect(equipmentPage.getByText(/Saved revision 3/)).toBeVisible();
  const afterEquipment = await readProfileProgram(equipmentPage);
  const afterEquipmentSummary = await readHarnessSummary(equipmentPage);
  const equipmentProgram = afterEquipment.activeProgram;
  if (!equipmentProgram || !beforeEquipment.activeProgram) {
    throw new Error("The equipment revision response was incomplete.");
  }
  expect(afterEquipmentSummary.counts.programRevisions).toBe(
    beforeEquipmentSummary.counts.programRevisions + 1,
  );
  expect(afterEquipmentSummary.counts.programRoots).toBe(beforeEquipmentSummary.counts.programRoots);
  expect(equipmentProgram.revisionNumber).toBe(publishedProgram.revisionNumber + 1);
  expect(equipmentProgram.equipmentProfileKind).toBe("barbell");
  expect(equipmentProgram.sourceTemplateRevisionId).toBeNull();
  expect(topologyKeys(equipmentProgram)).toEqual(topologyKeys(publishedProgram));
  expect(rowIds(equipmentProgram)).not.toEqual(rowIds(publishedProgram));
  expect(equipmentProgram.days.flatMap(({ sections }) => sections).map(({ title }) => title)).not.toContain("Core");
  await equipmentPage.close();

  await alice.page.goto(activeSessionUrl);
  await expect(alice.page.getByRole("heading", { level: 1, name: "Mobility reset" })).toBeVisible();
  await expect(alice.page.getByText("Tempo drills", { exact: true })).toBeVisible();
  await expect(alice.page.getByText(publishedProgram.revisionId, { exact: true })).toBeVisible();
  const runnerEvidence = testInfo.outputPath(`flexible-routine-runner-${testInfo.project.name}.png`);
  await alice.page.screenshot({ fullPage: true, path: runnerEvidence });
  await testInfo.attach("flexible-routine-immutable-runner", {
    contentType: "image/png",
    path: runnerEvidence,
  });
  expect((await submitRunnerAction(alice.page, "Skip exercise")).status()).toBe(200);
  await alice.page.getByRole("button", { name: /QA tempo hold/i }).click();
  await expect(alice.page.getByText("Trunk check", { exact: true })).toBeVisible();
  expect((await submitRunnerAction(alice.page, "Skip exercise")).status()).toBe(200);
  await alice.page.getByRole("button", { name: /Runner/ }).click();
  await alice.page.getByLabel("Duration (seconds)").last().fill("900");
  await alice.page.getByLabel("Cardio notes").fill("Saved flexible runner");
  expect((await submitRunnerAction(alice.page, "Save cardio")).status()).toBe(200);
  const resumedCompletion = submitRunnerAction(alice.page, "Complete workout");
  expect((await resumedCompletion).status()).toBe(200);
  await expect(alice.page).toHaveURL(
    workoutApiPath(activeSessionUrl).replace("/api/app/workouts/", "/app/history/"),
  );

  await alice.page.goto(originalHistoryUrl);
  await expect(alice.page.getByRole("heading", { name: "Sunrise strength" })).toBeVisible();
  await expect(alice.page.getByText(/Main work · skipped/u)).toBeVisible();
  await expect(alice.page.getByText("Sunrise power", { exact: true })).toHaveCount(0);
  await assertAccessible(alice.page);
  const historyEvidence = testInfo.outputPath(`flexible-routine-history-${testInfo.project.name}.png`);
  await alice.page.screenshot({ fullPage: true, path: historyEvidence });
  await testInfo.attach("flexible-routine-pre-edit-history", {
    contentType: "image/png",
    path: historyEvidence,
  });

  const bob = await openHarnessPage(browser, scope, "bob", testInfo);
  await bob.page.goto("/app");
  expect((await submitOnboarding(bob.page)).status()).toBe(201);
  await expect(bob.page.getByRole("heading", { name: "Choose a training day" })).toBeVisible();
  await bob.page.goto("/app/program/edit");
  const bobSection = bob.page.locator("fieldset.program-editor-section").first();
  await bobSection.getByRole("button", { name: "Add movement" }).click();
  const bobChooser = bob.page.getByRole("dialog", { name: "Add movement" });
  await bobChooser.getByRole("radio", { name: "Mine" }).check();
  await bobChooser.getByRole("searchbox", { name: "Search movements" }).fill("QA tempo hold");
  await expect(bobChooser.getByText("No compatible movement matches this search.")).toBeVisible();
  await bobChooser.getByRole("button", { name: "Close movement chooser" }).click();
  const foreignDay = equipmentProgram.days[0]!;
  const foreignStart = await privateRequest(bob.page, "/api/app/workouts", {
    body: {
      dayId: foreignDay.id,
      idempotencyKey: "foreign-flexible-day",
      programId: equipmentProgram.id,
    },
    method: "POST",
  });
  const missingStart = await privateRequest(bob.page, "/api/app/workouts", {
    body: {
      dayId: "00000000-0000-4000-8000-000000000091",
      idempotencyKey: "missing-flexible-day",
      programId: "00000000-0000-4000-8000-000000000092",
    },
    method: "POST",
  });
  expect(foreignStart).toEqual(missingStart);
  expect(foreignStart).toMatchObject({ body: { error: "not_found" }, status: 404 });
  const foreignSession = await privateRequest(
    bob.page,
    workoutApiPath(activeSessionUrl),
  );
  const missingSession = await privateRequest(
    bob.page,
    "/api/app/workouts/00000000-0000-4000-8000-000000000093",
  );
  expect(foreignSession).toEqual(missingSession);
  expect(foreignSession).toMatchObject({ body: { error: "not_found" }, status: 404 });
  expect(await readHarnessSummary(bob.page)).toMatchObject({
    counts: { workoutSnapshots: 0 },
  });

  expect(alice.failedResponses).toEqual([]);
  expect(bob.failedResponses).toEqual([
    "POST /api/app/workouts 404",
    "POST /api/app/workouts 404",
    `GET ${workoutApiPath(activeSessionUrl)} 404`,
    "GET /api/app/workouts/00000000-0000-4000-8000-000000000093 404",
  ]);
  await bob.page.evaluate(() => fetch("/api/harness/scope", { method: "DELETE" }));
  await bob.close();
  await alice.close();
});
