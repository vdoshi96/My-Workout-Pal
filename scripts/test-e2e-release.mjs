import { spawnSync } from "node:child_process";

const packageManager = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

function run(args, environment = process.env) {
  const result = spawnSync(packageManager, args, {
    env: environment,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(["build"]);
run(["exec", "playwright", "test"], {
  ...process.env,
  PLAYWRIGHT_RELEASE: "1",
});
