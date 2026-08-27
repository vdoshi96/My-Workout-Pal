import AxeBuilder from "@axe-core/playwright";
import { expect, chromium, type BrowserContext, type Page, type Request } from "@playwright/test";
import type { Auth } from "firebase-admin/auth";
import { mkdir, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout as wait } from "node:timers/promises";
import assert from "node:assert/strict";

import {
  createHostedAuthQaIdentity,
  type HostedAuthQaConfig,
} from "../../src/domain/hosted-auth-qa";
import { getFirebaseAdminAuth } from "../../src/server/firebase/admin";

const sessionCookieName = "__Host-mwp_session";
const genericRecoveryMessage =
  "If this email has an account, Firebase will send recovery instructions.";
const evidenceDirectory = resolve(process.cwd(), "docs/qa/latest");
const evidencePaths = {
  unverified: resolve(evidenceDirectory, "hosted-auth-unverified-desktop.png"),
  verified: resolve(evidenceDirectory, "hosted-auth-verified-desktop.png"),
} as const;

export type HostedAuthQaStage =
  | "assertions"
  | "browser_launch"
  | "cleanup"
  | "duplicate_registration"
  | "firebase_inventory_after"
  | "firebase_inventory_before"
  | "invalid_credentials"
  | "recovery_known"
  | "recovery_unknown"
  | "registration"
  | "revocation"
  | "sign_out"
  | "unverified_sign_in"
  | "unverified_session"
  | "verification"
  | "verified_sign_in_navigation"
  | "verified_navigation_missing_cookie"
  | "verified_navigation_app_variant"
  | "verified_navigation_public_root"
  | "verified_navigation_returned_sign_in"
  | "verified_navigation_unexpected_path"
  | "verified_sign_in_submit"
  | "verified_session_create"
  | "verified_session_create_rejected"
  | "verified_session_accessibility"
  | "verified_session_cookie"
  | "verified_session_ui";

export class HostedAuthQaExecutionError extends Error {
  readonly cleanupConfirmed: boolean;
  readonly stage: HostedAuthQaStage;

  constructor(cleanupConfirmed: boolean, stage: HostedAuthQaStage) {
    super("Hosted authentication QA failed.");
    this.name = "HostedAuthQaExecutionError";
    this.cleanupConfirmed = cleanupConfirmed;
    this.stage = stage;
  }
}

function providerCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

function isUserNotFound(error: unknown): boolean {
  return providerCode(error) === "auth/user-not-found";
}

async function firebaseUserCount(auth: Auth): Promise<number> {
  let count = 0;
  let pageToken: string | undefined;
  let pageCount = 0;
  do {
    const page = await auth.listUsers(1_000, pageToken);
    count += page.users.length;
    pageToken = page.pageToken;
    pageCount += 1;
    if (pageCount > 100) throw new Error("Hosted authentication user count exceeded its bound.");
  } while (pageToken);
  return count;
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
  return (
    request.method() === "GET" &&
    url.searchParams.has("_rsc") &&
    request.headers()["rsc"] === "1" &&
    ["net::ERR_ABORTED", "cancelled"].includes(request.failure()?.errorText ?? "")
  );
}

function attachFailureCollectors(page: Page, origin: string) {
  const consoleFailures: string[] = [];
  const responseFailures: string[] = [];
  const requestFailures: string[] = [];
  const firstPartyMutations: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      consoleFailures.push(message.type());
    }
  });
  page.on("pageerror", () => consoleFailures.push("pageerror"));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      url.origin === origin &&
      request.method() !== "GET" &&
      request.method() !== "HEAD"
    ) {
      firstPartyMutations.push(`${request.method()} ${url.pathname}`);
    }
  });
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.origin === origin && response.status() >= 400) {
      responseFailures.push(`${response.request().method()} ${url.pathname} ${response.status()}`);
    }
  });
  page.on("requestfailed", (request) => {
    const url = new URL(request.url());
    if (url.origin === origin && !isSupersededNextFlightRequest(request)) {
      requestFailures.push(`${request.method()} ${url.pathname}`);
    }
  });

  return {
    assertClean: () => {
      assert.deepEqual(consoleFailures, []);
      assert.deepEqual(responseFailures, []);
      assert.deepEqual(requestFailures, []);
    },
    firstPartyMutations,
  };
}

async function assertSecureSessionCookie(
  context: BrowserContext,
  origin: string,
): Promise<void> {
  const cookies = await context.cookies(origin);
  const sessionCookie = cookies.find((cookie) => cookie.name === sessionCookieName);
  assert.ok(sessionCookie);
  assert.equal(sessionCookie.httpOnly, true);
  assert.equal(sessionCookie.secure, true);
  assert.equal(sessionCookie.sameSite, "Strict");
  assert.equal(sessionCookie.path, "/");
  assert.ok(sessionCookie.value.length > 100);
}

