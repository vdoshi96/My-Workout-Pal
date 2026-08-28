import { createHash } from "node:crypto";

import { and, asc, eq } from "drizzle-orm";

import type { Database } from "@/db/client";
import {
  catalogExercises,
  customExercises,
  idempotencyKeys,
  personalGuidanceLinks,
} from "@/db/schema";
import {
  normalizePersonalGuidanceLinks,
  type PersonalGuidanceLink,
} from "@/domain/exercises/personal-guidance";
import {
  movementSourceSchema,
  type MovementSource,
} from "@/domain/exercises/movement-chooser-contract";
import type { ViewerContext } from "@/server/auth/viewer";

export type PersonalGuidanceRepositoryCode =
  | "verification_required"
  | "not_found"
  | "idempotency_conflict"
  | "stored_result_invalid";

export class PersonalGuidanceRepositoryError extends Error {
  readonly code: PersonalGuidanceRepositoryCode;
  readonly status: number;

  constructor(
    code: PersonalGuidanceRepositoryCode,
    message: string,
    status: number,
  ) {
    super(message);
    this.name = "PersonalGuidanceRepositoryError";
    this.code = code;
    this.status = status;
  }
}

export type PersonalGuidanceView = Readonly<{
  source: MovementSource;
  links: readonly PersonalGuidanceLink[];
}>;

export type ReplacePersonalGuidanceInput = Readonly<{
  source: MovementSource;
  links: readonly string[];
  idempotencyKey: string;
}>;

export type ReplacePersonalGuidanceResult = Readonly<{
  guidance: PersonalGuidanceView;
  duplicate: boolean;
}>;

function assertEligible(viewer: ViewerContext): void {
  if (!viewer.eligibleForPermanentMutations) {
    throw new PersonalGuidanceRepositoryError(
      "verification_required",
      "Verify your email before changing permanent account data.",
      403,
    );
  }
}

function assertIdempotencyKey(value: string): string {
  if (
    typeof value !== "string" ||
    value.trim().length === 0 ||
    value.length > 180
  ) {
    throw new RangeError("idempotencyKey must contain 1 to 180 characters.");
  }
  return value;
}

function requestHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function notFound(): PersonalGuidanceRepositoryError {
  return new PersonalGuidanceRepositoryError(
    "not_found",
    "This movement is not available.",
    404,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseStoredGuidance(value: unknown): PersonalGuidanceView {
  if (!isRecord(value)) {
    throw new PersonalGuidanceRepositoryError(
      "stored_result_invalid",
      "The earlier operation result is unavailable.",
      409,
    );
  }
  const sourceResult = movementSourceSchema.safeParse(value["source"]);
  const links = value["links"];
  if (!sourceResult.success || !Array.isArray(links)) {
    throw new PersonalGuidanceRepositoryError(
      "stored_result_invalid",
      "The earlier operation result is unavailable.",
      409,
    );
  }
  const normalized = normalizePersonalGuidanceLinks(
    links.map((link) =>
      isRecord(link) && typeof link["canonicalUrl"] === "string"
        ? link["canonicalUrl"]
        : link,
    ),
  );
  return Object.freeze({
    source: Object.freeze(sourceResult.data),
    links: Object.freeze([...normalized]),
  });
}

async function assertSourceAvailable(
  database: Database,
  ownerUid: string,
  source: MovementSource,
): Promise<void> {
  if (source.kind === "catalog") {
    const rows = await database
      .select({ id: catalogExercises.id })
      .from(catalogExercises)
      .where(eq(catalogExercises.id, source.id))
      .limit(1);
    if (!rows[0]) throw notFound();
    return;
  }
  const rows = await database
    .select({ id: customExercises.id })
    .from(customExercises)
    .where(
      and(
        eq(customExercises.ownerFirebaseUid, ownerUid),
        eq(customExercises.id, source.id),
      ),
    )
    .limit(1);
  if (!rows[0]) throw notFound();
}

function sourcePredicate(ownerUid: string, source: MovementSource) {
  return and(
    eq(personalGuidanceLinks.ownerFirebaseUid, ownerUid),
    source.kind === "catalog"
      ? eq(personalGuidanceLinks.catalogExerciseId, source.id)
      : eq(personalGuidanceLinks.customExerciseId, source.id),
  );
}

async function loadGuidanceRows(
  database: Database,
  ownerUid: string,
  source: MovementSource,
): Promise<readonly PersonalGuidanceLink[]> {
  const rows = await database
    .select({
      kind: personalGuidanceLinks.kind,
      normalizedUrl: personalGuidanceLinks.normalizedUrl,
      youtubeVideoId: personalGuidanceLinks.youtubeVideoId,
    })
    .from(personalGuidanceLinks)
    .where(sourcePredicate(ownerUid, source))
    .orderBy(asc(personalGuidanceLinks.displayOrder));

  return Object.freeze(
    rows.map((row): PersonalGuidanceLink => {
      if (row.kind === "youtube" && row.youtubeVideoId) {
        return Object.freeze({
          kind: "youtube",
          canonicalUrl: `https://www.youtube.com/watch?v=${row.youtubeVideoId}`,
          videoId: row.youtubeVideoId,
          embedUrl: `https://www.youtube-nocookie.com/embed/${row.youtubeVideoId}`,
        });
      }
      if (row.kind === "external" && row.youtubeVideoId === null) {
        return Object.freeze({
          kind: "external",
          canonicalUrl: row.normalizedUrl,
        });
      }
      throw new PersonalGuidanceRepositoryError(
        "stored_result_invalid",
        "Saved personal guidance is invalid.",
        409,
      );
    }),
  );
}

export async function getPersonalGuidance(
  database: Database,
  viewer: ViewerContext,
  sourceInput: MovementSource,
): Promise<PersonalGuidanceView> {
  const source = Object.freeze(movementSourceSchema.parse(sourceInput));
  await assertSourceAvailable(database, viewer.uid, source);
  const links = await loadGuidanceRows(database, viewer.uid, source);
  return Object.freeze({ source, links });
}

export async function replacePersonalGuidance(
  database: Database,
  viewer: ViewerContext,
  input: ReplacePersonalGuidanceInput,
): Promise<ReplacePersonalGuidanceResult> {
  assertEligible(viewer);
  const source = Object.freeze(movementSourceSchema.parse(input.source));
  const links = normalizePersonalGuidanceLinks(input.links);
  const idempotencyKey = assertIdempotencyKey(input.idempotencyKey);
  const operation = "personal_guidance.replace";
  const hash = requestHash({ operation, source, links });

  return database.transaction(async (transaction) => {
    const tx = transaction as unknown as Database;
    const inserted = await tx
      .insert(idempotencyKeys)
      .values({
        ownerFirebaseUid: viewer.uid,
        idempotencyKey,
        operation,
        requestHash: hash,
        resultPayload: { pending: true },
      })
      .onConflictDoNothing()
      .returning({ id: idempotencyKeys.id });

    if (inserted.length === 0) {
      const existing = await tx
        .select({
          operation: idempotencyKeys.operation,
          requestHash: idempotencyKeys.requestHash,
          resultPayload: idempotencyKeys.resultPayload,
        })
        .from(idempotencyKeys)
        .where(
          and(
            eq(idempotencyKeys.ownerFirebaseUid, viewer.uid),
            eq(idempotencyKeys.idempotencyKey, idempotencyKey),
          ),
        )
        .limit(1);
      const row = existing[0];
      if (!row || row.operation !== operation || row.requestHash !== hash) {
        throw new PersonalGuidanceRepositoryError(
          "idempotency_conflict",
          "This operation key was already used for different input.",
          409,
        );
      }
      return {
        guidance: parseStoredGuidance(row.resultPayload["guidance"]),
        duplicate: true,
      };
    }

    await assertSourceAvailable(tx, viewer.uid, source);
    await tx.delete(personalGuidanceLinks).where(sourcePredicate(viewer.uid, source));
    if (links.length > 0) {
      await tx.insert(personalGuidanceLinks).values(
        links.map((link, index) => ({
          ownerFirebaseUid: viewer.uid,
          catalogExerciseId: source.kind === "catalog" ? source.id : null,
          customExerciseId: source.kind === "custom" ? source.id : null,
          kind: link.kind,
          normalizedUrl: link.canonicalUrl,
          youtubeVideoId: link.kind === "youtube" ? link.videoId : null,
          displayOrder: index + 1,
        })),
      );
    }

    const guidance = Object.freeze({
      source,
      links: Object.freeze([...links]),
    });
    await tx
      .update(idempotencyKeys)
      .set({ resultPayload: { guidance } })
      .where(
        and(
          eq(idempotencyKeys.ownerFirebaseUid, viewer.uid),
          eq(idempotencyKeys.idempotencyKey, idempotencyKey),
        ),
      );
    return { guidance, duplicate: false };
  });
}

export async function listPersonalGuidanceForSources(
  database: Database,
  viewer: ViewerContext,
  sources: readonly MovementSource[],
): Promise<ReadonlyMap<string, readonly PersonalGuidanceLink[]>> {
  const result = new Map<string, readonly PersonalGuidanceLink[]>();
  for (const sourceInput of sources) {
    const source = movementSourceSchema.parse(sourceInput);
    const key = `${source.kind}:${source.id}`;
    if (result.has(key)) continue;
    await assertSourceAvailable(database, viewer.uid, source);
    result.set(key, await loadGuidanceRows(database, viewer.uid, source));
  }
  return result;
}
