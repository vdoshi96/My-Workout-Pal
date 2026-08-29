import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, statSync, unlinkSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, resolve } from "node:path";

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

if (!statSync(contourSource).isFile() || statSync(contourSource).size === 0) {
  throw new Error("The authenticated fixture requires the maintained public/contours.svg asset.");
}

mkdirSync(dirname(contourDestination), { recursive: true });
copyFileSync(contourSource, contourDestination);

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
        "playwright.authenticated.strength.config.ts",
        ...requestedPlaywrightArguments,
      ],
      { env: environment, stdio: "inherit" },
    );

    if (result.error) throw result.error;
    if (result.status !== 0) process.exitCode = result.status ?? 1;
  }
} finally {
  unlinkSync(contourDestination);
}
