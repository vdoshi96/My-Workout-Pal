import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Icon } from "@/components/ui/icon";
import { EQUIPMENT_PROFILES, type EquipmentProfileKind } from "@/domain/equipment";
import { getCatalogExercise } from "@/domain/exercises/catalog";
import { PublicShell } from "@/components/layout/public-shell";
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

  return <PublicShell current="program"><section className="day-page">
    <Link className="back-link" href={`/program?equipment=${profile}`}><Icon name="arrow-left" />Example routine</Link>
    <header className="public-hero"><h1>{dayName} day</h1><p>{selectedDay.prescriptions.length} movements with a walker or runner finish.</p></header>
    <div className="day-layout">
      <div>{selectedDay.sections.map((section) => <section className="prescription-section" key={section.kind}>
        <h2>{section.kind === "strength" ? "Strength" : section.kind === "accessory" ? "Accessory" : "Core"}</h2>
        <ol>{section.prescriptionIndexes.map((index) => {
          const prescription = selectedDay.prescriptions[index];
          if (!prescription) return null;
          const exercise = getCatalogExercise(prescription.exerciseSlug);
          const target = prescription.minimumSeconds ? `${prescription.minimumSeconds}–${prescription.maximumSeconds} sec` : `${prescription.minimumReps}–${prescription.maximumReps}`;
          return <li key={exercise.slug}><Link href={`/library/${exercise.slug}?equipment=${profile}`}><span><strong>{prescription.displayName ?? exercise.name}</strong><small>{prescription.sets} × {target} · {prescription.restSeconds}s rest</small></span><Icon name="chevron-right" /></Link></li>;
        })}</ol>
      </section>)}</div>
      <aside className="cardio-sheet"><h2>Cardio finish</h2><div className="cardio-options"><div><Icon name="walk" /><strong>Walker</strong><span>20 minutes</span></div><div><Icon name="run" /><strong>Runner</strong><span>20 minutes</span></div></div><p>Edit cardio targets once you save a routine.</p><Link href="/sample-workout">See an example finished workout</Link></aside>
    </div>
  </section></PublicShell>;
}
