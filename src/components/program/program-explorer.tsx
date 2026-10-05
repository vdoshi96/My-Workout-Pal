import Link from "next/link";
import { PublicShell } from "@/components/layout/public-shell";
import { Icon } from "@/components/ui/icon";
import { SceneStage } from "@/components/ui/scene-stage";
import { EQUIPMENT_PROFILES, type EquipmentProfileKind } from "@/domain/equipment";
import { getCatalogExercise } from "@/domain/exercises/catalog";
import type { Program } from "@/domain/programs/types";

type Props = Readonly<{ dumbbellProgram: Program; barbellProgram: Program; initialProfile: EquipmentProfileKind }>;

export function ProgramExplorer({ dumbbellProgram, barbellProgram, initialProfile: profile }: Props) {
  const program = profile === "dumbbells" ? dumbbellProgram : barbellProgram;
  const other = profile === "dumbbells" ? barbellProgram : dumbbellProgram;
  return <PublicShell current="program">
    <SceneStage scene="routine" />
    <header className="pal-page-head">
      <h1>Five-day example routine</h1>
      <p>Strength, core and an optional walk or run across five days. Make it yours once you sign in.</p>
    </header>
    <div className="pal-page-body">
      <section aria-labelledby="equipment-heading" className="pal-equipment-pick">
        <h2 id="equipment-heading">What do you have to work with?</h2>
        <div className="profile-links pal-segmented" role="group" aria-label="Equipment preview">
          {(Object.keys(EQUIPMENT_PROFILES) as EquipmentProfileKind[]).map((id) => <Link key={id} href={`/program?equipment=${id}`} aria-current={profile === id ? "true" : undefined}>{profile === id ? <Icon name="check" /> : null}{EQUIPMENT_PROFILES[id].label}</Link>)}
        </div>
        <p className="pal-note">{EQUIPMENT_PROFILES[profile].description}</p>
      </section>
      <section aria-labelledby="days-heading">
        <h2 id="days-heading">Your five days</h2>
        <ol className="pal-list pal-day-list">
          {program.days.map((day, index) => <li key={day.name}>
            <Link href={`/program/${day.name.toLowerCase()}?equipment=${profile}`}>
              <span aria-hidden="true" className="pal-move-number">{index + 1}</span>
              <span>
                <small>Day {index + 1}</small>
                <strong>{day.name}</strong>
                <small>{day.prescriptions.length} movements · {day.prescriptions.slice(0, 3).map((movement) => movement.displayName ?? getCatalogExercise(movement.exerciseSlug).name).join(", ")}…</small>
                {day.exerciseSlugs.map((slug, movementIndex) => {
                  const original = other.days[index]?.exerciseSlugs[movementIndex];
                  return original && original !== slug ? <small className="pal-swap" key={slug}>{getCatalogExercise(slug).name} replaces {getCatalogExercise(original).name}</small> : null;
                })}
              </span>
              <Icon name="chevron-right" />
            </Link>
          </li>)}
        </ol>
      </section>
      <div className="pal-actions"><Link className="primary-action" href="/try">Take a test drive <Icon name="arrow-right" /></Link><Link className="secondary-action" href="/sign-in">Sign in to save your own version</Link></div>
    </div>
  </PublicShell>;
}
