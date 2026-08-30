import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

function capturePageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    const text = message.text();
    if (
      message.type() === "error" &&
      text !== "Permissions policy violation: compute-pressure is not allowed in this document."
    ) {
      errors.push(`console: ${text}`);
    }
  });
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  return errors;
}

test("guest previews both profiles and completes the public discovery route", async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000);
  const errors = capturePageErrors(page);
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Your workout. Your way.",
    }),
  ).toBeVisible();
  await expect(page.locator('[data-companion-placement="landing"]')).toBeVisible();
  await expect(
    page.locator('[data-companion-placement="landing"] img'),
  ).toHaveAttribute("fetchpriority", "high");
  await expect(page.getByText("Open to everyone")).toBeVisible();
  await expect(page.getByText("Sign in to make it yours")).toBeVisible();
  if (testInfo.project.name === "chromium-desktop") {
    const evidencePath = testInfo.outputPath("companion-landing-desktop.png");
    await page.screenshot({ fullPage: true, path: evidencePath });
    await testInfo.attach("companion-landing-desktop", {
      contentType: "image/png",
      path: evidencePath,
    });
  }

  await page.getByRole("link", { name: "Explore the five-day example" }).click();
  await expect(page).toHaveURL(/\/program$/);
  await expect(page.getByText("Starter preview · not saved")).toBeVisible();
  for (const [index, name] of ["Push", "Pull", "Legs", "Upper", "Lower"].entries()) {
    await expect(
      page.getByRole("button", { name: `${index + 1} ${name}` }),
    ).toBeVisible();
  }

  await page.getByRole("link", { name: "Open Push day" }).click();
  await expect(page).toHaveURL(/\/program\/push\?equipment=dumbbells$/);
  await page.getByRole("link", { name: /Dumbbell bench press/ }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Dumbbell bench press" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Push day" }).click();
  await expect(page).toHaveURL(/\/program\/push\?equipment=dumbbells$/);
  await page.getByRole("link", { name: "Five-day starter example" }).click();
  await expect(page).toHaveURL(/\/program\?equipment=dumbbells$/);

  const barbellPreview = page.getByRole("button", {
    name: "Barbell + rack",
  });
  await barbellPreview.click();
  await expect(barbellPreview).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "2 Pull" }).click();
  const selectedDay = page.locator("#selected-day-sheet");
  await expect(
    selectedDay.getByRole("heading", { level: 2, name: "Pull day" }),
  ).toBeVisible();
  await expect(selectedDay.getByText("Barbell bent-over row")).toBeVisible();

  await selectedDay.getByRole("link", { name: "Open Pull day" }).click();
  await expect(page).toHaveURL(/\/program\/pull\?equipment=barbell$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Pull day" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Barbell bent-over row/ }),
  ).toBeVisible();
  await expect(page.getByText("Starter preview · not saved")).toBeVisible();

  await page.goto("/library?equipment=barbell");
  await page.getByLabel("Search movements").fill("bent over row");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(
    page.getByRole("link", { name: /Barbell bent-over row/ }),
  ).toBeVisible();
  await page.getByRole("link", { name: /Barbell bent-over row/ }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Barbell bent-over row" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Exercise library" }).click();
  await expect(page).toHaveURL(/\/library\?equipment=barbell&q=bent\+over\+row$/);
  await page.getByLabel("Search movements").fill("not a real movement");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(
    page.getByRole("heading", { level: 3, name: "No compatible match" }),
  ).toBeVisible();
  await Promise.all([
    page.waitForURL(/\/library\?equipment=barbell$/),
    page.getByRole("link", { name: "Clear search" }).click(),
  ]);
  await expect(
    page.getByRole("heading", { level: 2, name: /^\d+ compatible movements$/ }),
  ).toBeVisible();

  await page.goto("/library?q=first&q=second");
  await expect(
    page.getByRole("heading", { level: 1, name: "Exercise library" }),
  ).toBeVisible();

  await page.goto("/sample-workout?day=lower&equipment=barbell");
  await expect(
    page.getByRole("heading", { level: 1, name: "Lower workout" }),
  ).toBeVisible();
  await expect(page.getByText("Not your workout · never saved")).toBeVisible();
  await expect(page.getByText("Read only")).toBeVisible();

  await page.goto("/progress");
  await expect(
    page.getByRole("heading", { level: 1, name: "Progress" }),
  ).toBeVisible();
  await expect(page.getByText("Sample data · not your history", { exact: true })).toHaveCount(1);
  await expect(page.getByLabel("Progress preview")).toBeVisible();
  await page.goto("/sample-progress");
  await expect(page).toHaveURL(/\/progress$/);

  await page.goto("/sign-in?returnTo=%2Fhistory&returnTo=%2Fapp");
  await expect(page.locator("#auth-heading")).toHaveText(
    /^(Sign-in connection pending|Sign in)$/,
  );
  await expect(page.getByRole("link", { name: "Browse the free program" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("public account entry uses the protected member boundary from every public chrome", async ({
  page,
}) => {
  const errors = capturePageErrors(page);

  await page.goto("/");
  const landingAccountAction = page.getByRole("link", {
    exact: true,
    name: "My workouts",
  });
  await expect(landingAccountAction).toHaveAttribute("href", "/app");
  await landingAccountAction.click();
  await expect(page).toHaveURL(/\/sign-in\?returnTo=%2Fapp$/u);
  await expect(page.locator("#auth-heading")).toHaveText(/^(Sign-in connection pending|Sign in)$/);
  await page.waitForLoadState("networkidle");

  await page.goto("/program");
  await expect(page.getByText("Starter preview · not saved")).toBeVisible();
  const programAccountActions = page.getByRole("link", { name: "My workouts" });
  await expect(programAccountActions.first()).toHaveAttribute("href", "/app");

  await page.goto("/program/push?equipment=dumbbells");
  await expect(page.getByText("Starter preview · not saved")).toBeVisible();
  await expect(page.getByText("Five-day starter example")).toBeVisible();
  const dayAccountAction = page.getByRole("link", { name: "My workouts" });
  await expect(dayAccountAction).toHaveAttribute("href", "/app");
  await dayAccountAction.click();
  await expect(page).toHaveURL(/\/sign-in\?returnTo=%2Fapp$/u);
  await expect(page.locator("#auth-heading")).toHaveText(/^(Sign-in connection pending|Sign in)$/);
  await page.waitForLoadState("networkidle");

  expect(errors).toEqual([]);
});

const accessibilityRoutes = [
  { name: "landing", path: "/" },
  { name: "program overview", path: "/program" },
  { name: "day detail", path: "/program/pull?equipment=barbell" },
  { name: "library", path: "/library?equipment=dumbbells" },
  {
    name: "exercise detail",
    path: "/library/dumbbell-bench-press?equipment=dumbbells",
  },
  {
    name: "sample workout",
    path: "/sample-workout?day=push&equipment=dumbbells",
  },
  { name: "progress preview", path: "/progress" },
  { name: "sign in", path: "/sign-in" },
] as const;

for (const route of accessibilityRoutes) {
  test(`${route.name} has no serious public accessibility violation`, async ({
    page,
  }) => {
    const errors = capturePageErrors(page);
    await page.goto(route.path);
    const axe = new AxeBuilder({ page });
    if (route.name === "exercise detail") {
      const embeddedDemo = page.locator(".curated-player-frame iframe");
      await expect(embeddedDemo).toHaveAttribute("title", /\S/);
      // YouTube owns the cross-origin player document. Audit the titled iframe
      // boundary here without treating YouTube's internal ARIA as app markup.
      axe.exclude(".curated-player-frame iframe");
    }
    const results = await axe.analyze();
    const releaseBlocking = results.violations
      .filter(({ impact }) => impact === "serious" || impact === "critical")
      .map(({ help, id, impact, nodes }) => ({
        help,
        id,
        impact,
        targets: nodes.flatMap(({ target }) => target),
      }));

    expect(releaseBlocking).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test("keyboard, phone targets, dark mode, and reduced motion preserve the public route", async ({
  browserName,
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/");

  if ((page.viewportSize()?.width ?? 0) <= 430) {
    const primaryAction = await page
      .getByRole("link", { name: "Explore the five-day example" })
      .boundingBox();
    const fixedNavigation = await page.locator(".public-nav").boundingBox();
    expect(primaryAction).not.toBeNull();
    expect(fixedNavigation).not.toBeNull();
    expect(primaryAction!.y + primaryAction!.height).toBeLessThanOrEqual(
      fixedNavigation!.y,
    );
  }

  await page.keyboard.press(browserName === "webkit" ? "Alt+Tab" : "Tab");
  const skipLink = page.getByRole("link", { name: "Skip to content" });
  await expect(skipLink).toBeFocused();
  await skipLink.press("Enter");
  await expect(page).toHaveURL(/#main-content$/);
  await expect(page.locator("#main-content")).toBeFocused();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Your workout. Your way.",
    }),
  ).toBeVisible();

  const presentation = await page.evaluate(() => {
    const rootStyle = getComputedStyle(document.documentElement);
    return {
      backgroundColor: rootStyle.backgroundColor,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      scrollBehavior: rootStyle.scrollBehavior,
    };
  });
  expect(presentation.backgroundColor).toBe("rgb(11, 37, 43)");
  expect(presentation.scrollBehavior).toBe("auto");
  expect(presentation.overflow).toBeLessThanOrEqual(1);

  await page.goto("/program");
  const controls = page.locator(".equipment-control button");
  for (let index = 0; index < (await controls.count()); index += 1) {
    const box = await controls.nth(index).evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return { height: bounds.height, width: bounds.width };
    });
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThanOrEqual(44);
  }
});
