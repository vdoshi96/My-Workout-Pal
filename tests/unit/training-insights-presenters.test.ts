import { describe, expect, it } from "vitest";

import {
  formatHistoryDate,
  formatInsightDistance,
  formatInsightDuration,
  formatInsightVolume,
  formatPersonalRecord,
} from "@/components/insights/training-insights-presenters";

describe("training insights presenters", () => {
  it("converts canonical metrics only at presentation", () => {
    expect(formatInsightVolume(100, "imperial")).toBe("220.5 lb");
    expect(formatInsightVolume(100, "metric")).toBe("100 kg");
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
  });
});
