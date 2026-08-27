import {
  PROGRAM_DAY_MAXIMUM,
  PROGRAM_DAY_MINIMUM,
  PROGRAM_DAY_MOVEMENT_MINIMUM,
  PROGRAM_DAY_MOVEMENT_MAXIMUM,
  PROGRAM_MOVEMENT_MAXIMUM,
  type ProgramPublishInput,
} from "@/domain/programs/publication";
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
export const PROGRAM_CARDIO_MODES = ["walker", "runner"] as const;
export type ProgramCardioMode = (typeof PROGRAM_CARDIO_MODES)[number];
export const PROGRAM_SECTION_MAXIMUM = 12;
export type ProgramEditorUnitSystem = "metric" | "imperial";
export type ProgramEditorMeasurement = "weight" | "distance" | "pace";
type ProgramPrescription = ProgramPublishInput["days"][number]["sections"][number]["prescriptions"][number];
type ProgramSectionInput = ProgramPublishInput["days"][number]["sections"][number];
type ProgramDayInput = ProgramPublishInput["days"][number];
type ProgramCardioInput = ProgramDayInput["cardio"][number];

export type ProgramEditorSection = ProgramSectionInput & Readonly<{ draftKey: string }>;
export type ProgramEditorDay = Omit<ProgramPublishInput["days"][number], "sections"> & {
  sections: ProgramEditorSection[];
};
export type ProgramEditorDraft = Omit<ProgramPublishInput, "days"> & {
  days: ProgramEditorDay[];
};

export type ProgramDayCreateOptions = Readonly<{
  candidate?: ProgramExerciseCandidate;
  dayKey?: string;
  displayName: string;
  insertAt?: number;
  sectionKey?: string;
  sectionKind?: ProgramSectionKind;
  sectionTitle?: string;
}>;

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

export type ProgramDayRemovalReview = Readonly<{
  confirmed: boolean;
  dayKey: string;
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

function createTopologyKey(usedKeys?: ReadonlySet<string>): string {
  let key = globalThis.crypto.randomUUID();
  while (usedKeys?.has(key)) key = globalThis.crypto.randomUUID();
  return key;
}

function isOpaqueTopologyKey(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}

function stableReadKey(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
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
              : section.sectionKey),
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
    program.days.map((day) =>
      day.sections.map((section) =>
        stableReadKey(
          (section as ActiveProgramSectionReadModelWithStableKey).sectionKey,
          section.id,
        ),
      ),
    ),
  );
}

type ActiveProgramSectionReadModelWithStableKey = ActiveProgramReadModel["days"][number]["sections"][number] & {
  sectionKey?: string;
};

type ActiveProgramPrescriptionReadModelWithStableKey = ActiveProgramReadModel["days"][number]["prescriptions"][number] & {
  prescriptionKey?: string;
};

type ActiveProgramCardioReadModelWithStableKey = ActiveProgramReadModel["days"][number]["cardio"][number] & {
  cardioKey?: string;
};

function editorDraftClone(input: ProgramPublishInput | ProgramEditorDraft): ProgramEditorDraft {
  return editorDraftFromValue(input);
}

function resolveDayIndex(
  input: ProgramPublishInput | ProgramEditorDraft,
  dayIndexOrKey: number | string,
): number {
  if (typeof dayIndexOrKey === "number") return dayIndexOrKey;
  const index = input.days.findIndex((day) => day.dayKey === dayIndexOrKey);
  if (index < 0) throw new RangeError("The requested program day is unavailable.");
  return index;
}

function normalizeDayNumbers(days: ProgramEditorDay[]): void {
  days.forEach((day, index) => {
    day.dayNumber = index + 1;
  });
}

function collectTopologyKeys(input: ProgramPublishInput | ProgramEditorDraft): Set<string> {
  return new Set([
    ...input.days.map((day) => day.dayKey),
    ...input.days.flatMap((day) => day.sections.map((section) => section.sectionKey)),
    ...input.days.flatMap((day) =>
      day.sections.flatMap((section) =>
        section.prescriptions.map((prescription) => prescription.prescriptionKey),
      ),
    ),
    ...input.days.flatMap((day) => day.cardio.map((cardio) => cardio.cardioKey)),
  ]);
}

function dayAtEditor(
  input: ProgramPublishInput | ProgramEditorDraft,
  dayIndexOrKey: number | string,
): ProgramEditorDay {
  const day = input.days[resolveDayIndex(input, dayIndexOrKey)];
  if (!day) throw new RangeError("The requested program day is unavailable.");
  return day as ProgramEditorDay;
}

