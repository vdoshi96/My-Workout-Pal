import { readFile } from "node:fs/promises";

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterEach, describe, expect, it } from "vitest";

import type { Database } from "@/db/client";
import { schema } from "@/db/schema";
import { seedStarterDatabase } from "@/db/starter-seed";
import { buildStarterDatabaseRows } from "@/domain/seed/starter-database-rows";
import { buildDefaultRequiredVideoVariations } from "@/domain/youtube/seed-validation";
import type { CuratedVideoSeed } from "@/domain/youtube/types";
import {
  getApprovedCuratedVideoPairBySlug,
  listApprovedCuratedVideoPairsByExerciseIds,
} from "@/server/repositories/curated-videos";

const migrationUrl = new URL("../../drizzle/0000_initial.sql", import.meta.url);
const openDatabases: PGlite[] = [];

async function openDatabase(): Promise<{ raw: PGlite; database: Database }> {
  const raw = new PGlite();
  await raw.waitReady;
  await raw.exec(await readFile(migrationUrl, "utf8"));
  openDatabases.push(raw);
  return { raw, database: drizzle(raw, { schema }) as unknown as Database };
}

afterEach(async () => {
  await Promise.all(openDatabases.splice(0).map((database) => database.close()));
});

function completeRequiredSeed(): readonly CuratedVideoSeed[] {
  return buildDefaultRequiredVideoVariations().flatMap(({ canonicalExerciseSlug }, index) => [
    {
      canonicalExerciseSlug,
      variationId: "canonical",
      videoId: `A${String(index * 2).padStart(10, "0")}`,
      displayOrder: 1,
      title: `${canonicalExerciseSlug} primary demonstration`,
      channelTitle: "Primary coach",
      approvalState: "approved",
      reviewer: "Codex GPT-5.6 Sol",
      reviewedAt: "2026-08-26T20:00:00.000Z",
      fullWatchConfirmed: true,
    },
    {
      canonicalExerciseSlug,
      variationId: "canonical",
      videoId: `B${String(index * 2 + 1).padStart(10, "0")}`,
      displayOrder: 2,
      title: `${canonicalExerciseSlug} second demonstration`,
      channelTitle: "Second coach",
      approvalState: "approved",
      reviewer: "Codex GPT-5.6 Sol",
      reviewedAt: "2026-08-26T20:01:00.000Z",
      fullWatchConfirmed: true,
    },
  ] satisfies readonly CuratedVideoSeed[]);
}

describe("curated video persistence and reads", () => {
  it("seeds and replays the exact approved catalog pairs", async () => {
    const { raw, database } = await openDatabase();
    const rows = buildStarterDatabaseRows(undefined, completeRequiredSeed());

    const first = await seedStarterDatabase(database, rows);
    const second = await seedStarterDatabase(database, rows);

    expect(first.approvedVideos).toBe(54);
    expect(second).toEqual(first);
    await expect(raw.query<{ count: number }>("SELECT count(*)::int AS count FROM curated_videos"))
      .resolves.toMatchObject({ rows: [{ count: 54 }] });
  }, 15_000);

  it("keeps the surviving existing demonstration when an alternate is unavailable", async () => {
    const { raw, database } = await openDatabase();
    const rows = buildStarterDatabaseRows(undefined, completeRequiredSeed());
    await seedStarterDatabase(database, rows);

    const pair = await getApprovedCuratedVideoPairBySlug(database, "dumbbell-bench-press");
    expect(pair?.map(({ displayOrder, title }) => ({ displayOrder, title }))).toEqual([
      { displayOrder: 1, title: "dumbbell-bench-press primary demonstration" },
      { displayOrder: 2, title: "dumbbell-bench-press second demonstration" },
    ]);

    const benchExerciseId = rows.catalogExercises.find(({ slug }) => slug === "dumbbell-bench-press")!.id;
    const pairsById = await listApprovedCuratedVideoPairsByExerciseIds(database, [benchExerciseId]);
    expect(pairsById[benchExerciseId]?.map(({ videoId }) => videoId)).toEqual(pair?.map(({ videoId }) => videoId));

    await raw.exec(`DELETE FROM curated_videos WHERE exercise_id = '${benchExerciseId}' AND display_order = 2;`);
    await expect(getApprovedCuratedVideoPairBySlug(database, "dumbbell-bench-press")).resolves.toHaveLength(1);
  }, 15_000);

  it("detects published metadata drift instead of silently overwriting it", async () => {
    const { raw, database } = await openDatabase();
    const rows = buildStarterDatabaseRows(undefined, completeRequiredSeed());
    await seedStarterDatabase(database, rows);
    const changed = rows.curatedVideos[0]!;
    await raw.exec(`UPDATE curated_videos SET title = 'Unreviewed replacement' WHERE id = '${changed.id}';`);

    await expect(seedStarterDatabase(database, rows)).rejects.toThrow(/curated_videos.*drift/i);
    await expect(raw.query<{ title: string }>(`SELECT title FROM curated_videos WHERE id = '${changed.id}';`))
      .resolves.toMatchObject({ rows: [{ title: "Unreviewed replacement" }] });
  }, 15_000);
});
