import { createHash } from "node:crypto";

import { z } from "zod";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import type { Database } from "@/db/client";
import {
  catalogExercises,
  catalogEquipment,
  customExerciseEquipment,
  customExercises,
  exerciseEquipment,
  idempotencyKeys,
  programCardioPrescriptions,
  programDays,
  programPrescriptions,
  programRevisions,
  programSections,
  programTemplateRevisions,
  programTemplates,
  templateCardioPrescriptions,
  templateDays,
  templatePrescriptions,
  templateSections,
  userEquipmentProfiles,
  userPreferences,
  userProfiles,
  userPrograms,
} from "@/db/schema";
import {
  EQUIPMENT_IDS,
  EQUIPMENT_PROFILES,
  type EquipmentId,
  type EquipmentProfileKind,
} from "@/domain/equipment";
import { deterministicSeedUuid } from "@/domain/seed/identity";
import {
  starterEquipmentReplacement,
  starterReplacementSlugs,
} from "@/domain/programs/equipment-substitutions";
import type { ViewerContext } from "@/server/auth/viewer";
import { AuthPolicyError } from "@/server/auth/policy";

/** The one starter template cloned by authenticated onboarding. */
export const STARTER_TEMPLATE_KEY = "five-day-starter-route" as const;
export const STARTER_PROGRAM_KEY = STARTER_TEMPLATE_KEY;

export const REPOSITORY_NOT_FOUND_MESSAGE = "The requested resource was not found.";

/**
 * Missing and foreign resources intentionally use one error shape. Callers
 * must not be able to distinguish whether an identifier exists for another
 * member.
 */
export class RepositoryNotFoundError extends Error {
  readonly code = "not_found" as const;
  readonly status = 404 as const;

  constructor() {
    super(REPOSITORY_NOT_FOUND_MESSAGE);
    this.name = "RepositoryNotFoundError";
  }
}

export const NotFoundError = RepositoryNotFoundError;

export class RepositoryConflictError extends Error {
  readonly code = "conflict" as const;
  readonly status = 409 as const;

  constructor(message = "The requested change conflicts with newer saved data.") {
    super(message);
    this.name = "RepositoryConflictError";
  }
}

export class RepositoryValidationError extends Error {
  readonly code = "validation" as const;
  readonly status = 400 as const;

  constructor(message = "The requested data is invalid.") {
    super(message);
    this.name = "RepositoryValidationError";
  }
}

type UnitSystem = "metric" | "imperial";

export type OnboardingInput = Readonly<{
  /** Preferred name. `profileKind` remains accepted for server callers. */
  equipmentProfileKind?: EquipmentProfileKind;
  profileKind?: EquipmentProfileKind;
  unitSystem?: UnitSystem;
  timezone?: string;
  reducedMotion?: boolean;
  idempotencyKey?: string;
}>;

export type EquipmentChangeInput = Readonly<{
  programId: string;
  baseRevisionId: string;
  equipmentProfileKind?: EquipmentProfileKind;
  profileKind?: EquipmentProfileKind;
  idempotencyKey?: string;
}>;

export type PreferencesUpdateInput = Readonly<{
  expectedUpdatedAt: string;
  idempotencyKey?: string;
  reducedMotion: boolean;
  timezone: string;
  unitSystem: UnitSystem;
}>;

type NormalizedOnboardingInput = Readonly<{
  equipmentProfileKind: EquipmentProfileKind;
  unitSystem: UnitSystem;
  timezone: string;
  reducedMotion: boolean;
  idempotencyKey: string | undefined;
}>;

type NormalizedEquipmentChangeInput = Readonly<{
  programId: string;
  baseRevisionId: string;
  equipmentProfileKind: EquipmentProfileKind;
  idempotencyKey: string | undefined;
}>;

type NormalizedPreferencesUpdateInput = Readonly<{
  expectedUpdatedAt: string;
  idempotencyKey: string | undefined;
  reducedMotion: boolean;
  timezone: string;
  unitSystem: UnitSystem;
}>;

type CatalogExerciseRow = typeof catalogExercises.$inferSelect;
type CustomExerciseRow = typeof customExercises.$inferSelect;
type TemplateRevisionRow = typeof programTemplateRevisions.$inferSelect;
type TemplateDayRow = typeof templateDays.$inferSelect;
type TemplateSectionRow = typeof templateSections.$inferSelect;
type TemplatePrescriptionRow = typeof templatePrescriptions.$inferSelect;
type TemplateCardioRow = typeof templateCardioPrescriptions.$inferSelect;
type ProgramRevisionRow = typeof programRevisions.$inferSelect;
type ProgramSectionRow = typeof programSections.$inferSelect;
type ProgramPrescriptionRow = typeof programPrescriptions.$inferSelect;
type ProgramCardioRow = typeof programCardioPrescriptions.$inferSelect;

export type ProfileReadModel = Readonly<{
  firebaseUid: string;
  displayName: string | null;
  photoUrl: string | null;
  accountStatus: string;
}>;

export type PreferencesReadModel = Readonly<{
  unitSystem: UnitSystem;
  timezone: string;
  reducedMotion: boolean;
  updatedAt: string;
}>;

export type EquipmentReadModel = Readonly<{
  profileKind: EquipmentProfileKind;
}>;

export type ActiveProgramPrescriptionReadModel = Readonly<{
  id: string;
  catalogExerciseId: string | null;
  customExerciseId: string | null;
  exercise: Readonly<{
    id: string;
    slug: string;
    name: string;
    movementFamily: string;
    loggingKind: CatalogExerciseRow["loggingKind"] | ProgramPrescriptionRow["measurementKind"];
    role: CatalogExerciseRow["role"] | null;
    kind: "catalog" | "custom";
    requiredEquipment: readonly EquipmentId[];
  }>;
  customExercise: Readonly<{
    id: string;
    exerciseKey: string;
    name: string;
    loggingKind: ProgramPrescriptionRow["measurementKind"];
    equipmentIds: readonly EquipmentId[];
    instructions: string | null;
  }> | null;
  displayName: string | null;
  label: string;
  displayOrder: number;
  setKind: ProgramPrescriptionRow["setKind"];
  setCount: number;
  measurementKind: ProgramPrescriptionRow["measurementKind"];
  minimumReps: number | null;
  maximumReps: number | null;
  minimumSeconds: number | null;
  maximumSeconds: number | null;
  restSeconds: number;
  targetWeightKg: number | null;
  targetDistanceM: number | null;
  notes: string | null;
  targetMetadata: Record<string, unknown>;
}>;

export type ActiveProgramSectionReadModel = Readonly<{
  id: string;
  kind: ProgramSectionRow["kind"];
  displayOrder: number;
  title: string;
  prescriptions: readonly ActiveProgramPrescriptionReadModel[];
}>;

export type ActiveProgramCardioReadModel = Readonly<{
  id: string;
  mode: ProgramCardioRow["mode"];
  durationSeconds: number;
  distanceM: number | null;
  paceSecondsPerKm: number | null;
  inclinePercent: number | null;
  notes: string | null;
}>;

export type ActiveProgramDayReadModel = Readonly<{
  id: string;
  dayNumber: number;
  dayKey: string;
  displayName: string;
  sections: readonly ActiveProgramSectionReadModel[];
  prescriptions: readonly ActiveProgramPrescriptionReadModel[];
  cardio: readonly ActiveProgramCardioReadModel[];
}>;

export type ActiveProgramReadModel = Readonly<{
  id: string;
  programKey: string;
  name: string;
  equipmentProfileKind: EquipmentProfileKind;
  revisionId: string;
  revisionNumber: number;
  status: "published";
  publishedAt: string;
  sourceTemplateRevisionId: string | null;
  days: readonly ActiveProgramDayReadModel[];
}>;

