import type { ViewerContext } from "@/server/auth/viewer";

export const HARNESS_VIEWER_HEADER = "x-mwp-harness-viewer";
export const HARNESS_SCENARIO_HEADER = "x-mwp-harness-scenario";
export const HARNESS_SCOPE_HEADER = "x-mwp-harness-scope";

export type HarnessScenario =
  | "accept-next-program-publish-then-error"
  | "accept-next-runner-then-error"
  | "expire-session"
  | "fail-next-save"
  | "invalid"
  | "ready"
  | "revoke-session"
  | "slow-onboard";

export type HarnessRequestContext = Readonly<{
  scenario: HarnessScenario;
  scope: string;
  viewer: ViewerContext | null;
}>;

const scenarioValues = new Set<HarnessScenario>([
  "accept-next-program-publish-then-error",
  "accept-next-runner-then-error",
  "expire-session",
  "fail-next-save",
  "ready",
  "revoke-session",
  "slow-onboard",
]);

function viewer(
  identity: "alice" | "bob",
  eligibleForPermanentMutations: boolean,
): ViewerContext {
  const label = identity === "alice" ? "Alice" : "Bob";
  return {
    uid: `qa-auth-harness-${identity}`,
    displayName: `${label} QA`,
    email: `${identity}@example.invalid`,
    emailVerified: eligibleForPermanentMutations,
    provider: "password",
    authTimeSeconds: 1_787_681_000,
    eligibleForPermanentMutations,
  };
}

function viewerFromHeader(value: string | null): ViewerContext | null {
  if (value === "alice") return viewer("alice", true);
  if (value === "alice-unverified") return viewer("alice", false);
  if (value === "bob") return viewer("bob", true);
  return null;
}

function scenarioFromHeader(value: string | null): HarnessScenario {
  if (value === null) return "ready";
  return scenarioValues.has(value as HarnessScenario) ? (value as HarnessScenario) : "invalid";
}

export function harnessRequestContext(headers: Headers): HarnessRequestContext {
  const requestedScope = headers.get(HARNESS_SCOPE_HEADER);
  const scenario = scenarioFromHeader(headers.get(HARNESS_SCENARIO_HEADER));
  return {
    scenario,
    scope:
      requestedScope && /^[a-z0-9-]{1,40}$/.test(requestedScope)
        ? requestedScope
        : "default",
    viewer:
      scenario === "invalid" || scenario === "expire-session" || scenario === "revoke-session"
        ? null
        : viewerFromHeader(headers.get(HARNESS_VIEWER_HEADER)),
  };
}
