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

    const browserSource = readFileSync(
      new URL("../../scripts/lib/hosted-deletion-browser.ts", import.meta.url),
      "utf8",
    );
    expect(browserSource).not.toContain("cookie.value.length");
    expect(browserSource).toContain("await sessionResponse.allHeaders()");
    expect(browserSource).toContain('["set-cookie"]');
    expect(browserSource).not.toContain("context.cookies(origin)).find");
    expect(browserSource).toContain('name: "Start with the example or start blank"');
    expect(browserSource).toContain('name: "Start with example"');
    expect(browserSource).not.toContain('name: "Build your starter route"');
    expect(browserSource).not.toContain('name: "Create my program"');
    expect(browserSource).toContain('name: "Your workout. Your way."');
    expect(browserSource).not.toContain('name: "Your whole five-day plan. No account required."');
    expect(browserSource).toContain('img[src="/illustrations/companions/planning-hedgehog.webp"]');
    expect(browserSource).not.toContain('img[src="/illustrations/workout-pals-gym.webp"]');
  });
});
