import { expect, type BrowserContext, type Page } from "@playwright/test";

// Shared member-journey steps for the synthetic harness (Alice or Bob, isolated by scope).

export async function useViewer(context: BrowserContext, scope: string, viewer: "alice" | "bob" | "alice-unverified" = "alice") {
  await context.setExtraHTTPHeaders({
    "x-mwp-harness-viewer": viewer,
    "x-mwp-harness-scope": scope,
    "x-mwp-harness-scenario": "ready",
  });
  await context.route(/youtube-nocookie\.com|youtube\.com/u, (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>Demo omitted in local QA</title>" }),
  );
}

export type OnboardingAnswers = Readonly<{
  goal: "Get stronger" | "Build muscle" | "Feel fitter overall" | "Lose fat" | "Train for a sport or event";
  experience: "I'm new to this" | "Some" | "Lots";
  days: "2 days" | "3 days" | "4 days" | "5 days";
  equipment: "Dumbbells, a bench and bodyweight" | "A full gym with a barbell and rack";
}>;

export const DEFAULT_ANSWERS: OnboardingAnswers = {
  goal: "Build muscle",
  experience: "Some",
  days: "3 days",
  equipment: "Dumbbells, a bench and bodyweight",
};

/** Answers the four onboarding questions and stops on the routine preview. */
export async function answerOnboarding(page: Page, answers: OnboardingAnswers = DEFAULT_ANSWERS, { navigate = true } = {}) {
  if (navigate) await page.goto("/app");
  await expect(page.getByRole("heading", { level: 1, name: "What are you training for?" })).toBeVisible();
  for (const [heading, choice] of [
    ["What are you training for?", answers.goal],
    ["How much lifting have you done?", answers.experience],
    ["How many days a week can you train?", answers.days],
    ["What do you have to work with?", answers.equipment],
  ] as const) {
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await page.getByRole("radio", { name: new RegExp(`^${choice.replace(/[+?]/gu, "\\$&")}`, "u") }).check();
    await page.getByRole("button", { name: "Continue" }).click();
  }
}

/** Skips the tour and waits for Today, whose heading takes focus once it arrives. */
export async function skipTour(page: Page) {
  await page.getByRole("button", { name: "Skip tour" }).click();
  await expect(page.getByRole("heading", { level: 1, name: /^Hey .+! Ready for / })).toBeFocused();
}

/** Saves the routine on the preview and skips the tour, landing on Today. */
export async function saveRoutineAndSkipTour(page: Page) {
  await page.getByRole("button", { name: "Save my routine" }).click();
  await skipTour(page);
  await expect(page.getByRole("button", { name: /^Start / })).toBeVisible();
}

/** The five-day example routine through the new onboarding ("Prefer a different start?"). */
export async function saveExampleRoutine(page: Page, answers: OnboardingAnswers = DEFAULT_ANSWERS) {
  await answerOnboarding(page, answers);
  await page.getByText("Prefer a different start?").click();
  await page.getByRole("button", { name: "Use the five-day example" }).click();
  await saveRoutineAndSkipTour(page);
}

/** A blank routine with one first movement; lands in the routine editor. */
export async function startBlankRoutine(page: Page, search: string, movement: RegExp, answers: OnboardingAnswers = DEFAULT_ANSWERS) {
  await answerOnboarding(page, answers);
  await page.getByText("Prefer a different start?").click();
  await page.getByRole("button", { name: "Start blank" }).click();
  await page.getByLabel("Search movements").fill(search);
  await page.getByRole("button", { name: movement }).click();
  await page.getByRole("button", { name: "Save my routine" }).click();
  await page.waitForURL(/\/app\/program\/edit/u);
}

/** From the onboarding screen already open: choose the five-day example, save, and skip the tour. */
export async function saveExampleFromOnboarding(page: Page) {
  await answerOnboarding(page, DEFAULT_ANSWERS, { navigate: false });
  await page.getByText("Prefer a different start?").click();
  await page.getByRole("button", { name: "Use the five-day example" }).click();
  await page.getByRole("button", { name: "Save my routine" }).click();
  await skipTour(page);
}