export type ProfileProgramReadModel = Readonly<{
  profile: ProfileReadModel;
  preferences: PreferencesReadModel;
  equipment: EquipmentReadModel;
  activeProgram: ActiveProgramReadModel | null;
}>;

export type EquipmentChange = Readonly<{
  dayNumber: number;
  dayKey: string;
  dayDisplayName: string;
  sectionKind: ProgramSectionRow["kind"];
  displayOrder: number;
  prescriptionId: string;
  fromCatalogExerciseId: string;
  fromSlug: string;
  toCatalogExerciseId: string;
  toSlug: string;
  preserved: readonly ["sets", "repRange", "rest", "section", "order", "notes"];
  cleared: readonly ["targetWeightKg", "targetDistanceM", "targetMetadata"];
  reason: string;
}>;

export type EquipmentChangeResult = Readonly<
  ProfileProgramReadModel & {
    changes: readonly EquipmentChange[];
  }
>;

export type ProfileProgramRepository = Readonly<{
  onboard(
    viewer: ViewerContext | null,
    input: OnboardingInput,
  ): Promise<ProfileProgramReadModel>;
  getViewerData(viewer: ViewerContext | null): Promise<ProfileProgramReadModel>;
  getActiveProgram(
    viewer: ViewerContext | null,
    programId?: string,
  ): Promise<ActiveProgramReadModel>;
  confirmEquipmentChange(
    viewer: ViewerContext | null,
    input: EquipmentChangeInput,
  ): Promise<EquipmentChangeResult>;
  updatePreferences(
    viewer: ViewerContext | null,
    input: PreferencesUpdateInput,
  ): Promise<ProfileProgramReadModel>;
}>;

const profileKindSchema = z.enum(["dumbbells", "barbell"]);
const onboardingSchema = z
  .object({
    equipmentProfileKind: profileKindSchema.optional(),
    profileKind: profileKindSchema.optional(),
    unitSystem: z.enum(["metric", "imperial"]).optional(),
    timezone: z.string().trim().min(1).max(64).optional(),
    reducedMotion: z.boolean().optional(),
    idempotencyKey: z.string().trim().min(1).max(180).optional(),
  })
  .strict();
const equipmentChangeSchema = z
  .object({
    programId: z.string().uuid(),
    baseRevisionId: z.string().uuid(),
    equipmentProfileKind: profileKindSchema.optional(),
    profileKind: profileKindSchema.optional(),
    idempotencyKey: z.string().trim().min(1).max(180).optional(),
  })
  .strict();
const preferencesUpdateSchema = z
  .object({
    expectedUpdatedAt: z.string().datetime({ offset: true }),
    idempotencyKey: z.string().trim().min(1).max(180).optional(),
    reducedMotion: z.boolean(),
    timezone: z.string().trim().min(1).max(64),
    unitSystem: z.enum(["metric", "imperial"]),
  })
  .strict();

function requireViewer(viewer: ViewerContext | null): ViewerContext {
  if (!viewer || typeof viewer.uid !== "string" || viewer.uid.trim().length === 0) {
    throw new AuthPolicyError("session_invalid", "A valid session is required.", 401);
  }
  return viewer;
}

function requirePermanentMutationViewer(viewer: ViewerContext | null): ViewerContext {
  const current = requireViewer(viewer);
  if (!current.eligibleForPermanentMutations) {
    throw new AuthPolicyError(
      "email_unverified",
      "Verify your email before changing permanent account data.",
      403,
    );
  }
  return current;
}

function parseEquipmentProfileKind(
  left: EquipmentProfileKind | undefined,
  right: EquipmentProfileKind | undefined,
): EquipmentProfileKind {
  if (left && right && left !== right) {
    throw new RepositoryValidationError("Choose one equipment profile.");
  }
  const value = left ?? right;
  if (!value) throw new RepositoryValidationError("An equipment profile is required.");
  return value;
}

function parseOnboardingInput(input: OnboardingInput): NormalizedOnboardingInput {
  const result = onboardingSchema.safeParse(input);
  if (!result.success) throw new RepositoryValidationError("The onboarding data is invalid.");
  const parsed = result.data;
  const timezone = validTimezone(parsed.timezone ?? "UTC");
  return {
    equipmentProfileKind: parseEquipmentProfileKind(
      parsed.equipmentProfileKind,
      parsed.profileKind,
    ),
    unitSystem: parsed.unitSystem ?? "metric",
    timezone,
    reducedMotion: parsed.reducedMotion ?? false,
    idempotencyKey: parsed.idempotencyKey,
  };
}

function validTimezone(value: string): string {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
  } catch {
    throw new RepositoryValidationError("The time zone is invalid.");
  }
  return value;
}

function parseEquipmentChangeInput(input: EquipmentChangeInput): NormalizedEquipmentChangeInput {
  const result = equipmentChangeSchema.safeParse(input);
  if (!result.success) {
    // Malformed or foreign IDs intentionally map to the same not-found shape.
    if (
      result.error.issues.some(
        (issue) => issue.path[0] === "programId" || issue.path[0] === "baseRevisionId",
      )
    ) {
      throw new RepositoryNotFoundError();
    }
    throw new RepositoryValidationError("The equipment change data is invalid.");
  }
  const parsed = result.data;
  return {
    programId: parsed.programId,
    baseRevisionId: parsed.baseRevisionId,
    equipmentProfileKind: parseEquipmentProfileKind(
      parsed.equipmentProfileKind,
      parsed.profileKind,
    ),
    idempotencyKey: parsed.idempotencyKey,
  };
}

function parsePreferencesUpdateInput(
  input: PreferencesUpdateInput,
): NormalizedPreferencesUpdateInput {
  const result = preferencesUpdateSchema.safeParse(input);
  if (!result.success) {
    throw new RepositoryValidationError("The preferences data is invalid.");
  }
  return {
    expectedUpdatedAt: result.data.expectedUpdatedAt,
    idempotencyKey: result.data.idempotencyKey,
    reducedMotion: result.data.reducedMotion,
    timezone: validTimezone(result.data.timezone),
    unitSystem: result.data.unitSystem,
  };
}

function stableRequestHash(operation: string, value: Readonly<Record<string, unknown>>): string {
  return createHash("sha256")
    .update(`${operation}:${JSON.stringify(value)}`, "utf8")
    .digest("hex");
}

function scopedUuid(kind: string, ownerFirebaseUid: string, key: string): string {
  return deterministicSeedUuid(kind, `${ownerFirebaseUid}:${key}`);
}

function iso(value: Date): string {
  return value.toISOString();
}

function cloneJson<T>(value: T): T {
  return structuredClone(value);
}

function equipmentId(value: string): EquipmentId {
  if ((EQUIPMENT_IDS as readonly string[]).includes(value)) return value as EquipmentId;
  throw new RepositoryNotFoundError();
}

type RepositoryDatabase = Database;

type TemplateGraph = Readonly<{
  revision: TemplateRevisionRow;
  days: readonly TemplateDayRow[];
  sections: readonly TemplateSectionRow[];
  prescriptions: readonly TemplatePrescriptionRow[];
  cardio: readonly TemplateCardioRow[];
}>;

type ProgramGraph = Readonly<{
  revision: ProgramRevisionRow;
  days: readonly (typeof programDays.$inferSelect)[];
  sections: readonly ProgramSectionRow[];
  prescriptions: readonly ProgramPrescriptionRow[];
  cardio: readonly ProgramCardioRow[];
}>;

