import { z } from "zod";

import { EQUIPMENT_PROFILES, supportsEquipment } from "@/domain/equipment";
import {
  programPublishRequestSchema,
  type ProgramPublishInput,
} from "@/domain/programs/publication";
import type { OwnedEquipmentPreviewChange } from "@/domain/programs/owned-equipment-preview";
import type {
  ActiveProgramReadModel,
  ProgramRevisionMutationResult,
} from "@/server/repositories/profile-program";

const uuid = z.string().uuid();
const nullableNumber = z.number().finite().nullable();
const equipmentId = z.enum(["bodyweight", "dumbbells", "bench", "barbell", "plates", "rack"]);
const loggingKind = z.enum(["weight_reps", "bodyweight_reps", "duration", "distance_duration"]);

const customExerciseSchema = z.object({
  equipmentIds: z.array(equipmentId),
  exerciseKey: z.string().min(1),
  id: uuid,
  instructions: z.string().nullable(),
  loggingKind,
  name: z.string().min(1),
}).passthrough();

const prescriptionSchema = z.object({
  catalogExerciseId: uuid.nullable(),
  customExercise: customExerciseSchema.nullable(),
  customExerciseId: uuid.nullable(),
  displayName: z.string().nullable(),
  displayOrder: z.number().int().positive(),
  exercise: z.object({
    id: uuid,
    kind: z.enum(["catalog", "custom"]),
    loggingKind,
    movementFamily: z.string(),
    name: z.string().min(1),
    requiredEquipment: z.array(equipmentId),
    role: z.string().nullable(),
    slug: z.string().min(1),
  }).passthrough(),
  id: uuid,
  label: z.string().min(1),
  maximumReps: z.number().int().positive().nullable(),
  maximumSeconds: z.number().int().positive().nullable(),
  measurementKind: loggingKind,
  minimumReps: z.number().int().positive().nullable(),
  minimumSeconds: z.number().int().positive().nullable(),
  notes: z.string().nullable(),
  restSeconds: z.number().int().nonnegative(),
  setCount: z.number().int().positive(),
  setKind: z.enum(["warmup", "work"]),
  targetDistanceM: nullableNumber,
  targetMetadata: z.record(z.string(), z.unknown()),
  targetWeightKg: nullableNumber,
}).passthrough();

const sectionSchema = z.object({
  displayOrder: z.number().int().positive(),
  id: uuid,
  kind: z.enum(["strength", "accessory", "core", "cardio"]),
  prescriptions: z.array(prescriptionSchema).min(1),
  title: z.string().min(1),
}).passthrough();

const cardioSchema = z.object({
  distanceM: nullableNumber,
  durationSeconds: z.number().int().nonnegative(),
  id: uuid,
  inclinePercent: nullableNumber,
  mode: z.enum(["walker", "runner"]),
  notes: z.string().nullable(),
  paceSecondsPerKm: nullableNumber,
}).passthrough();

const activeProgramSchema = z.object({
  days: z.array(z.object({
    cardio: z.array(cardioSchema).length(2),
    dayKey: z.enum(["push", "pull", "legs", "upper", "lower"]),
    dayNumber: z.number().int().min(1).max(5),
    displayName: z.string().min(1),
    id: uuid,
    prescriptions: z.array(prescriptionSchema).min(1),
    sections: z.array(sectionSchema).min(1).max(4),
  }).passthrough()).length(5),
  equipmentProfileKind: z.enum(["dumbbells", "barbell"]),
  id: uuid,
  name: z.string().min(1).max(80),
  programKey: z.string().min(1),
  publishedAt: z.string().datetime({ offset: true }),
  revisionId: uuid,
  revisionNumber: z.number().int().positive(),
  sourceTemplateRevisionId: uuid.nullable(),
  status: z.literal("published"),
}).passthrough();

const mutationResultSchema = z.object({
  activeProgram: activeProgramSchema.nullable(),
  affectedProgramId: uuid,
  affectedRevisionId: uuid,
  replayed: z.boolean(),
}).passthrough();

const mutationEnvelopeSchema = z.object({
  profileProgram: mutationResultSchema,
}).strict();

