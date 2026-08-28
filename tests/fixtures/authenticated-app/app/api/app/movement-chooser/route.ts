import type { NextRequest } from "next/server";

import {
  customExerciseApiError,
  privateJson,
  requirePrivateViewer,
} from "@/server/http/custom-exercise-api";
import { loadMovementChooserData } from "@/server/read-models/movement-chooser";
import { getHarnessDatabase } from "../../../../server/database";
import { harnessRequestContext } from "../../../../server/harness-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const context = harnessRequestContext(request.headers);
    const viewer = requirePrivateViewer(context.viewer);
    const { database } = await getHarnessDatabase(context.scope);
    return privateJson(await loadMovementChooserData(database, viewer));
  } catch (error) {
    return customExerciseApiError(error);
  }
}
