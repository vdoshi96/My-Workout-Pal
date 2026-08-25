import { z } from "zod";

const idempotencyKeySchema = z.string().trim().min(1).max(180);
const nullableBoundedText = (maximum: number) =>
  z.string().trim().min(1).max(maximum).nullable();

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
    restSeconds: z.number().int().min(0).max(900),
    setCount: z.number().int().min(1).max(20),
    setKind: z.enum(["warmup", "work"]),
    sourcePrescriptionId: z.string().uuid().nullable(),
    targetDistanceM: z.number().int().positive().max(10_000_000).nullable(),
    targetWeightKg: z.number().finite().min(0).max(100_000).nullable(),
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
    title: z.string().trim().min(1).max(120),
  })
  .strict();

const programCardioPublishSchema = z
  .object({
    distanceM: z.number().int().min(0).max(10_000_000).nullable(),
    durationSeconds: z.number().int().positive().max(604_800),
    inclinePercent: z.number().finite().min(0).max(100).nullable(),
    mode: z.enum(["walker", "runner"]),
    notes: z.string().trim().max(2_000).nullable(),
    paceSecondsPerKm: z.number().int().positive().max(86_400).nullable(),
  })
  .strict();

const programDayPublishSchema = z
  .object({
    cardio: z.array(programCardioPublishSchema).length(2),
    dayKey: z.enum(["push", "pull", "legs", "upper", "lower"]),
    dayNumber: z.number().int().min(1).max(5),
    displayName: z.string().trim().min(1).max(120),
    sections: z.array(programSectionPublishSchema).min(1).max(12),
  })
  .strict()
  .superRefine((value, context) => {
    if (new Set(value.sections.map(({ kind }) => kind)).size !== value.sections.length) {
      context.addIssue({ code: "custom", message: "Section kinds must be unique." });
    }
    if (new Set(value.cardio.map(({ mode }) => mode)).size !== 2) {
      context.addIssue({ code: "custom", message: "Include one walker and one runner template." });
    }
  });

const expectedProgramDays = ["push", "pull", "legs", "upper", "lower"] as const;

export const programPublishRequestSchema = z
  .object({
    baseRevisionId: z.string().uuid(),
    days: z.array(programDayPublishSchema).length(5),
    idempotencyKey: idempotencyKeySchema,
    name: z.string().trim().min(1).max(80),
    programId: z.string().uuid(),
  })
  .strict()
  .superRefine((value, context) => {
    const sourcePrescriptionIds = value.days.flatMap((day) =>
      day.sections.flatMap((section) =>
        section.prescriptions.flatMap(({ sourcePrescriptionId }) =>
          sourcePrescriptionId === null ? [] : [sourcePrescriptionId],
        ),
      ),
    );
    if (new Set(sourcePrescriptionIds).size !== sourcePrescriptionIds.length) {
      context.addIssue({
        code: "custom",
        message: "A source prescription can be published only once.",
        path: ["days"],
      });
    }
    value.days.forEach((day, index) => {
      if (day.dayNumber !== index + 1 || day.dayKey !== expectedProgramDays[index]) {
        context.addIssue({
          code: "custom",
          message: "Program days must keep the canonical five-day order.",
          path: ["days", index],
        });
      }
    });
  });

export type ProgramPublishInput = z.infer<typeof programPublishRequestSchema>;
