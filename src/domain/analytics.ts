export const POUNDS_PER_KILOGRAM = 2.2046226218;
export const KILOGRAMS_PER_POUND = 1 / POUNDS_PER_KILOGRAM;

export type WeightUnit = "kg" | "lb";

export const MEASUREMENT_KINDS = [
  "weight_reps",
  "bodyweight_reps",
  "duration",
  "distance_duration",
] as const;

export type MeasurementKind = (typeof MEASUREMENT_KINDS)[number];
export type LoggingKind = MeasurementKind;

type MeasurementMetadata = Readonly<{
  isWarmup?: boolean;
}>;

export type WeightRepsMeasurement = MeasurementMetadata &
  Readonly<{
    kind: "weight_reps";
    weightKg: number;
    repetitions: number;
  }>;

export type BodyweightRepsMeasurement = MeasurementMetadata &
  Readonly<{
    kind: "bodyweight_reps";
    repetitions: number;
    addedWeightKg?: number;
  }>;

export type DurationMeasurement = MeasurementMetadata &
  Readonly<{
    kind: "duration";
    durationSeconds: number;
  }>;

export type DistanceDurationMeasurement = MeasurementMetadata &
  Readonly<{
    kind: "distance_duration";
    distanceMeters: number;
    durationSeconds: number;
  }>;

export type WorkoutMeasurement =
  | WeightRepsMeasurement
  | BodyweightRepsMeasurement
  | DurationMeasurement
  | DistanceDurationMeasurement;

export type MeasurementValidationResult =
  | Readonly<{
      ok: true;
      measurement: WorkoutMeasurement;
    }>
  | Readonly<{
      ok: false;
      issues: readonly string[];
    }>;

export type PersonalRecordType =
  | "weight"
  | "repetitions"
  | "duration"
  | "distance"
  | "volume"
  | "estimated_1rm";

export type PersonalRecordCandidate = Readonly<{
  id: string;
  exerciseVariationId: string;
  recordType: PersonalRecordType;
  value: number;
  occurredAt: string;
}>;

export type PersonalRecordStanding = Readonly<{
  exerciseVariationId: string;
  recordType: PersonalRecordType;
  bestValue: number;
  winnerIds: readonly string[];
  isTie: boolean;
  sourceCandidateId: string;
}>;

export type ProgressSummarySeriesInput = Readonly<{
  id: string;
  completedAt: string;
  volumeKg?: number;
  estimatedOneRepMaxKg?: number;
  durationSeconds?: number;
  distanceMeters?: number;
}>;

export type ProgressSummarySeriesOptions = Readonly<{
  timeZone?: string;
  fromDate?: string;
  throughDate?: string;
}>;

export type ProgressSummaryPoint = Readonly<{
  date: string;
  sessionCount: number;
  volumeKg: number | null;
  estimatedOneRepMaxKg: number | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
  sourceIds: readonly string[];
}>;

const PERSONAL_RECORD_TYPES = [
  "weight",
  "repetitions",
  "duration",
  "distance",
  "volume",
  "estimated_1rm",
] as const satisfies readonly PersonalRecordType[];

const PROGRESS_METRIC_KEYS = [
  "volumeKg",
  "estimatedOneRepMaxKg",
  "durationSeconds",
  "distanceMeters",
] as const;

type ProgressMetricKey = (typeof PROGRESS_METRIC_KEYS)[number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function assertFiniteNumber(value: number, fieldName: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${fieldName} must be finite`);
  }
}

function assertNonnegative(value: number, fieldName: string): void {
  assertFiniteNumber(value, fieldName);
  if (value < 0) {
    throw new RangeError(`${fieldName} must be nonnegative`);
  }
}

function assertPositiveInteger(value: number, fieldName: string): void {
  assertFiniteNumber(value, fieldName);
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${fieldName} must be a positive integer`);
  }
}

function assertWeightUnit(unit: WeightUnit): void {
  if (unit !== "kg" && unit !== "lb") {
    throw new RangeError(`Unsupported weight unit: ${String(unit)}`);
  }
}

