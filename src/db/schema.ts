import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  type AnyPgColumn,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const equipmentProfileKind = pgEnum("equipment_profile_kind", ["dumbbells", "barbell"]);
export const unitSystem = pgEnum("unit_system", ["metric", "imperial"]);
export const catalogExerciseRole = pgEnum("catalog_exercise_role", [
  "compound",
  "accessory",
  "core_reps",
  "core_timed",
]);
export const loggingKind = pgEnum("logging_kind", [
  "weight_reps",
  "bodyweight_reps",
  "duration",
  "distance_duration",
]);
export const measurementKind = pgEnum("measurement_kind", [
  "weight_reps",
  "bodyweight_reps",
  "duration",
  "distance_duration",
]);
export const videoApprovalStatus = pgEnum("video_approval_status", [
  "discovered",
  "mechanically_eligible",
  "manual_review",
  "approved",
  "rejected",
  "restricted",
  "retired",
]);
export const revisionStatus = pgEnum("revision_status", ["draft", "published", "archived"]);
export const sectionKind = pgEnum("section_kind", ["strength", "accessory", "core", "cardio"]);
export const prescriptionSetKind = pgEnum("prescription_set_kind", ["warmup", "work"]);
export const sessionState = pgEnum("session_state", [
  "draft",
  "active",
  "completing",
  "completed",
  "abandoned",
]);
export const workoutExerciseStateStatus = pgEnum("workout_exercise_state_status", [
  "pending",
  "completed",
  "skipped",
]);
export const cardioMode = pgEnum("cardio_mode", ["walker", "runner"]);
export const cardioPaceSource = pgEnum("cardio_pace_source", ["entered", "derived"]);
export const recordType = pgEnum("record_type", [
  "max_weight",
  "estimated_1rm",
  "max_repetitions",
  "volume",
  "distance",
  "duration",
]);
export const summaryKind = pgEnum("summary_kind", ["daily", "weekly", "rolling"]);
export const deletionJobStatus = pgEnum("deletion_job_status", [
  "pending",
  "running",
  "blocked",
  "completed",
  "failed",
]);
export const deletionJobPhase = pgEnum("deletion_job_phase", [
  "database",
  "firebase",
  "complete",
]);
export const progressSourceKind = pgEnum("progress_source_kind", ["set", "cardio"]);

const createdAt = () => timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull();
const updatedAt = () => timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull();

export const userProfiles = pgTable(
  "user_profiles",
  {
    firebaseUid: text("firebase_uid").primaryKey(),
    displayName: varchar("display_name", { length: 160 }),
    photoUrl: text("photo_url"),
    accountStatus: varchar("account_status", { length: 24 }).default("active").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check("user_profiles_firebase_uid_not_blank", sql`length(trim(${table.firebaseUid})) > 0`),
    check(
      "user_profiles_account_status_known",
      sql`${table.accountStatus} in ('active', 'deletion_pending', 'deleted')`,
    ),
  ],
);

export const userPreferences = pgTable(
  "user_preferences",
  {
    ownerFirebaseUid: text("owner_firebase_uid")
      .primaryKey()
      .references(() => userProfiles.firebaseUid, { onDelete: "restrict", onUpdate: "cascade" }),
    unitSystem: unitSystem("unit_system").default("metric").notNull(),
    timezone: varchar("timezone", { length: 64 }).default("UTC").notNull(),
    reducedMotion: boolean("reduced_motion").default(false).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
);

export const userEquipmentProfiles = pgTable(
  "user_equipment_profiles",
  {
    ownerFirebaseUid: text("owner_firebase_uid")
      .primaryKey()
      .references(() => userProfiles.firebaseUid, { onDelete: "restrict", onUpdate: "cascade" }),
    profileKind: equipmentProfileKind("profile_kind").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
);

export const catalogEquipment = pgTable(
  "catalog_equipment",
  {
    id: text("id").primaryKey(),
    label: varchar("label", { length: 120 }).notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").default(0).notNull(),
  },
  (table) => [index("catalog_equipment_sort_idx").on(table.sortOrder)],
);

export const catalogExercises = pgTable(
  "catalog_exercises",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 120 }).notNull(),
    name: varchar("name", { length: 180 }).notNull(),
    movementFamily: varchar("movement_family", { length: 80 }).notNull(),
    role: catalogExerciseRole("role").notNull(),
    loggingKind: loggingKind("logging_kind").notNull(),
    modality: varchar("modality", { length: 80 }).default("strength").notNull(),
    muscles: text("muscles").array().default([]).notNull(),
    instructions: text("instructions"),
    variationParentId: uuid("variation_parent_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("catalog_exercises_slug_unique").on(table.slug),
    index("catalog_exercises_role_idx").on(table.role),
    index("catalog_exercises_logging_kind_idx").on(table.loggingKind),
    foreignKey({
      columns: [table.variationParentId],
      foreignColumns: [table.id],
      name: "catalog_exercises_variation_parent_fk",
    }).onDelete("restrict"),
    check("catalog_exercises_slug_not_blank", sql`length(trim(${table.slug})) > 0`),
    check("catalog_exercises_movement_family_not_blank", sql`length(trim(${table.movementFamily})) > 0`),
  ],
);

export const exerciseEquipment = pgTable(
  "exercise_equipment",
  {
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => catalogExercises.id, { onDelete: "restrict", onUpdate: "cascade" }),
    equipmentId: text("equipment_id")
      .notNull()
      .references(() => catalogEquipment.id, { onDelete: "restrict", onUpdate: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.exerciseId, table.equipmentId], name: "exercise_equipment_pk" }),
    index("exercise_equipment_equipment_idx").on(table.equipmentId),
  ],
);

export const exerciseAliases = pgTable(
  "exercise_aliases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => catalogExercises.id, { onDelete: "restrict", onUpdate: "cascade" }),
    alias: varchar("alias", { length: 180 }).notNull(),
    normalizedAlias: varchar("normalized_alias", { length: 180 }).notNull(),
  },
  (table) => [
    uniqueIndex("exercise_aliases_exercise_normalized_unique").on(table.exerciseId, table.normalizedAlias),
    uniqueIndex("exercise_aliases_exercise_alias_unique").on(table.exerciseId, table.alias),
    index("exercise_aliases_normalized_idx").on(table.normalizedAlias),
  ],
);

export const curatedVideos = pgTable(
  "curated_videos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => catalogExercises.id, { onDelete: "restrict", onUpdate: "cascade" }),
    variationId: varchar("variation_id", { length: 120 }).default("canonical").notNull(),
    youtubeVideoId: varchar("youtube_video_id", { length: 11 }).notNull(),
    title: varchar("title", { length: 240 }).notNull(),
    channelTitle: varchar("channel_title", { length: 180 }).notNull(),
    approvalStatus: videoApprovalStatus("approval_status").notNull(),
    displayOrder: integer("display_order"),
    watchedInFullAt: timestamp("watched_in_full_at", { withTimezone: true, mode: "date" }),
    approvedAt: timestamp("approved_at", { withTimezone: true, mode: "date" }),
    approvedBy: text("approved_by"),
    restrictionReason: text("restriction_reason"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("curated_videos_exercise_variation_video_unique").on(table.exerciseId, table.variationId, table.youtubeVideoId),
    uniqueIndex("curated_videos_approved_order_unique")
      .on(table.exerciseId, table.variationId, table.displayOrder)
      .where(sql`${table.approvalStatus} = 'approved'`),
    index("curated_videos_exercise_variation_status_idx").on(table.exerciseId, table.variationId, table.approvalStatus),
    check("curated_videos_variation_not_blank", sql`length(trim(${table.variationId})) > 0`),
    check("curated_videos_youtube_id_shape", sql`${table.youtubeVideoId} ~ '^[A-Za-z0-9_-]{11}$'`),
    check(
      "curated_videos_order_shape",
      sql`${table.displayOrder} is null or ${table.displayOrder} between 1 and 2`,
    ),
    check(
      "curated_videos_approval_metadata",
      sql`${table.approvalStatus} <> 'approved' or (${table.displayOrder} is not null and ${table.watchedInFullAt} is not null and ${table.approvedAt} is not null and ${table.approvedBy} is not null)`,
    ),
  ],
);

