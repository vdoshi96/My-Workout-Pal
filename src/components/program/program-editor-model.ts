import type { ProgramPublishInput } from "@/domain/programs/publication";
import type { EquipmentId } from "@/domain/equipment";
import type {
  ExerciseRole,
  LoggingKind,
} from "@/domain/exercises/catalog";
import type { ActiveProgramReadModel } from "@/server/repositories/profile-program";
import {
  displayToKilograms,
  displayToMeters,
  displayToPace,
  kilogramsToDisplay,
  metersToDisplay,
  paceToDisplay,
} from "@/components/workout/workout-runner-presenters";

export type ProgramExerciseCandidate = Readonly<{
  id: string;
  kind: "catalog" | "custom";
  loggingKind: LoggingKind;
  name: string;
  requiredEquipment: readonly EquipmentId[];
  role: ExerciseRole | null;
  searchText: string;
}>;

export const PROGRAM_SECTION_KINDS = ["strength", "accessory", "core"] as const;
export type ProgramSectionKind = (typeof PROGRAM_SECTION_KINDS)[number];
export type ProgramEditorUnitSystem = "metric" | "imperial";
export type ProgramEditorMeasurement = "weight" | "distance" | "pace";
type ProgramPrescription = ProgramPublishInput["days"][number]["sections"][number]["prescriptions"][number];
type ProgramSectionInput = ProgramPublishInput["days"][number]["sections"][number];

export type ProgramEditorSection = ProgramSectionInput & Readonly<{ draftKey: string }>;
export type ProgramEditorDay = Omit<ProgramPublishInput["days"][number], "sections"> & {
  sections: ProgramEditorSection[];
};
export type ProgramEditorDraft = Omit<ProgramPublishInput, "days"> & {
  days: ProgramEditorDay[];
};

export function programEditorExerciseCandidateKey(
  kind: ProgramExerciseCandidate["kind"],
  id: string,
): string {
  return `${kind}:${id}`;
}

export type ProgramSectionRemovalReview = Readonly<{
  confirmed: boolean;
  draftKey: string;
  exerciseNames: readonly string[];
  prescriptionKeys: readonly string[];
}>;

export function programEditorUnitLabels(
  unitSystem: ProgramEditorUnitSystem,
): Readonly<{ distance: "metres" | "miles"; pace: "seconds / km" | "seconds / mile"; weight: "kg" | "lb" }> {
  return unitSystem === "imperial"
    ? { distance: "miles", pace: "seconds / mile", weight: "lb" }
    : { distance: "metres", pace: "seconds / km", weight: "kg" };
}

function roundProgramEditorDisplayValue(value: number, fractionDigits: number): string {
  return String(Number(value.toFixed(fractionDigits)));
}

export function programEditorDisplayValue(
  value: number | null | undefined,
  measurement: ProgramEditorMeasurement,
  unitSystem: ProgramEditorUnitSystem,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "";
  if (measurement === "weight") {
    const displayValue = kilogramsToDisplay(value, unitSystem);
    return unitSystem === "imperial"
      ? roundProgramEditorDisplayValue(displayValue, 2)
      : String(displayValue);
  }
  if (measurement === "distance") {
    const displayValue = metersToDisplay(value, unitSystem);
    return unitSystem === "imperial"
      ? roundProgramEditorDisplayValue(displayValue, 4)
      : String(displayValue);
  }
  const displayValue = paceToDisplay(value, unitSystem);
  return unitSystem === "imperial"
    ? roundProgramEditorDisplayValue(displayValue, 0)
    : String(displayValue);
}

export function programEditorCanonicalValue(
  value: string,
  measurement: ProgramEditorMeasurement,
  unitSystem: ProgramEditorUnitSystem,
): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (measurement === "weight") return displayToKilograms(parsed, unitSystem);
  if (measurement === "distance") return displayToMeters(parsed, unitSystem);
  return displayToPace(parsed, unitSystem);
}

function sectionDraftKey(dayKey: string, kind: ProgramSectionKind): string {
  return `section:${dayKey}:${kind}`;
}

function editorDraftFromValue(
  input: ProgramPublishInput | ProgramEditorDraft,
  sectionDraftKeys?: readonly (readonly (string | undefined)[])[],
): ProgramEditorDraft {
  const next = structuredClone(input) as ProgramPublishInput & {
    days: Array<ProgramPublishInput["days"][number] & {
      sections: Array<ProgramSectionInput & { draftKey?: string }>;
    }>;
  };
  return {
    ...next,
    days: next.days.map((day, dayIndex) => ({
      ...day,
      sections: day.sections.map((section, sectionIndex) => {
        const sectionWithDraftKey = section as ProgramSectionInput & { draftKey?: string };
        return {
          ...section,
          draftKey:
            sectionDraftKeys?.[dayIndex]?.[sectionIndex] ??
            (typeof sectionWithDraftKey.draftKey === "string" &&
            sectionWithDraftKey.draftKey.trim().length > 0
              ? sectionWithDraftKey.draftKey
              : sectionDraftKey(day.dayKey, section.kind)),
        };
      }),
    })),
  } as ProgramEditorDraft;
}

