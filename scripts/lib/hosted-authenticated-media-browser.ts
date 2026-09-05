import AxeBuilder from "@axe-core/playwright";
import {
  chromium,
  expect,
  type BrowserContext,
  type Page,
  type Request,
} from "@playwright/test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import type { Auth } from "firebase-admin/auth";

import { createDatabase, type Database } from "../../src/db/client";
import {
  accountDeletionJobs,
  cardioLogs,
  catalogEquipment,
  catalogExercises,
  curatedVideos,
  customExerciseAliases,
  customExerciseEquipment,
  customExercises,
  customExerciseVideos,
  idempotencyKeys,
  personalRecords,
  programCardioPrescriptions,
  programDays,
  programPrescriptions,
  programRevisions,
  programSections,
  programTemplateRevisions,
  programTemplates,
  progressSummaries,
  progressSummarySources,
  setLogs,
  userEquipmentProfiles,
  userPreferences,
  userProfiles,
  userPrograms,
  workoutExerciseSnapshots,
  workoutExerciseStates,
  workoutSessions,
} from "../../src/db/schema";
import {
  browserZoomEvidenceIsExact,
  cleanupPostconditionIsConfirmed,
  mediaEvidenceIsComplete,
} from "../../src/domain/hosted-authenticated-media-qa";
import {
  createHostedAuthQaIdentity,
  type HostedAuthQaConfig,
  type HostedAuthQaIdentity,
} from "../../src/domain/hosted-auth-qa";
import type { ViewerContext } from "../../src/server/auth/viewer";
import { getFirebaseAdminAuth } from "../../src/server/firebase/admin";
import { createAccountDeletionRepository } from "../../src/server/repositories/account-deletion";
import { executeAccountDeletion } from "../../src/server/services/account-deletion";

const sessionCookieName = "__Host-mwp_session";
const youtubeVideoIdPattern = /^[A-Za-z0-9_-]{11}$/u;

export type HostedAuthenticatedMediaQaStage =
  | "accessibility"
  | "assertions"
  | "browser_launch"
  | "cleanup"
  | "database_baseline"
  | "embed_fallback"
  | "firebase_baseline"
  | "identity_creation"
  | "media_demo_one"
  | "media_demo_one_control"
  | "media_demo_one_playing"
  | "media_demo_two"
  | "media_demo_two_control"
  | "media_demo_two_playing"
  | "media_pair"
  | "onboarding"
  | "runner_load"
  | "session"
  | "workout_start"
  | "zoom"
  | "zoom_app"
  | "zoom_collection"
  | "zoom_editor"
  | "zoom_runner"
  | "zoom_runner_accessibility"
  | "zoom_runner_geometry"
  | "zoom_settings"
  | "zoom_state"
  | "zoom_restore";

export class HostedAuthenticatedMediaQaExecutionError extends Error {
  readonly cleanupConfirmed: boolean;
  readonly safeDetail: string | undefined;
  readonly stage: HostedAuthenticatedMediaQaStage;

  constructor(
    cleanupConfirmed: boolean,
    stage: HostedAuthenticatedMediaQaStage,
    safeDetail?: string,
  ) {
    super("Hosted authenticated media QA failed.");
    this.name = "HostedAuthenticatedMediaQaExecutionError";
    this.cleanupConfirmed = cleanupConfirmed;
    this.safeDetail = safeDetail;
    this.stage = stage;
  }
}

class HostedAuthenticatedMediaQaSafeAssertionError extends Error {
  readonly safeDetail: string;

  constructor(safeDetail: string) {
    super("Hosted authenticated media QA assertion failed.");
    this.name = "HostedAuthenticatedMediaQaSafeAssertionError";
    this.safeDetail = safeDetail;
  }
}

export type HostedAuthenticatedMediaNativeZoomAction =
  | "restore_100_percent"
  | "set_200_percent";

function providerCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }
  return typeof error.code === "string" ? error.code : undefined;
}

function isUserNotFound(error: unknown): boolean {
  return providerCode(error) === "auth/user-not-found";
}

export async function firebaseUserCount(auth: Auth): Promise<number> {
  let total = 0;
  let pageToken: string | undefined;
  let pages = 0;
  do {
    const page = await auth.listUsers(1_000, pageToken);
    total += page.users.length;
    pageToken = page.pageToken;
    pages += 1;
    if (pages > 100) throw new Error("Firebase inventory exceeded its QA bound.");
  } while (pageToken);
  return total;
}

