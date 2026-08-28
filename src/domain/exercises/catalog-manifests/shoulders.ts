import type { CatalogManifestRecord } from "@/domain/exercises/catalog-generator";

export const shouldersManifest = [
  {
    slug: "seated-dumbbell-shoulder-press",
    name: "Seated dumbbell shoulder press",
    role: "compound",
    loggingKind: "weight_reps",
    requiredEquipment: ["dumbbells", "bench"],
    movementFamily: "shoulder-press",
    primaryMuscles: ["deltoids", "triceps"],
    aliases: ["seated DB press", "dumbbell overhead press"],
    instructions: [
      "Sit against an upright bench with both feet planted.",
      "Start with the weights near shoulder height and wrists stacked.",
      "Press overhead smoothly, then return to the start under control.",
    ],
  },
] as const satisfies readonly CatalogManifestRecord[];
