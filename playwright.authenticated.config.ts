import { defineConfig, devices } from "@playwright/test";

const portValue = process.env["MWP_AUTH_HARNESS_PORT"];
const port = Number(portValue);
if (!portValue || !Number.isInteger(port) || port < 1024 || port > 65_535) {
  throw new Error("MWP_AUTH_HARNESS_PORT must be a reserved unprivileged loopback port.");
}
const baseURL = `http://127.0.0.1:${port}`;
const journeyAndGeometry =
  /(?:onboarding|customization-geometry|firebase-auth-hydration|flexible-routine-publication|library-guidance|runner-resilience)\.spec\.ts/u;
const geometryOnly = /customization-geometry\.spec\.ts/u;

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
      testMatch: journeyAndGeometry,
      use: {
        browserName: "chromium",
        hasTouch: false,
        isMobile: false,
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "webkit-phone",
      testMatch: journeyAndGeometry,
      use: {
        ...devices["iPhone 14"],
        browserName: "webkit",
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: "chromium-phone",
      testMatch: geometryOnly,
      use: {
        ...devices["Pixel 7"],
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: "chromium-tablet",
      testMatch: geometryOnly,
      use: {
        ...devices["Galaxy Tab S4"],
        browserName: "chromium",
        viewport: { width: 820, height: 1180 },
      },
    },
    {
      name: "webkit-tablet",
      testMatch: geometryOnly,
      use: {
        ...devices["iPad Pro 11"],
        browserName: "webkit",
        viewport: { width: 820, height: 1180 },
      },
    },
    {
      name: "webkit-desktop",
      testMatch: geometryOnly,
      use: {
        browserName: "webkit",
        hasTouch: false,
        isMobile: false,
        viewport: { width: 1440, height: 1000 },
      },
    },
  ],
  webServer: {
    command: `${JSON.stringify(process.execPath)} node_modules/next/dist/bin/next start tests/fixtures/authenticated-app -H 127.0.0.1 -p ${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
    url: `${baseURL}/app`,
  },
});
