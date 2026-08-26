import { defineConfig, devices } from "@playwright/test";

const portValue = process.env["MWP_AUTH_HARNESS_PORT"];
const port = Number(portValue);
if (!portValue || !Number.isInteger(port) || port < 1024 || port > 65_535) {
  throw new Error("MWP_AUTH_HARNESS_PORT must be a reserved unprivileged loopback port.");
}
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/authenticated-e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  timeout: 120_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "chromium-desktop",
      use: { browserName: "chromium", viewport: { width: 1440, height: 1000 } },
    },
    {
      name: "webkit-phone",
      use: { ...devices["iPhone 14"] },
    },
  ],
  webServer: {
    command: `pnpm exec next start tests/fixtures/authenticated-app -H 127.0.0.1 -p ${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
    url: `${baseURL}/app`,
  },
});
