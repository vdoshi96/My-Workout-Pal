import { z } from "zod";

import type { ProgramSummaryReadModel } from "@/server/repositories/profile-program";

const programSummarySchema = z
  .object({
    equipmentProfileKind: z.enum(["dumbbells", "barbell"]),
    id: z.string().uuid(),
    isActive: z.boolean(),
    name: z.string().min(1).max(180),
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
        programs: z.array(programSummarySchema).min(1).max(24),
      })
      .passthrough(),
  })
  .strict();

export type ProgramCollectionClientModel = Readonly<{
  activeProgramId: string;
  affectedProgramId: string;
  programs: readonly ProgramSummaryReadModel[];
}>;

export function parseProgramCollectionResponse(
  value: unknown,
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

  if (
    !parsed.data.profileProgram.programs.some(
      (program) => program.id === parsed.data.profileProgram.affectedProgramId,
    )
  ) {
    throw new Error(
      "The affected program is missing from the collection response.",
    );
  }

  return {
    activeProgramId: activeProgram.id,
    affectedProgramId: parsed.data.profileProgram.affectedProgramId,
    programs: parsed.data.profileProgram.programs,
  };
}

export function validatedProgramName(value: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) throw new Error("Enter a program name.");
  if (normalized.length > 180) {
    throw new Error("Use 180 characters or fewer for the program name.");
  }
  return normalized;
}

export function suggestedCloneName(sourceName: string): string {
  const suffix = " copy";
  return `${sourceName.slice(0, 180 - suffix.length).trimEnd()}${suffix}`;
}

export function retryableOperationKey(
  current: string | undefined,
  generate: () => string,
): string {
  return current ?? generate();
}
