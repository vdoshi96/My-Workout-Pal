import { EQUIPMENT_LABELS, LOGGING_KIND_LABELS } from "@/components/exercises/labels";
import Link from "next/link";

import { SceneStage } from "@/components/ui/scene-stage";
import { Icon } from "@/components/ui/icon";
import { getDatabase } from "@/db/client";
import { EQUIPMENT_PROFILES } from "@/domain/equipment";
import {
  listCatalogExercises,
  listOwnedCustomExercises,
} from "@/domain/exercises/library";
import { normalizedMemberLibraryQuery } from "@/domain/exercises/member-library-query";
import { withFrom } from "@/domain/navigation/back-target";
import { MovementDemo } from "@/components/video/demo-sheet";
import { loadApprovedDemosBySlug } from "@/server/read-models/approved-demos";
import { getCurrentViewer } from "@/server/auth/viewer";
import { listCustomExercises } from "@/server/repositories/custom-exercises";
import {
  getViewerProfileProgram,
  RepositoryNotFoundError,
} from "@/server/repositories/profile-program";

export const metadata = { title: "Library" };

const ROLE_LABELS = { compound: "Big lift", accessory: "Accessory", "core-reps": "Core", "core-timed": "Core, timed" } as const;

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = Readonly<{ searchParams: Promise<{ q?: unknown }> }>;

async function loadLibrary() {
  const viewer = await getCurrentViewer();
  if (!viewer) return undefined;
  const database = getDatabase();
  try {
    const [profileProgram, customExercises] = await Promise.all([
      getViewerProfileProgram(database, viewer),
      listCustomExercises(database, viewer),
    ]);
    return { customExercises, database, profileProgram };
  } catch (error) {
    if (error instanceof RepositoryNotFoundError) return undefined;
    throw error;
  }
}

export default async function MemberLibraryPage({ searchParams }: PageProps) {
  const [{ q }, data] = await Promise.all([searchParams, loadLibrary()]);
  const hasRoutine = Boolean(data?.profileProgram.activeProgram);
  const query = normalizedMemberLibraryQuery(q);
  const profileKind = data?.profileProgram.equipment.profileKind ?? "dumbbells";
  const profile = EQUIPMENT_PROFILES[profileKind];
  const catalogExercises = listCatalogExercises({ profile, query });
  const customExercises = listOwnedCustomExercises(data?.customExercises ?? [], { profile, query });
  const resultCount = catalogExercises.length + customExercises.length;
  const demos = data ? await loadApprovedDemosBySlug(data.database, catalogExercises.map((exercise) => exercise.slug)) : {};
  const libraryHref = query ? `/app/library?${new URLSearchParams({ q: query }).toString()}` : "/app/library";

  return (
    <section className="member-library" aria-labelledby="member-library-title">
      <SceneStage scene="library" />
      <header className="pal-page-head">
        <h1 id="member-library-title">Exercise library</h1>
        <p>{hasRoutine ? `Guides, demos and your own movements, for ${profile.label.toLocaleLowerCase("en-US")}.` : "Browse dumbbell, bodyweight and bench movements. Set up your routine to choose your equipment."}</p>
        <div className="pal-actions">
          {hasRoutine ? <Link className="secondary-action" href={withFrom("/app/library/custom/new", libraryHref)}>Create private exercise <Icon name="plus" /></Link> : <Link className="primary-action" href="/app">Set up your routine <Icon name="arrow-right" /></Link>}
        </div>
      </header>

      <div className="pal-page-body">
        <form className="pal-search" method="get" role="search">
          <label htmlFor="member-library-query">Search movements</label>
          <div>
            <input defaultValue={query} id="member-library-query" maxLength={120} name="q" placeholder="Name, equipment or muscle" type="search" />
            <button className="secondary-action" type="submit">Search</button>
          </div>
          <p className="pal-note">{resultCount} compatible result{resultCount === 1 ? "" : "s"}. {hasRoutine ? <>Change equipment in <Link href="/app/settings#equipment-profile">Settings</Link>.</> : "Choose equipment when you set up your routine."}</p>
        </form>

        {resultCount === 0 ? (
          <div className="pal-empty">
            <h2>No matches. Try a different search.</h2>
            <Link href="/app/library">Clear search</Link>
          </div>
        ) : (
          <>
            {customExercises.length > 0 ? (
              <section aria-labelledby="private-results-title">
                <div className="pal-section-head">
                  <h2 id="private-results-title">Your private movements</h2>
                  <Link href={withFrom("/app/library/custom", libraryHref)}>Manage all</Link>
                </div>
                <ul className="pal-moves">
                  {customExercises.map((exercise) => (
                    <li className="pal-move pal-move--plain" id={`movement-${exercise.id}`} key={exercise.id}>
                      <div>
                        <Link className="pal-move-name" href={withFrom(`/app/library/custom/${exercise.id}`, `${libraryHref}#movement-${exercise.id}`)}>{exercise.name}</Link>
                        <small>{LOGGING_KIND_LABELS[exercise.loggingKind]} · {exercise.equipmentIds.map((id) => EQUIPMENT_LABELS[id]).join(" + ")}</small>
                      </div>
                      <span className="pal-tag">Private</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section aria-labelledby="catalog-results-title">
              <div className="pal-section-head">
                <h2 id="catalog-results-title">Movement guides</h2>
                {query ? <Link href="/app/library">Clear search</Link> : null}
              </div>
              {catalogExercises.length === 0 ? (
                <p className="pal-note">No matches. Try a different search.</p>
              ) : (
                <ul className="pal-moves">
                  {catalogExercises.map((exercise) => (
                    <li className="pal-move pal-move--plain" id={`movement-${exercise.slug}`} key={exercise.slug}>
                      <div>
                        <Link className="pal-move-name" href={withFrom(`/app/library/${exercise.slug}`, `${libraryHref}#movement-${exercise.slug}`)} prefetch={false}>{exercise.name}</Link>
                        <small>{ROLE_LABELS[exercise.role]} · {exercise.requiredEquipment.map((id) => EQUIPMENT_LABELS[id]).join(" + ")}</small>
                      </div>
                      {demos[exercise.slug] ? <MovementDemo movementName={exercise.name} videos={demos[exercise.slug]} /> : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </section>
  );
}
