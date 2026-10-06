import { EQUIPMENT_LABELS } from "@/components/exercises/labels";
import type { Metadata } from "next";
import Link from "next/link";

import { PublicShell } from "@/components/layout/public-shell";
import { SceneStage } from "@/components/ui/scene-stage";
import { Icon } from "@/components/ui/icon";
import { EQUIPMENT_PROFILES, type EquipmentProfileKind } from "@/domain/equipment";
import { listCatalogExercises } from "@/domain/exercises/library";
import { withFrom } from "@/domain/navigation/back-target";
import { MovementDemo } from "@/components/video/demo-sheet";
import { loadPublicApprovedDemosBySlug } from "@/server/read-models/approved-demos";

export const metadata: Metadata = { title: "Exercise library" };

const ROLE_LABELS = { compound: "Big lift", accessory: "Accessory", "core-reps": "Core", "core-timed": "Core, timed" } as const;

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams: Promise<{
    equipment?: string | string[];
    q?: string | string[];
  }>;
};

function profileHref(profile: EquipmentProfileKind, query: string): string {
  const params = new URLSearchParams({ equipment: profile });
  if (query) params.set("q", query);
  return `/library?${params.toString()}`;
}

export default async function LibraryPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const profile: EquipmentProfileKind = query.equipment === "barbell" ? "barbell" : "dumbbells";
  const search = typeof query.q === "string" ? query.q.trim() : "";
  const exercises = listCatalogExercises({ profile: EQUIPMENT_PROFILES[profile], query: search });
  const demos = await loadPublicApprovedDemosBySlug(exercises.map((exercise) => exercise.slug));

  return (
    <PublicShell current="library">
      <SceneStage scene="library" />
      <header className="pal-page-head">
        <h1>Exercise library</h1>
        <p>Find a movement, watch a quick demo and see how to do it.</p>
      </header>

      <div className="pal-page-body">
        <section className="pal-library-tools" aria-labelledby="library-tools-heading">
          <h2 id="library-tools-heading">Your equipment</h2>
          <div className="profile-links pal-segmented" role="group" aria-label="Equipment filter">
            {(Object.keys(EQUIPMENT_PROFILES) as EquipmentProfileKind[]).map((profileId) => (
              <Link
                aria-current={profile === profileId ? "true" : undefined}
                href={profileHref(profileId, search)}
                key={profileId}
              >
                {profile === profileId ? <Icon name="check" /> : <Icon name="dumbbell" />}
                {EQUIPMENT_PROFILES[profileId].label}
              </Link>
            ))}
          </div>
          <form className="pal-search" role="search" method="get">
            <input name="equipment" type="hidden" value={profile} />
            <label htmlFor="library-query">Search movements</label>
            <div>
              <input defaultValue={search} id="library-query" name="q" placeholder="Try row, plank or squat" type="search" />
              <button className="secondary-action" type="submit">Search</button>
            </div>
          </form>
        </section>

        <section aria-labelledby="library-results-heading">
          <div className="pal-section-head">
            <h2 id="library-results-heading">{exercises.length} movements for {EQUIPMENT_PROFILES[profile].label.toLowerCase()}</h2>
            {search ? <Link href={profileHref(profile, "")}>Clear search</Link> : null}
          </div>
          {exercises.length === 0 ? (
            <div className="pal-empty">
              <h3>No match yet</h3>
              <p>Try a different name or switch equipment.</p>
            </div>
          ) : (
            <ul className="pal-moves pal-moves--grid">
              {exercises.map((exercise) => (
                <li className="pal-move pal-move--plain" id={`movement-${exercise.slug}`} key={exercise.slug}>
                  <div>
                    <Link
                      className="pal-move-name"
                      href={withFrom(
                        `/library/${exercise.slug}?equipment=${profile}`,
                        `${profileHref(profile, search)}#movement-${exercise.slug}`,
                      )}
                      prefetch={false}
                    >
                      {exercise.name}
                    </Link>
                    <small>{ROLE_LABELS[exercise.role]} · {exercise.requiredEquipment.map((id) => EQUIPMENT_LABELS[id]).join(" + ")}</small>
                  </div>
                  {demos[exercise.slug] ? <MovementDemo movementName={exercise.name} videos={demos[exercise.slug]} /> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PublicShell>
  );
}
