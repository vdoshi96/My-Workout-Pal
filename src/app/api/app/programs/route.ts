import type { NextRequest } from "next/server";

import { getDatabase } from "@/db/client";
import { assertValidMutationRequest } from "@/server/auth/request";
import { getCurrentViewer } from "@/server/auth/viewer";
import {
  privateJson,
  readBoundedJson,
  requirePrivateMutationViewer,
} from "@/server/http/custom-exercise-api";
import {
  profileProgramApiError,
  programCollectionMutationRequestSchema,
} from "@/server/http/profile-program-api";
import {
  cloneViewerProgram,
  createViewerProgramFromAnswers,
  createViewerProgramFromCustom,
  createViewerProgramFromStarter,
} from "@/server/repositories/profile-program";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest): Promise<Response> {
  try {
    assertValidMutationRequest(request);
    const viewer = requirePrivateMutationViewer(await getCurrentViewer());
    const input = programCollectionMutationRequestSchema.parse(
      await readBoundedJson(request),
    );
    const database = getDatabase();
    const profileProgram =
      input.mode === "starter"
        ? await createViewerProgramFromStarter(database, viewer, {
            equipmentProfileKind: input.equipmentProfileKind,
            idempotencyKey: input.idempotencyKey,
            name: input.name,
          })
        : input.mode === "custom"
          ? await createViewerProgramFromCustom(database, viewer, {
              dayName: input.dayName,
              equipmentProfileKind: input.equipmentProfileKind,
              firstCatalogExerciseId: input.firstCatalogExerciseId,
              idempotencyKey: input.idempotencyKey,
              name: input.name,
              sectionName: input.sectionName,
            })
          : input.mode === "generated"
            ? await createViewerProgramFromAnswers(database, viewer, {
                activate: input.activate,
                equipmentProfileKind: input.equipmentProfileKind,
                idempotencyKey: input.idempotencyKey,
                name: input.name,
                trainingProfile: input.trainingProfile,
              })
            : await cloneViewerProgram(database, viewer, {
              idempotencyKey: input.idempotencyKey,
              name: input.name,
              sourceProgramId: input.sourceProgramId,
              sourceRevisionId: input.sourceRevisionId,
            });
    return privateJson({ profileProgram }, { status: 201 });
  } catch (error) {
    return profileProgramApiError(error);
  }
}