async function loadTemplateGraph(
  database: RepositoryDatabase,
  equipmentProfileKind: EquipmentProfileKind,
): Promise<TemplateGraph> {
  const revisionResult = await database
    .select({ revision: programTemplateRevisions })
    .from(programTemplateRevisions)
    .innerJoin(programTemplates, eq(programTemplateRevisions.templateId, programTemplates.id))
    .where(
      and(
        eq(programTemplates.templateKey, STARTER_TEMPLATE_KEY),
        eq(programTemplateRevisions.status, "published"),
        eq(programTemplateRevisions.equipmentProfileKind, equipmentProfileKind),
      ),
    )
    .orderBy(desc(programTemplateRevisions.revisionNumber))
    .limit(1);
  const revision = revisionResult[0]?.revision;
  if (!revision) throw new RepositoryNotFoundError();

  const [days, sections, prescriptions, cardio] = await Promise.all([
    database
      .select()
      .from(templateDays)
      .where(eq(templateDays.revisionId, revision.id))
      .orderBy(asc(templateDays.dayNumber)),
    database
      .select()
      .from(templateSections)
      .where(eq(templateSections.revisionId, revision.id))
      .orderBy(asc(templateSections.dayId), asc(templateSections.displayOrder)),
    database
      .select()
      .from(templatePrescriptions)
      .where(eq(templatePrescriptions.revisionId, revision.id))
      .orderBy(asc(templatePrescriptions.sectionId), asc(templatePrescriptions.displayOrder)),
    database
      .select()
      .from(templateCardioPrescriptions)
      .where(eq(templateCardioPrescriptions.revisionId, revision.id))
      .orderBy(asc(templateCardioPrescriptions.dayId), asc(templateCardioPrescriptions.mode)),
  ]);
  return {
    revision,
    days,
    sections,
    prescriptions,
    cardio: [...cardio].sort((left, right) => {
      if (left.dayId !== right.dayId) return left.dayId.localeCompare(right.dayId);
      return left.mode === right.mode ? 0 : left.mode === "walker" ? -1 : 1;
    }),
  };
}

async function loadProgramGraph(
  database: RepositoryDatabase,
  ownerFirebaseUid: string,
  programId: string,
  revisionId: string,
): Promise<ProgramGraph> {
  const revision = (
    await database
      .select()
      .from(programRevisions)
      .where(
        and(
          eq(programRevisions.ownerFirebaseUid, ownerFirebaseUid),
          eq(programRevisions.programId, programId),
          eq(programRevisions.id, revisionId),
        ),
      )
      .limit(1)
  )[0];
  if (!revision || revision.status !== "published" || !revision.publishedAt) {
    throw new RepositoryNotFoundError();
  }

  const [days, sections, prescriptions, cardio] = await Promise.all([
    database
      .select()
      .from(programDays)
      .where(
        and(
          eq(programDays.ownerFirebaseUid, ownerFirebaseUid),
          eq(programDays.programId, programId),
          eq(programDays.revisionId, revisionId),
        ),
      )
      .orderBy(asc(programDays.dayNumber)),
    database
      .select()
      .from(programSections)
      .where(
        and(
          eq(programSections.ownerFirebaseUid, ownerFirebaseUid),
          eq(programSections.programId, programId),
          eq(programSections.revisionId, revisionId),
        ),
      )
      .orderBy(asc(programSections.dayId), asc(programSections.displayOrder)),
    database
      .select()
      .from(programPrescriptions)
      .where(
        and(
          eq(programPrescriptions.ownerFirebaseUid, ownerFirebaseUid),
          eq(programPrescriptions.programId, programId),
          eq(programPrescriptions.revisionId, revisionId),
        ),
      )
      .orderBy(asc(programPrescriptions.sectionId), asc(programPrescriptions.displayOrder)),
    database
      .select()
      .from(programCardioPrescriptions)
      .where(
        and(
          eq(programCardioPrescriptions.ownerFirebaseUid, ownerFirebaseUid),
          eq(programCardioPrescriptions.programId, programId),
          eq(programCardioPrescriptions.revisionId, revisionId),
        ),
      )
      .orderBy(asc(programCardioPrescriptions.dayId), asc(programCardioPrescriptions.mode)),
  ]);
  return {
    revision,
    days,
    sections,
    prescriptions,
    cardio: [...cardio].sort((left, right) => {
      if (left.dayId !== right.dayId) return left.dayId.localeCompare(right.dayId);
      return left.mode === right.mode ? 0 : left.mode === "walker" ? -1 : 1;
    }),
  };
}

async function loadCatalogExercises(
  database: RepositoryDatabase,
  ids: readonly string[],
): Promise<ReadonlyMap<string, CatalogExerciseRow>> {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) return new Map();
  const rows = await database
    .select()
    .from(catalogExercises)
    .where(inArray(catalogExercises.id, uniqueIds));
  return new Map(rows.map((row) => [row.id, row] as const));
}

async function loadCustomExercises(
  database: RepositoryDatabase,
  ownerFirebaseUid: string,
  ids: readonly string[],
): Promise<ReadonlyMap<string, CustomExerciseRow>> {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) return new Map();
  const rows = await database
    .select()
    .from(customExercises)
    .where(
      and(
        eq(customExercises.ownerFirebaseUid, ownerFirebaseUid),
        inArray(customExercises.id, uniqueIds),
      ),
    );
  return new Map(rows.map((row) => [row.id, row] as const));
}

async function readProfile(
  database: RepositoryDatabase,
  ownerFirebaseUid: string,
): Promise<ProfileReadModel> {
  const row = (
    await database
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.firebaseUid, ownerFirebaseUid))
      .limit(1)
  )[0];
  if (!row) throw new RepositoryNotFoundError();
  return {
    firebaseUid: row.firebaseUid,
    displayName: row.displayName,
    photoUrl: row.photoUrl,
    accountStatus: row.accountStatus,
  };
}

async function readPreferences(
  database: RepositoryDatabase,
  ownerFirebaseUid: string,
): Promise<PreferencesReadModel> {
  const row = (
    await database
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.ownerFirebaseUid, ownerFirebaseUid))
      .limit(1)
  )[0];
  if (!row) throw new RepositoryNotFoundError();
  return {
    unitSystem: row.unitSystem,
    timezone: row.timezone,
    reducedMotion: row.reducedMotion,
    updatedAt: iso(row.updatedAt),
  };
}

async function readEquipment(
  database: RepositoryDatabase,
  ownerFirebaseUid: string,
): Promise<EquipmentReadModel> {
  const row = (
    await database
      .select()
      .from(userEquipmentProfiles)
      .where(eq(userEquipmentProfiles.ownerFirebaseUid, ownerFirebaseUid))
      .limit(1)
  )[0];
  if (!row) throw new RepositoryNotFoundError();
  return { profileKind: row.profileKind };
}

