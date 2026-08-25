import type { NextRequest } from "next/server";

import { getDatabase } from "@/db/client";
import { assertValidMutationRequest } from "@/server/auth/request";
import { getCurrentViewer } from "@/server/auth/viewer";
import {
  customExerciseApiError,
  customExerciseIdSchema,
  deleteCustomExerciseRequestSchema,
  privateJson,
  readBoundedJson,
  requirePrivateViewer,
  updateCustomExerciseRequestSchema,
} from "@/server/http/custom-exercise-api";
import {
  deleteCustomExercise,
  getCustomExercise,
  updateCustomExercise,
} from "@/server/repositories/custom-exercises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = Readonly<{ params: Promise<{ id: string }> }>;

async function exerciseId(context: RouteContext): Promise<string> {
  return customExerciseIdSchema.parse((await context.params).id);
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const viewer = requirePrivateViewer(await getCurrentViewer());
    const exercise = await getCustomExercise(getDatabase(), viewer, await exerciseId(context));
    return privateJson({ exercise });
  } catch (error) {
    return customExerciseApiError(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    assertValidMutationRequest(request);
    const viewer = requirePrivateViewer(await getCurrentViewer());
    const exerciseIdValue = await exerciseId(context);
    const input = updateCustomExerciseRequestSchema.parse(await readBoundedJson(request));
    const result = await updateCustomExercise(getDatabase(), viewer, {
      ...input,
      exerciseId: exerciseIdValue,
    });
    return privateJson(result);
  } catch (error) {
    return customExerciseApiError(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    assertValidMutationRequest(request);
    const viewer = requirePrivateViewer(await getCurrentViewer());
    const exerciseIdValue = await exerciseId(context);
    const input = deleteCustomExerciseRequestSchema.parse(await readBoundedJson(request));
    const result = await deleteCustomExercise(getDatabase(), viewer, {
      ...input,
      exerciseId: exerciseIdValue,
    });
    return privateJson(result);
  } catch (error) {
    return customExerciseApiError(error);
  }
}
