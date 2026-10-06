import { privateApiMutation } from "@/client/private-api";
import {
  parseGeneratedProgramResponse,
  parseOnboardingResponse,
  parseTrainingProfileResponse,
  type GeneratedProgramClientModel,
} from "@/components/program/program-mutation-response";
import type { EquipmentProfileKind } from "@/domain/equipment";
import type { TrainingProfileAnswers } from "@/domain/programs/generate-routine";
import type {
  ActiveProgramReadModel,
  TrainingProfileReadModel,
} from "@/server/repositories/profile-program";

/**
 * Client calls for the answer-based onboarding and Settings "Your training".
 * Every call sends answers only; the server rebuilds the routine itself and
 * derives ownership from the session. Errors surface as PrivateApiClientError
 * (code, status, message) or a plain Error when the response shape is wrong.
 *
 * To render the routine before saving, call `generateStarterRoutine` from
 * `@/domain/programs/generate-routine` with the same answers and equipment;
 * the server produces the identical routine.
 */

/**
 * Holds one idempotency key per user action. Reuse `current()` for every
 * retry of the same action and call `settle()` after a success (or when the
 * person changes the inputs) so the next action gets a fresh key.
 */
export function createRetryStableKey(): Readonly<{
  current: () => string;
  settle: () => void;
}> {
  let key: string | null = null;
  return {
    current() {
      key ??= globalThis.crypto.randomUUID();
      return key;
    },
    settle() {
      key = null;
    },
  };
}

export type GeneratedOnboardingRequest = Readonly<{
  equipmentProfileKind: EquipmentProfileKind;
  idempotencyKey: string;
  reducedMotion: boolean;
  timezone: string;
  trainingProfile: TrainingProfileAnswers;
  unitSystem: "metric" | "imperial";
}>;

/** "Save my routine" on the onboarding preview. Returns the new active routine. */
export async function submitGeneratedOnboarding(
  input: GeneratedOnboardingRequest,
): Promise<ActiveProgramReadModel> {
  const raw = await privateApiMutation<unknown>("/api/app/profile-program/onboard", {
    body: {
      equipmentProfileKind: input.equipmentProfileKind,
      idempotencyKey: input.idempotencyKey,
      mode: "generated",
      reducedMotion: input.reducedMotion,
      timezone: input.timezone,
      trainingProfile: input.trainingProfile,
      unitSystem: input.unitSystem,
    },
    method: "POST",
  });
  return parseOnboardingResponse(raw, {
    equipmentProfileKind: input.equipmentProfileKind,
    mode: "generated",
    reducedMotion: input.reducedMotion,
    timezone: input.timezone,
    trainingProfile: input.trainingProfile,
    unitSystem: input.unitSystem,
  });
}

export type TrainingProfileSaveRequest = Readonly<{
  /** The `updatedAt` last read, or `null` when no answers are saved yet. */
  expectedUpdatedAt: string | null;
  idempotencyKey: string;
  trainingProfile: TrainingProfileAnswers;
}>;

/** Saves the answers in Settings. Does not change the active routine. */
export async function saveTrainingProfile(
  input: TrainingProfileSaveRequest,
): Promise<TrainingProfileReadModel> {
  const raw = await privateApiMutation<unknown>("/api/app/training-profile", {
    body: {
      expectedUpdatedAt: input.expectedUpdatedAt,
      idempotencyKey: input.idempotencyKey,
      trainingProfile: input.trainingProfile,
    },
    method: "PUT",
  });
  return parseTrainingProfileResponse(raw, input.trainingProfile);
}

export type BuildRoutineFromAnswersRequest = Readonly<{
  /** Ask the person first; `true` makes the new routine active right away. */
  activate: boolean;
  equipmentProfileKind: EquipmentProfileKind;
  idempotencyKey: string;
  /** Optional; defaults to the generated name such as "3-day full body". */
  name?: string | undefined;
  trainingProfile: TrainingProfileAnswers;
}>;

/** "Build a new routine from these answers". Adds a routine to Routines. */
export async function buildRoutineFromAnswers(
  input: BuildRoutineFromAnswersRequest,
): Promise<GeneratedProgramClientModel> {
  const raw = await privateApiMutation<unknown>("/api/app/programs", {
    body: {
      activate: input.activate,
      equipmentProfileKind: input.equipmentProfileKind,
      idempotencyKey: input.idempotencyKey,
      mode: "generated",
      ...(input.name === undefined ? {} : { name: input.name }),
      trainingProfile: input.trainingProfile,
    },
    method: "POST",
  });
  return parseGeneratedProgramResponse(raw, {
    activate: input.activate,
    equipmentProfileKind: input.equipmentProfileKind,
  });
}
