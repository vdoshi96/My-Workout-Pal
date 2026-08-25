import type { LoggingKind } from "@/domain/exercises/catalog";

export type ProgressionForm = "appropriate" | "needs_attention" | "not_recorded";

export type ProgressionSet = Readonly<{
  kind: "warmup" | "work";
  repetitions: number;
  form: ProgressionForm;
}>;

export type DoubleProgressionReason =
  | "appropriate_form_not_confirmed"
  | "logging_kind_not_supported"
  | "range_top_not_reached"
  | "range_top_with_appropriate_form"
  | "work_sets_incomplete";

export type DoubleProgressionEvaluation = Readonly<{
  decision: "consider_load_increase" | "hold_current_target" | "not_applicable";
  reason: DoubleProgressionReason;
  qualifyingWorkSets: number;
}>;

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive whole number.`);
  }
}

export function evaluateDoubleProgression({
  loggingKind,
  maximumRepetitions,
  requiredWorkSets,
  sets,
}: Readonly<{
  loggingKind: LoggingKind;
  maximumRepetitions: number;
  requiredWorkSets: number;
  sets: readonly ProgressionSet[];
}>): DoubleProgressionEvaluation {
  assertPositiveInteger(maximumRepetitions, "maximumRepetitions");
  assertPositiveInteger(requiredWorkSets, "requiredWorkSets");

  const workSets = sets.filter((set) => set.kind === "work");
  for (const set of workSets) {
    if (!Number.isInteger(set.repetitions) || set.repetitions < 0) {
      throw new RangeError("Work-set repetitions must be a nonnegative whole number.");
    }
  }

  if (loggingKind !== "weight_reps") {
    return {
      decision: "not_applicable",
      reason: "logging_kind_not_supported",
      qualifyingWorkSets: workSets.length,
    };
  }
  if (workSets.length !== requiredWorkSets) {
    return {
      decision: "hold_current_target",
      reason: "work_sets_incomplete",
      qualifyingWorkSets: workSets.length,
    };
  }
  if (workSets.some((set) => set.repetitions < maximumRepetitions)) {
    return {
      decision: "hold_current_target",
      reason: "range_top_not_reached",
      qualifyingWorkSets: workSets.length,
    };
  }
  if (workSets.some((set) => set.form !== "appropriate")) {
    return {
      decision: "hold_current_target",
      reason: "appropriate_form_not_confirmed",
      qualifyingWorkSets: workSets.length,
    };
  }
  return {
    decision: "consider_load_increase",
    reason: "range_top_with_appropriate_form",
    qualifyingWorkSets: workSets.length,
  };
}
