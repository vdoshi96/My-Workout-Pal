"use client";

import Link from "next/link";
import { useState } from "react";

import { StartWorkoutControl } from "@/components/workout/start-workout-control";
import {
  formatInsightDistance,
  formatInsightDuration,
  formatInsightVolume,
} from "@/components/insights/training-insights-presenters";
import { Icon } from "@/components/ui/icon";
import { PalSticker, SceneStage } from "@/components/ui/scene-stage";
import { DemoSheet } from "@/components/video/demo-sheet";
import { EQUIPMENT_PROFILES } from "@/domain/equipment";
import { withFrom } from "@/domain/navigation/back-target";
import type { CuratedVideos } from "@/domain/youtube/embed";
import type {
  ActiveProgramPrescriptionReadModel,
  ActiveProgramReadModel,
} from "@/server/repositories/profile-program";

export type MemberHomeProgressSummary = Readonly<{
  completedSessions: number;
  completedWorkSets?: number;
  repetitions?: number;
  distanceMeters: number;
  durationSeconds: number;
  unitSystem: "imperial" | "metric";
  volumeKg: number;
}>;

export type MemberHomeResumableWorkout = Readonly<{
  dayName: string;
  sessionId: string;
  state: "active" | "completing" | "draft";
}>;

function range(minimum: number | null, maximum: number | null) {
  if (minimum === null) return null;
  return maximum === null || maximum === minimum ? `${minimum}` : `${minimum}–${maximum}`;
}

function targetLabel(prescription: ActiveProgramPrescriptionReadModel) {
  const sets = `${prescription.setCount} ${prescription.setCount === 1 ? "set" : "sets"}`;
  const reps = range(prescription.minimumReps, prescription.maximumReps);
  if (reps) return `${sets} · ${reps} reps`;
  const seconds = range(prescription.minimumSeconds, prescription.maximumSeconds);
  if (seconds) return `${sets} · ${seconds} sec`;
  return sets;
}

function movementHref(prescription: ActiveProgramPrescriptionReadModel, origin: string) {
  return withFrom(prescription.customExerciseId
    ? `/app/library/custom/${prescription.customExerciseId}`
    : `/app/library/${prescription.exercise.slug}`, origin);
}

