import type { NextRequest } from "next/server";

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
import { assertHarnessMutationRequest } from "../../../../server/csrf";
import { getHarnessDatabase } from "../../../../server/database";
import { harnessRequestContext } from "../../../../server/harness-context";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    assertHarnessMutationRequest(request);
    const context = harnessRequestContext(request.headers);
    const viewer = requirePrivateMutationViewer(context.viewer);
    const input = programCollectionMutationRequestSchema.parse(await readBoundedJson(request));
    const { database } = await getHarnessDatabase(context.scope);
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