export async function identityIsAbsent(auth: Auth, uid: string): Promise<boolean> {
  try {
    await auth.getUser(uid);
    return false;
  } catch (error) {
    if (isUserNotFound(error)) return true;
    throw error;
  }
}

function rowsDigest(groups: readonly (readonly unknown[])[]): string {
  return createHash("sha256")
    .update(JSON.stringify(groups.map((rows) =>
      rows.map((row) => JSON.stringify(row)).sort()
    )))
    .digest("hex");
}

export async function globalPersistenceDigest(database: Database): Promise<string> {
  return rowsDigest(await Promise.all([
    database.select().from(catalogEquipment),
    database.select().from(catalogExercises),
    database.select().from(curatedVideos),
    database.select().from(programTemplates),
    database.select().from(programTemplateRevisions),
  ]));
}

export async function ownerRowCount(database: Database, ownerUid: string): Promise<number> {
  const groups = await Promise.all([
    database.select().from(userProfiles).where(eq(userProfiles.firebaseUid, ownerUid)),
    database.select().from(userPreferences).where(eq(userPreferences.ownerFirebaseUid, ownerUid)),
    database.select().from(userEquipmentProfiles).where(eq(userEquipmentProfiles.ownerFirebaseUid, ownerUid)),
    database.select().from(customExercises).where(eq(customExercises.ownerFirebaseUid, ownerUid)),
    database.select().from(customExerciseVideos).where(eq(customExerciseVideos.ownerFirebaseUid, ownerUid)),
    database.select().from(customExerciseEquipment).where(eq(customExerciseEquipment.ownerFirebaseUid, ownerUid)),
    database.select().from(customExerciseAliases).where(eq(customExerciseAliases.ownerFirebaseUid, ownerUid)),
    database.select().from(userPrograms).where(eq(userPrograms.ownerFirebaseUid, ownerUid)),
    database.select().from(programRevisions).where(eq(programRevisions.ownerFirebaseUid, ownerUid)),
    database.select().from(programDays).where(eq(programDays.ownerFirebaseUid, ownerUid)),
    database.select().from(programSections).where(eq(programSections.ownerFirebaseUid, ownerUid)),
    database.select().from(programPrescriptions).where(eq(programPrescriptions.ownerFirebaseUid, ownerUid)),
    database.select().from(programCardioPrescriptions).where(eq(programCardioPrescriptions.ownerFirebaseUid, ownerUid)),
    database.select().from(workoutSessions).where(eq(workoutSessions.ownerFirebaseUid, ownerUid)),
    database.select().from(workoutExerciseSnapshots).where(eq(workoutExerciseSnapshots.ownerFirebaseUid, ownerUid)),
    database.select().from(workoutExerciseStates).where(eq(workoutExerciseStates.ownerFirebaseUid, ownerUid)),
    database.select().from(setLogs).where(eq(setLogs.ownerFirebaseUid, ownerUid)),
    database.select().from(cardioLogs).where(eq(cardioLogs.ownerFirebaseUid, ownerUid)),
    database.select().from(idempotencyKeys).where(eq(idempotencyKeys.ownerFirebaseUid, ownerUid)),
    database.select().from(personalRecords).where(eq(personalRecords.ownerFirebaseUid, ownerUid)),
    database.select().from(progressSummaries).where(eq(progressSummaries.ownerFirebaseUid, ownerUid)),
    database.select().from(progressSummarySources).where(eq(progressSummarySources.ownerFirebaseUid, ownerUid)),
  ]);
  return groups.reduce((total, rows) => total + rows.length, 0);
}

export async function deletionJobIsTerminalOrAbsent(
  database: Database,
  ownerUid: string,
): Promise<boolean> {
  const row = (
    await database
      .select({
        completedAt: accountDeletionJobs.completedAt,
        phase: accountDeletionJobs.phase,
        status: accountDeletionJobs.status,
      })
      .from(accountDeletionJobs)
      .where(eq(accountDeletionJobs.ownerFirebaseUid, ownerUid))
      .limit(1)
  )[0];
  return row === undefined ||
    (row.status === "completed" && row.phase === "complete" && row.completedAt !== null);
}