export function addProgramDay(
  input: ProgramPublishInput | ProgramEditorDraft,
  options: ProgramDayCreateOptions,
): ProgramEditorDraft {
  const next = editorDraftClone(input);
  if (next.days.length >= PROGRAM_DAY_MAXIMUM) {
    throw new RangeError(`A routine can contain at most ${PROGRAM_DAY_MAXIMUM} days.`);
  }
  const displayName = options.displayName.trim();
  if (displayName.length === 0 || displayName.length > 120) {
    throw new RangeError("A program day name must be between 1 and 120 characters.");
  }
  const sectionTitle = (options.sectionTitle ?? "Strength").trim();
  if (sectionTitle.length === 0 || sectionTitle.length > 120) {
    throw new RangeError("A program section name must be between 1 and 120 characters.");
  }
  const usedKeys = collectTopologyKeys(next);
  const dayKey = options.dayKey?.trim() || createTopologyKey(usedKeys);
  if (!isOpaqueTopologyKey(dayKey)) {
    throw new RangeError("A newly added program day needs an opaque UUID key.");
  }
  if (usedKeys.has(dayKey)) throw new RangeError("The program day key is already in use.");
  usedKeys.add(dayKey);
  const sectionKey = options.sectionKey?.trim() || createTopologyKey(usedKeys);
  if (!isOpaqueTopologyKey(sectionKey) || usedKeys.has(sectionKey)) {
    throw new RangeError("A newly added program section needs a fresh opaque UUID key.");
  }
  usedKeys.add(sectionKey);
  const sectionKind = options.sectionKind ?? "strength";
  const section: ProgramEditorSection = {
    draftKey: sectionKey,
    kind: sectionKind,
    prescriptions: options.candidate
      ? [defaultPrescription(sectionKind, options.candidate, usedKeys)]
      : [],
    sectionKey,
    title: sectionTitle,
  };
  const day: ProgramEditorDay = {
    cardio: [],
    dayKey,
    dayNumber: next.days.length + 1,
    displayName,
    sections: [section],
  };
  const insertAt = options.insertAt ?? next.days.length;
  if (!Number.isInteger(insertAt) || insertAt < 0 || insertAt > next.days.length) {
    throw new RangeError("The program day insertion point is outside the routine.");
  }
  next.days.splice(insertAt, 0, day);
  normalizeDayNumbers(next.days);
  return next;
}

export function renameProgramDay(
  input: ProgramPublishInput | ProgramEditorDraft,
  dayIndexOrKey: number | string,
  displayName: string,
): ProgramEditorDraft {
  const next = editorDraftClone(input);
  const day = dayAtEditor(next, dayIndexOrKey);
  day.displayName = displayName;
  return next;
}

export type ProgramDayDuplicateOptions = Readonly<{
  dayKey?: string;
  insertAt?: number;
}>;

export function duplicateProgramDay(
  input: ProgramPublishInput | ProgramEditorDraft,
  dayIndexOrKey: number | string,
  options: number | ProgramDayDuplicateOptions = {},
): ProgramEditorDraft {
  const next = editorDraftClone(input);
  if (next.days.length >= PROGRAM_DAY_MAXIMUM) {
    throw new RangeError(`A routine can contain at most ${PROGRAM_DAY_MAXIMUM} days.`);
  }
  const sourceIndex = resolveDayIndex(next, dayIndexOrKey);
  const source = next.days[sourceIndex];
  if (!source) throw new RangeError("The requested program day is unavailable.");
  const duplicateOptions = typeof options === "number" ? { insertAt: options } : options;
  const usedKeys = collectTopologyKeys(next);
  const dayKey = duplicateOptions.dayKey?.trim() || createTopologyKey(usedKeys);
  if (!isOpaqueTopologyKey(dayKey) || usedKeys.has(dayKey)) {
    throw new RangeError("A duplicated program day needs a fresh opaque UUID key.");
  }
  usedKeys.add(dayKey);
  const duplicate = structuredClone(source) as ProgramEditorDay;
  duplicate.dayKey = dayKey;
  duplicate.sections = duplicate.sections.map((section) => {
    const sectionKey = createTopologyKey(usedKeys);
    usedKeys.add(sectionKey);
    return {
      ...section,
      draftKey: sectionKey,
      sectionKey,
      prescriptions: section.prescriptions.map((prescription) => {
        const prescriptionKey = createTopologyKey(usedKeys);
        usedKeys.add(prescriptionKey);
        return { ...prescription, prescriptionKey };
      }),
    };
  });
  duplicate.cardio = duplicate.cardio.map((cardio) => {
    const cardioKey = createTopologyKey(usedKeys);
    usedKeys.add(cardioKey);
    return { ...cardio, cardioKey };
  }) as ProgramDayInput["cardio"];
  const insertAt = duplicateOptions.insertAt ?? sourceIndex + 1;
  if (!Number.isInteger(insertAt) || insertAt < 0 || insertAt > next.days.length) {
    throw new RangeError("The duplicated day insertion point is outside the routine.");
  }
  next.days.splice(insertAt, 0, duplicate);
  normalizeDayNumbers(next.days);
  return next;
}

