import type { EquipmentId } from "@/domain/equipment";
import type { MeasurementKind } from "@/domain/analytics";

export const EQUIPMENT_LABELS: Readonly<Record<EquipmentId, string>> = {
  bodyweight: "Bodyweight", dumbbells: "Dumbbells", bench: "Ordinary bench", barbell: "Barbell", plates: "Weight plates", rack: "Rack",
};
export const LOGGING_KIND_LABELS: Readonly<Record<MeasurementKind, string>> = {
  weight_reps: "Weight and reps", bodyweight_reps: "Reps", duration: "Time", distance_duration: "Distance and time",
};
