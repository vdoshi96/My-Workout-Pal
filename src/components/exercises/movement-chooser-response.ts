import { z } from "zod";

import {
  movementChooserDataSchema,
  type MovementChooserData,
} from "@/domain/exercises/movement-chooser";
import {
  movementSourceSchema,
  type MovementSource,
} from "@/domain/exercises/movement-chooser-contract";
import {
  normalizePersonalGuidanceLinks,
  type PersonalGuidanceLink,
} from "@/domain/exercises/personal-guidance";

const personalGuidanceLinkSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("youtube"),
      canonicalUrl: z.string().url(),
      videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/u),
      embedUrl: z.string().url(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("external"),
      canonicalUrl: z.string().url(),
    })
    .strict(),
]);

const guidanceSchema = z
  .object({
    source: movementSourceSchema,
    links: z.array(personalGuidanceLinkSchema).max(2),
  })
  .strict();

const guidanceReadSchema = z.object({ guidance: guidanceSchema }).strict();
const guidanceMutationSchema = z
  .object({ guidance: guidanceSchema, duplicate: z.boolean() })
  .strict();

function sameSource(left: MovementSource, right: MovementSource): boolean {
  return left.kind === right.kind && left.id === right.id;
}

function safeGuidanceLinks(
  links: readonly PersonalGuidanceLink[],
): readonly PersonalGuidanceLink[] {
  const normalized = normalizePersonalGuidanceLinks(
    links.map(({ canonicalUrl }) => canonicalUrl),
  );
  if (JSON.stringify(normalized) !== JSON.stringify(links)) {
    throw new Error("The server returned an invalid personal guidance response.");
  }
  return normalized;
}

export function parseMovementChooserData(value: unknown): MovementChooserData {
  const parsed = movementChooserDataSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error("The server returned an invalid movement chooser response.");
  }
  return parsed.data;
}

export function parsePersonalGuidanceReadResponse(
  value: unknown,
  expectedSource: MovementSource,
): readonly PersonalGuidanceLink[] {
  const parsed = guidanceReadSchema.safeParse(value);
  if (!parsed.success || !sameSource(parsed.data.guidance.source, expectedSource)) {
    throw new Error("The server returned an invalid personal guidance response.");
  }
  return safeGuidanceLinks(parsed.data.guidance.links);
}

export function parsePersonalGuidanceMutationResponse(
  value: unknown,
  expectedSource: MovementSource,
): Readonly<{ links: readonly PersonalGuidanceLink[]; duplicate: boolean }> {
  const parsed = guidanceMutationSchema.safeParse(value);
  if (!parsed.success || !sameSource(parsed.data.guidance.source, expectedSource)) {
    throw new Error("The server returned an invalid personal guidance response.");
  }
  return {
    links: safeGuidanceLinks(parsed.data.guidance.links),
    duplicate: parsed.data.duplicate,
  };
}