function checkUnexpectedFields(
  input: Record<string, unknown>,
  allowedFields: readonly string[],
  issues: string[],
): void {
  const allowed = new Set(allowedFields);
  for (const key of Object.keys(input).sort()) {
    if (!allowed.has(key)) issues.push(`${key} is not valid for this measurement kind`);
  }
}

function checkWarmup(input: Record<string, unknown>, issues: string[]): boolean | undefined {
  if (!hasOwn(input, "isWarmup")) return undefined;
  if (typeof input["isWarmup"] !== "boolean") {
    issues.push("isWarmup must be a boolean");
    return undefined;
  }
  return input["isWarmup"];
}

function checkRequiredNonnegative(
  input: Record<string, unknown>,
  fieldName: string,
  issues: string[],
): number | undefined {
  if (!hasOwn(input, fieldName)) {
    issues.push(`${fieldName} is required`);
    return undefined;
  }
  const value = input[fieldName];
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    issues.push(`${fieldName} must be a finite nonnegative number`);
    return undefined;
  }
  return value;
}

function checkRequiredPositive(
  input: Record<string, unknown>,
  fieldName: string,
  issues: string[],
): number | undefined {
  if (!hasOwn(input, fieldName)) {
    issues.push(`${fieldName} is required`);
    return undefined;
  }
  const value = input[fieldName];
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    issues.push(`${fieldName} must be a finite positive number`);
    return undefined;
  }
  return value;
}

function checkRequiredPositiveInteger(
  input: Record<string, unknown>,
  fieldName: string,
  issues: string[],
): number | undefined {
  if (!hasOwn(input, fieldName)) {
    issues.push(`${fieldName} is required`);
    return undefined;
  }
  const value = input[fieldName];
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    issues.push(`${fieldName} must be a positive integer`);
    return undefined;
  }
  return value;
}

function checkOptionalNonnegative(
  input: Record<string, unknown>,
  fieldName: string,
  issues: string[],
): number | undefined {
  if (!hasOwn(input, fieldName)) return undefined;
  const value = input[fieldName];
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    issues.push(`${fieldName} must be a finite nonnegative number`);
    return undefined;
  }
  return value;
}

function checkRepetitions(
  input: Record<string, unknown>,
  issues: string[],
): number | undefined {
  if (!hasOwn(input, "repetitions")) {
    issues.push("repetitions is required");
    return undefined;
  }
  const value = input["repetitions"];
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    issues.push("repetitions must be a positive integer");
    return undefined;
  }
  return value;
}

