import { describe, expect, it } from "vitest";

import { EQUIPMENT_PROFILES } from "@/domain/equipment";
import {
  ProgramDraftConflictError,
  ProgramDraftValidationError,
  beginProgramDraft,
  moveDraftPrescription,
  prepareProgramPublication,
  updateDraftPrescription,
  validateProgramDraft,
} from "@/domain/programs/editor";
import { createStarterProgram } from "@/domain/programs/starter";

describe("program editor domain", () => {
  it("creates a non-mutating draft with stable client keys", () => {
    const source = createStarterProgram(EQUIPMENT_PROFILES.dumbbells);
    const sourceSnapshot = structuredClone(source);

    const draft = beginProgramDraft(source);
    const moved = moveDraftPrescription(
      draft,
      draft.days[0]!.clientKey,
      draft.days[0]!.prescriptions[2]!.clientKey,
      0,
    );

    expect(source).toEqual(sourceSnapshot);
    expect(moved.baseRevision).toBe(1);
    expect(moved.days[0]!.prescriptions.map((item) => item.exerciseSlug)).toEqual([
      "incline-dumbbell-press",
      "dumbbell-bench-press",
      "seated-dumbbell-shoulder-press",
      "overhead-dumbbell-triceps-extension",
      "dead-bug",
      "front-plank",
    ]);
    expect(moved.days[0]!.prescriptions.map((item) => item.order)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(moved.days[0]!.prescriptions[0]!.clientKey).toBe(
      draft.days[0]!.prescriptions[2]!.clientKey,
    );
  });

  it("normalizes section indexes and exercise order after a keyboard-equivalent move", () => {
    const draft = beginProgramDraft(createStarterProgram(EQUIPMENT_PROFILES.dumbbells));
    const push = draft.days[0]!;

    const moved = moveDraftPrescription(
      draft,
      push.clientKey,
      push.prescriptions[4]!.clientKey,
      1,
      "strength",
    );

    expect(moved.days[0]!.exerciseSlugs).toEqual(
      moved.days[0]!.prescriptions.map((item) => item.exerciseSlug),
    );
    expect(moved.days[0]!.sections).toEqual([
      { kind: "strength", prescriptionIndexes: [0, 1, 2, 3] },
      { kind: "accessory", prescriptionIndexes: [4] },
      { kind: "core", prescriptionIndexes: [5] },
    ]);
  });

  it("returns precise validation issues without discarding the draft", () => {
    const draft = beginProgramDraft(createStarterProgram(EQUIPMENT_PROFILES.dumbbells));
    const prescription = draft.days[0]!.prescriptions[0]!;
    const invalid = updateDraftPrescription(draft, prescription.clientKey, {
      maximumReps: 7,
      minimumReps: 8,
      restSeconds: -1,
      sets: 0,
    });
    invalid.name = " ";

    expect(validateProgramDraft(invalid)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "program_name_required", path: "name" }),
        expect.objectContaining({ code: "sets_out_of_range" }),
        expect.objectContaining({ code: "rep_range_invalid" }),
        expect.objectContaining({ code: "rest_out_of_range" }),
      ]),
    );
    expect(() => prepareProgramPublication(invalid, 1)).toThrow(ProgramDraftValidationError);
  });

  it("rejects publishing against a stale active revision", () => {
    const draft = beginProgramDraft(createStarterProgram(EQUIPMENT_PROFILES.barbell));

    expect(() => prepareProgramPublication(draft, 2)).toThrow(ProgramDraftConflictError);
  });

  it("prepares a new revision while keeping source history unchanged", () => {
    const source = createStarterProgram(EQUIPMENT_PROFILES.barbell);
    const original = structuredClone(source);
    const draft = beginProgramDraft(source);
    draft.name = "My strength route";

    const publication = prepareProgramPublication(draft, 1);

    expect(source).toEqual(original);
    expect(publication).toMatchObject({
      baseRevision: 1,
      nextRevision: 2,
      program: {
        equipmentProfile: "barbell",
        name: "My strength route",
        revision: 2,
      },
    });
    expect(publication.program.id).toBe(source.id);
  });
});
