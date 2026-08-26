import { describe, expect, it } from "vitest";

import {
  parseProgramCollectionResponse,
  retryableOperationKey,
  suggestedCloneName,
  validatedProgramName,
} from "@/components/program/program-collection-model";

const activeProgramId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const activeRevisionId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const affectedProgramId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const affectedRevisionId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

function responseFixture() {
  return {
    profileProgram: {
      activeProgram: {
        id: affectedProgramId,
        revisionId: affectedRevisionId,
      },
      affectedProgramId,
      equipment: { profileKind: "barbell" },
      preferences: {},
      profile: {},
      programs: [
        {
          equipmentProfileKind: "barbell",
          id: affectedProgramId,
          isActive: true,
          name: "Barbell build",
          programKey: "barbell-build",
          revisionId: affectedRevisionId,
          revisionNumber: 1,
          updatedAt: "2026-08-25T15:00:00.000Z",
        },
        {
          equipmentProfileKind: "dumbbells",
          id: activeProgramId,
          isActive: false,
          name: "Apartment strength",
          programKey: "apartment-strength",
          revisionId: activeRevisionId,
          revisionNumber: 3,
          updatedAt: "2026-08-24T15:00:00.000Z",
        },
      ],
    },
  };
}

describe("program collection client model", () => {
  it("accepts one coherent active program and preserves the server order", () => {
    expect(parseProgramCollectionResponse(responseFixture())).toEqual({
      activeProgramId: affectedProgramId,
      affectedProgramId,
      programs: responseFixture().profileProgram.programs,
    });
  });

  it("rejects malformed or contradictory success bodies", () => {
    const twoActive = responseFixture();
    twoActive.profileProgram.programs[1]!.isActive = true;
    expect(() => parseProgramCollectionResponse(twoActive)).toThrow(
      "exactly one active program",
    );

    const wrongActive = responseFixture();
    wrongActive.profileProgram.activeProgram.id = activeProgramId;
    expect(() => parseProgramCollectionResponse(wrongActive)).toThrow(
      "active program does not match",
    );

    expect(() =>
      parseProgramCollectionResponse({ profileProgram: {} }),
    ).toThrow("invalid program collection response");
  });

  it("normalizes bounded names without inventing an empty value", () => {
    expect(validatedProgramName("  Trail strength  ")).toBe("Trail strength");
    expect(() => validatedProgramName("   ")).toThrow("Enter a program name");
    expect(() => validatedProgramName("x".repeat(181))).toThrow(
      "180 characters or fewer",
    );
  });

  it("suggests a bounded clone name", () => {
    expect(suggestedCloneName("Apartment strength")).toBe(
      "Apartment strength copy",
    );
    expect(suggestedCloneName("x".repeat(180))).toHaveLength(180);
  });

  it("reuses one key after an interrupted attempt until success clears it", () => {
    let generated = 0;
    const first = retryableOperationKey(undefined, () => {
      generated += 1;
      return "request-key";
    });
    const retry = retryableOperationKey(first, () => {
      generated += 1;
      return "different-key";
    });

    expect(first).toBe("request-key");
    expect(retry).toBe(first);
    expect(generated).toBe(1);
  });
});
