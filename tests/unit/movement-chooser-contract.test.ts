import { describe, expect, it, vi } from "vitest";

import {
  movementChooserIntentSchema,
  movementChooserRequestSchema,
  movementChooserSelectionSchema,
  type MovementChooserAdapterProps,
  type MovementSelection,
} from "@/domain/exercises/movement-chooser-contract";

const catalogSelection = {
  source: {
    kind: "catalog",
    id: "11111111-1111-4111-8111-111111111111",
  },
  name: "Dumbbell bench press",
  loggingKind: "weight_reps",
} as const;

describe("movement chooser contract", () => {
  it("accepts only the three frozen chooser intents", () => {
    expect(
      ["add", "replace", "seed-day"].map((intent) =>
        movementChooserIntentSchema.parse(intent),
      ),
    ).toEqual(["add", "replace", "seed-day"]);
    expect(() => movementChooserIntentSchema.parse("substitute")).toThrow();
  });

  it("returns only a source, name, and canonical logging kind", () => {
    expect(movementChooserSelectionSchema.parse(catalogSelection)).toEqual(
      catalogSelection,
    );

    expect(() =>
      movementChooserSelectionSchema.parse({
        ...catalogSelection,
        prescriptionKey: "day-builder-owned",
      }),
    ).toThrow();
    expect(() =>
      movementChooserSelectionSchema.parse({
        ...catalogSelection,
        loggingKind: "repetitions",
      }),
    ).toThrow();
    expect(() =>
      movementChooserSelectionSchema.parse({
        ...catalogSelection,
        source: { kind: "catalog", id: "not-an-opaque-id" },
      }),
    ).toThrow();
  });

  it("requires replacement context and excludes it from add and seed requests", () => {
    expect(movementChooserRequestSchema.parse({ intent: "add" })).toEqual({
      intent: "add",
    });
    expect(
      movementChooserRequestSchema.parse({ intent: "seed-day" }),
    ).toEqual({ intent: "seed-day" });
    expect(
      movementChooserRequestSchema.parse({
        intent: "replace",
        currentSelection: catalogSelection,
      }),
    ).toEqual({
      intent: "replace",
      currentSelection: catalogSelection,
    });

    expect(() =>
      movementChooserRequestSchema.parse({ intent: "replace" }),
    ).toThrow();
    expect(() =>
      movementChooserRequestSchema.parse({
        intent: "add",
        currentSelection: catalogSelection,
      }),
    ).toThrow();
  });

  it("keeps select, dismiss, and UI-safe error callbacks at the adapter boundary", () => {
    const onSelect = vi.fn<(selection: MovementSelection) => void>();
    const onDismiss = vi.fn<() => void>();
    const onError = vi.fn<MovementChooserAdapterProps["onError"]>();
    const props = {
      request: {
        intent: "replace",
        currentSelection: catalogSelection,
      },
      onSelect,
      onDismiss,
      onError,
    } satisfies MovementChooserAdapterProps;

    props.onSelect(movementChooserSelectionSchema.parse(catalogSelection));
    props.onDismiss();
    props.onError({
      code: "load_failed",
      message: "Movements could not be loaded.",
      retryable: true,
    });

    expect(onSelect).toHaveBeenCalledExactlyOnceWith(catalogSelection);
    expect(onDismiss).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledExactlyOnceWith({
      code: "load_failed",
      message: "Movements could not be loaded.",
      retryable: true,
    });
  });
});
