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
  expect(
    await page.evaluate(async () => {
      const cacheNames = await caches.keys();
      const publicCache = await caches.open(
        cacheNames.find((name) => name.startsWith("my-workout-pal-public-")) ?? "missing",
      );
      return {
        publicRoute: Boolean(await publicCache.match("/program/push")),
        signIn: Boolean(await publicCache.match("/sign-in")),
      };
    }),
  ).toEqual({ publicRoute: true, signIn: false });

    await context.setOffline(true);
  try {
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1, name: "Push" })).toBeVisible();
    await expect(page.locator(".offline-indicator")).toContainText("Offline");
  } finally {
    await context.setOffline(false);
  }
});
