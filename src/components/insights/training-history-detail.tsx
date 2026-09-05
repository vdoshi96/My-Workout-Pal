import Link from "next/link";

import {
  formatHistoryDate,
  formatInsightDistance,
  formatInsightDuration,
  formatInsightWeight,
} from "@/components/insights/training-insights-presenters";
import { formatCardioPace } from "@/components/workout/workout-runner-presenters";
import { DecorativeCompanion } from "@/components/ui/decorative-companion";
import { Icon } from "@/components/ui/icon";
import { EQUIPMENT_PROFILES } from "@/domain/equipment";
import type {
  TrainingSessionDetail,
  TrainingSetView,
} from "@/server/repositories/training-insights";

function setMeasurement(
  set: TrainingSetView,
  unitSystem: "imperial" | "metric",
): string {
  const repetitions =
    set.repetitions === undefined ? "Repetitions not recorded" : `${set.repetitions} reps`;
  if (set.kind === "weight_reps") {
    return `${
      set.weightKg === undefined
        ? "Weight not recorded"
        : formatInsightWeight(set.weightKg, unitSystem)
    } · ${repetitions}`;
  }
  if (set.kind === "bodyweight_reps") {
    const bodyweight = set.repetitions === undefined
      ? repetitions
      : `${set.repetitions} bodyweight reps`;
    return set.addedWeightKg === undefined
      ? bodyweight
      : `${bodyweight} · ${formatInsightWeight(set.addedWeightKg, unitSystem)} added`;
  }
  if (set.kind === "duration") return formatInsightDuration(set.durationSeconds);
  const distance =
    set.distanceMeters === undefined
      ? "Distance not recorded"
      : formatInsightDistance(set.distanceMeters, unitSystem);
  return `${distance} · ${formatInsightDuration(set.durationSeconds)}`;
}

function prescriptionRange(
  exercise: TrainingSessionDetail["exercises"][number],
): string | undefined {
  if (
    exercise.minimumReps !== undefined &&
    exercise.maximumReps !== undefined
  ) {
    return exercise.minimumReps === exercise.maximumReps
      ? `${exercise.minimumReps} reps`
      : `${exercise.minimumReps}–${exercise.maximumReps} reps`;
  }
  if (
    exercise.minimumSeconds !== undefined &&
    exercise.maximumSeconds !== undefined
  ) {
    return exercise.minimumSeconds === exercise.maximumSeconds
      ? `${exercise.minimumSeconds} seconds`
      : `${exercise.minimumSeconds}–${exercise.maximumSeconds} seconds`;
  }
  return undefined;
}

function prescriptionTarget(
  exercise: TrainingSessionDetail["exercises"][number],
  unitSystem: "imperial" | "metric",
): string | undefined {
  if (exercise.targetWeightKg !== undefined) {
    return formatInsightWeight(exercise.targetWeightKg, unitSystem);
  }
  if (exercise.targetDistanceMeters !== undefined) {
    return formatInsightDistance(exercise.targetDistanceMeters, unitSystem);
  }
  return undefined;
}

