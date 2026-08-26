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
