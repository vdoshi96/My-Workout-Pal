import AxeBuilder from "@axe-core/playwright";
import { expect, chromium, type BrowserContext, type Page, type Request } from "@playwright/test";
import type { Auth } from "firebase-admin/auth";
import { mkdir, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout as wait } from "node:timers/promises";
import assert from "node:assert/strict";

import {
  createHostedAuthQaIdentityPair,
  parseHostedAuthQaActionLink,
  parseHostedAuthQaEmailVerificationResponse,
  parseHostedAuthQaPasswordResetResponse,
  type HostedAuthQaConfig,
  type HostedAuthQaIdentity,
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
  | "action_identity_create"
  | "assertions_console_errors"
  | "assertions_console_warnings"
  | "assertions_mutations"
  | "assertions_page_errors"
  | "assertions_request_failures"
  | "assertions_response_failures"
  | "browser_launch"
  | "cleanup"
  | "duplicate_registration"
  | "firebase_inventory_after"
  | "firebase_inventory_before"
  | "invalid_credentials"
  | "old_password_rejected"
  | "password_reset_code_confirmed"
  | "password_reset_code_verified"
  | "password_reset_link_parse"
  | "password_reset_link_request"
  | "recovery_known"
  | "recovery_unknown"
  | "registration"
  | "revocation"
  | "sign_out"
  | "unverified_sign_in"
  | "unverified_session"
  | "verification_code_confirmed"
  | "verification_link_parse"
  | "verification_link_request"
  | "verified_return_route"
  | "verified_sign_in_navigation"
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
    assertConsoleErrorsClean: (expectedHttpStatuses: readonly number[]) => {
      const genericHttpStatuses = consoleErrors.map((message) => {
        const match = message.match(
          /^Failed to load resource: the server responded with a status of (\d{3})/u,
        );
        return match?.[1] ? Number(match[1]) : undefined;
      });
      assert.equal(genericHttpStatuses.includes(undefined), false);
      assert.deepEqual(
        genericHttpStatuses.toSorted((left, right) => (left ?? 0) - (right ?? 0)),
        expectedHttpStatuses.toSorted((left, right) => left - right),
      );
    },
    assertConsoleWarningsClean: () => assert.deepEqual(consoleWarnings, []),
    assertPageErrorsClean: () => assert.deepEqual(pageErrors, []),
    assertRequestFailuresClean: () => assert.deepEqual(requestFailures, []),
    assertResponseFailuresClean: () => assert.deepEqual(responseFailures, []),
    firstPartyMutations,
  };
}

function waitForFirebaseAuthResponse(page: Page, operation: string) {
  return page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.hostname === "identitytoolkit.googleapis.com" &&
      url.pathname.endsWith(`/accounts:${operation}`) &&
      response.request().method() === "POST";
  });
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

