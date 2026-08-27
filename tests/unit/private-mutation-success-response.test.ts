import { describe, expect, it } from "vitest";

import {
  parseCustomExerciseDeleteResponse,
  parseCustomExerciseMutationResponse,
} from "@/components/exercises/custom-exercise-response";
import { parsePreferencesMutationResponse } from "@/components/settings/preferences-response";

const draft = {
  aliases: ["Supported row"],
  equipmentIds: ["dumbbells", "bench"],
  instructions: "Brace and row.",
  loggingKind: "weight_reps",
  name: "Private row",
  videoUrls: ["https://www.youtube.com/watch?v=b5JzUH8gsOg"],
} as const;

const exercise = {
  aliases: [{ alias: "Supported row", normalizedAlias: "supported row" }],
  equipmentIds: ["dumbbells", "bench"],
  id: "11111111-1111-4111-8111-111111111111",
  instructions: "Brace and row.",
  loggingKind: "weight_reps",
  name: "Private row",
  updatedAt: "2026-08-26T18:00:00.000Z",
  youtubeVideoIds: ["b5JzUH8gsOg"],
};

describe("private mutation success responses", () => {
  it("accepts only the exact saved preferences", () => {
    const expected = {
      reducedMotion: true,
      timezone: "America/Chicago",
      unitSystem: "metric" as const,
    };
    expect(parsePreferencesMutationResponse({
      profileProgram: {
        preferences: { ...expected, updatedAt: "2026-08-26T18:00:00.000Z" },
      },
    }, expected)).toEqual({ ...expected, updatedAt: "2026-08-26T18:00:00.000Z" });
    expect(() => parsePreferencesMutationResponse({}, expected)).toThrow(
      "invalid preferences response",
    );
    expect(() => parsePreferencesMutationResponse({
      profileProgram: {
        preferences: { ...expected, timezone: "UTC", updatedAt: "2026-08-26T18:00:00.000Z" },
      },
    }, expected)).toThrow("does not match the saved preferences");
  });

  it("validates custom exercise shape, normalized draft meaning, identity, and duplicate state", () => {
    expect(parseCustomExerciseMutationResponse(
      { duplicate: false, exercise },
      draft,
    )).toEqual({ duplicate: false, exercise });
    expect(() => parseCustomExerciseMutationResponse({}, draft)).toThrow(
      "invalid custom exercise response",
    );
    expect(() => parseCustomExerciseMutationResponse(
      { duplicate: false, exercise: { ...exercise, id: "22222222-2222-4222-8222-222222222222" } },
      draft,
      exercise.id,
    )).toThrow("does not match the edited exercise");
  });

  it("does not navigate after a malformed or wrong-identity delete response", () => {
    expect(parseCustomExerciseDeleteResponse(
      { duplicate: true, exerciseId: exercise.id },
      exercise.id,
    )).toEqual({ duplicate: true, exerciseId: exercise.id });
    expect(() => parseCustomExerciseDeleteResponse(
      { duplicate: false, exerciseId: "22222222-2222-4222-8222-222222222222" },
      exercise.id,
    )).toThrow("does not match the deleted exercise");
  });
});
