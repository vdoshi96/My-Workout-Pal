import type { EquipmentProfileKind } from "@/domain/equipment";

const MAX_RETURN_PATH_LENGTH = 512;
const MAX_LIBRARY_QUERY_LENGTH = 120;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;
const DAY_LABELS = {
  push: "Push day",
  pull: "Pull day",
  legs: "Legs day",
  upper: "Upper day",
  lower: "Lower day",
} as const;

export type PublicExerciseReturnContext = Readonly<{
  href: string;
  label: string;
}>;

type ExerciseDetailHrefOptions = Readonly<{
  equipment: EquipmentProfileKind;
  returnTo: string;
}>;

function isEquipmentProfile(value: string): value is EquipmentProfileKind {
  return value === "dumbbells" || value === "barbell";
}

function hasOnlySingleAllowedParameters(
  params: URLSearchParams,
  allowedNames: readonly string[],
): boolean {
  const allowed = new Set(allowedNames);
  for (const name of params.keys()) {
    if (!allowed.has(name) || params.getAll(name).length !== 1) return false;
  }
  return true;
}

function parseEquipment(params: URLSearchParams): EquipmentProfileKind | undefined | false {
  const value = params.get("equipment");
  if (value === null) return undefined;
  return isEquipmentProfile(value) ? value : false;
}

function canonicalProgramContext(url: URL): PublicExerciseReturnContext | undefined {
  if (!hasOnlySingleAllowedParameters(url.searchParams, ["equipment"])) return undefined;
  const equipment = parseEquipment(url.searchParams);
  if (equipment === false) return undefined;

  const params = new URLSearchParams();
  if (equipment) params.set("equipment", equipment);
  const query = params.size > 0 ? `?${params.toString()}` : "";

  if (url.pathname === "/program") {
    return { href: `/program${query}`, label: "Five-day starter example" };
  }

  const dayMatch = /^\/program\/(push|pull|legs|upper|lower)$/.exec(url.pathname);
  if (!dayMatch) return undefined;
  const day = dayMatch[1] as keyof typeof DAY_LABELS;
  return { href: `${url.pathname}${query}`, label: DAY_LABELS[day] };
}

function canonicalLibraryContext(url: URL): PublicExerciseReturnContext | undefined {
  if (url.pathname !== "/library") return undefined;
  if (!hasOnlySingleAllowedParameters(url.searchParams, ["equipment", "q"])) return undefined;

  const equipment = parseEquipment(url.searchParams);
  if (equipment === false) return undefined;

  const query = url.searchParams.get("q")?.trim();
  if (
    query &&
    (query.length > MAX_LIBRARY_QUERY_LENGTH || CONTROL_CHARACTER_PATTERN.test(query))
  ) {
    return undefined;
  }

  const params = new URLSearchParams();
  if (equipment) params.set("equipment", equipment);
  if (query) params.set("q", query);
  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  return { href: `/library${suffix}`, label: "Exercise library" };
}

function canonicalSampleWorkoutContext(url: URL): PublicExerciseReturnContext | undefined {
  if (url.pathname !== "/sample-workout") return undefined;
  if (!hasOnlySingleAllowedParameters(url.searchParams, ["day", "equipment"])) return undefined;

  const rawDay = url.searchParams.get("day");
  if (!rawDay || !(rawDay in DAY_LABELS)) return undefined;
  const day = rawDay as keyof typeof DAY_LABELS;
  const equipment = parseEquipment(url.searchParams);
  if (equipment === false) return undefined;

  const params = new URLSearchParams({ day });
  if (equipment) params.set("equipment", equipment);
  return {
    href: `/sample-workout?${params.toString()}`,
    label: `${DAY_LABELS[day].replace(" day", "")} sample workout`,
  };
}

function canonicalProgressContext(url: URL): PublicExerciseReturnContext | undefined {
  if (url.pathname !== "/progress" && url.pathname !== "/sample-progress") return undefined;
  if (url.searchParams.size > 0) return undefined;
  return { href: "/progress", label: "Progress" };
}

export function resolvePublicExerciseReturn(
  rawReturnTo: string | readonly string[] | undefined,
  fallbackEquipment: EquipmentProfileKind,
): PublicExerciseReturnContext {
  const fallback = {
    href: `/library?equipment=${fallbackEquipment}`,
    label: "Exercise library",
  } as const;

  if (
    typeof rawReturnTo !== "string" ||
    rawReturnTo.length === 0 ||
    rawReturnTo.length > MAX_RETURN_PATH_LENGTH ||
    !rawReturnTo.startsWith("/") ||
    rawReturnTo.startsWith("//") ||
    rawReturnTo.includes("\\") ||
    CONTROL_CHARACTER_PATTERN.test(rawReturnTo)
  ) {
    return fallback;
  }

  try {
    const decoded = decodeURIComponent(rawReturnTo);
    if (CONTROL_CHARACTER_PATTERN.test(decoded)) return fallback;

    const url = new URL(rawReturnTo, "https://my-workout-pal.invalid");
    if (url.origin !== "https://my-workout-pal.invalid" || url.hash) return fallback;
    return (
      canonicalProgramContext(url) ??
      canonicalLibraryContext(url) ??
      canonicalSampleWorkoutContext(url) ??
      canonicalProgressContext(url) ??
      fallback
    );
  } catch {
    return fallback;
  }
}

export function exerciseDetailHref(
  exerciseSlug: string,
  options: ExerciseDetailHrefOptions,
): string {
  const params = new URLSearchParams({
    equipment: options.equipment,
    returnTo: options.returnTo,
  });
  return `/library/${encodeURIComponent(exerciseSlug)}?${params.toString()}`;
}
