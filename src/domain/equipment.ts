export const EQUIPMENT_IDS = [
  "bodyweight",
  "dumbbells",
  "bench",
  "barbell",
  "plates",
  "rack",
] as const;

export type EquipmentId = (typeof EQUIPMENT_IDS)[number];

export type EquipmentProfileKind = "dumbbells" | "barbell";

export type EquipmentProfile = Readonly<{
  id: EquipmentProfileKind;
  label: string;
  description: string;
  equipment: readonly EquipmentId[];
}>;

export const EQUIPMENT_PROFILES = {
  dumbbells: {
    id: "dumbbells",
    label: "Dumbbells",
    description: "Dumbbells, bodyweight, and an ordinary bench",
    equipment: ["dumbbells", "bodyweight", "bench"],
  },
  barbell: {
    id: "barbell",
    label: "Barbell + rack",
    description: "Barbell, plates, rack, bench, dumbbells, and bodyweight",
    equipment: ["barbell", "plates", "rack", "bench", "dumbbells", "bodyweight"],
  },
} as const satisfies Record<EquipmentProfileKind, EquipmentProfile>;

export function supportsEquipment(
  profile: EquipmentProfile,
  requiredEquipment: readonly EquipmentId[],
): boolean {
  const available = new Set<EquipmentId>(profile.equipment);
  return requiredEquipment.every((equipment) => available.has(equipment));
}