export const customExercises = pgTable(
  "custom_exercises",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerFirebaseUid: text("owner_firebase_uid")
      .notNull()
      .references(() => userProfiles.firebaseUid, { onDelete: "restrict", onUpdate: "cascade" }),
    exerciseKey: varchar("exercise_key", { length: 120 }).notNull(),
    name: varchar("name", { length: 180 }).notNull(),
    loggingKind: loggingKind("logging_kind").notNull(),
    instructions: text("instructions"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("custom_exercises_owner_key_unique").on(table.ownerFirebaseUid, table.exerciseKey),
    uniqueIndex("custom_exercises_owner_id_unique").on(table.ownerFirebaseUid, table.id),
    index("custom_exercises_owner_created_idx").on(table.ownerFirebaseUid, table.createdAt),
  ],
);

export const customExerciseVideos = pgTable(
  "custom_exercise_videos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerFirebaseUid: text("owner_firebase_uid").notNull(),
    customExerciseId: uuid("custom_exercise_id").notNull(),
    youtubeVideoId: varchar("youtube_video_id", { length: 11 }).notNull(),
    displayOrder: integer("display_order").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    foreignKey({
      columns: [table.ownerFirebaseUid, table.customExerciseId],
      foreignColumns: [customExercises.ownerFirebaseUid, customExercises.id],
      name: "custom_exercise_videos_owner_exercise_fk",
    }).onDelete("restrict").onUpdate("cascade"),
    uniqueIndex("custom_exercise_videos_order_unique").on(table.ownerFirebaseUid, table.customExerciseId, table.displayOrder),
    uniqueIndex("custom_exercise_videos_video_unique").on(table.ownerFirebaseUid, table.customExerciseId, table.youtubeVideoId),
    index("custom_exercise_videos_owner_idx").on(table.ownerFirebaseUid, table.customExerciseId),
    check("custom_exercise_videos_order_shape", sql`${table.displayOrder} between 1 and 2`),
    check("custom_exercise_videos_youtube_id_shape", sql`${table.youtubeVideoId} ~ '^[A-Za-z0-9_-]{11}$'`),
  ],
);

export const customExerciseEquipment = pgTable(
  "custom_exercise_equipment",
  {
    ownerFirebaseUid: text("owner_firebase_uid").notNull(),
    customExerciseId: uuid("custom_exercise_id").notNull(),
    equipmentId: text("equipment_id").notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.ownerFirebaseUid, table.customExerciseId, table.equipmentId],
      name: "custom_exercise_equipment_pk",
    }),
    foreignKey({
      columns: [table.ownerFirebaseUid, table.customExerciseId],
      foreignColumns: [customExercises.ownerFirebaseUid, customExercises.id],
      name: "custom_exercise_equipment_owner_exercise_fk",
    }).onDelete("restrict").onUpdate("cascade"),
    foreignKey({
      columns: [table.equipmentId],
      foreignColumns: [catalogEquipment.id],
      name: "custom_exercise_equipment_equipment_fk",
    }).onDelete("restrict").onUpdate("cascade"),
    index("custom_exercise_equipment_owner_exercise_idx").on(table.ownerFirebaseUid, table.customExerciseId),
    index("custom_exercise_equipment_owner_equipment_idx").on(table.ownerFirebaseUid, table.equipmentId),
  ],
);

export const customExerciseAliases = pgTable(
  "custom_exercise_aliases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerFirebaseUid: text("owner_firebase_uid").notNull(),
    customExerciseId: uuid("custom_exercise_id").notNull(),
    alias: varchar("alias", { length: 180 }).notNull(),
    normalizedAlias: varchar("normalized_alias", { length: 180 }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    foreignKey({
      columns: [table.ownerFirebaseUid, table.customExerciseId],
      foreignColumns: [customExercises.ownerFirebaseUid, customExercises.id],
      name: "custom_exercise_aliases_owner_exercise_fk",
    }).onDelete("restrict").onUpdate("cascade"),
    uniqueIndex("custom_exercise_aliases_owner_normalized_unique").on(table.ownerFirebaseUid, table.normalizedAlias),
    uniqueIndex("custom_exercise_aliases_owner_exercise_normalized_unique").on(
      table.ownerFirebaseUid,
      table.customExerciseId,
      table.normalizedAlias,
    ),
    index("custom_exercise_aliases_owner_exercise_idx").on(table.ownerFirebaseUid, table.customExerciseId),
    index("custom_exercise_aliases_owner_normalized_idx").on(table.ownerFirebaseUid, table.normalizedAlias),
    check("custom_exercise_aliases_alias_not_blank", sql`length(trim(${table.alias})) > 0`),
    check("custom_exercise_aliases_normalized_not_blank", sql`length(trim(${table.normalizedAlias})) > 0`),
    check(
      "custom_exercise_aliases_normalized_form",
      sql`${table.normalizedAlias} = lower(trim(${table.alias}))`,
    ),
  ],
);

export const programTemplates = pgTable(
  "program_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    templateKey: varchar("template_key", { length: 120 }).notNull(),
    name: varchar("name", { length: 180 }).notNull(),
    description: text("description"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [uniqueIndex("program_templates_key_unique").on(table.templateKey)],
);

export const programTemplateRevisions = pgTable(
  "program_template_revisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => programTemplates.id, { onDelete: "restrict", onUpdate: "cascade" }),
    revisionNumber: integer("revision_number").notNull(),
    status: revisionStatus("status").default("draft").notNull(),
    equipmentProfileKind: equipmentProfileKind("equipment_profile_kind"),
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "date" }),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("program_template_revisions_number_unique").on(table.templateId, table.revisionNumber),
    uniqueIndex("program_template_revisions_template_id_unique").on(table.templateId, table.id),
    index("program_template_revisions_status_idx").on(table.templateId, table.status),
    check("program_template_revisions_number_positive", sql`${table.revisionNumber} > 0`),
    check(
      "program_template_revisions_publication_shape",
      sql`(${table.status} = 'published') = (${table.publishedAt} is not null)`,
    ),
  ],
);

export const templateDays = pgTable(
  "template_days",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    revisionId: uuid("revision_id").notNull(),
    dayNumber: integer("day_number").notNull(),
    dayKey: varchar("day_key", { length: 40 }).notNull(),
    displayName: varchar("display_name", { length: 120 }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    foreignKey({
      columns: [table.revisionId],
      foreignColumns: [programTemplateRevisions.id],
      name: "template_days_revision_fk",
    }).onDelete("restrict").onUpdate("cascade"),
    uniqueIndex("template_days_number_unique").on(table.revisionId, table.dayNumber),
    uniqueIndex("template_days_revision_id_unique").on(table.revisionId, table.id),
    check("template_days_number_shape", sql`${table.dayNumber} between 1 and 7`),
  ],
);

export const templateSections = pgTable(
  "template_sections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    revisionId: uuid("revision_id").notNull(),
    dayId: uuid("day_id").notNull(),
    kind: sectionKind("kind").notNull(),
    displayOrder: integer("display_order").notNull(),
    title: varchar("title", { length: 120 }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    foreignKey({
      columns: [table.revisionId, table.dayId],
      foreignColumns: [templateDays.revisionId, templateDays.id],
      name: "template_sections_day_scope_fk",
    }).onDelete("restrict").onUpdate("cascade"),
    uniqueIndex("template_sections_order_unique").on(table.revisionId, table.dayId, table.displayOrder),
    uniqueIndex("template_sections_revision_id_unique").on(table.revisionId, table.id),
    check("template_sections_order_positive", sql`${table.displayOrder} > 0`),
  ],
);

