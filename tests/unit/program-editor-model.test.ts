import { describe, expect, it } from "vitest";

import {
  addProgramPrescription,
  filterProgramExerciseCandidates,
  programPublishInputFromReadModel,
  removeProgramPrescription,
  replaceProgramPrescription,
  reorderProgramPrescription,
  stripLocalProgramPrescriptionIds,
  validateProgramExerciseSelections,
  type ProgramExerciseCandidate,
} from "@/components/program/program-editor-model";
import type { ActiveProgramReadModel } from "@/server/repositories/profile-program";

function programReadModel(): ActiveProgramReadModel {
  const dayKeys = ["push", "pull", "legs", "upper", "lower"] as const;
  return {
    id: "11111111-1111-4111-8111-111111111111",
    programKey: "five-day-starter-route",
    name: "My route",
    equipmentProfileKind: "dumbbells",
    revisionId: "22222222-2222-4222-8222-222222222222",
    revisionNumber: 3,
    status: "published",
    publishedAt: "2026-08-25T12:00:00.000Z",
    sourceTemplateRevisionId: null,
    days: dayKeys.map((dayKey, dayIndex) => {
      const prescriptions = [0, 1].map((prescriptionIndex) => ({
        id: `33333333-3333-4333-8333-33333333333${dayIndex * 2 + prescriptionIndex}`,
        catalogExerciseId: `44444444-4444-4444-8444-44444444444${prescriptionIndex}`,
        customExerciseId: null,
        exercise: {
          id: `44444444-4444-4444-8444-44444444444${prescriptionIndex}`,
          slug: `exercise-${prescriptionIndex}`,
          name: `Exercise ${prescriptionIndex + 1}`,
          movementFamily: "press",
          loggingKind: "weight_reps" as const,
          role: "compound" as const,
          kind: "catalog" as const,
          requiredEquipment: ["dumbbells" as const],
        },
        customExercise: null,
        displayName: null,
        label: `Exercise ${prescriptionIndex + 1}`,
        displayOrder: prescriptionIndex + 1,
        setKind: "work" as const,
        setCount: 3,
        measurementKind: "weight_reps" as const,
        minimumReps: 8,
        maximumReps: 12,
        minimumSeconds: null,
        maximumSeconds: null,
        restSeconds: 90,
        targetWeightKg: 20,
        targetDistanceM: null,
        notes: null,
        targetMetadata: {},
      }));
      return {
        id: `55555555-5555-4555-8555-55555555555${dayIndex}`,
        dayNumber: dayIndex + 1,
        dayKey,
        displayName: dayKey[0]!.toUpperCase() + dayKey.slice(1),
        sections: [
          {
            id: `66666666-6666-4666-8666-66666666666${dayIndex}`,
            kind: "strength" as const,
            displayOrder: 1,
            title: "Strength",
            prescriptions,
          },
        ],
        prescriptions,
        cardio: [
          {
            id: `77777777-7777-4777-8777-77777777777${dayIndex}`,
            mode: "walker" as const,
            durationSeconds: 1_200,
            distanceM: null,
            paceSecondsPerKm: null,
            inclinePercent: 2,
            notes: null,
          },
          {
            id: `88888888-8888-4888-8888-88888888888${dayIndex}`,
            mode: "runner" as const,
            durationSeconds: 1_800,
            distanceM: 5_000,
            paceSecondsPerKm: 360,
            inclinePercent: null,
            notes: null,
          },
        ],
      };
    }),
  };
}

function candidate(
  overrides: Partial<ProgramExerciseCandidate> = {},
): ProgramExerciseCandidate {
  return {
    id: "99999999-9999-4999-8999-999999999999",
    kind: "catalog",
    loggingKind: "weight_reps",
    name: "Route press",
    requiredEquipment: ["dumbbells"],
    role: "compound",
    searchText: "route press chest dumbbells",
    ...overrides,
  };
}

