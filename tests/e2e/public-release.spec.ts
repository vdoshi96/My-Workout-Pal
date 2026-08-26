import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

function capturePageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  return errors;
}

test("guest previews both profiles and completes the public discovery route", async ({
  page,
}) => {
  const errors = capturePageErrors(page);
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 1, name: "My Workout Pal" }),
  ).toBeVisible();
  await expect(page.getByText("Guest route · not saved")).toBeVisible();
  for (const [index, name] of ["Push", "Pull", "Legs", "Upper", "Lower"].entries()) {
    await expect(
      page.getByRole("button", { name: `Day ${index + 1}: ${name}` }),
    ).toBeVisible();
  }

  const barbellPreview = page.getByRole("button", {
    name: "Barbell + rack",
  });
  await barbellPreview.click();
  await expect(barbellPreview).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Day 2: Pull" }).click();
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
  await expect(page.getByText("Guest preview · not saved")).toBeVisible();
  await page.waitForLoadState("networkidle");

  await page.goto("/library?equipment=barbell");
  await page.getByLabel("Search movements").fill("bent over row");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(
    page.getByRole("link", { name: /Barbell bent-over row/ }),
  ).toBeVisible();
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
  await page.waitForLoadState("networkidle");

  await page.goto("/sample-workout?day=lower&equipment=barbell");
  await expect(
    page.getByRole("heading", { level: 1, name: "Lower workout" }),
  ).toBeVisible();
  await expect(page.getByText("Not your workout · never saved")).toBeVisible();
  await expect(page.getByText("Read only")).toBeVisible();
  await page.waitForLoadState("networkidle");

  await page.goto("/sample-progress");
  await expect(
    page.getByRole("heading", { level: 1, name: "Sample progress" }),
  ).toBeVisible();
  await expect(page.getByText("Not your history · never saved")).toBeVisible();
  await expect(page.getByLabel("Sample analytics")).toBeVisible();
  await page.waitForLoadState("networkidle");

  await page.goto("/sign-in");
  await expect(page.locator("#auth-heading")).toHaveText(
    /^(Sign-in connection pending|Sign in)$/,
  );
  await expect(page.getByRole("link", { name: "Continue as guest" })).toBeVisible();
  expect(errors).toEqual([]);
});

const accessibilityRoutes = [
  { name: "landing", path: "/" },
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
  { name: "sample analytics", path: "/sample-progress" },
  { name: "sign in", path: "/sign-in" },
] as const;

for (const route of accessibilityRoutes) {
  test(`${route.name} has no serious public accessibility violation`, async ({
    page,
  }) => {
    const errors = capturePageErrors(page);
    await page.goto(route.path);
    const results = await new AxeBuilder({ page }).analyze();
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

  await page.keyboard.press(browserName === "webkit" ? "Alt+Tab" : "Tab");
  const skipLink = page.getByRole("link", { name: "Skip to selected day" });
  await expect(skipLink).toBeFocused();
  await skipLink.press("Enter");
  await expect(page).toHaveURL(/#selected-day-sheet$/);
  await expect(
    page.getByRole("heading", { level: 2, name: "Push day" }),
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
