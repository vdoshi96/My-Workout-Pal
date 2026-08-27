import { classifySessionVerificationFailure } from "@/server/auth/policy";
import type { HarnessRequestContext, HarnessScenario } from "./harness-context";

const consumedFaults = new Set<string>();

function faultKey(context: HarnessRequestContext, scenario: HarnessScenario): string | undefined {
  return context.viewer ? `${context.scope}:${context.viewer.uid}:${scenario}` : undefined;
}

export function consumeHarnessFault(
  context: HarnessRequestContext,
  scenario: HarnessScenario,
): boolean {
  if (context.scenario !== scenario) return false;
  const key = faultKey(context, scenario);
  if (!key || consumedFaults.has(key)) return false;
  consumedFaults.add(key);
  return true;
}

/**
 * Consume the one post-load session fault selected by the bounded harness
 * scenario. Returning the production auth policy error lets the production
 * workout API own the error envelope and cache policy.
 */
export function consumeHarnessSessionAuthFailure(
  context: HarnessRequestContext,
) {
  if (
    context.scenario === "expire-session" &&
    consumeHarnessFault(context, "expire-session")
  ) {
    return classifySessionVerificationFailure({ code: "auth/session-cookie-expired" });
  }
  if (
    context.scenario === "revoke-session" &&
    consumeHarnessFault(context, "revoke-session")
  ) {
    return classifySessionVerificationFailure({ code: "auth/session-cookie-revoked" });
  }
  return undefined;
}

export function resetHarnessFaults(scope: string): void {
  const prefix = `${scope}:`;
  for (const key of consumedFaults) {
    if (key.startsWith(prefix)) consumedFaults.delete(key);
  }
}