async function readProgramModel(
  database: RepositoryDatabase,
  root: typeof userPrograms.$inferSelect,
): Promise<ActiveProgramReadModel> {
  if (!root.activeRevisionId) throw new RepositoryNotFoundError();
  const graph = await loadProgramGraph(
    database,
    root.ownerFirebaseUid,
    root.id,
    root.activeRevisionId,
  );
  const exerciseIds = graph.prescriptions.flatMap((row) =>
    row.catalogExerciseId ? [row.catalogExerciseId] : [],
  );
  const customExerciseIds = graph.prescriptions.flatMap((row) =>
    row.customExerciseId ? [row.customExerciseId] : [],
  );
  const [exercises, customExerciseRows, catalogEquipmentRows, customEquipmentRows] = await Promise.all([
    loadCatalogExercises(database, exerciseIds),
    loadCustomExercises(database, root.ownerFirebaseUid, customExerciseIds),
    exerciseIds.length === 0
      ? []
      : database
          .select({
            equipmentId: exerciseEquipment.equipmentId,
            exerciseId: exerciseEquipment.exerciseId,
          })
          .from(exerciseEquipment)
          .innerJoin(catalogEquipment, eq(catalogEquipment.id, exerciseEquipment.equipmentId))
          .where(inArray(exerciseEquipment.exerciseId, [...new Set(exerciseIds)]))
          .orderBy(asc(catalogEquipment.sortOrder)),
    customExerciseIds.length === 0
      ? []
      : database
          .select({
            customExerciseId: customExerciseEquipment.customExerciseId,
            equipmentId: customExerciseEquipment.equipmentId,
          })
          .from(customExerciseEquipment)
          .innerJoin(
            catalogEquipment,
            eq(catalogEquipment.id, customExerciseEquipment.equipmentId),
          )
          .where(
            and(
              eq(customExerciseEquipment.ownerFirebaseUid, root.ownerFirebaseUid),
              inArray(customExerciseEquipment.customExerciseId, [
                ...new Set(customExerciseIds),
              ]),
            ),
          )
          .orderBy(asc(catalogEquipment.sortOrder)),
  ]);
  const equipmentByCatalogExercise = new Map<string, EquipmentId[]>();
  for (const row of catalogEquipmentRows) {
    const values = equipmentByCatalogExercise.get(row.exerciseId) ?? [];
    values.push(equipmentId(row.equipmentId));
    equipmentByCatalogExercise.set(row.exerciseId, values);
  }
  const equipmentByCustomExercise = new Map<string, EquipmentId[]>();
  for (const row of customEquipmentRows) {
    const values = equipmentByCustomExercise.get(row.customExerciseId) ?? [];
    values.push(equipmentId(row.equipmentId));
    equipmentByCustomExercise.set(row.customExerciseId, values);
  }
  const prescriptionBySection = new Map<string, ProgramPrescriptionRow[]>();
  for (const prescription of graph.prescriptions) {
    const list = prescriptionBySection.get(prescription.sectionId) ?? [];
    list.push(prescription);
    prescriptionBySection.set(prescription.sectionId, list);
  }
  const sectionByDay = new Map<string, ProgramSectionRow[]>();
  for (const section of graph.sections) {
    const list = sectionByDay.get(section.dayId) ?? [];
    list.push(section);
    sectionByDay.set(section.dayId, list);
  }
  const cardioByDay = new Map<string, ProgramCardioRow[]>();
  for (const cardio of graph.cardio) {
    const list = cardioByDay.get(cardio.dayId) ?? [];
    list.push(cardio);
    cardioByDay.set(cardio.dayId, list);
  }

  function prescriptionModel(row: ProgramPrescriptionRow): ActiveProgramPrescriptionReadModel {
    const hasCatalog = row.catalogExerciseId !== null;
    const hasCustom = row.customExerciseId !== null;
    if (hasCatalog === hasCustom) throw new RepositoryNotFoundError();
    const catalogExercise = row.catalogExerciseId
      ? exercises.get(row.catalogExerciseId)
      : undefined;
    const customExercise = row.customExerciseId
      ? customExerciseRows.get(row.customExerciseId)
      : undefined;
    if (!catalogExercise && !customExercise) throw new RepositoryNotFoundError();
    const exercise = catalogExercise
      ? {
          id: catalogExercise.id,
          slug: catalogExercise.slug,
          name: catalogExercise.name,
          movementFamily: catalogExercise.movementFamily,
          loggingKind: catalogExercise.loggingKind,
          role: catalogExercise.role,
          kind: "catalog" as const,
          requiredEquipment: equipmentByCatalogExercise.get(catalogExercise.id) ?? [],
        }
      : {
          id: customExercise!.id,
          slug: customExercise!.exerciseKey,
          name: customExercise!.name,
          movementFamily: "custom",
          loggingKind: customExercise!.loggingKind,
          role: null,
          kind: "custom" as const,
          requiredEquipment: equipmentByCustomExercise.get(customExercise!.id) ?? [],
        };
    return {
      id: row.id,
      catalogExerciseId: row.catalogExerciseId,
      customExerciseId: row.customExerciseId,
      exercise: {
        ...exercise,
      },
      customExercise: customExercise
        ? {
            id: customExercise.id,
            exerciseKey: customExercise.exerciseKey,
            name: customExercise.name,
            loggingKind: customExercise.loggingKind,
            equipmentIds: equipmentByCustomExercise.get(customExercise.id) ?? [],
            instructions: customExercise.instructions,
          }
        : null,
      displayName: row.displayName,
      label: row.displayName ?? exercise.name,
      displayOrder: row.displayOrder,
      setKind: row.setKind,
      setCount: row.setCount,
      measurementKind: row.measurementKind,
      minimumReps: row.minimumReps,
      maximumReps: row.maximumReps,
      minimumSeconds: row.minimumSeconds,
      maximumSeconds: row.maximumSeconds,
      restSeconds: row.restSeconds,
      targetWeightKg: row.targetWeightKg,
      targetDistanceM: row.targetDistanceM,
      notes: row.notes,
      targetMetadata: cloneJson(row.targetMetadata),
    };
  }

  const days: ActiveProgramDayReadModel[] = graph.days.map((day) => {
    const sections: ActiveProgramSectionReadModel[] = (sectionByDay.get(day.id) ?? []).map(
      (section) => ({
        id: section.id,
        kind: section.kind,
        displayOrder: section.displayOrder,
        title: section.title,
        prescriptions: (prescriptionBySection.get(section.id) ?? []).map(prescriptionModel),
      }),
    );
    return {
      id: day.id,
      dayNumber: day.dayNumber,
      dayKey: day.dayKey,
      displayName: day.displayName,
      sections,
      prescriptions: sections.flatMap((section) => section.prescriptions),
      cardio: (cardioByDay.get(day.id) ?? []).map((row) => ({
        id: row.id,
        mode: row.mode,
        durationSeconds: row.durationSeconds,
        distanceM: row.distanceM,
        paceSecondsPerKm: row.paceSecondsPerKm,
        inclinePercent: row.inclinePercent,
        notes: row.notes,
      })),
    };
  });

  if (
    graph.revision.status !== "published" ||
    !graph.revision.publishedAt ||
    (graph.revision.equipmentProfileKind !== "dumbbells" &&
      graph.revision.equipmentProfileKind !== "barbell")
  ) {
    throw new RepositoryNotFoundError();
  }
  return {
    id: root.id,
    programKey: root.programKey,
    name: root.name,
    equipmentProfileKind: graph.revision.equipmentProfileKind,
    revisionId: graph.revision.id,
    revisionNumber: graph.revision.revisionNumber,
    status: "published",
    publishedAt: iso(graph.revision.publishedAt),
    sourceTemplateRevisionId: graph.revision.sourceTemplateRevisionId,
    days,
  };
}

async function findProgramRoot(
  database: RepositoryDatabase,
  ownerFirebaseUid: string,
  programId?: string,
  lock = false,
): Promise<typeof userPrograms.$inferSelect> {
  if (programId && !z.string().uuid().safeParse(programId).success) {
    throw new RepositoryNotFoundError();
  }
  // Drizzle's selected row is used after the explicit lock. The raw statement
  // is deliberately owner-scoped as an additional IDOR boundary.
  if (lock) {
    await database.execute(
      programId
        ? sql`SELECT id FROM user_programs WHERE owner_firebase_uid = ${ownerFirebaseUid} AND id = ${programId} FOR UPDATE`
        : sql`SELECT id FROM user_programs WHERE owner_firebase_uid = ${ownerFirebaseUid} AND program_key = ${STARTER_PROGRAM_KEY} FOR UPDATE`,
    );
  }
  const conditions = [eq(userPrograms.ownerFirebaseUid, ownerFirebaseUid)];
  if (programId) conditions.push(eq(userPrograms.id, programId));
  else conditions.push(eq(userPrograms.programKey, STARTER_PROGRAM_KEY));
  const root = (
    await database
      .select()
      .from(userPrograms)
      .where(and(...conditions))
      .limit(1)
  )[0];
  if (!root) throw new RepositoryNotFoundError();
  return root;
}

