import type {
  ActiveProgramReadModel,
} from "@/server/repositories/profile-program";
import type { ProgramRevisionMutationClientModel } from "@/components/program/program-mutation-response";

export type ProgramRevisionReconciliation = Readonly<
  | {
      kind: "active";
      program: ActiveProgramReadModel;
    }
  | {
      activeProgramName: string;
      affectedProgramName: string;
      kind: "stored-inactive";
    }
>;

export function reconcileProgramRevisionMutation(
  editorProgram: ActiveProgramReadModel,
  result: ProgramRevisionMutationClientModel,
): ProgramRevisionReconciliation {
  if (result.affectedProgramId !== editorProgram.id) {
    throw new Error("The saved response does not match the editor program.");
  }
  const active = result.activeProgram;
  if (
    active &&
    active.id === result.affectedProgramId &&
    active.revisionId === result.affectedRevisionId
  ) {
    return { kind: "active", program: active };
  }
  return {
    activeProgramName: active?.name ?? "another program",
    affectedProgramName: editorProgram.name,
    kind: "stored-inactive",
  };
}
