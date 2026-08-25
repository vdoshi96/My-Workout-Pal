import { and, count, eq, inArray } from "drizzle-orm";

import type { Database } from "@/db/client";
import {
  catalogEquipment,
  catalogExercises,
  curatedVideos,
  exerciseAliases,
  exerciseEquipment,
  programTemplateRevisions,
  programTemplates,
  templateCardioPrescriptions,
  templateDays,
  templatePrescriptions,
  templateSections,
} from "@/db/schema";
import {
  buildStarterDatabaseRows,
  type StarterDatabaseRows,
} from "@/domain/seed/starter-database-rows";

export type StarterDatabaseVerification = Readonly<{
  catalogEquipment: number;
  catalogExercises: number;
  exerciseEquipment: number;
  exerciseAliases: number;
  templateRevisions: number;
  templateDays: number;
  templateSections: number;
  templatePrescriptions: number;
  templateCardioPrescriptions: number;
  approvedVideos: number;
}>;

type Comparable =
  | null
  | boolean
  | number
  | string
  | readonly Comparable[]
  | Readonly<{ [key: string]: Comparable }>;

function comparable(value: unknown): Comparable {
  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(comparable);
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, comparable(child)]),
    );
  }
  throw new TypeError(`Unsupported seed comparison value: ${typeof value}`);
}

