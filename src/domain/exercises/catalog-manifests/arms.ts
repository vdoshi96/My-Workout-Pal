import type { CatalogManifestRecord } from "@/domain/exercises/catalog-generator";

export const armsManifest = [
  {
    slug: "overhead-dumbbell-triceps-extension",
    name: "Overhead dumbbell triceps extension",
    role: "accessory",
    loggingKind: "weight_reps",
    requiredEquipment: ["dumbbells"],
    movementFamily: "overhead-triceps-extension",
    primaryMuscles: ["triceps"],
    aliases: ["DB overhead extension", "dumbbell French press"],
    instructions: [
      "Hold the dumbbell securely above the head.",
      "Keep the upper arms steady while lowering behind the head.",
      "Extend the elbows smoothly and stop before control changes.",
    ],
  },
  {
    slug: "dumbbell-curl",
    name: "Dumbbell curl",
    role: "accessory",
    loggingKind: "weight_reps",
    requiredEquipment: ["dumbbells"],
    movementFamily: "biceps-curl",
    primaryMuscles: ["biceps", "forearms"],
    aliases: ["DB biceps curl", "alternating dumbbell curl"],
    instructions: [
      "Stand tall with a dumbbell at each side.",
      "Curl without swinging or driving the elbows forward.",
      "Lower each weight to the start under control.",
    ],
  },
] as const satisfies readonly CatalogManifestRecord[];