async function submitEmailForm(
  page: Page,
  input: Readonly<{ email: string; password?: string; submitName: string }>,
): Promise<void> {
  await page.getByLabel("Email").fill(input.email);
  if (input.password !== undefined) {
    await page.getByLabel("Password").fill(input.password);
  }
  const submit = page.getByRole("button", { name: input.submitName, exact: true });
  await submit.focus();
  await page.keyboard.press("Enter");
}

async function chooseAuthTask(page: Page, name: "Recovery" | "Register" | "Sign in") {
  const task = page.getByRole("button", { name, exact: true });
  await task.focus();
  await page.keyboard.press("Enter");
}

async function captureEvidence(page: Page, path: string): Promise<void> {
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ fullPage: false, path });
}

async function runBrowserLifecycle(
  auth: Auth,
  config: HostedAuthQaConfig,
  identity: ReturnType<typeof createHostedAuthQaIdentity>,
  setCreatedUid: (uid: string) => void,
  setStage: (stage: HostedAuthQaStage) => void,
): Promise<Readonly<{
  firstPartyMutationCount: number;
  secureCookieVerified: true;
}>> {
  setStage("browser_launch");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { height: 1_000, width: 1_440 } });
  const page = await context.newPage();
  const failures = attachFailureCollectors(page, config.origin);

  try {
    await page.goto(`${config.origin}/sign-in?returnTo=%2Fapp`);
    await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
    await assertAccessible(page);

    setStage("invalid_credentials");
    await submitEmailForm(page, {
      email: identity.email,
      password: "Wrong-password-1!",
      submitName: "Sign in with email",
    });
    await expect(page.locator(".auth-message")).toHaveText(
      "The email or password is not valid.",
    );

    setStage("registration");
    await chooseAuthTask(page, "Register");
    await submitEmailForm(page, {
      email: identity.email,
      password: identity.password,
      submitName: "Create account",
    });
    await expect(page.locator(".auth-message")).toHaveText(
      "Account created. Verify the email before signing in to save permanent changes.",
    );
    const created = await auth.getUserByEmail(identity.email);
    setCreatedUid(created.uid);

    setStage("duplicate_registration");
    await chooseAuthTask(page, "Register");
    await submitEmailForm(page, {
      email: identity.email,
      password: identity.password,
      submitName: "Create account",
    });
    await expect(page.locator(".auth-message")).toHaveText(
      "An account already uses this email. Sign in or reset the password.",
    );

    setStage("recovery_unknown");
    await chooseAuthTask(page, "Recovery");
    const unknownRecovery = page.waitForResponse((response) =>
      response.url().includes("accounts:sendOobCode") && response.request().method() === "POST",
    );
    await submitEmailForm(page, {
      email: `unknown-${identity.email}`,
      submitName: "Send recovery",
    });
    await unknownRecovery;
    await expect(page.locator(".auth-message")).toHaveText(genericRecoveryMessage);

    setStage("recovery_known");
    const knownRecovery = page.waitForResponse((response) =>
      response.url().includes("accounts:sendOobCode") && response.request().method() === "POST",
    );
    await submitEmailForm(page, {
      email: identity.email,
      submitName: "Send recovery",
    });
    await knownRecovery;
    await expect(page.locator(".auth-message")).toHaveText(genericRecoveryMessage);

    setStage("unverified_sign_in");
    await chooseAuthTask(page, "Sign in");
    await submitEmailForm(page, {
      email: identity.email,
      password: identity.password,
      submitName: "Sign in with email",
    });
    await page.waitForURL(`${config.origin}/app`);
    setStage("unverified_session");
    await expect(page.getByText("Email verification required", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Create my program" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Sign out", exact: true })).toBeVisible();
    await assertSecureSessionCookie(context, config.origin);
    await assertAccessible(page);
    await captureEvidence(page, evidencePaths.unverified);

    setStage("sign_out");
    const shellSignOut = page.getByRole("button", { name: "Sign out", exact: true });
    await shellSignOut.focus();
    await page.keyboard.press("Enter");
    await page.waitForURL(`${config.origin}/sign-in`);
    expect((await context.cookies(config.origin)).some(
      (cookie) => cookie.name === sessionCookieName,
    )).toBe(false);

    setStage("verification");
    await auth.updateUser(created.uid, { emailVerified: true });
    setStage("verified_sign_in_submit");
    const verifiedSessionResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.origin === config.origin &&
        url.pathname === "/api/auth/session" &&
        response.request().method() === "POST";
    });
    await submitEmailForm(page, {
      email: identity.email,
      password: identity.password,
      submitName: "Sign in with email",
    });
    setStage("verified_session_create");
    const sessionResponse = await verifiedSessionResponse;
    if (!sessionResponse.ok()) {
      setStage("verified_session_create_rejected");
      assert.ok(sessionResponse.ok());
    }
    setStage("verified_navigation_missing_cookie");
    await assertSecureSessionCookie(context, config.origin);
    setStage("verified_sign_in_navigation");
    try {
      await page.waitForURL(`${config.origin}/app`, { timeout: 10_000 });
    } catch (error) {
      const currentPath = new URL(page.url()).pathname;
      setStage(currentPath === "/app"
        ? "verified_navigation_app_variant"
        : currentPath === "/sign-in"
          ? "verified_navigation_returned_sign_in"
          : currentPath === "/"
            ? "verified_navigation_public_root"
            : "verified_navigation_unexpected_path");
      throw error;
    }
    setStage("verified_session_ui");
    await expect(page.getByText("Verified account", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Create my program" })).toBeEnabled();
    setStage("verified_session_cookie");
    await assertSecureSessionCookie(context, config.origin);
    setStage("verified_session_accessibility");
    await assertAccessible(page);
    await captureEvidence(page, evidencePaths.verified);

    setStage("revocation");
    await wait(1_100);
    await auth.revokeRefreshTokens(created.uid);
    await page.reload();
    await page.waitForURL(`${config.origin}/sign-in?returnTo=%2Fapp`);
    await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();

    setStage("assertions");
    failures.assertClean();
    assert.deepEqual(failures.firstPartyMutations, [
      "POST /api/auth/session",
      "DELETE /api/auth/session",
      "POST /api/auth/session",
    ]);
    return {
      firstPartyMutationCount: failures.firstPartyMutations.length,
      secureCookieVerified: true,
    };
  } finally {
    await context.close();
    await browser.close();
  }
}

