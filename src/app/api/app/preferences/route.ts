import type { NextRequest } from "next/server";

import { getDatabase } from "@/db/client";
import { getCurrentViewer } from "@/server/auth/viewer";
import { assertValidMutationRequest } from "@/server/auth/request";
import {
  privateJson,
  readBoundedJson,
  requirePrivateViewer,
} from "@/server/http/custom-exercise-api";
import {
  preferencesUpdateRequestSchema,
  profileProgramApiError,
} from "@/server/http/profile-program-api";
import { updateViewerPreferences } from "@/server/repositories/profile-program";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function PATCH(request: NextRequest): Promise<Response> {
  try {
    assertValidMutationRequest(request);
    const viewer = requirePrivateViewer(await getCurrentViewer());
    const input = preferencesUpdateRequestSchema.parse(await readBoundedJson(request));
    const profileProgram = await updateViewerPreferences(getDatabase(), viewer, input);
    return privateJson({ profileProgram });
  } catch (error) {
    return profileProgramApiError(error);
  }
}
