import { z } from "zod";

const idempotencyKeySchema = z.string().trim().min(1).max(180);
const opaqueTopologyKeySchema = z.string().uuid();
const legacyStarterDayKeySchema = z.enum(["push", "pull", "legs", "upper", "lower"]);
const programDayKeySchema = z.union([
  opaqueTopologyKeySchema,
  legacyStarterDayKeySchema,
]);

export const PROGRAM_DAY_MINIMUM = 1;
export const PROGRAM_DAY_MAXIMUM = 14;
export const PROGRAM_DAY_MOVEMENT_MINIMUM = 1;
export const PROGRAM_DAY_MOVEMENT_MAXIMUM = 40;
export const PROGRAM_MOVEMENT_MAXIMUM = 200;
const nullableBoundedText = (maximum: number) =>
  z.string().trim().min(1).max(maximum).nullable();
const hasCanonicalThreeDecimalScale = (value: number): boolean =>
  Number(value.toFixed(3)) === value;
const canonicalMeters = (minimum: number) =>
  z
    .number()
    .finite()
    .refine(hasCanonicalThreeDecimalScale, {
      message: "Use no more than three decimal places for meters.",
    })
    .min(minimum)
    .max(10_000_000);
const canonicalKilograms = z
  .number()
  .finite()
  .refine(hasCanonicalThreeDecimalScale, {
    message: "Use no more than three decimal places for kilograms.",
  })
  .min(0)
  .max(100_000);

const programPrescriptionPublishSchema = z
  .object({
    catalogExerciseId: z.string().uuid().nullable(),
    customExerciseId: z.string().uuid().nullable(),
    displayName: nullableBoundedText(180),
    maximumReps: z.number().int().positive().max(1_000).nullable(),
    maximumSeconds: z.number().int().positive().max(86_400).nullable(),
    minimumReps: z.number().int().positive().max(1_000).nullable(),
    minimumSeconds: z.number().int().positive().max(86_400).nullable(),
    notes: z.string().trim().max(2_000).nullable(),
    prescriptionKey: opaqueTopologyKeySchema,
    restSeconds: z.number().int().min(0).max(900),
    setCount: z.number().int().min(1).max(20),
    setKind: z.enum(["warmup", "work"]),
    sourcePrescriptionId: z.string().uuid().nullable(),
    targetDistanceM: canonicalMeters(0).positive().nullable(),
    targetWeightKg: canonicalKilograms.nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      Number(value.catalogExerciseId !== null) + Number(value.customExerciseId !== null) !== 1
    ) {
      context.addIssue({ code: "custom", message: "Choose exactly one exercise reference." });
    }
    const hasRepetitions = value.minimumReps !== null || value.maximumReps !== null;
    const hasDuration = value.minimumSeconds !== null || value.maximumSeconds !== null;
    const repetitionRangeValid =
      value.minimumReps !== null &&
      value.maximumReps !== null &&
      value.minimumReps <= value.maximumReps;
    const durationRangeValid =
      value.minimumSeconds !== null &&
      value.maximumSeconds !== null &&
      value.minimumSeconds <= value.maximumSeconds;

    if (
      hasRepetitions === hasDuration ||
      (hasRepetitions && !repetitionRangeValid) ||
      (hasDuration && !durationRangeValid)
    ) {
      context.addIssue({
        code: "custom",
        message: "Use one complete ascending repetition or duration range.",
      });
    }
    if (value.targetDistanceM !== null && !hasDuration) {
      context.addIssue({
        code: "custom",
        message: "Distance targets require a duration range.",
        path: ["targetDistanceM"],
      });
    }
    if (value.targetWeightKg !== null && !hasRepetitions) {
      context.addIssue({
        code: "custom",
        message: "Weight targets require a repetition range.",
        path: ["targetWeightKg"],
      });
    }
  });

const programSectionPublishSchema = z
  .object({
    kind: z.enum(["strength", "accessory", "core"]),
    prescriptions: z.array(programPrescriptionPublishSchema).min(1).max(40),
    sectionKey: opaqueTopologyKeySchema,
    title: z.string().trim().min(1).max(120),
  })
  .strict();

