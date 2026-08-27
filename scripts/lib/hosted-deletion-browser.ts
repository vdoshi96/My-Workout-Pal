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
import { mkdir, unlink } from "node:fs/promises";
import { resolve } from "node:path";

import { count, eq } from "drizzle-orm";
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
  createHostedDeletionQaIdentities,
} from "../../src/domain/hosted-deletion-qa";
import type {
  HostedAuthQaConfig,
  HostedAuthQaIdentity,
} from "../../src/domain/hosted-auth-qa";
import type { ViewerContext } from "../../src/server/auth/viewer";
import { getFirebaseAdminAuth } from "../../src/server/firebase/admin";
import { createAccountDeletionRepository } from "../../src/server/repositories/account-deletion";
import { executeAccountDeletion } from "../../src/server/services/account-deletion";

const sessionCookieName = "__Host-mwp_session";
const evidenceDirectory = resolve(process.cwd(), "docs/qa/latest");
const evidencePaths = {
  deletionReview: resolve(evidenceDirectory, "hosted-deletion-review-desktop.png"),
  publicReturn: resolve(evidenceDirectory, "hosted-deletion-public-return-desktop.png"),
} as const;

export type HostedDeletionQaStage =
  | "accessibility"
  | "alice_data_setup"
  | "alice_deletion"
  | "alice_intact_after_bob"
  | "alice_session"
  | "assertions"
  | "bob_deletion"
  | "bob_session"
  | "browser_launch"
  | "cleanup"
  | "database_baseline"
  | "firebase_baseline"
  | "foreign_missing_api"
  | "foreign_missing_rendered"
  | "global_postcondition"
  | "identity_creation";

export class HostedDeletionQaExecutionError extends Error {
  readonly cleanupConfirmed: boolean;
  readonly stage: HostedDeletionQaStage;

  constructor(cleanupConfirmed: boolean, stage: HostedDeletionQaStage) {
    super("Hosted deletion and ownership QA failed.");
    this.name = "HostedDeletionQaExecutionError";
    this.cleanupConfirmed = cleanupConfirmed;
    this.stage = stage;
  }
}

export type SafePrivateResourceResponse = Readonly<{
  body: string;
  cacheControl: string;
  status: number;
}>;

function normalizedOpaqueBody(body: string, opaqueIds: readonly string[]): string {
  return opaqueIds.reduce(
    (value, opaqueId) => value.replaceAll(opaqueId, "<opaque-resource>"),
    body,
  );
}

export function privateResourceResponsesAreEquivalent(
  foreign: SafePrivateResourceResponse,
  missing: SafePrivateResourceResponse,
  opaqueIds: readonly string[],
): boolean {
  return foreign.status === missing.status &&
    foreign.cacheControl === missing.cacheControl &&
    foreign.cacheControl.toLowerCase().includes("no-store") &&
    normalizedOpaqueBody(foreign.body, opaqueIds) ===
      normalizedOpaqueBody(missing.body, opaqueIds);
}

export function cleanupPostconditionIsConfirmed(input: Readonly<{
  firebaseCountAfter: number;
  firebaseCountBefore: number;
  identitiesAbsent: readonly boolean[];
  ownerRowCounts: readonly number[];
  terminalDeletionJobs: readonly boolean[];
}>): boolean {
  return input.firebaseCountAfter === input.firebaseCountBefore &&
    input.identitiesAbsent.length === 2 &&
    input.identitiesAbsent.every(Boolean) &&
    input.ownerRowCounts.length === 2 &&
    input.ownerRowCounts.every((value) => value === 0) &&
    input.terminalDeletionJobs.length === 2 &&
    input.terminalDeletionJobs.every(Boolean);
}

function providerCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }
  return typeof error.code === "string" ? error.code : undefined;
}

function isUserNotFound(error: unknown): boolean {
  return providerCode(error) === "auth/user-not-found";
}

async function firebaseUserCount(auth: Auth): Promise<number> {
  let result = 0;
  let pageToken: string | undefined;
  let pages = 0;
  do {
    const page = await auth.listUsers(1_000, pageToken);
    result += page.users.length;
    pageToken = page.pageToken;
    pages += 1;
    if (pages > 100) throw new Error("Firebase inventory exceeded its QA bound.");
  } while (pageToken);
  return result;
}

