import Link from "next/link";
import { PublicShell } from "@/components/layout/public-shell";
import { EQUIPMENT_PROFILES, type EquipmentProfileKind } from "@/domain/equipment";
import { getCatalogExercise } from "@/domain/exercises/catalog";
import type { Program } from "@/domain/programs/types";

type Props = Readonly<{ dumbbellProgram: Program; barbellProgram: Program; initialProfile: EquipmentProfileKind }>;

export function ProgramExplorer({ dumbbellProgram, barbellProgram, initialProfile: profile }: Props) {
  const program = profile === "dumbbells" ? dumbbellProgram : barbellProgram;
  const other = profile === "dumbbells" ? barbellProgram : dumbbellProgram;
  return <PublicShell current="program">
    <section className="program-example">
      <header className="public-hero">
        <h1>Five-day example routine</h1>
        <p>{"Strength, core, and an optional cardio finish across five days. Change anything once it's yours."}</p>
      </header>
      <div className="profile-links" role="group" aria-label="Equipment preview">
        {(Object.keys(EQUIPMENT_PROFILES) as EquipmentProfileKind[]).map((id) => <Link key={id} href={`/program?equipment=${id}`} aria-current={profile === id ? "true" : undefined}>{EQUIPMENT_PROFILES[id].label}</Link>)}
      </div>
      <p>{EQUIPMENT_PROFILES[profile].description}</p>
      <ol className="program-day-grid">
        {program.days.map((day, index) => <li key={day.name}>
          <Link href={`/program/${day.name.toLowerCase()}?equipment=${profile}`}>
            <small>Day {index + 1}</small><h2>{day.name}</h2>
            <p>{day.prescriptions.length} movements · cardio finish</p>
            <ul>{day.prescriptions.slice(0, 3).map((movement) => <li key={movement.exerciseSlug}>{movement.displayName ?? getCatalogExercise(movement.exerciseSlug).name}</li>)}</ul>
            {day.exerciseSlugs.map((slug, movementIndex) => {
              const original = other.days[index]?.exerciseSlugs[movementIndex];
              return original && original !== slug ? <p key={slug}>{getCatalogExercise(slug).name} replaces {getCatalogExercise(original).name}</p> : null;
            })}
          </Link>
        </li>)}
      </ol>
      <div className="program-example-actions"><Link className="primary-action" href="/try">Try one set</Link><Link className="secondary-action" href="/sign-in">Sign in to save your own version</Link></div>
    </section>
  </PublicShell>;
}
