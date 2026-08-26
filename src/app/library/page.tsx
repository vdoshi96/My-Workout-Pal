import type { Metadata } from "next";
import Link from "next/link";

import { PublicShell } from "@/components/layout/public-shell";
import { Icon } from "@/components/ui/icon";
import { EQUIPMENT_PROFILES, type EquipmentProfileKind } from "@/domain/equipment";
import { listCatalogExercises } from "@/domain/exercises/library";
import { exerciseDetailHref } from "@/domain/navigation/public-exercise-return";

export const metadata: Metadata = { title: "Exercise library" };

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

  return (
    <PublicShell current="library">
      <section className="public-hero contour-surface">
        <div>
          <span className="eyebrow">Canonical field guide</span>
          <h1>Exercise library</h1>
          <p>Search the seeded movements, then filter out anything your current route cannot perform.</p>
        </div>
        <div className="guest-stamp">Guest browsing · not saved</div>
      </section>

      <section className="library-tools" aria-labelledby="library-tools-heading">
        <div>
          <h2 id="library-tools-heading">Compatible equipment</h2>
          <div className="profile-links" aria-label="Equipment filter">
            {(Object.keys(EQUIPMENT_PROFILES) as EquipmentProfileKind[]).map((profileId) => (
              <Link
                aria-current={profile === profileId ? "true" : undefined}
                href={profileHref(profileId, search)}
                key={profileId}
              >
                <Icon name="dumbbell" />
                {EQUIPMENT_PROFILES[profileId].label}
              </Link>
            ))}
          </div>
          <p>{EQUIPMENT_PROFILES[profile].description}. Incompatible catalog records are hidden.</p>
        </div>
        <form className="library-search" method="get">
          <input name="equipment" type="hidden" value={profile} />
          <label htmlFor="library-query">Search movements</label>
          <div>
            <input
              defaultValue={search}
              id="library-query"
              name="q"
              placeholder="Try row, plank, or squat"
              type="search"
            />
            <button type="submit">Search</button>
          </div>
        </form>
      </section>

      <section className="library-results" aria-labelledby="library-results-heading">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{EQUIPMENT_PROFILES[profile].label}</span>
            <h2 id="library-results-heading">{exercises.length} compatible movements</h2>
          </div>
          {search ? <Link href={profileHref(profile, "")}>Clear search</Link> : null}
        </div>
        {exercises.length === 0 ? (
          <div className="empty-sheet">
            <h3>No compatible match</h3>
            <p>Try a broader movement name or switch equipment. Nothing was removed from the catalog.</p>
          </div>
        ) : (
          <ol className="library-list">
            {exercises.map((exercise, index) => (
              <li key={exercise.slug}>
                <Link
                  href={exerciseDetailHref(exercise.slug, {
                    equipment: profile,
                    returnTo: profileHref(profile, search),
                  })}
                  prefetch={false}
                >
                  <span className="catalog-number">{String(index + 1).padStart(2, "0")}</span>
                  <span>
                    <strong>{exercise.name}</strong>
                    <small>{exercise.role.replace("-", " ")} · {exercise.requiredEquipment.join(" + ")}</small>
                  </span>
                  <Icon name="chevron-right" />
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    </PublicShell>
  );
}
