import type { Metadata } from "next";
import Link from "next/link";

import { PublicShell } from "@/components/layout/public-shell";
import { PalSticker, SceneStage } from "@/components/ui/scene-stage";
import { BackLink } from "@/components/navigation/back-link";
import { Icon } from "@/components/ui/icon";
import { EQUIPMENT_PROFILES, type EquipmentProfileKind } from "@/domain/equipment";
import { getCatalogExercise } from "@/domain/exercises/catalog";
import { fromParam, resolveBackTarget, withFrom } from "@/domain/navigation/back-target";
import { createStarterProgram } from "@/domain/programs/starter";

export const metadata: Metadata = { title: "Example workout" };

const validDays = ["push", "pull", "legs", "upper", "lower"] as const;
type DaySlug = (typeof validDays)[number];

type PageProps = {
  searchParams: Promise<{ day?: string; equipment?: string; from?: string | string[] }>;
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
  const pageHref = `/sample-workout?day=${daySlug}&equipment=${profile}`;
  const back = resolveBackTarget(fromParam(query.from), {
    area: "public",
    fallback: { href: `/program/${daySlug}?equipment=${profile}`, label: `Back to the ${selectedDay.name} day` },
  });

  return (
    <PublicShell current={null}>
      <SceneStage scene="workout" />
      <header className="pal-page-head">
        <BackLink target={back} />
        <span className="pal-tag">Example · nothing here is saved</span>
        <h1>Example workout</h1>
        <p>Here&apos;s what a finished {selectedDay.name} day looks like in your history.</p>
      </header>

      <div className="pal-page-body">
        <section aria-labelledby="sample-log-heading">
          <h2 id="sample-log-heading">Movements</h2>
          <ol className="pal-moves pal-sample-log">
            {selectedDay.prescriptions.map((prescription, index) => {
              const exercise = getCatalogExercise(prescription.exerciseSlug);
              const timed = prescription.minimumSeconds !== undefined;
              const top = timed ? prescription.maximumSeconds : prescription.maximumReps;
              const unit = timed ? "sec" : "reps";
              return (
                <li className="pal-move" id={`movement-${index + 1}`} key={exercise.slug}>
                  <span aria-hidden="true" className="pal-move-number">{index + 1}</span>
                  <div>
                    <Link className="pal-move-name" href={withFrom(`/library/${exercise.slug}?equipment=${profile}`, `${pageHref}#movement-${index + 1}`)} prefetch={false}>{prescription.displayName ?? exercise.name}</Link>
                    <small>{prescription.sets} sets · {prescription.restSeconds}s rest</small>
                    <ul className="pal-set-chips">
                      {exercise.loggingKind === "weight_reps" ? <li><small>Warm-up</small> Light × 8</li> : null}
                      {Array.from({ length: prescription.sets }, (_, setIndex) => (
                        <li key={setIndex}><small>Set {setIndex + 1}</small> {top} {unit} <Icon name="check" /></li>
                      ))}
                    </ul>
                    <small>Last time: {exercise.loggingKind === "weight_reps" ? "same weight, one fewer rep on the last set." : "one fewer rep or five fewer seconds."} Note: form stayed controlled.</small>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <section aria-labelledby="sample-cardio-heading">
          <h2 id="sample-cardio-heading">Cardio</h2>
          <p className="pal-lead"><Icon name="walk" /> Walk · 20:00 · 1.2 mi · 2% incline. Note: easy, chatty pace.</p>
        </section>

        <section className="pal-closer pal-closer--left" aria-labelledby="sample-real-heading">
          <PalSticker pose="complete" />
          <div>
            <h2 id="sample-real-heading">During a real workout</h2>
            <ul className="pal-explain">
              <li><strong>Saving.</strong> Each set shows when it&apos;s saved.</li>
              <li><strong>Interruptions.</strong> Close the app mid-workout and pick up where you left off.</li>
              <li><strong>Your targets.</strong> See your last session and set your own targets.</li>
            </ul>
            <div className="pal-actions">
              <Link className="primary-action" href="/sign-in" prefetch={false}><span>Sign in to start</span><Icon name="arrow-right" /></Link>
              <Link className="secondary-action" href="/try">Take a test drive</Link>
            </div>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
