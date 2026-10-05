import { describe, expect, it } from "vitest";

import {
  formatHistoryDate,
  formatInsightDistance,
  formatInsightDuration,
  formatInsightVolume,
  formatPersonalRecord,
  finishedWorkoutSummary,
  newestRecordKey,
  recordsFromSession,
  summarizeFinishedWorkout,
} from "@/components/insights/training-insights-presenters";
import type { PersonalRecordView, TrainingSetView } from "@/server/repositories/training-insights";

function set(overrides: Partial<TrainingSetView>): TrainingSetView {
  return {
    addedWeightKg: undefined,
    distanceMeters: undefined,
    durationSeconds: undefined,
    formRating: undefined,
    id: "set",
    kind: "weight_reps",
    note: undefined,
    position: 1,
    recordedAt: new Date("2026-08-26T18:00:00.000Z"),
    repetitions: undefined,
    setKind: "work",
    weightKg: undefined,
    ...overrides,
  };
}

function record(overrides: Partial<PersonalRecordView>): PersonalRecordView {
  return {
    achievedAt: new Date("2026-08-26T18:00:00.000Z"),
    calculationVersions: ["personal-record-v1"],
    exerciseName: "Goblet squat",
    hasMoreSources: false,
    isTie: false,
    sourceSessionIds: ["session-a"],
    sourceSetLogIds: ["log-a"],
    totalTieCount: 1,
    type: "max_weight",
    value: 20,
    ...overrides,
  };
}

describe("training insights presenters", () => {
  it("converts canonical metrics only at presentation", () => {
    expect(formatInsightVolume(100, "imperial")).toBe("220.5 lb·reps");
    expect(formatInsightVolume(100, "metric")).toBe("100 kg·reps");
    expect(formatInsightDistance(1_609.344, "imperial")).toBe("1 mi");
    expect(formatInsightDistance(1_609.344, "metric")).toBe("1.61 km");
  });

  it("formats durations without hiding hours", () => {
    expect(formatInsightDuration(65)).toBe("1m 5s");
    expect(formatInsightDuration(3_661)).toBe("1h 1m");
    expect(formatInsightDuration(undefined)).toBe("Not recorded");
  });

  it("uses the owner's time zone for immutable session timestamps", () => {
    const instant = new Date("2026-08-25T02:30:00.000Z");
    expect(formatHistoryDate(instant, "America/Chicago")).toBe("Aug 24, 2026, 9:30 PM");
    expect(formatHistoryDate(instant, "UTC")).toBe("Aug 25, 2026, 2:30 AM");
  });

  it("labels each record kind and respects the presentation unit", () => {
    expect(formatPersonalRecord("max_weight", 45, "imperial")).toEqual({
      label: "Heaviest weight",
      value: "99.2 lb",
    });
    expect(formatPersonalRecord("estimated_1rm", 45, "metric").label).toBe("Estimated 1RM");
    expect(formatPersonalRecord("max_repetitions", 14, "metric").value).toBe("14 reps");
    expect(formatPersonalRecord("duration", 95, "metric").value).toBe("1m 35s");
    expect(formatPersonalRecord("distance", 5_000, "metric").value).toBe("5 km");
    expect(formatPersonalRecord("volume", 100, "metric").value).toBe("100 kg·reps");
  });

  it("sums a finished workout's work sets, reps and lifted load the way Progress does", () => {
    const summary = summarizeFinishedWorkout([
      { sets: [
        set({ repetitions: 5, setKind: "warmup", weightKg: 10 }),
        set({ repetitions: 10, weightKg: 20 }),
        set({ repetitions: 8, weightKg: 20 }),
      ] },
      { sets: [
        set({ addedWeightKg: 5, kind: "bodyweight_reps", repetitions: 6 }),
        set({ kind: "bodyweight_reps", repetitions: 12 }),
      ] },
      { sets: [set({ durationSeconds: 45, kind: "duration" })] },
    ]);
    expect(summary).toEqual({ repetitions: 36, sets: 5, volumeKg: 390 });
  });

  it("writes the celebration line in the member's units and drops empty parts", () => {
    expect(finishedWorkoutSummary({ repetitions: 36, sets: 5, volumeKg: 100 }, "imperial")).toBe(
      "5 sets · 36 reps · 220.5 lb·reps lifted",
    );
    expect(finishedWorkoutSummary({ repetitions: 1, sets: 1, volumeKg: 0 }, "metric")).toBe("1 set · 1 rep");
    expect(finishedWorkoutSummary({ repetitions: 0, sets: 2, volumeKg: 0 }, "metric")).toBe("2 sets");
    expect(finishedWorkoutSummary({ repetitions: 0, sets: 0, volumeKg: 0 }, "metric")).toBe("Every workout counts.");
  });

  it("finds the records this workout set and the newest record overall", () => {
    const fromThis = record({ sourceSessionIds: ["session-b", "session-a"], sourceSetLogIds: ["log-b"], type: "volume" });
    const older = record({ achievedAt: new Date("2026-08-20T18:00:00.000Z"), sourceSessionIds: ["session-c"], sourceSetLogIds: ["log-c"] });
    const newest = record({ achievedAt: new Date("2026-08-28T18:00:00.000Z"), sourceSessionIds: ["session-a"], sourceSetLogIds: ["log-d"] });
    expect(recordsFromSession([fromThis, older, newest], "session-a")).toEqual([fromThis, newest]);
    expect(recordsFromSession([older], "session-a")).toEqual([]);
    expect(newestRecordKey([fromThis, older, newest])).toBe("max_weight:log-d");
    expect(newestRecordKey([])).toBeUndefined();
  });
});