async function identityIsAbsent(auth: Auth, uid: string): Promise<boolean> {
  try {
    await auth.getUser(uid);
    return false;
  } catch (error) {
    if (isUserNotFound(error)) return true;
    throw error;
  }
}

function rowsDigest(groups: readonly (readonly unknown[])[]): string {
  const stableGroups = groups.map((rows) =>
    rows.map((row) => JSON.stringify(row)).sort(),
  );
  return createHash("sha256").update(JSON.stringify(stableGroups)).digest("hex");
}

async function ownerPersistenceSnapshot(
  database: Database,
  ownerUid: string,
): Promise<Readonly<{ digest: string; rowCount: number }>> {
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
  return {
    digest: rowsDigest(groups),
    rowCount: groups.reduce((total, rows) => total + rows.length, 0),
  };
}

async function deletionJobIsTerminalOrAbsent(
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

async function globalPersistenceCounts(database: Database) {
  const [equipment, exercises, videos, templates, revisions] = await Promise.all([
    database.select({ value: count() }).from(catalogEquipment),
    database.select({ value: count() }).from(catalogExercises),
    database.select({ value: count() }).from(curatedVideos),
    database.select({ value: count() }).from(programTemplates),
    database.select({ value: count() }).from(programTemplateRevisions),
  ]);
  return {
    equipment: equipment[0]?.value ?? 0,
    exercises: exercises[0]?.value ?? 0,
    revisions: revisions[0]?.value ?? 0,
    templates: templates[0]?.value ?? 0,
    videos: videos[0]?.value ?? 0,
  };
}

async function assertAccessible(page: Page): Promise<void> {
  const result = await new AxeBuilder({ page }).analyze();
  assert.deepEqual(
    result.violations.filter((violation) =>
      violation.impact === "critical" || violation.impact === "serious",
    ),
    [],
  );
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

function attachFailureCollectors(page: Page, origin: string) {
  const consoleErrors: string[] = [];
  const consoleWarnings: string[] = [];
  const pageErrors: string[] = [];
  const responseFailures: string[] = [];
  const requestFailures: string[] = [];
  const firstPartyMutations: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
    if (message.type() === "warning") consoleWarnings.push("warning");
  });
  page.on("pageerror", () => pageErrors.push("pageerror"));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin === origin && !["GET", "HEAD"].includes(request.method())) {
      firstPartyMutations.push(`${request.method()} ${url.pathname}`);
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
    assertClean(input: Readonly<{
      consoleHttpStatuses: readonly number[];
      responseFailures: readonly string[];
    }>) {
      const genericStatuses = consoleErrors.map((message) => {
        const match = message.match(
          /^Failed to load resource: the server responded with a status of (\d{3})/u,
        );
        return match?.[1] ? Number(match[1]) : undefined;
      });
      assert.equal(genericStatuses.includes(undefined), false);
      assert.deepEqual(
        genericStatuses.toSorted((left, right) => (left ?? 0) - (right ?? 0)),
        input.consoleHttpStatuses.toSorted((left, right) => left - right),
      );
      assert.deepEqual(consoleWarnings, []);
      assert.deepEqual(pageErrors, []);
      assert.deepEqual(requestFailures, []);
      assert.deepEqual(responseFailures.toSorted(), input.responseFailures.toSorted());
    },
    firstPartyMutations,
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
  const sessionResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.origin === config.origin &&
      url.pathname === "/api/auth/session" &&
      response.request().method() === "POST";
  });
  const submit = page.getByRole("button", { name: "Sign in with email", exact: true });
  await submit.focus();
  await page.keyboard.press("Enter");
  assert.equal((await sessionResponse).status(), 200);
  await page.waitForURL(`${config.origin}/app`);
  await expect(page.getByText("Verified account", { exact: true })).toBeVisible();
  await assertSecureSessionCookie(context, config.origin);
}