function cleanupViewer(
  uid: string,
  identity: HostedAuthQaIdentity,
): ViewerContext {
  return {
    authTimeSeconds: Math.floor(Date.now() / 1_000),
    displayName: "Athlete",
    eligibleForPermanentMutations: true,
    email: identity.email,
    emailVerified: true,
    provider: "password",
    uid,
  };
}

export async function exactIdentityCleanup(
  auth: Auth,
  database: Database,
  identity: HostedAuthQaIdentity,
  knownUid: string | undefined,
): Promise<string | undefined> {
  let uid = knownUid;
  if (!uid) {
    try {
      uid = (await auth.getUserByEmail(identity.email)).uid;
    } catch (error) {
      if (!isUserNotFound(error)) return undefined;
    }
  }
  if (!uid) return undefined;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      if (
        await ownerRowCount(database, uid) > 0 ||
        !(await deletionJobIsTerminalOrAbsent(database, uid))
      ) {
        await executeAccountDeletion(
          {
            getFirebaseAuth: () => auth,
            getRepository: () => createAccountDeletionRepository(database),
          },
          cleanupViewer(uid, identity),
          {
            confirmation: "DELETE",
            idempotencyKey: `hosted-media-cleanup-${uid}`,
          },
        );
      } else if (!(await identityIsAbsent(auth, uid))) {
        await auth.deleteUser(uid);
      }
    } catch {
      // A bounded second pass reconciles partial provider/database completion.
    }
  }
  return uid;
}

async function assertAccessible(page: Page): Promise<void> {
  const result = await new AxeBuilder({ page })
    .exclude('iframe[src^="https://www.youtube-nocookie.com/embed/"]')
    .analyze();
  const violations = result.violations.filter((violation) =>
    violation.impact === "critical" || violation.impact === "serious"
  );
  if (violations.length > 0) {
    const safeRules = violations.map((violation) => {
      const rule = /^[a-z0-9-]+$/u.test(violation.id)
        ? violation.id
        : "unknown-rule";
      return `${rule}-${violation.nodes.length}`;
    });
    throw new HostedAuthenticatedMediaQaSafeAssertionError(
      `axe-${safeRules.join(",")}`,
    );
  }
}

function isSupersededNextFlightRequest(request: Request): boolean {
  const url = new URL(request.url());
  return request.method() === "GET" &&
    url.searchParams.has("_rsc") &&
    request.headers()["rsc"] === "1" &&
    ["net::ERR_ABORTED", "cancelled"].includes(request.failure()?.errorText ?? "");
}

function isSupersededManifestRequest(request: Request): boolean {
  const url = new URL(request.url());
  const errorText = request.failure()?.errorText ?? "";
  return ["GET", "HEAD"].includes(request.method()) &&
    url.pathname === "/manifest.webmanifest" &&
    (errorText === "cancelled" || errorText.startsWith("net::ERR_ABORTED"));
}

function attachFirstPartyCollectors(page: Page, origin: string) {
  const consoleErrors: string[] = [];
  const consoleWarnings: string[] = [];
  const pageErrors: string[] = [];
  const responseFailures: string[] = [];
  const requestFailures: string[] = [];
  const mutations: string[] = [];

  page.on("console", (message) => {
    const location = message.location().url;
    if (!location.startsWith(origin)) return;
    if (message.type() === "error") consoleErrors.push("first-party error");
    if (message.type() === "warning") consoleWarnings.push("first-party warning");
  });
  page.on("pageerror", () => pageErrors.push("pageerror"));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin === origin && !["GET", "HEAD"].includes(request.method())) {
      mutations.push(`${request.method()} ${url.pathname}`);
    }
  });
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.origin === origin && response.status() >= 400) {
      responseFailures.push(
        `${response.request().method()} ${url.pathname} ${response.status()}`,
      );
    }
  });
  page.on("requestfailed", (request) => {
    const url = new URL(request.url());
    if (
      url.origin === origin &&
      !isSupersededNextFlightRequest(request) &&
      !isSupersededManifestRequest(request)
    ) {
      requestFailures.push(
        `${request.method()} ${url.pathname} ${request.failure()?.errorText ?? "unknown"}`,
      );
    }
  });

  return {
    assertClean() {
      assert.deepEqual(consoleErrors, []);
      assert.deepEqual(consoleWarnings, []);
      assert.deepEqual(pageErrors, []);
      assert.deepEqual(responseFailures, []);
      assert.deepEqual(requestFailures, []);
    },
    mutations,
  };
}

