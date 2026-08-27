import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));

describe("hosted authentication QA command", () => {
  it("fails before browser or provider work without explicit account approval", () => {
    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", "scripts/test-e2e-hosted-auth.ts"],
      {
        cwd: repositoryRoot,
        encoding: "utf8",
        env: {
          NODE_ENV: "test",
          PATH: process.env["PATH"] ?? "",
        },
      },
    );

    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe(
      "Hosted authentication QA stopped safely (approval_required).\n",
    );
  });

  it("keeps arbitrary provider detail out of the command boundary", () => {
    const source = readFileSync(
      new URL("../../scripts/test-e2e-hosted-auth.ts", import.meta.url),
      "utf8",
    );

    expect(source).not.toMatch(/error\.message|JSON\.stringify\(error|console\.error\(error/u);
    expect(source).toContain("Hosted authentication QA failed safely");
    expect(source).toContain("error.stage");
    expect(source).toContain("at the ${stage} stage");
  });
});
