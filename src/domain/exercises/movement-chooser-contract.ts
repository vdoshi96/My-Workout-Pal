import { z } from "zod";

import type { LoggingKind } from "@/domain/exercises/catalog";

export const movementChooserIntentSchema = z.enum([
  "add",
  "replace",
  "seed-day",
]);

export type MovementChooserIntent = "add" | "replace" | "seed-day";

export const movementSourceSchema = z
  .object({
    kind: z.enum(["catalog", "custom"]),
    id: z.string().uuid(),
  })
  .strict();

export type MovementSource = Readonly<{
  kind: "catalog" | "custom";
  id: string;
}>;

export const movementChooserSelectionSchema = z
  .object({
    source: movementSourceSchema,
    name: z.string().trim().min(1).max(180),
    loggingKind: z.enum([
      "weight_reps",
      "bodyweight_reps",
      "duration",
      "distance_duration",
    ] satisfies readonly LoggingKind[]),
  })
  .strict();

/** Display and default hints only. Server publication remains authoritative. */
export type MovementSelection = Readonly<{
  source: MovementSource;
  name: string;
  loggingKind: LoggingKind;
}>;

export const movementChooserRequestSchema = z.discriminatedUnion("intent", [
  z.object({ intent: z.literal("add") }).strict(),
  z.object({ intent: z.literal("seed-day") }).strict(),
  z
    .object({
      intent: z.literal("replace"),
      currentSelection: movementChooserSelectionSchema,
    })
    .strict(),
]);

export type MovementChooserRequest =
  | Readonly<{ intent: "add" | "seed-day" }>
  | Readonly<{
      intent: "replace";
      currentSelection: MovementSelection;
    }>;

export const movementChooserErrorSchema = z
  .object({
    code: z.enum([
      "authentication_required",
      "create_failed",
      "guidance_failed",
      "invalid_selection",
      "load_failed",
    ]),
    message: z.string().trim().min(1).max(240),
    retryable: z.boolean(),
  })
  .strict();

export type MovementChooserError = Readonly<
  z.infer<typeof movementChooserErrorSchema>
>;

export type MovementChooserAdapterProps = Readonly<{
  request: MovementChooserRequest;
  onSelect: (selection: MovementSelection) => void;
  onDismiss: () => void;
  onError: (error: MovementChooserError) => void;
}>;