async function readViewerData(
  database: RepositoryDatabase,
  ownerFirebaseUid: string,
): Promise<ProfileProgramReadModel> {
  const [profile, preferences, equipment] = await Promise.all([
    readProfile(database, ownerFirebaseUid),
    readPreferences(database, ownerFirebaseUid),
    readEquipment(database, ownerFirebaseUid),
  ]);
  let activeProgram: ActiveProgramReadModel | null = null;
  const root = (
    await database
      .select()
      .from(userPrograms)
      .where(
        and(
          eq(userPrograms.ownerFirebaseUid, ownerFirebaseUid),
          eq(userPrograms.programKey, STARTER_PROGRAM_KEY),
        ),
      )
      .limit(1)
  )[0];
  if (root?.activeRevisionId) activeProgram = await readProgramModel(database, root);
  return { profile, preferences, equipment, activeProgram };
}

async function reserveIdempotency(
  database: RepositoryDatabase,
  ownerFirebaseUid: string,
  key: string | undefined,
  operation: string,
  requestHash: string,
): Promise<Readonly<{ key: string; replay: Record<string, unknown> | undefined }> | undefined> {
  if (!key) return undefined;
  await database
    .insert(idempotencyKeys)
    .values({
      ownerFirebaseUid,
      idempotencyKey: key,
      operation,
      requestHash,
      resultPayload: { pending: true },
    })
    .onConflictDoNothing();
  const row = (
    await database
      .select()
      .from(idempotencyKeys)
      .where(
        and(
          eq(idempotencyKeys.ownerFirebaseUid, ownerFirebaseUid),
          eq(idempotencyKeys.idempotencyKey, key),
        ),
      )
      .limit(1)
  )[0];
  if (!row || row.operation !== operation || row.requestHash !== requestHash) {
    throw new RepositoryConflictError("The idempotency key was already used for another request.");
  }
  const payload = row.resultPayload;
  if (
    typeof payload === "object" &&
    payload !== null &&
    "pending" in payload &&
    (payload as { pending?: unknown }).pending === false
  ) {
    return { key, replay: payload as Record<string, unknown> };
  }
  return { key, replay: undefined };
}

async function findIdempotency(
  database: RepositoryDatabase,
  ownerFirebaseUid: string,
  key: string | undefined,
): Promise<typeof idempotencyKeys.$inferSelect | undefined> {
  if (!key) return undefined;
  return (
    await database
      .select()
      .from(idempotencyKeys)
      .where(
        and(
          eq(idempotencyKeys.ownerFirebaseUid, ownerFirebaseUid),
          eq(idempotencyKeys.idempotencyKey, key),
        ),
      )
      .limit(1)
  )[0];
}

async function finishIdempotency(
  database: RepositoryDatabase,
  ownerFirebaseUid: string,
  key: string | undefined,
  payload: Record<string, unknown>,
): Promise<void> {
  if (!key) return;
  await database
    .update(idempotencyKeys)
    .set({ resultPayload: { pending: false, ...payload } })
    .where(
      and(
        eq(idempotencyKeys.ownerFirebaseUid, ownerFirebaseUid),
        eq(idempotencyKeys.idempotencyKey, key),
      ),
    );
}

async function cloneTemplateRevision(
  database: RepositoryDatabase,
  ownerFirebaseUid: string,
  programId: string,
  template: TemplateGraph,
  now: Date,
): Promise<string> {
  const revisionId = scopedUuid(
    "program-revision",
    ownerFirebaseUid,
    `${programId}:${template.revision.id}`,
  );
  await database
    .insert(programRevisions)
    .values({
      id: revisionId,
      ownerFirebaseUid,
      programId,
      revisionNumber: 1,
      status: "draft",
      equipmentProfileKind: template.revision.equipmentProfileKind!,
      sourceTemplateRevisionId: template.revision.id,
      publishedAt: null,
    })
    .onConflictDoNothing();

  await database
    .insert(programDays)
    .values(
      template.days.map((day) => ({
        id: scopedUuid("program-day", ownerFirebaseUid, `${programId}:${revisionId}:${day.id}`),
        ownerFirebaseUid,
        programId,
        revisionId,
        dayNumber: day.dayNumber,
        dayKey: day.dayKey,
        displayName: day.displayName,
      })),
    )
    .onConflictDoNothing();
  const programDayIds = new Map(
    template.days.map((day) => [
      day.id,
      scopedUuid("program-day", ownerFirebaseUid, `${programId}:${revisionId}:${day.id}`),
    ] as const),
  );
  await database
    .insert(programSections)
    .values(
      template.sections.map((section) => ({
        id: scopedUuid("program-section", ownerFirebaseUid, `${programId}:${revisionId}:${section.id}`),
        ownerFirebaseUid,
        programId,
        revisionId,
        dayId: programDayIds.get(section.dayId)!,
        kind: section.kind,
        displayOrder: section.displayOrder,
        title: section.title,
      })),
    )
    .onConflictDoNothing();
  const programSectionIds = new Map(
    template.sections.map((section) => [
      section.id,
      scopedUuid("program-section", ownerFirebaseUid, `${programId}:${revisionId}:${section.id}`),
    ] as const),
  );
  await database
    .insert(programPrescriptions)
    .values(
      template.prescriptions.map((prescription) => ({
        id: scopedUuid(
          "program-prescription",
          ownerFirebaseUid,
          `${programId}:${revisionId}:${prescription.id}`,
        ),
        ownerFirebaseUid,
        programId,
        revisionId,
        sectionId: programSectionIds.get(prescription.sectionId)!,
        catalogExerciseId: prescription.exerciseId,
        customExerciseId: null,
        displayName: prescription.displayName,
        displayOrder: prescription.displayOrder,
        setKind: prescription.setKind,
        setCount: prescription.setCount,
        measurementKind: prescription.measurementKind,
        minimumReps: prescription.minimumReps,
        maximumReps: prescription.maximumReps,
        minimumSeconds: prescription.minimumSeconds,
        maximumSeconds: prescription.maximumSeconds,
        restSeconds: prescription.restSeconds,
        targetWeightKg: prescription.targetWeightKg,
        targetDistanceM: prescription.targetDistanceM,
        notes: prescription.notes,
        targetMetadata: cloneJson(prescription.targetMetadata),
      })),
    )
    .onConflictDoNothing();
  await database
    .insert(programCardioPrescriptions)
    .values(
      template.cardio.map((cardio) => ({
        id: scopedUuid("program-cardio", ownerFirebaseUid, `${programId}:${revisionId}:${cardio.id}`),
        ownerFirebaseUid,
        programId,
        revisionId,
        dayId: programDayIds.get(cardio.dayId)!,
        mode: cardio.mode,
        durationSeconds: cardio.durationSeconds,
        distanceM: cardio.distanceM,
        paceSecondsPerKm: cardio.paceSecondsPerKm,
        inclinePercent: cardio.inclinePercent,
        notes: cardio.notes,
      })),
    )
    .onConflictDoNothing();

  await database
    .update(programRevisions)
    .set({ status: "published", publishedAt: now })
    .where(
      and(
        eq(programRevisions.ownerFirebaseUid, ownerFirebaseUid),
        eq(programRevisions.programId, programId),
        eq(programRevisions.id, revisionId),
        eq(programRevisions.status, "draft"),
      ),
    );
  return revisionId;
}