export function validateMeasurement(input: unknown): MeasurementValidationResult {
  if (!isRecord(input)) {
    return { ok: false, issues: ["measurement must be an object"] };
  }

  const issues: string[] = [];
  const kindValue = input["kind"];
  if (typeof kindValue !== "string" || !MEASUREMENT_KINDS.includes(kindValue as MeasurementKind)) {
    return { ok: false, issues: ["kind must be a supported measurement kind"] };
  }
  const kind = kindValue as MeasurementKind;

  const isWarmup = checkWarmup(input, issues);

  if (kind === "weight_reps") {
    checkUnexpectedFields(input, ["kind", "isWarmup", "weightKg", "repetitions"], issues);
    const weightKg = checkRequiredNonnegative(input, "weightKg", issues);
    const repetitions = checkRepetitions(input, issues);
    if (issues.length > 0 || weightKg === undefined || repetitions === undefined) {
      return { ok: false, issues };
    }
    return isWarmup === undefined
      ? { ok: true, measurement: { kind, weightKg, repetitions } }
      : { ok: true, measurement: { kind, weightKg, repetitions, isWarmup } };
  }

  if (kind === "bodyweight_reps") {
    checkUnexpectedFields(input, ["kind", "isWarmup", "repetitions", "addedWeightKg"], issues);
    const repetitions = checkRepetitions(input, issues);
    const addedWeightKg = checkOptionalNonnegative(input, "addedWeightKg", issues);
    if (issues.length > 0 || repetitions === undefined) {
      return { ok: false, issues };
    }
    if (addedWeightKg !== undefined && isWarmup !== undefined) {
      return { ok: true, measurement: { kind, repetitions, addedWeightKg, isWarmup } };
    }
    if (addedWeightKg !== undefined) {
      return { ok: true, measurement: { kind, repetitions, addedWeightKg } };
    }
    if (isWarmup !== undefined) {
      return { ok: true, measurement: { kind, repetitions, isWarmup } };
    }
    return { ok: true, measurement: { kind, repetitions } };
  }

  if (kind === "duration") {
    checkUnexpectedFields(input, ["kind", "isWarmup", "durationSeconds"], issues);
    const durationSeconds = checkRequiredPositiveInteger(input, "durationSeconds", issues);
    if (issues.length > 0 || durationSeconds === undefined) {
      return { ok: false, issues };
    }
    return isWarmup === undefined
      ? { ok: true, measurement: { kind, durationSeconds } }
      : { ok: true, measurement: { kind, durationSeconds, isWarmup } };
  }

  checkUnexpectedFields(input, ["kind", "isWarmup", "distanceMeters", "durationSeconds"], issues);
  const distanceMeters = checkRequiredPositive(input, "distanceMeters", issues);
  const durationSeconds = checkRequiredPositiveInteger(input, "durationSeconds", issues);
  if (issues.length > 0 || distanceMeters === undefined || durationSeconds === undefined) {
    return { ok: false, issues };
  }
  return isWarmup === undefined
    ? { ok: true, measurement: { kind, distanceMeters, durationSeconds } }
    : { ok: true, measurement: { kind, distanceMeters, durationSeconds, isWarmup } };
}

export function parseMeasurement(input: unknown): WorkoutMeasurement {
  const result = validateMeasurement(input);
  if (!result.ok) {
    throw new RangeError(`Invalid workout measurement: ${result.issues.join("; ")}`);
  }
  return result.measurement;
}

export function isMeasurement(input: unknown): input is WorkoutMeasurement {
  return validateMeasurement(input).ok;
}

export function assertMeasurementInvariant(measurement: WorkoutMeasurement): void {
  parseMeasurement(measurement);
}

export function kilogramsToPounds(weightKg: number): number {
  return convertWeight(weightKg, "kg", "lb");
}

export function poundsToKilograms(weightLb: number): number {
  return convertWeight(weightLb, "lb", "kg");
}

export function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
  assertNonnegative(value, "weight");
  assertWeightUnit(from);
  assertWeightUnit(to);
  if (from === to) return value;
  return from === "kg" ? value * POUNDS_PER_KILOGRAM : value * KILOGRAMS_PER_POUND;
}

export function roundForPresentation(value: number, fractionDigits = 2): number {
  assertFiniteNumber(value, "value");
  if (!Number.isInteger(fractionDigits) || fractionDigits < 0 || fractionDigits > 12) {
    throw new RangeError("fractionDigits must be an integer from 0 through 12");
  }
  const factor = 10 ** fractionDigits;
  const roundedMagnitude = Math.round((Math.abs(value) + Number.EPSILON) * factor) / factor;
  return value < 0 ? -roundedMagnitude : roundedMagnitude;
}

export function presentWeight(
  weightKg: number,
  unit: WeightUnit,
  fractionDigits = unit === "kg" ? 2 : 1,
): number {
  return roundForPresentation(convertWeight(weightKg, "kg", unit), fractionDigits);
}

function checkedProduct(left: number, right: number, fieldName: string): number {
  const result = left * right;
  if (!Number.isFinite(result)) throw new RangeError(`${fieldName} is too large`);
  return result;
}

export function measurementVolume(measurement: WorkoutMeasurement): number {
  assertMeasurementInvariant(measurement);
  if (measurement.isWarmup === true) return 0;

  if (measurement.kind === "weight_reps") {
    return checkedProduct(measurement.weightKg, measurement.repetitions, "volume");
  }
  if (measurement.kind === "bodyweight_reps") {
    return checkedProduct(measurement.addedWeightKg ?? 0, measurement.repetitions, "volume");
  }
  return 0;
}