function activeProgramGraphIsValid(program: ActiveProgramReadModel): boolean {
  const identifiers = new Set<string>();
  function claim(id: string): boolean {
    if (identifiers.has(id)) return false;
    identifiers.add(id);
    return true;
  }

  if (!claim(program.id) || !claim(program.revisionId)) return false;
  for (const day of program.days) {
    if (!claim(day.id)) return false;
    const flattened = day.sections.flatMap(({ prescriptions }) => prescriptions);
    if (
      flattened.length !== day.prescriptions.length ||
      flattened.some((prescription, index) => day.prescriptions[index]?.id !== prescription.id)
    ) {
      return false;
    }
    for (const [sectionIndex, section] of day.sections.entries()) {
      if (!claim(section.id) || section.displayOrder !== sectionIndex + 1) return false;
      for (const [prescriptionIndex, prescription] of section.prescriptions.entries()) {
        if (!claim(prescription.id) || prescription.displayOrder !== prescriptionIndex + 1) {
          return false;
        }
        const catalog = prescription.catalogExerciseId !== null;
        const custom = prescription.customExerciseId !== null;
        if (
          catalog === custom ||
          prescription.exercise.kind !== (catalog ? "catalog" : "custom") ||
          prescription.exercise.id !== (prescription.catalogExerciseId ?? prescription.customExerciseId) ||
          prescription.exercise.loggingKind !== prescription.measurementKind ||
          !supportsEquipment(
            EQUIPMENT_PROFILES[program.equipmentProfileKind],
            prescription.exercise.requiredEquipment,
          )
        ) {
          return false;
        }
        if (
          custom &&
          (!prescription.customExercise ||
            prescription.customExercise.id !== prescription.customExerciseId ||
            prescription.customExercise.loggingKind !== prescription.measurementKind)
        ) {
          return false;
        }
        if (catalog && prescription.customExercise !== null) return false;
      }
    }
    for (const [cardioIndex, cardio] of day.cardio.entries()) {
      if (!claim(cardio.id) || cardio.mode !== (cardioIndex === 0 ? "walker" : "runner")) {
        return false;
      }
    }
  }

  return programPublishRequestSchema.safeParse({
    baseRevisionId: program.revisionId,
    days: program.days.map((day) => ({
      cardio: day.cardio.map((cardio) => ({
        distanceM: cardio.distanceM,
        durationSeconds: cardio.durationSeconds,
        inclinePercent: cardio.inclinePercent,
        mode: cardio.mode,
        notes: cardio.notes,
        paceSecondsPerKm: cardio.paceSecondsPerKm,
      })),
      dayKey: day.dayKey,
      dayNumber: day.dayNumber,
      displayName: day.displayName,
      sections: day.sections.map((section) => ({
        kind: section.kind,
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
    })),
    idempotencyKey: "client-success-shape-validation",
    name: program.name,
    programId: program.id,
  }).success;
}

const equipmentEnvelopeSchema = z.object({
  profileProgram: mutationResultSchema.extend({
    changes: z.array(z.object({
      dayDisplayName: z.string().min(1),
      fromSlug: z.string().min(1),
      prescriptionId: uuid,
      toSlug: z.string().min(1),
    }).passthrough()),
  }),
}).strict();

const onboardingEnvelopeSchema = z.object({
  profileProgram: z.object({
    activeProgram: activeProgramSchema,
    equipment: z.object({ profileKind: z.enum(["dumbbells", "barbell"]) }).strict(),
    preferences: z.object({
      reducedMotion: z.boolean(),
      timezone: z.string().trim().min(1).max(64),
      unitSystem: z.enum(["metric", "imperial"]),
      updatedAt: z.string().datetime({ offset: true }),
    }).strict(),
  }).passthrough(),
}).strict();

export type ProgramRevisionMutationClientModel = Readonly<
  Pick<
    ProgramRevisionMutationResult,
    "activeProgram" | "affectedProgramId" | "affectedRevisionId" | "replayed"
  >
>;

export function parseProgramRevisionMutationResponse(
  value: unknown,
): ProgramRevisionMutationClientModel {
  const parsed = mutationEnvelopeSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error("The server returned an invalid program mutation response.");
  }
  if (
    parsed.data.profileProgram.activeProgram &&
    !activeProgramGraphIsValid(
      parsed.data.profileProgram.activeProgram as ActiveProgramReadModel,
    )
  ) {
    throw new Error("The server returned an invalid program mutation response.");
  }
  return parsed.data.profileProgram as ProgramRevisionMutationClientModel;
}

function publishMeaning(input: ProgramPublishInput) {
  return {
    days: input.days.map((day) => ({
      cardio: day.cardio,
      dayKey: day.dayKey,
      dayNumber: day.dayNumber,
      displayName: day.displayName,
      sections: day.sections.map((section) => ({
        kind: section.kind,
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
          targetDistanceM: prescription.targetDistanceM,
          targetWeightKg: prescription.targetWeightKg,
        })),
        title: section.title,
      })),
    })),
    name: input.name,
    programId: input.programId,
  };
}

