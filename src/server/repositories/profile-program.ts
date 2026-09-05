import { createHash } from "node:crypto";

import { z } from "zod";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";

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
import {
  programPublishRequestSchema,
  type ProgramPublishInput,
} from "@/domain/programs/publication";
import type { ViewerContext } from "@/server/auth/viewer";
import { AuthPolicyError } from "@/server/auth/policy";

/** The one starter template cloned by authenticated onboarding. */
export const STARTER_TEMPLATE_KEY = "five-day-starter-route" as const;
export const STARTER_PROGRAM_KEY = STARTER_TEMPLATE_KEY;
export const BLANK_PROGRAM_KEY = "blank-routine" as const;


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
export type OnboardingMode = "example" | "blank";

export type OnboardingInput = Readonly<{
  /** Preferred name. `profileKind` remains accepted for server callers. */
  equipmentProfileKind?: EquipmentProfileKind;
  profileKind?: EquipmentProfileKind;
  unitSystem?: UnitSystem;
  timezone?: string;
  reducedMotion?: boolean;
  idempotencyKey?: string;
  mode?: OnboardingMode;
  firstExerciseSlug?: string | undefined;
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

export type PublishProgramInput = ProgramPublishInput;

export type CreateStarterProgramInput = Readonly<{
  equipmentProfileKind: EquipmentProfileKind;
  idempotencyKey: string;
  name: string;
}>;

export type CreateCustomProgramInput = Readonly<{
  equipmentProfileKind: EquipmentProfileKind;
  idempotencyKey: string;
  name: string;
  dayName: string;
  sectionName: string;
  firstCatalogExerciseId: string;
}>;

export type CloneProgramInput = Readonly<{
  idempotencyKey: string;
  name: string;
  sourceProgramId: string;
  sourceRevisionId: string;
}>;

export type ActivateProgramInput = Readonly<{
  expectedActiveProgramId: string;
  idempotencyKey: string;
  programId: string;
  revisionId: string;
}>;

type NormalizedOnboardingInput = Readonly<{
  equipmentProfileKind: EquipmentProfileKind;
  unitSystem: UnitSystem;
  timezone: string;
  reducedMotion: boolean;
  idempotencyKey: string | undefined;
  mode: OnboardingMode;
  firstExerciseSlug: string | undefined;
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

type NormalizedCreateStarterProgramInput = CreateStarterProgramInput;
type NormalizedCreateCustomProgramInput = CreateCustomProgramInput;
type NormalizedCloneProgramInput = CloneProgramInput;
type NormalizedActivateProgramInput = ActivateProgramInput;

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
  prescriptionKey: string;
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
  sectionKey: string;
  kind: ProgramSectionRow["kind"];
  displayOrder: number;
  title: string;
  prescriptions: readonly ActiveProgramPrescriptionReadModel[];
}>;

export type ActiveProgramCardioReadModel = Readonly<{
  id: string;
  cardioKey: string;
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

export type ProgramSummaryReadModel = Readonly<{
  dayCount: number;
  equipmentProfileKind: EquipmentProfileKind;
  id: string;
  isActive: boolean;
  name: string;
  programKey: string;
  revisionId: string;
  revisionNumber: number;
  updatedAt: string;
}>;

export type ProfileProgramReadModel = Readonly<{
  profile: ProfileReadModel;
  preferences: PreferencesReadModel;
  equipment: EquipmentReadModel;
  programs: readonly ProgramSummaryReadModel[];
  activeProgram: ActiveProgramReadModel | null;
}>;

export type ProgramRevisionMutationResult = Readonly<
  ProfileProgramReadModel & {
    affectedProgramId: string;
    affectedRevisionId: string;
    replayed: boolean;
  }
>;

export type ProgramCollectionMutationResult = ProgramRevisionMutationResult;

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
  ProgramRevisionMutationResult & {
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
  publishProgram(
    viewer: ViewerContext | null,
    input: PublishProgramInput,
  ): Promise<ProgramRevisionMutationResult>;
  createProgramFromStarter(
    viewer: ViewerContext | null,
    input: CreateStarterProgramInput,
  ): Promise<ProgramCollectionMutationResult>;
  createCustomProgram(
    viewer: ViewerContext | null,
    input: CreateCustomProgramInput,
  ): Promise<ProgramCollectionMutationResult>;
  cloneProgram(
    viewer: ViewerContext | null,
    input: CloneProgramInput,
  ): Promise<ProgramCollectionMutationResult>;
  activateProgram(
    viewer: ViewerContext | null,
    input: ActivateProgramInput,
  ): Promise<ProgramCollectionMutationResult>;
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
    mode: z.enum(["example", "blank"]).optional(),
    firstExerciseSlug: z.string().trim().min(1).max(120).optional(),
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
const programNameSchema = z.string().trim().min(1).max(80);
const requiredIdempotencyKeySchema = z.string().trim().min(1).max(180);
const createStarterProgramSchema = z
  .object({
    equipmentProfileKind: profileKindSchema,
    idempotencyKey: requiredIdempotencyKeySchema,
    name: programNameSchema,
  })
  .strict();
const createCustomProgramSchema = z
  .object({
    equipmentProfileKind: profileKindSchema,
    idempotencyKey: requiredIdempotencyKeySchema,
    name: programNameSchema,
    dayName: z.string().trim().min(1).max(120),
    sectionName: z.string().trim().min(1).max(120),
    firstCatalogExerciseId: z.string().uuid(),
  })
  .strict();
const cloneProgramSchema = z
  .object({
    idempotencyKey: requiredIdempotencyKeySchema,
    name: programNameSchema,
    sourceProgramId: z.string().uuid(),
    sourceRevisionId: z.string().uuid(),
  })
  .strict();
const activateProgramSchema = z
  .object({
    expectedActiveProgramId: z.string().uuid(),
    idempotencyKey: requiredIdempotencyKeySchema,
    programId: z.string().uuid(),
    revisionId: z.string().uuid(),
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
  if (parsed.mode === "blank" && !parsed.firstExerciseSlug) {
    throw new RepositoryValidationError("Add your first movement before saving a routine.");
  }
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
    mode: parsed.mode ?? "example",
    firstExerciseSlug: parsed.firstExerciseSlug,
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

function parseCreateStarterProgramInput(
  input: CreateStarterProgramInput,
): NormalizedCreateStarterProgramInput {
  const result = createStarterProgramSchema.safeParse(input);
  if (!result.success) {
    throw new RepositoryValidationError("The new program data is invalid.");
  }
  return result.data;
}

function parseCreateCustomProgramInput(
  input: CreateCustomProgramInput,
): NormalizedCreateCustomProgramInput {
  const result = createCustomProgramSchema.safeParse(input);
  if (!result.success) {
    if (
      result.error.issues.some((issue) => issue.path[0] === "firstCatalogExerciseId")
    ) {
      throw new RepositoryNotFoundError();
    }
    throw new RepositoryValidationError("The custom program data is invalid.");
  }
  return result.data;
}

function parseCloneProgramInput(
  input: CloneProgramInput,
): NormalizedCloneProgramInput {
  const result = cloneProgramSchema.safeParse(input);
  if (!result.success) {
    if (
      result.error.issues.some(
        (issue) =>
          issue.path[0] === "sourceProgramId" ||
          issue.path[0] === "sourceRevisionId",
      )
    ) {
      throw new RepositoryNotFoundError();
    }
    throw new RepositoryValidationError("The program clone data is invalid.");
  }
  return result.data;
}

function parseActivateProgramInput(
  input: ActivateProgramInput,
): NormalizedActivateProgramInput {
  const result = activateProgramSchema.safeParse(input);
  if (!result.success) {
    if (
      result.error.issues.some((issue) =>
        ["expectedActiveProgramId", "programId", "revisionId"].includes(
          String(issue.path[0]),
        ),
      )
    ) {
      throw new RepositoryNotFoundError();
    }
    throw new RepositoryValidationError("The active program data is invalid.");
  }
  return result.data;
}

function parseProgramPublishInput(input: PublishProgramInput): ProgramPublishInput {
  const result = programPublishRequestSchema.safeParse(input);
  if (!result.success) {
    const identifierIssue = result.error.issues.some((issue) =>
      issue.path.some((part) =>
        typeof part === "string" &&
        [
          "baseRevisionId",
          "catalogExerciseId",
          "customExerciseId",
          "programId",
          "sourcePrescriptionId",
        ].includes(part),
      ),
    );
    if (identifierIssue) throw new RepositoryNotFoundError();
    throw new RepositoryValidationError("The program publication data is invalid.");
  }
  return result.data;
}

function stableRequestHash(operation: string, value: Readonly<Record<string, unknown>>): string {
  return createHash("sha256")
    .update(`${operation}:${JSON.stringify(value)}`, "utf8")
    .digest("hex");
}

function scopedUuid(kind: string, ownerFirebaseUid: string, key: string): string {
  return deterministicSeedUuid(kind, `${ownerFirebaseUid}:${key}`);
}

function topologyKey(
  kind: "section" | "prescription" | "cardio",
  ownerFirebaseUid: string,
  key: string,
): string {
  return scopedUuid(`program-${kind}-key`, ownerFirebaseUid, key);
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

async function loadCompatibleCatalogExercise(
  database: RepositoryDatabase,
  exerciseId: string,
  profileKind: EquipmentProfileKind,
): Promise<CatalogExerciseRow> {
  const exercise = (
    await database
      .select()
      .from(catalogExercises)
      .where(eq(catalogExercises.id, exerciseId))
      .limit(1)
  )[0];
  if (!exercise) throw new RepositoryNotFoundError();
  const requiredEquipment = await database
    .select({ equipmentId: exerciseEquipment.equipmentId })
    .from(exerciseEquipment)
    .where(eq(exerciseEquipment.exerciseId, exercise.id));
  const availableEquipment = new Set<EquipmentId>(
    EQUIPMENT_PROFILES[profileKind].equipment,
  );
  if (
    requiredEquipment.some(({ equipmentId: required }) =>
      !availableEquipment.has(equipmentId(required)),
    )
  ) {
    throw new RepositoryValidationError(
      "The first movement is incompatible with the selected equipment profile.",
    );
  }
  return exercise;
}

async function loadCompatibleCatalogExerciseBySlug(
  database: RepositoryDatabase,
  slug: string,
  profileKind: EquipmentProfileKind,
): Promise<CatalogExerciseRow> {
  const exercise = (
    await database
      .select({ id: catalogExercises.id })
      .from(catalogExercises)
      .where(eq(catalogExercises.slug, slug))
      .limit(1)
  )[0];
  if (!exercise) throw new RepositoryNotFoundError();
  return loadCompatibleCatalogExercise(database, exercise.id, profileKind);
}

function customPrescriptionDefaults(
  loggingKind: CatalogExerciseRow["loggingKind"],
): Readonly<{
  measurementKind: ProgramPrescriptionRow["measurementKind"];
  minimumReps: number | null;
  maximumReps: number | null;
  minimumSeconds: number | null;
  maximumSeconds: number | null;
  targetWeightKg: number | null;
  targetDistanceM: number | null;
}> {
  switch (loggingKind) {
    case "weight_reps":
      return {
        measurementKind: "weight_reps",
        minimumReps: 8,
        maximumReps: 12,
        minimumSeconds: null,
        maximumSeconds: null,
        targetWeightKg: null,
        targetDistanceM: null,
      };
    case "bodyweight_reps":
      return {
        measurementKind: "bodyweight_reps",
        minimumReps: 8,
        maximumReps: 12,
        minimumSeconds: null,
        maximumSeconds: null,
        targetWeightKg: null,
        targetDistanceM: null,
      };
    case "duration":
      return {
        measurementKind: "duration",
        minimumReps: null,
        maximumReps: null,
        minimumSeconds: 30,
        maximumSeconds: 60,
        targetWeightKg: null,
        targetDistanceM: null,
      };
    case "distance_duration":
      return {
        measurementKind: "distance_duration",
        minimumReps: null,
        maximumReps: null,
        minimumSeconds: 60,
        maximumSeconds: 120,
        targetWeightKg: null,
        targetDistanceM: 1_000,
      };
  }
}

async function insertMinimalPublishedProgram(
  database: RepositoryDatabase,
  ownerFirebaseUid: string,
  input: Readonly<{
    dayName: string;
    equipmentProfileKind: EquipmentProfileKind;
    exercise: CatalogExerciseRow;
    isActive: boolean;
    name: string;
    programId: string;
    programKey: string;
    sectionName: string;
    topologySeed: string;
  }>,
): Promise<Readonly<{ programId: string; revisionId: string }>> {
  const defaults = customPrescriptionDefaults(input.exercise.loggingKind);
  const revisionId = scopedUuid(
    "program-revision",
    ownerFirebaseUid,
    `${input.programId}:custom:${input.topologySeed}`,
  );
  const dayKey = scopedUuid(
    "program-day-key",
    ownerFirebaseUid,
    `${input.programId}:custom:day`,
  );
  const sectionKey = topologyKey(
    "section",
    ownerFirebaseUid,
    `${input.programId}:custom:section`,
  );
  const prescriptionKey = topologyKey(
    "prescription",
    ownerFirebaseUid,
    `${input.programId}:custom:prescription`,
  );
  const dayId = scopedUuid(
    "program-day",
    ownerFirebaseUid,
    `${input.programId}:${revisionId}:day`,
  );
  const sectionId = scopedUuid(
    "program-section",
    ownerFirebaseUid,
    `${input.programId}:${revisionId}:section`,
  );
  const prescriptionId = scopedUuid(
    "program-prescription",
    ownerFirebaseUid,
    `${input.programId}:${revisionId}:prescription`,
  );
  const now = new Date();

  await database.insert(userPrograms).values({
    activeRevisionId: null,
    id: input.programId,
    isActive: input.isActive,
    name: input.name,
    ownerFirebaseUid,
    programKey: input.programKey,
    updatedAt: now,
  });
  await database.insert(programRevisions).values({
    id: revisionId,
    ownerFirebaseUid,
    programId: input.programId,
    revisionNumber: 1,
    status: "draft",
    equipmentProfileKind: input.equipmentProfileKind,
    sourceTemplateRevisionId: null,
    publishedAt: null,
  });
  await database.insert(programDays).values({
    id: dayId,
    ownerFirebaseUid,
    programId: input.programId,
    revisionId,
    dayNumber: 1,
    dayKey,
    displayName: input.dayName,
  });
  await database.insert(programSections).values({
    id: sectionId,
    ownerFirebaseUid,
    programId: input.programId,
    revisionId,
    dayId,
    sectionKey,
    kind: "strength",
    displayOrder: 1,
    title: input.sectionName,
  });
  await database.insert(programPrescriptions).values({
    id: prescriptionId,
    ownerFirebaseUid,
    programId: input.programId,
    revisionId,
    sectionId,
    prescriptionKey,
    catalogExerciseId: input.exercise.id,
    customExerciseId: null,
    displayName: null,
    displayOrder: 1,
    setKind: "work",
    setCount: 3,
    measurementKind: defaults.measurementKind,
    minimumReps: defaults.minimumReps,
    maximumReps: defaults.maximumReps,
    minimumSeconds: defaults.minimumSeconds,
    maximumSeconds: defaults.maximumSeconds,
    restSeconds: 90,
    targetWeightKg: defaults.targetWeightKg,
    targetDistanceM: defaults.targetDistanceM,
    notes: null,
    targetMetadata: {},
  });
  const published = await database
    .update(programRevisions)
    .set({ status: "published", publishedAt: now })
    .where(
      and(
        eq(programRevisions.ownerFirebaseUid, ownerFirebaseUid),
        eq(programRevisions.programId, input.programId),
        eq(programRevisions.id, revisionId),
        eq(programRevisions.status, "draft"),
      ),
    )
    .returning({ id: programRevisions.id });
  if (published.length !== 1) {
    throw new RepositoryConflictError("The custom program could not be published safely.");
  }
  const linked = await database
    .update(userPrograms)
    .set({ activeRevisionId: revisionId, updatedAt: now })
    .where(
      and(
        eq(userPrograms.ownerFirebaseUid, ownerFirebaseUid),
        eq(userPrograms.id, input.programId),
        isNull(userPrograms.activeRevisionId),
      ),
    )
    .returning({ id: userPrograms.id });
  if (linked.length !== 1) {
    throw new RepositoryConflictError("The custom program revision could not be linked.");
  }
  return { programId: input.programId, revisionId };
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
      .orderBy(asc(programCardioPrescriptions.dayId), asc(programCardioPrescriptions.displayOrder)),
  ]);
  return {
    revision,
    days,
    sections,
    prescriptions,
    cardio,
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
      prescriptionKey: row.prescriptionKey,
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
        sectionKey: section.sectionKey,
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
        cardioKey: row.cardioKey,
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
        : sql`SELECT id FROM user_programs WHERE owner_firebase_uid = ${ownerFirebaseUid} AND is_active = true FOR UPDATE`,
    );
  }
  const conditions = [eq(userPrograms.ownerFirebaseUid, ownerFirebaseUid)];
  if (programId) conditions.push(eq(userPrograms.id, programId));
  else conditions.push(eq(userPrograms.isActive, true));
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

async function readProgramSummaries(
  database: RepositoryDatabase,
  ownerFirebaseUid: string,
): Promise<
  readonly Readonly<{
    root: typeof userPrograms.$inferSelect;
    summary: ProgramSummaryReadModel;
  }>[]
> {
  const rows = await database
    .select({ revision: programRevisions, root: userPrograms })
    .from(userPrograms)
    .leftJoin(
      programRevisions,
      and(
        eq(programRevisions.ownerFirebaseUid, userPrograms.ownerFirebaseUid),
        eq(programRevisions.programId, userPrograms.id),
        eq(programRevisions.id, userPrograms.activeRevisionId),
      ),
    )
    .where(eq(userPrograms.ownerFirebaseUid, ownerFirebaseUid))
    .orderBy(
      desc(userPrograms.isActive),
      desc(userPrograms.updatedAt),
      asc(userPrograms.id),
    );
  const revisionIds = rows.flatMap(({ revision }) =>
    revision?.id ? [revision.id] : [],
  );
  const dayCountRows = revisionIds.length
    ? await database
        .select({
          dayCount: sql<number>`count(*)`,
          revisionId: programDays.revisionId,
        })
        .from(programDays)
        .where(
          and(
            eq(programDays.ownerFirebaseUid, ownerFirebaseUid),
            inArray(programDays.revisionId, revisionIds),
          ),
        )
        .groupBy(programDays.revisionId)
    : [];
  const dayCountByRevision = new Map(
    dayCountRows.map((row) => [row.revisionId, Number(row.dayCount)] as const),
  );
  return rows.map(({ revision, root }) => {
    if (
      !revision ||
      revision.status !== "published" ||
      !revision.publishedAt ||
      !root.activeRevisionId
    ) {
      throw new RepositoryConflictError(
        "A saved program is incomplete and cannot be opened.",
      );
    }
    return {
      root,
      summary: {
        dayCount: dayCountByRevision.get(revision.id) ?? 0,
        equipmentProfileKind: revision.equipmentProfileKind,
        id: root.id,
        isActive: root.isActive,
        name: root.name,
        programKey: root.programKey,
        revisionId: revision.id,
        revisionNumber: revision.revisionNumber,
        updatedAt: iso(root.updatedAt),
      },
    };
  });
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
  const collection = await readProgramSummaries(database, ownerFirebaseUid);
  const active = collection.filter(({ root }) => root.isActive);
  if (collection.length > 0 && active.length !== 1) {
    throw new RepositoryConflictError(
      "The active program selection needs recovery before training can continue.",
    );
  }
  const activeProgram = active[0]
    ? await readProgramModel(database, active[0].root)
    : null;
  return {
    profile,
    preferences,
    equipment,
    programs: collection.map(({ summary }) => summary),
    activeProgram,
  };
}

async function lockProgramCollection(
  database: RepositoryDatabase,
  ownerFirebaseUid: string,
): Promise<readonly (typeof userPrograms.$inferSelect)[]> {
  await database.execute(
    sql`SELECT firebase_uid FROM user_profiles WHERE firebase_uid = ${ownerFirebaseUid} FOR UPDATE`,
  );
  await database.execute(
    sql`SELECT id FROM user_programs WHERE owner_firebase_uid = ${ownerFirebaseUid} ORDER BY id FOR UPDATE`,
  );
  return database
    .select()
    .from(userPrograms)
    .where(eq(userPrograms.ownerFirebaseUid, ownerFirebaseUid))
    .orderBy(asc(userPrograms.id));
}

async function activateProgramRoot(
  database: RepositoryDatabase,
  ownerFirebaseUid: string,
  current: typeof userPrograms.$inferSelect,
  target: typeof userPrograms.$inferSelect,
  targetRevision: ProgramRevisionRow,
  now: Date,
): Promise<void> {
  if (
    !target.activeRevisionId ||
    target.activeRevisionId !== targetRevision.id ||
    targetRevision.status !== "published" ||
    !targetRevision.publishedAt
  ) {
    throw new RepositoryNotFoundError();
  }
  if (current.id !== target.id) {
    const demoted = await database
      .update(userPrograms)
      .set({ isActive: false, updatedAt: now })
      .where(
        and(
          eq(userPrograms.ownerFirebaseUid, ownerFirebaseUid),
          eq(userPrograms.id, current.id),
          eq(userPrograms.isActive, true),
        ),
      )
      .returning({ id: userPrograms.id });
    if (demoted.length !== 1) {
      throw new RepositoryConflictError(
        "The active program changed before this selection could be saved.",
      );
    }
    const promoted = await database
      .update(userPrograms)
      .set({ isActive: true, updatedAt: now })
      .where(
        and(
          eq(userPrograms.ownerFirebaseUid, ownerFirebaseUid),
          eq(userPrograms.id, target.id),
          eq(userPrograms.activeRevisionId, targetRevision.id),
          eq(userPrograms.isActive, false),
        ),
      )
      .returning({ id: userPrograms.id });
    if (promoted.length !== 1) {
      throw new RepositoryConflictError(
        "The selected program changed before it could become active.",
      );
    }
  }
  await database
    .update(userEquipmentProfiles)
    .set({
      profileKind: targetRevision.equipmentProfileKind,
      updatedAt: now,
    })
    .where(eq(userEquipmentProfiles.ownerFirebaseUid, ownerFirebaseUid));
}

function replayAffectedProgram(
  payload: Record<string, unknown>,
): Readonly<{ programId: string; revisionId: string }> {
  const programId = z.string().uuid().safeParse(payload["programId"]);
  const revisionId = z.string().uuid().safeParse(payload["revisionId"]);
  if (!programId.success || !revisionId.success) {
    throw new RepositoryConflictError("The stored idempotency result is invalid.");
  }
  return { programId: programId.data, revisionId: revisionId.data };
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
  await database.execute(
    sql`SELECT idempotency_key FROM idempotency_keys WHERE owner_firebase_uid = ${ownerFirebaseUid} AND idempotency_key = ${key} FOR UPDATE`,
  );
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
        sectionKey: topologyKey(
          "section",
          ownerFirebaseUid,
          `template:${template.revision.id}:${section.id}`,
        ),
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
  const nextCardioOrderByDay = new Map<string, number>();
  const cardioOrderById = new Map(
    template.cardio.map((cardio) => {
      const displayOrder = (nextCardioOrderByDay.get(cardio.dayId) ?? 0) + 1;
      nextCardioOrderByDay.set(cardio.dayId, displayOrder);
      return [cardio.id, displayOrder] as const;
    }),
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
        prescriptionKey: topologyKey(
          "prescription",
          ownerFirebaseUid,
          `template:${template.revision.id}:${prescription.id}`,
        ),
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
  if (template.cardio.length > 0) {
    await database
      .insert(programCardioPrescriptions)
      .values(
        template.cardio.map((cardio) => ({
          id: scopedUuid("program-cardio", ownerFirebaseUid, `${programId}:${revisionId}:${cardio.id}`),
          ownerFirebaseUid,
          programId,
          revisionId,
          dayId: programDayIds.get(cardio.dayId)!,
          cardioKey: topologyKey(
            "cardio",
            ownerFirebaseUid,
            `template:${template.revision.id}:${cardio.id}`,
          ),
          displayOrder: cardioOrderById.get(cardio.id)!,
          mode: cardio.mode,
          durationSeconds: cardio.durationSeconds,
          distanceM: cardio.distanceM,
          paceSecondsPerKm: cardio.paceSecondsPerKm,
          inclinePercent: cardio.inclinePercent,
          notes: cardio.notes,
        })),
      )
      .onConflictDoNothing();
  }

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

async function cloneProgramGraphRevision(
  database: RepositoryDatabase,
  ownerFirebaseUid: string,
  targetProgramId: string,
  source: ProgramGraph,
  now: Date,
): Promise<string> {
  const customExerciseIds = source.prescriptions.flatMap((prescription) =>
    prescription.customExerciseId ? [prescription.customExerciseId] : [],
  );
  const customExerciseRows = await loadCustomExercises(
    database,
    ownerFirebaseUid,
    customExerciseIds,
  );
  if (customExerciseRows.size !== new Set(customExerciseIds).size) {
    throw new RepositoryNotFoundError();
  }

  const revisionId = scopedUuid(
    "program-revision",
    ownerFirebaseUid,
    `${targetProgramId}:clone:${source.revision.id}`,
  );
  const programDayId = (sourceId: string): string =>
    scopedUuid(
      "program-day",
      ownerFirebaseUid,
      `${targetProgramId}:${revisionId}:${sourceId}`,
    );
  const programSectionId = (sourceId: string): string =>
    scopedUuid(
      "program-section",
      ownerFirebaseUid,
      `${targetProgramId}:${revisionId}:${sourceId}`,
    );

  await database.insert(programRevisions).values({
    equipmentProfileKind: source.revision.equipmentProfileKind,
    id: revisionId,
    ownerFirebaseUid,
    programId: targetProgramId,
    publishedAt: null,
    revisionNumber: 1,
    sourceTemplateRevisionId: source.revision.sourceTemplateRevisionId,
    status: "draft",
  });
  await database.insert(programDays).values(
    source.days.map((day) => ({
      dayKey: day.dayKey,
      dayNumber: day.dayNumber,
      displayName: day.displayName,
      id: programDayId(day.id),
      ownerFirebaseUid,
      programId: targetProgramId,
      revisionId,
    })),
  );
  await database.insert(programSections).values(
    source.sections.map((section) => ({
      dayId: programDayId(section.dayId),
      displayOrder: section.displayOrder,
      id: programSectionId(section.id),
      kind: section.kind,
      ownerFirebaseUid,
      programId: targetProgramId,
      revisionId,
      sectionKey: section.sectionKey,
      title: section.title,
    })),
  );
  await database.insert(programPrescriptions).values(
    source.prescriptions.map((prescription) => ({
      catalogExerciseId: prescription.catalogExerciseId,
      customExerciseId: prescription.customExerciseId,
      displayName: prescription.displayName,
      displayOrder: prescription.displayOrder,
      id: scopedUuid(
        "program-prescription",
        ownerFirebaseUid,
        `${targetProgramId}:${revisionId}:${prescription.id}`,
      ),
      maximumReps: prescription.maximumReps,
      maximumSeconds: prescription.maximumSeconds,
      measurementKind: prescription.measurementKind,
      minimumReps: prescription.minimumReps,
      minimumSeconds: prescription.minimumSeconds,
      notes: prescription.notes,
      ownerFirebaseUid,
      programId: targetProgramId,
      restSeconds: prescription.restSeconds,
      revisionId,
      sectionId: programSectionId(prescription.sectionId),
      prescriptionKey: prescription.prescriptionKey,
      setCount: prescription.setCount,
      setKind: prescription.setKind,
      targetDistanceM: prescription.targetDistanceM,
      targetMetadata: cloneJson(prescription.targetMetadata),
      targetWeightKg: prescription.targetWeightKg,
    })),
  );
  if (source.cardio.length > 0) {
    await database.insert(programCardioPrescriptions).values(
      source.cardio.map((cardio) => ({
        dayId: programDayId(cardio.dayId),
        displayOrder: cardio.displayOrder,
        distanceM: cardio.distanceM,
        durationSeconds: cardio.durationSeconds,
        id: scopedUuid(
          "program-cardio",
          ownerFirebaseUid,
          `${targetProgramId}:${revisionId}:${cardio.id}`,
        ),
        inclinePercent: cardio.inclinePercent,
        mode: cardio.mode,
        notes: cardio.notes,
        ownerFirebaseUid,
        paceSecondsPerKm: cardio.paceSecondsPerKm,
        programId: targetProgramId,
        revisionId,
        cardioKey: cardio.cardioKey,
      })),
    );
  }
  const published = await database
    .update(programRevisions)
    .set({ publishedAt: now, status: "published" })
    .where(
      and(
        eq(programRevisions.ownerFirebaseUid, ownerFirebaseUid),
        eq(programRevisions.programId, targetProgramId),
        eq(programRevisions.id, revisionId),
        eq(programRevisions.status, "draft"),
      ),
    )
    .returning({ id: programRevisions.id });
  if (published.length !== 1) {
    throw new RepositoryConflictError("The cloned revision could not be published.");
  }
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
      sourceTemplateRevisionId: source.revision.sourceTemplateRevisionId,
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
        sectionKey: section.sectionKey,
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
            prescriptionKey: prescription.prescriptionKey,
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
          prescriptionKey: prescription.prescriptionKey,
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
  if (source.cardio.length > 0) {
    await database
      .insert(programCardioPrescriptions)
      .values(
        source.cardio.map((cardio) => ({
          id: scopedUuid("program-cardio", ownerFirebaseUid, `${root.id}:${revisionId}:${cardio.id}`),
          ownerFirebaseUid,
          programId: root.id,
          revisionId,
          dayId: programDayId(cardio.dayId),
          cardioKey: cardio.cardioKey,
          displayOrder: cardio.displayOrder,
          mode: cardio.mode,
          durationSeconds: cardio.durationSeconds,
          distanceM: cardio.distanceM,
          paceSecondsPerKm: cardio.paceSecondsPerKm,
          inclinePercent: cardio.inclinePercent,
          notes: cardio.notes,
        })),
      )
      .onConflictDoNothing();
  }
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

function assertPublicationMeasurement(
  loggingKind: CatalogExerciseRow["loggingKind"],
  prescription: ProgramPublishInput["days"][number]["sections"][number]["prescriptions"][number],
): void {
  const hasRepetitions =
    prescription.minimumReps !== null && prescription.maximumReps !== null;
  const hasDuration =
    prescription.minimumSeconds !== null && prescription.maximumSeconds !== null;
  const hasWeight = prescription.targetWeightKg !== null;
  const hasDistance = prescription.targetDistanceM !== null;
  const valid =
    (loggingKind === "weight_reps" && hasRepetitions && !hasDuration && !hasDistance) ||
    (loggingKind === "bodyweight_reps" &&
      hasRepetitions &&
      !hasDuration &&
      !hasWeight &&
      !hasDistance) ||
    (loggingKind === "duration" &&
      !hasRepetitions &&
      hasDuration &&
      !hasWeight &&
      !hasDistance) ||
    (loggingKind === "distance_duration" &&
      !hasRepetitions &&
      hasDuration &&
      !hasWeight &&
      hasDistance &&
      prescription.targetDistanceM! > 0);
  if (!valid) {
    throw new RepositoryValidationError(
      "A prescription does not match the selected exercise logging type.",
    );
  }
}

async function publishEditedProgramRevision(
  database: RepositoryDatabase,
  ownerFirebaseUid: string,
  root: typeof userPrograms.$inferSelect,
  source: ProgramGraph,
  input: ProgramPublishInput,
  requestHash: string,
  now: Date,
): Promise<string> {
  const requestedPrescriptions = input.days.flatMap((day) =>
    day.sections.flatMap((section) => section.prescriptions),
  );
  const catalogIds = [
    ...new Set(
      requestedPrescriptions.flatMap(({ catalogExerciseId }) =>
        catalogExerciseId === null ? [] : [catalogExerciseId],
      ),
    ),
  ];
  const customIds = [
    ...new Set(
      requestedPrescriptions.flatMap(({ customExerciseId }) =>
        customExerciseId === null ? [] : [customExerciseId],
      ),
    ),
  ];
  const [catalogById, customById, catalogEquipmentRows, customEquipmentRows] =
    await Promise.all([
      loadCatalogExercises(database, catalogIds),
      loadCustomExercises(database, ownerFirebaseUid, customIds),
      catalogIds.length === 0
        ? []
        : database
            .select({
              exerciseId: exerciseEquipment.exerciseId,
              equipmentId: exerciseEquipment.equipmentId,
            })
            .from(exerciseEquipment)
            .where(inArray(exerciseEquipment.exerciseId, catalogIds)),
      customIds.length === 0
        ? []
        : database
            .select({
              customExerciseId: customExerciseEquipment.customExerciseId,
              equipmentId: customExerciseEquipment.equipmentId,
            })
            .from(customExerciseEquipment)
            .where(
              and(
                eq(customExerciseEquipment.ownerFirebaseUid, ownerFirebaseUid),
                inArray(customExerciseEquipment.customExerciseId, customIds),
              ),
            ),
    ]);
  if (catalogById.size !== catalogIds.length || customById.size !== customIds.length) {
    throw new RepositoryNotFoundError();
  }

  const equipmentByCatalog = new Map<string, Set<EquipmentId>>();
  for (const row of catalogEquipmentRows) {
    const values = equipmentByCatalog.get(row.exerciseId) ?? new Set<EquipmentId>();
    values.add(equipmentId(row.equipmentId));
    equipmentByCatalog.set(row.exerciseId, values);
  }
  const equipmentByCustom = new Map<string, Set<EquipmentId>>();
  for (const row of customEquipmentRows) {
    const values =
      equipmentByCustom.get(row.customExerciseId) ?? new Set<EquipmentId>();
    values.add(equipmentId(row.equipmentId));
    equipmentByCustom.set(row.customExerciseId, values);
  }
  const availableEquipment = new Set<EquipmentId>(
    EQUIPMENT_PROFILES[source.revision.equipmentProfileKind].equipment,
  );
  const sourcePrescriptionById = new Map(
    source.prescriptions.map((prescription) => [prescription.id, prescription] as const),
  );
  const sourceDayKeys = new Set(source.days.map(({ dayKey }) => dayKey));
  for (const day of input.days) {
    if (!z.string().uuid().safeParse(day.dayKey).success && !sourceDayKeys.has(day.dayKey)) {
      throw new RepositoryValidationError(
        "Legacy day keys must already exist in the active revision.",
      );
    }
  }

  for (const prescription of requestedPrescriptions) {
    const catalog = prescription.catalogExerciseId
      ? catalogById.get(prescription.catalogExerciseId)
      : undefined;
    const custom = prescription.customExerciseId
      ? customById.get(prescription.customExerciseId)
      : undefined;
    const loggingKind = catalog?.loggingKind ?? custom?.loggingKind;
    if (!loggingKind) throw new RepositoryNotFoundError();
    assertPublicationMeasurement(loggingKind, prescription);
    const requiredEquipment = catalog
      ? equipmentByCatalog.get(catalog.id) ?? new Set<EquipmentId>()
      : equipmentByCustom.get(custom!.id) ?? new Set<EquipmentId>();
    if ([...requiredEquipment].some((equipment) => !availableEquipment.has(equipment))) {
      throw new RepositoryValidationError(
        "An exercise is incompatible with the active equipment profile.",
      );
    }
    if (
      prescription.sourcePrescriptionId !== null &&
      !sourcePrescriptionById.has(prescription.sourcePrescriptionId)
    ) {
      throw new RepositoryNotFoundError();
    }
  }

  const revisionNumber = source.revision.revisionNumber + 1;
  const revisionId = scopedUuid(
    "program-revision",
    ownerFirebaseUid,
    `${root.id}:${source.revision.id}:editor:${requestHash}`,
  );
  await database.insert(programRevisions).values({
    id: revisionId,
    ownerFirebaseUid,
    programId: root.id,
    revisionNumber,
    status: "draft",
    equipmentProfileKind: source.revision.equipmentProfileKind,
    sourceTemplateRevisionId: source.revision.sourceTemplateRevisionId,
    publishedAt: null,
  });

  const dayId = (dayKey: string): string =>
    scopedUuid("program-day", ownerFirebaseUid, `${revisionId}:${dayKey}`);
  const sectionId = (sectionKey: string): string =>
    scopedUuid("program-section", ownerFirebaseUid, `${revisionId}:${sectionKey}`);
  const prescriptionId = (prescriptionKey: string): string =>
    scopedUuid("program-prescription", ownerFirebaseUid, `${revisionId}:${prescriptionKey}`);
  const cardioId = (cardioKey: string): string =>
    scopedUuid("program-cardio", ownerFirebaseUid, `${revisionId}:${cardioKey}`);
  await database.insert(programDays).values(
    input.days.map((day) => ({
      id: dayId(day.dayKey),
      ownerFirebaseUid,
      programId: root.id,
      revisionId,
      dayNumber: day.dayNumber,
      dayKey: day.dayKey,
      displayName: day.displayName,
    })),
  );
  await database.insert(programSections).values(
    input.days.flatMap((day) =>
      day.sections.map((section, sectionIndex) => ({
        id: sectionId(section.sectionKey),
        ownerFirebaseUid,
        programId: root.id,
        revisionId,
        dayId: dayId(day.dayKey),
        sectionKey: section.sectionKey,
        kind: section.kind,
        displayOrder: sectionIndex + 1,
        title: section.title,
      })),
    ),
  );
  await database.insert(programPrescriptions).values(
    input.days.flatMap((day) =>
      day.sections.flatMap((section) =>
        section.prescriptions.map((prescription, prescriptionIndex) => {
          const catalog = prescription.catalogExerciseId
            ? catalogById.get(prescription.catalogExerciseId)
            : undefined;
          const custom = prescription.customExerciseId
            ? customById.get(prescription.customExerciseId)
            : undefined;
          const loggingKind = catalog?.loggingKind ?? custom?.loggingKind;
          if (!loggingKind) throw new RepositoryNotFoundError();
          const sourcePrescription = prescription.sourcePrescriptionId
            ? sourcePrescriptionById.get(prescription.sourcePrescriptionId)
            : undefined;
          const sameExercise =
            sourcePrescription !== undefined &&
            sourcePrescription.catalogExerciseId === prescription.catalogExerciseId &&
            sourcePrescription.customExerciseId === prescription.customExerciseId;
          return {
            id: prescriptionId(prescription.prescriptionKey),
            ownerFirebaseUid,
            programId: root.id,
            revisionId,
            sectionId: sectionId(section.sectionKey),
            prescriptionKey: prescription.prescriptionKey,
            catalogExerciseId: prescription.catalogExerciseId,
            customExerciseId: prescription.customExerciseId,
            displayName: prescription.displayName,
            displayOrder: prescriptionIndex + 1,
            setKind: prescription.setKind,
            setCount: prescription.setCount,
            measurementKind: loggingKind,
            minimumReps: prescription.minimumReps,
            maximumReps: prescription.maximumReps,
            minimumSeconds: prescription.minimumSeconds,
            maximumSeconds: prescription.maximumSeconds,
            restSeconds: prescription.restSeconds,
            targetWeightKg: prescription.targetWeightKg,
            targetDistanceM: prescription.targetDistanceM,
            notes: prescription.notes,
            targetMetadata: sameExercise
              ? cloneJson(sourcePrescription.targetMetadata)
              : {},
          };
        }),
      ),
    ),
  );
  const requestedCardio = input.days.flatMap((day) =>
    day.cardio.map((cardio, cardioIndex) => ({
      id: cardioId(cardio.cardioKey),
      ownerFirebaseUid,
      programId: root.id,
      revisionId,
      dayId: dayId(day.dayKey),
      cardioKey: cardio.cardioKey,
      displayOrder: cardioIndex + 1,
      mode: cardio.mode,
      durationSeconds: cardio.durationSeconds,
      distanceM: cardio.distanceM,
      paceSecondsPerKm: cardio.paceSecondsPerKm,
      inclinePercent: cardio.inclinePercent,
      notes: cardio.notes,
    })),
  );
  if (requestedCardio.length > 0) {
    await database.insert(programCardioPrescriptions).values(requestedCardio);
  }
  const published = await database
    .update(programRevisions)
    .set({ status: "published", publishedAt: now })
    .where(
      and(
        eq(programRevisions.ownerFirebaseUid, ownerFirebaseUid),
        eq(programRevisions.programId, root.id),
        eq(programRevisions.id, revisionId),
        eq(programRevisions.status, "draft"),
      ),
    )
    .returning({ id: programRevisions.id });
  if (published.length !== 1) {
    throw new RepositoryConflictError("The edited program could not be published safely.");
  }
  return revisionId;
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
      mode: normalized.mode,
      firstExerciseSlug: normalized.firstExerciseSlug,
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
        if (reservation.replay["mode"] !== normalized.mode) {
          throw new RepositoryConflictError("The stored idempotency result is invalid.");
        }
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
      const roots = await lockProgramCollection(tx, viewer.uid);
      const expectedProgramKey = normalized.mode === "example"
        ? STARTER_PROGRAM_KEY
        : BLANK_PROGRAM_KEY;
      if (roots.length > 0) {
        if (
          roots.length !== 1 ||
          roots[0]?.programKey !== expectedProgramKey ||
          !roots[0].isActive ||
          !roots[0].activeRevisionId
        ) {
          throw new RepositoryConflictError(
            "Onboarding is already complete for this account.",
          );
        }
      } else if (normalized.mode === "example") {
        const template = await loadTemplateGraph(tx, normalized.equipmentProfileKind);
        const programId = scopedUuid("user-program", viewer.uid, STARTER_PROGRAM_KEY);
        await tx.insert(userPrograms).values({
          id: programId,
          ownerFirebaseUid: viewer.uid,
          programKey: STARTER_PROGRAM_KEY,
          name: "Five-day starter route",
          activeRevisionId: null,
          isActive: true,
        });
        const root = await findProgramRoot(tx, viewer.uid, programId, true);
        const revisionId = await cloneTemplateRevision(tx, viewer.uid, root.id, template, new Date());
        await tx
          .update(userPrograms)
          .set({ activeRevisionId: revisionId, updatedAt: new Date() })
          .where(
            and(
              eq(userPrograms.ownerFirebaseUid, viewer.uid),
              eq(userPrograms.id, root.id),
              isNull(userPrograms.activeRevisionId),
            ),
          );
      } else {
        const exercise = await loadCompatibleCatalogExerciseBySlug(
          tx,
          normalized.firstExerciseSlug!,
          normalized.equipmentProfileKind,
        );
        const programId = scopedUuid("user-program", viewer.uid, BLANK_PROGRAM_KEY);
        await insertMinimalPublishedProgram(tx, viewer.uid, {
          dayName: "Day 1",
          equipmentProfileKind: normalized.equipmentProfileKind,
          exercise,
          isActive: true,
          name: "Blank routine",
          programId,
          programKey: BLANK_PROGRAM_KEY,
          sectionName: "Main work",
          topologySeed: "onboarding-blank",
        });
      }
      const result = await readViewerData(tx, viewer.uid);
      await finishIdempotency(tx, viewer.uid, normalized.idempotencyKey, {
        mode: normalized.mode,
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

  async function createProgramFromStarter(
    viewerInput: ViewerContext | null,
    input: CreateStarterProgramInput,
  ): Promise<ProgramCollectionMutationResult> {
    const viewer = requirePermanentMutationViewer(viewerInput);
    const normalized = parseCreateStarterProgramInput(input);
    const requestHash = stableRequestHash("program-create", {
      equipmentProfileKind: normalized.equipmentProfileKind,
      name: normalized.name,
    });
    return database.transaction(async (transaction) => {
      const tx = transaction as unknown as Database;
      const roots = await lockProgramCollection(tx, viewer.uid);
      const reservation = await reserveIdempotency(
        tx,
        viewer.uid,
        normalized.idempotencyKey,
        "program-create",
        requestHash,
      );
      if (reservation?.replay) {
        const affected = replayAffectedProgram(reservation.replay);
        await findProgramRoot(tx, viewer.uid, affected.programId);
        return {
          ...(await readViewerData(tx, viewer.uid)),
          affectedProgramId: affected.programId,
          affectedRevisionId: affected.revisionId,
          replayed: true,
        };
      }
      if (roots.length >= 24) {
        throw new RepositoryValidationError(
          "An account can keep at most 24 programs.",
        );
      }
      const activeRoots = roots.filter(({ isActive }) => isActive);
      if (activeRoots.length !== 1) {
        throw new RepositoryConflictError(
          "The active program selection needs recovery before creating another program.",
        );
      }
      const template = await loadTemplateGraph(
        tx,
        normalized.equipmentProfileKind,
      );
      const programId = scopedUuid(
        "user-program",
        viewer.uid,
        `collection:${normalized.idempotencyKey}`,
      );
      const programKey = `program-${programId}`;
      const now = new Date();
      await tx.insert(userPrograms).values({
        activeRevisionId: null,
        id: programId,
        isActive: false,
        name: normalized.name,
        ownerFirebaseUid: viewer.uid,
        programKey,
        updatedAt: now,
      });
      const revisionId = await cloneTemplateRevision(
        tx,
        viewer.uid,
        programId,
        template,
        now,
      );
      const linked = await tx
        .update(userPrograms)
        .set({ activeRevisionId: revisionId, updatedAt: now })
        .where(
          and(
            eq(userPrograms.ownerFirebaseUid, viewer.uid),
            eq(userPrograms.id, programId),
            isNull(userPrograms.activeRevisionId),
          ),
        )
        .returning({ id: userPrograms.id });
      if (linked.length !== 1) {
        throw new RepositoryConflictError(
          "The new program revision could not be linked.",
        );
      }
      const target = await findProgramRoot(tx, viewer.uid, programId);
      const targetRevision = (
        await tx
          .select()
          .from(programRevisions)
          .where(
            and(
              eq(programRevisions.ownerFirebaseUid, viewer.uid),
              eq(programRevisions.programId, programId),
              eq(programRevisions.id, revisionId),
            ),
          )
          .limit(1)
      )[0];
      if (!targetRevision) throw new RepositoryNotFoundError();
      await activateProgramRoot(
        tx,
        viewer.uid,
        activeRoots[0]!,
        target,
        targetRevision,
        now,
      );
      await finishIdempotency(tx, viewer.uid, normalized.idempotencyKey, {
        programId,
        revisionId,
      });
      return {
        ...(await readViewerData(tx, viewer.uid)),
        affectedProgramId: programId,
        affectedRevisionId: revisionId,
        replayed: false,
      };
    });
  }

  async function createCustomProgram(
    viewerInput: ViewerContext | null,
    input: CreateCustomProgramInput,
  ): Promise<ProgramCollectionMutationResult> {
    const viewer = requirePermanentMutationViewer(viewerInput);
    const normalized = parseCreateCustomProgramInput(input);
    const requestHash = stableRequestHash("program-create-custom", {
      dayName: normalized.dayName,
      equipmentProfileKind: normalized.equipmentProfileKind,
      firstCatalogExerciseId: normalized.firstCatalogExerciseId,
      name: normalized.name,
      sectionName: normalized.sectionName,
    });
    return database.transaction(async (transaction) => {
      const tx = transaction as unknown as Database;
      const roots = await lockProgramCollection(tx, viewer.uid);
      const reservation = await reserveIdempotency(
        tx,
        viewer.uid,
        normalized.idempotencyKey,
        "program-create-custom",
        requestHash,
      );
      if (reservation?.replay) {
        const affected = replayAffectedProgram(reservation.replay);
        await findProgramRoot(tx, viewer.uid, affected.programId);
        return {
          ...(await readViewerData(tx, viewer.uid)),
          affectedProgramId: affected.programId,
          affectedRevisionId: affected.revisionId,
          replayed: true,
        };
      }
      if (roots.length >= 24) {
        throw new RepositoryValidationError(
          "An account can keep at most 24 programs.",
        );
      }
      const activeRoots = roots.filter(({ isActive }) => isActive);
      if (activeRoots.length !== 1) {
        throw new RepositoryConflictError(
          "The active program selection needs recovery before creating another program.",
        );
      }

      const exercise = await loadCompatibleCatalogExercise(
        tx,
        normalized.firstCatalogExerciseId,
        normalized.equipmentProfileKind,
      );
      const programId = scopedUuid(
        "user-program",
        viewer.uid,
        `collection:custom:${normalized.idempotencyKey}`,
      );
      const { revisionId } = await insertMinimalPublishedProgram(tx, viewer.uid, {
        dayName: normalized.dayName,
        equipmentProfileKind: normalized.equipmentProfileKind,
        exercise,
        isActive: false,
        name: normalized.name,
        programId,
        programKey: `program-${programId}`,
        sectionName: normalized.sectionName,
        topologySeed: normalized.idempotencyKey,
      });
      const now = new Date();
      const target = await findProgramRoot(tx, viewer.uid, programId);
      const targetRevision = (
        await tx
          .select()
          .from(programRevisions)
          .where(
            and(
              eq(programRevisions.ownerFirebaseUid, viewer.uid),
              eq(programRevisions.programId, programId),
              eq(programRevisions.id, revisionId),
            ),
          )
          .limit(1)
      )[0];
      if (!targetRevision) throw new RepositoryNotFoundError();
      await activateProgramRoot(
        tx,
        viewer.uid,
        activeRoots[0]!,
        target,
        targetRevision,
        now,
      );
      await finishIdempotency(tx, viewer.uid, normalized.idempotencyKey, {
        programId,
        revisionId,
      });
      return {
        ...(await readViewerData(tx, viewer.uid)),
        affectedProgramId: programId,
        affectedRevisionId: revisionId,
        replayed: false,
      };
    });
  }

  async function cloneProgram(
    viewerInput: ViewerContext | null,
    input: CloneProgramInput,
  ): Promise<ProgramCollectionMutationResult> {
    const viewer = requirePermanentMutationViewer(viewerInput);
    const normalized = parseCloneProgramInput(input);
    const requestHash = stableRequestHash("program-clone", {
      name: normalized.name,
      sourceProgramId: normalized.sourceProgramId,
      sourceRevisionId: normalized.sourceRevisionId,
    });
    return database.transaction(async (transaction) => {
      const tx = transaction as unknown as Database;
      const roots = await lockProgramCollection(tx, viewer.uid);
      const reservation = await reserveIdempotency(
        tx,
        viewer.uid,
        normalized.idempotencyKey,
        "program-clone",
        requestHash,
      );
      if (reservation?.replay) {
        const affected = replayAffectedProgram(reservation.replay);
        await findProgramRoot(tx, viewer.uid, affected.programId);
        return {
          ...(await readViewerData(tx, viewer.uid)),
          affectedProgramId: affected.programId,
          affectedRevisionId: affected.revisionId,
          replayed: true,
        };
      }
      if (roots.length >= 24) {
        throw new RepositoryValidationError(
          "An account can keep at most 24 programs.",
        );
      }
      const activeRoots = roots.filter(({ isActive }) => isActive);
      if (activeRoots.length !== 1) {
        throw new RepositoryConflictError(
          "The active program selection needs recovery before cloning another program.",
        );
      }
      const sourceRoot = roots.find(
        ({ id }) => id === normalized.sourceProgramId,
      );
      if (!sourceRoot?.activeRevisionId) {
        throw new RepositoryNotFoundError();
      }
      if (sourceRoot.activeRevisionId !== normalized.sourceRevisionId) {
        throw new RepositoryConflictError(
          "The source program changed after this clone was prepared.",
        );
      }
      const source = await loadProgramGraph(
        tx,
        viewer.uid,
        sourceRoot.id,
        normalized.sourceRevisionId,
      );
      const programId = scopedUuid(
        "user-program",
        viewer.uid,
        `collection:${normalized.idempotencyKey}`,
      );
      const now = new Date();
      await tx.insert(userPrograms).values({
        activeRevisionId: null,
        id: programId,
        isActive: false,
        name: normalized.name,
        ownerFirebaseUid: viewer.uid,
        programKey: `program-${programId}`,
        updatedAt: now,
      });
      const revisionId = await cloneProgramGraphRevision(
        tx,
        viewer.uid,
        programId,
        source,
        now,
      );
      const linked = await tx
        .update(userPrograms)
        .set({ activeRevisionId: revisionId, updatedAt: now })
        .where(
          and(
            eq(userPrograms.ownerFirebaseUid, viewer.uid),
            eq(userPrograms.id, programId),
            isNull(userPrograms.activeRevisionId),
          ),
        )
        .returning({ id: userPrograms.id });
      if (linked.length !== 1) {
        throw new RepositoryConflictError(
          "The cloned program revision could not be linked.",
        );
      }
      const target = await findProgramRoot(tx, viewer.uid, programId);
      const targetRevision = (
        await tx
          .select()
          .from(programRevisions)
          .where(
            and(
              eq(programRevisions.ownerFirebaseUid, viewer.uid),
              eq(programRevisions.programId, programId),
              eq(programRevisions.id, revisionId),
            ),
          )
          .limit(1)
      )[0];
      if (!targetRevision) throw new RepositoryNotFoundError();
      await activateProgramRoot(
        tx,
        viewer.uid,
        activeRoots[0]!,
        target,
        targetRevision,
        now,
      );
      await finishIdempotency(tx, viewer.uid, normalized.idempotencyKey, {
        programId,
        revisionId,
      });
      return {
        ...(await readViewerData(tx, viewer.uid)),
        affectedProgramId: programId,
        affectedRevisionId: revisionId,
        replayed: false,
      };
    });
  }

  async function activateProgram(
    viewerInput: ViewerContext | null,
    input: ActivateProgramInput,
  ): Promise<ProgramCollectionMutationResult> {
    const viewer = requirePermanentMutationViewer(viewerInput);
    const normalized = parseActivateProgramInput(input);
    const requestHash = stableRequestHash("program-activate", {
      expectedActiveProgramId: normalized.expectedActiveProgramId,
      programId: normalized.programId,
      revisionId: normalized.revisionId,
    });
    return database.transaction(async (transaction) => {
      const tx = transaction as unknown as Database;
      const roots = await lockProgramCollection(tx, viewer.uid);
      const reservation = await reserveIdempotency(
        tx,
        viewer.uid,
        normalized.idempotencyKey,
        "program-activate",
        requestHash,
      );
      if (reservation?.replay) {
        const affected = replayAffectedProgram(reservation.replay);
        await findProgramRoot(tx, viewer.uid, affected.programId);
        return {
          ...(await readViewerData(tx, viewer.uid)),
          affectedProgramId: affected.programId,
          affectedRevisionId: affected.revisionId,
          replayed: true,
        };
      }
      const activeRoots = roots.filter(({ isActive }) => isActive);
      if (
        activeRoots.length !== 1 ||
        activeRoots[0]!.id !== normalized.expectedActiveProgramId
      ) {
        throw new RepositoryConflictError(
          "The active program changed after this page loaded.",
        );
      }
      const target = roots.find(({ id }) => id === normalized.programId);
      if (!target?.activeRevisionId) {
        throw new RepositoryNotFoundError();
      }
      if (target.activeRevisionId !== normalized.revisionId) {
        throw new RepositoryConflictError(
          "The selected program changed after this page loaded.",
        );
      }
      const targetRevision = (
        await tx
          .select()
          .from(programRevisions)
          .where(
            and(
              eq(programRevisions.ownerFirebaseUid, viewer.uid),
              eq(programRevisions.programId, target.id),
              eq(programRevisions.id, normalized.revisionId),
            ),
          )
          .limit(1)
      )[0];
      if (!targetRevision) throw new RepositoryNotFoundError();
      await activateProgramRoot(
        tx,
        viewer.uid,
        activeRoots[0]!,
        target,
        targetRevision,
        new Date(),
      );
      await finishIdempotency(tx, viewer.uid, normalized.idempotencyKey, {
        programId: target.id,
        revisionId: targetRevision.id,
      });
      return {
        ...(await readViewerData(tx, viewer.uid)),
        affectedProgramId: target.id,
        affectedRevisionId: targetRevision.id,
        replayed: false,
      };
    });
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
          return {
            ...current,
            affectedProgramId: normalized.programId,
            affectedRevisionId: stored.revisionId,
            changes: stored.changes,
            replayed: true,
          };
        }
      }
      if (!root.isActive) {
        throw new RepositoryConflictError(
          "Choose this program as active before changing its equipment.",
        );
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
        return {
          ...current,
          affectedProgramId: normalized.programId,
          affectedRevisionId: stored.revisionId,
          changes: stored.changes,
          replayed: true,
        };
      }
      const source = await loadProgramGraph(tx, viewer.uid, root.id, root.activeRevisionId);
      const currentProfile = source.revision.equipmentProfileKind;
      if (currentProfile === normalized.equipmentProfileKind) {
        const current = await readViewerData(tx, viewer.uid);
        await finishIdempotency(tx, viewer.uid, normalized.idempotencyKey, {
          programId: root.id,
          revisionId: source.revision.id,
          changes: [],
        });
        return {
          ...current,
          affectedProgramId: root.id,
          affectedRevisionId: source.revision.id,
          changes: [],
          replayed: false,
        };
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
        programId: root.id,
        revisionId: cloned.revisionId,
        changes: cloned.changes,
      });
      return {
        ...current,
        affectedProgramId: root.id,
        affectedRevisionId: cloned.revisionId,
        changes: cloned.changes,
        replayed: false,
      };
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

  async function publishProgram(
    viewerInput: ViewerContext | null,
    input: PublishProgramInput,
  ): Promise<ProgramRevisionMutationResult> {
    const viewer = requirePermanentMutationViewer(viewerInput);
    const normalized = parseProgramPublishInput(input);
    const requestHash = stableRequestHash("program-publish", {
      baseRevisionId: normalized.baseRevisionId,
      days: normalized.days,
      name: normalized.name,
      programId: normalized.programId,
    });
    return database.transaction(async (transaction) => {
      const tx = transaction as unknown as Database;
      const root = await findProgramRoot(tx, viewer.uid, normalized.programId, true);
      const existingIdempotency = await findIdempotency(
        tx,
        viewer.uid,
        normalized.idempotencyKey,
      );
      if (existingIdempotency) {
        if (
          existingIdempotency.operation !== "program-publish" ||
          existingIdempotency.requestHash !== requestHash
        ) {
          throw new RepositoryConflictError(
            "The idempotency key was already used for another request.",
          );
        }
        if (existingIdempotency.resultPayload["pending"] === false) {
          if (!z.string().uuid().safeParse(existingIdempotency.resultPayload["revisionId"]).success) {
            throw new RepositoryConflictError("The stored idempotency result is invalid.");
          }
          const current = await readViewerData(tx, viewer.uid);
          return {
            ...current,
            affectedProgramId: normalized.programId,
            affectedRevisionId: existingIdempotency.resultPayload["revisionId"] as string,
            replayed: true,
          };
        }
      }
      if (!root.isActive) {
        throw new RepositoryConflictError(
          "Choose this program as active before publishing an edit.",
        );
      }
      if (!root.activeRevisionId) throw new RepositoryNotFoundError();
      if (root.activeRevisionId !== normalized.baseRevisionId) {
        throw new RepositoryConflictError(
          "The active program revision changed. Reload before publishing this draft.",
        );
      }
      const reservation = await reserveIdempotency(
        tx,
        viewer.uid,
        normalized.idempotencyKey,
        "program-publish",
        requestHash,
      );
      if (reservation?.replay) {
        const affected = replayAffectedProgram(reservation.replay);
        return {
          ...(await readViewerData(tx, viewer.uid)),
          affectedProgramId: affected.programId,
          affectedRevisionId: affected.revisionId,
          replayed: true,
        };
      }
      const source = await loadProgramGraph(
        tx,
        viewer.uid,
        root.id,
        root.activeRevisionId,
      );
      const now = new Date();
      const revisionId = await publishEditedProgramRevision(
        tx,
        viewer.uid,
        root,
        source,
        normalized,
        requestHash,
        now,
      );
      const changed = await tx
        .update(userPrograms)
        .set({
          activeRevisionId: revisionId,
          name: normalized.name,
          updatedAt: now,
        })
        .where(
          and(
            eq(userPrograms.ownerFirebaseUid, viewer.uid),
            eq(userPrograms.id, root.id),
            eq(userPrograms.activeRevisionId, normalized.baseRevisionId),
          ),
        )
        .returning({ id: userPrograms.id });
      if (changed.length !== 1) {
        throw new RepositoryConflictError(
          "The active program changed before this draft could be published.",
        );
      }
      await finishIdempotency(tx, viewer.uid, normalized.idempotencyKey, {
        programId: root.id,
        revisionId,
      });
      return {
        ...(await readViewerData(tx, viewer.uid)),
        affectedProgramId: root.id,
        affectedRevisionId: revisionId,
        replayed: false,
      };
    });
  }

  return {
    onboard,
    getViewerData,
    getActiveProgram,
    createProgramFromStarter,
    createCustomProgram,
    cloneProgram,
    activateProgram,
    confirmEquipmentChange,
    updatePreferences,
    publishProgram,
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

export async function createViewerProgramFromStarter(
  database: Database,
  viewer: ViewerContext | null,
  input: CreateStarterProgramInput,
): Promise<ProgramCollectionMutationResult> {
  return createProfileProgramRepository(database).createProgramFromStarter(
    viewer,
    input,
  );
}

export async function createViewerProgramFromCustom(
  database: Database,
  viewer: ViewerContext | null,
  input: CreateCustomProgramInput,
): Promise<ProgramCollectionMutationResult> {
  return createProfileProgramRepository(database).createCustomProgram(viewer, input);
}

export async function cloneViewerProgram(
  database: Database,
  viewer: ViewerContext | null,
  input: CloneProgramInput,
): Promise<ProgramCollectionMutationResult> {
  return createProfileProgramRepository(database).cloneProgram(viewer, input);
}

export async function activateViewerProgram(
  database: Database,
  viewer: ViewerContext | null,
  input: ActivateProgramInput,
): Promise<ProgramCollectionMutationResult> {
  return createProfileProgramRepository(database).activateProgram(viewer, input);
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

export async function publishViewerProgram(
  database: Database,
  viewer: ViewerContext | null,
  input: PublishProgramInput,
): Promise<ProgramRevisionMutationResult> {
  return createProfileProgramRepository(database).publishProgram(viewer, input);
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
export const publishProgram = publishViewerProgram;
