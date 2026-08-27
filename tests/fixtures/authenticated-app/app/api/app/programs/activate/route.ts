import type { NextRequest } from "next/server";

import {
  privateJson,
  readBoundedJson,
  requirePrivateMutationViewer,
} from "@/server/http/custom-exercise-api";
import {
  activateProgramRequestSchema,
  profileProgramApiError,
} from "@/server/http/profile-program-api";
import { activateViewerProgram } from "@/server/repositories/profile-program";
import { assertHarnessMutationRequest } from "../../../../../server/csrf";
import { getHarnessDatabase } from "../../../../../server/database";
import { harnessRequestContext } from "../../../../../server/harness-context";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest): Promise<Response> {
  try {
    assertHarnessMutationRequest(request);
    const context = harnessRequestContext(request.headers);
    const viewer = requirePrivateMutationViewer(context.viewer);
    const input = activateProgramRequestSchema.parse(await readBoundedJson(request));
    const { database } = await getHarnessDatabase(context.scope);
    const profileProgram = await activateViewerProgram(database, viewer, input);
    return privateJson({ profileProgram });
  } catch (error) {
    return profileProgramApiError(error);
  }
}