async function assertSecureSessionCookie(
  context: BrowserContext,
  origin: string,
): Promise<void> {
  const cookie = (await context.cookies(origin)).find(
    (candidate) => candidate.name === sessionCookieName,
  );
  assert.ok(cookie);
  assert.equal(cookie.httpOnly, true);
  assert.equal(cookie.secure, true);
  assert.equal(cookie.sameSite, "Strict");
  assert.equal(cookie.path, "/");
  assert.ok(cookie.value.length > 100);
}

async function signIn(
  page: Page,
  context: BrowserContext,
  config: HostedAuthQaConfig,
  identity: HostedAuthQaIdentity,
): Promise<void> {
  await page.goto(`${config.origin}/sign-in?returnTo=%2Fapp`);
  await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
  await page.getByLabel("Email").fill(identity.email);
  await page.getByLabel("Password").fill(identity.password);
  const responsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.origin === config.origin &&
      url.pathname === "/api/auth/session" &&
      response.request().method() === "POST";
  });
  const submit = page.getByRole("button", { name: "Sign in with email", exact: true });
  await submit.focus();
  await page.keyboard.press("Enter");
  assert.equal((await responsePromise).status(), 200);
  await page.waitForURL(`${config.origin}/app`);
  await expect(page.getByText("Verified account", { exact: true })).toBeVisible();
  await assertSecureSessionCookie(context, config.origin);
}

type ActiveProgramIdentity = Readonly<{
  dayId: string;
  programId: string;
}>;

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function uuid(value: unknown): string {
  if (typeof value !== "string") assert.fail("Expected a UUID string.");
  assert.match(
    value,
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu,
  );
  return value;
}

function pushProgramIdentity(value: unknown): ActiveProgramIdentity {
  const root = record(value);
  const activeProgram = record(record(root?.["profileProgram"])?.["activeProgram"]);
  const days = activeProgram?.["days"];
  assert.ok(Array.isArray(days));
  const push = days.map(record).find((day) => day?.["dayKey"] === "push");
  return {
    dayId: uuid(push?.["id"]),
    programId: uuid(activeProgram?.["id"]),
  };
}

async function onboard(page: Page, origin: string): Promise<ActiveProgramIdentity> {
  await expect(page.getByRole("heading", { name: "Build your starter route" })).toBeVisible();
  await expect(page.getByRole("radio", { name: /^Dumbbells/u })).toBeChecked();
  const responsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.origin === origin &&
      url.pathname === "/api/app/profile-program/onboard" &&
      response.request().method() === "POST";
  });
  const create = page.getByRole("button", { name: "Create my program" });
  await create.focus();
  await page.keyboard.press("Enter");
  const response = await responsePromise;
  assert.equal(response.status(), 201);
  const program = pushProgramIdentity(await response.json());
  await expect(page.getByRole("heading", { name: "Five-day starter route" })).toBeVisible();
  return program;
}

async function privateRequest(
  page: Page,
  input: Readonly<{ body: unknown; path: string }>,
): Promise<Readonly<{ body: unknown; status: number }>> {
  return page.evaluate(async ({ body, path }) => {
    const csrf = await fetch("/api/auth/csrf", {
      cache: "no-store",
      credentials: "same-origin",
    });
    const csrfBody = await csrf.json() as { token?: unknown };
    if (!csrf.ok || typeof csrfBody.token !== "string") {
      throw new Error("The private QA request could not obtain CSRF protection.");
    }
    const response = await fetch(path, {
      body: JSON.stringify(body),
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfBody.token,
      },
      method: "POST",
    });
    return { body: await response.json(), status: response.status };
  }, input);
}

async function startWorkout(
  page: Page,
  program: ActiveProgramIdentity,
): Promise<string> {
  const response = await privateRequest(page, {
    body: {
      dayId: program.dayId,
      idempotencyKey: randomUUID(),
      programId: program.programId,
    },
    path: "/api/app/workouts",
  });
  assert.equal(response.status, 201);
  const model = record(record(response.body)?.["model"]);
  const session = record(model?.["session"]);
  return uuid(session?.["id"]);
}

function videoIdFromUrl(value: string | null, segment: "embed" | "watch"): string {
  assert.ok(value);
  const parsed = new URL(value);
  const videoId = segment === "embed"
    ? parsed.pathname.split("/").filter(Boolean).at(-1)
    : parsed.searchParams.get("v");
  assert.ok(videoId && youtubeVideoIdPattern.test(videoId));
  return videoId;
}

