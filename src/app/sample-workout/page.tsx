import type { Metadata } from "next";
import Link from "next/link";

import { PublicShell } from "@/components/layout/public-shell";
import { Icon } from "@/components/ui/icon";
import { EQUIPMENT_PROFILES, type EquipmentProfileKind } from "@/domain/equipment";
import { getCatalogExercise } from "@/domain/exercises/catalog";
import { exerciseDetailHref } from "@/domain/navigation/public-exercise-return";
import { createStarterProgram } from "@/domain/programs/starter";

export const metadata: Metadata = { title: "Read-only sample workout" };

const validDays = ["push", "pull", "legs", "upper", "lower"] as const;
type DaySlug = (typeof validDays)[number];

type PageProps = {
  searchParams: Promise<{ day?: string; equipment?: string }>;
};

function isDaySlug(value: string | undefined): value is DaySlug {
  return validDays.some((day) => day === value);
}

export default async function SampleWorkoutPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const profile: EquipmentProfileKind = query.equipment === "barbell" ? "barbell" : "dumbbells";
  const daySlug: DaySlug = isDaySlug(query.day) ? query.day : "push";
  const program = createStarterProgram(EQUIPMENT_PROFILES[profile]);
  const selectedDay = program.days.find((day) => day.name.toLowerCase() === daySlug) ?? program.days[0]!;

  return (
    <PublicShell current={null}>
      <section className="sample-runner-head contour-surface">
        <div>
          <Link
            className="back-link"
            href={`/program/${daySlug}?equipment=${profile}`}
            prefetch={false}
          >
            <Icon name="arrow-left" /> {selectedDay.name} day
          </Link>
          <span className="eyebrow">Read-only practice snapshot</span>
          <h1>{selectedDay.name} workout</h1>
          <p>This completed example demonstrates warm-up/work distinction, previous values, targets, notes, cardio, and saved-state language without writing guest data.</p>
        </div>
        <div className="sample-warning"><strong>Sample complete</strong><span>Not your workout · never saved</span></div>
      </section>

      <div className="sample-runner-grid">
        <section className="sample-log" aria-labelledby="sample-log-heading">
          <div className="section-heading">
            <div><span className="eyebrow">Exercise snapshots</span><h2 id="sample-log-heading">Completed route</h2></div>
            <span className="status-stamp">Read only</span>
          </div>
          <ol>
            {selectedDay.prescriptions.map((prescription, index) => {
              const exercise = getCatalogExercise(prescription.exerciseSlug);
              const timed = prescription.minimumSeconds !== undefined;
              const top = timed ? prescription.maximumSeconds : prescription.maximumReps;
              const unit = timed ? "sec" : "reps";
              return (
                <li key={exercise.slug}>
                  <header>
                    <span className="catalog-number">{String(index + 1).padStart(2, "0")}</span>
                    <div><strong>{prescription.displayName ?? exercise.name}</strong><small>{prescription.sets} work sets · {prescription.restSeconds}s rest</small></div>
                    <Link
                      href={exerciseDetailHref(exercise.slug, {
                        equipment: profile,
                        returnTo: `/sample-workout?day=${daySlug}&equipment=${profile}`,
                      })}
                      prefetch={false}
                    >
                      Technique
                    </Link>
                  </header>
                  <div className="sample-set-row">
                    {exercise.loggingKind === "weight_reps" ? <span><small>Warm-up</small><strong>Light × 8</strong></span> : null}
                    {Array.from({ length: prescription.sets }, (_, setIndex) => (
                      <span key={setIndex}><small>Work {setIndex + 1}</small><strong>{top} {unit}</strong></span>
                    ))}
                  </div>
                  <p><strong>Previous:</strong> {exercise.loggingKind === "weight_reps" ? "Same controlled load · one fewer rep on final set." : "One fewer rep or five fewer seconds."} <strong>Sample note:</strong> Form stayed controlled.</p>
                </li>
              );
            })}
          </ol>
        </section>

        <aside className="sample-runner-side">
          <span className="eyebrow">Recovery states</span>
          <h2>What the live runner adds</h2>
          <dl>
            <div><dt>Save state</dt><dd>Pending → saved, or failed with explicit retry.</dd></div>
            <div><dt>Interruption</dt><dd>Refresh and reconnection resume one idempotent session.</dd></div>
            <div><dt>Rest</dt><dd>90 seconds for compounds; 60 for accessory and core work.</dd></div>
            <div><dt>Next workout</dt><dd>Review your saved work and choose your own targets. Automatic load suggestions are not part of the runner.</dd></div>
          </dl>
          <section className="sample-cardio-log">
            <h3>Cardio snapshot</h3>
            <p><strong>Walker</strong> · 20:00 · 1.2 mi · 2% incline</p>
            <small>Sample note: conversational pace.</small>
          </section>
          <Link className="primary-action" href="/app" prefetch={false}>
            <span>Open my workouts</span><Icon name="arrow-right" />
          </Link>
          <p className="temporary-note">Sign in only when you want this work saved to your own history and analytics.</p>
        </aside>
      </div>
    </PublicShell>
  );
}
