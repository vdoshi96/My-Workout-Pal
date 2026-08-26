import type { NextRequest } from "next/server";

import { createWorkoutApi } from "@/server/http/workout-api";
import { createWorkoutRepository } from "@/server/repositories/workout-repository";
import { getHarnessDatabase } from "../../../../../server/database";
import { harnessRequestContext } from "../../../../../server/harness-context";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: Readonly<{ params: Promise<{ sessionId: string }> }>,
): Promise<Response> {
  const harness = harnessRequestContext(request.headers);
  const { database } = await getHarnessDatabase(harness.scope);
  const api = createWorkoutApi({
    getRepository: () => createWorkoutRepository(database),
    getViewer: async () => harness.viewer,
  });
  return api.resume(request, await context.params);
}