type ActiveProgramIdentity = Readonly<{
  dayId: string;
  programId: string;
  revisionId: string;
}>;

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function uuid(value: unknown): string {
  if (typeof value !== "string") assert.fail("Expected a UUID string.");
  assert.match(value, /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu);
  return value;
}

function activeProgramIdentity(value: unknown): ActiveProgramIdentity {
  const root = record(value);
  const profileProgram = record(root?.["profileProgram"]);
  const activeProgram = record(profileProgram?.["activeProgram"]);
  const days = activeProgram?.["days"];
  assert.ok(Array.isArray(days));
  const day = record(days[0]);
  return {
    dayId: uuid(day?.["id"]),
    programId: uuid(activeProgram?.["id"]),
    revisionId: uuid(activeProgram?.["revisionId"]),
  };
}

async function onboard(
  page: Page,
  config: HostedAuthQaConfig,
  profile: "dumbbells" | "barbell",
): Promise<ActiveProgramIdentity> {
  await expect(page.getByRole("heading", { name: "Build your starter route" })).toBeVisible();
  if (profile === "barbell") {
    await page.getByRole("radio", { name: /Barbell \+ rack/u }).check();
  } else {
    await expect(page.getByRole("radio", { name: /^Dumbbells/u })).toBeChecked();
  }
  const responsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.origin === config.origin &&
      url.pathname === "/api/app/profile-program/onboard" &&
      response.request().method() === "POST";
  });
  const create = page.getByRole("button", { name: "Create my program" });
  await create.focus();
  await page.keyboard.press("Enter");
  const response = await responsePromise;
  assert.equal(response.status(), 201);
  const identity = activeProgramIdentity(await response.json());
  await expect(page.getByRole("heading", { name: "Five-day starter route" })).toBeVisible();
  await expect(page.getByText(
    profile === "barbell" ? /Barbell \+ rack · five days/u : /Dumbbells · five days/u,
  )).toBeVisible();
  return identity;
}

async function privateRequest(
  page: Page,
  input: Readonly<{
    body?: unknown;
    method: "DELETE" | "GET" | "POST";
    path: string;
  }>,
): Promise<SafePrivateResourceResponse> {
  return page.evaluate(async ({ body, method, path }) => {
    let token: string | undefined;
    if (method !== "GET") {
      const csrf = await fetch("/api/auth/csrf", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const csrfBody = await csrf.json() as { token?: unknown };
      if (!csrf.ok || typeof csrfBody.token !== "string") {
        throw new Error("The private QA request could not obtain CSRF protection.");
      }
      token = csrfBody.token;
    }
    const response = await fetch(path, {
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(token === undefined ? {} : { "X-CSRF-Token": token }),
      },
      method,
    });
    return {
      body: await response.text(),
      cacheControl: response.headers.get("cache-control") ?? "",
      status: response.status,
    };
  }, input);
}

function jsonBody(response: SafePrivateResourceResponse): Record<string, unknown> {
  return record(JSON.parse(response.body)) ?? assert.fail("Expected a JSON response.");
}

async function createAliceResources(
  page: Page,
  program: ActiveProgramIdentity,
): Promise<Readonly<{ customExerciseId: string; sessionId: string }>> {
  const custom = await privateRequest(page, {
    body: {
      draft: {
        aliases: ["hosted ownership check"],
        equipmentIds: ["dumbbells"],
        instructions: "A private movement used only for bounded ownership verification.",
        loggingKind: "weight_reps",
        name: "Private QA movement",
        videoUrls: [],
      },
      idempotencyKey: randomUUID(),
    },
    method: "POST",
    path: "/api/app/custom-exercises",
  });
  assert.equal(custom.status, 201);
  const customExerciseId = uuid(record(jsonBody(custom)["exercise"])?.["id"]);

  const workout = await privateRequest(page, {
    body: {
      dayId: program.dayId,
      idempotencyKey: randomUUID(),
      programId: program.programId,
    },
    method: "POST",
    path: "/api/app/workouts",
  });
  assert.equal(workout.status, 201);
  const sessionId = uuid(record(record(jsonBody(workout)["model"])?.["session"])?.["id"]);
  return { customExerciseId, sessionId };
}

