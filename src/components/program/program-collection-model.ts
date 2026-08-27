import { z } from "zod";

import type { ProgramSummaryReadModel } from "@/server/repositories/profile-program";

const programSummarySchema = z
  .object({
    equipmentProfileKind: z.enum(["dumbbells", "barbell"]),
    dayCount: z.number().int().min(1).max(14),
    id: z.string().uuid(),
    isActive: z.boolean(),
    name: z.string().min(1).max(80),
    programKey: z.string().min(1).max(180),
    revisionId: z.string().uuid(),
    revisionNumber: z.number().int().positive(),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict();

const programCollectionResponseSchema = z
  .object({
    profileProgram: z
      .object({
        activeProgram: z
          .object({
            id: z.string().uuid(),
            revisionId: z.string().uuid(),
          })
          .passthrough(),
        affectedProgramId: z.string().uuid(),
        affectedRevisionId: z.string().uuid(),
        programs: z.array(programSummarySchema).min(1).max(24),
        replayed: z.boolean(),
      })
      .passthrough(),
  })
  .strict();

export type ProgramCollectionClientModel = Readonly<{
  activeProgramId: string;
  activeProgramName: string;
  affectedProgramId: string;
  affectedProgramName: string;
  affectedRevisionId: string;
  programs: readonly ProgramSummaryReadModel[];
  replayed: boolean;
}>;

export type ProgramCollectionMutationExpectation = Readonly<
  | {
      equipmentProfileKind: "dumbbells" | "barbell";
      kind: "create";
      knownAffectedProgramId?: string;
      name: string;
      priorProgramIds: readonly string[];
    }
  | {
      kind: "clone";
      knownAffectedProgramId?: string;
      name: string;
      priorProgramIds: readonly string[];
      sourceEquipmentProfileKind: "dumbbells" | "barbell";
      sourceProgramId: string;
    }
  | {
      kind: "activate";
      programId: string;
      revisionId: string;
    }
>;

export function parseProgramCollectionResponse(
  value: unknown,
  expected: ProgramCollectionMutationExpectation,
): ProgramCollectionClientModel {
  const parsed = programCollectionResponseSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error(
      "The server returned an invalid program collection response.",
    );
  }

  const active = parsed.data.profileProgram.programs.filter(
    (program) => program.isActive,
  );
  if (active.length !== 1) {
    throw new Error("The server did not return exactly one active program.");
  }

  const activeProgram = active[0]!;
  if (
    parsed.data.profileProgram.activeProgram.id !== activeProgram.id ||
    parsed.data.profileProgram.activeProgram.revisionId !==
      activeProgram.revisionId
  ) {
    throw new Error(
      "The active program does not match the collection summary.",
    );
  }

  const affectedProgram = parsed.data.profileProgram.programs.find(
    (program) => program.id === parsed.data.profileProgram.affectedProgramId,
  );
  if (!affectedProgram) {
    throw new Error(
      "The affected program is missing from the collection response.",
    );
  }
  if (affectedProgram.revisionId !== parsed.data.profileProgram.affectedRevisionId) {
    throw new Error(
      "The affected revision does not match the collection response.",
    );
  }
  const affectedRootIsNewOrRememberedReplay =
    (expected.kind !== "create" && expected.kind !== "clone") ||
    !expected.priorProgramIds.includes(affectedProgram.id) ||
    (parsed.data.profileProgram.replayed &&
      expected.knownAffectedProgramId === affectedProgram.id);
  if (
    !affectedRootIsNewOrRememberedReplay ||
    (expected.kind === "activate" &&
      (affectedProgram.id !== expected.programId ||
        affectedProgram.revisionId !== expected.revisionId)) ||
    (expected.kind === "create" &&
      (affectedProgram.name !== expected.name ||
        affectedProgram.equipmentProfileKind !== expected.equipmentProfileKind)) ||
    (expected.kind === "clone" &&
      (affectedProgram.id === expected.sourceProgramId ||
        affectedProgram.name !== expected.name ||
        affectedProgram.equipmentProfileKind !== expected.sourceEquipmentProfileKind))
  ) {
    throw new Error("The server response does not match the requested program operation.");
  }

  return {
    activeProgramId: activeProgram.id,
    activeProgramName: activeProgram.name,
    affectedProgramId: parsed.data.profileProgram.affectedProgramId,
    affectedProgramName: affectedProgram.name,
    affectedRevisionId: parsed.data.profileProgram.affectedRevisionId,
    programs: parsed.data.profileProgram.programs,
    replayed: parsed.data.profileProgram.replayed,
  };
}

export function programCollectionSuccess(
  model: ProgramCollectionClientModel,
): Readonly<{ message: string; openActiveOverview: boolean }> {
  if (model.activeProgramId === model.affectedProgramId) {
    return {
      message: `${model.affectedProgramName} is active. Opening its overview…`,
      openActiveOverview: true,
    };
  }
  return {
    message: `${model.affectedProgramName} is already stored, but ${model.activeProgramName} remains active. Review your collection before opening an overview.`,
    openActiveOverview: false,
  };
}

export function validatedProgramName(value: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) throw new Error("Enter a program name.");
  if (normalized.length > 80) {
    throw new Error("Use 80 characters or fewer for the program name.");
  }
  return normalized;
}

export function suggestedCloneName(sourceName: string): string {
  const suffix = " copy";
  return `${sourceName.slice(0, 80 - suffix.length).trimEnd()}${suffix}`;
}

export function retryableOperationKey(
  current: string | undefined,
  generate: () => string,
): string {
  return current ?? generate();
}
