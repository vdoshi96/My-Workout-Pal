import { describe, expect, it } from "vitest";

import {
  SEED_ID_NAMESPACE,
  deterministicSeedUuid,
} from "@/domain/seed/identity";

describe("deterministic database seed identity", () => {
  it("returns a stable RFC 4122 version-five UUID for one bounded seed key", () => {
    const first = deterministicSeedUuid("catalog-exercise", "dumbbell-bench-press");
    const repeated = deterministicSeedUuid("catalog-exercise", "dumbbell-bench-press");

    expect(first).toBe(repeated);
    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("separates entity kinds and rejects ambiguous blank identity input", () => {
    expect(
      deterministicSeedUuid("catalog-exercise", "dumbbell-bench-press"),
    ).not.toBe(
      deterministicSeedUuid("template-revision", "dumbbell-bench-press"),
    );
    expect(() => deterministicSeedUuid("", "row")).toThrow(/kind/i);
    expect(() => deterministicSeedUuid("catalog-exercise", "   ")).toThrow(
      /key/i,
    );
  });

  it("keeps the public namespace stable and nonsecret", () => {
    expect(SEED_ID_NAMESPACE).toBe(
      "8f84603f-1057-5a6e-a0e7-7a85716bbb3a",
    );
  });
});
