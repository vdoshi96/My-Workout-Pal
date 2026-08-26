import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("package runtime scripts", () => {
  it("selects webpack explicitly for the custom webpack development configuration", () => {
    const packageJson = JSON.parse(
      readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
    ) as { scripts?: Record<string, string> };

    expect(packageJson.scripts?.["dev"]).toBe("next dev --webpack");
    expect(packageJson.scripts?.["build"]).toBe("next build --webpack");
  });
});
