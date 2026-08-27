import {
  reconcileWorkoutResumeState,
  RunnerResumeError,
} from "@/domain/workout-resume";
import type {
  ActiveWorkoutState,
  ExerciseSubstitution,
  WorkoutExerciseSnapshot,
} from "@/domain/workout-runner";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export class OwnedWorkoutContractError extends Error {
  readonly code: "invalid_request" | "invalid_response";

  constructor(
    code: "invalid_request" | "invalid_response",
    message: string,
  ) {
    super(message);
    this.name = "OwnedWorkoutContractError";
    this.code = code;
  }
}

type WorkoutStartInput = Readonly<{
  programId: string;
  dayId: string;
  idempotencyKey: string;
}>;

export type WorkoutStartRequest = Readonly<{
  url: "/api/app/workouts";
  body: Readonly<{
    programId: string;
    dayId: string;
    idempotencyKey: string;
  }>;
}>;

export type WorkoutStartResponse = Readonly<{
  resumed: boolean;
  sessionId: string;
}>;

export type WorkoutStartMutation = (
  url: string,
  options: Readonly<{ body: unknown; method: "POST" }>,
) => Promise<unknown>;

export type WorkoutStartController = Readonly<{
  start: (
    input: Readonly<{ programId: string; dayId: string }>,
  ) => Promise<WorkoutStartResponse>;
}>;

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function resourceUuid(value: string, label: string): string {
  const normalized = value.trim();
  if (!UUID_PATTERN.test(normalized)) {
    throw new OwnedWorkoutContractError(
      "invalid_request",
      `The ${label} is invalid.`,
    );
  }
  return normalized;
}

function idempotencyKey(value: string): string {
  const normalized = value.trim();
  if (normalized.length < 1 || normalized.length > 180) {
    throw new OwnedWorkoutContractError(
      "invalid_request",
      "The workout start identity is invalid.",
    );
  }
  return normalized;
}

export function workoutStartRequest(
  input: WorkoutStartInput,
): WorkoutStartRequest {
  return {
    url: "/api/app/workouts",
    body: {
      programId: resourceUuid(input.programId, "program"),
      dayId: resourceUuid(input.dayId, "day"),
      idempotencyKey: idempotencyKey(input.idempotencyKey),
    },
  };
}

export function parseWorkoutStartResponse(
  value: unknown,
): WorkoutStartResponse {
  const root = record(value);
  const model = record(root?.["model"]);
  const session = record(model?.["session"]);
  const sessionId = session?.["id"];
  if (
    root === undefined ||
    Object.keys(root).some((key) => key !== "resumed" && key !== "model") ||
    typeof root["resumed"] !== "boolean" ||
    typeof sessionId !== "string" ||
    !UUID_PATTERN.test(sessionId)
  ) {
    throw new OwnedWorkoutContractError(
      "invalid_response",
      "The workout start response is invalid.",
    );
  }
  return { resumed: root["resumed"], sessionId };
}

export function workoutRoutePath(sessionId: string): `/workout/${string}` {
  return `/workout/${resourceUuid(sessionId, "workout session")}`;
}

export function workoutReauthenticationHref(
  sessionId: string,
): `/sign-in?returnTo=${string}` {
  return `/sign-in?returnTo=${encodeURIComponent(workoutRoutePath(sessionId))}`;
}

export function createWorkoutStartController(
  dependencies: Readonly<{
    createId: () => string;
    mutate: WorkoutStartMutation;
    navigate: (path: string) => void;
  }>,
): WorkoutStartController {
  let stableIdempotencyKey: string | undefined;
  return {
    async start(input) {
      stableIdempotencyKey ??= idempotencyKey(dependencies.createId());
      const request = workoutStartRequest({
        ...input,
        idempotencyKey: stableIdempotencyKey,
      });
      const response = parseWorkoutStartResponse(
        await dependencies.mutate(request.url, {
          body: request.body,
          method: "POST",
        }),
      );
      dependencies.navigate(workoutRoutePath(response.sessionId));
      return response;
    },
  };
}

export function recoverOwnedWorkoutState(
  server: ActiveWorkoutState | undefined,
  local: ActiveWorkoutState | undefined,
): ActiveWorkoutState {
  if (server === undefined) {
    throw new RunnerResumeError(
      "invalid_snapshot",
      "A server workout baseline is required before recovering this workout.",
    );
  }
  return local === undefined
    ? server
    : reconcileWorkoutResumeState(server, local);
}

export function compatibleWorkoutSubstitutions(
  exercise: WorkoutExerciseSnapshot,
  candidates: readonly ExerciseSubstitution[],
  effectiveExerciseIdBySnapshot: Readonly<Record<string, string>>,
): readonly ExerciseSubstitution[] {
  const currentId = effectiveExerciseIdBySnapshot[exercise.id];
  return candidates.filter(
    (candidate) =>
      candidate.loggingKind === exercise.loggingKind &&
      candidate.id !== currentId,
  );
}
