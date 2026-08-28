import type { LoggingKind } from "@/domain/exercises/catalog";

export type ProgramMovementSelection = Readonly<{
  loggingKind: LoggingKind;
  name: string;
  source: Readonly<{
    id: string;
    kind: "catalog" | "custom";
  }>;
}>;

export function programMovementSelectionFromCandidate(candidate: Readonly<{
  id: string;
  kind: "catalog" | "custom";
  loggingKind: LoggingKind;
  name: string;
}>): ProgramMovementSelection {
  return {
    loggingKind: candidate.loggingKind,
    name: candidate.name,
    source: {
      id: candidate.id,
      kind: candidate.kind,
    },
  };
}