export function TrainingHistoryDetail({
  session,
  timezone,
  unitSystem,
}: Readonly<{
  session: TrainingSessionDetail;
  timezone: string;
  unitSystem: "imperial" | "metric";
}>) {
  return (
    <article className="insights-page history-detail" aria-labelledby="history-detail-title">
      <header className="insights-heading companion-heading contour-surface">
        <div>
          <Link className="back-link" href="/app/history">
            <Icon name="arrow-left" /> Back to history
          </Link>
          <span className={`history-state history-state--${session.state}`}>
            {session.state === "completed" ? <><Icon name="leaf" /> Completed workout</> : "Interrupted workout"}
          </span>
          <h1 id="history-detail-title">{session.dayName}</h1>
          <p>
            {formatHistoryDate(session.occurredAt, timezone)} ·{" "}
            {formatInsightDuration(session.durationSeconds)}
          </p>
        </div>
        <DecorativeCompanion variant="history" />
      </header>

      <aside className="archive-notice">
        <strong>Read-only snapshot.</strong> Exercise names, substitutions, notes, and
        logged values are preserved from this session.
      </aside>

      <ol className="history-exercises">
        {session.exercises.map((exercise) => {
          const target = prescriptionTarget(exercise, unitSystem);
          const range = prescriptionRange(exercise);
          const status = exercise.status === "pending" ? "unfinished" : exercise.status;
          return (
          <li key={exercise.id}>
            <header>
              <span>{String(exercise.position).padStart(2, "0")}</span>
              <div>
                <strong>{exercise.displayName}</strong>
                <small>
                  {exercise.sectionTitle ?? exercise.sectionKind} · {status}
                </small>
              </div>
            </header>
            {exercise.substitutionReason ? (
              <p className="history-substitution">
                Substitution: {exercise.substitutionReason}
              </p>
            ) : null}
            {exercise.equipmentProfileKind || target || exercise.prescriptionNote ? (
              <dl className="history-prescription-context">
                {exercise.equipmentProfileKind ? (
                  <div>
                    <dt>Equipment profile</dt>
                    <dd>{EQUIPMENT_PROFILES[exercise.equipmentProfileKind].label}</dd>
                  </div>
                ) : null}
                {target ? (
                  <div>
                    <dt>Plan target</dt>
                    <dd>{target}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>Plan sets</dt>
                  <dd>
                    {exercise.setCount} {exercise.setKind ? `${exercise.setKind} ` : ""}
                    set{exercise.setCount === 1 ? "" : "s"}
                  </dd>
                </div>
                {range ? (
                  <div>
                    <dt>Target range</dt>
                    <dd>{range}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>Rest target</dt>
                  <dd>{formatInsightDuration(exercise.restSeconds)}</dd>
                </div>
                {exercise.prescriptionNote ? (
                  <div>
                    <dt>Program note</dt>
                    <dd>{exercise.prescriptionNote}</dd>
                  </div>
                ) : null}
              </dl>
            ) : null}
            {exercise.note ? (
              <p className="history-note">
                <strong>Workout note:</strong> {exercise.note}
              </p>
            ) : null}
            {exercise.sets.length === 0 ? (
              <p className="history-no-sets">
                No sets were logged for this {status} movement.
              </p>
            ) : (
              <ol className="history-sets">
                {exercise.sets.map((set) => (
                  <li key={set.id}>
                    <span>Set {set.position}</span>
                    <strong>{setMeasurement(set, unitSystem)}</strong>
                    <small>
                      {set.setKind === "warmup" ? "Warm-up" : "Work set"}
                      {set.formRating ? ` · Form ${set.formRating}/5` : ""}
                    </small>
                    {set.note ? <p>{set.note}</p> : null}
                  </li>
                ))}
              </ol>
            )}
          </li>
          );
        })}
      </ol>

      {session.cardio ? (
        <section className="history-cardio" aria-labelledby="history-cardio-title">
          <span className="eyebrow">Conditioning log</span>
          <h2 id="history-cardio-title">
            {session.cardio.mode === "runner" ? "Runner" : "Walker"} cardio
          </h2>
          <dl>
            <div>
              <dt>Time</dt>
              <dd>{formatInsightDuration(session.cardio.durationSeconds)}</dd>
            </div>
            <div>
              <dt>Distance</dt>
              <dd>
                {session.cardio.distanceMeters === undefined
                  ? "Not recorded"
                  : formatInsightDistance(session.cardio.distanceMeters, unitSystem)}
              </dd>
            </div>
            <div>
              <dt>Incline</dt>
              <dd>
                {session.cardio.inclinePercent === undefined
                  ? "Not recorded"
                  : `${session.cardio.inclinePercent}%`}
              </dd>
            </div>
            <div>
              <dt>Pace</dt>
              <dd>
                {session.cardio.paceSecondsPerKilometer === undefined
                  ? "Not recorded"
                  : formatCardioPace(session.cardio.paceSecondsPerKilometer, {
                      unitSystem,
                    })}
              </dd>
            </div>
          </dl>
          {session.cardio.notes ? (
            <p className="history-cardio-note">
              <strong>Cardio notes:</strong> {session.cardio.notes}
            </p>
          ) : null}
        </section>
      ) : null}
    </article>
  );
}