export const templatePrescriptions = pgTable(
  "template_prescriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    revisionId: uuid("revision_id").notNull(),
    sectionId: uuid("section_id").notNull(),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => catalogExercises.id, { onDelete: "restrict", onUpdate: "cascade" }),
    displayName: varchar("display_name", { length: 180 }),
    displayOrder: integer("display_order").notNull(),
    setKind: prescriptionSetKind("set_kind").default("work").notNull(),
    setCount: integer("set_count").notNull(),
    measurementKind: measurementKind("measurement_kind").notNull(),
    minimumReps: integer("minimum_reps"),
    maximumReps: integer("maximum_reps"),
    minimumSeconds: integer("minimum_seconds"),
    maximumSeconds: integer("maximum_seconds"),
    restSeconds: integer("rest_seconds").default(0).notNull(),
    targetWeightKg: numeric("target_weight_kg", { precision: 10, scale: 3, mode: "number" }),
    targetDistanceM: numeric("target_distance_m", { precision: 12, scale: 3, mode: "number" }),
    notes: text("notes"),
    targetMetadata: jsonb("target_metadata").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    foreignKey({
      columns: [table.revisionId, table.sectionId],
      foreignColumns: [templateSections.revisionId, templateSections.id],
      name: "template_prescriptions_section_scope_fk",
    }).onDelete("restrict").onUpdate("cascade"),
    uniqueIndex("template_prescriptions_order_unique").on(table.revisionId, table.sectionId, table.displayOrder),
    uniqueIndex("template_prescriptions_revision_id_unique").on(table.revisionId, table.id),
    check("template_prescriptions_order_positive", sql`${table.displayOrder} > 0`),
    check(
      "template_prescriptions_display_name_not_blank",
      sql`${table.displayName} is null or length(trim(${table.displayName})) > 0`,
    ),
    check("template_prescriptions_set_count_positive", sql`${table.setCount} > 0`),
    check("template_prescriptions_rest_nonnegative", sql`${table.restSeconds} >= 0`),
    check(
      "template_prescriptions_reps_range",
      sql`(${table.minimumReps} is null and ${table.maximumReps} is null) or (${table.minimumReps} is not null and ${table.maximumReps} is not null and ${table.minimumReps} > 0 and ${table.minimumReps} <= ${table.maximumReps})`,
    ),
    check(
      "template_prescriptions_seconds_range",
      sql`(${table.minimumSeconds} is null and ${table.maximumSeconds} is null) or (${table.minimumSeconds} is not null and ${table.maximumSeconds} is not null and ${table.minimumSeconds} > 0 and ${table.minimumSeconds} <= ${table.maximumSeconds})`,
    ),
    check("template_prescriptions_weight_nonnegative", sql`${table.targetWeightKg} is null or ${table.targetWeightKg} >= 0`),
    check("template_prescriptions_distance_nonnegative", sql`${table.targetDistanceM} is null or ${table.targetDistanceM} >= 0`),
    check(
      "template_prescriptions_measurement_shape",
      sql`(${table.measurementKind} in ('weight_reps', 'bodyweight_reps') and ${table.minimumReps} is not null and ${table.maximumReps} is not null and ${table.minimumSeconds} is null and ${table.maximumSeconds} is null and ${table.targetDistanceM} is null) or (${table.measurementKind} = 'duration' and ${table.minimumSeconds} is not null and ${table.maximumSeconds} is not null and ${table.minimumReps} is null and ${table.maximumReps} is null and ${table.targetDistanceM} is null and ${table.targetWeightKg} is null) or (${table.measurementKind} = 'distance_duration' and ${table.minimumSeconds} is not null and ${table.maximumSeconds} is not null and ${table.targetDistanceM} is not null and ${table.targetWeightKg} is null and ${table.minimumReps} is null and ${table.maximumReps} is null)`,
    ),
    check(
      "template_prescriptions_bodyweight_target_shape",
      sql`${table.measurementKind} <> 'bodyweight_reps' or ${table.targetWeightKg} is null`,
    ),
  ],
);

export const templateCardioPrescriptions = pgTable(
  "template_cardio_prescriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    revisionId: uuid("revision_id").notNull(),
    dayId: uuid("day_id").notNull(),
    mode: cardioMode("mode").notNull(),
    durationSeconds: integer("duration_seconds").notNull(),
    distanceM: numeric("distance_m", { precision: 12, scale: 3, mode: "number" }),
    paceSecondsPerKm: integer("pace_seconds_per_km"),
    inclinePercent: numeric("incline_percent", { precision: 5, scale: 2, mode: "number" }),
    notes: text("notes"),
    createdAt: createdAt(),
  },
  (table) => [
    foreignKey({
      columns: [table.revisionId, table.dayId],
      foreignColumns: [templateDays.revisionId, templateDays.id],
      name: "template_cardio_prescriptions_day_scope_fk",
    }).onDelete("restrict").onUpdate("cascade"),
    uniqueIndex("template_cardio_prescriptions_mode_unique").on(table.revisionId, table.dayId, table.mode),
    check("template_cardio_duration_positive", sql`${table.durationSeconds} > 0`),
    check("template_cardio_distance_nonnegative", sql`${table.distanceM} is null or ${table.distanceM} >= 0`),
    check("template_cardio_pace_positive", sql`${table.paceSecondsPerKm} is null or ${table.paceSecondsPerKm} > 0`),
    check("template_cardio_incline_reasonable", sql`${table.inclinePercent} is null or ${table.inclinePercent} between 0 and 100`),
  ],
);

// These late-bound columns break the program/published-revision pointer cycle
// while keeping the composite owner + program scope visible to Drizzle.
const programRevisionColumns: {
  owner: AnyPgColumn | undefined;
  program: AnyPgColumn | undefined;
  id: AnyPgColumn | undefined;
} = { owner: undefined, program: undefined, id: undefined };

export const userPrograms = pgTable(
  "user_programs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerFirebaseUid: text("owner_firebase_uid")
      .notNull()
      .references(() => userProfiles.firebaseUid, { onDelete: "restrict", onUpdate: "cascade" }),
    programKey: varchar("program_key", { length: 120 }).notNull(),
    name: varchar("name", { length: 180 }).notNull(),
    activeRevisionId: uuid("active_revision_id"),
    isActive: boolean("is_active").default(false).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    foreignKey({
      columns: [table.ownerFirebaseUid, table.id, table.activeRevisionId],
      foreignColumns: [programRevisionColumns.owner!, programRevisionColumns.program!, programRevisionColumns.id!],
      name: "user_programs_active_revision_scope_fk",
    }).onDelete("restrict").onUpdate("cascade"),
    uniqueIndex("user_programs_owner_key_unique").on(table.ownerFirebaseUid, table.programKey),
    uniqueIndex("user_programs_owner_id_unique").on(table.ownerFirebaseUid, table.id),
    uniqueIndex("user_programs_owner_active_unique")
      .on(table.ownerFirebaseUid)
      .where(sql`${table.isActive}`),
    index("user_programs_owner_updated_idx").on(table.ownerFirebaseUid, table.updatedAt),
  ],
);

