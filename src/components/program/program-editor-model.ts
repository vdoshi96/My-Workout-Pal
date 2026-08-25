import type { ProgramPublishInput } from "@/domain/programs/publication";
import type { EquipmentId } from "@/domain/equipment";
import type {
  ExerciseRole,
  LoggingKind,
} from "@/domain/exercises/catalog";
import type { ActiveProgramReadModel } from "@/server/repositories/profile-program";

export type ProgramExerciseCandidate = Readonly<{
  id: string;
  kind: "catalog" | "custom";
  loggingKind: LoggingKind;
  name: string;
  requiredEquipment: readonly EquipmentId[];
  role: ExerciseRole | null;
  searchText: string;
}>;

type ProgramSectionKind = ProgramPublishInput["days"][number]["sections"][number]["kind"];
type ProgramPrescription = ProgramPublishInput["days"][number]["sections"][number]["prescriptions"][number];

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

function sectionAt(
  input: ProgramPublishInput,
  dayIndex: number,
  sectionIndex: number,
) {
  const section = input.days[dayIndex]?.sections[sectionIndex];
  if (!section) throw new RangeError("The requested program section is unavailable.");
  return section;
}

function candidateReference(candidate: ProgramExerciseCandidate) {
  return candidate.kind === "catalog"
    ? { catalogExerciseId: candidate.id, customExerciseId: null }
    : { catalogExerciseId: null, customExerciseId: candidate.id };
}

function defaultPrescription(
  sectionKind: ProgramSectionKind,
  candidate: ProgramExerciseCandidate,
): ProgramPrescription {
  const duration =
    candidate.loggingKind === "duration" ||
    candidate.loggingKind === "distance_duration";
  const repetitionRange = sectionKind === "accessory"
    ? { minimum: 10, maximum: 15 }
    : sectionKind === "strength"
      ? { minimum: 8, maximum: 12 }
      : { minimum: 8, maximum: 15 };

  return {
    ...candidateReference(candidate),
    displayName: null,
    maximumReps: duration ? null : repetitionRange.maximum,
    maximumSeconds: duration ? 45 : null,
    minimumReps: duration ? null : repetitionRange.minimum,
    minimumSeconds: duration ? 20 : null,
    notes: null,
    restSeconds: sectionKind === "strength" ? 90 : 60,
    setCount: sectionKind === "strength" ? 3 : 2,
    setKind: "work",
    sourcePrescriptionId: null,
    targetDistanceM: null,
    targetWeightKg: null,
  };
}

export function addProgramPrescription(
  input: ProgramPublishInput,
  dayIndex: number,
  sectionIndex: number,
  candidate: ProgramExerciseCandidate,
): ProgramPublishInput {
  const next = structuredClone(input);
  const section = sectionAt(next, dayIndex, sectionIndex);
  section.prescriptions.push(defaultPrescription(section.kind, candidate));
  return next;
}

export function replaceProgramPrescription(
  input: ProgramPublishInput,
  dayIndex: number,
  sectionIndex: number,
  prescriptionIndex: number,
  candidate: ProgramExerciseCandidate,
  currentLoggingKind: LoggingKind,
): ProgramPublishInput {
  const next = structuredClone(input);
  const section = sectionAt(next, dayIndex, sectionIndex);
  const current = section.prescriptions[prescriptionIndex];
  if (!current) throw new RangeError("The requested program movement is unavailable.");
  const reference = candidateReference(candidate);
  if (candidate.loggingKind === currentLoggingKind) {
    section.prescriptions[prescriptionIndex] = {
      ...current,
      ...reference,
      displayName: null,
    };
    return next;
  }

  section.prescriptions[prescriptionIndex] = {
    ...defaultPrescription(section.kind, candidate),
    notes: current.notes,
    restSeconds: current.restSeconds,
    setCount: current.setCount,
    setKind: current.setKind,
    sourcePrescriptionId: current.sourcePrescriptionId,
  };
  return next;
}

export function removeProgramPrescription(
  input: ProgramPublishInput,
  dayIndex: number,
  sectionIndex: number,
  prescriptionIndex: number,
): ProgramPublishInput {
  const next = structuredClone(input);
  const section = sectionAt(next, dayIndex, sectionIndex);
  if (section.prescriptions.length <= 1) {
    throw new RangeError("The last movement in a section cannot be removed.");
  }
  if (!section.prescriptions[prescriptionIndex]) {
    throw new RangeError("The requested program movement is unavailable.");
  }
  section.prescriptions.splice(prescriptionIndex, 1);
  return next;
}

export function filterProgramExerciseCandidates(
  candidates: readonly ProgramExerciseCandidate[],
  query: string,
): readonly ProgramExerciseCandidate[] {
  const terms = query
    .trim()
    .slice(0, 120)
    .toLocaleLowerCase("en-US")
    .split(/\s+/u)
    .filter(Boolean);
  if (terms.length === 0) return candidates;
  return candidates.filter((candidate) => {
    const searchable = [
      candidate.name,
      candidate.kind,
      candidate.loggingKind.replaceAll("_", " "),
      ...candidate.requiredEquipment,
      candidate.searchText,
    ]
      .join(" ")
      .toLocaleLowerCase("en-US");
    return terms.every((term) => searchable.includes(term));
  });
}

export function validateProgramExerciseSelections(
  input: ProgramPublishInput,
  candidates: readonly ProgramExerciseCandidate[],
): readonly string[] {
  const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate] as const));
  const issues: string[] = [];
  for (const day of input.days) {
    for (const section of day.sections) {
      if (section.prescriptions.length === 0) {
        issues.push(`${day.displayName} ${section.title} needs at least one movement.`);
      }
      for (const prescription of section.prescriptions) {
        const id = prescription.catalogExerciseId ?? prescription.customExerciseId;
        const candidate = id ? candidateById.get(id) : undefined;
        if (!candidate) {
          issues.push(`${prescription.displayName ?? "A selected movement"} is no longer available.`);
          continue;
        }
        if (
          candidate.loggingKind === "distance_duration" &&
          (prescription.targetDistanceM === null || prescription.targetDistanceM <= 0)
        ) {
          issues.push(`${candidate.name} needs a positive distance target before publication.`);
        }
      }
    }
  }
  return issues;
}
