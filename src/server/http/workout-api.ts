import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import type { WorkoutMeasurement } from "@/domain/analytics";
import { AuthPolicyError } from "@/server/auth/policy";
import { assertValidMutationRequest } from "@/server/auth/request";
import type { ViewerContext } from "@/server/auth/viewer";
import {
  WorkoutRepositoryError,
  type WorkoutRepository,
} from "@/server/repositories/workout-repository";
import type {
  RunnerOperation,
  RunnerOperationPayload,
} from "@/domain/workout-runner";

const MAX_BODY_BYTES = 32 * 1_024;
const MAX_IDEMPOTENCY_KEY_LENGTH = 180;
const MAX_NOTE_LENGTH = 2_000;
const MAX_REASON_LENGTH = 500;

const resourceId = z.string().trim().uuid();
const idempotencyKey = z.string().trim().min(1).max(MAX_IDEMPOTENCY_KEY_LENGTH);
const optionalWarmup = z.boolean().optional();

const measurement = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("weight_reps"),
    weightKg: z.number().finite().nonnegative(),
    repetitions: z.number().int().positive(),
    isWarmup: optionalWarmup,
  }).strict(),
  z.object({
    kind: z.literal("bodyweight_reps"),
    repetitions: z.number().int().positive(),
    addedWeightKg: z.number().finite().nonnegative().optional(),
    isWarmup: optionalWarmup,
  }).strict(),
  z.object({
    kind: z.literal("duration"),
    durationSeconds: z.number().int().positive(),
    isWarmup: optionalWarmup,
  }).strict(),
  z.object({
    kind: z.literal("distance_duration"),
    distanceMeters: z.number().finite().positive(),
    durationSeconds: z.number().int().positive(),
    isWarmup: optionalWarmup,
  }).strict(),
]);

const cardio = z.object({
  mode: z.enum(["walker", "runner"]),
  durationSeconds: z.number().int().positive(),
  distanceMeters: z.number().finite().positive().optional(),
  paceSecondsPerKilometer: z.number().int().positive().optional(),
  paceSource: z.enum(["entered", "derived"]).optional(),
  inclinePercent: z.number().finite().min(0).max(100).optional(),
  notes: z.string().max(MAX_NOTE_LENGTH),
}).strict().superRefine((value, context) => {
  if ((value.paceSecondsPerKilometer === undefined) !== (value.paceSource === undefined)) {
    context.addIssue({
      code: "custom",
      message: "Pace and pace source must be supplied together.",
    });
  }
});

const startInput = z.object({
  programId: resourceId,
  dayId: resourceId,
  idempotencyKey,
}).strict();

const paramsInput = z.object({ sessionId: resourceId }).strict();
const operationCommon = {
  idempotencyKey,
  baseRevision: resourceId,
};

const operationInput = z.discriminatedUnion("kind", [
  z.object({
    ...operationCommon,
    kind: z.literal("save_set"),
    payload: z.object({
      kind: z.literal("save_set"),
      setId: z.string().trim().min(1).max(220),
      exerciseId: resourceId,
      phase: z.enum(["warmup", "work"]),
      measurement,
    }).strict(),
  }).strict(),
  z.object({
    ...operationCommon,
    kind: z.literal("save_cardio"),
    payload: z.object({
      kind: z.literal("save_cardio"),
      mode: z.enum(["walker", "runner"]),
      cardio,
    }).strict(),
  }).strict(),
  z.object({
    ...operationCommon,
    kind: z.literal("save_note"),
    payload: z.object({
      kind: z.literal("save_note"),
      exerciseId: resourceId,
      note: z.string().max(MAX_NOTE_LENGTH),
    }).strict(),
  }).strict(),
  z.object({
    ...operationCommon,
    kind: z.literal("skip_exercise"),
    payload: z.object({
      kind: z.literal("skip_exercise"),
      exerciseId: resourceId,
      reason: z.string().max(MAX_REASON_LENGTH).optional(),
    }).strict(),
  }).strict(),
  z.object({
    ...operationCommon,
    kind: z.literal("substitute_exercise"),
    payload: z.object({
      kind: z.literal("substitute_exercise"),
      exerciseId: resourceId,
      replacement: z.object({
        id: resourceId,
        name: z.string().trim().min(1).max(180),
        loggingKind: z.enum(["weight_reps", "bodyweight_reps", "duration", "distance_duration"]),
      }).strict(),
      reason: z.string().max(MAX_REASON_LENGTH).optional(),
    }).strict(),
  }).strict(),
  z.object({
    ...operationCommon,
    kind: z.literal("complete_exercise"),
    payload: z.object({
      kind: z.literal("complete_exercise"),
      exerciseId: resourceId,
    }).strict(),
  }).strict(),
  z.object({
    ...operationCommon,
    kind: z.literal("abandon_session"),
    payload: z.object({
      kind: z.literal("abandon_session"),
      sessionId: resourceId,
      reason: z.string().max(MAX_REASON_LENGTH).optional(),
    }).strict(),
  }).strict(),
  z.object({
    ...operationCommon,
    kind: z.literal("complete_session"),
    payload: z.object({
      kind: z.literal("complete_session"),
      sessionId: resourceId,
    }).strict(),
  }).strict(),
]);