export function reorderProgramDay(
  input: ProgramPublishInput | ProgramEditorDraft,
  dayIndexOrKey: number | string,
  direction: -1 | 1,
): ProgramEditorDraft {
  const next = editorDraftClone(input);
  const dayIndex = resolveDayIndex(next, dayIndexOrKey);
  if (dayIndex < 0 || dayIndex >= next.days.length) {
    throw new RangeError("The requested program day is unavailable.");
  }
  const targetIndex = dayIndex + direction;
  if (targetIndex < 0 || targetIndex >= next.days.length) {
    throw new RangeError("The day move is outside this routine.");
  }
  const [moved] = next.days.splice(dayIndex, 1);
  if (!moved) throw new RangeError("The day move is outside this routine.");
  next.days.splice(targetIndex, 0, moved);
  normalizeDayNumbers(next.days);
  return next;
}

export function reviewProgramDayRemoval(
  input: ProgramPublishInput | ProgramEditorDraft,
  dayIndexOrKey: number | string,
  exerciseNames: readonly string[],
): ProgramDayRemovalReview {
  const day = dayAtEditor(editorDraftClone(input), dayIndexOrKey);
  const prescriptions = day.sections.flatMap(({ prescriptions }) => prescriptions);
  if (exerciseNames.length !== prescriptions.length) {
    throw new RangeError("The day removal review must name every movement.");
  }
  const names = exerciseNames.map((name) => name.trim());
  if (names.some((name) => name.length === 0)) {
    throw new RangeError("The day removal review must name every movement.");
  }
  return {
    confirmed: false,
    dayKey: day.dayKey,
    exerciseNames: names,
    prescriptionKeys: prescriptions.map(({ prescriptionKey }) => prescriptionKey),
  };
}