async function postFirebaseAction(
  config: HostedAuthQaConfig,
  operation: "resetPassword" | "update",
  body: Readonly<Record<string, string>>,
): Promise<unknown> {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:${operation}?key=${encodeURIComponent(config.apiKey)}`,
    {
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
      method: "POST",
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (!response.ok) {
    throw new Error("Hosted authentication QA action request failed.");
  }
  const responseBody = await response.text();
  if (responseBody.length > 32_768) {
    throw new Error("Hosted authentication QA action response is invalid.");
  }
  try {
    return JSON.parse(responseBody) as unknown;
  } catch {
    throw new Error("Hosted authentication QA action response is invalid.");
  }
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
  identities: Readonly<{
    actionCode: HostedAuthQaIdentity;
    application: HostedAuthQaIdentity;
  }>,
  setCreatedUid: (role: "actionCode" | "application", uid: string) => void,
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
  const expectedConsoleHttpStatuses: number[] = [];
  const identity = identities.application;

  try {
    await page.goto(`${config.origin}/sign-in?returnTo=%2Fapp`);
    await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
    await assertAccessible(page);

    setStage("invalid_credentials");
    const invalidCredentialResponse = waitForFirebaseAuthResponse(
      page,
      "signInWithPassword",
    );
    await submitEmailForm(page, {
      email: identity.email,
      password: "Wrong-password-1!",
      submitName: "Sign in with email",
    });
    assert.equal((await invalidCredentialResponse).status(), 400);
    expectedConsoleHttpStatuses.push(400);
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
    setCreatedUid("application", created.uid);

    setStage("duplicate_registration");
    await chooseAuthTask(page, "Register");
    const duplicateRegistrationResponse = waitForFirebaseAuthResponse(page, "signUp");
    await submitEmailForm(page, {
      email: identity.email,
      password: identity.password,
      submitName: "Create account",
    });
    assert.equal((await duplicateRegistrationResponse).status(), 400);
    expectedConsoleHttpStatuses.push(400);
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

    setStage("action_identity_create");
    const actionIdentity = identities.actionCode;
    const actionCreated = await auth.createUser({
      displayName: actionIdentity.displayMarker,
      email: actionIdentity.email,
      emailVerified: false,
      password: actionIdentity.password,
    });
    setCreatedUid("actionCode", actionCreated.uid);

    setStage("verification_link_request");
    const verificationLink = await auth.generateEmailVerificationLink(actionIdentity.email);
    setStage("verification_link_parse");
    const verificationAction = parseHostedAuthQaActionLink(verificationLink, {
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      mode: "verifyEmail",
    });
    setStage("verification_code_confirmed");
    parseHostedAuthQaEmailVerificationResponse(
      await postFirebaseAction(config, "update", {
        oobCode: verificationAction.oobCode,
      }),
      { email: actionIdentity.email, uid: actionCreated.uid },
    );
    assert.equal((await auth.getUser(actionCreated.uid)).emailVerified, true);

    setStage("password_reset_link_request");
    const passwordResetLink = await auth.generatePasswordResetLink(actionIdentity.email);
    setStage("password_reset_link_parse");
    const passwordResetAction = parseHostedAuthQaActionLink(passwordResetLink, {
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      mode: "resetPassword",
    });
    setStage("password_reset_code_verified");
    parseHostedAuthQaPasswordResetResponse(
      await postFirebaseAction(config, "resetPassword", {
        oobCode: passwordResetAction.oobCode,
      }),
      actionIdentity.email,
    );
    setStage("password_reset_code_confirmed");
    parseHostedAuthQaPasswordResetResponse(
      await postFirebaseAction(config, "resetPassword", {
        newPassword: actionIdentity.recoveredPassword,
        oobCode: passwordResetAction.oobCode,
      }),
      actionIdentity.email,
    );

    setStage("verified_return_route");
    await page.goto(`${config.origin}/sign-in?returnTo=%2Fapp`);
    await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();

    setStage("old_password_rejected");
    const oldPasswordResponse = waitForFirebaseAuthResponse(page, "signInWithPassword");
    await submitEmailForm(page, {
      email: actionIdentity.email,
      password: actionIdentity.password,
      submitName: "Sign in with email",
    });
    assert.equal((await oldPasswordResponse).status(), 400);
    expectedConsoleHttpStatuses.push(400);
    await expect(page.locator(".auth-message")).toHaveText(
      "The email or password is not valid.",
    );

    setStage("verified_sign_in_submit");
    const verifiedSessionResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.origin === config.origin &&
        url.pathname === "/api/auth/session" &&
        response.request().method() === "POST";
    });
    await submitEmailForm(page, {
      email: actionIdentity.email,
      password: actionIdentity.recoveredPassword,
      submitName: "Sign in with email",
    });
    setStage("verified_session_create");
    const sessionResponse = await verifiedSessionResponse;
    if (!sessionResponse.ok()) {
      setStage("verified_session_create_rejected");
      assert.ok(sessionResponse.ok());
    }
    setStage("verified_session_cookie");
    await assertSecureSessionCookie(context, config.origin);
    setStage("verified_sign_in_navigation");
    await page.waitForURL(`${config.origin}/app`, { timeout: 10_000 });
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
    await auth.revokeRefreshTokens(actionCreated.uid);
    await page.reload();
    await page.waitForURL(`${config.origin}/sign-in?returnTo=%2Fapp`);
    await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();

    setStage("assertions_console_errors");
    failures.assertConsoleErrorsClean(expectedConsoleHttpStatuses);
    setStage("assertions_console_warnings");
    failures.assertConsoleWarningsClean();
    setStage("assertions_page_errors");
    failures.assertPageErrorsClean();
    setStage("assertions_response_failures");
    failures.assertResponseFailuresClean();
    setStage("assertions_request_failures");
    failures.assertRequestFailuresClean();
    setStage("assertions_mutations");
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
  emailActionCodesVerified: true;
  engine: "chromium";
  firstPartyMutationCount: number;
  firebaseUserCountAfter: number;
  firebaseUserCountBefore: number;
  origin: string;
  passwordRecoveryConfirmed: true;
  secureCookieVerified: true;
  status: "passed";
  viewport: "1440x1000";
}>> {
  const auth = getFirebaseAdminAuth();
  const identities = createHostedAuthQaIdentityPair();
  let stage: HostedAuthQaStage = "firebase_inventory_before";
  const beforeCount = await firebaseUserCount(auth);
  const createdUids: Partial<Record<"actionCode" | "application", string>> = {};
  let browserResult: Awaited<ReturnType<typeof runBrowserLifecycle>> | undefined;
  let runFailed = false;
  let cleanupConfirmed = false;
  let failureStage: HostedAuthQaStage = stage;

  await mkdir(evidenceDirectory, { recursive: true });
  try {
    browserResult = await runBrowserLifecycle(
      auth,
      config,
      identities,
      (role, uid) => {
        createdUids[role] = uid;
      },
      (nextStage) => {
        stage = nextStage;
      },
    );
    stage = "firebase_inventory_after";
    assert.equal(await firebaseUserCount(auth), beforeCount + 2);
  } catch {
    runFailed = true;
    failureStage = stage;
  } finally {
    stage = "cleanup";
    for (const role of ["application", "actionCode"] as const) {
      if (!createdUids[role]) {
        try {
          createdUids[role] = (await auth.getUserByEmail(identities[role].email)).uid;
        } catch (error) {
          if (!isUserNotFound(error)) {
            runFailed = true;
            failureStage = "cleanup";
          }
        }
      }

      const uid = createdUids[role];
      if (uid) {
        try {
          await auth.deleteUser(uid);
        } catch (error) {
          if (!isUserNotFound(error)) {
            runFailed = true;
            failureStage = "cleanup";
          }
        }
      }
    }

    try {
      const identitiesAbsent = await Promise.all(
        Object.values(createdUids).map((uid) => identityIsAbsent(auth, uid)),
      );
      cleanupConfirmed = identitiesAbsent.every(Boolean) &&
        await firebaseUserCount(auth) === beforeCount;
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
    emailActionCodesVerified: true,
    engine: "chromium",
    firstPartyMutationCount: browserResult.firstPartyMutationCount,
    firebaseUserCountAfter: beforeCount,
    firebaseUserCountBefore: beforeCount,
    origin: config.origin,
    passwordRecoveryConfirmed: true,
    secureCookieVerified: true,
    status: "passed",
    viewport: "1440x1000",
  };
}