class RequestBodyTooLargeError extends Error {}

type WorkoutApiDependencies = Readonly<{
  getViewer(): Promise<ViewerContext | null>;
  getRepository(): WorkoutRepository;
  now?: () => number;
}>;

type WorkoutRouteParams = Readonly<{ sessionId: string }>;

function json(body: unknown, status = 200): NextResponse {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function repositoryMessage(code: WorkoutRepositoryError["code"]): string {
  switch (code) {
    case "unauthenticated":
      return "Sign in to access this workout.";
    case "mutation_forbidden":
      return "Verify your email before saving workout data.";
    case "not_found":
      return "The requested workout was not found.";
    case "invalid_request":
      return "The workout request is invalid.";
    case "conflict":
      return "The workout changed before this update could be saved.";
    case "stale_version":
      return "The workout changed. Reload it before retrying.";
    case "terminal":
      return "This completed or abandoned workout cannot be changed.";
    case "not_ready":
      return "Finish the required workout steps before continuing.";
  }
}

function repositoryStatus(code: WorkoutRepositoryError["code"]): number {
  switch (code) {
    case "unauthenticated":
      return 401;
    case "mutation_forbidden":
      return 403;
    case "not_found":
      return 404;
    case "invalid_request":
      return 400;
    case "conflict":
    case "stale_version":
    case "terminal":
    case "not_ready":
      return 409;
  }
}

function errorResponse(error: unknown, mutation: boolean): NextResponse {
  if (error instanceof AuthPolicyError) {
    return json({ error: error.code, message: error.message }, error.status);
  }
  if (error instanceof RequestBodyTooLargeError) {
    return json({ error: "request_too_large", message: "The request body is too large." }, 413);
  }
  if (error instanceof z.ZodError || error instanceof SyntaxError) {
    return json({ error: "invalid_request", message: "The workout request is invalid." }, 400);
  }
  if (error instanceof WorkoutRepositoryError) {
    return json(
      { error: error.code, message: repositoryMessage(error.code) },
      repositoryStatus(error.code),
    );
  }
  return json(
    {
      error: "workout_unavailable",
      message: mutation
        ? "The workout could not be updated."
        : "The workout could not be loaded.",
    },
    500,
  );
}

async function requireViewer(getViewer: WorkoutApiDependencies["getViewer"]): Promise<ViewerContext> {
  const viewer = await getViewer();
  if (!viewer) {
    throw new WorkoutRepositoryError("unauthenticated", "A signed-in viewer is required.");
  }
  return viewer;
}

function requireMutationViewer(viewer: ViewerContext): void {
  if (!viewer.eligibleForPermanentMutations) {
    throw new WorkoutRepositoryError(
      "mutation_forbidden",
      "This account must complete verification before saving workout data.",
    );
  }
}

async function readJson(request: NextRequest): Promise<unknown> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    const bytes = Number(declaredLength);
    if (!Number.isSafeInteger(bytes) || bytes < 0) {
      throw new SyntaxError("Invalid content length.");
    }
    if (bytes > MAX_BODY_BYTES) throw new RequestBodyTooLargeError();
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    throw new RequestBodyTooLargeError();
  }
  return JSON.parse(text) as unknown;
}

