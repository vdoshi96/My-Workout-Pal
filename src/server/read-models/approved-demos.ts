import { getDatabase, type Database } from "@/db/client";
import { CATALOG_EXERCISES } from "@/domain/exercises/catalog";
import { deterministicSeedUuid } from "@/domain/seed/identity";
import type { CuratedVideos } from "@/domain/youtube/embed";
import { listApprovedCuratedVideoPairsByExerciseIds } from "@/server/repositories/curated-videos";

/**
 * Approved demo pairs for listed catalog movements, keyed by slug. Only pairs the
 * curation policy approved (and a person watched in full) come back; a read
 * failure means "no demo yet" rather than a broken page.
 */
export async function loadApprovedDemosBySlug(
  database: Database,
  slugs: readonly string[],
): Promise<Readonly<Record<string, CuratedVideos>>> {
  const slugById = new Map<string, string>();
  for (const slug of new Set(slugs)) {
    if (CATALOG_EXERCISES[slug]) slugById.set(deterministicSeedUuid("catalog-exercise", slug), slug);
  }
  if (slugById.size === 0) return {};
  const pairs = await listApprovedCuratedVideoPairsByExerciseIds(database, [...slugById.keys()]).catch(() => ({}));
  const bySlug: Record<string, CuratedVideos> = {};
  for (const [exerciseId, videos] of Object.entries(pairs)) {
    const slug = slugById.get(exerciseId);
    if (slug) bySlug[slug] = videos;
  }
  return bySlug;
}

/** Public pages read the same approved pairs; a missing database means no demos. */
export async function loadPublicApprovedDemosBySlug(
  slugs: readonly string[],
): Promise<Readonly<Record<string, CuratedVideos>>> {
  try {
    return await loadApprovedDemosBySlug(getDatabase(), slugs);
  } catch {
    return {};
  }
}

/** Guide destinations for the runner's "Full guide" link, keyed by exercise id. */
export function memberGuideHrefsByExerciseId(
  exerciseIds: readonly string[],
  customExerciseIds: readonly string[],
): Readonly<Record<string, string>> {
  const wanted = new Set(exerciseIds);
  const custom = new Set(customExerciseIds);
  const hrefs: Record<string, string> = {};
  for (const slug of Object.keys(CATALOG_EXERCISES)) {
    const id = deterministicSeedUuid("catalog-exercise", slug);
    if (wanted.has(id)) hrefs[id] = `/app/library/${slug}`;
  }
  for (const id of wanted) {
    if (!hrefs[id] && custom.has(id)) hrefs[id] = `/app/library/custom/${id}`;
  }
  return hrefs;
}
