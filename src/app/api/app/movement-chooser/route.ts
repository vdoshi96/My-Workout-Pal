import { getDatabase } from "@/db/client";
import { getCurrentViewer } from "@/server/auth/viewer";
import {
  customExerciseApiError,
  privateJson,
  requirePrivateViewer,
} from "@/server/http/custom-exercise-api";
import { loadMovementChooserData } from "@/server/read-models/movement-chooser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const viewer = requirePrivateViewer(await getCurrentViewer());
    const data = await loadMovementChooserData(getDatabase(), viewer);
    return privateJson(data);
  } catch (error) {
    return customExerciseApiError(error);
  }
}