async function selectedMediaState(page: Page): Promise<Readonly<{
  fallbackVideoId: string;
  iframeCount: number;
  videoId: string;
}>> {
  const iframe = page.locator(".runner-technique iframe");
  const fallback = page.getByRole("link", { name: "Open this demo on YouTube" });
  return {
    fallbackVideoId: videoIdFromUrl(await fallback.getAttribute("href"), "watch"),
    iframeCount: await iframe.count(),
    videoId: videoIdFromUrl(await iframe.getAttribute("src"), "embed"),
  };
}

async function startSelectedVideo(
  page: Page,
  setStage: (part: "control" | "playing") => void,
): Promise<void> {
  const iframe = page.locator(".runner-technique iframe");
  await iframe.scrollIntoViewIfNeeded();
  await expect(iframe).toBeVisible();
  await expect(iframe).toHaveAttribute("title", /\S/u);
  const frame = page.frameLocator(".runner-technique iframe");
  const play = frame.getByRole("button", { name: "Play video", exact: true });
  setStage("control");
  await play.waitFor({ state: "visible", timeout: 30_000 });
  await play.click();
  setStage("playing");
  await expect(
    frame.getByRole("button", { name: "Pause video", exact: true }),
  ).toBeVisible({ timeout: 30_000 });
}

async function inspectMedia(
  page: Page,
  setStage: (stage: HostedAuthenticatedMediaQaStage) => void,
): Promise<Readonly<{ firstVideoId: string; playingVideoIds: readonly string[] }>> {
  await expect(page.getByRole("heading", { name: "Technique demonstrations" })).toBeVisible();
  await expect(page.getByText("Approved pair", { exact: true })).toBeVisible();
  const tabs = page.getByRole("tab");
  await expect(tabs).toHaveCount(2);
  const firstTab = page.getByRole("tab", { name: /Demo 1/u });
  const secondTab = page.getByRole("tab", { name: /Demo 2/u });

  const first = await selectedMediaState(page);
  assert.equal(first.iframeCount, 1);
  assert.equal(first.fallbackVideoId, first.videoId);
  setStage("media_demo_one");
  await startSelectedVideo(page, (part) => {
    setStage(part === "control" ? "media_demo_one_control" : "media_demo_one_playing");
  });

  setStage("media_demo_two");
  await firstTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(secondTab).toHaveAttribute("aria-selected", "true");
  const second = await selectedMediaState(page);
  assert.equal(second.iframeCount, 1);
  assert.notEqual(second.videoId, first.videoId);
  assert.equal(second.fallbackVideoId, second.videoId);
  await startSelectedVideo(page, (part) => {
    setStage(part === "control" ? "media_demo_two_control" : "media_demo_two_playing");
  });

  assert.equal(mediaEvidenceIsComplete({
    activeIframeCount: second.iframeCount,
    directFallbackVideoIds: [first.fallbackVideoId, second.fallbackVideoId],
    playingVideoIds: [first.videoId, second.videoId],
    selectedVideoId: second.videoId,
    videos: [
      { displayOrder: 1, videoId: first.videoId },
      { displayOrder: 2, videoId: second.videoId },
    ],
  }), true);
  return { firstVideoId: first.videoId, playingVideoIds: [first.videoId, second.videoId] };
}