export const programRevisions = pgTable(
  "program_revisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerFirebaseUid: text("owner_firebase_uid").notNull(),
    programId: uuid("program_id").notNull(),
    revisionNumber: integer("revision_number").notNull(),
    status: revisionStatus("status").default("draft").notNull(),
    equipmentProfileKind: equipmentProfileKind("equipment_profile_kind").notNull(),
    sourceTemplateRevisionId: uuid("source_template_revision_id"),
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "date" }),
    createdAt: createdAt(),
  },
  (table) => [
    foreignKey({
      columns: [table.ownerFirebaseUid],
      foreignColumns: [userProfiles.firebaseUid],
      name: "program_revisions_owner_fk",
    }).onDelete("restrict").onUpdate("cascade"),
    foreignKey({
      columns: [table.ownerFirebaseUid, table.programId],
      foreignColumns: [userPrograms.ownerFirebaseUid, userPrograms.id],
      name: "program_revisions_program_scope_fk",
    }).onDelete("restrict").onUpdate("cascade"),
    foreignKey({
      columns: [table.sourceTemplateRevisionId],
      foreignColumns: [programTemplateRevisions.id],
      name: "program_revisions_source_template_fk",
    }).onDelete("restrict").onUpdate("cascade"),
    uniqueIndex("program_revisions_owner_id_unique").on(table.ownerFirebaseUid, table.id),
    uniqueIndex("program_revisions_program_scope_unique").on(table.ownerFirebaseUid, table.programId, table.id),
    uniqueIndex("program_revisions_number_unique").on(table.ownerFirebaseUid, table.programId, table.revisionNumber),
    index("program_revisions_owner_status_idx").on(table.ownerFirebaseUid, table.status),
    check("program_revisions_number_positive", sql`${table.revisionNumber} > 0`),
    check(
      "program_revisions_publication_shape",
      sql`(${table.status} = 'published') = (${table.publishedAt} is not null)`,
    ),
  ],
);

programRevisionColumns.owner = programRevisions.ownerFirebaseUid;
programRevisionColumns.program = programRevisions.programId;
programRevisionColumns.id = programRevisions.id;

export const programDays = pgTable(
  "program_days",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerFirebaseUid: text("owner_firebase_uid").notNull(),
    programId: uuid("program_id").notNull(),
    revisionId: uuid("revision_id").notNull(),
    dayNumber: integer("day_number").notNull(),
    dayKey: varchar("day_key", { length: 40 }).notNull(),
    displayName: varchar("display_name", { length: 120 }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    foreignKey({
      columns: [table.ownerFirebaseUid, table.programId, table.revisionId],
      foreignColumns: [programRevisions.ownerFirebaseUid, programRevisions.programId, programRevisions.id],
      name: "program_days_revision_scope_fk",
    }).onDelete("restrict").onUpdate("cascade"),
    uniqueIndex("program_days_owner_revision_id_unique").on(table.ownerFirebaseUid, table.revisionId, table.id),
    uniqueIndex("program_days_program_revision_id_unique").on(
      table.ownerFirebaseUid,
      table.programId,
      table.revisionId,
      table.id,
    ),
    uniqueIndex("program_days_number_unique").on(table.ownerFirebaseUid, table.revisionId, table.dayNumber),
    check("program_days_number_shape", sql`${table.dayNumber} between 1 and 7`),
  ],
);

export const programSections = pgTable(
  "program_sections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerFirebaseUid: text("owner_firebase_uid").notNull(),
    programId: uuid("program_id").notNull(),
    revisionId: uuid("revision_id").notNull(),
    dayId: uuid("day_id").notNull(),
    kind: sectionKind("kind").notNull(),
    displayOrder: integer("display_order").notNull(),
    title: varchar("title", { length: 120 }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    foreignKey({
      columns: [table.ownerFirebaseUid, table.programId, table.revisionId, table.dayId],
      foreignColumns: [programDays.ownerFirebaseUid, programDays.programId, programDays.revisionId, programDays.id],
      name: "program_sections_day_scope_fk",
    }).onDelete("restrict").onUpdate("cascade"),
    uniqueIndex("program_sections_owner_revision_id_unique").on(table.ownerFirebaseUid, table.revisionId, table.id),
    uniqueIndex("program_sections_program_revision_id_unique").on(
      table.ownerFirebaseUid,
      table.programId,
      table.revisionId,
      table.id,
    ),
    uniqueIndex("program_sections_order_unique").on(table.ownerFirebaseUid, table.revisionId, table.dayId, table.displayOrder),
    check("program_sections_order_positive", sql`${table.displayOrder} > 0`),
  ],
);

export const programPrescriptions = pgTable(
  "program_prescriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerFirebaseUid: text("owner_firebase_uid").notNull(),
    programId: uuid("program_id").notNull(),
    revisionId: uuid("revision_id").notNull(),
    sectionId: uuid("section_id").notNull(),
    catalogExerciseId: uuid("catalog_exercise_id"),
    customExerciseId: uuid("custom_exercise_id"),
    displayName: varchar("display_name", { length: 180 }),
    displayOrder: integer("display_order").notNull(),
    setKind: prescriptionSetKind("set_kind").default("work").notNull(),
    setCount: integer("set_count").notNull(),
    measurementKind: measurementKind("measurement_kind").notNull(),
    minimumReps: integer("minimum_reps"),
    maximumReps: integer("maximum_reps"),
    minimumSeconds: integer("minimum_seconds"),
    maximumSeconds: integer("maximum_seconds"),
    restSeconds: integer("rest_seconds").default(0).notNull(),
    targetWeightKg: numeric("target_weight_kg", { precision: 10, scale: 3, mode: "number" }),
    targetDistanceM: numeric("target_distance_m", { precision: 12, scale: 3, mode: "number" }),
    notes: text("notes"),
    targetMetadata: jsonb("target_metadata").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    foreignKey({
      columns: [table.ownerFirebaseUid, table.programId, table.revisionId, table.sectionId],
      foreignColumns: [programSections.ownerFirebaseUid, programSections.programId, programSections.revisionId, programSections.id],
      name: "program_prescriptions_section_scope_fk",
    }).onDelete("restrict").onUpdate("cascade"),
    foreignKey({
      columns: [table.catalogExerciseId],
      foreignColumns: [catalogExercises.id],
      name: "program_prescriptions_catalog_exercise_fk",
    }).onDelete("restrict").onUpdate("cascade"),
    foreignKey({
      columns: [table.ownerFirebaseUid, table.customExerciseId],
      foreignColumns: [customExercises.ownerFirebaseUid, customExercises.id],
      name: "program_prescriptions_custom_exercise_scope_fk",
    }).onDelete("restrict").onUpdate("cascade"),
    uniqueIndex("program_prescriptions_owner_revision_id_unique").on(table.ownerFirebaseUid, table.revisionId, table.id),
    uniqueIndex("program_prescriptions_order_unique").on(table.ownerFirebaseUid, table.revisionId, table.sectionId, table.displayOrder),
    check("program_prescriptions_exercise_xor", sql`num_nonnulls(${table.catalogExerciseId}, ${table.customExerciseId}) = 1`),
    check("program_prescriptions_order_positive", sql`${table.displayOrder} > 0`),
    check(
      "program_prescriptions_display_name_not_blank",
      sql`${table.displayName} is null or length(trim(${table.displayName})) > 0`,
    ),
    check("program_prescriptions_set_count_positive", sql`${table.setCount} > 0`),
    check("program_prescriptions_rest_nonnegative", sql`${table.restSeconds} >= 0`),
    check(
      "program_prescriptions_reps_range",
      sql`(${table.minimumReps} is null and ${table.maximumReps} is null) or (${table.minimumReps} is not null and ${table.maximumReps} is not null and ${table.minimumReps} > 0 and ${table.minimumReps} <= ${table.maximumReps})`,
    ),
    check(
      "program_prescriptions_seconds_range",
      sql`(${table.minimumSeconds} is null and ${table.maximumSeconds} is null) or (${table.minimumSeconds} is not null and ${table.maximumSeconds} is not null and ${table.minimumSeconds} > 0 and ${table.minimumSeconds} <= ${table.maximumSeconds})`,
    ),
    check("program_prescriptions_weight_nonnegative", sql`${table.targetWeightKg} is null or ${table.targetWeightKg} >= 0`),
    check("program_prescriptions_distance_nonnegative", sql`${table.targetDistanceM} is null or ${table.targetDistanceM} >= 0`),
    check(
      "program_prescriptions_measurement_shape",
      sql`(${table.measurementKind} in ('weight_reps', 'bodyweight_reps') and ${table.minimumReps} is not null and ${table.maximumReps} is not null and ${table.minimumSeconds} is null and ${table.maximumSeconds} is null and ${table.targetDistanceM} is null) or (${table.measurementKind} = 'duration' and ${table.minimumSeconds} is not null and ${table.maximumSeconds} is not null and ${table.minimumReps} is null and ${table.maximumReps} is null and ${table.targetDistanceM} is null and ${table.targetWeightKg} is null) or (${table.measurementKind} = 'distance_duration' and ${table.minimumSeconds} is not null and ${table.maximumSeconds} is not null and ${table.targetDistanceM} is not null and ${table.targetWeightKg} is null and ${table.minimumReps} is null and ${table.maximumReps} is null)`,
    ),
    check(
      "program_prescriptions_bodyweight_target_shape",
      sql`${table.measurementKind} <> 'bodyweight_reps' or ${table.targetWeightKg} is null`,
    ),
  ],
);

