import { getDatabase } from "@/db/client";
import { getCurrentViewer } from "@/server/auth/viewer";
import { privateJson, requirePrivateViewer } from "@/server/http/custom-exercise-api";
import { profileProgramApiError } from "@/server/http/profile-program-api";
import { getViewerProfileProgram } from "@/server/repositories/profile-program";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(): Promise<Response> {
  try {
    const viewer = requirePrivateViewer(await getCurrentViewer());
    const profileProgram = await getViewerProfileProgram(getDatabase(), viewer);
    return privateJson({ profileProgram });
  } catch (error) {
    return profileProgramApiError(error);
  }
}
