import { describe, expect, it } from "vitest";

import {
  programPublishInputFromReadModel,
  reorderProgramPrescription,
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
});
