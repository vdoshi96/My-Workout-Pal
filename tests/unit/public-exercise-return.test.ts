import { describe, expect, it } from "vitest";

import {
  exerciseDetailHref,
  resolvePublicExerciseReturn,
} from "@/domain/navigation/public-exercise-return";

describe("public exercise return contexts", () => {
  it.each([
    [
      "/program/push?equipment=barbell",
      { href: "/program/push?equipment=barbell", label: "Push day" },
    ],
    [
      "/program?equipment=dumbbells",
      { href: "/program?equipment=dumbbells", label: "Five-day starter example" },
    ],
    [
      "/library?equipment=dumbbells&q=bench%20press",
      {
        href: "/library?equipment=dumbbells&q=bench+press",
        label: "Exercise library",
      },
    ],
    [
      "/sample-workout?day=pull&equipment=barbell",
      {
        href: "/sample-workout?day=pull&equipment=barbell",
        label: "Pull sample workout",
      },
    ],
  ])("keeps the allowlisted origin %s", (rawReturnTo, expected) => {
    expect(resolvePublicExerciseReturn(rawReturnTo, "dumbbells")).toEqual(expected);
  });

  it.each([
    undefined,
    ["/program/push", "/library"],
    "https://attacker.example/program/push",
    "//attacker.example/program/push",
    "\\attacker.example/program/push",
    "/app/program/push",
    "/sign-in",
    "/program/push?equipment=barbell&equipment=dumbbells",
    "/program/push?unexpected=value",
    "/program/%00push",
    `/${"x".repeat(2_048)}`,
  ])("falls back safely for invalid origin %#", (rawReturnTo) => {
    expect(resolvePublicExerciseReturn(rawReturnTo, "barbell")).toEqual({
      href: "/library?equipment=barbell",
      label: "Exercise library",
    });
  });

  it("builds an exercise URL whose return context survives nested query values", () => {
    expect(
      exerciseDetailHref("dumbbell-bench-press", {
        equipment: "dumbbells",
        returnTo: "/program/push?equipment=dumbbells",
      }),
    ).toBe(
      "/library/dumbbell-bench-press?equipment=dumbbells&returnTo=%2Fprogram%2Fpush%3Fequipment%3Ddumbbells",
    );
  });
});
