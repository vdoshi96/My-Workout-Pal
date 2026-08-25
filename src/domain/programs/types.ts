import type { EquipmentProfileKind } from "@/domain/equipment";

export type ProgramDayName = "Push" | "Pull" | "Legs" | "Upper" | "Lower";
export type ProgramSectionKind = "strength" | "accessory" | "core";

export type Prescription = {
  exerciseSlug: string;
  displayName: string | undefined;
  section: ProgramSectionKind;
  order: number;
  sets: number;
  minimumReps: number | undefined;
  maximumReps: number | undefined;
  minimumSeconds: number | undefined;
  maximumSeconds: number | undefined;
  restSeconds: number;
  notes: string | undefined;
  targetWeightKg: number | undefined;
  previousValueLink: string | undefined;
};

export type ProgramSection = Readonly<{
  kind: ProgramSectionKind;
  prescriptionIndexes: readonly number[];
}>;

export type CardioTemplate = Readonly<{
  enabled: boolean;
  mode: "walker" | "runner";
  durationMinutes: number;
  distanceMeters: number | undefined;
  inclinePercent: number | undefined;
}>;

export type ProgramDay = {
  name: ProgramDayName;
  exerciseSlugs: string[];
  prescriptions: Prescription[];
  sections: ProgramSection[];
  cardio: Readonly<{
    walker: CardioTemplate;
    runner: CardioTemplate;
  }>;
};

export type Program = {
  id: string;
  name: string;
  equipmentProfile: EquipmentProfileKind;
  revision: number;
  days: ProgramDay[];
};
