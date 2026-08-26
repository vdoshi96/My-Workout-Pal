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

export function resetHarnessFaults(scope: string): void {
  const prefix = `${scope}:`;
  for (const key of consumedFaults) {
    if (key.startsWith(prefix)) consumedFaults.delete(key);
  }
}
