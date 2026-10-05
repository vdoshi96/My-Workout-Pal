import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BackLink } from "@/components/navigation/back-link";
import { Icon } from "@/components/ui/icon";
import { MovementDemo } from "@/components/video/demo-sheet";
import { EQUIPMENT_PROFILES, type EquipmentProfileKind } from "@/domain/equipment";
import { getCatalogExercise } from "@/domain/exercises/catalog";
import { PublicShell } from "@/components/layout/public-shell";
import { SceneStage } from "@/components/ui/scene-stage";
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

  return <PublicShell current="program">
    <SceneStage scene="workout" />
    <header className="pal-page-head">
      <BackLink target={back} />
      <h1>{dayName} day</h1>
      <p>{selectedDay.prescriptions.length} movements, then a 20-minute walk or run if you like.</p>
    </header>
    <div className="pal-page-body">
      {selectedDay.sections.map((section) => <section aria-labelledby={`section-${section.kind}`} key={section.kind}>
        <h2 id={`section-${section.kind}`}>{section.kind === "strength" ? "Strength" : section.kind === "accessory" ? "Accessory" : "Core"}</h2>
        <ol className="pal-moves">{section.prescriptionIndexes.map((index) => {
          const prescription = selectedDay.prescriptions[index];
          if (!prescription) return null;
          const exercise = getCatalogExercise(prescription.exerciseSlug);
          const name = prescription.displayName ?? exercise.name;
          const target = prescription.minimumSeconds ? `${prescription.minimumSeconds}–${prescription.maximumSeconds} sec` : `${prescription.minimumReps}–${prescription.maximumReps} reps`;
          const anchor = `movement-${index + 1}`;
          return <li className="pal-move" id={anchor} key={exercise.slug}>
            <span aria-hidden="true" className="pal-move-number">{index + 1}</span>
            <div><Link className="pal-move-name" href={withFrom(`/library/${exercise.slug}?equipment=${profile}`, `${dayHref}#${anchor}`)}>{name}</Link><small>{prescription.sets} sets · {target} · {prescription.restSeconds}s rest</small></div>
            <MovementDemo movementName={name} videos={demos[exercise.slug]} />
          </li>;
        })}</ol>
      </section>)}
      <section aria-labelledby="cardio-heading">
        <h2 id="cardio-heading">Cardio finish</h2>
        <p className="pal-lead"><Icon name="walk" /> Walk or <Icon name="run" /> run for 20 minutes. You can change it once you save a routine.</p>
        <Link className="secondary-action" href={withFrom(`/sample-workout?day=${day}&equipment=${profile}`, dayHref)}>See an example finished workout <Icon name="arrow-right" /></Link>
      </section>
    </div>
  </PublicShell>;
}
