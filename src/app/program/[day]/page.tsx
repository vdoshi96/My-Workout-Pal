import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Icon } from "@/components/ui/icon";
import { EQUIPMENT_PROFILES, type EquipmentProfileKind } from "@/domain/equipment";
import { getCatalogExercise } from "@/domain/exercises/catalog";
import { createStarterProgram } from "@/domain/programs/starter";

const dayBySlug = {
  push: "Push",
  pull: "Pull",
  legs: "Legs",
  upper: "Upper",
  lower: "Lower",
} as const;

type DaySlug = keyof typeof dayBySlug;
type PageProps = {
  params: Promise<{ day: string }>;
  searchParams: Promise<{ equipment?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { day } = await params;
  const dayName = dayBySlug[day as DaySlug];
  return { title: dayName ? `${dayName} day` : "Program day" };
}

export default async function DayPage({ params, searchParams }: PageProps) {
  const [{ day }, query] = await Promise.all([params, searchParams]);
  const dayName = dayBySlug[day as DaySlug];
  if (!dayName) notFound();

  const profile: EquipmentProfileKind = query.equipment === "barbell" ? "barbell" : "dumbbells";
  const program = createStarterProgram(EQUIPMENT_PROFILES[profile]);
  const selectedDay = program.days.find((candidate) => candidate.name === dayName);
  if (!selectedDay) notFound();

  return (
    <main className="day-page">
      <a className="skip-link" href="#day-plan">
        Skip to day plan
      </a>
      <header className="day-header">
        <Link className="back-link" href={`/?equipment=${profile}`}>
          <Icon name="arrow-left" />
          Program route
        </Link>
        <div className="guest-stamp">Guest preview · not saved</div>
      </header>

      <section className="day-intro contour-surface">
        <div className="waypoint-number" aria-hidden="true">
          {program.days.findIndex((candidate) => candidate.name === dayName) + 1}
        </div>
        <div>
          <h1>{dayName} day</h1>
          <p>
            Six strength and core movements with your choice of walker or runner cardio.
          </p>
        </div>
        <div className="equipment-stamp">
          <Icon name="dumbbell" />
          {EQUIPMENT_PROFILES[profile].label}
        </div>
      </section>

      <div className="day-layout" id="day-plan">
        <section className="route-sheet day-sheet" aria-labelledby="prescriptions-heading">
          <h2 id="prescriptions-heading">Your route</h2>
          {selectedDay.sections.map((section) => (
            <section className="prescription-section" key={section.kind}>
              <h3>{section.kind}</h3>
              <ol>
                {section.prescriptionIndexes.map((index) => {
                  const prescription = selectedDay.prescriptions[index];
                  if (!prescription) return null;
                  const exercise = getCatalogExercise(prescription.exerciseSlug);
                  const target = prescription.minimumSeconds
                    ? `${prescription.sets} × ${prescription.minimumSeconds}–${prescription.maximumSeconds} sec`
                    : `${prescription.sets} × ${prescription.minimumReps}–${prescription.maximumReps}`;
                  return (
                    <li key={exercise.slug}>
                      <Link href={`/library/${exercise.slug}?from=${day}&equipment=${profile}`}>
                        <span>
                          <strong>{prescription.displayName ?? exercise.name}</strong>
                          <small>{target} · {prescription.restSeconds}s rest</small>
                        </span>
                        <Icon name="chevron-right" />
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </section>

        <aside className="cardio-sheet" aria-labelledby="cardio-heading">
          <h2 id="cardio-heading">Cardio finish</h2>
          <p>Choose the mode that fits the day. Time, distance, pace, incline, and notes are editable when you save a program.</p>
          <div className="cardio-options">
            <div><Icon name="walk" /><strong>Walker</strong><span>20 minutes</span></div>
            <div><Icon name="run" /><strong>Runner</strong><span>20 minutes</span></div>
          </div>
          <Link className="primary-action" href={`/sample-workout?day=${day}&equipment=${profile}`}>
            Try sample workout
            <Icon name="arrow-right" />
          </Link>
          <p className="temporary-note">Sample activity stays in this tab and is not saved to an account.</p>
        </aside>
      </div>
    </main>
  );
}
