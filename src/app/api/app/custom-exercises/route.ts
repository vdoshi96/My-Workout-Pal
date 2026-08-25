import type { NextRequest } from "next/server";

import { getDatabase } from "@/db/client";
import { assertValidMutationRequest } from "@/server/auth/request";
import { getCurrentViewer } from "@/server/auth/viewer";
import {
  createCustomExerciseRequestSchema,
  customExerciseApiError,
  privateJson,
  readBoundedJson,
  requirePrivateViewer,
} from "@/server/http/custom-exercise-api";
import {
  createCustomExercise,
  listCustomExercises,
} from "@/server/repositories/custom-exercises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const viewer = requirePrivateViewer(await getCurrentViewer());
    const exercises = await listCustomExercises(getDatabase(), viewer);
    return privateJson({ exercises });
  } catch (error) {
    return customExerciseApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertValidMutationRequest(request);
    const viewer = requirePrivateViewer(await getCurrentViewer());
    const input = createCustomExerciseRequestSchema.parse(await readBoundedJson(request));
    const result = await createCustomExercise(getDatabase(), viewer, input);
    return privateJson(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    return customExerciseApiError(error);
  }
}
