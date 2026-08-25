import { describe, expect, it } from "vitest";

import { authenticatedDestinationIsCurrent } from "@/components/layout/authenticated-nav";

describe("authenticated account navigation", () => {
  it("keeps the program destination scoped to account program routes", () => {
    expect(authenticatedDestinationIsCurrent("/app", "/app")).toBe(true);
    expect(authenticatedDestinationIsCurrent("/app/program/push", "/app")).toBe(true);
    expect(authenticatedDestinationIsCurrent("/app/history", "/app")).toBe(false);
  });

  it("selects nested destination routes without matching sibling prefixes", () => {
    expect(authenticatedDestinationIsCurrent("/app/history/session-a", "/app/history")).toBe(true);
    expect(authenticatedDestinationIsCurrent("/app/history-extra", "/app/history")).toBe(false);
    expect(authenticatedDestinationIsCurrent("/app/settings", "/app/settings")).toBe(true);
    expect(authenticatedDestinationIsCurrent("/app/library/custom/new", "/app/library")).toBe(true);
  });
});
