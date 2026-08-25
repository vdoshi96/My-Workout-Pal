import { describe, expect, it } from "vitest";

import { evaluateDoubleProgression } from "@/domain/progression";

describe("double progression", () => {
  it("suggests considering an increase only after every work set reaches the top with appropriate form", () => {
    expect(
      evaluateDoubleProgression({
        loggingKind: "weight_reps",
        maximumRepetitions: 12,
        requiredWorkSets: 3,
        sets: [
          { kind: "warmup", repetitions: 8, form: "not_recorded" },
          { kind: "work", repetitions: 12, form: "appropriate" },
          { kind: "work", repetitions: 12, form: "appropriate" },
          { kind: "work", repetitions: 12, form: "appropriate" },
        ],
      }),
    ).toEqual({
      decision: "consider_load_increase",
      reason: "range_top_with_appropriate_form",
      qualifyingWorkSets: 3,
    });
  });

  it.each([
    {
      label: "an incomplete work-set count",
      requiredWorkSets: 3,
      sets: [
        { kind: "work" as const, repetitions: 12, form: "appropriate" as const },
        { kind: "work" as const, repetitions: 12, form: "appropriate" as const },
      ],
      reason: "work_sets_incomplete",
    },
    {
      label: "a work set below the range top",
      requiredWorkSets: 3,
      sets: [
        { kind: "work" as const, repetitions: 12, form: "appropriate" as const },
        { kind: "work" as const, repetitions: 11, form: "appropriate" as const },
        { kind: "work" as const, repetitions: 12, form: "appropriate" as const },
      ],
      reason: "range_top_not_reached",
    },
    {
      label: "form needing attention",
      requiredWorkSets: 3,
      sets: [
        { kind: "work" as const, repetitions: 12, form: "appropriate" as const },
        { kind: "work" as const, repetitions: 12, form: "needs_attention" as const },
        { kind: "work" as const, repetitions: 12, form: "appropriate" as const },
      ],
      reason: "appropriate_form_not_confirmed",
    },
    {
      label: "form not recorded",
      requiredWorkSets: 3,
      sets: [
        { kind: "work" as const, repetitions: 12, form: "appropriate" as const },
        { kind: "work" as const, repetitions: 12, form: "not_recorded" as const },
        { kind: "work" as const, repetitions: 12, form: "appropriate" as const },
      ],
      reason: "appropriate_form_not_confirmed",
    },
  ])("does not suggest an increase for $label", ({ requiredWorkSets, sets, reason }) => {
    expect(
      evaluateDoubleProgression({
        loggingKind: "weight_reps",
        maximumRepetitions: 12,
        requiredWorkSets,
        sets,
      }),
    ).toEqual({
      decision: "hold_current_target",
      reason,
      qualifyingWorkSets: sets.length,
    });
  });

  it.each(["bodyweight_reps", "duration", "distance_duration"] as const)(
    "never emits a load suggestion for %s logging",
    (loggingKind) => {
      expect(
        evaluateDoubleProgression({
          loggingKind,
          maximumRepetitions: 12,
          requiredWorkSets: 2,
          sets: [
            { kind: "work", repetitions: 12, form: "appropriate" },
            { kind: "work", repetitions: 12, form: "appropriate" },
          ],
        }),
      ).toMatchObject({
        decision: "not_applicable",
        reason: "logging_kind_not_supported",
      });
    },
  );

  it("rejects invalid prescription boundaries rather than inventing a recommendation", () => {
    expect(() =>
      evaluateDoubleProgression({
        loggingKind: "weight_reps",
        maximumRepetitions: 0,
        requiredWorkSets: 3,
        sets: [],
      }),
    ).toThrow("maximumRepetitions");
    expect(() =>
      evaluateDoubleProgression({
        loggingKind: "weight_reps",
        maximumRepetitions: 12,
        requiredWorkSets: 0,
        sets: [],
      }),
    ).toThrow("requiredWorkSets");
  });
});
