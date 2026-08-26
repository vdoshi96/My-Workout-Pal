import { defineConfig, devices } from "@playwright/test";

const externalBaseURL = process.env["PLAYWRIGHT_BASE_URL"];
const releaseMode = process.env["PLAYWRIGHT_RELEASE"] === "1";
const releasePort = 3108;
const baseURL =
  externalBaseURL ??
  (releaseMode ? `http://127.0.0.1:${releasePort}` : "http://127.0.0.1:3000");

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env["CI"]),
  retries: process.env["CI"] ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium-phone",
      use: { ...devices["iPhone 14"], browserName: "chromium" },
    },
    {
      name: "webkit-phone",
      use: { ...devices["iPhone 14"] },
    },
    {
      name: "chromium-tablet",
      use: { browserName: "chromium", viewport: { width: 820, height: 1180 } },
    },
    {
      name: "chromium-desktop",
      use: { browserName: "chromium", viewport: { width: 1440, height: 1000 } },
    },
  ],
  ...(externalBaseURL
    ? {}
    : { webServer: {
        command: releaseMode ? `pnpm start -p ${releasePort}` : "pnpm dev",
        timeout: releaseMode ? 120_000 : 60_000,
        url: baseURL,
        reuseExistingServer: releaseMode ? false : !process.env["CI"],
      } }),
});