async function cloneEquipmentRevision(
  database: RepositoryDatabase,
  ownerFirebaseUid: string,
  root: typeof userPrograms.$inferSelect,
  source: ProgramGraph,
  targetTemplate: TemplateGraph,
  targetProfile: EquipmentProfileKind,
  now: Date,
): Promise<Readonly<{ revisionId: string; changes: readonly EquipmentChange[] }>> {
  const revisionNumber = source.revision.revisionNumber + 1;
  const revisionId = scopedUuid(
    "program-revision",
    ownerFirebaseUid,
    `${root.id}:${source.revision.id}:${targetProfile}`,
  );
  await database
    .insert(programRevisions)
    .values({
      id: revisionId,
      ownerFirebaseUid,
      programId: root.id,
      revisionNumber,
      status: "draft",
      equipmentProfileKind: targetProfile,
      sourceTemplateRevisionId: targetTemplate.revision.id,
      publishedAt: null,
    })
    .onConflictDoNothing();
  const existingRevision = (
    await database
      .select()
      .from(programRevisions)
      .where(
        and(
          eq(programRevisions.ownerFirebaseUid, ownerFirebaseUid),
          eq(programRevisions.programId, root.id),
          eq(programRevisions.id, revisionId),
        ),
      )
      .limit(1)
  )[0];
  if (!existingRevision) throw new RepositoryNotFoundError();
  if (existingRevision.status === "published" && existingRevision.publishedAt) {
    const active = await readProgramModel(database, { ...root, activeRevisionId: revisionId });
    void active;
    return { revisionId, changes: [] };
  }

  const sourceDayById = new Map(source.days.map((day) => [day.id, day] as const));
  const sourceSectionById = new Map(source.sections.map((section) => [section.id, section] as const));
  const sourceExerciseIds = source.prescriptions.flatMap((row) =>
    row.catalogExerciseId ? [row.catalogExerciseId] : [],
  );
  const sourceCustomExerciseIds = source.prescriptions.flatMap((row) =>
    row.customExerciseId ? [row.customExerciseId] : [],
  );
  const allExerciseRows = await loadCatalogExercises(database, sourceExerciseIds);
  const allCustomExerciseRows = await loadCustomExercises(
    database,
    ownerFirebaseUid,
    sourceCustomExerciseIds,
  );
  if (allCustomExerciseRows.size !== new Set(sourceCustomExerciseIds).size) {
    throw new RepositoryNotFoundError();
  }
  const sourceSlugs = [...allExerciseRows.values()].map((row) => row.slug);
  const targetSlugs = starterReplacementSlugs(targetProfile);
  const targetExerciseRows = await database
    .select()
    .from(catalogExercises)
    .where(inArray(catalogExercises.slug, [...new Set([...sourceSlugs, ...targetSlugs])]));
  const exercisesBySlug = new Map(targetExerciseRows.map((row) => [row.slug, row] as const));
  const targetExerciseIds = targetExerciseRows.map((row) => row.id);
  const equipmentRows =
    targetExerciseIds.length === 0
      ? []
      : await database
          .select()
          .from(exerciseEquipment)
          .where(inArray(exerciseEquipment.exerciseId, targetExerciseIds));
  const equipmentByExercise = new Map<string, Set<string>>();
  for (const row of equipmentRows) {
    const set = equipmentByExercise.get(row.exerciseId) ?? new Set<string>();
    set.add(row.equipmentId);
    equipmentByExercise.set(row.exerciseId, set);
  }
  const customEquipmentRows =
    sourceCustomExerciseIds.length === 0
      ? []
      : await database
          .select()
          .from(customExerciseEquipment)
          .where(
            and(
              eq(customExerciseEquipment.ownerFirebaseUid, ownerFirebaseUid),
              inArray(customExerciseEquipment.customExerciseId, [...new Set(sourceCustomExerciseIds)]),
            ),
          );
  const equipmentByCustomExercise = new Map<string, Set<string>>();
  for (const row of customEquipmentRows) {
    const set = equipmentByCustomExercise.get(row.customExerciseId) ?? new Set<string>();
    set.add(row.equipmentId);
    equipmentByCustomExercise.set(row.customExerciseId, set);
  }
  const targetEquipment = new Set<string>(EQUIPMENT_PROFILES[targetProfile].equipment);
  const targetDisplayNameByExerciseId = new Map(
    targetTemplate.prescriptions
      .filter((prescription) => prescription.displayName !== null)
      .map((prescription) => [prescription.exerciseId, prescription.displayName!] as const),
  );
  const changes: EquipmentChange[] = [];

  const programDayId = (id: string): string =>
    scopedUuid("program-day", ownerFirebaseUid, `${root.id}:${revisionId}:${id}`);
  const programSectionId = (id: string): string =>
    scopedUuid("program-section", ownerFirebaseUid, `${root.id}:${revisionId}:${id}`);
  await database
    .insert(programDays)
    .values(
      source.days.map((day) => ({
        id: programDayId(day.id),
        ownerFirebaseUid,
        programId: root.id,
        revisionId,
        dayNumber: day.dayNumber,
        dayKey: day.dayKey,
        displayName: day.displayName,
      })),
    )
    .onConflictDoNothing();
  await database
    .insert(programSections)
    .values(
      source.sections.map((section) => ({
        id: programSectionId(section.id),
        ownerFirebaseUid,
        programId: root.id,
        revisionId,
        dayId: programDayId(section.dayId),
        kind: section.kind,
        displayOrder: section.displayOrder,
        title: section.title,
      })),
    )
    .onConflictDoNothing();
  await database
    .insert(programPrescriptions)
    .values(
      source.prescriptions.map((prescription) => {
        const section = sourceSectionById.get(prescription.sectionId);
        const day = section ? sourceDayById.get(section.dayId) : undefined;
        if (!section || !day) {
          throw new RepositoryNotFoundError();
        }
        const id = scopedUuid(
          "program-prescription",
          ownerFirebaseUid,
          `${root.id}:${revisionId}:${prescription.id}`,
        );
        if (prescription.customExerciseId) {
          const customExercise = allCustomExerciseRows.get(prescription.customExerciseId);
          if (!customExercise) throw new RepositoryNotFoundError();
          const required =
            equipmentByCustomExercise.get(customExercise.id) ?? new Set<string>();
          const compatible = [...required].every((equipment) => targetEquipment.has(equipment));
          if (!compatible) {
            throw new RepositoryValidationError(
              "A custom exercise is incompatible with the selected equipment profile.",
            );
          }
          return {
            id,
            ownerFirebaseUid,
            programId: root.id,
            revisionId,
            sectionId: programSectionId(section.id),
            catalogExerciseId: null,
            customExerciseId: customExercise.id,
            displayName: prescription.displayName,
            displayOrder: prescription.displayOrder,
            setKind: prescription.setKind,
            setCount: prescription.setCount,
            measurementKind: prescription.measurementKind,
            minimumReps: prescription.minimumReps,
            maximumReps: prescription.maximumReps,
            minimumSeconds: prescription.minimumSeconds,
            maximumSeconds: prescription.maximumSeconds,
            restSeconds: prescription.restSeconds,
            targetWeightKg: prescription.targetWeightKg,
            targetDistanceM: prescription.targetDistanceM,
            notes: prescription.notes,
            targetMetadata: cloneJson(prescription.targetMetadata),
          };
        }
        if (!prescription.catalogExerciseId) throw new RepositoryNotFoundError();
        const sourceExercise = allExerciseRows.get(prescription.catalogExerciseId);
        if (!sourceExercise) throw new RepositoryNotFoundError();
        const required = equipmentByExercise.get(sourceExercise.id) ?? new Set<string>();
        const physicallyCompatible = [...required].every((equipment) => targetEquipment.has(equipment));
        // Canonical starter substitutions are explicit and intentionally win
        // over the broader physical equipment set (barbell profiles retain
        // dumbbells, but still reroute goblet squat to back squat). Any
        // unmapped catalog exercise stays on its canonical ID when physically
        // compatible, even if a template position would differ.
        const replacementSlug = starterEquipmentReplacement(targetProfile, {
          dayKey: day.dayKey,
          sectionKind: section.kind,
          sourceSlug: sourceExercise.slug,
        });
        if (!replacementSlug && !physicallyCompatible) {
          throw new RepositoryValidationError(
            "A catalog exercise is incompatible with the selected equipment profile.",
          );
        }
        const targetSlug = replacementSlug ?? sourceExercise.slug;
        const targetExercise = exercisesBySlug.get(targetSlug);
        if (!targetExercise) {
          throw new RepositoryValidationError(
            `No equipment substitution is available for ${sourceExercise.slug}.`,
          );
        }
        const substituted = targetExercise.id !== sourceExercise.id;
        const displayName = substituted
          ? targetDisplayNameByExerciseId.get(targetExercise.id) ?? null
          : prescription.displayName;
        if (substituted) {
          const reason =
            `Changed equipment profile from ${source.revision.equipmentProfileKind} to ${targetProfile}; ${sourceExercise.name} was replaced with ${targetExercise.name}, so movement-specific targets were cleared.`;
          changes.push({
            dayNumber: day.dayNumber,
            dayKey: day.dayKey,
            dayDisplayName: day.displayName,
            sectionKind: section.kind,
            displayOrder: prescription.displayOrder,
            prescriptionId: prescription.id,
            fromCatalogExerciseId: sourceExercise.id,
            fromSlug: sourceExercise.slug,
            toCatalogExerciseId: targetExercise.id,
            toSlug: targetExercise.slug,
            preserved: ["sets", "repRange", "rest", "section", "order", "notes"],
            cleared: ["targetWeightKg", "targetDistanceM", "targetMetadata"],
            reason,
          });
        }
        return {
          id,
          ownerFirebaseUid,
          programId: root.id,
          revisionId,
          sectionId: programSectionId(section.id),
          catalogExerciseId: targetExercise.id,
          customExerciseId: null,
          displayName,
          displayOrder: prescription.displayOrder,
          setKind: prescription.setKind,
          setCount: prescription.setCount,
          measurementKind: targetExercise.loggingKind,
          minimumReps: prescription.minimumReps,
          maximumReps: prescription.maximumReps,
          minimumSeconds: prescription.minimumSeconds,
          maximumSeconds: prescription.maximumSeconds,
          restSeconds: prescription.restSeconds,
          targetWeightKg: substituted ? null : prescription.targetWeightKg,
          targetDistanceM: substituted ? null : prescription.targetDistanceM,
          notes: prescription.notes,
          targetMetadata: substituted ? {} : cloneJson(prescription.targetMetadata),
        };
      }),
    )
    .onConflictDoNothing();
  await database
    .insert(programCardioPrescriptions)
    .values(
      source.cardio.map((cardio) => ({
        id: scopedUuid("program-cardio", ownerFirebaseUid, `${root.id}:${revisionId}:${cardio.id}`),
        ownerFirebaseUid,
        programId: root.id,
        revisionId,
        dayId: programDayId(cardio.dayId),
        mode: cardio.mode,
        durationSeconds: cardio.durationSeconds,
        distanceM: cardio.distanceM,
        paceSecondsPerKm: cardio.paceSecondsPerKm,
        inclinePercent: cardio.inclinePercent,
        notes: cardio.notes,
      })),
    )
    .onConflictDoNothing();
  await database
    .update(programRevisions)
    .set({ status: "published", publishedAt: now })
    .where(
      and(
        eq(programRevisions.ownerFirebaseUid, ownerFirebaseUid),
        eq(programRevisions.programId, root.id),
        eq(programRevisions.id, revisionId),
        eq(programRevisions.status, "draft"),
      ),
    );
  return { revisionId, changes };
}

