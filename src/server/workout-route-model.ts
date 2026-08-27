import {
  EQUIPMENT_PROFILES,
  type EquipmentId,
  type EquipmentProfileKind,
} from "@/domain/equipment";
import type { LoggingKind } from "@/domain/exercises/catalog";
import {
  listCatalogExercises,
  listOwnedCustomExercises,
} from "@/domain/exercises/library";
import { deterministicSeedUuid } from "@/domain/seed/identity";
import type { ExerciseSubstitution } from "@/domain/workout-runner";

type CustomCandidateSource = Readonly<{
  id: string;
  name: string;
  loggingKind: LoggingKind;
  equipmentIds: readonly EquipmentId[];
  aliases: readonly Readonly<{ alias: string; normalizedAlias: string }>[];
}>;

type EffectiveExerciseSource = Readonly<{
  snapshotId: string;
  effectiveCatalogExerciseId: string | undefined;
  effectiveCustomExerciseId: string | undefined;
}>;

function nonblank(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new TypeError(`${label} must be nonblank.`);
  return normalized;
}

export function buildWorkoutRouteCandidates(
  profileKind: EquipmentProfileKind,
  customExercises: readonly CustomCandidateSource[],
  availableEquipment?: readonly EquipmentId[],
): readonly ExerciseSubstitution[] {
  const profile = availableEquipment === undefined
    ? EQUIPMENT_PROFILES[profileKind]
    : { ...EQUIPMENT_PROFILES[profileKind], equipment: availableEquipment };
  const catalog = listCatalogExercises({ profile }).map((exercise) => ({
    id: deterministicSeedUuid("catalog-exercise", exercise.slug),
    name: exercise.name,
    loggingKind: exercise.loggingKind,
  }));
  const custom = listOwnedCustomExercises(customExercises, { profile }).map(
    (exercise) => ({
      id: exercise.id,
      name: exercise.name,
      loggingKind: exercise.loggingKind,
    }),
  );
  const candidates = [...catalog, ...custom];
  if (new Set(candidates.map(({ id }) => id)).size !== candidates.length) {
    throw new TypeError("Workout substitution candidate identity is duplicated.");
  }
  return candidates;
}

export function effectiveWorkoutExerciseIds(
  exerciseStates: readonly EffectiveExerciseSource[],
): Readonly<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const state of exerciseStates) {
    const snapshotId = nonblank(state.snapshotId, "Snapshot identity");
    const identities = [
      state.effectiveCatalogExerciseId,
      state.effectiveCustomExerciseId,
    ].filter((value): value is string => value !== undefined);
    if (identities.length !== 1 || result[snapshotId] !== undefined) {
      throw new TypeError(
        "Each workout snapshot requires one effective exercise identity.",
      );
    }
    result[snapshotId] = nonblank(
      identities[0]!,
      "Effective exercise identity",
    );
  }
  return result;
}
