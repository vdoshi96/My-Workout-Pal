import type { CatalogManifestRecord } from "@/domain/exercises/catalog-generator";

export const backAndRearShoulderManifest = [
  {
    slug: "barbell-bent-over-row",
    name: "Barbell bent-over row",
    role: "compound",
    loggingKind: "weight_reps",
    requiredEquipment: ["barbell", "plates"],
    movementFamily: "horizontal-row",
    primaryMuscles: ["lats", "upper back", "biceps"],
    aliases: ["barbell row", "bent row"],
    instructions: [
      "Set a stable torso position before starting the pull.",
      "Row the weight toward the ribs without using momentum.",
      "Lower to a controlled reach while keeping the setup steady.",
    ],
  },
  {
    slug: "one-arm-dumbbell-row",
    name: "One-arm dumbbell row",
    role: "compound",
    loggingKind: "weight_reps",
    requiredEquipment: ["dumbbells", "bench"],
    movementFamily: "one-arm-row",
    primaryMuscles: ["lats", "upper back", "biceps"],
    aliases: ["single-arm dumbbell row", "one-arm DB row"],
    instructions: [
      "Support one hand on the bench and set a stable stance.",
      "Pull the dumbbell toward the hip while the torso stays quiet.",
      "Lower to a controlled reach, finish the side, then switch.",
    ],
  },
  {
    slug: "dumbbell-pullover",
    name: "Dumbbell pullover",
    role: "accessory",
    loggingKind: "weight_reps",
    requiredEquipment: ["dumbbells", "bench"],
    movementFamily: "pullover",
    primaryMuscles: ["lats", "pecs", "triceps"],
    aliases: ["DB pullover", "bench pullover"],
    instructions: [
      "Lie securely on the bench and hold the dumbbell above the chest.",
      "Move the weight in an arc with softly bent elbows.",
      "Reverse the arc under control at the end of the chosen range.",
    ],
  },
  {
    slug: "chest-supported-dumbbell-row",
    name: "Chest-supported dumbbell row",
    role: "compound",
    loggingKind: "weight_reps",
    requiredEquipment: ["dumbbells", "bench"],
    movementFamily: "horizontal-row",
    primaryMuscles: ["lats", "upper back", "biceps"],
    aliases: ["incline bench dumbbell row", "chest-supported DB row"],
    instructions: [
      "Set a stable torso position before starting the pull.",
      "Row the weight toward the ribs without using momentum.",
      "Lower to a controlled reach while keeping the setup steady.",
    ],
  },
] as const satisfies readonly CatalogManifestRecord[];
