import { expect, test } from "@playwright/test";

test("restores every opened public companion route offline without caching owned surfaces", async ({
  context,
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium-desktop",
    "One Chromium desktop lane owns deterministic service-worker cache evidence.",
  );
  await page.goto("/program/push");
  await expect
    .poll(
      async () => {
        try {
          return await page.evaluate(async () => {
            const registration = await navigator.serviceWorker.ready;
            return Boolean(registration.active);
          });
        } catch {
          return false;
        }
      },
      { timeout: 30_000 },
    )
    .toBe(true);
  await page.reload({ waitUntil: "networkidle" });

  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);

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
  await page.goto("/library", { waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", { level: 1, name: "Exercise library" }),
  ).toBeVisible();
  await page.goto("/program/push", { waitUntil: "networkidle" });

  expect(
    await page.evaluate(async () => {
      const cacheNames = await caches.keys();
      const publicCache = await caches.open(
        cacheNames.find((name) => name.startsWith("my-workout-pal-public-")) ?? "missing",
      );
      const cachedPaths = (await publicCache.keys()).map(
        ({ url }) => new URL(url).pathname,
      );
      const privateCompanionPaths = [
        "/illustrations/companions/history-archive-tortoise-512.webp",
        "/illustrations/companions/history-archive-tortoise.webp",
        "/illustrations/companions/preparing-fox-512.webp",
        "/illustrations/companions/preparing-fox.webp",
        "/illustrations/companions/routine-drafting-beaver-512.webp",
        "/illustrations/companions/routine-drafting-beaver.webp",
        "/illustrations/companions/settings-packing-hare-512.webp",
        "/illustrations/companions/settings-packing-hare.webp",
        "/illustrations/companions/workout-corner-bear-512.webp",
        "/illustrations/companions/workout-corner-bear.webp",
      ];
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
        libraryCompanion: Boolean(
          await publicCache.match(
            "/illustrations/companions/cataloging-otter.webp",
          ),
        ),
        libraryCompanionCompact: Boolean(
          await publicCache.match(
            "/illustrations/companions/cataloging-otter-512.webp",
          ),
        ),
        libraryRoute: Boolean(await publicCache.match("/library")),
        ownedCompanionPaths: cachedPaths.filter((path) =>
          privateCompanionPaths.includes(path),
        ),
        ownedRoutePaths: cachedPaths.filter(
          (path) => path === "/app" || path.startsWith("/app/") || path.startsWith("/workout/"),
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
    libraryCompanion: true,
    libraryCompanionCompact: true,
    libraryRoute: true,
    memberCompanion: false,
    ownedCompanionPaths: [],
    ownedRoutePaths: [],
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

    await page.goto("/library", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { level: 1, name: "Exercise library" }),
    ).toBeVisible();
    await expect(page.locator(".offline-indicator")).toContainText("Offline");
    await expect
      .poll(() =>
        page
          .locator('[data-companion-placement="library"] img')
          .evaluate((image) => (image as HTMLImageElement).naturalWidth),
      )
      .toBeGreaterThan(0);
  } finally {
    await context.setOffline(false);
  }
});