export const programCardioPrescriptions = pgTable(
  "program_cardio_prescriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerFirebaseUid: text("owner_firebase_uid").notNull(),
    programId: uuid("program_id").notNull(),
    revisionId: uuid("revision_id").notNull(),
    dayId: uuid("day_id").notNull(),
    mode: cardioMode("mode").notNull(),
    durationSeconds: integer("duration_seconds").notNull(),
    distanceM: numeric("distance_m", { precision: 12, scale: 3, mode: "number" }),
    paceSecondsPerKm: integer("pace_seconds_per_km"),
    inclinePercent: numeric("incline_percent", { precision: 5, scale: 2, mode: "number" }),
    notes: text("notes"),
    createdAt: createdAt(),
  },
  (table) => [
    foreignKey({
      columns: [table.ownerFirebaseUid, table.programId, table.revisionId, table.dayId],
      foreignColumns: [programDays.ownerFirebaseUid, programDays.programId, programDays.revisionId, programDays.id],
      name: "program_cardio_prescriptions_day_scope_fk",
    }).onDelete("restrict").onUpdate("cascade"),
    uniqueIndex("program_cardio_prescriptions_mode_unique").on(table.ownerFirebaseUid, table.revisionId, table.dayId, table.mode),
    check("program_cardio_duration_positive", sql`${table.durationSeconds} > 0`),
    check("program_cardio_distance_nonnegative", sql`${table.distanceM} is null or ${table.distanceM} >= 0`),
    check("program_cardio_pace_positive", sql`${table.paceSecondsPerKm} is null or ${table.paceSecondsPerKm} > 0`),
    check("program_cardio_incline_reasonable", sql`${table.inclinePercent} is null or ${table.inclinePercent} between 0 and 100`),
  ],
);

export const workoutSessions = pgTable(
  "workout_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerFirebaseUid: text("owner_firebase_uid").notNull(),
    programId: uuid("program_id").notNull(),
    programRevisionId: uuid("program_revision_id").notNull(),
    state: sessionState("state").default("draft").notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 180 }).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
    abandonedAt: timestamp("abandoned_at", { withTimezone: true, mode: "date" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    foreignKey({
      columns: [table.ownerFirebaseUid, table.programId],
      foreignColumns: [userPrograms.ownerFirebaseUid, userPrograms.id],
      name: "workout_sessions_program_scope_fk",
    }).onDelete("restrict").onUpdate("cascade"),
    foreignKey({
      columns: [table.ownerFirebaseUid, table.programId, table.programRevisionId],
      foreignColumns: [programRevisions.ownerFirebaseUid, programRevisions.programId, programRevisions.id],
      name: "workout_sessions_revision_scope_fk",
    }).onDelete("restrict").onUpdate("cascade"),
    uniqueIndex("workout_sessions_owner_id_unique").on(table.ownerFirebaseUid, table.id),
    uniqueIndex("workout_sessions_owner_idempotency_unique").on(table.ownerFirebaseUid, table.idempotencyKey),
    uniqueIndex("workout_sessions_one_resumable_unique")
      .on(table.ownerFirebaseUid, table.programRevisionId)
      .where(sql`${table.state} in ('draft', 'active', 'completing')`),
    index("workout_sessions_owner_state_idx").on(table.ownerFirebaseUid, table.state),
    index("workout_sessions_owner_created_idx").on(table.ownerFirebaseUid, table.createdAt),
    check(
      "workout_sessions_state_timestamps",
      sql`(${table.state} = 'draft' and ${table.startedAt} is null and ${table.completedAt} is null and ${table.abandonedAt} is null) or (${table.state} in ('active', 'completing') and ${table.startedAt} is not null and ${table.completedAt} is null and ${table.abandonedAt} is null) or (${table.state} = 'completed' and ${table.startedAt} is not null and ${table.completedAt} is not null and ${table.abandonedAt} is null) or (${table.state} = 'abandoned' and ${table.startedAt} is not null and ${table.completedAt} is null and ${table.abandonedAt} is not null)`,
    ),
  ],
);