export function MemberProgramHome({
  canMutate,
  demos = {},
  displayName,
  initialDayKey,
  initialProgram,
  progress,
  resumableWorkout,
}: Readonly<{
  canMutate: boolean;
  demos?: Readonly<Record<string, CuratedVideos>>;
  displayName: string;
  initialDayKey?: string | null;
  initialProgram: ActiveProgramReadModel;
  progress: MemberHomeProgressSummary;
  resumableWorkout: MemberHomeResumableWorkout | null;
}>) {
  const program = initialProgram;
  const [selectedDayId, setSelectedDayId] = useState(
    program.days.find((day) => day.dayKey === initialDayKey)?.id ?? program.days[0]!.id,
  );
  const selectedDay = program.days.find((day) => day.id === selectedDayId) ?? program.days[0]!;
  const dayCountLabel = `${program.days.length} ${program.days.length === 1 ? "day" : "days"} a week`;
  const firstName = displayName.trim().split(/\s+/u)[0] || "there";
  const movementCount = `${selectedDay.prescriptions.length} ${selectedDay.prescriptions.length === 1 ? "movement" : "movements"}`;

  function chooseDay(dayId: string, dayKey: string) {
    setSelectedDayId(dayId);
    // Keep the choice in the address so returning to Today lands on the same day.
    window.history.replaceState(window.history.state, "", `/app?day=${encodeURIComponent(dayKey)}`);
  }

  return (
    <section className="member-program pal-today" aria-labelledby="member-program-title">
      <div className="pal-today-stage">
        <SceneStage priority />
        <div className="pal-today-copy">
          {resumableWorkout ? (
            <>
              <h1 id="member-program-title">Welcome back, {firstName}!</h1>
              <p>{canMutate ? `You're partway through ${resumableWorkout.dayName}. Pick up where you left off, and finish it before starting another day.` : `Your ${resumableWorkout.dayName} workout is waiting. Verify your email to keep going.`}</p>
              <h2 className="sr-only">{canMutate ? `Keep going with ${resumableWorkout.dayName}` : `Verify to resume ${resumableWorkout.dayName}`}</h2>
              <div className="pal-today-actions">
                <Link className={canMutate ? "primary-action" : "secondary-action"} href={`/workout/${resumableWorkout.sessionId}`} prefetch={false}>
                  {canMutate ? `Resume ${resumableWorkout.dayName}` : `Review ${resumableWorkout.dayName}`} <Icon name="arrow-right" />
                </Link>
              </div>
            </>
          ) : (
            <>
              <h1 id="member-program-title">Hey {firstName}! Ready for {selectedDay.displayName}?</h1>
              <p>{movementCount} · {EQUIPMENT_PROFILES[program.equipmentProfileKind].label}</p>
              {!canMutate ? <p className="pal-notice" role="status">Your routine is ready to look through. Verify your email and sign in again to start or edit workouts.</p> : null}
              <div className="pal-today-actions">
                <StartWorkoutControl dayId={selectedDay.id} eligible={canMutate} label={`Start ${selectedDay.displayName}`} programId={program.id} />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="pal-today-body">
        <section className="pal-days" aria-labelledby="member-week-title">
          <div className="pal-heading-row">
            <h2 id="member-week-title">Your week</h2>
            <span>{program.name} · {dayCountLabel}</span>
          </div>
          <ul className="pal-day-pills">
            {program.days.map((day) => (
              <li key={day.id}>
                <button aria-pressed={day.id === selectedDay.id} className="pal-day-pill" onClick={() => chooseDay(day.id, day.dayKey)} type="button">
                  {day.displayName === `Day ${day.dayNumber}` ? null : <small>Day {day.dayNumber}</small>}
                  <strong>{day.displayName}</strong>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="member-moves-title">
          <div className="pal-heading-row">
            <h2 id="member-moves-title">What&apos;s in {selectedDay.displayName}</h2>
            <Link href={withFrom(`/app/program/${selectedDay.dayKey}`, `/app?day=${selectedDay.dayKey}`)} prefetch={false}>See the whole day</Link>
          </div>
          <ol className="pal-moves">
            {selectedDay.prescriptions.map((prescription, index) => {
              const videos = prescription.catalogExerciseId ? demos[prescription.catalogExerciseId] : undefined;
              return (
                <li className="pal-move" id={`movement-${index + 1}`} key={prescription.id}>
                  <span aria-hidden="true" className="pal-move-number">{index + 1}</span>
                  <div>
                    <Link className="pal-move-name" href={movementHref(prescription, `/app?day=${selectedDay.dayKey}#movement-${index + 1}`)} prefetch={false}>{prescription.label}</Link>
                    <small>{targetLabel(prescription)}</small>
                  </div>
                  {videos ? <DemoSheet movementName={prescription.label} videos={videos} /> : <span className="pal-no-demo">No demo yet</span>}
                </li>
              );
            })}
          </ol>
        </section>

        <section aria-labelledby="member-home-progress-title">
          <div className="pal-heading-row">
            <h2 id="member-home-progress-title">Your progress</h2>
            {progress.completedSessions > 0 ? <Link href="/app/progress">See all progress</Link> : null}
          </div>
          {progress.completedSessions > 0 ? (
            <dl className="pal-glance">
              <div><dt>Workouts</dt><dd>{progress.completedSessions}</dd></div>
              <div><dt>Sets</dt><dd>{progress.completedWorkSets ?? 0}</dd></div>
              <div><dt>Reps</dt><dd>{progress.repetitions ?? 0}</dd></div>
              {progress.volumeKg > 0 ? <div><dt>Lifted</dt><dd>{formatInsightVolume(progress.volumeKg, progress.unitSystem)}</dd></div> : null}
              {progress.durationSeconds > 0 ? <div><dt>Time</dt><dd>{formatInsightDuration(progress.durationSeconds)}</dd></div> : null}
              {progress.distanceMeters > 0 ? <div><dt>Distance</dt><dd>{formatInsightDistance(progress.distanceMeters, progress.unitSystem)}</dd></div> : null}
            </dl>
          ) : (
            <div className="pal-empty-progress">
              <PalSticker pose="ready" />
              <p>Finish your first workout and your sets, reps and records start adding up here.</p>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
