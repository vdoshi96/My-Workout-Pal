import { describe, expect, it } from "vitest";
import {
  KILOGRAMS_PER_POUND,
  POUNDS_PER_KILOGRAM,
  buildProgressSummarySeries,
  calculateEpleyOneRepMax,
  buildPersonalRecordProjectionCandidates,
  calculateWorkoutVolume,
  compareRecordValues,
  convertWeight,
  parseMeasurement,
  presentWeight,
  roundForPresentation,
  selectPersonalRecord,
  type PersonalRecordCandidate,
  type ProgressSummarySeriesInput,
  type WorkoutMeasurement,
} from "@/domain/analytics";

describe("canonical weight conversion and presentation", () => {
  it("uses the product's exact kilogram-to-pound factor in both directions", () => {
    expect(POUNDS_PER_KILOGRAM).toBe(2.2046226218);
    expect(KILOGRAMS_PER_POUND).toBeCloseTo(1 / 2.2046226218, 15);
    expect(convertWeight(10, "kg", "lb")).toBeCloseTo(22.046226218, 10);
    expect(convertWeight(22.046226218, "lb", "kg")).toBeCloseTo(10, 10);
  });

  it("rounds only at the presentation boundary", () => {
    expect(roundForPresentation(22.046226218, 1)).toBe(22);
    expect(presentWeight(10, "lb", 1)).toBe(22);
    expect(presentWeight(10, "kg", 2)).toBe(10);
    expect(convertWeight(10, "kg", "lb")).toBeCloseTo(22.046226218, 10);
  });

  it("rejects invalid canonical or presentation values", () => {
    expect(() => convertWeight(-1, "kg", "lb")).toThrow(RangeError);
    expect(() => roundForPresentation(Number.NaN, 1)).toThrow(RangeError);
    expect(() => roundForPresentation(1, -1)).toThrow(RangeError);
  });
});

describe("measurement-kind invariants", () => {
  it("accepts exactly the four supported measurement shapes", () => {
    const measurements: WorkoutMeasurement[] = [
      parseMeasurement({ kind: "weight_reps", weightKg: 40, repetitions: 8 }),
      parseMeasurement({ kind: "bodyweight_reps", repetitions: 12 }),
      parseMeasurement({ kind: "duration", durationSeconds: 45 }),
      parseMeasurement({
        kind: "distance_duration",
        distanceMeters: 1_000,
        durationSeconds: 420,
      }),
    ];

    expect(measurements.map(({ kind }) => kind)).toEqual([
      "weight_reps",
      "bodyweight_reps",
      "duration",
      "distance_duration",
    ]);
  });

  it("requires fields that belong to a kind and rejects fields from another kind", () => {
    expect(() => parseMeasurement({ kind: "weight_reps", repetitions: 8 })).toThrow(
      /weightKg/,
    );
    expect(() =>
      parseMeasurement({ kind: "distance_duration", distanceMeters: 1_000 }),
    ).toThrow(/durationSeconds/);
    expect(() =>
      parseMeasurement({ kind: "duration", durationSeconds: 45, weightKg: 20 }),
    ).toThrow(/weightKg/);
    expect(() =>
      parseMeasurement({ kind: "bodyweight_reps", repetitions: 0 }),
    ).toThrow(/repetitions/);
    expect(() => parseMeasurement({ kind: "unknown", value: 1 })).toThrow(
      /kind/,
    );
    expect(() => parseMeasurement({ kind: "duration", durationSeconds: 30.5 })).toThrow(
      /durationSeconds.*positive integer/,
    );
    expect(() => parseMeasurement({
      kind: "distance_duration",
      distanceMeters: 0,
      durationSeconds: 100,
    })).toThrow(/distanceMeters.*positive/);
    expect(parseMeasurement({
      kind: "distance_duration",
      distanceMeters: 333.25,
      durationSeconds: 100,
    })).toEqual({
      kind: "distance_duration",
      distanceMeters: 333.25,
      durationSeconds: 100,
    });
    expect(() => parseMeasurement({
      kind: "distance_duration",
      distanceMeters: 333.25,
      durationSeconds: 100.5,
    })).toThrow(/durationSeconds.*positive integer/);
  });
});

