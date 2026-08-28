import { describe, expect, it } from "vitest";

import {
  programPublishRequestSchema,
  type ProgramPublishInput,
} from "@/domain/programs/publication";

const ids = {
  baseRevision: "10000000-0000-4000-8000-000000000001",
  catalogExercise: "20000000-0000-4000-8000-000000000001",
  day: "30000000-0000-4000-8000-000000000001",
  program: "40000000-0000-4000-8000-000000000001",
  prescription: "50000000-0000-4000-8000-000000000001",
  section: "60000000-0000-4000-8000-000000000001",
} as const;

function flexibleRoutine(): ProgramPublishInput {
  return {
    baseRevisionId: ids.baseRevision,
    days: [
      {
        cardio: [],
        dayKey: ids.day,
        dayNumber: 1,
        displayName: "Trail strength",
        sections: [
          {
            kind: "strength" as const,
            prescriptions: [
              {
                catalogExerciseId: ids.catalogExercise,
                customExerciseId: null,
                displayName: null,
                maximumReps: 12,
                maximumSeconds: null,
                minimumReps: 8,
                minimumSeconds: null,
                notes: null,
                prescriptionKey: ids.prescription,
                restSeconds: 90,
                setCount: 3,
                setKind: "work" as const,
                sourcePrescriptionId: null,
                targetDistanceM: null,
                targetWeightKg: null,
              },
            ],
            sectionKey: ids.section,
            title: "Main work",
          },
        ],
      },
    ],
    idempotencyKey: "flexible-publication-test",
    name: "Weekend training",
    programId: ids.program,
  };
}

function cloneRoutine() {
  return structuredClone(flexibleRoutine());
}

describe("flexible routine publication contract", () => {
  it("accepts one arbitrarily named day with one arbitrary section and no cardio", () => {
    expect(programPublishRequestSchema.safeParse(flexibleRoutine()).success).toBe(true);
  });

  it("accepts fourteen ordered opaque day keys", () => {
    const input = cloneRoutine();
    input.days = Array.from({ length: 14 }, (_, index) => {
      const suffix = String(index + 1).padStart(12, "0");
      const day = structuredClone(flexibleRoutine().days[0]!);
      day.dayKey = `30000000-0000-4000-8000-${suffix}`;
      day.dayNumber = index + 1;
      day.displayName = `Training choice ${index + 1}`;
      day.sections[0]!.sectionKey = `60000000-0000-4000-8000-${suffix}`;
      day.sections[0]!.prescriptions[0]!.prescriptionKey =
        `50000000-0000-4000-8000-${suffix}`;
      return day;
    });

    expect(programPublishRequestSchema.safeParse(input).success).toBe(true);
  });

  it("rejects zero or fifteen days", () => {
    const empty = cloneRoutine();
    empty.days = [];
    expect(programPublishRequestSchema.safeParse(empty).success).toBe(false);

    const tooMany = cloneRoutine();
    tooMany.days = Array.from({ length: 15 }, (_, index) => {
      const suffix = String(index + 1).padStart(12, "0");
      const day = structuredClone(flexibleRoutine().days[0]!);
      day.dayKey = `30000000-0000-4000-8000-${suffix}`;
      day.dayNumber = index + 1;
      day.sections[0]!.sectionKey = `60000000-0000-4000-8000-${suffix}`;
      day.sections[0]!.prescriptions[0]!.prescriptionKey =
        `50000000-0000-4000-8000-${suffix}`;
      return day;
    });
    expect(programPublishRequestSchema.safeParse(tooMany).success).toBe(false);
  });

  it("rejects duplicate stable topology keys", () => {
    const input = cloneRoutine();
    const duplicate = structuredClone(input.days[0]!);
    duplicate.dayNumber = 2;
    duplicate.displayName = "Second day";
    input.days.push(duplicate);

    expect(programPublishRequestSchema.safeParse(input).success).toBe(false);
  });

  it("rejects a zero-movement day, forty-one movements in one day, and 201 overall", () => {
    const empty = cloneRoutine();
    empty.days[0]!.sections[0]!.prescriptions = [];
    expect(programPublishRequestSchema.safeParse(empty).success).toBe(false);

    const perDay = cloneRoutine();
    perDay.days[0]!.sections[0]!.prescriptions = Array.from(
      { length: 41 },
      (_, index) => ({
        ...structuredClone(flexibleRoutine().days[0]!.sections[0]!.prescriptions[0]!),
        prescriptionKey: `50000000-0000-4000-8001-${String(index + 1).padStart(12, "0")}`,
      }),
    );
    expect(programPublishRequestSchema.safeParse(perDay).success).toBe(false);

    const aggregate = cloneRoutine();
    aggregate.days = Array.from({ length: 6 }, (_, dayIndex) => {
      const suffix = String(dayIndex + 1).padStart(12, "0");
      const day = structuredClone(flexibleRoutine().days[0]!);
      day.dayKey = `30000000-0000-4000-8002-${suffix}`;
      day.dayNumber = dayIndex + 1;
      day.sections[0]!.sectionKey = `60000000-0000-4000-8002-${suffix}`;
      day.sections[0]!.prescriptions = Array.from(
        { length: dayIndex === 5 ? 1 : 40 },
        (_, movementIndex) => ({
          ...structuredClone(flexibleRoutine().days[0]!.sections[0]!.prescriptions[0]!),
          prescriptionKey: `50000000-${String(dayIndex).padStart(4, "0")}-4000-8003-${String(movementIndex + 1).padStart(12, "0")}`,
        }),
      );
      return day;
    });
    expect(programPublishRequestSchema.safeParse(aggregate).success).toBe(false);
  });

  it("accepts repeated section classifications and one optional cardio choice", () => {
    const input = cloneRoutine();
    input.days[0]!.sections.push({
      ...structuredClone(input.days[0]!.sections[0]!),
      prescriptions: [
        {
          ...structuredClone(input.days[0]!.sections[0]!.prescriptions[0]!),
          prescriptionKey: "50000000-0000-4000-8000-000000000002",
        },
      ],
      sectionKey: "60000000-0000-4000-8000-000000000002",
      title: "Optional finish",
    });
    input.days[0]!.cardio.push({
      cardioKey: "70000000-0000-4000-8000-000000000001",
      distanceM: null,
      durationSeconds: 1_200,
      inclinePercent: null,
      mode: "walker" as const,
      notes: null,
      paceSecondsPerKm: null,
    });

    expect(programPublishRequestSchema.safeParse(input).success).toBe(true);
  });

  it("rejects a zero-distance cardio choice that workout start cannot snapshot", () => {
    const input = cloneRoutine();
    input.days[0]!.cardio.push({
      cardioKey: "70000000-0000-4000-8000-000000000001",
      distanceM: 0,
      durationSeconds: 1_200,
      inclinePercent: null,
      mode: "runner",
      notes: null,
      paceSecondsPerKm: null,
    });

    expect(programPublishRequestSchema.safeParse(input).success).toBe(false);
  });
});
