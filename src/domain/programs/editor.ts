import type { EquipmentProfileKind } from "@/domain/equipment";
import type {
  CardioTemplate,
  Prescription,
  Program,
  ProgramDayName,
  ProgramSection,
  ProgramSectionKind,
} from "@/domain/programs/types";

export type DraftPrescription = Prescription & Readonly<{ clientKey: string }>;

export type DraftProgramDay = {
  clientKey: string;
  name: ProgramDayName;
  exerciseSlugs: string[];
  prescriptions: DraftPrescription[];
  sections: ProgramSection[];
  cardio: {
    walker: CardioTemplate;
    runner: CardioTemplate;
  };
};

export type ProgramDraft = {
  programId: string;
  baseRevision: number;
  name: string;
  equipmentProfile: EquipmentProfileKind;
  days: DraftProgramDay[];
};

export type ProgramDraftIssueCode =
  | "day_empty"
  | "duration_range_invalid"
  | "logging_range_missing"
  | "program_name_required"
  | "program_name_too_long"
  | "rep_range_invalid"
  | "rest_out_of_range"
  | "sets_out_of_range"
  | "target_weight_invalid";

export type ProgramDraftIssue = Readonly<{
  code: ProgramDraftIssueCode;
  message: string;
  path: string;
}>;

export class ProgramDraftConflictError extends Error {
  readonly actualRevision: number;
  readonly expectedRevision: number;

  constructor(expectedRevision: number, actualRevision: number) {
    super("The active program changed while this draft was open.");
    this.name = "ProgramDraftConflictError";
    this.expectedRevision = expectedRevision;
    this.actualRevision = actualRevision;
  }
}

export class ProgramDraftValidationError extends Error {
  readonly issues: readonly ProgramDraftIssue[];

  constructor(issues: readonly ProgramDraftIssue[]) {
    super("The program draft has validation errors.");
    this.name = "ProgramDraftValidationError";
    this.issues = issues;
  }
}

function prescriptionKey(
  programId: string,
  revision: number,
  dayIndex: number,
  prescriptionIndex: number,
): string {
  return `${programId}:${revision}:day:${dayIndex}:prescription:${prescriptionIndex}`;
}

function rebuildDay(day: DraftProgramDay): void {
  day.prescriptions.forEach((prescription, index) => {
    prescription.order = index;
  });
  day.exerciseSlugs = day.prescriptions.map((prescription) => prescription.exerciseSlug);

  const sectionKinds: readonly ProgramSectionKind[] = ["strength", "accessory", "core"];
  day.sections = sectionKinds
    .map((kind) => ({
      kind,
      prescriptionIndexes: day.prescriptions
        .map((prescription, index) => (prescription.section === kind ? index : -1))
        .filter((index) => index >= 0),
    }))
    .filter((section) => section.prescriptionIndexes.length > 0);
}

export function beginProgramDraft(program: Program): ProgramDraft {
  return {
    programId: program.id,
    baseRevision: program.revision,
    name: program.name,
    equipmentProfile: program.equipmentProfile,
    days: program.days.map((day, dayIndex) => ({
      clientKey: `${program.id}:${program.revision}:day:${dayIndex}`,
      name: day.name,
      exerciseSlugs: [...day.exerciseSlugs],
      prescriptions: day.prescriptions.map((prescription, prescriptionIndex) => ({
        ...structuredClone(prescription),
        clientKey: prescriptionKey(
          program.id,
          program.revision,
          dayIndex,
          prescriptionIndex,
        ),
      })),
      sections: structuredClone(day.sections),
      cardio: structuredClone(day.cardio),
    })),
  };
}

export function moveDraftPrescription(
  draft: ProgramDraft,
  dayClientKey: string,
  prescriptionClientKey: string,
  targetIndex: number,
  targetSection?: ProgramSectionKind,
): ProgramDraft {
  const next = structuredClone(draft);
  const day = next.days.find((candidate) => candidate.clientKey === dayClientKey);
  if (!day) throw new Error("The selected program day is no longer available.");

  const sourceIndex = day.prescriptions.findIndex(
    (prescription) => prescription.clientKey === prescriptionClientKey,
  );
  if (sourceIndex < 0) throw new Error("The selected prescription is no longer available.");
  if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= day.prescriptions.length) {
    throw new RangeError("The destination position is outside this day.");
  }

  const [moved] = day.prescriptions.splice(sourceIndex, 1);
  if (!moved) throw new Error("The selected prescription is no longer available.");
  if (targetSection) moved.section = targetSection;
  day.prescriptions.splice(targetIndex, 0, moved);
  rebuildDay(day);
  return next;
}

type EditablePrescriptionFields = Pick<
  Prescription,
  | "displayName"
  | "maximumReps"
  | "maximumSeconds"
  | "minimumReps"
  | "minimumSeconds"
  | "notes"
  | "previousValueLink"
  | "restSeconds"
  | "sets"
  | "targetWeightKg"
