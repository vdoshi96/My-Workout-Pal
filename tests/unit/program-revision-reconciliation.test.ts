import { describe, expect, it } from "vitest";

import { reconcileProgramRevisionMutation } from "@/components/program/program-revision-reconciliation";
import {
  parseEquipmentChangeResponse,
  parseProgramRevisionMutationResponse,
} from "@/components/program/program-mutation-response";
import type {
  ActiveProgramReadModel,
  ProgramRevisionMutationResult,
} from "@/server/repositories/profile-program";

const base = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Apartment route",
  revisionId: "22222222-2222-4222-8222-222222222222",
} as ActiveProgramReadModel;

const affectedRevisionId = "33333333-3333-4333-8333-333333333333";
const other = {
  id: "44444444-4444-4444-8444-444444444444",
  name: "Current barbell route",
  revisionId: "55555555-5555-4555-8555-555555555555",
} as ActiveProgramReadModel;

function result(activeProgram: ActiveProgramReadModel): ProgramRevisionMutationResult {
  return {
    activeProgram,
    affectedProgramId: base.id,
    affectedRevisionId,
    replayed: true,
  } as ProgramRevisionMutationResult;
}

describe("program revision mutation reconciliation", () => {
  it("adopts only the affected revision when it is still active", () => {
    const affected = { ...base, revisionId: affectedRevisionId } as ActiveProgramReadModel;
    expect(reconcileProgramRevisionMutation(base, result(affected))).toEqual({
      kind: "active",
      program: affected,
    });
  });

  it("keeps the editor target intact when replay finds another active program", () => {
    expect(reconcileProgramRevisionMutation(base, result(other))).toEqual({
      activeProgramName: "Current barbell route",
      affectedProgramName: "Apartment route",
      kind: "stored-inactive",
    });
  });

  it("rejects a response for an unrelated affected program", () => {
    expect(() => reconcileProgramRevisionMutation(base, {
      ...result(other),
      affectedProgramId: other.id,
    })).toThrow("does not match the editor program");
  });

  it("rejects malformed successful publication and equipment envelopes", () => {
    expect(() => parseProgramRevisionMutationResponse({})).toThrow(
      "invalid program mutation response",
    );
    expect(() => parseEquipmentChangeResponse({ profileProgram: {} }, {
      changes: [],
      programId: base.id,
      targetProfileKind: "barbell",
    })).toThrow(
      "invalid equipment mutation response",
    );
  });
});