export const workoutExerciseSnapshots = pgTable(
  "workout_exercise_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerFirebaseUid: text("owner_firebase_uid").notNull(),
    sessionId: uuid("session_id").notNull(),
    position: integer("position").notNull(),
    sectionKind: sectionKind("section_kind").notNull().default("strength"),
    displayName: varchar("display_name", { length: 180 }).notNull(),
    loggingKind: measurementKind("logging_kind").notNull(),
    catalogExerciseId: uuid("catalog_exercise_id"),
    customExerciseId: uuid("custom_exercise_id"),
    minimumReps: integer("minimum_reps"),
    maximumReps: integer("maximum_reps"),
    minimumSeconds: integer("minimum_seconds"),
    maximumSeconds: integer("maximum_seconds"),
    setCount: integer("set_count").notNull(),
    restSeconds: integer("rest_seconds").default(0).notNull(),
    targetWeightKg: numeric("target_weight_kg", { precision: 10, scale: 3, mode: "number" }),
    targetDistanceM: numeric("target_distance_m", { precision: 12, scale: 3, mode: "number" }),
    prescriptionSnapshot: jsonb("prescription_snapshot").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    foreignKey({
      columns: [table.ownerFirebaseUid, table.sessionId],
      foreignColumns: [workoutSessions.ownerFirebaseUid, workoutSessions.id],
      name: "workout_snapshots_session_scope_fk",
    }).onDelete("restrict").onUpdate("cascade"),
    foreignKey({
      columns: [table.catalogExerciseId],
      foreignColumns: [catalogExercises.id],
      name: "workout_snapshots_catalog_exercise_fk",
    }).onDelete("restrict").onUpdate("cascade"),
    foreignKey({
      columns: [table.ownerFirebaseUid, table.customExerciseId],
      foreignColumns: [customExercises.ownerFirebaseUid, customExercises.id],
      name: "workout_snapshots_custom_exercise_scope_fk",
    }).onDelete("restrict").onUpdate("cascade"),
    uniqueIndex("workout_snapshots_owner_id_unique").on(table.ownerFirebaseUid, table.id),
    uniqueIndex("workout_snapshots_owner_session_position_unique").on(table.ownerFirebaseUid, table.sessionId, table.position),
    uniqueIndex("workout_snapshots_owner_id_session_unique").on(table.ownerFirebaseUid, table.id, table.sessionId),
    uniqueIndex("workout_snapshots_owner_id_session_logging_unique").on(
      table.ownerFirebaseUid,
      table.id,
      table.sessionId,
      table.loggingKind,
    ),
    index("workout_snapshots_owner_session_idx").on(table.ownerFirebaseUid, table.sessionId),
    check("workout_snapshots_position_positive", sql`${table.position} > 0`),
    check("workout_snapshots_set_count_positive", sql`${table.setCount} > 0`),
    check("workout_snapshots_rest_nonnegative", sql`${table.restSeconds} >= 0`),
    check("workout_snapshots_exercise_xor", sql`num_nonnulls(${table.catalogExerciseId}, ${table.customExerciseId}) <= 1`),
    check("workout_snapshots_weight_nonnegative", sql`${table.targetWeightKg} is null or ${table.targetWeightKg} >= 0`),
    check("workout_snapshots_distance_nonnegative", sql`${table.targetDistanceM} is null or ${table.targetDistanceM} >= 0`),
    check(
      "workout_snapshots_reps_range",
      sql`(${table.minimumReps} is null and ${table.maximumReps} is null) or (${table.minimumReps} is not null and ${table.maximumReps} is not null and ${table.minimumReps} > 0 and ${table.minimumReps} <= ${table.maximumReps})`,
    ),
    check(
      "workout_snapshots_seconds_range",
      sql`(${table.minimumSeconds} is null and ${table.maximumSeconds} is null) or (${table.minimumSeconds} is not null and ${table.maximumSeconds} is not null and ${table.minimumSeconds} > 0 and ${table.minimumSeconds} <= ${table.maximumSeconds})`,
    ),
    check(
      "workout_snapshots_measurement_shape",
      sql`(${table.loggingKind} = 'weight_reps' and ${table.minimumReps} is not null and ${table.maximumReps} is not null and ${table.minimumSeconds} is null and ${table.maximumSeconds} is null and ${table.targetDistanceM} is null) or (${table.loggingKind} = 'bodyweight_reps' and ${table.minimumReps} is not null and ${table.maximumReps} is not null and ${table.minimumSeconds} is null and ${table.maximumSeconds} is null and ${table.targetWeightKg} is null and ${table.targetDistanceM} is null) or (${table.loggingKind} = 'duration' and ${table.minimumSeconds} is not null and ${table.maximumSeconds} is not null and ${table.minimumReps} is null and ${table.maximumReps} is null and ${table.targetWeightKg} is null and ${table.targetDistanceM} is null) or (${table.loggingKind} = 'distance_duration' and ${table.minimumSeconds} is not null and ${table.maximumSeconds} is not null and ${table.minimumReps} is null and ${table.maximumReps} is null and ${table.targetWeightKg} is null and ${table.targetDistanceM} is not null)`,
    ),
  ],
);

export const workoutExerciseStates = pgTable(
  "workout_exercise_states",
  {
    ownerFirebaseUid: text("owner_firebase_uid").notNull(),
    sessionId: uuid("session_id").notNull(),
    snapshotId: uuid("snapshot_id").notNull(),
    status: workoutExerciseStateStatus("status").default("pending").notNull(),
    effectiveCatalogExerciseId: uuid("effective_catalog_exercise_id"),
    effectiveCustomExerciseId: uuid("effective_custom_exercise_id"),
    effectiveDisplayName: varchar("effective_display_name", { length: 180 }).notNull(),
    effectiveLoggingKind: measurementKind("effective_logging_kind").notNull(),
    note: text("note"),
    substitutionReason: text("substitution_reason"),
    lastClientOperationId: varchar("last_client_operation_id", { length: 180 }).notNull(),
    version: integer("version").default(1).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    primaryKey({
      columns: [table.ownerFirebaseUid, table.sessionId, table.snapshotId],
      name: "workout_exercise_states_pk",
    }),
    foreignKey({
      columns: [table.ownerFirebaseUid, table.sessionId],
      foreignColumns: [workoutSessions.ownerFirebaseUid, workoutSessions.id],
      name: "workout_exercise_states_session_scope_fk",
    }).onDelete("restrict").onUpdate("cascade"),
    foreignKey({
      columns: [table.ownerFirebaseUid, table.snapshotId, table.sessionId],
      foreignColumns: [
        workoutExerciseSnapshots.ownerFirebaseUid,
        workoutExerciseSnapshots.id,
        workoutExerciseSnapshots.sessionId,
      ],
      name: "workout_exercise_states_snapshot_scope_fk",
    }).onDelete("restrict").onUpdate("cascade"),
    foreignKey({
      columns: [table.effectiveCatalogExerciseId],
      foreignColumns: [catalogExercises.id],
      name: "workout_exercise_states_catalog_exercise_fk",
    }).onDelete("restrict").onUpdate("cascade"),
    foreignKey({
      columns: [table.ownerFirebaseUid, table.effectiveCustomExerciseId],
      foreignColumns: [customExercises.ownerFirebaseUid, customExercises.id],
      name: "workout_exercise_states_custom_exercise_scope_fk",
    }).onDelete("restrict").onUpdate("cascade"),
    uniqueIndex("workout_exercise_states_owner_operation_unique").on(
      table.ownerFirebaseUid,
      table.sessionId,
      table.lastClientOperationId,
    ),
    index("workout_exercise_states_owner_session_status_idx").on(table.ownerFirebaseUid, table.sessionId, table.status),
    check(
      "workout_exercise_states_effective_exercise_xor",
      sql`num_nonnulls(${table.effectiveCatalogExerciseId}, ${table.effectiveCustomExerciseId}) <= 1`,
    ),
    check(
      "workout_exercise_states_display_name_not_blank",
      sql`length(trim(${table.effectiveDisplayName})) > 0`,
    ),
    check(
      "workout_exercise_states_substitution_reason_not_blank",
      sql`${table.substitutionReason} is null or length(trim(${table.substitutionReason})) > 0`,
    ),
    check(
      "workout_exercise_states_operation_id_not_blank",
      sql`length(trim(${table.lastClientOperationId})) > 0`,
    ),
    check("workout_exercise_states_version_positive", sql`${table.version} > 0`),
  ],
);