function missingUuid(): string {
  return randomUUID();
}

async function assertForeignAndMissingApi(
  page: Page,
  input: Readonly<{
    alice: Readonly<{
      customExerciseId: string;
      program: ActiveProgramIdentity;
      sessionId: string;
    }>;
    bob: ActiveProgramIdentity;
  }>,
): Promise<readonly string[]> {
  const missing = {
    customExerciseId: missingUuid(),
    programId: missingUuid(),
    revisionId: missingUuid(),
    sessionId: missingUuid(),
  };
  const expectedFailures: string[] = [];

  const compare = async (
    foreignRequest: Parameters<typeof privateRequest>[1],
    missingRequest: Parameters<typeof privateRequest>[1],
    ids: readonly string[],
  ) => {
    const foreign = await privateRequest(page, foreignRequest);
    const absent = await privateRequest(page, missingRequest);
    assert.equal(privateResourceResponsesAreEquivalent(foreign, absent, ids), true);
    assert.equal(foreign.status, 404);
    expectedFailures.push(
      `${foreignRequest.method} ${new URL(foreignRequest.path, "https://qa.invalid").pathname} 404`,
      `${missingRequest.method} ${new URL(missingRequest.path, "https://qa.invalid").pathname} 404`,
    );
  };

  await compare(
    { method: "GET", path: `/api/app/custom-exercises/${input.alice.customExerciseId}` },
    { method: "GET", path: `/api/app/custom-exercises/${missing.customExerciseId}` },
    [input.alice.customExerciseId, missing.customExerciseId],
  );
  await compare(
    { method: "GET", path: `/api/app/workouts/${input.alice.sessionId}` },
    { method: "GET", path: `/api/app/workouts/${missing.sessionId}` },
    [input.alice.sessionId, missing.sessionId],
  );
  await compare(
    {
      body: {
        expectedActiveProgramId: input.bob.programId,
        idempotencyKey: randomUUID(),
        programId: input.alice.program.programId,
        revisionId: input.alice.program.revisionId,
      },
      method: "POST",
      path: "/api/app/programs/activate",
    },
    {
      body: {
        expectedActiveProgramId: input.bob.programId,
        idempotencyKey: randomUUID(),
        programId: missing.programId,
        revisionId: missing.revisionId,
      },
      method: "POST",
      path: "/api/app/programs/activate",
    },
    [input.alice.program.programId, input.alice.program.revisionId, missing.programId, missing.revisionId],
  );
  return expectedFailures;
}

async function renderedNotFound(
  page: Page,
  origin: string,
  sessionId: string,
): Promise<SafePrivateResourceResponse> {
  const response = await page.goto(`${origin}/workout/${sessionId}`);
  assert.ok(response);
  await expect(page.getByRole("heading", { name: "This route is not on the map." })).toBeVisible();
  await assertAccessible(page);
  return {
    body: (await page.locator("body").innerText()).replaceAll(/\s+/gu, " ").trim(),
    cacheControl: response.headers()["cache-control"] ?? "",
    status: response.status(),
  };
}

async function assertForeignAndMissingRendered(
  page: Page,
  origin: string,
  foreignSessionId: string,
): Promise<readonly string[]> {
  const missingSessionId = missingUuid();
  const foreign = await renderedNotFound(page, origin, foreignSessionId);
  const absent = await renderedNotFound(page, origin, missingSessionId);
  assert.equal(
    privateResourceResponsesAreEquivalent(
      foreign,
      absent,
      [foreignSessionId, missingSessionId],
    ),
    true,
  );
  assert.equal(foreign.status, 404);
  return [
    `GET /workout/${foreignSessionId} 404`,
    `GET /workout/${missingSessionId} 404`,
  ];
}

async function waitForDeletionReady(page: Page, origin: string): Promise<void> {
  await page.goto(`${origin}/app/settings`);
  await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Review permanent deletion" })).toBeEnabled({
    timeout: 15_000,
  });
}

