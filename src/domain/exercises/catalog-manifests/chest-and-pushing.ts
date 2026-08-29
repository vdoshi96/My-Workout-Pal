import type { CatalogManifestRecord } from "@/domain/exercises/catalog-generator";

export const chestAndPushingManifest = [
  {
    slug: "dumbbell-bench-press",
    name: "Dumbbell bench press",
    role: "compound",
    loggingKind: "weight_reps",
    requiredEquipment: ["dumbbells", "bench"],
    movementFamily: "bench-press",
    primaryMuscles: ["pecs", "triceps", "front deltoids"],
    aliases: ["DB bench press", "dumbbell chest press"],
    instructions: [
      "Set a stable bench position with both feet planted.",
      "Lower the weight toward the mid-chest under control.",
      "Press along the same path and finish each repetition balanced.",
    ],
  },
  {
    slug: "incline-dumbbell-press",
    name: "Incline dumbbell press",
    role: "compound",
    loggingKind: "weight_reps",
    requiredEquipment: ["dumbbells", "bench"],
    movementFamily: "incline-press",
    primaryMuscles: ["upper pecs", "front deltoids", "triceps"],
    aliases: ["incline DB bench", "incline chest press"],
    instructions: [
      "Set the bench to a modest incline and plant both feet.",
      "Lower the weights beside the upper chest without bouncing.",
      "Press along the same path and keep the shoulders supported.",
    ],
  },
  {
    slug: "barbell-bench-press",
    name: "Barbell bench press",
    role: "compound",
    loggingKind: "weight_reps",
    requiredEquipment: ["barbell", "plates", "bench", "rack"],
    movementFamily: "bench-press",
    primaryMuscles: ["pecs", "triceps", "front deltoids"],
    aliases: ["bench press", "flat barbell bench"],
    instructions: [
      "Set a stable bench position with both feet planted.",
      "Lower the weight toward the mid-chest under control.",
      "Press along the same path and finish each repetition balanced.",
    ],
  },
] as const satisfies readonly CatalogManifestRecord[];