export const setLogs = pgTable(
  "set_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerFirebaseUid: text("owner_firebase_uid").notNull(),
    sessionId: uuid("session_id").notNull(),
    snapshotId: uuid("snapshot_id").notNull(),
    setPosition: integer("set_position").notNull(),
    measurementKind: measurementKind("measurement_kind").notNull(),
    setKind: prescriptionSetKind("set_kind").notNull(),
    weightKg: numeric("weight_kg", { precision: 10, scale: 3, mode: "number" }),
    repetitions: integer("repetitions"),
    addedWeightKg: numeric("added_weight_kg", { precision: 10, scale: 3, mode: "number" }),
    durationSeconds: integer("duration_seconds"),
    distanceM: numeric("distance_m", { precision: 12, scale: 3, mode: "number" }),
    formRating: numeric("form_rating", { precision: 2, scale: 1, mode: "number" }),
    noteSnapshot: text("note_snapshot"),
    recordedAt: timestamp("recorded_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    clientIdempotencyKey: varchar("client_idempotency_key", { length: 180 }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    foreignKey({
      columns: [table.ownerFirebaseUid, table.sessionId],
      foreignColumns: [workoutSessions.ownerFirebaseUid, workoutSessions.id],
      name: "set_logs_session_scope_fk",
    }).onDelete("restrict").onUpdate("cascade"),
    foreignKey({
      columns: [table.ownerFirebaseUid, table.snapshotId, table.sessionId, table.measurementKind],
      foreignColumns: [
        workoutExerciseSnapshots.ownerFirebaseUid,
        workoutExerciseSnapshots.id,
        workoutExerciseSnapshots.sessionId,
        workoutExerciseSnapshots.loggingKind,
      ],
      name: "set_logs_snapshot_scope_fk",
    }).onDelete("restrict").onUpdate("cascade"),
    uniqueIndex("set_logs_owner_id_unique").on(table.ownerFirebaseUid, table.id),
    uniqueIndex("set_logs_position_unique").on(table.ownerFirebaseUid, table.snapshotId, table.setPosition),
    uniqueIndex("set_logs_idempotency_unique").on(table.ownerFirebaseUid, table.sessionId, table.clientIdempotencyKey),
    index("set_logs_owner_recorded_idx").on(table.ownerFirebaseUid, table.recordedAt),
    check("set_logs_position_positive", sql`${table.setPosition} > 0`),
    check("set_logs_weight_nonnegative", sql`${table.weightKg} is null or ${table.weightKg} >= 0`),
    check("set_logs_added_weight_nonnegative", sql`${table.addedWeightKg} is null or ${table.addedWeightKg} >= 0`),
    check("set_logs_repetitions_nonnegative", sql`${table.repetitions} is null or ${table.repetitions} >= 0`),
    check("set_logs_duration_nonnegative", sql`${table.durationSeconds} is null or ${table.durationSeconds} >= 0`),
    check("set_logs_distance_nonnegative", sql`${table.distanceM} is null or ${table.distanceM} >= 0`),
    check("set_logs_form_rating_range", sql`${table.formRating} is null or ${table.formRating} between 1 and 5`),
    check(
      "set_logs_measurement_shape",
      sql`(${table.measurementKind} = 'weight_reps' and ${table.weightKg} is not null and ${table.repetitions} is not null and ${table.addedWeightKg} is null and ${table.durationSeconds} is null and ${table.distanceM} is null) or (${table.measurementKind} = 'bodyweight_reps' and ${table.weightKg} is null and ${table.repetitions} is not null and ${table.durationSeconds} is null and ${table.distanceM} is null) or (${table.measurementKind} = 'duration' and ${table.weightKg} is null and ${table.repetitions} is null and ${table.addedWeightKg} is null and ${table.durationSeconds} is not null and ${table.distanceM} is null) or (${table.measurementKind} = 'distance_duration' and ${table.weightKg} is null and ${table.repetitions} is null and ${table.addedWeightKg} is null and ${table.durationSeconds} is not null and ${table.distanceM} is not null)`,
    ),
  ],
);

export const cardioLogs = pgTable(
  "cardio_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerFirebaseUid: text("owner_firebase_uid").notNull(),
    sessionId: uuid("session_id").notNull(),
    mode: cardioMode("mode").notNull(),
    durationSeconds: integer("duration_seconds").notNull(),
    distanceM: numeric("distance_m", { precision: 12, scale: 3, mode: "number" }),
    paceSecondsPerKm: integer("pace_seconds_per_km"),
    paceSource: cardioPaceSource("pace_source"),
    inclinePercent: numeric("incline_percent", { precision: 5, scale: 2, mode: "number" }),
    noteSnapshot: text("note_snapshot"),
    recordedAt: timestamp("recorded_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    clientIdempotencyKey: varchar("client_idempotency_key", { length: 180 }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    foreignKey({
      columns: [table.ownerFirebaseUid, table.sessionId],
      foreignColumns: [workoutSessions.ownerFirebaseUid, workoutSessions.id],
      name: "cardio_logs_session_scope_fk",
    }).onDelete("restrict").onUpdate("cascade"),
    uniqueIndex("cardio_logs_owner_id_unique").on(table.ownerFirebaseUid, table.id),
    uniqueIndex("cardio_logs_one_per_session_unique").on(table.ownerFirebaseUid, table.sessionId),
    uniqueIndex("cardio_logs_idempotency_unique").on(table.ownerFirebaseUid, table.sessionId, table.clientIdempotencyKey),
    index("cardio_logs_owner_recorded_idx").on(table.ownerFirebaseUid, table.recordedAt),
    check("cardio_logs_duration_positive", sql`${table.durationSeconds} > 0`),
    check("cardio_logs_distance_nonnegative", sql`${table.distanceM} is null or ${table.distanceM} >= 0`),
    check("cardio_logs_pace_positive", sql`${table.paceSecondsPerKm} is null or ${table.paceSecondsPerKm} > 0`),
    check("cardio_logs_pace_source_shape", sql`(${table.paceSource} is null and ${table.paceSecondsPerKm} is null) or (${table.paceSource} is not null and ${table.paceSecondsPerKm} is not null)`),
    check("cardio_logs_incline_reasonable", sql`${table.inclinePercent} is null or ${table.inclinePercent} between 0 and 100`),
  ],
);

export const idempotencyKeys = pgTable(
  "idempotency_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerFirebaseUid: text("owner_firebase_uid")
      .notNull()
      .references(() => userProfiles.firebaseUid, { onDelete: "restrict", onUpdate: "cascade" }),
    sessionId: uuid("session_id"),
    idempotencyKey: varchar("idempotency_key", { length: 180 }).notNull(),
    operation: varchar("operation", { length: 120 }).notNull(),
    requestHash: varchar("request_hash", { length: 128 }),
    resultPayload: jsonb("result_payload").$type<Record<string, unknown>>().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
    createdAt: createdAt(),
  },
  (table) => [
    foreignKey({
      columns: [table.ownerFirebaseUid, table.sessionId],
      foreignColumns: [workoutSessions.ownerFirebaseUid, workoutSessions.id],
      name: "idempotency_keys_session_scope_fk",
    }).onDelete("restrict").onUpdate("cascade"),
    uniqueIndex("idempotency_keys_owner_key_unique").on(table.ownerFirebaseUid, table.idempotencyKey),
    index("idempotency_keys_expiry_idx").on(table.expiresAt),
    check("idempotency_keys_key_not_blank", sql`length(trim(${table.idempotencyKey})) > 0`),
  ],
);

export const personalRecords = pgTable(
  "personal_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerFirebaseUid: text("owner_firebase_uid").notNull(),
    catalogExerciseId: uuid("catalog_exercise_id"),
    customExerciseId: uuid("custom_exercise_id"),
    type: recordType("type").notNull(),
    value: numeric("value", { precision: 14, scale: 3, mode: "number" }).notNull(),
    sourceSetLogId: uuid("source_set_log_id").notNull(),
    calculationVersion: varchar("calculation_version", { length: 40 }).notNull(),
    achievedAt: timestamp("achieved_at", { withTimezone: true, mode: "date" }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    foreignKey({
      columns: [table.ownerFirebaseUid],
      foreignColumns: [userProfiles.firebaseUid],
      name: "personal_records_owner_fk",
    }).onDelete("restrict").onUpdate("cascade"),
    foreignKey({
      columns: [table.catalogExerciseId],
      foreignColumns: [catalogExercises.id],
      name: "personal_records_catalog_exercise_fk",
    }).onDelete("restrict").onUpdate("cascade"),
    foreignKey({
      columns: [table.ownerFirebaseUid, table.customExerciseId],
      foreignColumns: [customExercises.ownerFirebaseUid, customExercises.id],
      name: "personal_records_custom_exercise_scope_fk",
    }).onDelete("restrict").onUpdate("cascade"),
    foreignKey({
      columns: [table.ownerFirebaseUid, table.sourceSetLogId],
      foreignColumns: [setLogs.ownerFirebaseUid, setLogs.id],
      name: "personal_records_source_log_scope_fk",
    }).onDelete("restrict").onUpdate("cascade"),
    uniqueIndex("personal_records_owner_id_unique").on(table.ownerFirebaseUid, table.id),
    uniqueIndex("personal_records_catalog_source_unique")
      .on(table.ownerFirebaseUid, table.catalogExerciseId, table.type, table.sourceSetLogId)
      .where(sql`${table.catalogExerciseId} is not null`),
    uniqueIndex("personal_records_custom_source_unique")
      .on(table.ownerFirebaseUid, table.customExerciseId, table.type, table.sourceSetLogId)
      .where(sql`${table.customExerciseId} is not null`),
    index("personal_records_owner_achieved_idx").on(table.ownerFirebaseUid, table.achievedAt),
    check("personal_records_exercise_xor", sql`num_nonnulls(${table.catalogExerciseId}, ${table.customExerciseId}) = 1`),
    check("personal_records_value_nonnegative", sql`${table.value} >= 0`),
  ],
);