describe("workout volume", () => {
  it("sums external load for work sets and excludes warm-ups and unsupported kinds", () => {
    const measurements: WorkoutMeasurement[] = [
      parseMeasurement({ kind: "weight_reps", weightKg: 40, repetitions: 8 }),
      parseMeasurement({
        kind: "weight_reps",
        weightKg: 40,
        repetitions: 8,
        isWarmup: true,
      }),
      parseMeasurement({ kind: "bodyweight_reps", repetitions: 12 }),
      parseMeasurement({
        kind: "bodyweight_reps",
        repetitions: 5,
        addedWeightKg: 10,
      }),
      parseMeasurement({ kind: "duration", durationSeconds: 45 }),
      parseMeasurement({
        kind: "distance_duration",
        distanceMeters: 1_000,
        durationSeconds: 420,
      }),
    ];

    expect(calculateWorkoutVolume(measurements)).toBe(370);
  });
});

describe("Epley estimated one-repetition maximum", () => {
  it("calculates from positive weighted work and never rounds the canonical result", () => {
    const measurement = parseMeasurement({
      kind: "weight_reps",
      weightKg: 100,
      repetitions: 5,
    });

    expect(calculateEpleyOneRepMax(measurement)).toBeCloseTo(116.6666666667, 10);
  });

  it("excludes warm-ups, bodyweight-only work, duration, distance, and zero load", () => {
    const measurements: WorkoutMeasurement[] = [
      parseMeasurement({
        kind: "weight_reps",
        weightKg: 100,
        repetitions: 5,
        isWarmup: true,
      }),
      parseMeasurement({ kind: "bodyweight_reps", repetitions: 10 }),
      parseMeasurement({
        kind: "distance_duration",
        distanceMeters: 1_000,
        durationSeconds: 420,
      }),
      parseMeasurement({ kind: "weight_reps", weightKg: 0, repetitions: 10 }),
    ];

    expect(measurements.map(calculateEpleyOneRepMax)).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });

  it("can estimate a weighted bodyweight set from its logged added load", () => {
    expect(
      calculateEpleyOneRepMax(
        parseMeasurement({
          kind: "bodyweight_reps",
          repetitions: 5,
          addedWeightKg: 20,
        }),
      ),
    ).toBeCloseTo(23.3333333333, 10);
  });
});

describe("personal-record projection candidates", () => {
  it("projects every logging kind at the database scale and excludes warm-ups", () => {
    expect(buildPersonalRecordProjectionCandidates({
      kind: "weight_reps",
      weightKg: 12.3456,
      repetitions: 7,
    })).toEqual([
      { recordType: "max_weight", value: 12.346 },
      { recordType: "max_repetitions", value: 7 },
      { recordType: "volume", value: 86.419 },
      { recordType: "estimated_1rm", value: 15.226 },
    ]);
    expect(buildPersonalRecordProjectionCandidates({
      kind: "bodyweight_reps",
      repetitions: 11,
      addedWeightKg: 20,
    })).toEqual([
      { recordType: "max_repetitions", value: 11 },
    ]);
    expect(buildPersonalRecordProjectionCandidates({
      kind: "duration",
      durationSeconds: 45,
    })).toEqual([
      { recordType: "duration", value: 45 },
    ]);
    expect(buildPersonalRecordProjectionCandidates({
      kind: "distance_duration",
      distanceMeters: 123.4567,
      durationSeconds: 91,
    })).toEqual([
      { recordType: "distance", value: 123.457 },
      { recordType: "duration", value: 91 },
    ]);
    expect(buildPersonalRecordProjectionCandidates({
      kind: "weight_reps",
      weightKg: 12,
      repetitions: 7,
      isWarmup: true,
    })).toEqual([]);
    expect(buildPersonalRecordProjectionCandidates({
      kind: "weight_reps",
      weightKg: 0,
      repetitions: 7,
    })).toEqual([
      { recordType: "max_repetitions", value: 7 },
    ]);
  });

  it("fails closed for malformed or nonfinite measurements", () => {
    expect(buildPersonalRecordProjectionCandidates({
      kind: "weight_reps",
      weightKg: Number.NaN,
      repetitions: 7,
    })).toEqual([]);
    expect(buildPersonalRecordProjectionCandidates({
      kind: "distance_duration",
      distanceMeters: Number.POSITIVE_INFINITY,
      durationSeconds: 91,
    })).toEqual([]);
    expect(buildPersonalRecordProjectionCandidates({
      kind: "duration",
      durationSeconds: 0,
    })).toEqual([]);
  });
});