function rowIdentity(row: Readonly<Record<string, unknown>>): string {
  const id = row["id"];
  if (typeof id === "string" && id.length > 0) return id;
  const parts = Object.entries(row)
    .filter(
      ([key, value]) =>
        typeof value === "string" &&
        (key.endsWith("Id") || key.endsWith("Key")),
    )
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${String(value)}`);
  if (parts.length > 0) return parts.join("|");
  return JSON.stringify(comparable(row));
}

function assertExactRows(
  tableName: string,
  actual: readonly Readonly<Record<string, unknown>>[],
  expected: readonly Readonly<Record<string, unknown>>[],
): void {
  const actualByIdentity = new Map(
    actual.map((row) => [rowIdentity(row), row] as const),
  );
  const expectedByIdentity = new Map(
    expected.map((row) => [rowIdentity(row), row] as const),
  );
  const missing = [...expectedByIdentity.keys()].filter(
    (identity) => !actualByIdentity.has(identity),
  );
  const unexpected = [...actualByIdentity.keys()].filter(
    (identity) => !expectedByIdentity.has(identity),
  );
  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(
      `${tableName} seed drift: expected ${expected.length} row(s), found ${actual.length}; ` +
        `missing [${missing.join(", ")}], unexpected [${unexpected.join(", ")}].`,
    );
  }
  for (const [identity, expectedRow] of expectedByIdentity) {
    const actualRow = actualByIdentity.get(identity);
    if (
      actualRow === undefined ||
      JSON.stringify(comparable(actualRow)) !==
        JSON.stringify(comparable(expectedRow))
    ) {
      throw new Error(`${tableName} ${identity} seed drift.`);
    }
  }
}

async function verifyCatalog(
  database: Database,
  rows: StarterDatabaseRows,
): Promise<void> {
  const equipmentIds = rows.catalogEquipment.map(({ id }) => id);
  const exerciseIds = rows.catalogExercises.map(({ id }) => id);

  const actualEquipment = await database
    .select({
      id: catalogEquipment.id,
      label: catalogEquipment.label,
      description: catalogEquipment.description,
      sortOrder: catalogEquipment.sortOrder,
    })
    .from(catalogEquipment)
    .where(inArray(catalogEquipment.id, equipmentIds));
  assertExactRows("catalog_equipment", actualEquipment, rows.catalogEquipment);

  const actualExercises = await database
    .select({
      id: catalogExercises.id,
      slug: catalogExercises.slug,
      name: catalogExercises.name,
      movementFamily: catalogExercises.movementFamily,
      role: catalogExercises.role,
      loggingKind: catalogExercises.loggingKind,
      modality: catalogExercises.modality,
      muscles: catalogExercises.muscles,
      instructions: catalogExercises.instructions,
      variationParentId: catalogExercises.variationParentId,
    })
    .from(catalogExercises)
    .where(inArray(catalogExercises.id, exerciseIds));
  assertExactRows("catalog_exercises", actualExercises, rows.catalogExercises);

  const actualEquipmentEdges = await database
    .select({
      exerciseId: exerciseEquipment.exerciseId,
      equipmentId: exerciseEquipment.equipmentId,
    })
    .from(exerciseEquipment)
    .where(inArray(exerciseEquipment.exerciseId, exerciseIds));
  assertExactRows("exercise_equipment", actualEquipmentEdges, rows.exerciseEquipment);

  const actualAliases = await database
    .select({
      id: exerciseAliases.id,
      exerciseId: exerciseAliases.exerciseId,
      alias: exerciseAliases.alias,
      normalizedAlias: exerciseAliases.normalizedAlias,
    })
    .from(exerciseAliases)
    .where(inArray(exerciseAliases.exerciseId, exerciseIds));
  assertExactRows("exercise_aliases", actualAliases, rows.exerciseAliases);
}

async function verifyTemplateChildren(
  database: Database,
  rows: StarterDatabaseRows,
): Promise<void> {
  const revisionIds = rows.programTemplateRevisions.map(({ id }) => id);
  const actualDays = await database
    .select({
      id: templateDays.id,
      revisionId: templateDays.revisionId,
      dayNumber: templateDays.dayNumber,
      dayKey: templateDays.dayKey,
      displayName: templateDays.displayName,
    })
    .from(templateDays)
    .where(inArray(templateDays.revisionId, revisionIds));
  assertExactRows("template_days", actualDays, rows.templateDays);

  const actualSections = await database
    .select({
      id: templateSections.id,
      revisionId: templateSections.revisionId,
      dayId: templateSections.dayId,
      kind: templateSections.kind,
      displayOrder: templateSections.displayOrder,
      title: templateSections.title,
    })
    .from(templateSections)
    .where(inArray(templateSections.revisionId, revisionIds));
  assertExactRows("template_sections", actualSections, rows.templateSections);

  const actualPrescriptions = await database
    .select({
      id: templatePrescriptions.id,
      revisionId: templatePrescriptions.revisionId,
      sectionId: templatePrescriptions.sectionId,
      exerciseId: templatePrescriptions.exerciseId,
      displayName: templatePrescriptions.displayName,
      displayOrder: templatePrescriptions.displayOrder,
      setKind: templatePrescriptions.setKind,
      setCount: templatePrescriptions.setCount,
      measurementKind: templatePrescriptions.measurementKind,
      minimumReps: templatePrescriptions.minimumReps,
      maximumReps: templatePrescriptions.maximumReps,
      minimumSeconds: templatePrescriptions.minimumSeconds,
      maximumSeconds: templatePrescriptions.maximumSeconds,
      restSeconds: templatePrescriptions.restSeconds,
      targetWeightKg: templatePrescriptions.targetWeightKg,
      targetDistanceM: templatePrescriptions.targetDistanceM,
      notes: templatePrescriptions.notes,
      targetMetadata: templatePrescriptions.targetMetadata,
    })
    .from(templatePrescriptions)
    .where(inArray(templatePrescriptions.revisionId, revisionIds));
  assertExactRows(
    "template_prescriptions",
    actualPrescriptions,
    rows.templatePrescriptions,
  );

  const actualCardio = await database
    .select({
      id: templateCardioPrescriptions.id,
      revisionId: templateCardioPrescriptions.revisionId,
      dayId: templateCardioPrescriptions.dayId,
      mode: templateCardioPrescriptions.mode,
      durationSeconds: templateCardioPrescriptions.durationSeconds,
      distanceM: templateCardioPrescriptions.distanceM,
      paceSecondsPerKm: templateCardioPrescriptions.paceSecondsPerKm,
      inclinePercent: templateCardioPrescriptions.inclinePercent,
      notes: templateCardioPrescriptions.notes,
    })
    .from(templateCardioPrescriptions)
    .where(inArray(templateCardioPrescriptions.revisionId, revisionIds));
  assertExactRows(
    "template_cardio_prescriptions",
    actualCardio,
    rows.templateCardioPrescriptions,
  );
}

async function verifyTemplate(
  database: Database,
  rows: StarterDatabaseRows,
  expectedStatus: "draft" | "published" = "published",
): Promise<void> {
  const actualTemplate = await database
    .select({
      id: programTemplates.id,
      templateKey: programTemplates.templateKey,
      name: programTemplates.name,
      description: programTemplates.description,
    })
    .from(programTemplates)
    .where(eq(programTemplates.id, rows.programTemplate.id));
  assertExactRows("program_templates", actualTemplate, [rows.programTemplate]);

  const revisionIds = rows.programTemplateRevisions.map(({ id }) => id);
  const actualRevisions = await database
    .select({
      id: programTemplateRevisions.id,
      templateId: programTemplateRevisions.templateId,
      revisionNumber: programTemplateRevisions.revisionNumber,
      status: programTemplateRevisions.status,
      equipmentProfileKind: programTemplateRevisions.equipmentProfileKind,
      publishedAt: programTemplateRevisions.publishedAt,
    })
    .from(programTemplateRevisions)
    .where(inArray(programTemplateRevisions.id, revisionIds));
  const expectedRevisions = rows.programTemplateRevisions.map((revision) => ({
    ...revision,
    status: expectedStatus,
    publishedAt: expectedStatus === "published" ? revision.publishedAt : null,
  }));
  assertExactRows("program_template_revisions", actualRevisions, expectedRevisions);
  await verifyTemplateChildren(database, rows);
}

export async function verifyStarterDatabase(
  database: Database,
  rows: StarterDatabaseRows = buildStarterDatabaseRows(),
): Promise<StarterDatabaseVerification> {
  await verifyCatalog(database, rows);
  await verifyTemplate(database, rows);
  const exerciseIds = rows.catalogExercises.map(({ id }) => id);
  const approved = await database
    .select({ value: count() })
    .from(curatedVideos)
    .where(
      and(
        inArray(curatedVideos.exerciseId, exerciseIds),
        eq(curatedVideos.approvalStatus, "approved"),
      ),
    );
  return {
    catalogEquipment: rows.catalogEquipment.length,
    catalogExercises: rows.catalogExercises.length,
    exerciseEquipment: rows.exerciseEquipment.length,
    exerciseAliases: rows.exerciseAliases.length,
    templateRevisions: rows.programTemplateRevisions.length,
    templateDays: rows.templateDays.length,
    templateSections: rows.templateSections.length,
    templatePrescriptions: rows.templatePrescriptions.length,
    templateCardioPrescriptions: rows.templateCardioPrescriptions.length,
    approvedVideos: approved[0]?.value ?? 0,
  };
}

export async function seedStarterDatabase(
  database: Database,
  rows: StarterDatabaseRows = buildStarterDatabaseRows(),
): Promise<StarterDatabaseVerification> {
  return database.transaction(async (transaction) => {
    const tx = transaction as unknown as Database;
    await tx
      .insert(catalogEquipment)
      .values([...rows.catalogEquipment])
      .onConflictDoNothing();
    await tx
      .insert(catalogExercises)
      .values(
        rows.catalogExercises.map((exercise) => ({
          ...exercise,
          muscles: [...exercise.muscles],
        })),
      )
      .onConflictDoNothing();
    await tx
      .insert(exerciseEquipment)
      .values([...rows.exerciseEquipment])
      .onConflictDoNothing();
    await tx
      .insert(exerciseAliases)
      .values([...rows.exerciseAliases])
      .onConflictDoNothing();
    await verifyCatalog(tx, rows);

    await tx.insert(programTemplates).values(rows.programTemplate).onConflictDoNothing();
    const revisionIds = rows.programTemplateRevisions.map(({ id }) => id);
    const existing = await tx
      .select({ id: programTemplateRevisions.id, status: programTemplateRevisions.status })
      .from(programTemplateRevisions)
      .where(inArray(programTemplateRevisions.id, revisionIds));
    const statusById = new Map(existing.map(({ id, status }) => [id, status] as const));
    const newRevisions = rows.programTemplateRevisions
      .filter(({ id }) => !statusById.has(id))
      .map((revision) => ({
        ...revision,
        status: "draft" as const,
        publishedAt: null,
      }));
    if (newRevisions.length > 0) {
      await tx.insert(programTemplateRevisions).values(newRevisions);
    }

    const hasPublishedRevision = rows.programTemplateRevisions.some(
      ({ id }) => statusById.get(id) === "published",
    );
    if (hasPublishedRevision) {
      await verifyTemplate(tx, rows);
      return verifyStarterDatabase(tx, rows);
    }
    const invalidExisting = existing.find(({ status }) => status !== "draft");
    if (invalidExisting) {
      throw new Error(
        `program_template_revisions seed drift at ${invalidExisting.id}: unexpected ${invalidExisting.status} status.`,
      );
    }

    await tx
      .insert(templateDays)
      .values([...rows.templateDays])
      .onConflictDoNothing();
    await tx
      .insert(templateSections)
      .values([...rows.templateSections])
      .onConflictDoNothing();
    await tx
      .insert(templatePrescriptions)
      .values(rows.templatePrescriptions.map((row) => ({ ...row, targetMetadata: {} })))
      .onConflictDoNothing();
    await tx
      .insert(templateCardioPrescriptions)
      .values([...rows.templateCardioPrescriptions])
      .onConflictDoNothing();
    await verifyTemplate(tx, rows, "draft");

    for (const revision of rows.programTemplateRevisions) {
      await tx
        .update(programTemplateRevisions)
        .set({
          status: "published",
          publishedAt: new Date(revision.publishedAt),
        })
        .where(
          and(
            eq(programTemplateRevisions.id, revision.id),
            eq(programTemplateRevisions.status, "draft"),
          ),
        );
    }
    return verifyStarterDatabase(tx, rows);
  });
}