function activeProgramPublishMeaning(program: ActiveProgramReadModel) {
  return publishMeaning({
    baseRevisionId: program.revisionId,
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
    idempotencyKey: "client-operation-binding",
    name: program.name,
    programId: program.id,
  });
}

export function parseProgramPublishResponse(
  value: unknown,
  expected: ProgramPublishInput,
): ProgramRevisionMutationClientModel {
  const parsed = parseProgramRevisionMutationResponse(value);
  if (parsed.affectedProgramId !== expected.programId) {
    throw new Error("The server response does not match the published program.");
  }
  if (
    parsed.activeProgram?.id === parsed.affectedProgramId &&
    JSON.stringify(activeProgramPublishMeaning(parsed.activeProgram)) !==
      JSON.stringify(publishMeaning(expected))
  ) {
    throw new Error("The server response does not match the published draft.");
  }
  return parsed;
}

export function parseEquipmentChangeResponse(
  value: unknown,
  expected: Readonly<{
    changes: readonly OwnedEquipmentPreviewChange[];
    programId: string;
    targetProfileKind: "dumbbells" | "barbell";
  }>,
): Readonly<ProgramRevisionMutationClientModel & { changeCount: number }> {
  const parsed = equipmentEnvelopeSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error("The server returned an invalid equipment mutation response.");
  }
  if (
    parsed.data.profileProgram.activeProgram &&
    !activeProgramGraphIsValid(
      parsed.data.profileProgram.activeProgram as ActiveProgramReadModel,
    )
  ) {
    throw new Error("The server returned an invalid equipment mutation response.");
  }
  const profileProgram = parsed.data.profileProgram;
  if (
    profileProgram.affectedProgramId !== expected.programId ||
    (profileProgram.activeProgram?.id === profileProgram.affectedProgramId &&
      profileProgram.activeProgram.equipmentProfileKind !== expected.targetProfileKind)
  ) {
    throw new Error("The server response does not match the requested equipment profile.");
  }
  const actualChanges = profileProgram.changes.map((change) => ({
    fromSlug: change.fromSlug,
    prescriptionId: change.prescriptionId,
    toSlug: change.toSlug,
  })).sort((left, right) =>
    left.prescriptionId.localeCompare(right.prescriptionId) ||
    left.fromSlug.localeCompare(right.fromSlug) ||
    left.toSlug.localeCompare(right.toSlug),
  );
  const expectedChanges = expected.changes.map((change) => ({
    fromSlug: change.fromSlug,
    prescriptionId: change.prescriptionId,
    toSlug: change.toSlug,
  })).sort((left, right) =>
    left.prescriptionId.localeCompare(right.prescriptionId) ||
    left.fromSlug.localeCompare(right.fromSlug) ||
    left.toSlug.localeCompare(right.toSlug),
  );
  if (JSON.stringify(actualChanges) !== JSON.stringify(expectedChanges)) {
    throw new Error("The server response does not match the reviewed equipment substitutions.");
  }
  return {
    ...(profileProgram as ProgramRevisionMutationClientModel),
    changeCount: profileProgram.changes.length,
  };
}

export function parseOnboardingResponse(
  value: unknown,
  expected: Readonly<{
    equipmentProfileKind: "dumbbells" | "barbell";
    reducedMotion: boolean;
    timezone: string;
    unitSystem: "metric" | "imperial";
  }>,
): ActiveProgramReadModel {
  const parsed = onboardingEnvelopeSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error("The server returned an invalid onboarding response.");
  }
  const model = parsed.data.profileProgram;
  if (
    !activeProgramGraphIsValid(model.activeProgram as ActiveProgramReadModel) ||
    model.activeProgram.equipmentProfileKind !== expected.equipmentProfileKind ||
    model.equipment.profileKind !== expected.equipmentProfileKind ||
    model.preferences.reducedMotion !== expected.reducedMotion ||
    model.preferences.timezone !== expected.timezone ||
    model.preferences.unitSystem !== expected.unitSystem
  ) {
    throw new Error("The server response does not match the requested onboarding setup.");
  }
  return model.activeProgram as ActiveProgramReadModel;
}