async function openDeletionReview(page: Page): Promise<void> {
  const review = page.getByRole("button", { name: "Review permanent deletion" });
  await review.focus();
  await page.keyboard.press("Enter");
  const heading = page.getByRole("heading", {
    name: "Delete everything owned by this account?",
  });
  await expect(heading).toBeVisible();
  await expect(heading).toBeFocused();
}

async function cancelDeletion(page: Page): Promise<void> {
  const review = page.getByRole("button", { name: "Review permanent deletion" });
  const cancel = page.getByRole("button", { name: "Cancel", exact: true });
  await cancel.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(review).toBeFocused();
}

async function deleteVisibleAccount(
  page: Page,
  context: BrowserContext,
  input: Readonly<{
    assertWrongPassword: boolean;
    captureReview: boolean;
    config: HostedAuthQaConfig;
    identity: HostedAuthQaIdentity;
  }>,
): Promise<void> {
  await waitForDeletionReady(page, input.config.origin);
  await openDeletionReview(page);
  await assertAccessible(page);
  if (input.captureReview) {
    await page.screenshot({ fullPage: false, path: evidencePaths.deletionReview });
  }
  await cancelDeletion(page);
  await openDeletionReview(page);

  if (input.assertWrongPassword) {
    await page.getByLabel("Current password").fill("Wrong-password-1!");
    await page.getByLabel("Type DELETE to confirm").fill("DELETE");
    const wrongPasswordResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.hostname === "identitytoolkit.googleapis.com" &&
        url.pathname.endsWith("/accounts:signInWithPassword") &&
        response.request().method() === "POST";
    });
    const finalAction = page.getByRole("button", {
      name: "Reauthenticate and permanently delete",
    });
    await finalAction.focus();
    await page.keyboard.press("Enter");
    assert.equal((await wrongPasswordResponse).status(), 400);
    await expect(page.locator(".account-delete-status")).toHaveText(
      "The email or password is not valid.",
    );
    await assertAccessible(page);
  }

  await page.getByLabel("Current password").fill(input.identity.password);
  await page.getByLabel("Type DELETE to confirm").fill("DELETE");
  const deletionResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.origin === input.config.origin &&
      url.pathname === "/api/app/account" &&
      response.request().method() === "DELETE";
  });
  const finalAction = page.getByRole("button", {
    name: "Reauthenticate and permanently delete",
  });
  await finalAction.focus();
  await page.keyboard.press("Enter");
  assert.equal((await deletionResponse).status(), 200);
  await page.waitForURL(`${input.config.origin}/?account=deleted`);
  await expect(page.getByRole("heading", {
    name: "Your whole five-day plan. No account required.",
  })).toBeVisible();
  assert.equal(
    (await context.cookies(input.config.origin)).some(
      (cookie) => cookie.name === sessionCookieName,
    ),
    false,
  );
}

function cleanupViewer(uid: string, identity: HostedAuthQaIdentity): ViewerContext {
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

async function exactIdentityCleanup(
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
      const owned = await ownerPersistenceSnapshot(database, uid);
      const jobTerminal = await deletionJobIsTerminalOrAbsent(database, uid);
      if (owned.rowCount > 0 || !jobTerminal) {
        await executeAccountDeletion(
          {
            getFirebaseAuth: () => auth,
            getRepository: () => createAccountDeletionRepository(database),
          },
          cleanupViewer(uid, identity),
          { confirmation: "DELETE", idempotencyKey: `hosted-qa-cleanup-${uid}` },
        );
      } else if (!(await identityIsAbsent(auth, uid))) {
        await auth.deleteUser(uid);
      }
    } catch {
      // The bounded second pass handles provider/database partial completion.
    }
  }
  return uid;
}

