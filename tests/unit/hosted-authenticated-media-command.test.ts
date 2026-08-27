import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));

describe("hosted authenticated media QA command", () => {
  it("fails before provider or browser work without explicit approval", () => {
    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", "scripts/test-e2e-hosted-authenticated-media.ts"],
      {
        cwd: repositoryRoot,
        encoding: "utf8",
        env: { NODE_ENV: "test", PATH: process.env["PATH"] ?? "" },
      },
    );

    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe(
      "Hosted authenticated media QA stopped safely (approval_required).\n",
    );
  });

  it("exposes a discoverable package command and keeps provider detail out of output", () => {
    const packageJson = JSON.parse(
      readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
    ) as { scripts?: Record<string, string> };
    expect(packageJson.scripts?.["test:e2e:hosted-authenticated-media"]).toBe(
      "node --env-file-if-exists=.env.local --import tsx scripts/test-e2e-hosted-authenticated-media.ts",
    );

    const source = readFileSync(
      new URL("../../scripts/test-e2e-hosted-authenticated-media.ts", import.meta.url),
      "utf8",
    );
    expect(source).not.toMatch(
      /error\.message|JSON\.stringify\(error|console\.error\(error|identity\.email|identity\.password|createdUid/u,
    );
    expect(source).toContain("Hosted authenticated media QA failed safely");
    expect(source).toContain("cleanup was confirmed");

    const browserSource = readFileSync(
      new URL("../../scripts/lib/hosted-authenticated-media-browser.ts", import.meta.url),
      "utf8",
    );
    expect(browserSource).toContain('chromium.launch({ channel: "chrome", headless: false })');
    expect(browserSource).toContain("browserZoomEvidenceIsExact");
    expect(browserSource).toContain("mediaEvidenceIsComplete");
    expect(browserSource).toContain("exactIdentityCleanup");
    expect(browserSource).toContain("cleanupPostconditionIsConfirmed");
    expect(browserSource).toContain("youtube-nocookie.com/embed/${firstVideoId}");
    expect(browserSource).toContain('{ name: "Push", exact: true }');
    expect(browserSource).toContain('setStage("media_demo_one")');
    expect(browserSource).toContain('setStage("media_demo_two")');
    expect(browserSource).not.toMatch(/screenshot\(|trace:\s*|recordVideo/u);
  });
});
