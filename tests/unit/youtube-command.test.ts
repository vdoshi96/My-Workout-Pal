import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("YouTube curation command", () => {
  it("loads the ignored local environment file before starting curation", async () => {
    const packageJson = JSON.parse(
      await readFile(new URL("../../package.json", import.meta.url), "utf8"),
    ) as { scripts?: Record<string, string> };

    expect(packageJson.scripts?.["youtube:curate"]).toBe(
      "node --env-file-if-exists=.env.local --import tsx scripts/youtube-curate.ts",
    );
  });
});
