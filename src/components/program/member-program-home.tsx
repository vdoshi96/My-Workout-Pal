"use client";

import Link from "next/link";
import { useState } from "react";

import { EquipmentProfileControl } from "@/components/program/equipment-profile-control";
import {
  formatInsightDistance,
  formatInsightDuration,
  formatInsightVolume,
} from "@/components/insights/training-insights-presenters";
import { Icon } from "@/components/ui/icon";
import { DecorativeCompanion } from "@/components/ui/decorative-companion";
import { EQUIPMENT_PROFILES } from "@/domain/equipment";
import type { ActiveProgramReadModel } from "@/server/repositories/profile-program";

export type MemberHomeProgressSummary = Readonly<{
  completedSessions: number;
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

export function MemberProgramHome({
  canMutate,
  displayName,
  initialProgram,
  progress,
  resumableWorkout,
}: Readonly<{
  canMutate: boolean;
  displayName: string;
  initialProgram: ActiveProgramReadModel;
  progress: MemberHomeProgressSummary;
  resumableWorkout: MemberHomeResumableWorkout | null;
}>) {
  const [program, setProgram] = useState(initialProgram);
  const dayCountLabel = `${program.days.length} ${program.days.length === 1 ? "day" : "days"}`;
  const greetingName = displayName.trim() || "there";
  const hasResumableWorkout = resumableWorkout !== null;

  return (
    <section
      className={`member-program${hasResumableWorkout ? " member-program--resumable" : ""}`}
      aria-labelledby="member-program-title"
    >
      <header className="member-program-hero contour-surface">
        <div className="member-program-copy">
          <span className="eyebrow">Your workout companion</span>
          <h1 id="member-program-title">Welcome back, {greetingName}</h1>
          <p>
            {program.name} · Revision {program.revisionNumber} · {EQUIPMENT_PROFILES[program.equipmentProfileKind].label} · {dayCountLabel}
          </p>
        </div>
        <div className="member-program-actions">
          <Link className="secondary-action" href="/app/programs">
            <Icon name="map" /> Manage routines
          </Link>
          {canMutate ? (
            <Link className="secondary-action" href="/app/program/edit">
              <Icon name="settings" /> Edit routine
            </Link>
          ) : null}
          <Link className="secondary-action" href="/app/library">
            <Icon name="library" /> Library
          </Link>
          <Link className="secondary-action" href="/app/library/custom">
            <Icon name="library" /> Manage private exercises
          </Link>
        </div>
        <DecorativeCompanion variant="member-home" />
      </header>

      {!canMutate ? (
        <aside className="member-inline-notice member-home-verification" role="status">
          <strong>Your routine is available to review.</strong>{" "}
          Verify your email and sign in again to start or edit workouts.
        </aside>
      ) : null}

      {resumableWorkout ? (
        <section className="member-resume-card" aria-labelledby="member-resume-title">
          <div>
            <span className="eyebrow">
              {canMutate ? "Workout in progress" : "Workout waiting"}
            </span>
            <h2 id="member-resume-title">
              {canMutate
                ? `Keep going with ${resumableWorkout.dayName}`
                : `Verify to resume ${resumableWorkout.dayName}`}
            </h2>
            {canMutate ? (
              <p>
                Finish or abandon {resumableWorkout.dayName} before starting another day.
                Your saved workout remains attached to this account.
              </p>
            ) : (
              <p>
                This saved workout still belongs to your account. The workout page remains
                read-only until you verify your email and sign in again.
              </p>
            )}
          </div>
          <Link className={canMutate ? "primary-action" : "secondary-action"} href={`/workout/${resumableWorkout.sessionId}`} prefetch={false}>
            {canMutate ? `Resume ${resumableWorkout.dayName}` : `Review ${resumableWorkout.dayName}`} <Icon name="arrow-right" />
          </Link>
        </section>
      ) : null}

      <section className="member-home-progress" aria-labelledby="member-home-progress-title">
        <header className="section-heading">
          <div>
            <span className="eyebrow">Your saved activity</span>
            <h2 id="member-home-progress-title">Progress at a glance</h2>
          </div>
          <div className="member-home-insight-links">
            <Link href="/app/history">Review history</Link>
            <Link href="/app/progress">Open progress</Link>
          </div>
        </header>
        {progress.completedSessions === 0 ? (
          <div className="member-home-empty">
            <strong>No completed workouts yet</strong>
            <span>Finish an owned workout to begin your private history and progress.</span>
          </div>
        ) : (
          <dl className="member-home-totals">
            <div><dt>Completed</dt><dd>{progress.completedSessions}</dd></div>
            <div><dt>Volume</dt><dd>{formatInsightVolume(progress.volumeKg, progress.unitSystem)}</dd></div>
            <div><dt>Duration</dt><dd>{formatInsightDuration(progress.durationSeconds)}</dd></div>
            <div><dt>Distance</dt><dd>{formatInsightDistance(progress.distanceMeters, progress.unitSystem)}</dd></div>
          </dl>
        )}
      </section>

      <section className="member-week" aria-labelledby="member-week-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Current route</span>
            <h2 id="member-week-title">
              {hasResumableWorkout ? "Your routine" : "Choose a training day"}
            </h2>
          </div>
          <span>{program.days.length} days</span>
        </div>
        <ol className="member-day-grid">
          {program.days.map((day) => (
            <li key={day.id}>
              {!hasResumableWorkout ? (
                <Link
                  href={`/app/program/${day.dayKey}`}
                  prefetch={false}
                >
                  <span>{String(day.dayNumber).padStart(2, "0")}</span>
                  <strong>{day.displayName}</strong>
                  <small>
                    {day.prescriptions.length} movements · {day.cardio.length === 0
                      ? "no cardio"
                      : `${day.cardio.length} cardio option${day.cardio.length === 1 ? "" : "s"}`}
                  </small>
                  <small className="member-day-action-label">
                    {canMutate ? `Open ${day.displayName} to start` : `Review ${day.displayName}`}
                  </small>
                  <Icon name="chevron-right" />
                </Link>
              ) : (
                <div className="member-day-unavailable">
                  <span>{String(day.dayNumber).padStart(2, "0")}</span>
                  <strong>{day.displayName}</strong>
                  <small>
                    {day.prescriptions.length} movements · {day.cardio.length === 0
                      ? "no cardio"
                      : `${day.cardio.length} cardio option${day.cardio.length === 1 ? "" : "s"}`}
                  </small>
                </div>
              )}
            </li>
          ))}
        </ol>
      </section>

      <EquipmentProfileControl
        canMutate={canMutate}
        onSaved={(nextProgram) => setProgram(nextProgram)}
        program={program}
      />
    </section>
  );
}
