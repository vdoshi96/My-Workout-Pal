import Link from "next/link";

import {
  formatHistoryDate,
  formatInsightDistance,
  formatInsightDuration,
  formatInsightWeight,
} from "@/components/insights/training-insights-presenters";
import { Icon } from "@/components/ui/icon";
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
    return set.repetitions === undefined
      ? repetitions
      : `${set.repetitions} bodyweight reps`;
  }
  if (set.kind === "duration") return formatInsightDuration(set.durationSeconds);
  const distance =
    set.distanceMeters === undefined
      ? "Distance not recorded"
      : formatInsightDistance(set.distanceMeters, unitSystem);
  return `${distance} · ${formatInsightDuration(set.durationSeconds)}`;
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
      <header className="insights-heading contour-surface">
        <div>
          <Link className="back-link" href="/app/history">
            <Icon name="arrow-left" /> Back to history
          </Link>
          <span className={`history-state history-state--${session.state}`}>
            {session.state === "completed" ? "Completed workout" : "Interrupted workout"}
          </span>
          <h1 id="history-detail-title">{session.dayName}</h1>
          <p>
            {formatHistoryDate(session.occurredAt, timezone)} ·{" "}
            {formatInsightDuration(session.durationSeconds)}
          </p>
        </div>
      </header>

      <aside className="archive-notice">
        <strong>Read-only snapshot.</strong> Exercise names, substitutions, notes, and
        logged values are preserved from this session.
      </aside>

      <ol className="history-exercises">
        {session.exercises.map((exercise) => (
          <li key={exercise.id}>
            <header>
              <span>{String(exercise.position).padStart(2, "0")}</span>
              <div>
                <strong>{exercise.displayName}</strong>
                <small>
                  {exercise.sectionKind} · {exercise.status}
                </small>
              </div>
            </header>
            {exercise.substitutionReason ? (
              <p className="history-substitution">
                Substitution: {exercise.substitutionReason}
              </p>
            ) : null}
            {exercise.note ? (
              <p className="history-note">
                <strong>Workout note:</strong> {exercise.note}
              </p>
            ) : null}
            {exercise.sets.length === 0 ? (
              <p className="history-no-sets">
                No sets were logged for this {exercise.status} movement.
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
        ))}
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
