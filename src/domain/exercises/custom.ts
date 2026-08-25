import {
  EQUIPMENT_IDS,
  type EquipmentId,
} from "@/domain/equipment";
import type { LoggingKind } from "@/domain/exercises/catalog";
import {
  YouTubeReferenceError,
  normalizeCustomExerciseVideoIds,
} from "@/domain/youtube/normalization";

const LOGGING_KINDS = new Set<LoggingKind>([
  "weight_reps",
  "bodyweight_reps",
  "duration",
  "distance_duration",
]);
const EQUIPMENT = new Set<string>(EQUIPMENT_IDS);

export type CustomExerciseValidationCode =
  | "name_required"
  | "name_too_long"
  | "logging_kind_invalid"
  | "equipment_required"
  | "equipment_invalid"
  | "instructions_invalid"
  | "instructions_too_long"
  | "too_many_aliases"
  | "alias_invalid"
  | "alias_matches_name"
  | "duplicate_video_id"
  | "too_many_videos"
  | "youtube_url_invalid";

export class CustomExerciseValidationError extends Error {
  readonly code: CustomExerciseValidationCode;

  constructor(code: CustomExerciseValidationCode, message: string) {
    super(message);
    this.name = "CustomExerciseValidationError";
    this.code = code;
  }
}

export type CustomExerciseDraftInput = Readonly<{
  name: string;
  loggingKind: string;
  equipmentIds: readonly string[];
  instructions?: string | undefined;
  aliases?: readonly string[] | undefined;
  videoUrls?: readonly string[] | undefined;
}>;

export type NormalizedCustomExerciseDraft = Readonly<{
  name: string;
  loggingKind: LoggingKind;
  equipmentIds: readonly EquipmentId[];
  instructions: string;
  aliases: readonly Readonly<{
    alias: string;
    normalizedAlias: string;
  }>[];
  youtubeVideoIds: readonly string[];
}>;

function boundedText(
  input: unknown,
  field: "name" | "instructions" | "alias",
  maximumLength: number,
): string {
  if (typeof input !== "string") {
    const code =
      field === "name"
        ? "name_required"
        : field === "instructions"
          ? "instructions_invalid"
          : "alias_invalid";
    throw new CustomExerciseValidationError(
      code,
      `${field} must be text.`,
    );
  }
  const value = input.trim();
  if (field === "name" && value.length === 0) {
    throw new CustomExerciseValidationError(
      "name_required",
      "Exercise name is required.",
    );
  }
  if (field === "alias" && value.length === 0) {
    throw new CustomExerciseValidationError(
      "alias_invalid",
      "Exercise aliases cannot be blank.",
    );
  }
  if (value.length > maximumLength) {
    const code =
      field === "name"
        ? "name_too_long"
        : field === "instructions"
          ? "instructions_too_long"
          : "alias_invalid";
    throw new CustomExerciseValidationError(
      code,
      `${field} must be ${maximumLength} characters or fewer.`,
    );
  }
  return value;
}

function normalizeLoggingKind(value: string): LoggingKind {
  if (!LOGGING_KINDS.has(value as LoggingKind)) {
    throw new CustomExerciseValidationError(
      "logging_kind_invalid",
      "Choose a supported logging kind.",
    );
  }
  return value as LoggingKind;
}

function normalizeEquipment(values: readonly string[]): readonly EquipmentId[] {
  if (!Array.isArray(values) || values.length === 0) {
    throw new CustomExerciseValidationError(
      "equipment_required",
      "Choose at least one equipment requirement.",
    );
  }
  const normalized: EquipmentId[] = [];
  const seen = new Set<EquipmentId>();
  for (const value of values) {
    if (!EQUIPMENT.has(value)) {
      throw new CustomExerciseValidationError(
        "equipment_invalid",
        "An equipment requirement is not supported.",
      );
    }
    const equipmentId = value as EquipmentId;
    if (!seen.has(equipmentId)) {
      seen.add(equipmentId);
      normalized.push(equipmentId);
    }
  }
  return normalized;
}

function normalizeAliases(
  values: readonly string[],
  normalizedName: string,
): NormalizedCustomExerciseDraft["aliases"] {
  if (!Array.isArray(values)) {
    throw new CustomExerciseValidationError(
      "alias_invalid",
      "Exercise aliases must be a list.",
    );
  }
  if (values.length > 12) {
    throw new CustomExerciseValidationError(
      "too_many_aliases",
      "A custom exercise can contain at most 12 aliases.",
    );
  }
  const nameKey = normalizedName.toLowerCase();
  const seen = new Set<string>();
  const aliases: Array<{ alias: string; normalizedAlias: string }> = [];
  for (const value of values) {
    const alias = boundedText(value, "alias", 180);
    const normalizedAlias = alias.toLowerCase();
    if (normalizedAlias === nameKey) {
      throw new CustomExerciseValidationError(
        "alias_matches_name",
        "An alias cannot repeat the exercise name.",
      );
    }
    if (seen.has(normalizedAlias)) continue;
    seen.add(normalizedAlias);
    aliases.push({ alias, normalizedAlias });
  }
  return aliases;
}

function normalizeVideos(values: readonly string[]): readonly string[] {
  if (!Array.isArray(values)) {
    throw new CustomExerciseValidationError(
      "youtube_url_invalid",
      "Exercise videos must be a list of YouTube URLs.",
    );
  }
  try {
    return normalizeCustomExerciseVideoIds(
      values.filter((value) => typeof value === "string" && value.trim().length > 0),
    );
  } catch (error) {
    if (error instanceof YouTubeReferenceError) {
      if (error.code === "duplicate-video-id") {
        throw new CustomExerciseValidationError(
          "duplicate_video_id",
          error.message,
        );
      }
      if (error.code === "too-many-videos") {
        throw new CustomExerciseValidationError("too_many_videos", error.message);
      }
      throw new CustomExerciseValidationError(
        "youtube_url_invalid",
        error.message,
      );
    }
    throw error;
  }
}

export function normalizeCustomExerciseDraft(
  input: CustomExerciseDraftInput,
): NormalizedCustomExerciseDraft {
  if (typeof input !== "object" || input === null) {
    throw new CustomExerciseValidationError(
      "name_required",
      "Custom exercise input is required.",
    );
  }
  const name = boundedText(input.name, "name", 180);
  const instructions = boundedText(
    input.instructions ?? "",
    "instructions",
    4_000,
  );
  return Object.freeze({
    name,
    loggingKind: normalizeLoggingKind(input.loggingKind),
    equipmentIds: Object.freeze([...normalizeEquipment(input.equipmentIds)]),
    instructions,
    aliases: Object.freeze([...normalizeAliases(input.aliases ?? [], name)]),
    youtubeVideoIds: Object.freeze([...normalizeVideos(input.videoUrls ?? [])]),
  });
}

export type CustomExerciseSemanticEdit = Readonly<{
  previousLoggingKind: LoggingKind;
  nextLoggingKind: LoggingKind;
  hasHistory: boolean;
}>;

export function assessCustomExerciseSemanticEdit(
  input: CustomExerciseSemanticEdit,
): Readonly<
  | { status: "in_place" }
  | { status: "requires_clone"; reason: "logging_kind_history" }
> {
  if (
    input.hasHistory &&
    input.previousLoggingKind !== input.nextLoggingKind
  ) {
    return { status: "requires_clone", reason: "logging_kind_history" };
  }
  return { status: "in_place" };
}