export function removeProgramDay(
  input: ProgramPublishInput | ProgramEditorDraft,
  dayIndexOrKey: number | string,
  review: ProgramDayRemovalReview,
): ProgramEditorDraft {
  const next = editorDraftClone(input);
  if (next.days.length <= PROGRAM_DAY_MINIMUM) {
    throw new RangeError("A routine must retain at least one day.");
  }
  const dayIndex = resolveDayIndex(next, dayIndexOrKey);
  const day = next.days[dayIndex];
  if (!day) throw new RangeError("The requested program day is unavailable.");
  const prescriptions = day.sections.flatMap(({ prescriptions }) => prescriptions);
  const currentKeys = prescriptions.map(({ prescriptionKey }) => prescriptionKey);
  if (
    !review.confirmed ||
    review.dayKey !== day.dayKey ||
    review.exerciseNames.length !== prescriptions.length ||
    review.exerciseNames.some((name) => name.trim().length === 0) ||
    review.prescriptionKeys.length !== currentKeys.length ||
    review.prescriptionKeys.some((key, index) => key !== currentKeys[index])
  ) {
    throw new RangeError(
      "The day removal review is incomplete or stale; confirm the named movements before removing.",
    );
  }
  next.days.splice(dayIndex, 1);
  normalizeDayNumbers(next.days);
  return next;
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
  _prescriptionIndex: number,
): string {
  return prescription.prescriptionKey || `${section.draftKey}:prescription:${_prescriptionIndex}`;
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
        cardioKey: stableReadKey(
          (cardio as ActiveProgramCardioReadModelWithStableKey).cardioKey,
          cardio.id,
        ),
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
        sectionKey: stableReadKey(
          (section as ActiveProgramSectionReadModelWithStableKey).sectionKey,
          section.id,
        ),
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
          prescriptionKey: stableReadKey(
            (prescription as ActiveProgramPrescriptionReadModelWithStableKey).prescriptionKey,
            prescription.id,
          ),
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

function defaultCardio(mode: ProgramCardioMode, cardioKey: string): ProgramCardioInput {
  return {
    cardioKey,
    distanceM: null,
    durationSeconds: 1,
    inclinePercent: null,
    mode,
    notes: null,
    paceSecondsPerKm: null,
  };
}

export function addProgramCardio(
  input: ProgramPublishInput | ProgramEditorDraft,
  dayIndexOrKey: number | string,
  mode: ProgramCardioMode,
  cardioKey?: string,
): ProgramEditorDraft {
  const next = editorDraftClone(input);
  const day = dayAtEditor(next, dayIndexOrKey);
  if (day.cardio.some((cardio) => cardio.mode === mode)) {
    throw new RangeError(`A ${mode} cardio choice already exists on this day.`);
  }
  if (day.cardio.length >= PROGRAM_CARDIO_MODES.length) {
    throw new RangeError("A day can contain at most two cardio choices.");
  }
  const usedKeys = collectTopologyKeys(next);
  const normalizedCardioKey = cardioKey?.trim() || createTopologyKey(usedKeys);
  if (!isOpaqueTopologyKey(normalizedCardioKey) || usedKeys.has(normalizedCardioKey)) {
    throw new RangeError("A new cardio choice needs a fresh opaque UUID key.");
  }
  day.cardio.push(defaultCardio(mode, normalizedCardioKey));
  return next;
}

export function removeProgramCardio(
  input: ProgramPublishInput | ProgramEditorDraft,
  dayIndexOrKey: number | string,
  cardio: ProgramCardioMode | number | string,
): ProgramEditorDraft {
  const next = editorDraftClone(input);
  const day = dayAtEditor(next, dayIndexOrKey);
  const cardioIndex = typeof cardio === "number"
    ? cardio
    : day.cardio.findIndex(({ cardioKey, mode }) => cardioKey === cardio || mode === cardio);
  if (cardioIndex < 0 || cardioIndex >= day.cardio.length) {
    throw new RangeError("The requested cardio choice is unavailable.");
  }
  day.cardio.splice(cardioIndex, 1);
  return next;
}

export function addProgramSection(
  input: ProgramPublishInput | ProgramEditorDraft,
  dayIndex: number,
  kind: ProgramSectionKind,
  sectionKey?: string,
): ProgramEditorDraft {
  const next = editorDraftClone(input);
  const day = next.days[dayIndex];
  if (!day) throw new RangeError("The requested program day is unavailable.");
  if (!PROGRAM_SECTION_KINDS.includes(kind)) {
    throw new RangeError("The requested program section kind is unavailable.");
  }
  if (day.sections.length >= PROGRAM_SECTION_MAXIMUM) {
    throw new RangeError(`A day can contain at most ${PROGRAM_SECTION_MAXIMUM} sections.`);
  }
  const usedKeys = collectTopologyKeys(next);
  const normalizedSectionKey = sectionKey?.trim() || createTopologyKey(usedKeys);
  if (!isOpaqueTopologyKey(normalizedSectionKey) || usedKeys.has(normalizedSectionKey)) {
    throw new RangeError("A new program section needs a fresh opaque UUID key.");
  }
  day.sections.push({
    draftKey: normalizedSectionKey,
    kind,
    prescriptions: [],
    sectionKey: normalizedSectionKey,
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
    if (day.sections.length > PROGRAM_SECTION_MAXIMUM) {
      issues.push(`${day.displayName} can contain at most ${PROGRAM_SECTION_MAXIMUM} sections.`);
    }
    const seenSectionKeys = new Set<string>();
    let movementCount = 0;
    for (const section of day.sections) {
      if (seenSectionKeys.has(section.sectionKey)) {
        issues.push(`${day.displayName} contains duplicate section keys.`);
      }
      seenSectionKeys.add(section.sectionKey);
      if (section.prescriptions.length === 0) {
        issues.push(`${day.displayName} ${section.title} needs at least one movement.`);
      }
      if (section.prescriptions.length > PROGRAM_DAY_MOVEMENT_MAXIMUM) {
        issues.push(
          `${day.displayName} ${section.title} can contain at most ${PROGRAM_DAY_MOVEMENT_MAXIMUM} movements.`,
        );
      }
      movementCount += section.prescriptions.length;
    }
    if (movementCount < PROGRAM_DAY_MOVEMENT_MINIMUM) {
      issues.push(`${day.displayName} needs at least one movement.`);
    }
    if (movementCount > PROGRAM_DAY_MOVEMENT_MAXIMUM) {
      issues.push(
        `${day.displayName} can contain at most ${PROGRAM_DAY_MOVEMENT_MAXIMUM} movements.`,
      );
    }
  }
  const movementCount = input.days.reduce(
    (total, day) => total + day.sections.reduce(
      (dayTotal, section) => dayTotal + section.prescriptions.length,
      0,
    ),
    0,
  );
  if (input.days.length > PROGRAM_DAY_MAXIMUM) {
    issues.push(`A routine can contain at most ${PROGRAM_DAY_MAXIMUM} days.`);
  }
  if (movementCount > PROGRAM_MOVEMENT_MAXIMUM) {
    issues.push(`A routine can contain at most ${PROGRAM_MOVEMENT_MAXIMUM} movements.`);
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
  usedKeys?: ReadonlySet<string>,
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
    prescriptionKey: createTopologyKey(usedKeys),
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
  const usedKeys = collectTopologyKeys(next);
  section.prescriptions.push(defaultPrescription(section.kind, candidate, usedKeys));
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
    prescriptionKey: current.prescriptionKey,
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
