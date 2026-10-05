import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BackLink } from "@/components/navigation/back-link";
import { Icon } from "@/components/ui/icon";
import { MovementDemo } from "@/components/video/demo-sheet";
import { EQUIPMENT_PROFILES, type EquipmentProfileKind } from "@/domain/equipment";
import { getCatalogExercise } from "@/domain/exercises/catalog";
import { PublicShell } from "@/components/layout/public-shell";
import { fromParam, resolveBackTarget, withFrom } from "@/domain/navigation/back-target";
import { createStarterProgram } from "@/domain/programs/starter";
import { loadPublicApprovedDemosBySlug } from "@/server/read-models/approved-demos";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  searchParams: Promise<{ equipment?: string; from?: string | string[] }>;
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
  const dayHref = `/program/${day}?equipment=${profile}`;
  const back = resolveBackTarget(fromParam(query.from), {
    area: "public",
    fallback: { href: `/program?equipment=${profile}`, label: "Back to the example routine" },
  });
  const demos = await loadPublicApprovedDemosBySlug(selectedDay.prescriptions.map((prescription) => prescription.exerciseSlug));

  return <PublicShell current="program"><section className="day-page">
    <BackLink target={back} />
    <header className="public-hero"><h1>{dayName} day</h1><p>{selectedDay.prescriptions.length} movements with a walker or runner finish.</p></header>
    <div className="day-layout">
      <div>{selectedDay.sections.map((section) => <section className="prescription-section" key={section.kind}>
        <h2>{section.kind === "strength" ? "Strength" : section.kind === "accessory" ? "Accessory" : "Core"}</h2>
        <ol>{section.prescriptionIndexes.map((index) => {
          const prescription = selectedDay.prescriptions[index];
          if (!prescription) return null;
          const exercise = getCatalogExercise(prescription.exerciseSlug);
          const name = prescription.displayName ?? exercise.name;
          const target = prescription.minimumSeconds ? `${prescription.minimumSeconds}–${prescription.maximumSeconds} sec` : `${prescription.minimumReps}–${prescription.maximumReps}`;
          const anchor = `movement-${index + 1}`;
          return <li id={anchor} key={exercise.slug}>
            <Link href={withFrom(`/library/${exercise.slug}?equipment=${profile}`, `${dayHref}#${anchor}`)}><span><strong>{name}</strong><small>{prescription.sets} × {target} · {prescription.restSeconds}s rest</small></span><Icon name="chevron-right" /></Link>
            <MovementDemo movementName={name} videos={demos[exercise.slug]} />
          </li>;
        })}</ol>
      </section>)}</div>
      <aside className="cardio-sheet"><h2>Cardio finish</h2><div className="cardio-options"><div><Icon name="walk" /><strong>Walker</strong><span>20 minutes</span></div><div><Icon name="run" /><strong>Runner</strong><span>20 minutes</span></div></div><p>Edit cardio targets once you save a routine.</p><Link href={withFrom(`/sample-workout?day=${day}&equipment=${profile}`, dayHref)}>See an example finished workout</Link></aside>
    </div>
  </section></PublicShell>;
}
