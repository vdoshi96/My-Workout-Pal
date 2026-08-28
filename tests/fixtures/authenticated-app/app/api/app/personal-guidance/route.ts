import type { NextRequest } from "next/server";

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
import { assertHarnessMutationRequest } from "../../../../server/csrf";
import { getHarnessDatabase } from "../../../../server/database";
import { harnessRequestContext } from "../../../../server/harness-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const context = harnessRequestContext(request.headers);
    const viewer = requirePrivateViewer(context.viewer);
    const source = personalGuidanceQuerySchema.parse({
      kind: request.nextUrl.searchParams.get("kind"),
      id: request.nextUrl.searchParams.get("id"),
    });
    const { database } = await getHarnessDatabase(context.scope);
    return privateJson({
      guidance: await getPersonalGuidance(database, viewer, source),
    });
  } catch (error) {
    return personalGuidanceApiError(error);
  }
}

export async function PUT(request: NextRequest): Promise<Response> {
  try {
    assertHarnessMutationRequest(request);
    const context = harnessRequestContext(request.headers);
    const viewer = requirePrivateMutationViewer(context.viewer);
    const input = replacePersonalGuidanceRequestSchema.parse(
      await readBoundedJson(request),
    );
    const { database } = await getHarnessDatabase(context.scope);
    return privateJson(await replacePersonalGuidance(database, viewer, input));
  } catch (error) {
    return personalGuidanceApiError(error);
  }
}
