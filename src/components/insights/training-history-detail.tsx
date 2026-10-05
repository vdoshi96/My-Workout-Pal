import Link from "next/link";

import {
  finishedWorkoutSummary,
  formatHistoryDate,
  formatInsightDistance,
  formatInsightDuration,
  formatInsightWeight,
  formatPersonalRecord,
  recordKey,
  summarizeFinishedWorkout,
} from "@/components/insights/training-insights-presenters";
import { formatCardioPace } from "@/components/workout/workout-runner-presenters";
import { ArrivalFocus } from "@/components/navigation/arrival-focus";
import { BackLink } from "@/components/navigation/back-link";
import { Icon } from "@/components/ui/icon";
import { PalSticker, SceneStage } from "@/components/ui/scene-stage";
import type { BackTarget } from "@/domain/navigation/back-target";
import { EQUIPMENT_PROFILES } from "@/domain/equipment";
import type {
  PersonalRecordView,
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

/** The workout-done moment shown above a just-finished workout. */
function WorkoutDone({
  records,
  session,
  todayHref,
  unitSystem,
}: Readonly<{
  records: readonly PersonalRecordView[];
  session: TrainingSessionDetail;
  todayHref: string;
  unitSystem: "imperial" | "metric";
}>) {
  return (
    <header className="pal-page-head pal-insights-done">
      <div aria-hidden="true" className="pal-confetti">
        {Array.from({ length: 14 }, (_, index) => <i key={index} />)}
      </div>
      <PalSticker pose="complete" />
      <h1 id="history-done-title" tabIndex={-1}>Workout done! Nice work.</h1>
      <ArrivalFocus headingId="history-done-title" />
      <p>{finishedWorkoutSummary(summarizeFinishedWorkout(session.exercises), unitSystem)}</p>
      {records.length > 0 ? (
        <div className="pal-insights-ribbon">
          <strong>New record!</strong>
          <ul>
            {records.map((record) => {
              const presentation = formatPersonalRecord(record.type, record.value, unitSystem);
              return <li key={recordKey(record)}>{record.exerciseName}: {presentation.label.toLowerCase()}, {presentation.value}</li>;
            })}
          </ul>
        </div>
      ) : null}
      <div className="pal-actions">
        <Link className="primary-action" href={todayHref} prefetch={false}>Back to Today <Icon name="arrow-right" /></Link>
        <Link className="secondary-action" href="/app/progress" prefetch={false}>See your progress</Link>
      </div>
    </header>
  );
}

export function TrainingHistoryDetail({
  back = { href: "/app/history", label: "Back to History" },
  celebration,
  session,
  timezone,
  unitSystem,
}: Readonly<{
  back?: BackTarget;
  /** Present right after the member finishes this workout. */
  celebration?: Readonly<{ records: readonly PersonalRecordView[] }> | undefined;
  session: TrainingSessionDetail;
  timezone: string;
  unitSystem: "imperial" | "metric";
}>) {
  const stateLabel = session.state === "completed" ? "Completed workout" : "Not finished";
  const when = `${formatHistoryDate(session.occurredAt, timezone)} · ${formatInsightDuration(session.durationSeconds)}`;
  // The celebration's main action returns to Today, keeping the day the member came from.
  const todayHref = back.label === "Back to Today" ? back.href : "/app";

  return (
    <article className="pal-insights pal-history-detail" aria-labelledby={celebration ? "history-done-title" : "history-detail-title"}>
      <SceneStage scene="progress" />
      {celebration ? (
        <WorkoutDone records={celebration.records} session={session} todayHref={todayHref} unitSystem={unitSystem} />
      ) : (
        <header className="pal-page-head">
          <BackLink target={back} />
          <span className={`pal-insights-status pal-insights-status--${session.state}`}>{stateLabel}</span>
          <h1 id="history-detail-title">{session.dayName}</h1>
          <p>{when}</p>
        </header>
      )}

      <div className="pal-page-body">
        {celebration ? (
          <div className="pal-history-recap">
            <span className={`pal-insights-status pal-insights-status--${session.state}`}>{stateLabel}</span>
            <h2 id="history-detail-title">{session.dayName}</h2>
            <p>{when}</p>
          </div>
        ) : null}

        <ol className="pal-history-exercises" aria-label="Movements">
          {session.exercises.map((exercise) => {
            const target = prescriptionTarget(exercise, unitSystem);
            const range = prescriptionRange(exercise);
            const status = exercise.status === "pending" ? "unfinished" : exercise.status;
            return (
              <li key={exercise.id}>
                <div className="pal-history-exercise-head">
                  <span aria-hidden="true" className="pal-move-number">{exercise.position}</span>
                  <div>
                    <strong>{exercise.displayName}</strong>
                    <small>{exercise.sectionTitle ?? exercise.sectionKind} · {status}</small>
                  </div>
                </div>
                {exercise.substitutionReason ? (
                  <p className="pal-history-aside">Swapped in: {exercise.substitutionReason}</p>
                ) : null}
                {exercise.equipmentProfileKind || target || exercise.prescriptionNote ? (
                  <dl className="pal-insights-facts">
                    {exercise.equipmentProfileKind ? (
                      <div><dt>Equipment</dt><dd>{EQUIPMENT_PROFILES[exercise.equipmentProfileKind].label}</dd></div>
                    ) : null}
                    {target ? <div><dt>Target</dt><dd>{target}</dd></div> : null}
                    <div>
                      <dt>Planned</dt>
                      <dd>
                        {exercise.setCount} {exercise.setKind ? `${exercise.setKind} ` : ""}
                        set{exercise.setCount === 1 ? "" : "s"}
                      </dd>
                    </div>
                    {range ? <div><dt>Range</dt><dd>{range}</dd></div> : null}
                    <div><dt>Rest</dt><dd>{formatInsightDuration(exercise.restSeconds)}</dd></div>
                    {exercise.prescriptionNote ? <div><dt>Routine note</dt><dd>{exercise.prescriptionNote}</dd></div> : null}
                  </dl>
                ) : null}
                {exercise.note ? (
                  <p className="pal-history-aside"><strong>Your note:</strong> {exercise.note}</p>
                ) : null}
                {exercise.sets.length === 0 ? (
                  <p className="pal-history-aside">No sets were logged for this {status} movement.</p>
                ) : (
                  <ol className="pal-history-sets">
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
          <section className="pal-history-cardio" aria-labelledby="history-cardio-title">
            <h2 id="history-cardio-title">
              {session.cardio.mode === "runner" ? "Runner" : "Walker"} cardio
            </h2>
            <dl className="pal-glance pal-insights-cardio">
              <div><dt>Time</dt><dd>{formatInsightDuration(session.cardio.durationSeconds)}</dd></div>
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
                <dd>{session.cardio.inclinePercent === undefined ? "Not recorded" : `${session.cardio.inclinePercent}%`}</dd>
              </div>
              <div>
                <dt>Pace</dt>
                <dd>
                  {session.cardio.paceSecondsPerKilometer === undefined
                    ? "Not recorded"
                    : formatCardioPace(session.cardio.paceSecondsPerKilometer, { unitSystem })}
                </dd>
              </div>
            </dl>
            {session.cardio.notes ? (
              <p className="pal-history-aside"><strong>Your notes:</strong> {session.cardio.notes}</p>
            ) : null}
          </section>
        ) : null}
      </div>
    </article>
  );
}
