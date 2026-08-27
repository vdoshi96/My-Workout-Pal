import type { NextRequest } from "next/server";

import {
  privateJson,
  readBoundedJson,
  requirePrivateMutationViewer,
} from "@/server/http/custom-exercise-api";
import {
  profileProgramApiError,
  programPublishRequestSchema,
} from "@/server/http/profile-program-api";
import { publishViewerProgram } from "@/server/repositories/profile-program";
import { assertHarnessMutationRequest } from "../../../../../server/csrf";
import { getHarnessDatabase } from "../../../../../server/database";
import { consumeHarnessFault } from "../../../../../server/fault-injection";
import { harnessRequestContext } from "../../../../../server/harness-context";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest): Promise<Response> {
  try {
    assertHarnessMutationRequest(request);
    const context = harnessRequestContext(request.headers);
    const viewer = requirePrivateMutationViewer(context.viewer);
    const input = programPublishRequestSchema.parse(await readBoundedJson(request));
    const { database } = await getHarnessDatabase(context.scope);
    const profileProgram = await publishViewerProgram(database, viewer, input);
    if (consumeHarnessFault(context, "accept-next-program-publish-then-error")) {
      return privateJson(
        {
          error: "fixture_transport_failure",
          message: "The synthetic transport lost the accepted publication response.",
        },
        { status: 500 },
      );
    }
    return privateJson({ profileProgram });
  } catch (error) {
    return profileProgramApiError(error);
  }
}
