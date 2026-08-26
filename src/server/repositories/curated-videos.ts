import { and, asc, eq, inArray } from "drizzle-orm";

import type { Database } from "@/db/client";
import { catalogExercises, curatedVideos } from "@/db/schema";
import {
  createCuratedVideoPair,
  type CuratedVideoPair,
} from "@/domain/youtube/embed";
import { DEFAULT_YOUTUBE_VARIATION_ID } from "@/domain/youtube/targets";
import type { CuratedVideoSeed } from "@/domain/youtube/types";

type ApprovedVideoRow = Readonly<{
  exerciseId: string;
  canonicalExerciseSlug: string;
  variationId: string;
  videoId: string;
  displayOrder: number | null;
  title: string;
  channelTitle: string;
  watchedInFullAt: Date | null;
  approvedAt: Date | null;
  approvedBy: string | null;
}>;

function toSeed(row: ApprovedVideoRow): CuratedVideoSeed | undefined {
  if (
    (row.displayOrder !== 1 && row.displayOrder !== 2)
    || !row.watchedInFullAt
    || !row.approvedAt
    || !row.approvedBy?.trim()
  ) {
    return undefined;
  }
  return {
    canonicalExerciseSlug: row.canonicalExerciseSlug,
    variationId: row.variationId,
    videoId: row.videoId,
    displayOrder: row.displayOrder,
    title: row.title,
    channelTitle: row.channelTitle,
    approvalState: "approved",
    reviewer: row.approvedBy,
    reviewedAt: row.approvedAt.toISOString(),
    fullWatchConfirmed: true,
  };
}

function groupExactPairs(
  rows: readonly ApprovedVideoRow[],
): Readonly<Record<string, CuratedVideoPair>> {
  const grouped = new Map<string, CuratedVideoSeed[]>();
  for (const row of rows) {
    const seed = toSeed(row);
    if (!seed) continue;
    const group = grouped.get(row.exerciseId) ?? [];
    group.push(seed);
    grouped.set(row.exerciseId, group);
  }
  const pairs: Record<string, CuratedVideoPair> = {};
  for (const [exerciseId, videos] of grouped) {
    try {
      pairs[exerciseId] = createCuratedVideoPair(videos);
    } catch {
      // A partial or drifted database mapping is unavailable, never a partial player.
    }
  }
  return pairs;
}

function selectApprovedRows(database: Database) {
  return database
    .select({
      exerciseId: curatedVideos.exerciseId,
      canonicalExerciseSlug: catalogExercises.slug,
      variationId: curatedVideos.variationId,
      videoId: curatedVideos.youtubeVideoId,
      displayOrder: curatedVideos.displayOrder,
      title: curatedVideos.title,
      channelTitle: curatedVideos.channelTitle,
      watchedInFullAt: curatedVideos.watchedInFullAt,
      approvedAt: curatedVideos.approvedAt,
      approvedBy: curatedVideos.approvedBy,
    })
    .from(curatedVideos)
    .innerJoin(catalogExercises, eq(catalogExercises.id, curatedVideos.exerciseId));
}

export async function listApprovedCuratedVideoPairsByExerciseIds(
  database: Database,
  exerciseIds: readonly string[],
): Promise<Readonly<Record<string, CuratedVideoPair>>> {
  const uniqueIds = [...new Set(exerciseIds)];
  if (uniqueIds.length === 0) return {};
  const rows = await selectApprovedRows(database)
    .where(and(
      inArray(curatedVideos.exerciseId, uniqueIds),
      eq(curatedVideos.variationId, DEFAULT_YOUTUBE_VARIATION_ID),
      eq(curatedVideos.approvalStatus, "approved"),
    ))
    .orderBy(asc(curatedVideos.exerciseId), asc(curatedVideos.displayOrder));
  return groupExactPairs(rows);
}

export async function getApprovedCuratedVideoPairBySlug(
  database: Database,
  canonicalExerciseSlug: string,
): Promise<CuratedVideoPair | undefined> {
  const rows = await selectApprovedRows(database)
    .where(and(
      eq(catalogExercises.slug, canonicalExerciseSlug),
      eq(curatedVideos.variationId, DEFAULT_YOUTUBE_VARIATION_ID),
      eq(curatedVideos.approvalStatus, "approved"),
    ))
    .orderBy(asc(curatedVideos.displayOrder));
  const exerciseId = rows[0]?.exerciseId;
  return exerciseId ? groupExactPairs(rows)[exerciseId] : undefined;
}
