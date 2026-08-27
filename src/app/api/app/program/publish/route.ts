import type { NextRequest } from "next/server";

import { getDatabase } from "@/db/client";
import { assertValidMutationRequest } from "@/server/auth/request";
import { getCurrentViewer } from "@/server/auth/viewer";
import {
  privateJson,
  readBoundedJson,
  requirePrivateMutationViewer,
} from "@/server/http/custom-exercise-api";
import {
  profileProgramApiError,
  programPublishRequestSchema,
} from "@/server/http/profile-program-api";
import { publishViewerProgram } from "@/server/repositories/profile-program";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest): Promise<Response> {
  try {
    assertValidMutationRequest(request);
    const viewer = requirePrivateMutationViewer(await getCurrentViewer());
    const input = programPublishRequestSchema.parse(await readBoundedJson(request));
    const profileProgram = await publishViewerProgram(getDatabase(), viewer, input);
    return privateJson({ profileProgram });
  } catch (error) {
    return profileProgramApiError(error);
  }
}