export function programEditorDraftFromPublishInput(
  input: ProgramPublishInput,
  sectionDraftKeys?: readonly (readonly (string | undefined)[])[],
): ProgramEditorDraft {
  return editorDraftFromValue(input, sectionDraftKeys);
}

export function programEditorDraftFromReadModel(
  program: ActiveProgramReadModel,
  idempotencyKey: string,
): ProgramEditorDraft {
  return programEditorDraftFromPublishInput(
    programPublishInputFromReadModel(program, idempotencyKey),
    program.days.map((day) => day.sections.map((section) => section.id)),
  );
}

function editorDraftClone(input: ProgramPublishInput | ProgramEditorDraft): ProgramEditorDraft {
  return editorDraftFromValue(input);
}

function sectionAtEditor(
  input: ProgramPublishInput | ProgramEditorDraft,
  dayIndex: number,
  sectionIndex: number,
): ProgramEditorSection {
  const section = input.days[dayIndex]?.sections[sectionIndex];
  if (!section) throw new RangeError("The requested program section is unavailable.");
  return section as ProgramEditorSection;
}

function prescriptionDraftKey(
  section: ProgramEditorSection,
  prescription: ProgramPrescription,
  prescriptionIndex: number,
): string {
  return prescription.sourcePrescriptionId ?? `${section.draftKey}:prescription:${prescriptionIndex}`;
}

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

function defaultSectionTitle(kind: ProgramSectionKind): string {
  return kind[0]!.toUpperCase() + kind.slice(1);
}

export function addProgramSection(
  input: ProgramPublishInput | ProgramEditorDraft,
  dayIndex: number,
  kind: ProgramSectionKind,
  draftKey?: string,
): ProgramEditorDraft {
  const next = editorDraftClone(input);
  const day = next.days[dayIndex];
  if (!day) throw new RangeError("The requested program day is unavailable.");
  if (!PROGRAM_SECTION_KINDS.includes(kind)) {
    throw new RangeError("The requested program section kind is unavailable.");
  }
  if (day.sections.some((section) => section.kind === kind)) {
    throw new RangeError(`A ${kind} section already exists on this day.`);
  }
  if (kind === "core") {
    throw new RangeError("A required core section cannot be added as an ordinary draft section.");
  }
  const normalizedDraftKey = draftKey?.trim();
  if (draftKey !== undefined && !normalizedDraftKey) {
    throw new RangeError("A program section draft key is required.");
  }
  day.sections.push({
    draftKey: normalizedDraftKey ?? sectionDraftKey(day.dayKey, kind),
    kind,
    prescriptions: [],
    title: defaultSectionTitle(kind),
  });
  return next;
}

export function renameProgramSection(
  input: ProgramPublishInput | ProgramEditorDraft,
  dayIndex: number,
  sectionIndex: number,
  title: string,
): ProgramEditorDraft {
  const next = editorDraftClone(input);
  sectionAtEditor(next, dayIndex, sectionIndex).title = title;
  return next;
}

export function reorderProgramSection(
  input: ProgramPublishInput | ProgramEditorDraft,
  dayIndex: number,
  sectionIndex: number,
  direction: -1 | 1,
): ProgramEditorDraft {
  const next = editorDraftClone(input);
  const day = next.days[dayIndex];
  if (!day) throw new RangeError("The requested program day is unavailable.");
  const targetIndex = sectionIndex + direction;
  if (
    sectionIndex < 0 ||
    sectionIndex >= day.sections.length ||
    targetIndex < 0 ||
    targetIndex >= day.sections.length
  ) {
    throw new RangeError("The section move is outside this day.");
  }
  const [moved] = day.sections.splice(sectionIndex, 1);
  if (!moved) throw new RangeError("The section move is outside this day.");
  day.sections.splice(targetIndex, 0, moved);
  return next;
}

export function reviewProgramSectionRemoval(
  input: ProgramPublishInput | ProgramEditorDraft,
  dayIndex: number,
  sectionIndex: number,
  exerciseNames: readonly string[],
): ProgramSectionRemovalReview {
  const section = sectionAtEditor(editorDraftClone(input), dayIndex, sectionIndex);
  if (exerciseNames.length !== section.prescriptions.length) {
    throw new RangeError("The section removal review must name every movement.");
  }
  const names = exerciseNames.map((name) => name.trim());
  if (names.some((name) => name.length === 0)) {
    throw new RangeError("The section removal review must name every movement.");
  }
  return {
    confirmed: false,
    draftKey: section.draftKey,
    exerciseNames: names,
    prescriptionKeys: section.prescriptions.map((prescription, prescriptionIndex) =>
      prescriptionDraftKey(section, prescription, prescriptionIndex),
    ),
  };
}

