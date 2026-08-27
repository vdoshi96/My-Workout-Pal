import { NextResponse, type NextRequest } from "next/server";

import { createWorkoutApi } from "@/server/http/workout-api";
import { createWorkoutRepository } from "@/server/repositories/workout-repository";
import { getHarnessDatabase } from "../../../../../../server/database";
import {
  consumeHarnessFault,
  consumeHarnessSessionAuthFailure,
} from "../../../../../../server/fault-injection";
import { harnessRequestContext } from "../../../../../../server/harness-context";
import { adaptHarnessWorkoutMutation } from "../../../../../../server/workout-request";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: Readonly<{ params: Promise<{ sessionId: string }> }>,
): Promise<Response> {
  const harness = harnessRequestContext(request.headers);
  const { database } = await getHarnessDatabase(harness.scope);
  const api = createWorkoutApi({
    getRepository: () => createWorkoutRepository(database),
    getViewer: async () => {
      const authFailure = consumeHarnessSessionAuthFailure(harness);
      if (authFailure) throw authFailure;
      return harness.viewer;
    },
  });
  const response = await api.operate(
    await adaptHarnessWorkoutMutation(request),
    await context.params,
  );
  if (
    response.ok &&
    consumeHarnessFault(harness, "accept-next-runner-then-error")
  ) {
    const interrupted = NextResponse.json(
      {
        error: "accepted_then_response_error",
        message: "The saved operation response was interrupted by the local QA harness.",
      },
      { status: 500 },
    );
    interrupted.headers.set("Cache-Control", "no-store");
    return interrupted;
  }
  return response;
}
