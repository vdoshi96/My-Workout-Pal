import { describe, expect, it, vi } from "vitest";

import {
  compatibleWorkoutSubstitutions,
  createWorkoutStartController,
  parseWorkoutStartResponse,
  recoverOwnedWorkoutState,
  workoutRoutePath,
  workoutStartRequest,
} from "@/client/owned-workout";
import {
  createRunnerState,
  createWorkoutSnapshot,
  runnerReducer,
  type ExerciseSubstitution,
} from "@/domain/workout-runner";

const programId = "10000000-0000-4000-8000-000000000001";
const dayId = "10000000-0000-4000-8000-000000000002";
const sessionId = "10000000-0000-4000-8000-000000000003";

function runnerState() {
  return createRunnerState(createWorkoutSnapshot({
    sessionId,
    ownerUid: "firebase-owner",
    programRevisionId: "10000000-0000-4000-8000-000000000004",
    dayId,
    dayName: "Push",
    exercises: [{
      id: "10000000-0000-4000-8000-000000000005",
      name: "Dumbbell bench press",
      loggingKind: "weight_reps",
      sets: [{
        id: "10000000-0000-4000-8000-000000000006",
        position: 1,
        phase: "work",
        target: {
          kind: "weight_reps",
          minimumReps: 8,
          maximumReps: 12,
          restSeconds: 90,
        },
      }],
    }],
    cardioOptions: [],
  }), { now: 1_000 });
}

describe("owned workout route contract", () => {
  it("creates an owner-free start request and stable workout path", () => {
    expect(workoutStartRequest({
      programId: ` ${programId} `,
      dayId: ` ${dayId} `,
      idempotencyKey: " start-push-1 ",
    })).toEqual({
      url: "/api/app/workouts",
      body: {
        programId,
        dayId,
        idempotencyKey: "start-push-1",
      },
    });
    expect(workoutRoutePath(sessionId)).toBe(`/workout/${sessionId}`);
    expect(() => workoutStartRequest({
      programId: "not-a-uuid",
      dayId,
      idempotencyKey: "start-push-1",
    })).toThrow(/program/i);
  });

  it("accepts only a strict created or resumed session response", () => {
    expect(parseWorkoutStartResponse({
      resumed: false,
      model: { session: { id: sessionId } },
    })).toEqual({ resumed: false, sessionId });
    expect(parseWorkoutStartResponse({
      resumed: true,
      model: { session: { id: sessionId } },
    })).toEqual({ resumed: true, sessionId });

    for (const value of [
      null,
      { resumed: "yes", model: { session: { id: sessionId } } },
      { resumed: true, model: { session: { id: "foreign" } } },
      { resumed: true, model: { session: { id: sessionId } }, ownerUid: "attacker" },
    ]) {
      expect(() => parseWorkoutStartResponse(value)).toThrow(/response/i);
    }
  });

  it("reuses one start identity after interruption and navigates only after success", async () => {
    const mutate = vi
      .fn()
      .mockRejectedValueOnce(new Error("connection interrupted"))
      .mockResolvedValueOnce({
        resumed: true,
        model: { session: { id: sessionId } },
      });
    const navigate = vi.fn();
    const createId = vi.fn(() => "stable-start-key");
    const controller = createWorkoutStartController({
      createId,
      mutate,
      navigate,
    });

    await expect(controller.start({ programId, dayId })).rejects.toThrow(
      /interrupted/,
    );
    expect(navigate).not.toHaveBeenCalled();
    await expect(controller.start({ programId, dayId })).resolves.toEqual({
      resumed: true,
      sessionId,
    });
    expect(createId).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledTimes(2);
    expect(mutate.mock.calls[0]).toEqual(mutate.mock.calls[1]);
    expect(navigate).toHaveBeenCalledWith(`/workout/${sessionId}`);
  });

  it("uses the server baseline only when no owner-matched local draft exists", () => {
    const server = runnerState();
    expect(recoverOwnedWorkoutState(server, undefined)).toBe(server);

    const local = runnerReducer(server, {
      type: "update_set_draft",
      setId: "10000000-0000-4000-8000-000000000006",
      draft: { kind: "weight_reps", weightKg: 22.5, repetitions: 10 },
    });
    const recovered = recoverOwnedWorkoutState(server, local);
    expect(recovered).not.toBe(server);
    expect(recovered.dirtySetIds).toEqual([
      "10000000-0000-4000-8000-000000000006",
    ]);
    expect(recovered.drafts["10000000-0000-4000-8000-000000000006"]).toEqual({
      kind: "weight_reps",
      weightKg: 22.5,
      repetitions: 10,
    });
  });

  it("filters compatible substitutions by logging kind and effective identity", () => {
    const exercise = runnerState().snapshot.exercises[0]!;
    const candidates: readonly ExerciseSubstitution[] = [
      { id: "catalog-current", name: "Dumbbell bench press", loggingKind: "weight_reps" },
      { id: "catalog-incline", name: "Incline dumbbell press", loggingKind: "weight_reps" },
      { id: "catalog-plank", name: "Front plank", loggingKind: "duration" },
    ];
    expect(compatibleWorkoutSubstitutions(
      exercise,
      candidates,
      { [exercise.id]: "catalog-current" },
    )).toEqual([candidates[1]]);
  });
});