function payloadForRepository(
  input: z.infer<typeof operationInput>,
): RunnerOperationPayload {
  switch (input.kind) {
    case "save_set":
      return {
        ...input.payload,
        measurement: measurementForRepository(input.payload.measurement),
      };
    case "save_note":
    case "complete_exercise":
      return input.payload;
    case "save_cardio":
      return {
        ...input.payload,
        cardio: {
          ...input.payload.cardio,
          distanceMeters: input.payload.cardio.distanceMeters,
          paceSecondsPerKilometer: input.payload.cardio.paceSecondsPerKilometer,
          paceSource: input.payload.cardio.paceSource,
          inclinePercent: input.payload.cardio.inclinePercent,
        },
      };
    case "skip_exercise":
    case "substitute_exercise":
      return { ...input.payload, reason: input.payload.reason };
    case "abandon_session":
      return { ...input.payload, reason: input.payload.reason };
    case "complete_session":
      return input.payload;
  }
}

function operationForRepository(
  viewer: ViewerContext,
  sessionId: string,
  input: z.infer<typeof operationInput>,
  createdAt: number,
): RunnerOperation {
  return {
    sessionId,
    ownerUid: viewer.uid,
    baseRevision: input.baseRevision,
    idempotencyKey: input.idempotencyKey,
    kind: input.kind,
    payload: payloadForRepository(input),
    sequence: 0,
    createdAt,
    attempts: 0,
    status: "pending",
    persistedId: undefined,
    errorCode: undefined,
    errorMessage: undefined,
    retryable: undefined,
    failureKind: undefined,
  };
}

function measurementForRepository(
  input: z.infer<typeof measurement>,
): WorkoutMeasurement {
  switch (input.kind) {
    case "weight_reps":
      return {
        kind: input.kind,
        weightKg: input.weightKg,
        repetitions: input.repetitions,
        ...(input.isWarmup === undefined ? {} : { isWarmup: input.isWarmup }),
      };
    case "bodyweight_reps":
      return {
        kind: input.kind,
        repetitions: input.repetitions,
        ...(input.addedWeightKg === undefined ? {} : { addedWeightKg: input.addedWeightKg }),
        ...(input.isWarmup === undefined ? {} : { isWarmup: input.isWarmup }),
      };
    case "duration":
      return {
        kind: input.kind,
        durationSeconds: input.durationSeconds,
        ...(input.isWarmup === undefined ? {} : { isWarmup: input.isWarmup }),
      };
    case "distance_duration":
      return {
        kind: input.kind,
        distanceMeters: input.distanceMeters,
        durationSeconds: input.durationSeconds,
        ...(input.isWarmup === undefined ? {} : { isWarmup: input.isWarmup }),
      };
  }
}

export function createWorkoutApi(dependencies: WorkoutApiDependencies) {
  return {
    async start(request: NextRequest): Promise<NextResponse> {
      try {
        assertValidMutationRequest(request);
        const viewer = await requireViewer(dependencies.getViewer);
        requireMutationViewer(viewer);
        const input = startInput.parse(await readJson(request));
        const result = await dependencies.getRepository().startOrResume(viewer, input);
        return json(result, result.resumed ? 200 : 201);
      } catch (error) {
        return errorResponse(error, true);
      }
    },

    async resume(_request: NextRequest, params: WorkoutRouteParams): Promise<NextResponse> {
      try {
        const viewer = await requireViewer(dependencies.getViewer);
        const input = paramsInput.parse(params);
        const model = await dependencies.getRepository().loadResume(viewer, input);
        return json(model);
      } catch (error) {
        return errorResponse(error, false);
      }
    },

    async operate(request: NextRequest, params: WorkoutRouteParams): Promise<NextResponse> {
      try {
        assertValidMutationRequest(request);
        const viewer = await requireViewer(dependencies.getViewer);
        requireMutationViewer(viewer);
        const { sessionId } = paramsInput.parse(params);
        const input = operationInput.parse(await readJson(request));
        const result = await dependencies
          .getRepository()
          .submitRunnerOperation(
            viewer,
            operationForRepository(
              viewer,
              sessionId,
              input,
              dependencies.now?.() ?? Date.now(),
            ),
          );
        return json(result);
      } catch (error) {
        return errorResponse(error, true);
      }
    },
  };
}
