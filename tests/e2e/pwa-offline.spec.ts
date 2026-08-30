import { expect, test } from "@playwright/test";

test("restores an opened public route offline without caching sign-in", async ({
  browserName,
  context,
  page,
}) => {
  test.skip(browserName !== "chromium", "Playwright service-worker control is Chromium-only.");
  await page.goto("/program/push");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload({ waitUntil: "networkidle" });

  expect(await page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

  // Open each pilot route once while online so its hashed Next.js client
  // boundary joins the public cache alongside the install-time HTML/assets.
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", { level: 1, name: "Your workout. Your way." }),
  ).toBeVisible();
  await page.goto("/progress", { waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", { level: 1, name: "Progress" }),
  ).toBeVisible();
  await page.goto("/program/push", { waitUntil: "networkidle" });

  expect(
    await page.evaluate(async () => {
      const cacheNames = await caches.keys();
      const publicCache = await caches.open(
        cacheNames.find((name) => name.startsWith("my-workout-pal-public-")) ?? "missing",
      );
      return {
        landingCompanion: Boolean(
          await publicCache.match(
            "/illustrations/companions/planning-hedgehog.webp",
          ),
        ),
        memberCompanion: Boolean(
          await publicCache.match(
            "/illustrations/companions/preparing-fox.webp",
          ),
        ),
        progressCompanion: Boolean(
          await publicCache.match(
            "/illustrations/companions/reviewing-raccoon.webp",
          ),
        ),
        publicRoute: Boolean(await publicCache.match("/program/push")),
        signIn: Boolean(await publicCache.match("/sign-in")),
      };
    }),
  ).toEqual({
    landingCompanion: true,
    memberCompanion: false,
    progressCompanion: true,
    publicRoute: true,
    signIn: false,
  });

  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1, name: "Push" })).toBeVisible();
    await expect(page.locator(".offline-indicator")).toContainText("Offline");

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { level: 1, name: "Your workout. Your way." }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page
          .locator('[data-companion-placement="landing"] img')
          .evaluate((image) => (image as HTMLImageElement).naturalWidth),
      )
      .toBeGreaterThan(0);

    await page.goto("/progress", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { level: 1, name: "Progress" }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page
          .locator('[data-companion-placement="progress-preview"] img')
          .evaluate((image) => (image as HTMLImageElement).naturalWidth),
      )
      .toBeGreaterThan(0);
  } finally {
    await context.setOffline(false);
  }
});
