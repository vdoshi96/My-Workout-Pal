import type { NextRequest } from "next/server";

import { getDatabase } from "@/db/client";
import { getCurrentViewer } from "@/server/auth/viewer";
import { createWorkoutApi } from "@/server/http/workout-api";
import { createWorkoutRepository } from "@/server/repositories/workout-repository";

export const runtime = "nodejs";

const api = createWorkoutApi({
  getViewer: getCurrentViewer,
  getRepository: () => createWorkoutRepository(getDatabase()),
});

export async function POST(
  request: NextRequest,
  context: Readonly<{ params: Promise<{ sessionId: string }> }>,
) {
  return api.operate(request, await context.params);
}
