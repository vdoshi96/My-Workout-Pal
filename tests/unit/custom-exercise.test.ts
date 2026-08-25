import { describe, expect, it } from "vitest";

import {
  CustomExerciseValidationError,
  assessCustomExerciseSemanticEdit,
  normalizeCustomExerciseDraft,
} from "@/domain/exercises/custom";

describe("custom exercise domain", () => {
  it("normalizes private exercise fields and at most two YouTube URLs", () => {
    expect(
      normalizeCustomExerciseDraft({
        name: "  Cable-free row  ",
        loggingKind: "weight_reps",
        equipmentIds: ["bench", "dumbbells", "bench"],
        instructions: "  Keep the torso supported.  ",
        aliases: ["  Supported row ", "supported ROW", "Home row"],
        videoUrls: [
          "https://www.youtube.com/watch?v=abc123XYZ_1&utm_source=test",
          "https://youtu.be/DEF456uvw-2?t=30",
        ],
      }),
    ).toEqual({
      name: "Cable-free row",
      loggingKind: "weight_reps",
      equipmentIds: ["bench", "dumbbells"],
      instructions: "Keep the torso supported.",
      aliases: [
        { alias: "Supported row", normalizedAlias: "supported row" },
        { alias: "Home row", normalizedAlias: "home row" },
      ],
      youtubeVideoIds: ["abc123XYZ_1", "DEF456uvw-2"],
    });
  });

  it.each([
    [{ name: "", loggingKind: "weight_reps", equipmentIds: ["dumbbells"] }, "name_required"],
    [
      { name: "Row", loggingKind: "unknown", equipmentIds: ["dumbbells"] },
      "logging_kind_invalid",
    ],
    [{ name: "Row", loggingKind: "weight_reps", equipmentIds: [] }, "equipment_required"],
    [
      { name: "Row", loggingKind: "weight_reps", equipmentIds: ["cable"] },
      "equipment_invalid",
    ],
    [
      {
        name: "Row",
        loggingKind: "weight_reps",
        equipmentIds: ["dumbbells"],
        instructions: 42,
      },
      "instructions_invalid",
    ],
    [
      {
        name: "Row",
        loggingKind: "weight_reps",
        equipmentIds: ["dumbbells"],
        aliases: ["Row", "ROW"],
      },
      "alias_matches_name",
    ],
    [
      {
        name: "Row",
        loggingKind: "weight_reps",
        equipmentIds: ["dumbbells"],
        videoUrls: [
          "https://youtu.be/abc123XYZ_1",
          "https://www.youtube.com/watch?v=abc123XYZ_1",
        ],
      },
      "duplicate_video_id",
    ],
  ] as const)("rejects invalid bounded input with code %s", (input, code) => {
    expect(() => normalizeCustomExerciseDraft(input as never)).toThrow(
      expect.objectContaining({
        name: "CustomExerciseValidationError",
        code,
      }) as CustomExerciseValidationError,
    );
  });

  it("requires a semantic clone when logging history would be reinterpreted", () => {
    expect(
      assessCustomExerciseSemanticEdit({
        previousLoggingKind: "weight_reps",
        nextLoggingKind: "duration",
        hasHistory: true,
      }),
    ).toEqual({ status: "requires_clone", reason: "logging_kind_history" });
    expect(
      assessCustomExerciseSemanticEdit({
        previousLoggingKind: "weight_reps",
        nextLoggingKind: "duration",
        hasHistory: false,
      }),
    ).toEqual({ status: "in_place" });
    expect(
      assessCustomExerciseSemanticEdit({
        previousLoggingKind: "weight_reps",
        nextLoggingKind: "weight_reps",
        hasHistory: true,
      }),
    ).toEqual({ status: "in_place" });
  });
});
