import { spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { resolve } from "node:path";

import { stageAuthenticatedFixture } from "./lib/authenticated-fixture-staging.mjs";

const repositoryRoot = resolve(process.cwd());
const nextCli = resolve(repositoryRoot, "node_modules/next/dist/bin/next");
const playwrightCli = resolve(
  repositoryRoot,
  "node_modules/@playwright/test/cli.js",
);
const requestedPlaywrightArguments = process.argv.slice(2);
if (requestedPlaywrightArguments[0] === "--") requestedPlaywrightArguments.shift();
const inheritedEnvironmentNames = [
  "CI",
  "FORCE_COLOR",
  "HOME",
  "LANG",
  "LC_ALL",
  "MWP_NATIVE_ZOOM_QA",
  "NO_COLOR",
  "PATH",
  "PLAYWRIGHT_BROWSERS_PATH",
  "SHELL",
  "TERM",
  "TMPDIR",
  "USER",
];
const contourSource = resolve(repositoryRoot, "public/contours.svg");
const contourDestination = resolve(
  repositoryRoot,
  "tests/fixtures/authenticated-app/public/contours.svg",
);
const rolloutFixtureCompanionNames = [
  "cataloging-otter-512.webp",
  "cataloging-otter.webp",
  "history-archive-tortoise-512.webp",
  "history-archive-tortoise.webp",
  "routine-drafting-beaver-512.webp",
  "routine-drafting-beaver.webp",
  "settings-packing-hare-512.webp",
  "settings-packing-hare.webp",
  "workout-corner-bear-512.webp",
  "workout-corner-bear.webp",
];
const fixtureAssets = [
  ...["dawn-studio", "dawn-studio-phone", "evening-studio", "pip-ready", "pip-resting", "pip-complete", "mica-ready", "mica-resting", "mica-complete", "evening-studio-phone"].map((name) => ({source: resolve(repositoryRoot, `public/illustrations/quiet-set/${name}.webp`), destination: resolve(repositoryRoot, `tests/fixtures/authenticated-app/public/illustrations/quiet-set/${name}.webp`)})),
  {
    destination: resolve(
      repositoryRoot,
      "tests/fixtures/authenticated-app/public/illustrations/companions/preparing-fox-512.webp",
    ),
    source: resolve(
      repositoryRoot,
      "public/illustrations/companions/preparing-fox-512.webp",
    ),
  },
  {
    destination: resolve(
      repositoryRoot,
      "tests/fixtures/authenticated-app/public/illustrations/companions/preparing-fox.webp",
    ),
    source: resolve(
      repositoryRoot,
      "public/illustrations/companions/preparing-fox.webp",
    ),
  },
  ...rolloutFixtureCompanionNames.map((name) => ({
    destination: resolve(
      repositoryRoot,
      "tests/fixtures/authenticated-app/public/illustrations/companions",
      name,
    ),
    source: resolve(repositoryRoot, "public/illustrations/companions", name),
  })),
];

function availableLoopbackPort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen({ exclusive: true, host: "127.0.0.1", port: 0 }, () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("The authenticated harness could not reserve a loopback port."));
        return;
      }
      server.close((error) => {
        if (error) reject(error);
        else resolvePort(address.port);
      });
    });
  });
}

const environment = Object.fromEntries(
  inheritedEnvironmentNames.flatMap((name) => {
    const value = process.env[name];
    return value === undefined ? [] : [[name, value]];
  }),
);
Object.assign(environment, {
  MWP_AUTHENTICATED_HARNESS: "1",
  MWP_AUTH_HARNESS_PORT: String(await availableLoopbackPort()),
  MWP_AUTH_HARNESS_REPOSITORY_ROOT: repositoryRoot,
  NEXT_TELEMETRY_DISABLED: "1",
});

const releaseFixture = stageAuthenticatedFixture({
  contourDestination,
  contourSource,
  fixtureAssets,
  repositoryRoot,
});
try {
  const build = spawnSync(
    process.execPath,
    [nextCli, "build", "tests/fixtures/authenticated-app", "--webpack"],
    { env: environment, stdio: "inherit" },
  );

  if (build.error) throw build.error;
  if (build.status !== 0) process.exitCode = build.status ?? 1;

  if (!process.exitCode) {
    const result = spawnSync(
      process.execPath,
      [
        playwrightCli,
        "test",
        "--config",
        "playwright.authenticated.config.ts",
        ...requestedPlaywrightArguments,
      ],
      { env: environment, stdio: "inherit" },
    );

    if (result.error) throw result.error;
    if (result.status !== 0) process.exitCode = result.status ?? 1;
  }
} finally {
  releaseFixture();
}
