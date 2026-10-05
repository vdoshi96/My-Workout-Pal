import { test } from "@playwright/test";

import { capture, step } from "./capture-kit";

const screens: ReadonlyArray<readonly [string, string]> = [
  ["landing", "/"],
  ["try", "/try"],
  ["program", "/program"],
  ["program-push", "/program/push"],
  ["library", "/library"],
  ["library-push-up", "/library/push-up"],
  ["progress", "/progress"],
  ["sample-workout", "/sample-workout"],
  ["sign-in", "/sign-in"],
  ["offline", "/offline"],
  ["not-found", "/this-page-does-not-exist"],
];

test("public screens", async ({ page, context }, info) => {
  await context.route(/youtube-nocookie\.com|youtube\.com|ytimg\.com/, (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>Demo omitted in local capture</title><body style='margin:0;background:#222;color:#ddd;font:16px sans-serif;display:grid;place-items:center;height:100vh'>Demo video</body>" }),
  );
  for (const [name, path] of screens) {
    await step(name, async () => {
      await page.goto(path);
      await capture(page, info, name);
    });
  }
  await step("test-drive", async () => {
    await page.goto("/try");
    await page.getByRole("button", { name: "Let's go" }).click();
    await page.getByLabel(/^Weight/u).fill("25");
    await page.getByLabel("Repetitions").fill("10");
    await capture(page, info, "try-log");
    await page.getByRole("button", { name: /Log set/u }).click();
    await capture(page, info, "try-rest", { fullPage: false });
    await page.getByRole("button", { name: /Skip rest|Next move/u }).click();
    await page.getByLabel("Seconds").fill("30");
    await page.getByRole("button", { name: "Finish workout" }).click();
    await capture(page, info, "try-complete");
  });

});
