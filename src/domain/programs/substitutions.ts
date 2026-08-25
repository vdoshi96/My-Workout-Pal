import type { EquipmentProfile } from "@/domain/equipment";
import { supportsEquipment } from "@/domain/equipment";
import { getCatalogExercise } from "@/domain/exercises/catalog";
import type { Program } from "@/domain/programs/types";

const dumbbellToBarbell = {
  "chest-supported-dumbbell-row": "barbell-bent-over-row",
  "dumbbell-bench-press": "barbell-bench-press",
  "goblet-squat": "barbell-back-squat",
  "dumbbell-romanian-deadlift": "barbell-romanian-deadlift",
  "dumbbell-hip-thrust": "barbell-hip-thrust",
} as const;

const barbellToDumbbell = Object.fromEntries(
  Object.entries(dumbbellToBarbell).map(([dumbbell, barbell]) => [barbell, dumbbell]),
) as Readonly<Record<string, string>>;

export type SubstitutionChange = Readonly<{
  day: string;
  order: number;
  fromSlug: string;
  toSlug: string;
  preserved: readonly ["sets", "repRange", "rest", "section", "order", "notes"];
  cleared: readonly ["targetWeightKg", "previousValueLink"];
}>;

export type EquipmentChangePreview = Readonly<{
  changes: readonly SubstitutionChange[];
  nextProgram: Program;
}>;

export function previewEquipmentChange(
  program: Program,
  targetProfile: EquipmentProfile,
): EquipmentChangePreview {
  if (program.equipmentProfile === targetProfile.id) {
    return { changes: [], nextProgram: program };
  }

  const nextProgram = structuredClone(program);
  nextProgram.equipmentProfile = targetProfile.id;
  nextProgram.revision += 1;
  nextProgram.id = `${program.id.split("@", 1)[0]}@${nextProgram.revision}`;

  const changes: SubstitutionChange[] = [];
  const mapping = targetProfile.id === "dumbbells" ? barbellToDumbbell : dumbbellToBarbell;

  for (const day of nextProgram.days) {
    for (const prescription of day.prescriptions) {
      const exercise = getCatalogExercise(prescription.exerciseSlug);
      if (supportsEquipment(targetProfile, exercise.requiredEquipment)) continue;

      const replacement = mapping[prescription.exerciseSlug as keyof typeof mapping];
      if (!replacement) {
        throw new Error(`No substitution for ${prescription.exerciseSlug} in ${targetProfile.id}`);
      }

      const fromSlug = prescription.exerciseSlug;
      prescription.exerciseSlug = replacement;
      prescription.displayName =
        day.name === "Lower" && replacement === "goblet-squat" ? "Heavy goblet squat" : undefined;
      prescription.targetWeightKg = undefined;
      prescription.previousValueLink = undefined;
      day.exerciseSlugs[prescription.order] = replacement;
      changes.push({
        day: day.name,
        order: prescription.order,
        fromSlug,
        toSlug: replacement,
        preserved: ["sets", "repRange", "rest", "section", "order", "notes"],
        cleared: ["targetWeightKg", "previousValueLink"],
      });
    }
  }

  return { changes, nextProgram };
}