export async function executeHostedDeletionQa(
  config: HostedAuthQaConfig,
): Promise<Readonly<{
  cleanupConfirmed: true;
  engine: "chromium";
  firebaseUserCountAfter: number;
  firebaseUserCountBefore: number;
  firstPartyMutationCount: number;
  foreignMissingProbeCount: 4;
  globalCountsVerified: true;
  origin: string;
  status: "passed";
  viewport: "1440x1000";
}>> {
  const auth = getFirebaseAdminAuth();
  const database = createDatabase();
  const [aliceIdentity, bobIdentity] = createHostedDeletionQaIdentities();
  let stage: HostedDeletionQaStage = "firebase_baseline";
  const firebaseCountBefore = await firebaseUserCount(auth);
  stage = "database_baseline";
  const globalBefore = await globalPersistenceCounts(database);
  let aliceUid: string | undefined;
  let bobUid: string | undefined;
  let runPassed = false;
  let cleanupConfirmed = false;
  let failureStage: HostedDeletionQaStage = stage;
  let firstPartyMutationCount = 0;
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  let aliceContext: BrowserContext | undefined;
  let bobContext: BrowserContext | undefined;

  await mkdir(evidenceDirectory, { recursive: true });
  try {
    stage = "identity_creation";
    const aliceUser = await auth.createUser({
      email: aliceIdentity.email,
      emailVerified: true,
      password: aliceIdentity.password,
    });
    aliceUid = aliceUser.uid;
    const bobUser = await auth.createUser({
      email: bobIdentity.email,
      emailVerified: true,
      password: bobIdentity.password,
    });
    bobUid = bobUser.uid;
    assert.equal(await firebaseUserCount(auth), firebaseCountBefore + 2);

    stage = "browser_launch";
    browser = await chromium.launch({ headless: true });
    aliceContext = await browser.newContext({ viewport: { height: 1_000, width: 1_440 } });
    bobContext = await browser.newContext({ viewport: { height: 1_000, width: 1_440 } });
    const alicePage = await aliceContext.newPage();
    const bobPage = await bobContext.newPage();
    const aliceFailures = attachFailureCollectors(alicePage, config.origin);
    const bobFailures = attachFailureCollectors(bobPage, config.origin);

    stage = "alice_session";
    await signIn(alicePage, aliceContext, config, aliceIdentity);
    const aliceProgram = await onboard(alicePage, config, "dumbbells");
    stage = "alice_data_setup";
    const aliceResources = await createAliceResources(alicePage, aliceProgram);

    stage = "bob_session";
    await signIn(bobPage, bobContext, config, bobIdentity);
    const bobProgram = await onboard(bobPage, config, "barbell");

    const aliceBeforeForeign = await ownerPersistenceSnapshot(database, aliceUid);
    const bobBeforeForeign = await ownerPersistenceSnapshot(database, bobUid);
    stage = "foreign_missing_api";
    const apiFailures = await assertForeignAndMissingApi(bobPage, {
      alice: { ...aliceResources, program: aliceProgram },
      bob: bobProgram,
    });
    stage = "foreign_missing_rendered";
    const renderedFailures = await assertForeignAndMissingRendered(
      bobPage,
      config.origin,
      aliceResources.sessionId,
    );
    assert.deepEqual(await ownerPersistenceSnapshot(database, aliceUid), aliceBeforeForeign);
    assert.deepEqual(await ownerPersistenceSnapshot(database, bobUid), bobBeforeForeign);

    stage = "bob_deletion";
    await waitForDeletionReady(bobPage, config.origin);
    const bobBeforeWrongPassword = await ownerPersistenceSnapshot(database, bobUid);
    await deleteVisibleAccount(bobPage, bobContext, {
      assertWrongPassword: true,
      captureReview: true,
      config,
      identity: bobIdentity,
    });
    assert.notDeepEqual(await ownerPersistenceSnapshot(database, bobUid), bobBeforeWrongPassword);
    assert.equal((await ownerPersistenceSnapshot(database, bobUid)).rowCount, 0);
    assert.equal(await identityIsAbsent(auth, bobUid), true);
    assert.equal(await deletionJobIsTerminalOrAbsent(database, bobUid), true);

    stage = "alice_intact_after_bob";
    assert.deepEqual(await ownerPersistenceSnapshot(database, aliceUid), aliceBeforeForeign);
    await alicePage.reload();
    await expect(alicePage.getByRole("heading", { name: "Five-day starter route" })).toBeVisible();
    await assertAccessible(alicePage);

    stage = "alice_deletion";
    await deleteVisibleAccount(alicePage, aliceContext, {
      assertWrongPassword: false,
      captureReview: false,
      config,
      identity: aliceIdentity,
    });
    await alicePage.screenshot({ fullPage: false, path: evidencePaths.publicReturn });
    assert.equal((await ownerPersistenceSnapshot(database, aliceUid)).rowCount, 0);
    assert.equal(await identityIsAbsent(auth, aliceUid), true);
    assert.equal(await deletionJobIsTerminalOrAbsent(database, aliceUid), true);

    stage = "assertions";
    aliceFailures.assertClean({ consoleHttpStatuses: [], responseFailures: [] });
    bobFailures.assertClean({
      consoleHttpStatuses: [400],
      responseFailures: [...apiFailures, ...renderedFailures],
    });
    assert.deepEqual(aliceFailures.firstPartyMutations, [
      "POST /api/auth/session",
      "POST /api/app/profile-program/onboard",
      "POST /api/app/custom-exercises",
      "POST /api/app/workouts",
      "POST /api/auth/session",
      "DELETE /api/app/account",
    ]);
    assert.deepEqual(bobFailures.firstPartyMutations, [
      "POST /api/auth/session",
      "POST /api/app/profile-program/onboard",
      "POST /api/app/programs/activate",
      "POST /api/app/programs/activate",
      "POST /api/auth/session",
      "DELETE /api/app/account",
    ]);
    firstPartyMutationCount =
      aliceFailures.firstPartyMutations.length + bobFailures.firstPartyMutations.length;
    stage = "global_postcondition";
    assert.deepEqual(await globalPersistenceCounts(database), globalBefore);
    assert.equal(await firebaseUserCount(auth), firebaseCountBefore);
    runPassed = true;
  } catch {
    failureStage = stage;
  } finally {
    await Promise.all([
      aliceContext?.close().catch(() => undefined),
      bobContext?.close().catch(() => undefined),
    ]);
    await browser?.close().catch(() => undefined);
    stage = "cleanup";
    aliceUid = await exactIdentityCleanup(auth, database, aliceIdentity, aliceUid);
    bobUid = await exactIdentityCleanup(auth, database, bobIdentity, bobUid);
    try {
      const identitiesAbsent = await Promise.all([
        aliceUid ? identityIsAbsent(auth, aliceUid) : Promise.resolve(true),
        bobUid ? identityIsAbsent(auth, bobUid) : Promise.resolve(true),
      ]);
      const ownerSnapshots = await Promise.all([
        aliceUid ? ownerPersistenceSnapshot(database, aliceUid) : Promise.resolve({ digest: "", rowCount: 0 }),
        bobUid ? ownerPersistenceSnapshot(database, bobUid) : Promise.resolve({ digest: "", rowCount: 0 }),
      ]);
      const terminalDeletionJobs = await Promise.all([
        aliceUid ? deletionJobIsTerminalOrAbsent(database, aliceUid) : Promise.resolve(true),
        bobUid ? deletionJobIsTerminalOrAbsent(database, bobUid) : Promise.resolve(true),
      ]);
      cleanupConfirmed = cleanupPostconditionIsConfirmed({
        firebaseCountAfter: await firebaseUserCount(auth),
        firebaseCountBefore,
        identitiesAbsent,
        ownerRowCounts: ownerSnapshots.map(({ rowCount }) => rowCount),
        terminalDeletionJobs,
      });
    } catch {
      cleanupConfirmed = false;
    }
    if (!runPassed) {
      await Promise.all(Object.values(evidencePaths).map((path) =>
        unlink(path).catch(() => undefined),
      ));
    }
  }

  if (!runPassed || !cleanupConfirmed) {
    if (!cleanupConfirmed) failureStage = "cleanup";
    throw new HostedDeletionQaExecutionError(cleanupConfirmed, failureStage);
  }
  return {
    cleanupConfirmed: true,
    engine: "chromium",
    firebaseUserCountAfter: firebaseCountBefore,
    firebaseUserCountBefore: firebaseCountBefore,
    firstPartyMutationCount,
    foreignMissingProbeCount: 4,
    globalCountsVerified: true,
    origin: config.origin,
    status: "passed",
    viewport: "1440x1000",
  };
}
