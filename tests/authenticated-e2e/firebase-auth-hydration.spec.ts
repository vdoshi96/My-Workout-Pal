import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Request } from "@playwright/test";

import {
  HARNESS_SCENARIO_HEADER,
  HARNESS_SCOPE_HEADER,
  HARNESS_VIEWER_HEADER,
} from "../fixtures/authenticated-app/server/harness-context";

function isSupersededNextFlightRequest(request: Request): boolean {
  const url = new URL(request.url());
  return (
    request.method() === "GET" &&
    url.searchParams.has("_rsc") &&
    request.headers()["rsc"] === "1" &&
    ["net::ERR_ABORTED", "cancelled"].includes(request.failure()?.errorText ?? "")
  );
}

test("full-page Settings fails closed until the browser Firebase identity is restored", async ({
  page,
}, testInfo) => {
  const scope = `firebase-hydration-${testInfo.project.name}`;
  const consoleErrors: string[] = [];
  const failedResponses: string[] = [];
  const failedRequests: string[] = [];

  await page.context().route(/^http:\/\/127\.0\.0\.1:\d+\//, async (route) => {
    await route.continue({
      headers: {
        ...route.request().headers(),
        [HARNESS_SCENARIO_HEADER]: "firebase-client-missing",
        [HARNESS_SCOPE_HEADER]: scope,
        [HARNESS_VIEWER_HEADER]: "alice",
      },
    });
  });
  await page.context().route(
    /^https:\/\/fixture\.invalid\/__\/auth\/iframe/u,
    async (route) => {
      await route.fulfill({
        body: "<!doctype html><html lang=\"en\"><title>Fixture Firebase auth bridge</title></html>",
        contentType: "text/html; charset=utf-8",
        headers: { "cache-control": "no-store" },
        status: 200,
      });
    },
  );
  page.on("console", (message) => {
    if (
      (message.type() === "error" || message.type() === "warning") &&
      !message.text().startsWith("Failed to load resource: the server responded with a status of")
    ) {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.hostname === "127.0.0.1" && response.status() >= 400) {
      failedResponses.push(
        `${response.request().method()} ${url.pathname} ${response.status()}`,
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

  await page.goto("/app");
  await page.getByRole("button", { name: "Create my program" }).click();
  await expect(page.getByRole("heading", { name: "Choose a training day" })).toBeVisible();
  await page.goto("/app/settings");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await expect(
    page.getByText("The browser Firebase sign-in could not be found after initialization."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Review permanent deletion" })).toBeDisabled();
  await expect(page.getByRole("link", { name: "Sign in again" })).toHaveAttribute(
    "href",
    "/sign-in?returnTo=%2Fapp%2Fsettings",
  );
  await expect(page.locator("body")).not.toContainText("fixture-alice");

  const axe = await new AxeBuilder({ page }).analyze();
  expect(
    axe.violations.filter((violation) =>
      ["critical", "serious"].includes(violation.impact ?? ""),
    ),
  ).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(consoleErrors).toEqual([]);
  expect(failedResponses).toEqual([]);
  expect(failedRequests).toEqual([]);

  const cleanup = await page.request.delete("/api/harness/scope", {
    headers: {
      [HARNESS_SCENARIO_HEADER]: "firebase-client-missing",
      [HARNESS_SCOPE_HEADER]: scope,
      [HARNESS_VIEWER_HEADER]: "alice",
    },
  });
  expect(cleanup.ok()).toBe(true);
});
