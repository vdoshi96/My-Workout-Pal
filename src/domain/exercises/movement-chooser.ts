import { z } from "zod";

import { EQUIPMENT_IDS, type EquipmentId } from "@/domain/equipment";
import {
  movementChooserSelectionSchema,
  type MovementSelection,
} from "@/domain/exercises/movement-chooser-contract";

const equipmentIdSchema = z.enum(EQUIPMENT_IDS);

export const movementChooserCandidateSchema = z
  .object({
    selection: movementChooserSelectionSchema,
    requiredEquipment: z.array(equipmentIdSchema).min(1).max(EQUIPMENT_IDS.length),
    searchText: z.string().max(2_000),
    hasApprovedGuidance: z.boolean(),
  })
  .strict();

export type MovementChooserCandidate = Readonly<{
  selection: MovementSelection;
  requiredEquipment: readonly EquipmentId[];
  searchText: string;
  hasApprovedGuidance: boolean;
}>;

export const movementChooserDataSchema = z
  .object({
    canMutate: z.boolean(),
    equipmentProfileKind: z.enum(["dumbbells", "barbell"]),
    availableEquipment: z.array(equipmentIdSchema).min(1).max(EQUIPMENT_IDS.length),
    candidates: z.array(movementChooserCandidateSchema).max(500),
  })
  .strict();

export type MovementChooserData = Readonly<{
  canMutate: boolean;
  equipmentProfileKind: "dumbbells" | "barbell";
  availableEquipment: readonly EquipmentId[];
  candidates: readonly MovementChooserCandidate[];
}>;

export type MovementChooserSourceFilter = "all" | "canonical" | "private";

function normalizedTerms(query: string): readonly string[] | undefined {
  if (typeof query !== "string" || query.length > 120) return undefined;
  return query
    .trim()
    .toLocaleLowerCase("en-US")
    .split(/\s+/u)
    .filter(Boolean);
}

export function filterMovementChooserCandidates(
  candidates: readonly MovementChooserCandidate[],
  query: string,
  sourceFilter: MovementChooserSourceFilter,
): readonly MovementChooserCandidate[] {
  const terms = normalizedTerms(query);
  if (terms === undefined) return [];
  return candidates.filter((candidate) => {
    if (
      sourceFilter === "canonical" &&
      candidate.selection.source.kind !== "catalog"
    ) {
      return false;
    }
    if (
      sourceFilter === "private" &&
      candidate.selection.source.kind !== "custom"
    ) {
      return false;
    }
    const searchable = [
      candidate.selection.name,
      candidate.selection.loggingKind.replaceAll("_", " "),
      ...candidate.requiredEquipment,
      candidate.searchText,
    ]
      .join(" ")
      .toLocaleLowerCase("en-US");
    return terms.every((term) => searchable.includes(term));
  });
}
