import type {
  RunnerOperation,
  RunnerSubmitResult,
} from "@/domain/workout-runner";

export class WorkoutApiContractError extends Error {
  readonly code: "invalid_operation" | "invalid_response";

  constructor(
    code: "invalid_operation" | "invalid_response",
    message: string,
  ) {
    super(message);
    this.name = "WorkoutApiContractError";
    this.code = code;
  }
}

export type WorkoutPrivateMutation = (
  url: string,
  options: Readonly<{ body: unknown; method: "POST" }>,
) => Promise<unknown>;

export type WorkoutRunnerSubmitter = (
  operation: RunnerOperation,
) => Promise<RunnerSubmitResult>;

export type RunnerOperationRequest = Readonly<{
  url: string;
  body: Readonly<{
    idempotencyKey: string;
    baseRevision: string;
    kind: RunnerOperation["kind"];
    payload: RunnerOperation["payload"];
  }>;
}>;

function nonblank(value: string): boolean {
  return value.trim().length > 0;
}

export function runnerOperationRequest(
  operation: RunnerOperation,
): RunnerOperationRequest {
  if (
    !nonblank(operation.sessionId) ||
    !nonblank(operation.baseRevision) ||
    !nonblank(operation.idempotencyKey) ||
    operation.kind !== operation.payload.kind
  ) {
    throw new WorkoutApiContractError(
      "invalid_operation",
      "The queued workout operation is invalid.",
    );
  }

  return {
    url: `/api/app/workouts/${encodeURIComponent(operation.sessionId)}/operations`,
    body: {
      idempotencyKey: operation.idempotencyKey,
      baseRevision: operation.baseRevision,
      kind: operation.kind,
      payload: operation.payload,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
): boolean {
  const keys = new Set(allowed);
  return Object.keys(value).every((key) => keys.has(key));
}

function optionalBoolean(
  value: Record<string, unknown>,
  key: string,
): boolean | undefined | null {
  const candidate = value[key];
  if (candidate === undefined) return undefined;
  return typeof candidate === "boolean" ? candidate : null;
}

function invalidResponse(): never {
  throw new WorkoutApiContractError(
    "invalid_response",
    "The workout save response is invalid.",
  );
}

export function parseRunnerSubmitResult(value: unknown): RunnerSubmitResult {
  if (!isRecord(value)) invalidResponse();

  const status = value["status"];
  if (status === "saved" || status === "duplicate") {
    if (!hasOnlyKeys(value, ["status", "persistedId"])) invalidResponse();
    const persistedId = value["persistedId"];
    if (
      persistedId !== undefined &&
      (typeof persistedId !== "string" || !nonblank(persistedId))
    ) {
      invalidResponse();
    }
    return persistedId === undefined ? { status } : { status, persistedId };
  }

  if (status !== "failed") invalidResponse();
  if (
    !hasOnlyKeys(value, [
      "status",
      "code",
      "message",
      "retryable",
      "authExpired",
      "conflict",
    ])
  ) {
    invalidResponse();
  }

  const code = value["code"];
  const message = value["message"];
  const retryable = optionalBoolean(value, "retryable");
  const authExpired = optionalBoolean(value, "authExpired");
  const conflict = optionalBoolean(value, "conflict");
  if (
    typeof code !== "string" ||
    !nonblank(code) ||
    (message !== undefined && typeof message !== "string") ||
    retryable === null ||
    authExpired === null ||
    conflict === null
  ) {
    invalidResponse();
  }

  return {
    status,
    code,
    ...(message === undefined ? {} : { message }),
    ...(retryable === undefined ? {} : { retryable }),
    ...(authExpired === undefined ? {} : { authExpired }),
    ...(conflict === undefined ? {} : { conflict }),
  };
}

export function createWorkoutRunnerSubmitter(
  mutate: WorkoutPrivateMutation,
): WorkoutRunnerSubmitter {
  return async (operation) => {
    const request = runnerOperationRequest(operation);
    const response = await mutate(request.url, {
      method: "POST",
      body: request.body,
    });
    return parseRunnerSubmitResult(response);
  };
}
