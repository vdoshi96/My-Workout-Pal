import type { EquipmentProfileKind } from "@/domain/equipment";
type EquipmentSubstitutionSectionKind = "strength" | "accessory" | "core" | "cardio";

type StarterSubstitutionSlot = Readonly<{
  dayKey: string;
  sectionKind: EquipmentSubstitutionSectionKind;
  sourceSlug: string;
}>;

function slotKey(slot: StarterSubstitutionSlot): string {
  return `${slot.dayKey}:${slot.sectionKind}:${slot.sourceSlug}`;
}

const substitutionsByTarget: Readonly<
  Record<EquipmentProfileKind, Readonly<Record<string, string>>>
> = {
  barbell: {
    [slotKey({ dayKey: "pull", sectionKind: "strength", sourceSlug: "chest-supported-dumbbell-row" })]:
      "barbell-bent-over-row",
    [slotKey({ dayKey: "upper", sectionKind: "strength", sourceSlug: "dumbbell-bench-press" })]:
      "barbell-bench-press",
    [slotKey({ dayKey: "upper", sectionKind: "strength", sourceSlug: "chest-supported-dumbbell-row" })]:
      "barbell-bent-over-row",
    [slotKey({ dayKey: "lower", sectionKind: "strength", sourceSlug: "goblet-squat" })]:
      "barbell-back-squat",
    [slotKey({ dayKey: "lower", sectionKind: "strength", sourceSlug: "dumbbell-romanian-deadlift" })]:
      "barbell-romanian-deadlift",
    [slotKey({ dayKey: "lower", sectionKind: "strength", sourceSlug: "dumbbell-hip-thrust" })]:
      "barbell-hip-thrust",
  },
  dumbbells: {
    [slotKey({ dayKey: "pull", sectionKind: "strength", sourceSlug: "barbell-bent-over-row" })]:
      "chest-supported-dumbbell-row",
    [slotKey({ dayKey: "upper", sectionKind: "strength", sourceSlug: "barbell-bench-press" })]:
      "dumbbell-bench-press",
    [slotKey({ dayKey: "upper", sectionKind: "strength", sourceSlug: "barbell-bent-over-row" })]:
      "chest-supported-dumbbell-row",
    [slotKey({ dayKey: "lower", sectionKind: "strength", sourceSlug: "barbell-back-squat" })]:
      "goblet-squat",
    [slotKey({ dayKey: "lower", sectionKind: "strength", sourceSlug: "barbell-romanian-deadlift" })]:
      "dumbbell-romanian-deadlift",
    [slotKey({ dayKey: "lower", sectionKind: "strength", sourceSlug: "barbell-hip-thrust" })]:
      "dumbbell-hip-thrust",
  },
};

/**
 * Resolve only explicit starter-route substitutions. The day and semantic
 * section disambiguate exercises intentionally retained elsewhere in the
 * route, independent of mutable prescription ordering.
 */
export function starterEquipmentReplacement(
  targetProfile: EquipmentProfileKind,
  slot: StarterSubstitutionSlot,
): string | undefined {
  return substitutionsByTarget[targetProfile][slotKey(slot)];
}

export function starterReplacementSlugs(
  targetProfile: EquipmentProfileKind,
): readonly string[] {
  return [...new Set(Object.values(substitutionsByTarget[targetProfile]))];
}
