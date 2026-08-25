import {
  EQUIPMENT_IDS,
  EQUIPMENT_PROFILES,
  type EquipmentId,
  type EquipmentProfileKind,
} from "@/domain/equipment";
import {
  CATALOG_EXERCISES,
  type CatalogExercise,
  type LoggingKind,
} from "@/domain/exercises/catalog";
import { createStarterProgram } from "@/domain/programs/starter";
import type { ProgramSectionKind } from "@/domain/programs/types";

type SeedExerciseRole = "compound" | "accessory" | "core_reps" | "core_timed";

export type EquipmentSeedRow = Readonly<{
  id: EquipmentId;
  label: string;
  description: string;
  sortOrder: number;
}>;

export type ExerciseSeedRow = Readonly<{
  slug: string;
  name: string;
  role: SeedExerciseRole;
  loggingKind: LoggingKind;
  movementFamily: string;
  muscles: readonly string[];
  instructions: string;
}>;

export type ExerciseEquipmentSeedRow = Readonly<{
  exerciseSlug: string;
  equipmentId: EquipmentId;
}>;

export type ExerciseAliasSeedRow = Readonly<{
  exerciseSlug: string;
  alias: string;
  normalizedAlias: string;
}>;

export type StarterPrescriptionSeed = Readonly<{
  exerciseSlug: string;
  displayName: string | undefined;
  displayOrder: number;
  setKind: "work";
  setCount: number;
  measurementKind: LoggingKind;
  minimumReps: number | undefined;
  maximumReps: number | undefined;
  minimumSeconds: number | undefined;
  maximumSeconds: number | undefined;
  restSeconds: number;
  targetWeightKg: number | undefined;
  targetDistanceM: number | undefined;
  notes: string | undefined;
}>;

export type StarterSectionSeed = Readonly<{
  kind: ProgramSectionKind;
  displayOrder: number;
  title: string;
  prescriptions: readonly StarterPrescriptionSeed[];
}>;

export type StarterCardioSeed = Readonly<{
  mode: "walker" | "runner";
  durationSeconds: number;
  distanceM: number | undefined;
  paceSecondsPerKm: number | undefined;
  inclinePercent: number | undefined;
  notes: string | undefined;
}>;

export type StarterDaySeed = Readonly<{
  dayNumber: number;
  dayKey: string;
  displayName: string;
  sections: readonly StarterSectionSeed[];
  cardio: readonly StarterCardioSeed[];
}>;

export type StarterTemplateRevisionSeed = Readonly<{
  revisionNumber: number;
  equipmentProfileKind: EquipmentProfileKind;
  days: readonly StarterDaySeed[];
}>;

export type StarterDatabaseSeed = Readonly<{
  equipment: readonly EquipmentSeedRow[];
  exercises: readonly ExerciseSeedRow[];
  exerciseEquipment: readonly ExerciseEquipmentSeedRow[];
  exerciseAliases: readonly ExerciseAliasSeedRow[];
  template: Readonly<{
    templateKey: "five-day-starter-route";
    name: "Five-day starter route";
    description: string;
    revisions: readonly StarterTemplateRevisionSeed[];
  }>;
}>;

const equipmentCopy: Readonly<
  Record<EquipmentId, Readonly<{ label: string; description: string }>>
> = {
  bodyweight: {
    label: "Bodyweight",
    description: "Movements performed without external loading.",
  },
  dumbbells: {
    label: "Dumbbells",
    description: "A pair of adjustable or fixed dumbbells.",
  },
  bench: {
    label: "Ordinary bench",
    description: "A stable flat or adjustable exercise bench.",
  },
  barbell: {
    label: "Barbell",
    description: "A standard straight bar used with plates.",
  },
  plates: {
    label: "Weight plates",
    description: "Plates compatible with the available barbell.",
  },
  rack: {
    label: "Rack",
    description: "A stable rack with appropriately placed safeties.",
  },
};

const sectionTitle: Readonly<Record<ProgramSectionKind, string>> = {
  strength: "Strength route",
  accessory: "Accessory route",
  core: "Core route",
};

