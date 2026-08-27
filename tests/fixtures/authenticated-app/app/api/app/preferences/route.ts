import type { NextRequest } from "next/server";

import {
  privateJson,
  readBoundedJson,
  requirePrivateMutationViewer,
} from "@/server/http/custom-exercise-api";
import {
  preferencesUpdateRequestSchema,
  profileProgramApiError,
} from "@/server/http/profile-program-api";
import { updateViewerPreferences } from "@/server/repositories/profile-program";
import { assertHarnessMutationRequest } from "../../../../server/csrf";
import { getHarnessDatabase } from "../../../../server/database";
import { harnessRequestContext } from "../../../../server/harness-context";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function PATCH(request: NextRequest): Promise<Response> {
  try {
    assertHarnessMutationRequest(request);
    const context = harnessRequestContext(request.headers);
    const viewer = requirePrivateMutationViewer(context.viewer);
    const input = preferencesUpdateRequestSchema.parse(await readBoundedJson(request));
    const { database } = await getHarnessDatabase(context.scope);
    const profileProgram = await updateViewerPreferences(database, viewer, input);
    return privateJson({ profileProgram });
  } catch (error) {
    return profileProgramApiError(error);
  }
}
