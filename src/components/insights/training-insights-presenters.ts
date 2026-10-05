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
  return `${formatInsightWeight(volumeKg, unitSystem)}·reps`;
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

export type FinishedWorkoutSummary = Readonly<{ repetitions: number; sets: number; volumeKg: number }>;

type SummarySet = Readonly<{
  addedWeightKg: number | undefined;
  kind: "bodyweight_reps" | "distance_duration" | "duration" | "weight_reps";
  repetitions: number | undefined;
  setKind: "warmup" | "work";
  weightKg: number | undefined;
}>;

/**
 * What a finished workout added up to: logged work sets, their reps, and lifted load
 * (weight × reps, or added weight × reps for bodyweight moves), the same way Progress counts them.
 */
export function summarizeFinishedWorkout(
  exercises: ReadonlyArray<Readonly<{ sets: readonly SummarySet[] }>>,
): FinishedWorkoutSummary {
  let sets = 0;
  let repetitions = 0;
  let volumeKg = 0;
  for (const set of exercises.flatMap((exercise) => exercise.sets)) {
    if (set.setKind !== "work") continue;
    sets += 1;
    const reps = set.repetitions ?? 0;
    repetitions += reps;
    const loadKg = set.kind === "weight_reps" ? set.weightKg ?? 0 : set.kind === "bodyweight_reps" ? set.addedWeightKg ?? 0 : 0;
    const next = volumeKg + loadKg * reps;
    if (Number.isFinite(next) && next >= 0) volumeKg = next;
  }
  return { repetitions, sets, volumeKg };
}

/** One friendly line for the workout-done moment, in the member's units. */
export function finishedWorkoutSummary(summary: FinishedWorkoutSummary, unitSystem: InsightUnitSystem): string {
  if (summary.sets === 0) return "Every workout counts.";
  const parts = [`${summary.sets} ${summary.sets === 1 ? "set" : "sets"}`];
  if (summary.repetitions > 0) parts.push(`${formatNumber(summary.repetitions, 0)} ${summary.repetitions === 1 ? "rep" : "reps"}`);
  if (summary.volumeKg > 0) parts.push(`${formatInsightVolume(summary.volumeKg, unitSystem)} lifted`);
  return parts.join(" · ");
}

type RecordLike = Readonly<{ achievedAt: Date; sourceSessionIds: readonly string[]; sourceSetLogIds: readonly string[]; type: PersonalRecordType }>;

/** Records whose best set came from this workout. */
export function recordsFromSession<T extends RecordLike>(records: readonly T[], sessionId: string): T[] {
  return records.filter((record) => record.sourceSessionIds.includes(sessionId));
}

/** A stable key for one record row. */
export function recordKey(record: RecordLike): string {
  return `${record.type}:${record.sourceSetLogIds.join(":")}`;
}

/** The key of the most recently set record, or undefined when there are none. */
export function newestRecordKey(records: readonly RecordLike[]): string | undefined {
  let newest: RecordLike | undefined;
  for (const record of records) {
    if (!newest || record.achievedAt.getTime() > newest.achievedAt.getTime()) newest = record;
  }
  return newest ? recordKey(newest) : undefined;
}
