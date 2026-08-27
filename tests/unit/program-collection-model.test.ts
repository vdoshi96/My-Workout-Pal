import { describe, expect, it } from "vitest";

import {
  parseProgramCollectionResponse,
  programCollectionSuccess,
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
      affectedRevisionId,
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
      replayed: false,
    },
  };
}

const createExpectation = {
  equipmentProfileKind: "barbell" as const,
  kind: "create" as const,
  name: "Barbell build",
  priorProgramIds: [activeProgramId],
};

describe("program collection client model", () => {
  it("accepts one coherent active program and preserves the server order", () => {
    expect(parseProgramCollectionResponse(responseFixture(), createExpectation)).toEqual({
      activeProgramId: affectedProgramId,
      activeProgramName: "Barbell build",
      affectedProgramId,
      affectedProgramName: "Barbell build",
      affectedRevisionId,
      programs: responseFixture().profileProgram.programs,
      replayed: false,
    });
  });

  it("keeps collection context and truthful copy when replay no longer affects the active root", () => {
    const response = responseFixture();
    response.profileProgram.activeProgram = {
      id: activeProgramId,
      revisionId: activeRevisionId,
    };
    response.profileProgram.affectedProgramId = affectedProgramId;
    response.profileProgram.affectedRevisionId = affectedRevisionId;
    response.profileProgram.replayed = true;
    response.profileProgram.programs[0]!.isActive = false;
    response.profileProgram.programs[1]!.isActive = true;

    const parsed = parseProgramCollectionResponse(response, createExpectation);
    expect(programCollectionSuccess(parsed)).toEqual({
      message: "Barbell build is already stored, but Apartment strength remains active. Review your collection before opening an overview.",
      openActiveOverview: false,
    });
  });

  it("opens only when the affected program is the current active program", () => {
    expect(programCollectionSuccess(parseProgramCollectionResponse(responseFixture(), createExpectation))).toEqual({
      message: "Barbell build is active. Opening its overview…",
      openActiveOverview: true,
    });
  });

  it("rejects malformed or contradictory success bodies", () => {
    const twoActive = responseFixture();
    twoActive.profileProgram.programs[1]!.isActive = true;
    expect(() => parseProgramCollectionResponse(twoActive, createExpectation)).toThrow(
      "exactly one active program",
    );

    const wrongActive = responseFixture();
    wrongActive.profileProgram.activeProgram.id = activeProgramId;
    expect(() => parseProgramCollectionResponse(wrongActive, createExpectation)).toThrow(
      "active program does not match",
    );

    expect(() =>
      parseProgramCollectionResponse({ profileProgram: {} }, createExpectation),
    ).toThrow("invalid program collection response");
  });

  it("rejects an internally coherent response for a different requested operation", () => {
    expect(() => parseProgramCollectionResponse(responseFixture(), {
      equipmentProfileKind: "dumbbells",
      kind: "create",
      name: "Different route",
      priorProgramIds: [activeProgramId],
    })).toThrow("does not match the requested program operation");
    expect(() => parseProgramCollectionResponse(responseFixture(), {
      kind: "activate",
      programId: activeProgramId,
      revisionId: activeRevisionId,
    })).toThrow("does not match the requested program operation");
    expect(() => parseProgramCollectionResponse(responseFixture(), {
      kind: "clone",
      name: "Barbell build",
      priorProgramIds: [activeProgramId],
      sourceEquipmentProfileKind: "barbell",
      sourceProgramId: affectedProgramId,
    })).toThrow("does not match the requested program operation");
  });

  it("rejects a pre-existing root for create or clone while permitting an explicitly remembered replay", () => {
    expect(() => parseProgramCollectionResponse(responseFixture(), {
      ...createExpectation,
      priorProgramIds: [activeProgramId, affectedProgramId],
    })).toThrow("does not match the requested program operation");

    expect(() => parseProgramCollectionResponse(responseFixture(), {
      kind: "clone",
      name: "Barbell build",
      priorProgramIds: [activeProgramId, affectedProgramId],
      sourceEquipmentProfileKind: "barbell",
      sourceProgramId: activeProgramId,
    })).toThrow("does not match the requested program operation");

    const replay = responseFixture();
    replay.profileProgram.replayed = true;
    expect(parseProgramCollectionResponse(replay, {
      ...createExpectation,
      knownAffectedProgramId: affectedProgramId,
      priorProgramIds: [activeProgramId, affectedProgramId],
    }).affectedProgramId).toBe(affectedProgramId);
  });

  it("normalizes bounded names without inventing an empty value", () => {
    expect(validatedProgramName("  Trail strength  ")).toBe("Trail strength");
    expect(() => validatedProgramName("   ")).toThrow("Enter a program name");
    expect(validatedProgramName("x".repeat(80))).toHaveLength(80);
    expect(() => validatedProgramName("x".repeat(81))).toThrow(
      "80 characters or fewer",
    );
  });

  it("suggests a bounded clone name", () => {
    expect(suggestedCloneName("Apartment strength")).toBe(
      "Apartment strength copy",
    );
    expect(suggestedCloneName("x".repeat(80))).toHaveLength(80);
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
