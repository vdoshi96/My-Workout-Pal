import type { WorkoutMeasurement } from "@/domain/analytics";
import type {
  RestTimerView,
  RunnerStatus,
  RunnerSyncStatus,
  WorkoutSetTarget,
} from "@/domain/workout-runner";

export type RunnerStatusTone =
  "neutral" | "pending" | "saved" | "offline" | "auth" | "failed" | "conflict";

export type RunnerStatusPresentation = Readonly<{
  label: string;
  tone: RunnerStatusTone;
}>;

export type RunnerUnitSystem = "metric" | "imperial";

export type RunnerPresentationOptions = Readonly<{
  unitSystem?: RunnerUnitSystem;
}>;

const POUNDS_PER_KILOGRAM = 2.2046226218;
const METERS_PER_MILE = 1_609.344;

function canonicalDecimal(value: number, scale: number): number {
  const factor = 10 ** scale;
  const rounded = Math.round((value + Number.EPSILON) * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function unitSystemFrom(options: RunnerPresentationOptions): RunnerUnitSystem {
  return options.unitSystem ?? "metric";
}

export function weightUnit(
  unitSystem: RunnerUnitSystem = "metric",
): "kg" | "lb" {
  return unitSystem === "imperial" ? "lb" : "kg";
}

export function distanceUnit(
  unitSystem: RunnerUnitSystem = "metric",
): "m" | "mi" {
  return unitSystem === "imperial" ? "mi" : "m";
}

export function kilogramsToDisplay(
  valueKg: number,
  unitSystem: RunnerUnitSystem = "metric",
): number {
  return unitSystem === "imperial" ? valueKg * POUNDS_PER_KILOGRAM : valueKg;
}

export function displayToKilograms(
  value: number,
  unitSystem: RunnerUnitSystem = "metric",
): number {
  return canonicalDecimal(
    unitSystem === "imperial" ? value / POUNDS_PER_KILOGRAM : value,
    3,
  );
}

export function metersToDisplay(
  valueMeters: number,
  unitSystem: RunnerUnitSystem = "metric",
): number {
  return unitSystem === "imperial"
    ? valueMeters / METERS_PER_MILE
    : valueMeters;
}

export function displayToMeters(
  value: number,
  unitSystem: RunnerUnitSystem = "metric",
): number {
  return canonicalDecimal(
    unitSystem === "imperial" ? value * METERS_PER_MILE : value,
    3,
  );
}

export function paceToDisplay(
  valueSecondsPerKilometer: number,
  unitSystem: RunnerUnitSystem = "metric",
): number {
  return unitSystem === "imperial"
    ? valueSecondsPerKilometer * (METERS_PER_MILE / 1_000)
    : valueSecondsPerKilometer;
}

export function displayToPace(
  valueSeconds: number,
  unitSystem: RunnerUnitSystem = "metric",
): number {
  return Math.round(
    unitSystem === "imperial"
      ? valueSeconds / (METERS_PER_MILE / 1_000)
      : valueSeconds,
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(value);
}

export function formatRestTimer(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

export function formatMeasurement(
  measurement: WorkoutMeasurement | undefined,
  options: RunnerPresentationOptions = {},
): string {
  if (measurement === undefined) return "No previous value";

  const unitSystem = unitSystemFrom(options);
  const warmup = measurement.isWarmup === true ? " · warm-up" : "";
  if (measurement.kind === "weight_reps") {
    return `${formatNumber(kilogramsToDisplay(measurement.weightKg, unitSystem))} ${weightUnit(unitSystem)} · ${formatNumber(measurement.repetitions)} reps${warmup}`;
  }
  if (measurement.kind === "bodyweight_reps") {
    const addedWeight =
      measurement.addedWeightKg === undefined
        ? ""
        : ` · +${formatNumber(kilogramsToDisplay(measurement.addedWeightKg, unitSystem))} ${weightUnit(unitSystem)}`;
    return `${formatNumber(measurement.repetitions)} reps${addedWeight}${warmup}`;
  }
  if (measurement.kind === "duration") {
    return `${formatRestTimer(measurement.durationSeconds)}${warmup}`;
  }
  return `${formatNumber(metersToDisplay(measurement.distanceMeters, unitSystem))} ${distanceUnit(unitSystem)} · ${formatRestTimer(measurement.durationSeconds)}${warmup}`;
}

export function formatSetTarget(
  target: WorkoutSetTarget,
  options: RunnerPresentationOptions = {},
): string {
  const unitSystem = unitSystemFrom(options);
  const rest =
    target.restSeconds > 0
      ? `${formatRestTimer(target.restSeconds)} rest`
      : "no rest";
  if (target.kind === "weight_reps") {
    const weight =
      target.targetWeightKg === undefined
        ? ""
        : `${formatNumber(kilogramsToDisplay(target.targetWeightKg, unitSystem))} ${weightUnit(unitSystem)} · `;
    return `${weight}${target.minimumReps}–${target.maximumReps} reps · ${rest}`;
  }
  if (target.kind === "bodyweight_reps") {
    return `${target.minimumReps}–${target.maximumReps} reps · ${rest}`;
  }
  if (target.kind === "duration") {
    return `${formatRestTimer(target.minimumSeconds)}–${formatRestTimer(target.maximumSeconds)} · ${rest}`;
  }
  return `${formatNumber(metersToDisplay(target.targetDistanceMeters, unitSystem))} ${distanceUnit(unitSystem)} · ${formatRestTimer(target.targetDurationSeconds)} · ${rest}`;
}

export function formatSyncStatus(
  status: RunnerSyncStatus,
): RunnerStatusPresentation {
  switch (status) {
    case "pending":
      return { label: "Pending", tone: "pending" };
    case "offline":
      return { label: "Offline queued", tone: "offline" };
    case "auth_expired":
      return { label: "Sign-in expired", tone: "auth" };
    case "failed":
      return { label: "Save failed", tone: "failed" };
    case "conflict":
      return { label: "Conflict", tone: "conflict" };
    case "idle":
    default:
      return { label: "Ready", tone: "neutral" };
  }
}

export function formatOperationStatus(
  status: "pending" | "saved" | "failed" | "superseded",
): RunnerStatusPresentation {
  switch (status) {
    case "saved":
      return { label: "Saved", tone: "saved" };
    case "failed":
      return { label: "Failed", tone: "failed" };
    case "superseded":
      return { label: "Replaced", tone: "neutral" };
    case "pending":
    default:
      return { label: "Pending", tone: "pending" };
  }
}

export function formatRunnerStatus(status: RunnerStatus): string {
  switch (status) {
    case "completing":
      return "Completing";
    case "completed":
      return "Completed";
    case "abandoning":
      return "Abandoning";
    case "abandoned":
      return "Abandoned";
    case "active":
    default:
      return "Active";
  }
}

export function formatTimerStatus(view: RestTimerView): string {
  switch (view.status) {
    case "running":
      return `Rest running · ${formatRestTimer(view.remainingSeconds)} remaining`;
    case "paused":
      return `Rest paused · ${formatRestTimer(view.remainingSeconds)} remaining`;
    case "complete":
      return "Rest complete";
    case "idle":
    default:
      return "Rest timer ready";
  }
}

export function shouldAnnounceTimerChange(
  previous: RestTimerView | undefined,
  next: RestTimerView,
): boolean {
  return previous === undefined || previous.status !== next.status;
}

export function formatTimerAnnouncement(view: RestTimerView): string {
  switch (view.status) {
    case "running":
      return `Rest timer started for ${formatRestTimer(view.remainingSeconds)}.`;
    case "paused":
      return `Rest timer paused with ${formatRestTimer(view.remainingSeconds)} remaining.`;
    case "complete":
      return "Rest timer complete.";
    case "idle":
    default:
      return "Rest timer cleared.";
  }
}

export function formatCardioPace(
  secondsPerKilometer: number | undefined,
  options: RunnerPresentationOptions = {},
): string {
  if (secondsPerKilometer === undefined) return "No pace entered";
  const unitSystem = unitSystemFrom(options);
  return `${formatRestTimer(paceToDisplay(secondsPerKilometer, unitSystem))} / ${unitSystem === "imperial" ? "mi" : "km"}`;
}

export function formatCardioSummary(
  input: Readonly<{
    durationSeconds: number;
    distanceMeters?: number | undefined;
    paceSecondsPerKilometer?: number | undefined;
    paceSource?: "entered" | "derived" | undefined;
    inclinePercent?: number | undefined;
  }>,
  options: RunnerPresentationOptions = {},
): string {
  const unitSystem = unitSystemFrom(options);
  const values = [formatRestTimer(input.durationSeconds)];
  if (input.distanceMeters !== undefined)
    values.push(
      `${formatNumber(metersToDisplay(input.distanceMeters, unitSystem))} ${distanceUnit(unitSystem)}`,
    );
  if (input.paceSecondsPerKilometer !== undefined) {
    values.push(
      `${formatCardioPace(input.paceSecondsPerKilometer, options)}${input.paceSource === "derived" ? " · derived" : ""}`,
    );
  }
  if (input.inclinePercent !== undefined)
    values.push(`${formatNumber(input.inclinePercent)}% incline`);
  return values.join(" · ");
}
