import { defineConfig, devices } from "@playwright/test";

// Screenshot capture for design review, not a test gate.
// Public: PLAYWRIGHT_BASE_URL=http://127.0.0.1:3118 pnpm exec playwright test --config playwright.capture.config.ts
// Member: node scripts/test-e2e-authenticated.mjs --capture
// Images land in docs/qa/runs/capture/ (ignored by Git); copy reviewed ones into docs/qa/latest/.
const publicBaseURL = process.env["PLAYWRIGHT_BASE_URL"];
const portValue = process.env["MWP_AUTH_HARNESS_PORT"];
const memberBaseURL = portValue ? `http://127.0.0.1:${Number(portValue)}` : undefined;
const baseURL = publicBaseURL ?? memberBaseURL;
if (!baseURL) throw new Error("Set PLAYWRIGHT_BASE_URL (public) or run through the authenticated harness (member).");

const phone = { ...devices["iPhone 14"], browserName: "chromium" as const, viewport: { width: 390, height: 844 } };
const desktop = { browserName: "chromium" as const, hasTouch: false, isMobile: false, viewport: { width: 1440, height: 1000 } };

export default defineConfig({
  testDir: "./tests/capture",
  testMatch: publicBaseURL ? /public-screens\.capture\.ts/u : /member-screens\.capture\.ts/u,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  timeout: 900_000,
  expect: { timeout: 15_000 },
  use: { baseURL, actionTimeout: 10_000, navigationTimeout: 30_000, contextOptions: { reducedMotion: "reduce" }, trace: "off", video: "off" },
  projects: [
    { name: "phone-light", use: { ...phone, colorScheme: "light" } },
    { name: "phone-dark", use: { ...phone, colorScheme: "dark" } },
    { name: "desktop-light", use: { ...desktop, colorScheme: "light" } },
    { name: "desktop-dark", use: { ...desktop, colorScheme: "dark" } },
  ],
  ...(publicBaseURL
    ? {}
    : {
        webServer: {
          command: `${JSON.stringify(process.execPath)} node_modules/next/dist/bin/next start tests/fixtures/authenticated-app -H 127.0.0.1 -p ${Number(portValue)}`,
          reuseExistingServer: false,
          timeout: 120_000,
          url: `${memberBaseURL}/app`,
        },
      }),
});
