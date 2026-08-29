import { readFile } from "node:fs/promises";

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterEach, describe, expect, it } from "vitest";

import type { Database } from "@/db/client";
import { schema } from "@/db/schema";
import { seedStarterDatabase } from "@/db/starter-seed";
import type { ViewerContext } from "@/server/auth/viewer";
import {
  getPersonalGuidance,
  replacePersonalGuidance,
} from "@/server/repositories/personal-guidance";

const migrationUrls = [
  "0000_initial.sql",
  "0001_account_deletion_saga.sql",
  "0002_workout_canonical_measurements.sql",
  "0003_program_collection.sql",
  "0004_personal_record_projection_checkpoint.sql",
  "0005_flexible_routine_topology.sql",
  "0007_personal_guidance.sql",
].map((name) => new URL(`../../drizzle/${name}`, import.meta.url));

const databases: PGlite[] = [];

function verifiedViewer(uid: string): ViewerContext {
  return {
    uid,
    displayName: uid,
    email: `${uid}@example.test`,
    emailVerified: true,
    provider: "password",
    authTimeSeconds: 1_000,
    eligibleForPermanentMutations: true,
  };
}

async function openDatabase(): Promise<{
  raw: PGlite;
  database: Database;
}> {
  const raw = new PGlite();
  await raw.waitReady;
  for (const migrationUrl of migrationUrls) {
    await raw.exec(await readFile(migrationUrl, "utf8"));
  }
  databases.push(raw);
  const database = drizzle(raw, { schema }) as unknown as Database;
  await seedStarterDatabase(database);
  return { raw, database };
}

async function seedViewer(raw: PGlite, uid: string): Promise<void> {
  await raw.query(
    "INSERT INTO user_profiles (firebase_uid, display_name) VALUES ($1, $2)",
    [uid, uid],
  );
}

async function firstCatalogId(raw: PGlite): Promise<string> {
  const result = await raw.query<{ id: string }>(
    "SELECT id FROM catalog_exercises ORDER BY slug LIMIT 1",
  );
  const id = result.rows[0]?.id;
  if (!id) throw new Error("Starter catalog exercise is missing");
  return id;
}

async function seedCustomExercise(
  raw: PGlite,
  ownerUid: string,
): Promise<string> {
  const result = await raw.query<{ id: string }>(
    `INSERT INTO custom_exercises (
       owner_firebase_uid, exercise_key, name, logging_kind
     ) VALUES ($1, $2, 'Private carry', 'duration')
     RETURNING id`,
    [ownerUid, `${ownerUid}-private-carry`],
  );
  const id = result.rows[0]?.id;
  if (!id) throw new Error("Custom exercise was not created");
  return id;
}

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.close()));
});