>;

export function updateDraftPrescription(
  draft: ProgramDraft,
  prescriptionClientKey: string,
  update: Partial<EditablePrescriptionFields>,
): ProgramDraft {
  const next = structuredClone(draft);
  const prescription = next.days
    .flatMap((day) => day.prescriptions)
    .find((candidate) => candidate.clientKey === prescriptionClientKey);
  if (!prescription) throw new Error("The selected prescription is no longer available.");
  Object.assign(prescription, update);
  return next;
}

function isPositiveInteger(value: number | undefined): value is number {
  return value !== undefined && Number.isInteger(value) && value > 0;
}

export function validateProgramDraft(draft: ProgramDraft): ProgramDraftIssue[] {
  const issues: ProgramDraftIssue[] = [];
  const trimmedName = draft.name.trim();
  if (!trimmedName) {
    issues.push({
      code: "program_name_required",
      message: "Enter a program name.",
      path: "name",
    });
  } else if (trimmedName.length > 80) {
    issues.push({
      code: "program_name_too_long",
      message: "Program names can contain at most 80 characters.",
      path: "name",
    });
  }

  draft.days.forEach((day, dayIndex) => {
    if (day.prescriptions.length === 0) {
      issues.push({
        code: "day_empty",
        message: "Add at least one exercise to this day.",
        path: `days.${dayIndex}.prescriptions`,
      });
    }

    day.prescriptions.forEach((prescription, prescriptionIndex) => {
      const path = `days.${dayIndex}.prescriptions.${prescriptionIndex}`;
      if (!Number.isInteger(prescription.sets) || prescription.sets < 1 || prescription.sets > 20) {
        issues.push({
          code: "sets_out_of_range",
          message: "Sets must be a whole number from 1 to 20.",
          path: `${path}.sets`,
        });
      }
      if (
        !Number.isInteger(prescription.restSeconds) ||
        prescription.restSeconds < 0 ||
        prescription.restSeconds > 900
      ) {
        issues.push({
          code: "rest_out_of_range",
          message: "Rest must be a whole number from 0 to 900 seconds.",
          path: `${path}.restSeconds`,
        });
      }

      const hasReps = prescription.minimumReps !== undefined || prescription.maximumReps !== undefined;
      const hasDuration =
        prescription.minimumSeconds !== undefined || prescription.maximumSeconds !== undefined;
      if (hasReps === hasDuration) {
        issues.push({
          code: "logging_range_missing",
          message: "Use one complete repetition or duration range.",
          path,
        });
      } else if (
        hasReps &&
        (!isPositiveInteger(prescription.minimumReps) ||
          !isPositiveInteger(prescription.maximumReps) ||
          prescription.minimumReps > prescription.maximumReps)
      ) {
        issues.push({
          code: "rep_range_invalid",
          message: "The repetition range must use positive whole numbers in ascending order.",
          path: `${path}.repetitions`,
        });
      } else if (
        hasDuration &&
        (!isPositiveInteger(prescription.minimumSeconds) ||
          !isPositiveInteger(prescription.maximumSeconds) ||
          prescription.minimumSeconds > prescription.maximumSeconds)
      ) {
        issues.push({
          code: "duration_range_invalid",
          message: "The duration range must use positive whole seconds in ascending order.",
          path: `${path}.duration`,
        });
      }

      if (
        prescription.targetWeightKg !== undefined &&
        (!Number.isFinite(prescription.targetWeightKg) || prescription.targetWeightKg < 0)
      ) {
        issues.push({
          code: "target_weight_invalid",
          message: "Target weight cannot be negative.",
          path: `${path}.targetWeightKg`,
        });
      }
    });
  });

  return issues;
}

export type PreparedProgramPublication = Readonly<{
  baseRevision: number;
  nextRevision: number;
  program: Program;
}>;

export function prepareProgramPublication(
  draft: ProgramDraft,
  activeRevision: number,
): PreparedProgramPublication {
  if (draft.baseRevision !== activeRevision) {
    throw new ProgramDraftConflictError(draft.baseRevision, activeRevision);
  }

  const issues = validateProgramDraft(draft);
  if (issues.length > 0) throw new ProgramDraftValidationError(issues);

  const nextRevision = activeRevision + 1;
  const program: Program = {
    id: draft.programId,
    name: draft.name.trim(),
    equipmentProfile: draft.equipmentProfile,
    revision: nextRevision,
    days: draft.days.map((day) => ({
      name: day.name,
      exerciseSlugs: [...day.exerciseSlugs],
      prescriptions: day.prescriptions.map(({ clientKey, ...prescription }) => {
        void clientKey;
        return structuredClone(prescription);
      }),
      sections: structuredClone(day.sections),
      cardio: structuredClone(day.cardio),
    })),
  };

  return { baseRevision: activeRevision, nextRevision, program };
}