function replayPayload(
  payload: Record<string, unknown> | undefined,
): Readonly<{ revisionId: string; changes: readonly EquipmentChange[] }> | undefined {
  if (!payload) return undefined;
  if (typeof payload["revisionId"] !== "string" || !Array.isArray(payload["changes"])) {
    throw new RepositoryConflictError("The stored idempotency result is invalid.");
  }
  return {
    revisionId: payload["revisionId"] as string,
    changes: payload["changes"] as EquipmentChange[],
  };
}

export function createProfileProgramRepository(
  database: Database,
): ProfileProgramRepository {
  async function onboard(
    viewerInput: ViewerContext | null,
    input: OnboardingInput,
  ): Promise<ProfileProgramReadModel> {
    const viewer = requirePermanentMutationViewer(viewerInput);
    const normalized = parseOnboardingInput(input);
    const requestHash = stableRequestHash("onboarding", {
      equipmentProfileKind: normalized.equipmentProfileKind,
      unitSystem: normalized.unitSystem,
      timezone: normalized.timezone,
      reducedMotion: normalized.reducedMotion,
    });
    return database.transaction(async (transaction) => {
      const tx = transaction as unknown as Database;
      await tx
        .insert(userProfiles)
        .values({
          firebaseUid: viewer.uid,
          displayName: viewer.displayName,
          photoUrl: null,
          accountStatus: "active",
        })
        .onConflictDoNothing();
      const reservation = await reserveIdempotency(
        tx,
        viewer.uid,
        normalized.idempotencyKey,
        "onboarding",
        requestHash,
      );
      if (reservation?.replay) {
        return readViewerData(tx, viewer.uid);
      }
      await tx
        .insert(userPreferences)
        .values({
          ownerFirebaseUid: viewer.uid,
          unitSystem: normalized.unitSystem,
          timezone: normalized.timezone,
          reducedMotion: normalized.reducedMotion,
        })
        .onConflictDoNothing();
      await tx
        .insert(userEquipmentProfiles)
        .values({ ownerFirebaseUid: viewer.uid, profileKind: normalized.equipmentProfileKind })
        .onConflictDoNothing();
      const savedEquipment = (
        await tx
          .select()
          .from(userEquipmentProfiles)
          .where(eq(userEquipmentProfiles.ownerFirebaseUid, viewer.uid))
          .limit(1)
      )[0];
      if (!savedEquipment) throw new RepositoryNotFoundError();
      if (savedEquipment.profileKind !== normalized.equipmentProfileKind) {
        throw new RepositoryConflictError(
          "An equipment profile already exists. Confirm an equipment change instead.",
        );
      }
      const template = await loadTemplateGraph(tx, normalized.equipmentProfileKind);
      const programId = scopedUuid("user-program", viewer.uid, STARTER_PROGRAM_KEY);
      await tx
        .insert(userPrograms)
        .values({
          id: programId,
          ownerFirebaseUid: viewer.uid,
          programKey: STARTER_PROGRAM_KEY,
          name: "Five-day starter route",
          activeRevisionId: null,
        })
        .onConflictDoNothing();
      const root = await findProgramRoot(tx, viewer.uid, programId, true);
      if (!root.activeRevisionId) {
        const revisionId = await cloneTemplateRevision(tx, viewer.uid, root.id, template, new Date());
        await tx
          .update(userPrograms)
          .set({ activeRevisionId: revisionId, updatedAt: new Date() })
          .where(
            and(
              eq(userPrograms.ownerFirebaseUid, viewer.uid),
              eq(userPrograms.id, root.id),
            ),
          );
      }
      const result = await readViewerData(tx, viewer.uid);
      await finishIdempotency(tx, viewer.uid, normalized.idempotencyKey, {
        result,
      });
      return result;
    });
  }

  async function getViewerData(viewerInput: ViewerContext | null): Promise<ProfileProgramReadModel> {
    const viewer = requireViewer(viewerInput);
    return readViewerData(database, viewer.uid);
  }

  async function getActiveProgram(
    viewerInput: ViewerContext | null,
    programId?: string,
  ): Promise<ActiveProgramReadModel> {
    const viewer = requireViewer(viewerInput);
    const root = await findProgramRoot(database, viewer.uid, programId);
    return readProgramModel(database, root);
  }

  async function confirmEquipmentChange(
    viewerInput: ViewerContext | null,
    input: EquipmentChangeInput,
  ): Promise<EquipmentChangeResult> {
    const viewer = requirePermanentMutationViewer(viewerInput);
    const normalized = parseEquipmentChangeInput(input);
    const requestHash = stableRequestHash("equipment-change", {
      programId: normalized.programId,
      baseRevisionId: normalized.baseRevisionId,
      equipmentProfileKind: normalized.equipmentProfileKind,
    });
    return database.transaction(async (transaction) => {
      const tx = transaction as unknown as Database;
      const root = await findProgramRoot(tx, viewer.uid, normalized.programId, true);
      // A completed replay is read-only and remains valid even after its
      // original base revision is no longer active. The lookup intentionally
      // precedes the stale-base check so replay never creates a new write.
      const existingIdempotency = await findIdempotency(
        tx,
        viewer.uid,
        normalized.idempotencyKey,
      );
      if (existingIdempotency) {
        if (
          existingIdempotency.operation !== "equipment-change" ||
          existingIdempotency.requestHash !== requestHash
        ) {
          throw new RepositoryConflictError("The idempotency key was already used for another request.");
        }
        const stored = replayPayload(existingIdempotency.resultPayload);
        if (stored) {
          const current = await readViewerData(tx, viewer.uid);
          return { ...current, changes: stored.changes };
        }
      }
      if (!root.activeRevisionId) throw new RepositoryNotFoundError();
      if (root.activeRevisionId !== normalized.baseRevisionId) {
        throw new RepositoryConflictError(
          "The active program revision changed. Refresh the program before confirming this equipment change.",
        );
      }
      const reservation = await reserveIdempotency(
        tx,
        viewer.uid,
        normalized.idempotencyKey,
        "equipment-change",
        requestHash,
      );
      if (reservation?.replay) {
        const stored = replayPayload(reservation.replay);
        if (!stored) throw new RepositoryConflictError("The stored idempotency result is invalid.");
        const current = await readViewerData(tx, viewer.uid);
        return { ...current, changes: stored.changes };
      }
      const source = await loadProgramGraph(tx, viewer.uid, root.id, root.activeRevisionId);
      const currentProfile = source.revision.equipmentProfileKind;
      if (currentProfile === normalized.equipmentProfileKind) {
        const current = await readViewerData(tx, viewer.uid);
        await finishIdempotency(tx, viewer.uid, normalized.idempotencyKey, {
          revisionId: source.revision.id,
          changes: [],
        });
        return { ...current, changes: [] };
      }
      const targetTemplate = await loadTemplateGraph(tx, normalized.equipmentProfileKind);
      const cloned = await cloneEquipmentRevision(
        tx,
        viewer.uid,
        root,
        source,
        targetTemplate,
        normalized.equipmentProfileKind,
        new Date(),
      );
      await tx
        .update(userPrograms)
        .set({ activeRevisionId: cloned.revisionId, updatedAt: new Date() })
        .where(
          and(
            eq(userPrograms.ownerFirebaseUid, viewer.uid),
            eq(userPrograms.id, root.id),
          ),
        );
      await tx
        .update(userEquipmentProfiles)
        .set({ profileKind: normalized.equipmentProfileKind, updatedAt: new Date() })
        .where(eq(userEquipmentProfiles.ownerFirebaseUid, viewer.uid));
      const current = await readViewerData(tx, viewer.uid);
      await finishIdempotency(tx, viewer.uid, normalized.idempotencyKey, {
        revisionId: cloned.revisionId,
        changes: cloned.changes,
      });
      return { ...current, changes: cloned.changes };
    });
  }

  async function updatePreferences(
    viewerInput: ViewerContext | null,
    input: PreferencesUpdateInput,
  ): Promise<ProfileProgramReadModel> {
    const viewer = requirePermanentMutationViewer(viewerInput);
    const normalized = parsePreferencesUpdateInput(input);
    const requestHash = stableRequestHash("preferences-update", {
      expectedUpdatedAt: normalized.expectedUpdatedAt,
      reducedMotion: normalized.reducedMotion,
      timezone: normalized.timezone,
      unitSystem: normalized.unitSystem,
    });
    return database.transaction(async (transaction) => {
      const tx = transaction as unknown as Database;
      await tx.execute(
        sql`SELECT owner_firebase_uid FROM user_preferences WHERE owner_firebase_uid = ${viewer.uid} FOR UPDATE`,
      );
      const existingIdempotency = await findIdempotency(
        tx,
        viewer.uid,
        normalized.idempotencyKey,
      );
      if (existingIdempotency) {
        if (
          existingIdempotency.operation !== "preferences-update" ||
          existingIdempotency.requestHash !== requestHash
        ) {
          throw new RepositoryConflictError(
            "The idempotency key was already used for another request.",
          );
        }
        if (existingIdempotency.resultPayload["pending"] === false) {
          return readViewerData(tx, viewer.uid);
        }
      }
      const current = (
        await tx
          .select({ updatedAt: userPreferences.updatedAt })
          .from(userPreferences)
          .where(eq(userPreferences.ownerFirebaseUid, viewer.uid))
          .limit(1)
      )[0];
      if (!current) throw new RepositoryNotFoundError();
      if (iso(current.updatedAt) !== normalized.expectedUpdatedAt) {
        throw new RepositoryConflictError(
          "Preferences changed after this page loaded. Reload before saving.",
        );
      }
      const reservation = await reserveIdempotency(
        tx,
        viewer.uid,
        normalized.idempotencyKey,
        "preferences-update",
        requestHash,
      );
      if (reservation?.replay) return readViewerData(tx, viewer.uid);
      const updatedAt = new Date(
        Math.max(Date.now(), current.updatedAt.getTime() + 1),
      );
      const changed = await tx
        .update(userPreferences)
        .set({
          reducedMotion: normalized.reducedMotion,
          timezone: normalized.timezone,
          unitSystem: normalized.unitSystem,
          updatedAt,
        })
        .where(
          and(
            eq(userPreferences.ownerFirebaseUid, viewer.uid),
            eq(userPreferences.updatedAt, current.updatedAt),
          ),
        )
        .returning({ ownerFirebaseUid: userPreferences.ownerFirebaseUid });
      if (changed.length !== 1) {
        throw new RepositoryConflictError(
          "Preferences changed before they could be saved. Reload before retrying.",
        );
      }
      await finishIdempotency(tx, viewer.uid, normalized.idempotencyKey, {
        updatedAt: iso(updatedAt),
      });
      return readViewerData(tx, viewer.uid);
    });
  }

  return {
    onboard,
    getViewerData,
    getActiveProgram,
    confirmEquipmentChange,
    updatePreferences,
  };
}

