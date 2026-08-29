import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ExerciseVideoField } from "@/components/video/exercise-video-field";
import { EQUIPMENT_PROFILES } from "@/domain/equipment";
import type { CatalogExercise } from "@/domain/exercises/catalog-generator";

const textOnlyExercise: CatalogExercise = Object.freeze({
  slug: "synthetic-text-only-movement",
  name: "Synthetic text-only movement",
  role: "accessory",
  loggingKind: "bodyweight_reps",
  requiredEquipment: ["bodyweight"] as const,
  movementFamily: "synthetic-text-only",
  primaryMuscles: Object.freeze(["core"]),
  aliases: Object.freeze(["Text-only movement"]),
  instructions: Object.freeze([
    "Set a stable starting position.",
    "Move under control.",
    "Stop before the position changes.",
  ]),
});

afterEach(() => {
  vi.doUnmock("@/domain/exercises/catalog");
  vi.resetModules();
});

describe("text-only canonical presentation", () => {
  it("searches the synthetic record and renders instructions without an iframe", async () => {
    vi.doMock("@/domain/exercises/catalog", async (importOriginal) => {
      const actual = await importOriginal<
        typeof import("@/domain/exercises/catalog")
      >();
      return {
        ...actual,
        CATALOG_EXERCISES: Object.freeze({
          ...actual.CATALOG_EXERCISES,
          [textOnlyExercise.slug]: textOnlyExercise,
        }),
      };
    });
    const { listCatalogExercises } = await import("@/domain/exercises/library");
    const results = listCatalogExercises({
      profile: EQUIPMENT_PROFILES.dumbbells,
      query: "text only",
    });
    const result = results.find(({ slug }) => slug === textOnlyExercise.slug);
    const markup = renderToStaticMarkup(
      <main>
        <ol>
          {result?.instructions.map((instruction) => (
            <li key={instruction}>{instruction}</li>
          ))}
        </ol>
        <ExerciseVideoField videos={undefined} />
      </main>,
    );

    expect(result).toEqual(textOnlyExercise);
    expect(markup).toContain("Move under control.");
    expect(markup).toContain("Curated demos unavailable");
    expect(markup).not.toContain("<iframe");
  });
});
