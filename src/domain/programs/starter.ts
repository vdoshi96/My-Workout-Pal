import type { EquipmentProfile } from "@/domain/equipment";
import { getCatalogExercise } from "@/domain/exercises/catalog";
import type {
  Prescription,
  Program,
  ProgramDay,
  ProgramDayName,
  ProgramSectionKind,
} from "@/domain/programs/types";

const routeByProfile = {
  dumbbells: {
    Push: [
      "dumbbell-bench-press",
      "seated-dumbbell-shoulder-press",
      "incline-dumbbell-press",
      "overhead-dumbbell-triceps-extension",
      "dead-bug",
      "front-plank",
    ],
    Pull: [
      "chest-supported-dumbbell-row",
      "one-arm-dumbbell-row",
      "dumbbell-pullover",
      "dumbbell-curl",
      "bird-dog",
      "side-plank",
    ],
    Legs: [
      "goblet-squat",
      "dumbbell-romanian-deadlift",
      "reverse-lunge",
      "standing-calf-raise",
      "plank-shoulder-tap",
      "reverse-crunch",
    ],
    Upper: [
      "dumbbell-bench-press",
      "chest-supported-dumbbell-row",
      "seated-dumbbell-shoulder-press",
      "one-arm-dumbbell-row",
      "bicycle-crunch",
      "hollow-hold",
    ],
    Lower: [
      "goblet-squat",
      "dumbbell-romanian-deadlift",
      "bulgarian-split-squat",
      "dumbbell-hip-thrust",
      "dead-bug",
      "side-plank",
    ],
  },
  barbell: {
    Push: [
      "dumbbell-bench-press",
      "seated-dumbbell-shoulder-press",
      "incline-dumbbell-press",
      "overhead-dumbbell-triceps-extension",
      "dead-bug",
      "front-plank",
    ],
    Pull: [
      "barbell-bent-over-row",
      "one-arm-dumbbell-row",
      "dumbbell-pullover",
      "dumbbell-curl",
      "bird-dog",
      "side-plank",
    ],
    Legs: [
      "goblet-squat",
      "dumbbell-romanian-deadlift",
      "reverse-lunge",
      "standing-calf-raise",
      "plank-shoulder-tap",
      "reverse-crunch",
    ],
    Upper: [
      "barbell-bench-press",
      "barbell-bent-over-row",
      "seated-dumbbell-shoulder-press",
      "one-arm-dumbbell-row",
      "bicycle-crunch",
      "hollow-hold",
    ],
    Lower: [
      "barbell-back-squat",
      "barbell-romanian-deadlift",
      "bulgarian-split-squat",
      "barbell-hip-thrust",
      "dead-bug",
      "side-plank",
    ],
  },
} as const satisfies Record<EquipmentProfile["id"], Record<ProgramDayName, readonly string[]>>;

const dayNames = ["Push", "Pull", "Legs", "Upper", "Lower"] as const;

function sectionFor(role: ReturnType<typeof getCatalogExercise>["role"]): ProgramSectionKind {
  if (role === "accessory") return "accessory";
  if (role.startsWith("core")) return "core";
  return "strength";
}

function prescriptionFor(exerciseSlug: string, order: number, day: ProgramDayName): Prescription {
  const exercise = getCatalogExercise(exerciseSlug);
  const isTimed = exercise.role === "core-timed";
  const isCore = exercise.role.startsWith("core");
  const isAccessory = exercise.role === "accessory";

  return {
    exerciseSlug,
    displayName: day === "Lower" && exerciseSlug === "goblet-squat" ? "Heavy goblet squat" : undefined,
    section: sectionFor(exercise.role),
    order,
    sets: isCore || isAccessory ? 2 : 3,
    minimumReps: isTimed ? undefined : isCore ? 8 : isAccessory ? 10 : 8,
    maximumReps: isTimed ? undefined : isCore ? 15 : isAccessory ? 15 : 12,
    minimumSeconds: isTimed ? 20 : undefined,
    maximumSeconds: isTimed ? 45 : undefined,
    restSeconds: isCore || isAccessory ? 60 : 90,
    notes: undefined,
    targetWeightKg: undefined,
    previousValueLink: undefined,
  };
}

function createDay(name: ProgramDayName, exerciseSlugs: readonly string[]): ProgramDay {
  const prescriptions = exerciseSlugs.map((slug, index) => prescriptionFor(slug, index, name));
  const sectionKinds = ["strength", "accessory", "core"] as const;
  const sections = sectionKinds
    .map((kind) => ({
      kind,
      prescriptionIndexes: prescriptions
        .map((prescription, index) => (prescription.section === kind ? index : -1))
        .filter((index) => index >= 0),
    }))
    .filter((section) => section.prescriptionIndexes.length > 0);

  return {
    name,
    exerciseSlugs: [...exerciseSlugs],
    prescriptions,
    sections,
    cardio: {
      walker: {
        enabled: true,
        mode: "walker",
        durationMinutes: 20,
        distanceMeters: undefined,
        inclinePercent: undefined,
      },
      runner: {
        enabled: true,
        mode: "runner",
        durationMinutes: 20,
        distanceMeters: undefined,
        inclinePercent: undefined,
      },
    },
  };
}

export function createStarterProgram(profile: EquipmentProfile): Program {
  const route = routeByProfile[profile.id];
  return {
    id: `starter-${profile.id}`,
    name: "Five-day starter route",
    equipmentProfile: profile.id,
    revision: 1,
    days: dayNames.map((name) => createDay(name, route[name])),
  };
}
