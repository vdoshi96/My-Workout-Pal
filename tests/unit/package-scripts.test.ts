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

  it("exposes truthful database, integration, and release verification commands", () => {
    const packageJson = JSON.parse(
      readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
    ) as { scripts?: Record<string, string> };

    expect(packageJson.scripts?.["test:integration"]).toBe("vitest run tests/integration");
    expect(packageJson.scripts?.["db:check"]).toBe(
      "drizzle-kit check && vitest run tests/unit/database-schema.test.ts tests/integration/account-deletion-schema.test.ts tests/integration/program-collection-schema.test.ts tests/integration/starter-database-bootstrap.test.ts",
    );
    expect(packageJson.scripts?.["seed:check"]).toBe(
      "node --import tsx scripts/seed-check.ts",
    );
    expect(packageJson.scripts?.["db:rebuild-personal-records"]).toBe(
      "node --env-file-if-exists=.env.local --import tsx scripts/rebuild-personal-record-projections.ts",
    );
    expect(packageJson.scripts?.["test:e2e:hosted-auth"]).toBe(
      "node --env-file-if-exists=.env.local --import tsx scripts/test-e2e-hosted-auth.ts",
    );
    expect(packageJson.scripts?.["verify"]).toBe(
      "pnpm typecheck && pnpm lint && pnpm test && pnpm db:check && pnpm seed:check && pnpm pwa:check && pnpm docs:check && pnpm build && pnpm production:check",
    );
    expect(packageJson.scripts?.["verify:release"]).toBe(
      "pnpm verify && pnpm test:e2e:release",
    );
  });
});
