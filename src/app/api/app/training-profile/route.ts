import type { NextRequest } from "next/server";

import { getDatabase } from "@/db/client";
import { getCurrentViewer } from "@/server/auth/viewer";
import { assertValidMutationRequest } from "@/server/auth/request";
import {
  privateJson,
  readBoundedJson,
  requirePrivateMutationViewer,
} from "@/server/http/custom-exercise-api";
import {
  profileProgramApiError,
  trainingProfileUpdateRequestSchema,
} from "@/server/http/profile-program-api";
import { updateViewerTrainingProfile } from "@/server/repositories/profile-program";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Saves the member's training answers. Never changes the active routine. */
export async function PUT(request: NextRequest): Promise<Response> {
  try {
    assertValidMutationRequest(request);
    const viewer = requirePrivateMutationViewer(await getCurrentViewer());
    const input = trainingProfileUpdateRequestSchema.parse(await readBoundedJson(request));
    const profileProgram = await updateViewerTrainingProfile(getDatabase(), viewer, input);
    return privateJson({ profileProgram });
  } catch (error) {
    return profileProgramApiError(error);
  }
}
