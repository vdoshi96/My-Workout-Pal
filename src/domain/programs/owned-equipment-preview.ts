import {
  supportsEquipment,
  type EquipmentId,
  type EquipmentProfile,
  type EquipmentProfileKind,
} from "@/domain/equipment";
import { getCatalogExercise } from "@/domain/exercises/catalog";
import { starterEquipmentReplacement } from "@/domain/programs/equipment-substitutions";

type PreviewPrescription = Readonly<{
  id: string;
  label: string;
  exercise: Readonly<{
    kind: "catalog" | "custom";
    name: string;
    requiredEquipment: readonly EquipmentId[];
    slug: string;
  }>;
}>;

type PreviewProgram = Readonly<{
  equipmentProfileKind: EquipmentProfileKind;
  days: readonly Readonly<{
    dayKey: string;
    displayName: string;
    sections: readonly Readonly<{
      kind: "strength" | "accessory" | "core" | "cardio";
      prescriptions: readonly PreviewPrescription[];
    }>[];
  }>[];
}>;

export type OwnedEquipmentPreviewChange = Readonly<{
  prescriptionId: string;
  dayDisplayName: string;
  fromName: string;
  fromSlug: string;
  toName: string;
  toSlug: string;
  preserved: readonly ["sets", "rep range", "rest", "section", "order", "notes"];
  cleared: readonly ["load target", "distance target", "movement metadata"];
}>;

export type OwnedEquipmentPreviewBlocker = Readonly<{
  prescriptionId: string;
  dayDisplayName: string;
  exerciseName: string;
  requiredEquipment: readonly EquipmentId[];
}>;

export type OwnedEquipmentChangePreview = Readonly<{
  targetProfileKind: EquipmentProfileKind;
  changes: readonly OwnedEquipmentPreviewChange[];
  blockers: readonly OwnedEquipmentPreviewBlocker[];
  canConfirm: boolean;
}>;

export function previewOwnedEquipmentChange(
  program: PreviewProgram,
  targetProfile: EquipmentProfile,
): OwnedEquipmentChangePreview {
  if (program.equipmentProfileKind === targetProfile.id) {
    return {
      targetProfileKind: targetProfile.id,
      blockers: [],
      canConfirm: false,
      changes: [],
    };
  }

  const changes: OwnedEquipmentPreviewChange[] = [];
  const blockers: OwnedEquipmentPreviewBlocker[] = [];
  for (const day of program.days) {
    for (const section of day.sections) {
      for (const prescription of section.prescriptions) {
        const replacementSlug =
          prescription.exercise.kind === "catalog"
            ? starterEquipmentReplacement(targetProfile.id, {
                dayKey: day.dayKey,
                sectionKind: section.kind,
                sourceSlug: prescription.exercise.slug,
              })
            : undefined;
        if (replacementSlug) {
          changes.push({
            prescriptionId: prescription.id,
            dayDisplayName: day.displayName,
            fromName: prescription.label,
            fromSlug: prescription.exercise.slug,
            toName: getCatalogExercise(replacementSlug).name,
            toSlug: replacementSlug,
            preserved: ["sets", "rep range", "rest", "section", "order", "notes"],
            cleared: ["load target", "distance target", "movement metadata"],
          });
          continue;
        }
        if (!supportsEquipment(targetProfile, prescription.exercise.requiredEquipment)) {
          blockers.push({
            prescriptionId: prescription.id,
            dayDisplayName: day.displayName,
            exerciseName: prescription.label,
            requiredEquipment: prescription.exercise.requiredEquipment,
          });
        }
      }
    }
  }

  return {
    targetProfileKind: targetProfile.id,
    blockers,
    canConfirm: blockers.length === 0,
    changes,
  };
}
