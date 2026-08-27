import type { NextRequest } from "next/server";

import {
  privateJson,
  requirePrivateViewer,
} from "@/server/http/custom-exercise-api";
import { profileProgramApiError } from "@/server/http/profile-program-api";
import { getViewerProfileProgram } from "@/server/repositories/profile-program";
import { getHarnessDatabase } from "../../../../server/database";
import { harnessRequestContext } from "../../../../server/harness-context";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export function GET(request: NextRequest): Promise<Response>;
export function GET(): Promise<Response>;
export async function GET(request?: NextRequest): Promise<Response> {
  try {
    const context = harnessRequestContext(request?.headers ?? new Headers());
    const viewer = requirePrivateViewer(context.viewer);
    const { database } = await getHarnessDatabase(context.scope);
    const profileProgram = await getViewerProfileProgram(database, viewer);
    return privateJson({ profileProgram });
  } catch (error) {
    return profileProgramApiError(error);
  }
}
