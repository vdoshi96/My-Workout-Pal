export type InsightUnitSystem = "imperial" | "metric";
export type PersonalRecordType =
  | "distance"
  | "duration"
  | "estimated_1rm"
  | "max_repetitions"
  | "max_weight"
  | "volume";

const POUNDS_PER_KILOGRAM = 2.2046226218;
const METERS_PER_MILE = 1_609.344;

function formatNumber(value: number, maximumFractionDigits = 1): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
    useGrouping: true,
  }).format(value);
}

export function formatInsightWeight(
  weightKg: number,
  unitSystem: InsightUnitSystem,
): string {
  return unitSystem === "imperial"
    ? `${formatNumber(weightKg * POUNDS_PER_KILOGRAM)} lb`
    : `${formatNumber(weightKg)} kg`;
}

export function formatInsightVolume(
  volumeKg: number,
  unitSystem: InsightUnitSystem,
): string {
  return formatInsightWeight(volumeKg, unitSystem);
}

export function formatInsightDistance(
  distanceMeters: number,
  unitSystem: InsightUnitSystem,
): string {
  if (unitSystem === "imperial") {
    return `${formatNumber(distanceMeters / METERS_PER_MILE, 2)} mi`;
  }
  return `${formatNumber(distanceMeters / 1_000, 2)} km`;
}

export function formatInsightDuration(seconds: number | undefined): string {
  if (seconds === undefined) return "Not recorded";
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3_600);
  const minutes = Math.floor((safeSeconds % 3_600) / 60);
  const remainder = safeSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${remainder}s`;
  return `${remainder}s`;
}

export function formatHistoryDate(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    timeZone,
    year: "numeric",
  }).format(date);
}

export function formatProgressDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(parsed);
}

export function formatPersonalRecord(
  type: PersonalRecordType,
  value: number,
  unitSystem: InsightUnitSystem,
): Readonly<{ label: string; value: string }> {
  switch (type) {
    case "max_weight":
      return { label: "Heaviest weight", value: formatInsightWeight(value, unitSystem) };
    case "estimated_1rm":
      return { label: "Estimated 1RM", value: formatInsightWeight(value, unitSystem) };
    case "max_repetitions":
      return { label: "Most repetitions", value: `${formatNumber(value, 0)} reps` };
    case "volume":
      return { label: "Most volume", value: formatInsightVolume(value, unitSystem) };
    case "distance":
      return { label: "Longest distance", value: formatInsightDistance(value, unitSystem) };
    case "duration":
      return { label: "Longest duration", value: formatInsightDuration(value) };
  }
}
