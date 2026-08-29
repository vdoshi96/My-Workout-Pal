import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import {
  HARNESS_SCENARIO_HEADER,
  HARNESS_SCOPE_HEADER,
  HARNESS_VIEWER_HEADER,
} from "../fixtures/authenticated-app/server/harness-context";

async function chooseCanonicalMovement(
  page: Page,
  query: string,
  name: string,
) {
  const dialog = page.getByRole("dialog", { name: "Add movement" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("searchbox", { name: "Search movements" }).fill(query);
  const candidate = dialog.getByRole("button", { name: new RegExp(name, "iu") });
  await expect(candidate).toBeVisible();
  await candidate.click();
  await expect(dialog.getByRole("heading", { level: 3, name })).toBeVisible();
  await expect(dialog.getByText("Approved catalog guidance available")).toHaveCount(0);
  await expect(dialog.getByRole("group", { name: "Your private guidance" })).toBeVisible();
  await expect(dialog.locator("iframe")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Use this movement" }).click();
}

async function assertAccessible(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((violation) =>
      ["critical", "serious"].includes(violation.impact ?? ""),
    ),
  ).toEqual([]);
}

test("publishes, reloads, and starts a routine with text-only upper- and lower-body additions", async ({
  page,
}, testInfo) => {
  test.slow();
  const scope = `library-strength-${testInfo.project.name}`;
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];

  page.on("console", (message) => {
    if (
      (message.type() === "error" || message.type() === "warning") &&
      !message.text().startsWith(
        "Failed to load resource: the server responded with a status of",
      )
    ) {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("requestfailed", (request) => {
    const url = new URL(request.url());
    if (url.hostname === "127.0.0.1" && !url.searchParams.has("_rsc")) {
      failedRequests.push(
        `${request.method()} ${url.pathname}: ${request.failure()?.errorText ?? "failed"}`,
      );
    }
  });
  await page.route(/^http:\/\/127\.0\.0\.1:\d+\//u, async (route) => {
    await route.continue({
      headers: {
        ...route.request().headers(),
        [HARNESS_SCENARIO_HEADER]: "ready",
        [HARNESS_SCOPE_HEADER]: scope,
        [HARNESS_VIEWER_HEADER]: "alice",
      },
    });
  });

  await page.goto("/app");
  const onboarding = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/app/profile-program/onboard" &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Start with example" }).click();
  expect((await onboarding).status()).toBe(201);
  await expect(page.getByRole("heading", { name: "Choose a training day" })).toBeVisible();

  await page.goto("/app/program/edit");
  const strengthSection = page
    .locator("fieldset.program-editor-section")
    .filter({ has: page.getByLabel("Section name for strength") })
    .first();
  await strengthSection.getByRole("button", { name: "Add movement" }).click();
  await chooseCanonicalMovement(
    page,
    "floor dumbbell press",
    "Dumbbell floor press",
  );
  await expect(
    strengthSection.getByRole("heading", {
      level: 3,
      name: "Dumbbell floor press",
    }),
  ).toBeVisible();

  await strengthSection.getByRole("button", { name: "Add movement" }).click();
  await chooseCanonicalMovement(page, "wall sit", "Wall sit");
  await expect(
    strengthSection.getByRole("heading", { level: 3, name: "Wall sit" }),
  ).toBeVisible();
  const wallSitEditor = strengthSection
    .locator("li.program-editor-prescription")
    .filter({ has: page.getByRole("heading", { level: 3, name: "Wall sit" }) });
  await expect(wallSitEditor.getByLabel("Minimum seconds")).toHaveValue("20");
  await expect(wallSitEditor.getByLabel("Maximum seconds")).toHaveValue("45");

  const publishResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/app/program/publish" &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Publish new revision" }).click();
  expect((await publishResponse).status()).toBe(200);
  await expect(page.getByText(/Published revision \d+/u)).toBeVisible();

  const savedDayLink = page.getByRole("link", { name: "Open saved day" });
  const savedDayHref = await savedDayLink.getAttribute("href");
  if (!savedDayHref) throw new Error("The published day link is missing its destination.");
  await Promise.all([
    page.waitForURL((url) => url.pathname === savedDayHref),
    savedDayLink.click(),
  ]);
  await page.reload();
  await expect(page.getByText("Dumbbell floor press", { exact: true })).toBeVisible();
  const savedWallSit = page
    .locator(".member-day-section li")
    .filter({ has: page.getByText("Wall sit", { exact: true }) });
  await expect(savedWallSit).toBeVisible();
  await expect(savedWallSit.getByText(/20–45 sec/u)).toBeVisible();

  const startResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/app/workouts" &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Start or resume workout" }).click();
  expect((await startResponse).status()).toBe(201);
  await expect(page).toHaveURL(/\/workout\/[0-9a-f-]+$/u);

  await page.getByRole("button", { name: /Dumbbell floor press/iu }).click();
  await expect(
    page.getByRole("heading", { level: 2, name: "Dumbbell floor press" }),
  ).toBeVisible();
  const techniquePanel = page.locator("section.runner-technique");
  await expect(techniquePanel.getByText("Unavailable", { exact: true })).toBeVisible();
  await expect(
    techniquePanel.getByText(
      "No approved catalog pair is available for this movement. Workout logging remains available.",
    ),
  ).toBeVisible();
  await expect(page.locator("iframe")).toHaveCount(0);

  await page.getByRole("button", { name: /Wall sit/iu }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Wall sit" })).toBeVisible();
  await expect(page.getByLabel("Duration (seconds)")).toBeVisible();
  await expect(techniquePanel.getByText("Unavailable", { exact: true })).toBeVisible();
  await expect(page.locator("iframe")).toHaveCount(0);
  await assertAccessible(page);
  await page.screenshot({
    fullPage: true,
    path: `docs/qa/latest/library-strength-expansion-${testInfo.project.name}.png`,
  });

  expect(consoleErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
});