async function assertFirstEmbedFallback(
  page: Page,
  origin: string,
  runnerPath: string,
  firstVideoId: string,
): Promise<void> {
  let blocked = 0;
  await page.route(`https://www.youtube-nocookie.com/embed/${firstVideoId}**`, async (route) => {
    blocked += 1;
    await route.abort("failed");
  });
  try {
    await page.goto(`${origin}${runnerPath}`);
    await expect(page.getByRole("heading", { name: "Technique demonstrations" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save set", exact: true })).toBeEnabled();
    const secondTab = page.getByRole("tab", { name: /Demo 2/u });
    await secondTab.focus();
    await page.keyboard.press("Enter");
    await expect(secondTab).toHaveAttribute("aria-selected", "true");
    const second = await selectedMediaState(page);
    assert.notEqual(second.videoId, firstVideoId);
    assert.equal(second.fallbackVideoId, second.videoId);
    await startSelectedVideo(page, () => undefined);
    assert.ok(blocked >= 1);
  } finally {
    await page.unroute(`https://www.youtube-nocookie.com/embed/${firstVideoId}**`);
  }
}

async function assertOneAxis(page: Page, path: string, heading: RegExp): Promise<void> {
  await page.goto(path);
  await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
  const geometry = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    outliers: [...document.querySelectorAll<HTMLElement>("body *")]
      .flatMap((element) => {
        const rect = element.getBoundingClientRect();
        if (
          rect.width <= 0 ||
          (rect.left >= -1 && rect.right <= document.documentElement.clientWidth + 1)
        ) return [];
        const classes = [...element.classList]
          .filter((value) => /^[A-Za-z0-9_-]+$/u.test(value))
          .slice(0, 3)
          .join(".");
        return [`${element.tagName.toLowerCase()}${classes ? `.${classes}` : ""}`];
      })
      .slice(0, 12),
    scrollWidth: document.documentElement.scrollWidth,
  }));
  assert.ok(geometry.clientWidth > 0);
  if (geometry.scrollWidth > geometry.clientWidth + 1) {
    throw new HostedAuthenticatedMediaQaSafeAssertionError(
      `viewport-${geometry.clientWidth}-scroll-${geometry.scrollWidth}-outliers-${geometry.outliers.join(",") || "none"}`,
    );
  }
  await expect(page.locator("main")).toBeVisible();
}

async function verifyActualZoom(
  page: Page,
  origin: string,
  runnerPath: string,
  setStage: (stage: HostedAuthenticatedMediaQaStage) => void,
  requestNativeZoom: (
    action: HostedAuthenticatedMediaNativeZoomAction,
  ) => Promise<void>,
): Promise<true> {
  setStage("zoom_state");
  await page.goto(`${origin}/app`);
  const devicePixelRatioBefore = await page.evaluate(() => devicePixelRatio);
  await requestNativeZoom("set_200_percent");
  await page.waitForTimeout(400);
  const devicePixelRatioAfter = await page.evaluate(() => devicePixelRatio);
  const reportedPercent = Math.round(
    devicePixelRatioAfter / devicePixelRatioBefore * 100,
  );
  let reflowAssertionsPassed = false;

  try {
    assert.equal(reportedPercent, 200);
    assert.ok(Math.abs(devicePixelRatioAfter / devicePixelRatioBefore - 2) < 0.01);
    setStage("zoom_app");
    await assertOneAxis(page, `${origin}/app`, /Five-day starter route/u);
    setStage("zoom_collection");
    await assertOneAxis(page, `${origin}/app/programs`, /^Your routes$/u);
    setStage("zoom_editor");
    await assertOneAxis(page, `${origin}/app/program/edit`, /^Edit your route$/u);
    await assertAccessible(page);
    setStage("zoom_settings");
    await assertOneAxis(page, `${origin}/app/settings`, /^Settings$/u);
    setStage("zoom_runner_geometry");
    await assertOneAxis(page, `${origin}${runnerPath}`, /^Push$/u);
    setStage("zoom_runner_accessibility");
    await assertAccessible(page);
    reflowAssertionsPassed = true;
  } finally {
    if (reflowAssertionsPassed) setStage("zoom_restore");
    await requestNativeZoom("restore_100_percent");
    await page.waitForTimeout(400);
  }
  const restored = await page.evaluate(() => devicePixelRatio);
  const restoredPercent = Math.round(restored / devicePixelRatioBefore * 100);
  assert.equal(browserZoomEvidenceIsExact({
    devicePixelRatioAfter,
    devicePixelRatioBefore,
    emulationUsed: false,
    reportedPercent,
    restoredPercent,
  }), true);
  return true;
}