/** Constructor-free helpers for Server Actions and route handlers. */
export async function onboardViewer(
  database: Database,
  viewer: ViewerContext | null,
  input: OnboardingInput,
): Promise<ProfileProgramReadModel> {
  return createProfileProgramRepository(database).onboard(viewer, input);
}

export async function getViewerProfileProgram(
  database: Database,
  viewer: ViewerContext | null,
): Promise<ProfileProgramReadModel> {
  return createProfileProgramRepository(database).getViewerData(viewer);
}

export async function getActiveProgram(
  database: Database,
  viewer: ViewerContext | null,
  programId?: string,
): Promise<ActiveProgramReadModel> {
  return createProfileProgramRepository(database).getActiveProgram(viewer, programId);
}

export async function confirmEquipmentChange(
  database: Database,
  viewer: ViewerContext | null,
  input: EquipmentChangeInput,
): Promise<EquipmentChangeResult> {
  return createProfileProgramRepository(database).confirmEquipmentChange(viewer, input);
}

export async function updateViewerPreferences(
  database: Database,
  viewer: ViewerContext | null,
  input: PreferencesUpdateInput,
): Promise<ProfileProgramReadModel> {
  return createProfileProgramRepository(database).updatePreferences(viewer, input);
}

// Common alternate names used by route-level callers.
export const onboardProfile = onboardViewer;
export const onboardMember = onboardViewer;
export const readViewerProfileProgram = getViewerProfileProgram;
export const getAppReadModel = getViewerProfileProgram;
export const readActiveProgram = getActiveProgram;
export const getActiveOwnedProgram = getActiveProgram;
export const changeEquipment = confirmEquipmentChange;
export const updateEquipmentProfile = confirmEquipmentChange;