export function calculateWorkoutVolume(measurements: readonly WorkoutMeasurement[]): number {
  return measurements.reduce((total, measurement) => {
    const next = total + measurementVolume(measurement);
    if (!Number.isFinite(next)) throw new RangeError("volume is too large");
    return next;
  }, 0);
}

export function estimateEpleyOneRepMaxKg(
  weightKg: number,
  repetitions: number,
): number | undefined {
  assertNonnegative(weightKg, "weightKg");
  assertPositiveInteger(repetitions, "repetitions");
  if (weightKg === 0) return undefined;
  const result = weightKg * (1 + repetitions / 30);
  if (!Number.isFinite(result)) throw new RangeError("estimated one-repetition max is too large");
  return result;
}

export function calculateEpleyOneRepMax(
  measurement: WorkoutMeasurement,
): number | undefined {
  assertMeasurementInvariant(measurement);
  if (measurement.isWarmup === true) return undefined;

  if (measurement.kind === "weight_reps") {
    return estimateEpleyOneRepMaxKg(measurement.weightKg, measurement.repetitions);
  }
  if (measurement.kind === "bodyweight_reps" && measurement.addedWeightKg !== undefined) {
    return estimateEpleyOneRepMaxKg(measurement.addedWeightKg, measurement.repetitions);
  }
  return undefined;
}

export type RecordValueComparison = "higher" | "tie" | "lower";

export function compareRecordValues(
  candidateValue: number,
  currentValue: number,
): RecordValueComparison {
  assertNonnegative(candidateValue, "candidateValue");
  assertNonnegative(currentValue, "currentValue");
  if (candidateValue > currentValue) return "higher";
  if (candidateValue < currentValue) return "lower";
  return "tie";
}

function assertPersonalRecordCandidate(candidate: PersonalRecordCandidate): void {
  if (candidate.id.trim().length === 0) throw new RangeError("personal record id is required");
  if (candidate.exerciseVariationId.trim().length === 0) {
    throw new RangeError("exerciseVariationId is required");
  }
  if (!PERSONAL_RECORD_TYPES.includes(candidate.recordType)) {
    throw new RangeError(`Unsupported personal record type: ${candidate.recordType}`);
  }
  assertNonnegative(candidate.value, "personal record value");
  if (!Number.isFinite(Date.parse(candidate.occurredAt))) {
    throw new RangeError("occurredAt must be a valid timestamp");
  }
}

export function selectPersonalRecord(
  candidates: readonly PersonalRecordCandidate[],
): PersonalRecordStanding | undefined {
  if (candidates.length === 0) return undefined;
  const first = candidates[0];
  if (!first) return undefined;

  const ids = new Set<string>();
  for (const candidate of candidates) {
    assertPersonalRecordCandidate(candidate);
    if (ids.has(candidate.id)) throw new RangeError("personal record ids must be unique");
    ids.add(candidate.id);
    if (
      candidate.exerciseVariationId !== first.exerciseVariationId ||
      candidate.recordType !== first.recordType
    ) {
      throw new RangeError("all personal record candidates must use the same exercise variation and record type");
    }
  }

  const bestValue = candidates.reduce(
    (best, candidate) => (candidate.value > best ? candidate.value : best),
    first.value,
  );
  const winners = candidates
    .filter((candidate) => candidate.value === bestValue)
    .sort((left, right) => {
      const timeDifference = Date.parse(left.occurredAt) - Date.parse(right.occurredAt);
      return timeDifference || left.id.localeCompare(right.id);
    });
  const source = winners[0];
  if (!source) throw new Error("A personal record must have at least one winner");

  return {
    exerciseVariationId: first.exerciseVariationId,
    recordType: first.recordType,
    bestValue,
    winnerIds: winners.map((candidate) => candidate.id),
    isTie: winners.length > 1,
    sourceCandidateId: source.id,
  };
}

