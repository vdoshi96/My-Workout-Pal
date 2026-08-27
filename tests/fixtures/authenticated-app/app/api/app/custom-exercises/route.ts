import type { NextRequest } from "next/server";

import {
  createCustomExerciseRequestSchema,
  customExerciseApiError,
  privateJson,
  readBoundedJson,
  requirePrivateMutationViewer,
  requirePrivateViewer,
} from "@/server/http/custom-exercise-api";
import {
  createCustomExercise,
  listCustomExercises,
} from "@/server/repositories/custom-exercises";
import { assertHarnessMutationRequest } from "../../../../server/csrf";
import { getHarnessDatabase } from "../../../../server/database";
import { harnessRequestContext } from "../../../../server/harness-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: NextRequest): Promise<Response>;
export function GET(): Promise<Response>;
export async function GET(request?: NextRequest): Promise<Response> {
  try {
    const context = harnessRequestContext(request?.headers ?? new Headers());
    const viewer = requirePrivateViewer(context.viewer);
    const { database } = await getHarnessDatabase(context.scope);
    const exercises = await listCustomExercises(database, viewer);
    return privateJson({ exercises });
  } catch (error) {
    return customExerciseApiError(error);
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    assertHarnessMutationRequest(request);
    const context = harnessRequestContext(request.headers);
    const viewer = requirePrivateMutationViewer(context.viewer);
    const input = createCustomExerciseRequestSchema.parse(await readBoundedJson(request));
    const { database } = await getHarnessDatabase(context.scope);
    const result = await createCustomExercise(database, viewer, input);
    return privateJson(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    return customExerciseApiError(error);
  }
}