export async function executeHostedAuthenticatedMediaQa(
  config: HostedAuthQaConfig,
  requestNativeZoom: (
    action: HostedAuthenticatedMediaNativeZoomAction,
  ) => Promise<void>,
): Promise<Readonly<{
  blockedFirstEmbedVerified: true;
  cleanupConfirmed: true;
  engine: "chrome";
  exactZoomVerified: true;
  firebaseUserCountAfter: number;
  firebaseUserCountBefore: number;
  firstPartyMutationCount: 3;
  globalStateVerified: true;
  origin: string;
  status: "passed";
  videosPlayed: 2;
}>> {
  const auth = getFirebaseAdminAuth();
  const database = createDatabase();
  const identity = createHostedAuthQaIdentity();
  let stage: HostedAuthenticatedMediaQaStage = "firebase_baseline";
  const firebaseCountBefore = await firebaseUserCount(auth);
  stage = "database_baseline";
  const globalDigestBefore = await globalPersistenceDigest(database);
  let createdUid: string | undefined;
  let cleanupConfirmed = false;
  let failureStage: HostedAuthenticatedMediaQaStage = stage;
  let runPassed = false;
  let exactZoomVerified = false;
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  let context: BrowserContext | undefined;
  let firstPartyMutationCount = 0;
  let safeFailureDetail: string | undefined;

  try {
    stage = "identity_creation";
    const created = await auth.createUser({
      email: identity.email,
      emailVerified: true,
      password: identity.password,
    });
    createdUid = created.uid;
    assert.equal(await firebaseUserCount(auth), firebaseCountBefore + 1);

    stage = "browser_launch";
    browser = await chromium.launch({ channel: "chrome", headless: false });
    context = await browser.newContext({ viewport: { height: 1_000, width: 1_440 } });
    const page = await context.newPage();
    const collectors = attachFirstPartyCollectors(page, config.origin);

    stage = "session";
    await signIn(page, context, config, identity);
    stage = "onboarding";
    const program = await onboard(page, config.origin);
    stage = "workout_start";
    const sessionId = await startWorkout(page, program);
    const runnerPath = `/workout/${sessionId}`;
    stage = "runner_load";
    await page.goto(`${config.origin}${runnerPath}`);
    await expect(page.getByRole("heading", { name: "Push", exact: true })).toBeVisible();

    stage = "media_pair";
    const media = await inspectMedia(page, (nextStage) => {
      stage = nextStage;
    });
    assert.equal(media.playingVideoIds.length, 2);
    stage = "embed_fallback";
    await assertFirstEmbedFallback(
      page,
      config.origin,
      runnerPath,
      media.firstVideoId,
    );

    stage = "zoom";
    exactZoomVerified = await verifyActualZoom(
      page,
      config.origin,
      runnerPath,
      (nextStage) => {
        stage = nextStage;
      },
      requestNativeZoom,
    );
    stage = "accessibility";
    await assertAccessible(page);
    stage = "assertions";
    collectors.assertClean();
    assert.deepEqual(collectors.mutations, [
      "POST /api/auth/session",
      "POST /api/app/profile-program/onboard",
      "POST /api/app/workouts",
    ]);
    firstPartyMutationCount = collectors.mutations.length;
    runPassed = true;
  } catch (error) {
    failureStage = stage;
    if (error instanceof HostedAuthenticatedMediaQaSafeAssertionError) {
      safeFailureDetail = error.safeDetail;
    }
  } finally {
    await context?.close().catch(() => undefined);
    await browser?.close().catch(() => undefined);
    stage = "cleanup";
    createdUid = await exactIdentityCleanup(auth, database, identity, createdUid);
    try {
      cleanupConfirmed = cleanupPostconditionIsConfirmed({
        firebaseCountAfter: await firebaseUserCount(auth),
        firebaseCountBefore,
        globalDigestAfter: await globalPersistenceDigest(database),
        globalDigestBefore,
        identityAbsent: createdUid
          ? await identityIsAbsent(auth, createdUid)
          : true,
        ownerRowCount: createdUid
          ? await ownerRowCount(database, createdUid)
          : 0,
        terminalDeletionJob: createdUid
          ? await deletionJobIsTerminalOrAbsent(database, createdUid)
          : true,
      });
    } catch {
      cleanupConfirmed = false;
    }
  }

  if (!runPassed || !cleanupConfirmed || !exactZoomVerified) {
    if (!cleanupConfirmed) failureStage = "cleanup";
    throw new HostedAuthenticatedMediaQaExecutionError(
      cleanupConfirmed,
      failureStage,
      safeFailureDetail,
    );
  }
  assert.equal(firstPartyMutationCount, 3);
  return {
    blockedFirstEmbedVerified: true,
    cleanupConfirmed: true,
    engine: "chrome",
    exactZoomVerified: true,
    firebaseUserCountAfter: firebaseCountBefore,
    firebaseUserCountBefore: firebaseCountBefore,
    firstPartyMutationCount: 3,
    globalStateVerified: true,
    origin: config.origin,
    status: "passed",
    videosPlayed: 2,
  };
}