function validateDateBoundary(value: string | undefined, fieldName: string): string | undefined {
  if (value === undefined) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new RangeError(`${fieldName} must use YYYY-MM-DD`);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (date.toISOString().slice(0, 10) !== value) {
    throw new RangeError(`${fieldName} must be a valid calendar date`);
  }
  return value;
}

function localDateKey(formatter: Intl.DateTimeFormat, timestamp: string): string {
  const parsedTimestamp = Date.parse(timestamp);
  if (!Number.isFinite(parsedTimestamp)) {
    throw new RangeError("completedAt must be a valid timestamp");
  }
  const parts = formatter.formatToParts(new Date(parsedTimestamp));
  const values = new Map(parts.map((part) => [part.type, part.value]));
  const year = values.get("year");
  const month = values.get("month");
  const day = values.get("day");
  if (year === undefined || month === undefined || day === undefined) {
    throw new RangeError("timeZone could not produce a calendar date");
  }
  return `${year}-${month}-${day}`;
}

function validateProgressInput(input: ProgressSummarySeriesInput): void {
  if (input.id.trim().length === 0) throw new RangeError("progress summary id is required");
  if (!Number.isFinite(Date.parse(input.completedAt))) {
    throw new RangeError("completedAt must be a valid timestamp");
  }
  for (const key of PROGRESS_METRIC_KEYS) {
    const value = input[key];
    if (value !== undefined) assertNonnegative(value, key);
  }
}

function sumProgressMetric(
  inputs: readonly ProgressSummarySeriesInput[],
  key: ProgressMetricKey,
): number | null {
  const values = inputs
    .map((input) => input[key])
    .filter((value): value is number => value !== undefined);
  if (values.length === 0) return null;
  const result = values.reduce((total, value) => total + value, 0);
  if (!Number.isFinite(result)) throw new RangeError(`${key} is too large`);
  return result;
}

function maxProgressMetric(
  inputs: readonly ProgressSummarySeriesInput[],
  key: "estimatedOneRepMaxKg",
): number | null {
  const values = inputs
    .map((input) => input[key])
    .filter((value): value is number => value !== undefined);
  if (values.length === 0) return null;
  return values.reduce((maximum, value) => Math.max(maximum, value), values[0] ?? 0);
}

export function buildProgressSummarySeries(
  inputs: readonly ProgressSummarySeriesInput[],
  options: ProgressSummarySeriesOptions = {},
): readonly ProgressSummaryPoint[] {
  const timeZone = options.timeZone ?? "UTC";
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    throw new RangeError(`Invalid timeZone: ${timeZone}`);
  }

  const fromDate = validateDateBoundary(options.fromDate, "fromDate");
  const throughDate = validateDateBoundary(options.throughDate, "throughDate");
  if (fromDate !== undefined && throughDate !== undefined && fromDate > throughDate) {
    throw new RangeError("fromDate must be on or before throughDate");
  }

  const buckets = new Map<string, ProgressSummarySeriesInput[]>();
  for (const input of inputs) {
    validateProgressInput(input);
    const date = localDateKey(formatter, input.completedAt);
    if (fromDate !== undefined && date < fromDate) continue;
    if (throughDate !== undefined && date > throughDate) continue;
    const bucket = buckets.get(date);
    if (bucket) bucket.push(input);
    else buckets.set(date, [input]);
  }

  return [...buckets.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, bucket]) => ({
      date,
      sessionCount: bucket.length,
      volumeKg: sumProgressMetric(bucket, "volumeKg"),
      estimatedOneRepMaxKg: maxProgressMetric(bucket, "estimatedOneRepMaxKg"),
      durationSeconds: sumProgressMetric(bucket, "durationSeconds"),
      distanceMeters: sumProgressMetric(bucket, "distanceMeters"),
      sourceIds: bucket.map((input) => input.id).sort((left, right) => left.localeCompare(right)),
    }));
}