describe("personal-record comparison", () => {
  const candidates: PersonalRecordCandidate[] = [
    {
      id: "log-b",
      exerciseVariationId: "bench-standard",
      recordType: "estimated_1rm",
      value: 100.000000001,
      occurredAt: "2026-08-11T09:00:00.000Z",
    },
    {
      id: "log-a",
      exerciseVariationId: "bench-standard",
      recordType: "estimated_1rm",
      value: 100,
      occurredAt: "2026-08-10T09:00:00.000Z",
    },
    {
      id: "log-c",
      exerciseVariationId: "bench-standard",
      recordType: "estimated_1rm",
      value: 100.000000001,
      occurredAt: "2026-08-12T09:00:00.000Z",
    },
  ];
  const firstCandidate = candidates[0] as PersonalRecordCandidate;

  it("compares canonical values before presentation rounding", () => {
    expect(compareRecordValues(100.000000001, 100)).toBe("higher");
    expect(compareRecordValues(100, 100)).toBe("tie");
    expect(compareRecordValues(99, 100)).toBe("lower");
  });

  it("returns deterministic winners and preserves exact-value ties", () => {
    const first = selectPersonalRecord(candidates);
    const second = selectPersonalRecord([...candidates].reverse());

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      exerciseVariationId: "bench-standard",
      recordType: "estimated_1rm",
      bestValue: 100.000000001,
      isTie: true,
      sourceCandidateId: "log-b",
    });
    expect(first?.winnerIds).toEqual(["log-b", "log-c"]);
  });

  it("rejects candidates from different comparison groups", () => {
    expect(() =>
      selectPersonalRecord([
        ...candidates,
        {
          ...firstCandidate,
          id: "log-other",
          exerciseVariationId: "squat-standard",
        },
      ]),
    ).toThrow(/same exercise variation and record type/);
  });
});

describe("progress summary series inputs", () => {
  const inputs: ProgressSummarySeriesInput[] = [
    {
      id: "session-2",
      completedAt: "2026-08-02T01:30:00.000Z",
      volumeKg: 500,
      estimatedOneRepMaxKg: 100,
    },
    {
      id: "session-1",
      completedAt: "2026-08-01T23:30:00.000Z",
      volumeKg: 300,
      durationSeconds: 1_200,
      distanceMeters: 2_000,
    },
    {
      id: "session-3",
      completedAt: "2026-08-10T12:00:00.000Z",
      estimatedOneRepMaxKg: 110,
    },
  ];
  const firstInput = inputs[0] as ProgressSummarySeriesInput;

  it("groups by the user's local date, sorts deterministically, and omits missing dates", () => {
    expect(buildProgressSummarySeries(inputs, { timeZone: "America/Chicago" })).toEqual([
      {
        date: "2026-08-01",
        sessionCount: 2,
        volumeKg: 800,
        estimatedOneRepMaxKg: 100,
        durationSeconds: 1_200,
        distanceMeters: 2_000,
        sourceIds: ["session-1", "session-2"],
      },
      {
        date: "2026-08-10",
        sessionCount: 1,
        volumeKg: null,
        estimatedOneRepMaxKg: 110,
        durationSeconds: null,
        distanceMeters: null,
        sourceIds: ["session-3"],
      },
    ]);
  });

  it("supports inclusive local-date bounds without fabricating points", () => {
    expect(
      buildProgressSummarySeries(inputs, {
        timeZone: "America/Chicago",
        fromDate: "2026-08-02",
        throughDate: "2026-08-09",
      }),
    ).toEqual([]);
  });

  it("rejects invalid timestamps, time zones, and canonical metric values", () => {
    expect(() =>
      buildProgressSummarySeries(
        [{ ...firstInput, completedAt: "not-a-date" }],
        { timeZone: "America/Chicago" },
      ),
    ).toThrow(/completedAt/);
    expect(() => buildProgressSummarySeries(inputs, { timeZone: "Not/ATimeZone" })).toThrow(
      /timeZone/,
    );
    expect(() =>
      buildProgressSummarySeries(
        [{ ...firstInput, volumeKg: -1 }],
        { timeZone: "America/Chicago" },
      ),
    ).toThrow(/volumeKg/);
  });
});