describe("personal guidance repository", () => {
  it("backfills existing private YouTube guidance when the personal store is introduced", async () => {
    const raw = new PGlite();
    await raw.waitReady;
    for (const migrationUrl of migrationUrls.slice(0, -1)) {
      await raw.exec(await readFile(migrationUrl, "utf8"));
    }
    databases.push(raw);
    await seedViewer(raw, "alice");
    const customId = await seedCustomExercise(raw, "alice");
    await raw.query(
      `INSERT INTO custom_exercise_videos (
         owner_firebase_uid, custom_exercise_id, youtube_video_id, display_order
       ) VALUES ($1, $2, 'AbCdEfGhI01', 1)`,
      ["alice", customId],
    );

    await raw.exec(await readFile(migrationUrls.at(-1)!, "utf8"));

    const migrated = await raw.query<{
      custom_exercise_id: string;
      kind: string;
      normalized_url: string;
      owner_firebase_uid: string;
    }>(
      `SELECT owner_firebase_uid, custom_exercise_id, kind, normalized_url
       FROM personal_guidance_links`,
    );
    expect(migrated.rows).toEqual([
      {
        owner_firebase_uid: "alice",
        custom_exercise_id: customId,
        kind: "youtube",
        normalized_url: "https://www.youtube.com/watch?v=AbCdEfGhI01",
      },
    ]);
  });

  it("replaces catalog guidance with normalized owner-scoped links and replays idempotently", async () => {
    const { raw, database } = await openDatabase();
    const alice = verifiedViewer("alice");
    await seedViewer(raw, alice.uid);
    const catalogId = await firstCatalogId(raw);

    const first = await replacePersonalGuidance(database, alice, {
      source: { kind: "catalog", id: catalogId },
      links: [
        "https://youtu.be/AbCdEfGhI01?t=20",
        "https://EXAMPLE.com/how-to/../guide?move=press",
      ],
      idempotencyKey: "personal-guidance-catalog-1",
    });
    const replay = await replacePersonalGuidance(database, alice, {
      source: { kind: "catalog", id: catalogId },
      links: [
        "https://youtu.be/AbCdEfGhI01?t=20",
        "https://EXAMPLE.com/how-to/../guide?move=press",
      ],
      idempotencyKey: "personal-guidance-catalog-1",
    });

    expect(first).toEqual({
      duplicate: false,
      guidance: {
        source: { kind: "catalog", id: catalogId },
        links: [
          {
            kind: "youtube",
            canonicalUrl: "https://www.youtube.com/watch?v=AbCdEfGhI01",
            videoId: "AbCdEfGhI01",
            embedUrl: "https://www.youtube-nocookie.com/embed/AbCdEfGhI01",
          },
          {
            kind: "external",
            canonicalUrl: "https://example.com/guide?move=press",
          },
        ],
      },
    });
    expect(replay).toEqual({ ...first, duplicate: true });
    await expect(
      getPersonalGuidance(database, alice, { kind: "catalog", id: catalogId }),
    ).resolves.toEqual(first.guidance);
  });

  it("keeps catalog links isolated by owner and rejects idempotency-key reuse", async () => {
    const { raw, database } = await openDatabase();
    const alice = verifiedViewer("alice");
    const bob = verifiedViewer("bob");
    await seedViewer(raw, alice.uid);
    await seedViewer(raw, bob.uid);
    const catalogId = await firstCatalogId(raw);

    await replacePersonalGuidance(database, alice, {
      source: { kind: "catalog", id: catalogId },
      links: ["https://example.com/alice"],
      idempotencyKey: "shared-looking-key",
    });
    await replacePersonalGuidance(database, bob, {
      source: { kind: "catalog", id: catalogId },
      links: ["https://example.com/bob"],
      idempotencyKey: "shared-looking-key",
    });

    await expect(
      getPersonalGuidance(database, alice, { kind: "catalog", id: catalogId }),
    ).resolves.toMatchObject({ links: [{ canonicalUrl: "https://example.com/alice" }] });
    await expect(
      getPersonalGuidance(database, bob, { kind: "catalog", id: catalogId }),
    ).resolves.toMatchObject({ links: [{ canonicalUrl: "https://example.com/bob" }] });
    await expect(
      replacePersonalGuidance(database, alice, {
        source: { kind: "catalog", id: catalogId },
        links: ["https://example.com/different"],
        idempotencyKey: "shared-looking-key",
      }),
    ).rejects.toMatchObject({ code: "idempotency_conflict", status: 409 });
  });

  it("hides foreign custom IDs and never accepts client ownership", async () => {
    const { raw, database } = await openDatabase();
    const alice = verifiedViewer("alice");
    const bob = verifiedViewer("bob");
    await seedViewer(raw, alice.uid);
    await seedViewer(raw, bob.uid);
    const aliceCustomId = await seedCustomExercise(raw, alice.uid);

    await expect(
      replacePersonalGuidance(database, bob, {
        source: { kind: "custom", id: aliceCustomId },
        links: ["https://example.com/private"],
        idempotencyKey: "bob-foreign-custom",
      }),
    ).rejects.toMatchObject({ code: "not_found", status: 404 });
    await expect(
      getPersonalGuidance(database, bob, { kind: "custom", id: aliceCustomId }),
    ).rejects.toMatchObject({ code: "not_found", status: 404 });

    const count = await raw.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM personal_guidance_links",
    );
    expect(count.rows).toEqual([{ count: 0 }]);
  });

  it("requires a verified mutation viewer and supports an explicit empty replacement", async () => {
    const { raw, database } = await openDatabase();
    const alice = verifiedViewer("alice");
    await seedViewer(raw, alice.uid);
    const customId = await seedCustomExercise(raw, alice.uid);

    await expect(
      replacePersonalGuidance(
        database,
        { ...alice, emailVerified: false, eligibleForPermanentMutations: false },
        {
          source: { kind: "custom", id: customId },
          links: ["https://example.com/guide"],
          idempotencyKey: "unverified-guidance",
        },
      ),
    ).rejects.toMatchObject({ code: "verification_required", status: 403 });

    await replacePersonalGuidance(database, alice, {
      source: { kind: "custom", id: customId },
      links: ["https://example.com/guide"],
      idempotencyKey: "custom-guidance-add",
    });
    const cleared = await replacePersonalGuidance(database, alice, {
      source: { kind: "custom", id: customId },
      links: [],
      idempotencyKey: "custom-guidance-clear",
    });
    expect(cleared.guidance.links).toEqual([]);
    await expect(
      getPersonalGuidance(database, alice, { kind: "custom", id: customId }),
    ).resolves.toEqual(cleared.guidance);
  });

  it("enforces source XOR, owner-scoped custom references, and ordered bounds in SQL", async () => {
    const { raw } = await openDatabase();
    await seedViewer(raw, "alice");
    await seedViewer(raw, "bob");
    const catalogId = await firstCatalogId(raw);
    const aliceCustomId = await seedCustomExercise(raw, "alice");

    await expect(
      raw.query(
        `INSERT INTO personal_guidance_links (
           owner_firebase_uid, catalog_exercise_id, custom_exercise_id,
           kind, normalized_url, display_order
         ) VALUES ('alice', $1, $2, 'external', 'https://example.com', 1)`,
        [catalogId, aliceCustomId],
      ),
    ).rejects.toThrow();
    await expect(
      raw.query(
        `INSERT INTO personal_guidance_links (
           owner_firebase_uid, custom_exercise_id, kind,
           normalized_url, display_order
         ) VALUES ('bob', $1, 'external', 'https://example.com', 1)`,
        [aliceCustomId],
      ),
    ).rejects.toThrow();
    await expect(
      raw.query(
        `INSERT INTO personal_guidance_links (
           owner_firebase_uid, catalog_exercise_id, kind,
           normalized_url, display_order
         ) VALUES ('alice', $1, 'external', 'https://example.com', 3)`,
        [catalogId],
      ),
    ).rejects.toThrow();
  });
});
