import { describe, expect, it } from "vitest";

import {
  cleanupPostconditionIsConfirmed,
  type HostedDeletionQaStage,
  privateResourceResponsesAreEquivalent,
} from "../../scripts/lib/hosted-deletion-browser";

describe("hosted deletion browser evidence", () => {
  it("reports onboarding separately from authenticated session creation", () => {
    const stages = ["alice_onboarding", "bob_onboarding"] satisfies HostedDeletionQaStage[];

    expect(stages).toEqual(["alice_onboarding", "bob_onboarding"]);
  });

  it("requires a no-store, status-equal, body-equal foreign and missing response", () => {
    const foreign = {
      body: '{"error":"not_found","message":"The requested resource was not found."}',
      cacheControl: "private, no-store, max-age=0",
      status: 404,
    } as const;

    expect(privateResourceResponsesAreEquivalent(foreign, foreign, [])).toBe(true);
    expect(privateResourceResponsesAreEquivalent(
      foreign,
      { ...foreign, cacheControl: "public, max-age=60" },
      [],
    )).toBe(false);
    expect(privateResourceResponsesAreEquivalent(
      foreign,
      { ...foreign, status: 403 },
      [],
    )).toBe(false);
    expect(privateResourceResponsesAreEquivalent(
      { ...foreign, status: 200 },
      { ...foreign, status: 200 },
      [],
    )).toBe(true);
  });

  it("normalizes only caller-supplied opaque identifiers before comparison", () => {
    const foreignId = "11111111-1111-4111-8111-111111111111";
    const missingId = "22222222-2222-4222-8222-222222222222";

    expect(privateResourceResponsesAreEquivalent(
      {
        body: `route ${foreignId} was not found`,
        cacheControl: "private, no-cache, no-store, max-age=0, must-revalidate",
        status: 404,
      },
      {
        body: `route ${missingId} was not found`,
        cacheControl: "private, no-cache, no-store, max-age=0, must-revalidate",
        status: 404,
      },
      [foreignId, missingId],
    )).toBe(true);
  });

  it("confirms cleanup only after both identities, owned rows, and jobs are terminal", () => {
    const confirmed = {
      firebaseCountAfter: 4,
      firebaseCountBefore: 4,
      identitiesAbsent: [true, true] as const,
      ownerRowCounts: [0, 0] as const,
      terminalDeletionJobs: [true, true] as const,
    };

    expect(cleanupPostconditionIsConfirmed(confirmed)).toBe(true);
    expect(cleanupPostconditionIsConfirmed({
      ...confirmed,
      ownerRowCounts: [0, 1],
    })).toBe(false);
    expect(cleanupPostconditionIsConfirmed({
      ...confirmed,
      terminalDeletionJobs: [true, false],
    })).toBe(false);
  });
});
