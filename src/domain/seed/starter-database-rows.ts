import type { EquipmentProfileKind } from "@/domain/equipment";
import type { LoggingKind } from "@/domain/exercises/catalog";
import type { ProgramSectionKind } from "@/domain/programs/types";
import { deterministicSeedUuid } from "@/domain/seed/identity";
import {
  buildDefaultRequiredVideoVariations,
  validateCuratedVideoSeed,
} from "@/domain/youtube/seed-validation";
import type { CuratedVideoSeed } from "@/domain/youtube/types";
import {
  buildStarterDatabaseSeed,
  type StarterDatabaseSeed,
} from "@/domain/seed/starter-database";

export const STARTER_TEMPLATE_PUBLISHED_AT = "2026-08-25T00:00:00.000Z";

type Nullable<T> = T | null;

export type StarterDatabaseRows = Readonly<{
  catalogEquipment: readonly Readonly<{
    id: string;
    label: string;
    description: string;
    sortOrder: number;
  }>[];
  catalogExercises: readonly Readonly<{
    id: string;
    slug: string;
    name: string;
    movementFamily: string;
    role: "compound" | "accessory" | "core_reps" | "core_timed";
    loggingKind: LoggingKind;
    modality: "strength";
    muscles: readonly string[];
    instructions: string;
    variationParentId: null;
  }>[];
  exerciseEquipment: readonly Readonly<{
    exerciseId: string;
    equipmentId: string;
  }>[];
  exerciseAliases: readonly Readonly<{
    id: string;
    exerciseId: string;
    alias: string;
    normalizedAlias: string;
  }>[];
  programTemplate: Readonly<{
    id: string;
    templateKey: string;
    name: string;
    description: string;
  }>;
  programTemplateRevisions: readonly Readonly<{
    id: string;
    templateId: string;
    revisionNumber: number;
    status: "published";
    equipmentProfileKind: EquipmentProfileKind;
    publishedAt: string;
  }>[];
  templateDays: readonly Readonly<{
    id: string;
    revisionId: string;
    dayNumber: number;
    dayKey: string;
    displayName: string;
  }>[];
  templateSections: readonly Readonly<{
    id: string;
    revisionId: string;
    dayId: string;
    kind: ProgramSectionKind;
    displayOrder: number;
    title: string;
  }>[];
  templatePrescriptions: readonly Readonly<{
    id: string;
    revisionId: string;
    sectionId: string;
    exerciseId: string;
    displayName: Nullable<string>;
    displayOrder: number;
    setKind: "work";
    setCount: number;
    measurementKind: LoggingKind;
    minimumReps: Nullable<number>;
    maximumReps: Nullable<number>;
    minimumSeconds: Nullable<number>;
    maximumSeconds: Nullable<number>;
    restSeconds: number;
    targetWeightKg: Nullable<number>;
    targetDistanceM: Nullable<number>;
    notes: Nullable<string>;
    targetMetadata: Readonly<Record<string, never>>;
  }>[];
  templateCardioPrescriptions: readonly Readonly<{
    id: string;
    revisionId: string;
    dayId: string;
    mode: "walker" | "runner";
    durationSeconds: number;
    distanceM: Nullable<number>;
    paceSecondsPerKm: Nullable<number>;
    inclinePercent: Nullable<number>;
    notes: Nullable<string>;
  }>[];
  curatedVideos: readonly Readonly<{
    id: string;
    exerciseId: string;
    variationId: string;
    youtubeVideoId: string;
    title: string;
    channelTitle: string;
    approvalStatus: "approved";
    displayOrder: 1 | 2;
    watchedInFullAt: string;
    approvedAt: string;
    approvedBy: string;
    restrictionReason: null;
  }>[];
}>;

function uuid(kind: string, key: string): string {
  return deterministicSeedUuid(kind, key);
}

function requiredId(idsByKey: ReadonlyMap<string, string>, key: string, label: string): string {
  const id = idsByKey.get(key);
  if (!id) throw new Error(`Missing ${label} seed identity for ${key}.`);
  return id;
}

function nullable<T>(value: T | undefined): T | null {
  return value ?? null;
}

export function buildCuratedVideoDatabaseRows(
  seedRows: readonly CuratedVideoSeed[],
): StarterDatabaseRows["curatedVideos"] {
  const validation = validateCuratedVideoSeed(
    buildDefaultRequiredVideoVariations(),
    seedRows,
    { requireDefaultCatalogCoverage: true },
  );
  if (!validation.valid) {
    const summary = validation.errors
      .map(({ code, canonicalExerciseSlug, videoId }) =>
        [code, canonicalExerciseSlug, videoId].filter(Boolean).join(":"),
      )
      .join(", ");
    throw new TypeError(`Curated video production seed is invalid: ${summary}.`);
  }
  return seedRows.map((video) => ({
    id: uuid(
      "curated-video",
      `${video.canonicalExerciseSlug}:${video.variationId}:${video.videoId}`,
    ),
    exerciseId: uuid("catalog-exercise", video.canonicalExerciseSlug),
    variationId: video.variationId,
    youtubeVideoId: video.videoId,
    title: video.title.trim(),
    channelTitle: video.channelTitle.trim(),
    approvalStatus: "approved",
    displayOrder: video.displayOrder as 1 | 2,
    watchedInFullAt: video.reviewedAt,
    approvedAt: video.reviewedAt,
    approvedBy: video.reviewer.trim(),
    restrictionReason: null,
  }));
}