describe("program editor request model", () => {
  it("maps the owner-free active revision and preserves stable source identities", () => {
    const draft = programPublishInputFromReadModel(programReadModel(), "publish-key");

    expect(draft).toMatchObject({
      programId: "11111111-1111-4111-8111-111111111111",
      baseRevisionId: "22222222-2222-4222-8222-222222222222",
      idempotencyKey: "publish-key",
      name: "My route",
    });
    expect(draft.days).toHaveLength(5);
    expect(draft.days[0]!.sections[0]!.prescriptions[0]).toMatchObject({
      sourcePrescriptionId: "33333333-3333-4333-8333-333333333330",
      catalogExerciseId: "44444444-4444-4444-8444-444444444440",
      customExerciseId: null,
      minimumReps: 8,
      maximumReps: 12,
      minimumSeconds: null,
      maximumSeconds: null,
    });
    expect(JSON.stringify(draft)).not.toContain("firebaseUid");
    expect(JSON.stringify(draft)).not.toContain("measurementKind");
  });

  it("reorders one section immutably and rejects an out-of-range move", () => {
    const draft = programPublishInputFromReadModel(programReadModel(), "publish-key");
    const moved = reorderProgramPrescription(draft, 0, 0, 1, -1);

    expect(moved).not.toBe(draft);
    expect(moved.days[0]!.sections[0]!.prescriptions.map(({ sourcePrescriptionId }) => sourcePrescriptionId)).toEqual([
      "33333333-3333-4333-8333-333333333331",
      "33333333-3333-4333-8333-333333333330",
    ]);
    expect(draft.days[0]!.sections[0]!.prescriptions[0]!.sourcePrescriptionId).toBe(
      "33333333-3333-4333-8333-333333333330",
    );
    expect(() => reorderProgramPrescription(draft, 0, 0, 0, -1)).toThrow(/outside/i);
  });

  it("adds a strength movement with editable defaults without mutating the source draft", () => {
    const draft = programPublishInputFromReadModel(programReadModel(), "publish-key");
    const next = addProgramPrescription(draft, 0, 0, candidate());

    expect(next).not.toBe(draft);
    expect(draft.days[0]!.sections[0]!.prescriptions).toHaveLength(2);
    expect(next.days[0]!.sections[0]!.prescriptions.at(-1)).toEqual({
      catalogExerciseId: "99999999-9999-4999-8999-999999999999",
      customExerciseId: null,
      displayName: null,
      maximumReps: 12,
      maximumSeconds: null,
      minimumReps: 8,
      minimumSeconds: null,
      notes: null,
      restSeconds: 90,
      setCount: 3,
      setKind: "work",
      sourcePrescriptionId: null,
      targetDistanceM: null,
      targetWeightKg: null,
    });
  });

  it("uses section and logging meaning defaults for accessory, repetition core, and timed core", () => {
    const draft = programPublishInputFromReadModel(programReadModel(), "publish-key");
    const withSections = structuredClone(draft);
    withSections.days[0]!.sections.push(
      { kind: "accessory", prescriptions: [], title: "Accessory" },
      { kind: "core", prescriptions: [], title: "Core" },
    );
    const accessory = addProgramPrescription(withSections, 0, 1, candidate());
    const repetitionCore = addProgramPrescription(
      accessory,
      0,
      2,
      candidate({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", loggingKind: "bodyweight_reps" }),
    );
    const timedCore = addProgramPrescription(
      repetitionCore,
      0,
      2,
      candidate({ id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", loggingKind: "duration" }),
    );

    expect(accessory.days[0]!.sections[1]!.prescriptions[0]).toMatchObject({
      maximumReps: 15,
      minimumReps: 10,
      restSeconds: 60,
      setCount: 2,
    });
    expect(repetitionCore.days[0]!.sections[2]!.prescriptions[0]).toMatchObject({
      maximumReps: 15,
      minimumReps: 8,
      restSeconds: 60,
      setCount: 2,
    });
    expect(timedCore.days[0]!.sections[2]!.prescriptions[1]).toMatchObject({
      maximumReps: null,
      maximumSeconds: 45,
      minimumReps: null,
      minimumSeconds: 20,
      restSeconds: 60,
      setCount: 2,
    });
  });

  it("preserves compatible targets for same-kind replacements and resets incompatible meaning", () => {
    const draft = programPublishInputFromReadModel(programReadModel(), "publish-key");
    const sameKind = replaceProgramPrescription(
      draft,
      0,
      0,
      0,
      candidate(),
      "weight_reps",
    );
    const duration = replaceProgramPrescription(
      draft,
      0,
      0,
      0,
      candidate({
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        loggingKind: "duration",
        name: "Route hold",
        role: "core-timed",
      }),
      "weight_reps",
    );

    expect(sameKind.days[0]!.sections[0]!.prescriptions[0]).toMatchObject({
      catalogExerciseId: "99999999-9999-4999-8999-999999999999",
      maximumReps: 12,
      minimumReps: 8,
      sourcePrescriptionId: "33333333-3333-4333-8333-333333333330",
      targetWeightKg: 20,
    });
    expect(duration.days[0]!.sections[0]!.prescriptions[0]).toMatchObject({
      catalogExerciseId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      maximumReps: null,
      maximumSeconds: 45,
      minimumReps: null,
      minimumSeconds: 20,
      notes: null,
      restSeconds: 90,
      setCount: 3,
      sourcePrescriptionId: "33333333-3333-4333-8333-333333333330",
      targetDistanceM: null,
      targetWeightKg: null,
    });
    expect(draft.days[0]!.sections[0]!.prescriptions[0]!.catalogExerciseId).toBe(
      "44444444-4444-4444-8444-444444444440",
    );
  });

  it("refuses to empty a section and filters compatible candidates by bounded text", () => {
    const draft = programPublishInputFromReadModel(programReadModel(), "publish-key");
    const oneRow = structuredClone(draft);
    oneRow.days[0]!.sections[0]!.prescriptions.splice(1);

    expect(() => removeProgramPrescription(oneRow, 0, 0, 0)).toThrow(/last movement/i);
    const removed = removeProgramPrescription(draft, 0, 0, 1);
    expect(removed.days[0]!.sections[0]!.prescriptions).toHaveLength(1);
    expect(draft.days[0]!.sections[0]!.prescriptions).toHaveLength(2);

    const custom = candidate({
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      kind: "custom",
      name: "Private cable row",
      requiredEquipment: ["dumbbells"],
      role: null,
      searchText: "private cable row back dumbbells",
    });
    expect(filterProgramExerciseCandidates([candidate(), custom], " BACK   ")).toEqual([custom]);
    expect(filterProgramExerciseCandidates([candidate(), custom], "x".repeat(121))).toEqual([]);
  });

  it("blocks a distance-duration selection until it has a positive distance target", () => {
    const draft = programPublishInputFromReadModel(programReadModel(), "publish-key");
    const distance = candidate({
      id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      loggingKind: "distance_duration",
      name: "Loaded carry",
      role: null,
    });
    const next = addProgramPrescription(draft, 0, 0, distance);
    const candidates = [
      candidate({ id: "44444444-4444-4444-8444-444444444440" }),
      candidate({ id: "44444444-4444-4444-8444-444444444441" }),
      distance,
    ];

    expect(validateProgramExerciseSelections(next, candidates)).toEqual([
      "Loaded carry needs a positive distance target before publication.",
    ]);
    next.days[0]!.sections[0]!.prescriptions.at(-1)!.targetDistanceM = 500;
    expect(validateProgramExerciseSelections(next, candidates)).toEqual([]);
  });

  it("strips only client-local prescription identifiers before publication", () => {
    const draft = programPublishInputFromReadModel(programReadModel(), "publish-key");
    const localId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    const added = addProgramPrescription(draft, 0, 0, candidate());
    added.days[0]!.sections[0]!.prescriptions.at(-1)!.sourcePrescriptionId = localId;

    const publishable = stripLocalProgramPrescriptionIds(added, new Set([localId]));

    expect(publishable).not.toBe(added);
    expect(publishable.days[0]!.sections[0]!.prescriptions.at(-1)!.sourcePrescriptionId).toBeNull();
    expect(publishable.days[0]!.sections[0]!.prescriptions[0]!.sourcePrescriptionId).toBe(
      "33333333-3333-4333-8333-333333333330",
    );
    expect(added.days[0]!.sections[0]!.prescriptions.at(-1)!.sourcePrescriptionId).toBe(localId);
  });
});
