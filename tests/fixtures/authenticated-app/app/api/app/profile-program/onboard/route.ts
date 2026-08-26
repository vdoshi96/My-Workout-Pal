import type { NextRequest } from "next/server";

import {
  privateJson,
  readBoundedJson,
  requirePrivateMutationViewer,
} from "@/server/http/custom-exercise-api";
import {
  onboardingRequestSchema,
  profileProgramApiError,
} from "@/server/http/profile-program-api";
import { onboardViewer } from "@/server/repositories/profile-program";
import { assertHarnessMutationRequest } from "../../../../../server/csrf";
import { getHarnessDatabase } from "../../../../../server/database";
import { consumeHarnessFault } from "../../../../../server/fault-injection";
import { harnessRequestContext } from "../../../../../server/harness-context";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    assertHarnessMutationRequest(request);
    const context = harnessRequestContext(request.headers);
    const viewer = requirePrivateMutationViewer(context.viewer);
    const input = onboardingRequestSchema.parse(await readBoundedJson(request));
    if (consumeHarnessFault(context, "slow-onboard")) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (consumeHarnessFault(context, "fail-next-save")) {
      return privateJson(
        { error: "server_error", message: "The request could not be completed." },
        { status: 500 },
      );
    }
    const { database } = await getHarnessDatabase(context.scope);
    const profileProgram = await onboardViewer(database, viewer, input);
    return privateJson({ profileProgram }, { status: 201 });
  } catch (error) {
    return profileProgramApiError(error);
  }
}
