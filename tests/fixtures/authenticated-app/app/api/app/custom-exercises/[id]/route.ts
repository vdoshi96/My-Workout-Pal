import type { NextRequest } from "next/server";

import {
  customExerciseApiError,
  customExerciseIdSchema,
  deleteCustomExerciseRequestSchema,
  privateJson,
  readBoundedJson,
  requirePrivateMutationViewer,
  requirePrivateViewer,
  updateCustomExerciseRequestSchema,
} from "@/server/http/custom-exercise-api";
import {
  deleteCustomExercise,
  getCustomExercise,
  updateCustomExercise,
} from "@/server/repositories/custom-exercises";
import { assertHarnessMutationRequest } from "../../../../../server/csrf";
import { getHarnessDatabase } from "../../../../../server/database";
import { harnessRequestContext } from "../../../../../server/harness-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = Readonly<{ params: Promise<{ id: string }> }>;

async function exerciseId(context: RouteContext): Promise<string> {
  return customExerciseIdSchema.parse((await context.params).id);
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  try {
    const harness = harnessRequestContext(request.headers);
    const viewer = requirePrivateViewer(harness.viewer);
    const { database } = await getHarnessDatabase(harness.scope);
    const exercise = await getCustomExercise(database, viewer, await exerciseId(context));
    return privateJson({ exercise });
  } catch (error) {
    return customExerciseApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  try {
    assertHarnessMutationRequest(request);
    const harness = harnessRequestContext(request.headers);
    const viewer = requirePrivateMutationViewer(harness.viewer);
    const id = await exerciseId(context);
    const input = updateCustomExerciseRequestSchema.parse(await readBoundedJson(request));
    const { database } = await getHarnessDatabase(harness.scope);
    const result = await updateCustomExercise(database, viewer, {
      ...input,
      exerciseId: id,
    });
    return privateJson(result);
  } catch (error) {
    return customExerciseApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  try {
    assertHarnessMutationRequest(request);
    const harness = harnessRequestContext(request.headers);
    const viewer = requirePrivateMutationViewer(harness.viewer);
    const id = await exerciseId(context);
    const input = deleteCustomExerciseRequestSchema.parse(await readBoundedJson(request));
    const { database } = await getHarnessDatabase(harness.scope);
    const result = await deleteCustomExercise(database, viewer, {
      ...input,
      exerciseId: id,
    });
    return privateJson(result);
  } catch (error) {
    return customExerciseApiError(error);
  }
}
