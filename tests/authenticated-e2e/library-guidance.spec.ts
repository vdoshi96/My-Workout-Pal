import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import {
  HARNESS_SCENARIO_HEADER,
  HARNESS_SCOPE_HEADER,
  HARNESS_VIEWER_HEADER,
} from "../fixtures/authenticated-app/server/harness-context";

async function privateMutation(
  page: Page,
  path: string,
  method: "POST" | "PUT",
  body: unknown,
) {
  return page.evaluate(async ({ body: requestBody, method: requestMethod, path: requestPath }) => {
    const csrfResponse = await fetch("/api/auth/csrf", {
      cache: "no-store",
      credentials: "same-origin",
    });
    const csrf = (await csrfResponse.json()) as { token?: unknown };
    if (typeof csrf.token !== "string") throw new Error("CSRF fixture failed");
    const response = await fetch(requestPath, {
      body: JSON.stringify(requestBody),
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrf.token,
      },
      method: requestMethod,
    });
    return { body: await response.json(), status: response.status };
  }, { body, method, path });
}

test("browses, creates, links, selects, and isolates private movements", async ({
  page,
}, testInfo) => {
  const scope = `library-guidance-${testInfo.project.name.replace(/[^a-z0-9]+/giu, "-").toLowerCase()}`;
  let viewer: "alice" | "bob" = "alice";
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      if (
        message.text().startsWith(
          "Failed to load resource: the server responded with a status of",
        )
      ) {
        return;
      }
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
        [HARNESS_VIEWER_HEADER]: viewer,
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

  await page.goto("/app/library/chooser");
  const dialog = page.getByRole("dialog", { name: "Add movement" });
  await expect(dialog).toBeVisible();
  const search = dialog.getByRole("searchbox", { name: "Search movements" });
  await search.fill("goblet squat");
  await expect(dialog.getByRole("button", { name: /Goblet squat/ })).toBeVisible();
  await dialog.getByRole("radio", { name: "Mine" }).check();
  await expect(dialog.getByText("No compatible movement matches this search.")).toBeVisible();
  await dialog.getByRole("button", { name: "Clear search" }).click();
  await dialog.getByRole("radio", { name: "All" }).check();

  await dialog.getByRole("button", { name: "Create private movement" }).click();
  await dialog.getByLabel("Movement name").fill("Suitcase march");
  await dialog.getByLabel("How results are logged").selectOption("duration");
  await dialog.getByLabel("Instructions").fill("March slowly while keeping the load steady.");
  await dialog.getByLabel("Your link 1").fill("https://youtu.be/AbCdEfGhI01?t=20");
  await dialog.getByRole("button", { name: "Create and use" }).click();

  const chosen = page.getByLabel("Chosen movement");
  await expect(chosen).toContainText("custom:");
  await expect(chosen).toContainText(":Suitcase march:duration");
  const chosenText = await chosen.textContent();
  const customId = chosenText?.split(":")[1];
  if (!customId) throw new Error("Chosen custom movement ID is missing");

  await page.getByRole("button", { name: "Open movement chooser" }).click();
  const reopened = page.getByRole("dialog", { name: "Add movement" });
  await reopened.getByRole("searchbox", { name: "Search movements" }).fill("suitcase");
  await reopened.getByRole("button", { name: /Suitcase march/ }).click();
  const firstLink = reopened.getByLabel("Your link 1");
  await expect(firstLink).toHaveValue(
    "https://www.youtube.com/watch?v=AbCdEfGhI01",
  );
  await firstLink.fill("https://example.com/suitcase-guide");
  await reopened.getByRole("button", { name: "Save private links" }).click();
  await expect(reopened.getByText("Your links are saved privately.")).toBeVisible();

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(
    accessibility.violations.filter((violation) =>
      ["critical", "serious"].includes(violation.impact ?? ""),
    ),
  ).toEqual([]);
  await page.screenshot({
    fullPage: true,
    path: `docs/qa/latest/library-guidance-${testInfo.project.name}.png`,
  });
  await reopened.getByRole("button", { name: "Use this movement" }).click();

  const publication = await page.evaluate(async ({ id }) => {
    const profileResponse = await fetch("/api/app/profile-program", {
      cache: "no-store",
      credentials: "same-origin",
    });
    const profile = (await profileResponse.json()) as {
      profileProgram?: { activeProgram?: { id?: unknown; revisionId?: unknown } | null };
    };
    const activeProgram = profile.profileProgram?.activeProgram;
    if (
      typeof activeProgram?.id !== "string" ||
      typeof activeProgram.revisionId !== "string"
    ) {
      throw new Error("The active fixture program is unavailable");
    }
    return {
      baseRevisionId: activeProgram.revisionId,
      days: [
        {
          cardio: [],
          dayKey: crypto.randomUUID(),
          dayNumber: 1,
          displayName: "Guidance day",
          sections: [
            {
              kind: "strength",
              prescriptions: [
                {
                  catalogExerciseId: null,
                  customExerciseId: id,
                  displayName: null,
                  maximumReps: null,
                  maximumSeconds: 60,
                  minimumReps: null,
                  minimumSeconds: 30,
                  notes: null,
                  prescriptionKey: crypto.randomUUID(),
                  restSeconds: 30,
                  setCount: 1,
                  setKind: "work",
                  sourcePrescriptionId: null,
                  targetDistanceM: null,
                  targetWeightKg: null,
                },
              ],
              sectionKey: crypto.randomUUID(),
              title: "Main work",
            },
          ],
        },
      ],
      idempotencyKey: crypto.randomUUID(),
      name: "Guidance proof",
      programId: activeProgram.id,
    };
  }, { id: customId });
  const publishResult = await privateMutation(
    page,
    "/api/app/program/publish",
    "POST",
    publication,
  );
  expect(publishResult.status).toBe(200);

  await page.goto("/app");
  await page.getByRole("link", { name: /Guidance day/ }).click();
  const start = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/app/workouts" &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Start or resume workout" }).click();
  expect((await start).status()).toBe(201);
  await expect(page).toHaveURL(/\/workout\/[0-9a-f-]+$/u);
  await expect(page.getByRole("heading", { name: "Suitcase march" })).toBeVisible();
  await expect(page.getByText("Your links", { exact: true })).toBeVisible();
  const snapshottedLink = page.getByRole("link", { name: "Open your link 1" });
  await expect(snapshottedLink).toHaveAttribute(
    "href",
    "https://example.com/suitcase-guide",
  );
  await expect(
    page.getByText("Personal links are yours and have not been reviewed or approved by the app."),
  ).toBeVisible();
  const runnerUrl = page.url();

  const replacement = await privateMutation(
    page,
    "/api/app/personal-guidance",
    "PUT",
    {
      source: { kind: "custom", id: customId },
      links: ["https://example.com/replaced-after-start"],
      idempotencyKey: crypto.randomUUID(),
    },
  );
  expect(replacement.status).toBe(200);
  await page.goto(runnerUrl);
  await expect(page.getByRole("link", { name: "Open your link 1" })).toHaveAttribute(
    "href",
    "https://example.com/suitcase-guide",
  );
  await expect(page.locator('a[href="https://example.com/replaced-after-start"]')).toHaveCount(0);
  await page.screenshot({
    fullPage: true,
    path: `docs/qa/latest/library-guidance-runner-${testInfo.project.name}.png`,
  });

  viewer = "bob";
  const isolation = await page.evaluate(async ({ id }) => {
    const response = await fetch(
      `/api/app/personal-guidance?kind=custom&id=${encodeURIComponent(id)}`,
      { cache: "no-store", credentials: "same-origin" },
    );
    return { body: await response.json(), status: response.status };
  }, { id: customId });
  expect(isolation).toMatchObject({ status: 404, body: { error: "not_found" } });

  expect(consoleErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
});
