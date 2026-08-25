import { describe, expect, it } from "vitest";

import {
  formatMeasurement,
  displayToKilograms,
  displayToMeters,
  displayToPace,
  formatRestTimer,
  formatRunnerStatus,
  formatSetTarget,
  formatSyncStatus,
  kilogramsToDisplay,
  metersToDisplay,
  paceToDisplay,
  shouldAnnounceTimerChange,
} from "@/components/workout/workout-runner-presenters";
import type { RestTimerView } from "@/domain/workout-runner";

describe("workout runner presentation helpers", () => {
  it("describes every supported measurement kind with canonical units", () => {
    expect(
      formatMeasurement({
        kind: "weight_reps",
        weightKg: 32.5,
        repetitions: 8,
      }),
    ).toBe("32.5 kg · 8 reps");
    expect(
      formatMeasurement({
        kind: "bodyweight_reps",
        repetitions: 10,
        addedWeightKg: 5,
      }),
    ).toBe("10 reps · +5 kg");
    expect(formatMeasurement({ kind: "duration", durationSeconds: 45 })).toBe(
      "0:45",
    );
    expect(
      formatMeasurement({
        kind: "distance_duration",
        distanceMeters: 1_200,
        durationSeconds: 390,
      }),
    ).toBe("1,200 m · 6:30");
  });

  it("labels warm-up measurements without confusing them with work", () => {
    expect(
      formatMeasurement({
        kind: "weight_reps",
        weightKg: 20,
        repetitions: 10,
        isWarmup: true,
      }),
    ).toBe("20 kg · 10 reps · warm-up");
  });

  it("summarizes typed targets", () => {
    expect(
      formatSetTarget({
        kind: "weight_reps",
        minimumReps: 8,
        maximumReps: 12,
        targetWeightKg: 30,
        restSeconds: 90,
      }),
    ).toBe("30 kg · 8–12 reps · 1:30 rest");
    expect(
      formatSetTarget({
        kind: "duration",
        minimumSeconds: 20,
        maximumSeconds: 45,
        restSeconds: 30,
      }),
    ).toBe("0:20–0:45 · 0:30 rest");
    expect(
      formatSetTarget({
        kind: "distance_duration",
        targetDistanceMeters: 1_000,
        targetDurationSeconds: 420,
        restSeconds: 0,
      }),
    ).toBe("1,000 m · 7:00 · no rest");
  });

  it("keeps sync and session labels truthful", () => {
    expect(formatSyncStatus("pending")).toMatchObject({
      label: "Pending",
      tone: "pending",
    });
    expect(formatSyncStatus("offline")).toMatchObject({
      label: "Offline queued",
      tone: "offline",
    });
    expect(formatSyncStatus("auth_expired")).toMatchObject({
      label: "Sign-in expired",
      tone: "auth",
    });
    expect(formatSyncStatus("conflict")).toMatchObject({
      label: "Conflict",
      tone: "conflict",
    });
    expect(formatRunnerStatus("completing")).toBe("Completing");
  });

  it("announces timer transitions but not each countdown tick", () => {
    const running: RestTimerView = {
      status: "running",
      startedAt: 0,
      endsAt: 90_000,
      remainingSeconds: 90,
    };
    const runningTick: RestTimerView = { ...running, remainingSeconds: 89 };
    const paused: RestTimerView = {
      ...runningTick,
      status: "paused",
      pausedAt: 1_000,
    } as RestTimerView;
    const complete: RestTimerView = {
      ...running,
      status: "complete",
      remainingSeconds: 0,
    };
    expect(shouldAnnounceTimerChange(undefined, running)).toBe(true);
    expect(shouldAnnounceTimerChange(running, runningTick)).toBe(false);
    expect(shouldAnnounceTimerChange(runningTick, paused)).toBe(true);
    expect(shouldAnnounceTimerChange(runningTick, complete)).toBe(true);
  });

  it("formats rest durations with a two-digit seconds component", () => {
    expect(formatRestTimer(90)).toBe("1:30");
    expect(formatRestTimer(0)).toBe("0:00");
  });

  it("converts imperial presentation values back to canonical metric values", () => {
    expect(
      formatMeasurement(
        { kind: "weight_reps", weightKg: 10, repetitions: 5 },
        { unitSystem: "imperial" },
      ),
    ).toBe("22.05 lb · 5 reps");
    expect(
      formatSetTarget(
        {
          kind: "weight_reps",
          minimumReps: 8,
          maximumReps: 10,
          targetWeightKg: 20,
          restSeconds: 0,
        },
        { unitSystem: "imperial" },
      ),
    ).toBe("44.09 lb · 8–10 reps · no rest");
    expect(
      formatMeasurement(
        {
          kind: "distance_duration",
          distanceMeters: 1_609.344,
          durationSeconds: 600,
        },
        { unitSystem: "imperial" },
      ),
    ).toBe("1 mi · 10:00");
    expect(
      formatMeasurement(
        {
          kind: "weight_reps",
          weightKg: displayToKilograms(
            kilogramsToDisplay(12.5, "imperial"),
            "imperial",
          ),
          repetitions: 6,
        },
        { unitSystem: "imperial" },
      ),
    ).toBe("27.56 lb · 6 reps");
    expect(
      displayToMeters(metersToDisplay(2_000, "imperial"), "imperial"),
    ).toBeCloseTo(2_000, 8);
    expect(
      displayToPace(paceToDisplay(420, "imperial"), "imperial"),
    ).toBeCloseTo(420, 8);
  });
});
