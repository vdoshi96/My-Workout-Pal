import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const projectRoot = fileURLToPath(new URL("../..", import.meta.url));

describe("Firebase Admin serverless compatibility", () => {
  it("loads jwks-rsa when native require(esm) interop is unavailable", () => {
    const result = spawnSync(
      process.execPath,
      [
        "--no-experimental-require-module",
        "-e",
        "const { createRequire } = require('node:module'); createRequire(require.resolve('firebase-admin/app'))('jwks-rsa'); process.stdout.write('loaded')",
      ],
      {
        cwd: projectRoot,
        encoding: "utf8",
        env: {
          NODE_ENV: "test",
          PATH: process.env["PATH"] ?? "",
        },
      },
    );

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toBe("loaded");
  });

  it("pins only the incompatible jwks-rsa to jose dependency edge", () => {
    const workspaceSettings = readFileSync(
      new URL("../../pnpm-workspace.yaml", import.meta.url),
      "utf8",
    );

    expect(workspaceSettings.match(/jwks-rsa>jose/g)).toHaveLength(1);
    expect(workspaceSettings).toContain(
      'overrides:\n  "jwks-rsa>jose": "4.15.9"',
    );
  });
});