export function buildStarterDatabaseRows(
  seed: StarterDatabaseSeed = buildStarterDatabaseSeed(),
  curatedVideoSeed: readonly CuratedVideoSeed[] = [],
): StarterDatabaseRows {
  const exerciseIds = new Map(
    seed.exercises.map(({ slug }) => [slug, uuid("catalog-exercise", slug)] as const),
  );
  const programTemplate = {
    id: uuid("program-template", seed.template.templateKey),
    templateKey: seed.template.templateKey,
    name: seed.template.name,
    description: seed.template.description,
  } as const;

  const catalogExercises = seed.exercises.map((exercise) => ({
    id: requiredId(exerciseIds, exercise.slug, "catalog exercise"),
    slug: exercise.slug,
    name: exercise.name,
    movementFamily: exercise.movementFamily,
    role: exercise.role,
    loggingKind: exercise.loggingKind,
    modality: "strength" as const,
    muscles: [...exercise.muscles],
    instructions: exercise.instructions,
    variationParentId: null,
  }));
  const exerciseEquipment = seed.exerciseEquipment.map((edge) => ({
    exerciseId: requiredId(exerciseIds, edge.exerciseSlug, "catalog exercise"),
    equipmentId: edge.equipmentId,
  }));
  const exerciseAliases = seed.exerciseAliases.map((alias) => ({
    id: uuid(
      "exercise-alias",
      `${alias.exerciseSlug}:${alias.normalizedAlias}`,
    ),
    exerciseId: requiredId(exerciseIds, alias.exerciseSlug, "catalog exercise"),
    alias: alias.alias,
    normalizedAlias: alias.normalizedAlias,
  }));

  const programTemplateRevisions: StarterDatabaseRows["programTemplateRevisions"][number][] = [];
  const templateDays: StarterDatabaseRows["templateDays"][number][] = [];
  const templateSections: StarterDatabaseRows["templateSections"][number][] = [];
  const templatePrescriptions: StarterDatabaseRows["templatePrescriptions"][number][] = [];
  const templateCardioPrescriptions: StarterDatabaseRows["templateCardioPrescriptions"][number][] = [];

  for (const revision of seed.template.revisions) {
    const revisionKey = `${seed.template.templateKey}:${revision.equipmentProfileKind}:${revision.revisionNumber}`;
    const revisionId = uuid("template-revision", revisionKey);
    programTemplateRevisions.push({
      id: revisionId,
      templateId: programTemplate.id,
      revisionNumber: revision.revisionNumber,
      status: "published",
      equipmentProfileKind: revision.equipmentProfileKind,
      publishedAt: STARTER_TEMPLATE_PUBLISHED_AT,
    });

    for (const day of revision.days) {
      const dayKey = `${revisionKey}:${day.dayKey}`;
      const dayId = uuid("template-day", dayKey);
      templateDays.push({
        id: dayId,
        revisionId,
        dayNumber: day.dayNumber,
        dayKey: day.dayKey,
        displayName: day.displayName,
      });

      for (const section of day.sections) {
        const sectionKey = `${dayKey}:${section.kind}:${section.displayOrder}`;
        const sectionId = uuid("template-section", sectionKey);
        templateSections.push({
          id: sectionId,
          revisionId,
          dayId,
          kind: section.kind,
          displayOrder: section.displayOrder,
          title: section.title,
        });

        for (const prescription of section.prescriptions) {
          const prescriptionKey = `${sectionKey}:${prescription.displayOrder}:${prescription.exerciseSlug}`;
          templatePrescriptions.push({
            id: uuid("template-prescription", prescriptionKey),
            revisionId,
            sectionId,
            exerciseId: requiredId(
              exerciseIds,
              prescription.exerciseSlug,
              "catalog exercise",
            ),
            displayName: nullable(prescription.displayName),
            displayOrder: prescription.displayOrder,
            setKind: prescription.setKind,
            setCount: prescription.setCount,
            measurementKind: prescription.measurementKind,
            minimumReps: nullable(prescription.minimumReps),
            maximumReps: nullable(prescription.maximumReps),
            minimumSeconds: nullable(prescription.minimumSeconds),
            maximumSeconds: nullable(prescription.maximumSeconds),
            restSeconds: prescription.restSeconds,
            targetWeightKg: nullable(prescription.targetWeightKg),
            targetDistanceM: nullable(prescription.targetDistanceM),
            notes: nullable(prescription.notes),
            targetMetadata: {},
          });
        }
      }

      for (const cardio of day.cardio) {
        templateCardioPrescriptions.push({
          id: uuid("template-cardio", `${dayKey}:${cardio.mode}`),
          revisionId,
          dayId,
          mode: cardio.mode,
          durationSeconds: cardio.durationSeconds,
          distanceM: nullable(cardio.distanceM),
          paceSecondsPerKm: nullable(cardio.paceSecondsPerKm),
          inclinePercent: nullable(cardio.inclinePercent),
          notes: nullable(cardio.notes),
        });
      }
    }
  }

  return {
    catalogEquipment: seed.equipment.map((equipment) => ({ ...equipment })),
    catalogExercises,
    exerciseEquipment,
    exerciseAliases,
    programTemplate,
    programTemplateRevisions,
    templateDays,
    templateSections,
    templatePrescriptions,
    templateCardioPrescriptions,
    curatedVideos: curatedVideoSeed.length > 0
      ? buildCuratedVideoDatabaseRows(curatedVideoSeed)
      : [],
  };
}