function seedRole(role: CatalogExercise["role"]): SeedExerciseRole {
  return role === "core-reps"
    ? "core_reps"
    : role === "core-timed"
      ? "core_timed"
      : role;
}

function exerciseRows(): readonly ExerciseSeedRow[] {
  return Object.values(CATALOG_EXERCISES).map((exercise) => ({
    slug: exercise.slug,
    name: exercise.name,
    role: seedRole(exercise.role),
    loggingKind: exercise.loggingKind,
    movementFamily: exercise.movementFamily,
    muscles: [...exercise.primaryMuscles],
    instructions: exercise.instructions.join("\n"),
  }));
}

function equipmentEdges(): readonly ExerciseEquipmentSeedRow[] {
  return Object.values(CATALOG_EXERCISES).flatMap((exercise) =>
    exercise.requiredEquipment.map((equipmentId) => ({
      exerciseSlug: exercise.slug,
      equipmentId,
    })),
  );
}

function aliasRows(): readonly ExerciseAliasSeedRow[] {
  return Object.values(CATALOG_EXERCISES).flatMap((exercise) =>
    exercise.aliases.map((alias) => ({
      exerciseSlug: exercise.slug,
      alias,
      normalizedAlias: alias.trim().toLocaleLowerCase("en-US"),
    })),
  );
}

function templateRevision(
  equipmentProfileKind: EquipmentProfileKind,
  revisionNumber: number,
): StarterTemplateRevisionSeed {
  const program = createStarterProgram(EQUIPMENT_PROFILES[equipmentProfileKind]);
  return {
    revisionNumber,
    equipmentProfileKind,
    days: program.days.map((day, dayIndex) => ({
      dayNumber: dayIndex + 1,
      dayKey: day.name.toLocaleLowerCase("en-US"),
      displayName: day.name,
      sections: day.sections.map((section, sectionIndex) => ({
        kind: section.kind,
        displayOrder: sectionIndex + 1,
        title: sectionTitle[section.kind],
        prescriptions: section.prescriptionIndexes.map(
          (prescriptionIndex, position) => {
            const prescription = day.prescriptions[prescriptionIndex]!;
            const exercise = CATALOG_EXERCISES[prescription.exerciseSlug]!;
            return {
              exerciseSlug: prescription.exerciseSlug,
              displayName: prescription.displayName,
              displayOrder: position + 1,
              setKind: "work" as const,
              setCount: prescription.sets,
              measurementKind: exercise.loggingKind,
              minimumReps: prescription.minimumReps,
              maximumReps: prescription.maximumReps,
              minimumSeconds: prescription.minimumSeconds,
              maximumSeconds: prescription.maximumSeconds,
              restSeconds: prescription.restSeconds,
              targetWeightKg: prescription.targetWeightKg,
              targetDistanceM: undefined,
              notes: prescription.notes,
            };
          },
        ),
      })),
      cardio: ([day.cardio.walker, day.cardio.runner] as const).map((cardio) => ({
        mode: cardio.mode,
        durationSeconds: cardio.durationMinutes * 60,
        distanceM: cardio.distanceMeters,
        paceSecondsPerKm: undefined,
        inclinePercent: cardio.inclinePercent,
        notes: undefined,
      })),
    })),
  };
}

export function buildStarterDatabaseSeed(): StarterDatabaseSeed {
  return {
    equipment: EQUIPMENT_IDS.map((id, sortOrder) => ({
      id,
      ...equipmentCopy[id],
      sortOrder,
    })),
    exercises: exerciseRows(),
    exerciseEquipment: equipmentEdges(),
    exerciseAliases: aliasRows(),
    template: {
      templateKey: "five-day-starter-route",
      name: "Five-day starter route",
      description:
        "Five equipment-aware training days with strength, accessory, core, and configurable walker or runner cardio.",
      revisions: [templateRevision("dumbbells", 1), templateRevision("barbell", 2)],
    },
  };
}
