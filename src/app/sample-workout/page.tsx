import type { Metadata } from "next";
import Link from "next/link";

import { PublicShell } from "@/components/layout/public-shell";
import { Icon } from "@/components/ui/icon";
import { EQUIPMENT_PROFILES, type EquipmentProfileKind } from "@/domain/equipment";
import { getCatalogExercise } from "@/domain/exercises/catalog";
import { exerciseDetailHref } from "@/domain/navigation/public-exercise-return";
import { createStarterProgram } from "@/domain/programs/starter";

export const metadata: Metadata = { title: "Example workout" };

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
          <h2>Finished sets</h2>
          <h1>Example workout</h1>
          <p>An example of a finished workout. Nothing here is saved.</p>
        </div>
        <div className="sample-warning"><strong>Sample complete</strong><span>Not your workout · never saved</span></div>
      </section>

      <div className="sample-runner-grid">
        <section className="sample-log" aria-labelledby="sample-log-heading">
          <div className="section-heading">
            <div><h2 id="sample-log-heading">Movements</h2></div>
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
                      <span key={setIndex}><small>Set {setIndex + 1}</small><strong>{top} {unit}</strong></span>
                    ))}
                  </div>
                  <p><strong>Previous:</strong> {exercise.loggingKind === "weight_reps" ? "Same controlled load · one fewer rep on final set." : "One fewer rep or five fewer seconds."} <strong>Sample note:</strong> Form stayed controlled.</p>
                </li>
              );
            })}
          </ol>
        </section>

        <aside className="sample-runner-side">

          <h2>During a real workout</h2>
          <dl>
            <div><dt>Saving</dt><dd>{"Each set shows when it's saved."}</dd></div>
            <div><dt>Interruptions</dt><dd>Close the app mid-workout and pick up where you left off.</dd></div>
            <div><dt>Your targets</dt><dd>Review your last session and set your own targets.</dd></div>
          </dl>
          <section className="sample-cardio-log">
            <h3>Cardio</h3>
            <p><strong>Walker</strong> · 20:00 · 1.2 mi · 2% incline</p>
            <small>Sample note: conversational pace.</small>
          </section>
          <Link className="primary-action" href="/sign-in" prefetch={false}>
            <span>Sign in to start</span><Icon name="arrow-right" />
          </Link>
        </aside>
      </div>
    </PublicShell>
  );
}
