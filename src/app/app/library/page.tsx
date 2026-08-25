import Link from "next/link";
import { redirect } from "next/navigation";

import { Icon } from "@/components/ui/icon";
import { getDatabase } from "@/db/client";
import { EQUIPMENT_PROFILES } from "@/domain/equipment";
import {
  listCatalogExercises,
  listOwnedCustomExercises,
} from "@/domain/exercises/library";
import { getCurrentViewer } from "@/server/auth/viewer";
import { listCustomExercises } from "@/server/repositories/custom-exercises";
import {
  getViewerProfileProgram,
  RepositoryNotFoundError,
} from "@/server/repositories/profile-program";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = Readonly<{ searchParams: Promise<{ q?: string }> }>;

async function loadLibrary() {
  const viewer = await getCurrentViewer();
  if (!viewer) return undefined;
  const database = getDatabase();
  try {
    const [profileProgram, customExercises] = await Promise.all([
      getViewerProfileProgram(database, viewer),
      listCustomExercises(database, viewer),
    ]);
    return { customExercises, profileProgram };
  } catch (error) {
    if (error instanceof RepositoryNotFoundError) return undefined;
    throw error;
  }
}

export default async function MemberLibraryPage({ searchParams }: PageProps) {
  const [{ q }, data] = await Promise.all([searchParams, loadLibrary()]);
  if (!data?.profileProgram.activeProgram) redirect("/app");
  const query = q?.trim().slice(0, 120) ?? "";
  const profileKind = data.profileProgram.equipment.profileKind;
  const profile = EQUIPMENT_PROFILES[profileKind];
  const catalogExercises = listCatalogExercises({ profile, query });
  const customExercises = listOwnedCustomExercises(data.customExercises, { profile, query });
  const resultCount = catalogExercises.length + customExercises.length;

  return (
    <section className="member-library" aria-labelledby="member-library-title">
      <header className="member-library-heading contour-surface">
        <div>
          <span className="eyebrow">Your compatible field guide</span>
          <h1 id="member-library-title">Exercise library</h1>
          <p>Canonical movements and only your private exercises, filtered for {profile.label.toLocaleLowerCase("en-US")}.</p>
        </div>
        <Link className="primary-action" href="/app/library/custom/new">Create private exercise <Icon name="arrow-right" /></Link>
      </header>

      <form className="member-library-search" method="get" role="search">
        <label htmlFor="member-library-query">Search movements</label>
        <div>
          <input
            defaultValue={query}
            id="member-library-query"
            maxLength={120}
            name="q"
            placeholder="Name, alias, equipment, or muscle"
            type="search"
          />
          <button type="submit">Search</button>
        </div>
        <p>{resultCount} compatible result{resultCount === 1 ? "" : "s"}. Change equipment from the Program screen.</p>
      </form>

      {resultCount === 0 ? (
        <div className="member-empty-sheet">
          <span className="eyebrow">No compatible match</span>
          <h2>Try a broader term.</h2>
          <p>Incompatible exercises remain in the catalog and nothing was deleted.</p>
          <Link href="/app/library">Clear search</Link>
        </div>
      ) : (
        <div className="member-library-results">
          {customExercises.length > 0 ? (
            <section aria-labelledby="private-results-title">
              <div className="section-heading">
                <div><span className="eyebrow">Owner-only</span><h2 id="private-results-title">Your private movements</h2></div>
                <Link href="/app/library/custom">Manage all</Link>
              </div>
              <ul className="member-library-list">
                {customExercises.map((exercise) => (
                  <li key={exercise.id}>
                    <Link href={`/app/library/custom/${exercise.id}`}>
                      <span><strong>{exercise.name}</strong><small>{exercise.loggingKind.replaceAll("_", " ")} · {exercise.equipmentIds.join(" + ")}</small></span>
                      <span>Private</span><Icon name="chevron-right" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section aria-labelledby="catalog-results-title">
            <div className="section-heading">
              <div><span className="eyebrow">Canonical</span><h2 id="catalog-results-title">Seeded movements</h2></div>
              {query ? <Link href="/app/library">Clear search</Link> : null}
            </div>
            {catalogExercises.length === 0 ? (
              <p className="member-library-section-empty">No canonical movement matches this compatible search.</p>
            ) : (
              <ul className="member-library-list">
                {catalogExercises.map((exercise) => (
                  <li key={exercise.slug}>
                    <Link href={`/library/${exercise.slug}?equipment=${profileKind}`}>
                      <span><strong>{exercise.name}</strong><small>{exercise.role.replace("-", " ")} · {exercise.requiredEquipment.join(" + ")}</small></span>
                      <span>Canonical</span><Icon name="chevron-right" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
