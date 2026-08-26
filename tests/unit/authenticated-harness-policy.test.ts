import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { CSRF_COOKIE_NAME } from "@/server/auth/cookies";
import {
  HARNESS_SCENARIO_HEADER,
  HARNESS_SCOPE_HEADER,
  HARNESS_VIEWER_HEADER,
  harnessRequestContext,
} from "../../tests/fixtures/authenticated-app/server/harness-context";
import {
  consumeHarnessFault,
  resetHarnessFaults,
} from "../../tests/fixtures/authenticated-app/server/fault-injection";
import { HARNESS_CSRF_COOKIE_NAME } from "../../tests/fixtures/authenticated-app/server/csrf";
import { adaptHarnessWorkoutMutation } from "../../tests/fixtures/authenticated-app/server/workout-request";
import { DELETE as deleteHarnessScope } from "../../tests/fixtures/authenticated-app/app/api/harness/scope/route";

const repositoryRoot = resolve(import.meta.dirname, "../..");

function maintainedSourceText(directory: string): string {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) return [maintainedSourceText(path)];
      if (!entry.name.endsWith(".ts") && !entry.name.endsWith(".tsx")) return [];
      return [readFileSync(path, "utf8")];
    })
    .join("\n");
}

describe("credential-free authenticated harness boundary", () => {
  it("derives only bounded synthetic server viewers and scenarios from fixture headers", () => {
    expect(
      harnessRequestContext(
        new Headers({
          [HARNESS_SCENARIO_HEADER]: "fail-next-save",
          [HARNESS_SCOPE_HEADER]: "chromium-desktop",
          [HARNESS_VIEWER_HEADER]: "alice",
        }),
      ),
    ).toMatchObject({
      scenario: "fail-next-save",
      scope: "chromium-desktop",
      viewer: {
        eligibleForPermanentMutations: true,
        emailVerified: true,
        provider: "password",
        uid: "qa-auth-harness-alice",
      },
    });

    expect(
      harnessRequestContext(new Headers({ [HARNESS_VIEWER_HEADER]: "alice-unverified" })),
    ).toMatchObject({
      scenario: "ready",
      viewer: {
        eligibleForPermanentMutations: false,
        emailVerified: false,
        uid: "qa-auth-harness-alice",
      },
    });

    expect(
      harnessRequestContext(new Headers({ [HARNESS_VIEWER_HEADER]: "bob" })).viewer?.uid,
    ).toBe("qa-auth-harness-bob");
    expect(
      harnessRequestContext(
        new Headers({
          [HARNESS_SCENARIO_HEADER]: "accept-next-runner-then-error",
          [HARNESS_SCOPE_HEADER]: "runner-recovery",
          [HARNESS_VIEWER_HEADER]: "alice",
        }),
      ),
    ).toMatchObject({
      scenario: "accept-next-runner-then-error",
      scope: "runner-recovery",
      viewer: { uid: "qa-auth-harness-alice" },
    });
    expect(
      harnessRequestContext(
        new Headers({
          [HARNESS_SCENARIO_HEADER]: "expire-session",
          [HARNESS_VIEWER_HEADER]: "alice",
        }),
      ),
    ).toEqual({ scenario: "expire-session", scope: "default", viewer: null });
    expect(
      harnessRequestContext(
        new Headers({
          [HARNESS_SCENARIO_HEADER]: "revoke-session",
          [HARNESS_VIEWER_HEADER]: "alice",
        }),
      ),
    ).toEqual({ scenario: "revoke-session", scope: "default", viewer: null });
    expect(
      harnessRequestContext(new Headers({ [HARNESS_VIEWER_HEADER]: "attacker-chosen-uid" })),
    ).toEqual({ scenario: "ready", scope: "default", viewer: null });
    expect(
      harnessRequestContext(new Headers({ [HARNESS_SCENARIO_HEADER]: "unknown-mode" })),
    ).toEqual({ scenario: "invalid", scope: "default", viewer: null });

    expect(
      harnessRequestContext(new Headers({ [HARNESS_SCOPE_HEADER]: "../shared" })).scope,
    ).toBe("default");
  });

  it("consumes a scoped failure exactly once and can reset only that scope", () => {
    const context = harnessRequestContext(
      new Headers({
        [HARNESS_SCENARIO_HEADER]: "fail-next-save",
        [HARNESS_SCOPE_HEADER]: "one-shot",
        [HARNESS_VIEWER_HEADER]: "alice",
      }),
    );

    expect(consumeHarnessFault(context, "fail-next-save")).toBe(true);
    expect(consumeHarnessFault(context, "fail-next-save")).toBe(false);
    resetHarnessFaults("one-shot");
    expect(consumeHarnessFault(context, "fail-next-save")).toBe(true);
    resetHarnessFaults("one-shot");
  });

  it("mounts the real day, workout, workout API, and history vertical slice only in the fixture", () => {
    const fixtureRoot = resolve(repositoryRoot, "tests/fixtures/authenticated-app/app");
    const requiredFixtureFiles = [
      "app/program/[day]/page.tsx",
      "workout/[sessionId]/page.tsx",
      "app/history/[sessionId]/page.tsx",
      "api/app/workouts/route.ts",
      "api/app/workouts/[sessionId]/route.ts",
      "api/app/workouts/[sessionId]/operations/route.ts",
    ];

    expect(
      requiredFixtureFiles.filter((relativePath) =>
        existsSync(resolve(fixtureRoot, relativePath)),
      ),
    ).toEqual(requiredFixtureFiles);
  });

  it("adapts only the harness CSRF cookie before delegating the untouched workout body", async () => {
    const body = JSON.stringify({
      dayId: "10000000-0000-4000-8000-000000000001",
      idempotencyKey: "fixture-start",
      programId: "10000000-0000-4000-8000-000000000002",
    });
    const request = new NextRequest("http://127.0.0.1:3110/api/app/workouts", {
      body,
      headers: {
        cookie: `${HARNESS_CSRF_COOKIE_NAME}=fixture-token`,
        "content-type": "application/json",
        origin: "http://127.0.0.1:3110",
        "x-csrf-token": "fixture-token",
      },
      method: "POST",
    });

    const adapted = await adaptHarnessWorkoutMutation(request);
    expect(adapted.cookies.get(HARNESS_CSRF_COOKIE_NAME)?.value).toBe("fixture-token");
    expect(adapted.cookies.get(CSRF_COOKIE_NAME)?.value).toBe("fixture-token");
    expect(await adapted.json()).toEqual(JSON.parse(body));
    expect(adapted.headers.get("x-mwp-harness-viewer")).toBeNull();
  });

  it("keeps every harness marker and fixture import outside production source", () => {
    const source = maintainedSourceText(resolve(repositoryRoot, "src"));

    expect(source).not.toContain("x-mwp-harness-");
    expect(source).not.toContain("tests/fixtures/authenticated-app");
    expect(source).not.toContain("HarnessViewer");
  });

  it("binds to loopback and allowlists only non-provider child-process environment", () => {
    const playwrightConfig = readFileSync(
      resolve(repositoryRoot, "playwright.authenticated.config.ts"),
      "utf8",
    );
    const runner = readFileSync(
      resolve(repositoryRoot, "scripts/test-e2e-authenticated.mjs"),
      "utf8",
    );

    expect(playwrightConfig).toContain("next start tests/fixtures/authenticated-app -H 127.0.0.1");
    expect(playwrightConfig).not.toContain("-H 0.0.0.0");
    expect(playwrightConfig).toContain('process.env["MWP_AUTH_HARNESS_PORT"]');
    expect(playwrightConfig).not.toContain("const port = 3110");
    expect(runner).toContain('["exec", "next", "build", "tests/fixtures/authenticated-app", "--webpack"]');
    expect(runner).toContain("const repositoryRoot = resolve(process.cwd())");
    expect(runner).toContain("MWP_AUTH_HARNESS_REPOSITORY_ROOT: repositoryRoot");
    expect(runner).toContain('"public/contours.svg"');
    expect(runner).toContain('"tests/fixtures/authenticated-app/public/contours.svg"');
    expect(runner).toContain("copyFileSync(contourSource, contourDestination)");
    expect(runner).toContain("unlinkSync(contourDestination)");
    expect(runner).not.toContain("...process.env");
    expect(runner).toContain("const inheritedEnvironmentNames");
    expect(runner).toContain('MWP_AUTH_HARNESS_PORT: String(await availableLoopbackPort())');
    expect(runner).not.toMatch(
      /DATABASE_URL|FIREBASE_|GCLOUD_PROJECT|GOOGLE_APPLICATION_CREDENTIALS|GOOGLE_CLOUD_PROJECT|NEON_|POSTGRES_|VERCEL_|YOUTUBE_API_KEY/,
    );
  });

  it("returns no-store for a rejected private teardown request", async () => {
    const previous = process.env["MWP_AUTHENTICATED_HARNESS"];
    process.env["MWP_AUTHENTICATED_HARNESS"] = "1";
    try {
      const response = await deleteHarnessScope(
        new NextRequest("http://127.0.0.1:3110/api/harness/scope", { method: "DELETE" }),
      );
      expect(response.status).toBe(401);
      expect(response.headers.get("cache-control")).toContain("no-store");
    } finally {
      if (previous === undefined) delete process.env["MWP_AUTHENTICATED_HARNESS"];
      else process.env["MWP_AUTHENTICATED_HARNESS"] = previous;
    }
  });

  it("exposes the authenticated browser command without changing the public release command", () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(repositoryRoot, "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };

    expect(packageJson.scripts?.["test:e2e:authenticated"]).toBe(
      "node scripts/test-e2e-authenticated.mjs",
    );
    expect(packageJson.scripts?.["test:e2e:release"]).toBe(
      "node scripts/test-e2e-release.mjs",
    );
    expect(packageJson.scripts?.["production:check"]).toBe(
      "node scripts/check-production-boundary.mjs",
    );
  });

  it("keeps synthetic headers first-party and stubs only the external embed document", () => {
    const browserSpec = readFileSync(
      resolve(repositoryRoot, "tests/authenticated-e2e/onboarding.spec.ts"),
      "utf8",
    );
    expect(browserSpec).toContain('.exclude(\'iframe[src*="youtube-nocookie.com"]\')');
    expect(browserSpec).toContain("context.route(/^http:\\/\\/127\\.0\\.0\\.1:\\d+\\//");
    expect(browserSpec).toContain(
      "context.route(/^https:\\/\\/www\\.youtube-nocookie\\.com\\/embed\\//",
    );
    expect(browserSpec).not.toContain("youtubei/v1");
    expect(browserSpec).not.toContain("api/stats/atr");
    expect(browserSpec).not.toContain("extraHTTPHeaders");

    const memberProgramHome = readFileSync(
      resolve(repositoryRoot, "src/components/program/member-program-home.tsx"),
      "utf8",
    );
    expect(memberProgramHome).toContain(
      '<Link href={`/app/program/${day.dayKey}`} prefetch={false}>',
    );

    const fixtureDay = readFileSync(
      resolve(
        repositoryRoot,
        "tests/fixtures/authenticated-app/app/app/program/[day]/page.tsx",
      ),
      "utf8",
    );
    expect(fixtureDay.match(/prefetch=\{false\}/gu)).toHaveLength(2);

    const productionDay = readFileSync(
      resolve(repositoryRoot, "src/app/app/program/[day]/page.tsx"),
      "utf8",
    );
    expect(productionDay.match(/prefetch=\{false\}/gu)).toHaveLength(2);
  });
});
