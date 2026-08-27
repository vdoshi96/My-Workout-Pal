import type { NextRequest } from "next/server";

import { createWorkoutApi } from "@/server/http/workout-api";
import { createWorkoutRepository } from "@/server/repositories/workout-repository";
import { getHarnessDatabase } from "../../../../server/database";
import { harnessRequestContext } from "../../../../server/harness-context";
import { adaptHarnessWorkoutMutation } from "../../../../server/workout-request";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<Response> {
  const context = harnessRequestContext(request.headers);
  const { database } = await getHarnessDatabase(context.scope);
  const api = createWorkoutApi({
    getRepository: () => createWorkoutRepository(database),
    getViewer: async () => context.viewer,
  });
  return api.start(await adaptHarnessWorkoutMutation(request));
}
