import type { ProgramPublishInput } from "@/domain/programs/publication";
import type { ActiveProgramReadModel } from "@/server/repositories/profile-program";

export function programPublishInputFromReadModel(
  program: ActiveProgramReadModel,
  idempotencyKey: string,
): ProgramPublishInput {
  return {
    baseRevisionId: program.revisionId,
    idempotencyKey,
    name: program.name,
    programId: program.id,
    days: program.days.map((day) => ({
      cardio: day.cardio.map((cardio) => ({
        distanceM: cardio.distanceM,
        durationSeconds: cardio.durationSeconds,
        inclinePercent: cardio.inclinePercent,
        mode: cardio.mode,
        notes: cardio.notes,
        paceSecondsPerKm: cardio.paceSecondsPerKm,
      })) as ProgramPublishInput["days"][number]["cardio"],
      dayKey: day.dayKey as ProgramPublishInput["days"][number]["dayKey"],
      dayNumber: day.dayNumber,
      displayName: day.displayName,
      sections: day.sections.map((section) => ({
        kind: section.kind as ProgramPublishInput["days"][number]["sections"][number]["kind"],
        prescriptions: section.prescriptions.map((prescription) => ({
          catalogExerciseId: prescription.catalogExerciseId,
          customExerciseId: prescription.customExerciseId,
          displayName: prescription.displayName,
          maximumReps: prescription.maximumReps,
          maximumSeconds: prescription.maximumSeconds,
          minimumReps: prescription.minimumReps,
          minimumSeconds: prescription.minimumSeconds,
          notes: prescription.notes,
          restSeconds: prescription.restSeconds,
          setCount: prescription.setCount,
          setKind: prescription.setKind,
          sourcePrescriptionId: prescription.id,
          targetDistanceM: prescription.targetDistanceM,
          targetWeightKg: prescription.targetWeightKg,
        })),
        title: section.title,
      })),
    })) as ProgramPublishInput["days"],
  };
}

export function reorderProgramPrescription(
  input: ProgramPublishInput,
  dayIndex: number,
  sectionIndex: number,
  prescriptionIndex: number,
  direction: -1 | 1,
): ProgramPublishInput {
  const next = structuredClone(input);
  const section = next.days[dayIndex]?.sections[sectionIndex];
  const targetIndex = prescriptionIndex + direction;
  if (
    !section ||
    prescriptionIndex < 0 ||
    prescriptionIndex >= section.prescriptions.length ||
    targetIndex < 0 ||
    targetIndex >= section.prescriptions.length
  ) {
    throw new RangeError("The prescription move is outside this section.");
  }
  const [moved] = section.prescriptions.splice(prescriptionIndex, 1);
  if (!moved) throw new RangeError("The prescription move is outside this section.");
  section.prescriptions.splice(targetIndex, 0, moved);
  return next;
}