export async function executeHostedAuthQa(
  config: HostedAuthQaConfig,
): Promise<Readonly<{
  cleanupConfirmed: true;
  engine: "chromium";
  firstPartyMutationCount: number;
  firebaseUserCountAfter: number;
  firebaseUserCountBefore: number;
  origin: string;
  secureCookieVerified: true;
  status: "passed";
  viewport: "1440x1000";
}>> {
  const auth = getFirebaseAdminAuth();
  const identity = createHostedAuthQaIdentity();
  let stage: HostedAuthQaStage = "firebase_inventory_before";
  const beforeCount = await firebaseUserCount(auth);
  let createdUid: string | undefined;
  let browserResult: Awaited<ReturnType<typeof runBrowserLifecycle>> | undefined;
  let runFailed = false;
  let cleanupConfirmed = false;
  let failureStage: HostedAuthQaStage = stage;

  await mkdir(evidenceDirectory, { recursive: true });
  try {
    browserResult = await runBrowserLifecycle(
      auth,
      config,
      identity,
      (uid) => {
        createdUid = uid;
      },
      (nextStage) => {
        stage = nextStage;
      },
    );
    stage = "firebase_inventory_after";
    assert.equal(await firebaseUserCount(auth), beforeCount + 1);
  } catch {
    runFailed = true;
    failureStage = stage;
  } finally {
    stage = "cleanup";
    if (!createdUid) {
      try {
        createdUid = (await auth.getUserByEmail(identity.email)).uid;
      } catch (error) {
        if (!isUserNotFound(error)) {
          runFailed = true;
          failureStage = "cleanup";
        }
      }
    }

    if (createdUid) {
      try {
        await auth.deleteUser(createdUid);
      } catch (error) {
        if (!isUserNotFound(error)) {
          runFailed = true;
          failureStage = "cleanup";
        }
      }
    }

    try {
      const identityAbsent = createdUid ? await identityIsAbsent(auth, createdUid) : true;
      cleanupConfirmed = identityAbsent && await firebaseUserCount(auth) === beforeCount;
    } catch {
      cleanupConfirmed = false;
      failureStage = "cleanup";
    }

    if (runFailed) {
      await Promise.all(Object.values(evidencePaths).map((path) =>
        unlink(path).catch(() => undefined),
      ));
    }
  }

  if (runFailed || !cleanupConfirmed || !browserResult) {
    if (!cleanupConfirmed) failureStage = "cleanup";
    throw new HostedAuthQaExecutionError(cleanupConfirmed, failureStage);
  }

  return {
    cleanupConfirmed: true,
    engine: "chromium",
    firstPartyMutationCount: browserResult.firstPartyMutationCount,
    firebaseUserCountAfter: beforeCount,
    firebaseUserCountBefore: beforeCount,
    origin: config.origin,
    secureCookieVerified: true,
    status: "passed",
    viewport: "1440x1000",
  };
}