export function removeProgramSection(
  input: ProgramPublishInput | ProgramEditorDraft,
  dayIndex: number,
  sectionIndex: number,
  review: ProgramSectionRemovalReview,
): ProgramEditorDraft {
  const next = editorDraftClone(input);
  const day = next.days[dayIndex];
  if (!day) throw new RangeError("The requested program day is unavailable.");
  const section = sectionAtEditor(next, dayIndex, sectionIndex);
  const coreSectionCount = day.sections.filter(({ kind }) => kind === "core").length;
  if (section.kind === "core" || coreSectionCount !== 1) {
    throw new RangeError("Every day must retain its core section.");
  }
  if (day.sections.length <= 1) {
    throw new RangeError("A day must retain at least one section.");
  }
  const currentKeys = section.prescriptions.map((prescription, prescriptionIndex) =>
    prescriptionDraftKey(section, prescription, prescriptionIndex),
  );
  if (
    !review.confirmed ||
    review.draftKey !== section.draftKey ||
    review.exerciseNames.length !== section.prescriptions.length ||
    review.exerciseNames.some((name) => name.trim().length === 0) ||
    review.prescriptionKeys.length !== currentKeys.length ||
    review.prescriptionKeys.some((key, index) => key !== currentKeys[index])
  ) {
    throw new RangeError(
      "The section removal review is incomplete or stale; confirm the named movements before removing.",
    );
  }
  day.sections.splice(sectionIndex, 1);
  return next;
}

export function validateProgramSectionStructure(
  input: ProgramPublishInput | ProgramEditorDraft,
): readonly string[] {
  const issues: string[] = [];
  for (const day of input.days) {
    if (day.sections.length === 0) {
      issues.push(`${day.displayName} needs at least one section.`);
      continue;
    }
    const coreSections = day.sections.filter((section) => section.kind === "core");
    if (coreSections.length !== 1) {
      issues.push(`${day.displayName} must contain exactly one core section.`);
    }
    const seenKinds = new Set<ProgramSectionKind>();
    for (const section of day.sections) {
      if (seenKinds.has(section.kind)) {
        issues.push(`${day.displayName} cannot contain duplicate ${section.kind} sections.`);
      }
      seenKinds.add(section.kind);
      if (section.prescriptions.length === 0) {
        issues.push(`${day.displayName} ${section.title} needs at least one movement.`);
      }
    }
  }
  return issues;
}

export function reorderProgramPrescription<T extends ProgramPublishInput>(
  input: T,
  dayIndex: number,
  sectionIndex: number,
  prescriptionIndex: number,
  direction: -1 | 1,
): T {
  const next = structuredClone(input) as T;
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

export function addProgramPrescription<T extends ProgramPublishInput>(
  input: T,
  dayIndex: number,
  sectionIndex: number,
  candidate: ProgramExerciseCandidate,
): T {
  const next = structuredClone(input) as T;
  const section = sectionAt(next, dayIndex, sectionIndex);
  section.prescriptions.push(defaultPrescription(section.kind, candidate));
  return next;
}

export function replaceProgramPrescription<T extends ProgramPublishInput>(
  input: T,
  dayIndex: number,
  sectionIndex: number,
  prescriptionIndex: number,
  candidate: ProgramExerciseCandidate,
  currentLoggingKind: LoggingKind,
): T {
  const next = structuredClone(input) as T;
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

export function removeProgramPrescription<T extends ProgramPublishInput>(
  input: T,
  dayIndex: number,
  sectionIndex: number,
  prescriptionIndex: number,
): T {
  const next = structuredClone(input) as T;
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
  input: ProgramPublishInput | ProgramEditorDraft,
  candidates: readonly ProgramExerciseCandidate[],
): readonly string[] {
  const candidateByKey = new Map(
    candidates.map((candidate) => [
      programEditorExerciseCandidateKey(candidate.kind, candidate.id),
      candidate,
    ] as const),
  );
  const issues: string[] = [...validateProgramSectionStructure(input)];
  for (const day of input.days) {
    for (const section of day.sections) {
      for (const prescription of section.prescriptions) {
        const candidateKey = prescription.catalogExerciseId !== null
          ? programEditorExerciseCandidateKey("catalog", prescription.catalogExerciseId)
          : prescription.customExerciseId !== null
            ? programEditorExerciseCandidateKey("custom", prescription.customExerciseId)
            : undefined;
        const candidate = candidateKey ? candidateByKey.get(candidateKey) : undefined;
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

export function stripLocalProgramPrescriptionIds(
  input: ProgramPublishInput | ProgramEditorDraft,
  localIds: ReadonlySet<string>,
): ProgramPublishInput {
  const next = editorDraftClone(input);
  for (const day of next.days) {
    for (const section of day.sections) {
      for (const prescription of section.prescriptions) {
        if (
          prescription.sourcePrescriptionId !== null &&
          localIds.has(prescription.sourcePrescriptionId)
        ) {
          prescription.sourcePrescriptionId = null;
        }
      }
    }
  }
  return {
    ...next,
    days: next.days.map((day) => ({
      ...day,
      sections: day.sections.map(({ draftKey, ...section }) => {
        void draftKey;
        return section;
      }),
    })) as ProgramPublishInput["days"],
  };
}