const programCardioPublishSchema = z
  .object({
    distanceM: canonicalMeters(0).nullable(),
    durationSeconds: z.number().int().positive().max(604_800),
    inclinePercent: z.number().finite().min(0).max(100).nullable(),
    cardioKey: opaqueTopologyKeySchema,
    mode: z.enum(["walker", "runner"]),
    notes: z.string().trim().max(2_000).nullable(),
    paceSecondsPerKm: z.number().int().positive().max(86_400).nullable(),
  })
  .strict();

const programDayPublishSchema = z
  .object({
    cardio: z.array(programCardioPublishSchema).max(2),
    dayKey: programDayKeySchema,
    dayNumber: z.number().int().min(PROGRAM_DAY_MINIMUM).max(PROGRAM_DAY_MAXIMUM),
    displayName: z.string().trim().min(1).max(120),
    sections: z.array(programSectionPublishSchema).min(1).max(12),
  })
  .strict()
  .superRefine((value, context) => {
    if (new Set(value.sections.map(({ sectionKey }) => sectionKey)).size !== value.sections.length) {
      context.addIssue({ code: "custom", message: "Section keys must be unique within a day." });
    }
    const prescriptions = value.sections.flatMap(({ prescriptions }) => prescriptions);
    if (
      new Set(prescriptions.map(({ prescriptionKey }) => prescriptionKey)).size !==
      prescriptions.length
    ) {
      context.addIssue({ code: "custom", message: "Movement keys must be unique within a day." });
    }
    if (prescriptions.length < PROGRAM_DAY_MOVEMENT_MINIMUM) {
      context.addIssue({ code: "custom", message: "Include at least one movement on each day." });
    }
    if (prescriptions.length > PROGRAM_DAY_MOVEMENT_MAXIMUM) {
      context.addIssue({ code: "custom", message: "Use at most 40 movements on each day." });
    }
    if (new Set(value.cardio.map(({ mode }) => mode)).size !== value.cardio.length) {
      context.addIssue({ code: "custom", message: "Cardio modes must be unique within a day." });
    }
    if (new Set(value.cardio.map(({ cardioKey }) => cardioKey)).size !== value.cardio.length) {
      context.addIssue({ code: "custom", message: "Cardio keys must be unique within a day." });
    }
  });

export const programPublishRequestSchema = z
  .object({
    baseRevisionId: z.string().uuid(),
    days: z.array(programDayPublishSchema).min(PROGRAM_DAY_MINIMUM).max(PROGRAM_DAY_MAXIMUM),
    idempotencyKey: idempotencyKeySchema,
    name: z.string().trim().min(1).max(80),
    programId: z.string().uuid(),
  })
  .strict()
  .superRefine((value, context) => {
    if (new Set(value.days.map(({ dayKey }) => dayKey)).size !== value.days.length) {
      context.addIssue({
        code: "custom",
        message: "Day keys must be unique within a routine.",
        path: ["days"],
      });
    }
    const sectionKeys = value.days.flatMap((day) =>
      day.sections.map(({ sectionKey }) => sectionKey),
    );
    if (new Set(sectionKeys).size !== sectionKeys.length) {
      context.addIssue({
        code: "custom",
        message: "Section keys must be unique within a routine.",
        path: ["days"],
      });
    }
    const prescriptionKeys = value.days.flatMap((day) =>
      day.sections.flatMap((section) =>
        section.prescriptions.map(({ prescriptionKey }) => prescriptionKey),
      ),
    );
    if (new Set(prescriptionKeys).size !== prescriptionKeys.length) {
      context.addIssue({
        code: "custom",
        message: "Movement keys must be unique within a routine.",
        path: ["days"],
      });
    }
    const cardioKeys = value.days.flatMap((day) =>
      day.cardio.map(({ cardioKey }) => cardioKey),
    );
    if (new Set(cardioKeys).size !== cardioKeys.length) {
      context.addIssue({
        code: "custom",
        message: "Cardio keys must be unique within a routine.",
        path: ["days"],
      });
    }
    if (prescriptionKeys.length > PROGRAM_MOVEMENT_MAXIMUM) {
      context.addIssue({
        code: "custom",
        message: "Use at most 200 movements in a routine.",
        path: ["days"],
      });
    }
    value.days.forEach((day, index) => {
      if (day.dayNumber !== index + 1) {
        context.addIssue({
          code: "custom",
          message: "Program day numbers must match their published order.",
          path: ["days", index],
        });
      }
    });
  });

export type ProgramPublishInput = z.infer<typeof programPublishRequestSchema>;
