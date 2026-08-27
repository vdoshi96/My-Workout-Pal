import { z } from "zod";

import type { PreferencesReadModel } from "@/server/repositories/profile-program";

const preferencesSchema = z.object({
  reducedMotion: z.boolean(),
  timezone: z.string().trim().min(1).max(64),
  unitSystem: z.enum(["metric", "imperial"]),
  updatedAt: z.string().datetime({ offset: true }),
}).strict();

export function parsePreferencesMutationResponse(
  value: unknown,
  expected: Readonly<Pick<PreferencesReadModel, "reducedMotion" | "timezone" | "unitSystem">>,
): PreferencesReadModel {
  const parsed = z.object({
    profileProgram: z.object({ preferences: preferencesSchema }).passthrough(),
  }).strict().safeParse(value);
  if (!parsed.success) {
    throw new Error("The server returned an invalid preferences response.");
  }
  const saved = parsed.data.profileProgram.preferences;
  if (
    saved.reducedMotion !== expected.reducedMotion ||
    saved.timezone !== expected.timezone ||
    saved.unitSystem !== expected.unitSystem
  ) {
    throw new Error("The server response does not match the saved preferences.");
  }
  return saved;
}
