import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));

describe("hosted deletion and ownership QA command", () => {
  it("stops before browser, Firebase, or Neon work without destructive approval", () => {
    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", "scripts/test-e2e-hosted-deletion-idor.ts"],
      {
        cwd: repositoryRoot,
        encoding: "utf8",
        env: { NODE_ENV: "test", PATH: process.env["PATH"] ?? "" },
      },
    );

    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe(
      "Hosted deletion QA stopped safely (approval_required).\n",
    );
  });

  it("keeps arbitrary identity, provider, database, and browser detail out of output", () => {
    const source = readFileSync(
      new URL("../../scripts/test-e2e-hosted-deletion-idor.ts", import.meta.url),
      "utf8",
    );

    expect(source).not.toMatch(
      /error\.message|JSON\.stringify\(error|console\.error\(error|identity\.email|identity\.password|createdUid/u,
    );
    expect(source).toContain("Hosted deletion QA failed safely");
    expect(source).toContain("cleanup was confirmed");
  });
});
