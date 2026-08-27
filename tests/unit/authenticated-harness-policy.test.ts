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
  consumeHarnessSessionAuthFailure,
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
          [HARNESS_SCENARIO_HEADER]: "accept-next-program-publish-then-error",
          [HARNESS_SCOPE_HEADER]: "program-publish-recovery",
          [HARNESS_VIEWER_HEADER]: "alice",
        }),
      ),
    ).toMatchObject({
      scenario: "accept-next-program-publish-then-error",
      scope: "program-publish-recovery",
      viewer: { uid: "qa-auth-harness-alice" },
    });
    const expired = harnessRequestContext(
      new Headers({
        [HARNESS_SCENARIO_HEADER]: "expire-session",
        [HARNESS_SCOPE_HEADER]: "post-load-expired",
        [HARNESS_VIEWER_HEADER]: "alice",
      }),
    );
    expect(expired.viewer).toMatchObject({ uid: "qa-auth-harness-alice" });
    expect(consumeHarnessSessionAuthFailure(expired)).toMatchObject({
      code: "session_expired",
      message: "Your session expired. Sign in again.",
      status: 401,
    });
    expect(consumeHarnessSessionAuthFailure(expired)).toBeUndefined();

    const revoked = harnessRequestContext(
      new Headers({
        [HARNESS_SCENARIO_HEADER]: "revoke-session",
        [HARNESS_SCOPE_HEADER]: "post-load-revoked",
        [HARNESS_VIEWER_HEADER]: "alice",
      }),
    );
    expect(revoked.viewer).toMatchObject({ uid: "qa-auth-harness-alice" });
    expect(consumeHarnessSessionAuthFailure(revoked)).toMatchObject({
      code: "session_revoked",
      message: "Your session is no longer active.",
      status: 401,
    });
    expect(consumeHarnessSessionAuthFailure(revoked)).toBeUndefined();
    resetHarnessFaults("post-load-expired");
    resetHarnessFaults("post-load-revoked");
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
    expect(runner).toContain('const requestedPlaywrightArguments = process.argv.slice(2)');
    expect(runner).toContain('requestedPlaywrightArguments[0] === "--"');
    expect(runner).toContain('...requestedPlaywrightArguments');
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

  it("keeps both browser engines accountable at phone, tablet, and desktop widths", () => {
    const playwrightConfig = readFileSync(
      resolve(repositoryRoot, "playwright.authenticated.config.ts"),
      "utf8",
    );
    const geometrySpec = resolve(
      repositoryRoot,
      "tests/authenticated-e2e/customization-geometry.spec.ts",
    );

    for (const project of [
      "chromium-phone",
      "chromium-tablet",
      "chromium-desktop",
      "webkit-phone",
      "webkit-tablet",
      "webkit-desktop",
    ]) {
      expect(playwrightConfig).toContain(`name: "${project}"`);
    }
    for (const device of ["Pixel 7", "Galaxy Tab S4", "iPhone 14", "iPad Pro 11"]) {
      expect(playwrightConfig).toContain(`devices["${device}"]`);
    }
    expect(existsSync(geometrySpec)).toBe(true);
    if (!existsSync(geometrySpec)) return;

    const geometry = readFileSync(geometrySpec, "utf8");
    expect(geometry).toContain("emulateMedia");
    expect(geometry).toContain('colorScheme: "dark"');
    expect(geometry).toContain('reducedMotion: "reduce"');
    expect(geometry).toContain('forcedColors: "active"');
    expect(geometry).toContain("testInfo.project.use.hasTouch");
    expect(geometry).toContain("testInfo.project.use.isMobile");
    expect(geometry).toContain("navigator.maxTouchPoints");
    expect(geometry).toContain('/app/library/custom/new');
    expect(geometry).toContain("scrollWidth");
    expect(geometry).not.toContain("deviceScaleFactor");
    expect(geometry).not.toContain("style.zoom");
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
    expect(browserSpec).toContain('page.on("requestfailed"');
    expect(browserSpec).toContain("request.failure()?.errorText");
    expect(browserSpec).toContain("isSupersededNextFlightRequest");
    expect(browserSpec).toContain('url.searchParams.has("_rsc")');
    expect(browserSpec).toContain('request.headers()["rsc"] === "1"');

    const geometrySpec = readFileSync(
      resolve(repositoryRoot, "tests/authenticated-e2e/customization-geometry.spec.ts"),
      "utf8",
    );
    expect(geometrySpec).toContain('page.on("requestfailed"');
    expect(geometrySpec).toContain("request.failure()?.errorText");
    expect(geometrySpec).toContain("isSupersededNextFlightRequest");

    const memberProgramHome = readFileSync(
      resolve(repositoryRoot, "src/components/program/member-program-home.tsx"),
      "utf8",
    );
    expect(memberProgramHome).toContain(
      '<Link href={`/app/program/${day.dayKey}`} prefetch={false}>',
    );

    const authenticatedNav = readFileSync(
      resolve(repositoryRoot, "src/components/layout/authenticated-nav.tsx"),
      "utf8",
    );
    expect(authenticatedNav.match(/prefetch=\{false\}/gu)).toHaveLength(1);

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

    const productionLibrary = readFileSync(
      resolve(repositoryRoot, "src/app/app/library/page.tsx"),
      "utf8",
    );
    const fixtureLibrary = readFileSync(
      resolve(repositoryRoot, "tests/fixtures/authenticated-app/app/app/library/page.tsx"),
      "utf8",
    );
    expect(productionLibrary.match(/prefetch=\{false\}/gu)).toHaveLength(1);
    expect(fixtureLibrary.match(/prefetch=\{false\}/gu)).toHaveLength(1);
  });
});
