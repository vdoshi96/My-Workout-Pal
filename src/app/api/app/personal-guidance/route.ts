import type { NextRequest } from "next/server";

import { getDatabase } from "@/db/client";
import { assertValidMutationRequest } from "@/server/auth/request";
import { getCurrentViewer } from "@/server/auth/viewer";
import {
  privateJson,
  readBoundedJson,
  requirePrivateMutationViewer,
  requirePrivateViewer,
} from "@/server/http/custom-exercise-api";
import {
  personalGuidanceApiError,
  personalGuidanceQuerySchema,
  replacePersonalGuidanceRequestSchema,
} from "@/server/http/personal-guidance-api";
import {
  getPersonalGuidance,
  replacePersonalGuidance,
} from "@/server/repositories/personal-guidance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const viewer = requirePrivateViewer(await getCurrentViewer());
    const source = personalGuidanceQuerySchema.parse({
      kind: request.nextUrl.searchParams.get("kind"),
      id: request.nextUrl.searchParams.get("id"),
    });
    const guidance = await getPersonalGuidance(getDatabase(), viewer, source);
    return privateJson({ guidance });
  } catch (error) {
    return personalGuidanceApiError(error);
  }
}

export async function PUT(request: NextRequest): Promise<Response> {
  try {
    assertValidMutationRequest(request);
    const viewer = requirePrivateMutationViewer(await getCurrentViewer());
    const input = replacePersonalGuidanceRequestSchema.parse(
      await readBoundedJson(request),
    );
    const result = await replacePersonalGuidance(getDatabase(), viewer, input);
    return privateJson(result);
  } catch (error) {
    return personalGuidanceApiError(error);
  }
}