export const progressSummaries = pgTable(
  "progress_summaries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerFirebaseUid: text("owner_firebase_uid").notNull(),
    summaryKind: summaryKind("summary_kind").notNull(),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    catalogExerciseId: uuid("catalog_exercise_id"),
    customExerciseId: uuid("custom_exercise_id"),
    workoutCount: integer("workout_count").default(0).notNull(),
    totalVolumeKg: numeric("total_volume_kg", { precision: 16, scale: 3, mode: "number" }).default(0).notNull(),
    totalDurationSeconds: integer("total_duration_seconds").default(0).notNull(),
    calculationVersion: varchar("calculation_version", { length: 40 }).notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    foreignKey({
      columns: [table.ownerFirebaseUid],
      foreignColumns: [userProfiles.firebaseUid],
      name: "progress_summaries_owner_fk",
    }).onDelete("restrict").onUpdate("cascade"),
    foreignKey({
      columns: [table.catalogExerciseId],
      foreignColumns: [catalogExercises.id],
      name: "progress_summaries_catalog_exercise_fk",
    }).onDelete("restrict").onUpdate("cascade"),
    foreignKey({
      columns: [table.ownerFirebaseUid, table.customExerciseId],
      foreignColumns: [customExercises.ownerFirebaseUid, customExercises.id],
      name: "progress_summaries_custom_exercise_scope_fk",
    }).onDelete("restrict").onUpdate("cascade"),
    uniqueIndex("progress_summaries_owner_id_unique").on(table.ownerFirebaseUid, table.id),
    uniqueIndex("progress_summaries_catalog_period_unique")
      .on(table.ownerFirebaseUid, table.summaryKind, table.periodStart, table.periodEnd, table.catalogExerciseId)
      .where(sql`${table.catalogExerciseId} is not null`),
    uniqueIndex("progress_summaries_custom_period_unique")
      .on(table.ownerFirebaseUid, table.summaryKind, table.periodStart, table.periodEnd, table.customExerciseId)
      .where(sql`${table.customExerciseId} is not null`),
    index("progress_summaries_owner_period_idx").on(table.ownerFirebaseUid, table.periodStart, table.periodEnd),
    check("progress_summaries_exercise_xor", sql`num_nonnulls(${table.catalogExerciseId}, ${table.customExerciseId}) <= 1`),
    check("progress_summaries_period_order", sql`${table.periodStart} <= ${table.periodEnd}`),
    check("progress_summaries_workout_count_nonnegative", sql`${table.workoutCount} >= 0`),
    check("progress_summaries_volume_nonnegative", sql`${table.totalVolumeKg} >= 0`),
    check("progress_summaries_duration_nonnegative", sql`${table.totalDurationSeconds} >= 0`),
  ],
);

export const progressSummarySources = pgTable(
  "progress_summary_sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerFirebaseUid: text("owner_firebase_uid").notNull(),
    summaryId: uuid("summary_id").notNull(),
    sourceKind: progressSourceKind("source_kind").notNull(),
    setLogId: uuid("set_log_id"),
    cardioLogId: uuid("cardio_log_id"),
    createdAt: createdAt(),
  },
  (table) => [
    foreignKey({
      columns: [table.ownerFirebaseUid, table.summaryId],
      foreignColumns: [progressSummaries.ownerFirebaseUid, progressSummaries.id],
      name: "progress_summary_sources_summary_scope_fk",
    }).onDelete("restrict").onUpdate("cascade"),
    foreignKey({
      columns: [table.ownerFirebaseUid, table.setLogId],
      foreignColumns: [setLogs.ownerFirebaseUid, setLogs.id],
      name: "progress_summary_sources_set_scope_fk",
    }).onDelete("restrict").onUpdate("cascade"),
    foreignKey({
      columns: [table.ownerFirebaseUid, table.cardioLogId],
      foreignColumns: [cardioLogs.ownerFirebaseUid, cardioLogs.id],
      name: "progress_summary_sources_cardio_scope_fk",
    }).onDelete("restrict").onUpdate("cascade"),
    uniqueIndex("progress_summary_sources_owner_id_unique").on(table.ownerFirebaseUid, table.id),
    uniqueIndex("progress_summary_sources_set_unique").on(table.ownerFirebaseUid, table.summaryId, table.setLogId).where(sql`${table.setLogId} is not null`),
    uniqueIndex("progress_summary_sources_cardio_unique").on(table.ownerFirebaseUid, table.summaryId, table.cardioLogId).where(sql`${table.cardioLogId} is not null`),
    check("progress_summary_sources_kind_shape", sql`(${table.sourceKind} = 'set' and ${table.setLogId} is not null and ${table.cardioLogId} is null) or (${table.sourceKind} = 'cardio' and ${table.setLogId} is null and ${table.cardioLogId} is not null)`),
  ],
);

export const accountDeletionJobs = pgTable(
  "account_deletion_jobs",
  {
    ownerFirebaseUid: text("owner_firebase_uid").primaryKey(),
    phase: deletionJobPhase("phase").default("database").notNull(),
    status: deletionJobStatus("status").default("pending").notNull(),
    attemptCount: integer("attempt_count").default(0).notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 180 }).notNull(),
    requestHash: varchar("request_hash", { length: 64 }).notNull(),
    lastErrorCode: text("last_error"),
    requestedAt: timestamp("requested_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
    updatedAt: updatedAt(),
  },
  (table) => [
    check("account_deletion_jobs_attempt_nonnegative", sql`${table.attemptCount} >= 0`),
    check("account_deletion_jobs_idempotency_key_not_blank", sql`length(trim(${table.idempotencyKey})) > 0`),
    check("account_deletion_jobs_request_hash_shape", sql`${table.requestHash} ~ '^[0-9a-f]{64}$'`),
    check(
      "account_deletion_jobs_completion_shape",
      sql`(${table.status} = 'completed' and ${table.phase} = 'complete' and ${table.completedAt} is not null) or (${table.status} <> 'completed' and ${table.phase} <> 'complete' and ${table.completedAt} is null)`,
    ),
  ],
);

export const schema = {
  userProfiles,
  userPreferences,
  userEquipmentProfiles,
  catalogEquipment,
  catalogExercises,
  exerciseEquipment,
  exerciseAliases,
  curatedVideos,
  customExercises,
  customExerciseVideos,
  customExerciseEquipment,
  customExerciseAliases,
  programTemplates,
  programTemplateRevisions,
  templateDays,
  templateSections,
  templatePrescriptions,
  templateCardioPrescriptions,
  userPrograms,
  programRevisions,
  programDays,
  programSections,
  programPrescriptions,
  programCardioPrescriptions,
  workoutSessions,
  workoutExerciseSnapshots,
  workoutExerciseStates,
  setLogs,
  cardioLogs,
  idempotencyKeys,
  personalRecords,
  progressSummaries,
  progressSummarySources,
  accountDeletionJobs,
};

export type DatabaseSchema = typeof schema;
