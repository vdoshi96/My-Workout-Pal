CREATE TYPE "public"."cardio_mode" AS ENUM('walker', 'runner');--> statement-breakpoint
CREATE TYPE "public"."catalog_exercise_role" AS ENUM('compound', 'accessory', 'core_reps', 'core_timed');--> statement-breakpoint
CREATE TYPE "public"."deletion_job_status" AS ENUM('pending', 'running', 'blocked', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."equipment_profile_kind" AS ENUM('dumbbells', 'barbell');--> statement-breakpoint
CREATE TYPE "public"."logging_kind" AS ENUM('weight_reps', 'bodyweight_reps', 'duration', 'distance_duration');--> statement-breakpoint
CREATE TYPE "public"."measurement_kind" AS ENUM('weight_reps', 'bodyweight_reps', 'duration', 'distance_duration');--> statement-breakpoint
CREATE TYPE "public"."prescription_set_kind" AS ENUM('warmup', 'work');--> statement-breakpoint
CREATE TYPE "public"."progress_source_kind" AS ENUM('set', 'cardio');--> statement-breakpoint
CREATE TYPE "public"."record_type" AS ENUM('max_weight', 'estimated_1rm', 'max_repetitions', 'volume', 'distance', 'duration');--> statement-breakpoint
CREATE TYPE "public"."revision_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."section_kind" AS ENUM('strength', 'accessory', 'core', 'cardio');--> statement-breakpoint
CREATE TYPE "public"."session_state" AS ENUM('draft', 'active', 'completing', 'completed', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."workout_exercise_state_status" AS ENUM('pending', 'completed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."summary_kind" AS ENUM('daily', 'weekly', 'rolling');--> statement-breakpoint
CREATE TYPE "public"."unit_system" AS ENUM('metric', 'imperial');--> statement-breakpoint
CREATE TYPE "public"."video_approval_status" AS ENUM('discovered', 'mechanically_eligible', 'manual_review', 'approved', 'rejected', 'restricted', 'retired');--> statement-breakpoint
CREATE TABLE "account_deletion_jobs" (
	"owner_firebase_uid" text PRIMARY KEY NOT NULL,
	"status" "deletion_job_status" DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_deletion_jobs_attempt_nonnegative" CHECK ("account_deletion_jobs"."attempt_count" >= 0),
	CONSTRAINT "account_deletion_jobs_completion_shape" CHECK ("account_deletion_jobs"."status" <> 'completed' or "account_deletion_jobs"."completed_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "cardio_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_firebase_uid" text NOT NULL,
	"session_id" uuid NOT NULL,
	"mode" "cardio_mode" NOT NULL,
	"duration_seconds" integer NOT NULL,
	"distance_m" numeric(12, 3),
	"pace_seconds_per_km" integer,
	"incline_percent" numeric(5, 2),
	"note_snapshot" text,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"client_idempotency_key" varchar(180) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cardio_logs_duration_positive" CHECK ("cardio_logs"."duration_seconds" > 0),
	CONSTRAINT "cardio_logs_distance_nonnegative" CHECK ("cardio_logs"."distance_m" is null or "cardio_logs"."distance_m" >= 0),
	CONSTRAINT "cardio_logs_pace_positive" CHECK ("cardio_logs"."pace_seconds_per_km" is null or "cardio_logs"."pace_seconds_per_km" > 0),
	CONSTRAINT "cardio_logs_incline_reasonable" CHECK ("cardio_logs"."incline_percent" is null or "cardio_logs"."incline_percent" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "catalog_equipment" (
	"id" text PRIMARY KEY NOT NULL,
	"label" varchar(120) NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(120) NOT NULL,
	"name" varchar(180) NOT NULL,
	"movement_family" varchar(80) NOT NULL,
	"role" "catalog_exercise_role" NOT NULL,
	"logging_kind" "logging_kind" NOT NULL,
	"modality" varchar(80) DEFAULT 'strength' NOT NULL,
	"muscles" text[] DEFAULT '{}' NOT NULL,
	"instructions" text,
	"variation_parent_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_exercises_slug_not_blank" CHECK (length(trim("catalog_exercises"."slug")) > 0),
	CONSTRAINT "catalog_exercises_movement_family_not_blank" CHECK (length(trim("catalog_exercises"."movement_family")) > 0)
);
--> statement-breakpoint
CREATE TABLE "curated_videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exercise_id" uuid NOT NULL,
	"variation_id" varchar(120) DEFAULT 'canonical' NOT NULL,
	"youtube_video_id" varchar(11) NOT NULL,
	"title" varchar(240) NOT NULL,
	"channel_title" varchar(180) NOT NULL,
	"approval_status" "video_approval_status" NOT NULL,
	"display_order" integer,
	"watched_in_full_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"approved_by" text,
	"restriction_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "curated_videos_variation_not_blank" CHECK (length(trim("curated_videos"."variation_id")) > 0),
	CONSTRAINT "curated_videos_youtube_id_shape" CHECK ("curated_videos"."youtube_video_id" ~ '^[A-Za-z0-9_-]{11}$'),
	CONSTRAINT "curated_videos_order_shape" CHECK ("curated_videos"."display_order" is null or "curated_videos"."display_order" between 1 and 2),
	CONSTRAINT "curated_videos_approval_metadata" CHECK ("curated_videos"."approval_status" <> 'approved' or ("curated_videos"."display_order" is not null and "curated_videos"."watched_in_full_at" is not null and "curated_videos"."approved_at" is not null and "curated_videos"."approved_by" is not null))
);
--> statement-breakpoint
CREATE TABLE "custom_exercise_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_firebase_uid" text NOT NULL,
	"custom_exercise_id" uuid NOT NULL,
	"alias" varchar(180) NOT NULL,
	"normalized_alias" varchar(180) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "custom_exercise_aliases_alias_not_blank" CHECK (length(trim("custom_exercise_aliases"."alias")) > 0),
	CONSTRAINT "custom_exercise_aliases_normalized_not_blank" CHECK (length(trim("custom_exercise_aliases"."normalized_alias")) > 0),
	CONSTRAINT "custom_exercise_aliases_normalized_form" CHECK ("custom_exercise_aliases"."normalized_alias" = lower(trim("custom_exercise_aliases"."alias")))
);
--> statement-breakpoint
CREATE TABLE "custom_exercise_equipment" (
	"owner_firebase_uid" text NOT NULL,
	"custom_exercise_id" uuid NOT NULL,
	"equipment_id" text NOT NULL,
	CONSTRAINT "custom_exercise_equipment_pk" PRIMARY KEY("owner_firebase_uid","custom_exercise_id","equipment_id")
);
--> statement-breakpoint
CREATE TABLE "custom_exercise_videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_firebase_uid" text NOT NULL,
	"custom_exercise_id" uuid NOT NULL,
	"youtube_video_id" varchar(11) NOT NULL,
	"display_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "custom_exercise_videos_order_shape" CHECK ("custom_exercise_videos"."display_order" between 1 and 2),
	CONSTRAINT "custom_exercise_videos_youtube_id_shape" CHECK ("custom_exercise_videos"."youtube_video_id" ~ '^[A-Za-z0-9_-]{11}$')
);
--> statement-breakpoint
CREATE TABLE "custom_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_firebase_uid" text NOT NULL,
	"exercise_key" varchar(120) NOT NULL,
	"name" varchar(180) NOT NULL,
	"logging_kind" "logging_kind" NOT NULL,
	"instructions" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercise_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exercise_id" uuid NOT NULL,
	"alias" varchar(180) NOT NULL,
	"normalized_alias" varchar(180) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercise_equipment" (
	"exercise_id" uuid NOT NULL,
	"equipment_id" text NOT NULL,
	CONSTRAINT "exercise_equipment_pk" PRIMARY KEY("exercise_id","equipment_id")
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_firebase_uid" text NOT NULL,
	"session_id" uuid,
	"idempotency_key" varchar(180) NOT NULL,
	"operation" varchar(120) NOT NULL,
	"request_hash" varchar(128),
	"result_payload" jsonb NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "idempotency_keys_key_not_blank" CHECK (length(trim("idempotency_keys"."idempotency_key")) > 0)
);
--> statement-breakpoint
CREATE TABLE "personal_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_firebase_uid" text NOT NULL,
	"catalog_exercise_id" uuid,
	"custom_exercise_id" uuid,
	"type" "record_type" NOT NULL,
	"value" numeric(14, 3) NOT NULL,
	"source_set_log_id" uuid NOT NULL,
	"calculation_version" varchar(40) NOT NULL,
	"achieved_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "personal_records_exercise_xor" CHECK (num_nonnulls("personal_records"."catalog_exercise_id", "personal_records"."custom_exercise_id") = 1),
	CONSTRAINT "personal_records_value_nonnegative" CHECK ("personal_records"."value" >= 0)
);
--> statement-breakpoint
CREATE TABLE "program_cardio_prescriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_firebase_uid" text NOT NULL,
	"program_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"day_id" uuid NOT NULL,
	"mode" "cardio_mode" NOT NULL,
	"duration_seconds" integer NOT NULL,
	"distance_m" numeric(12, 3),
	"pace_seconds_per_km" integer,
	"incline_percent" numeric(5, 2),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "program_cardio_duration_positive" CHECK ("program_cardio_prescriptions"."duration_seconds" > 0),
	CONSTRAINT "program_cardio_distance_nonnegative" CHECK ("program_cardio_prescriptions"."distance_m" is null or "program_cardio_prescriptions"."distance_m" >= 0),
	CONSTRAINT "program_cardio_pace_positive" CHECK ("program_cardio_prescriptions"."pace_seconds_per_km" is null or "program_cardio_prescriptions"."pace_seconds_per_km" > 0),
	CONSTRAINT "program_cardio_incline_reasonable" CHECK ("program_cardio_prescriptions"."incline_percent" is null or "program_cardio_prescriptions"."incline_percent" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "program_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_firebase_uid" text NOT NULL,
	"program_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"day_number" integer NOT NULL,
	"day_key" varchar(40) NOT NULL,
	"display_name" varchar(120) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "program_days_number_shape" CHECK ("program_days"."day_number" between 1 and 7)
);
--> statement-breakpoint
CREATE TABLE "program_prescriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_firebase_uid" text NOT NULL,
	"program_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"catalog_exercise_id" uuid,
	"custom_exercise_id" uuid,
	"display_name" varchar(180),
	"display_order" integer NOT NULL,
	"set_kind" "prescription_set_kind" DEFAULT 'work' NOT NULL,
	"set_count" integer NOT NULL,
	"measurement_kind" "measurement_kind" NOT NULL,
	"minimum_reps" integer,
	"maximum_reps" integer,
	"minimum_seconds" integer,
	"maximum_seconds" integer,
	"rest_seconds" integer DEFAULT 0 NOT NULL,
	"target_weight_kg" numeric(10, 3),
	"target_distance_m" numeric(12, 3),
	"notes" text,
	"target_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "program_prescriptions_exercise_xor" CHECK (num_nonnulls("program_prescriptions"."catalog_exercise_id", "program_prescriptions"."custom_exercise_id") = 1),
	CONSTRAINT "program_prescriptions_order_positive" CHECK ("program_prescriptions"."display_order" > 0),
	CONSTRAINT "program_prescriptions_display_name_not_blank" CHECK ("program_prescriptions"."display_name" is null or length(trim("program_prescriptions"."display_name")) > 0),
	CONSTRAINT "program_prescriptions_set_count_positive" CHECK ("program_prescriptions"."set_count" > 0),
	CONSTRAINT "program_prescriptions_rest_nonnegative" CHECK ("program_prescriptions"."rest_seconds" >= 0),
	CONSTRAINT "program_prescriptions_reps_range" CHECK (("program_prescriptions"."minimum_reps" is null and "program_prescriptions"."maximum_reps" is null) or ("program_prescriptions"."minimum_reps" is not null and "program_prescriptions"."maximum_reps" is not null and "program_prescriptions"."minimum_reps" > 0 and "program_prescriptions"."minimum_reps" <= "program_prescriptions"."maximum_reps")),
	CONSTRAINT "program_prescriptions_seconds_range" CHECK (("program_prescriptions"."minimum_seconds" is null and "program_prescriptions"."maximum_seconds" is null) or ("program_prescriptions"."minimum_seconds" is not null and "program_prescriptions"."maximum_seconds" is not null and "program_prescriptions"."minimum_seconds" > 0 and "program_prescriptions"."minimum_seconds" <= "program_prescriptions"."maximum_seconds")),
	CONSTRAINT "program_prescriptions_weight_nonnegative" CHECK ("program_prescriptions"."target_weight_kg" is null or "program_prescriptions"."target_weight_kg" >= 0),
	CONSTRAINT "program_prescriptions_distance_nonnegative" CHECK ("program_prescriptions"."target_distance_m" is null or "program_prescriptions"."target_distance_m" >= 0),
	CONSTRAINT "program_prescriptions_measurement_shape" CHECK (("program_prescriptions"."measurement_kind" in ('weight_reps', 'bodyweight_reps') and "program_prescriptions"."minimum_reps" is not null and "program_prescriptions"."maximum_reps" is not null and "program_prescriptions"."minimum_seconds" is null and "program_prescriptions"."maximum_seconds" is null and "program_prescriptions"."target_distance_m" is null) or ("program_prescriptions"."measurement_kind" = 'duration' and "program_prescriptions"."minimum_seconds" is not null and "program_prescriptions"."maximum_seconds" is not null and "program_prescriptions"."minimum_reps" is null and "program_prescriptions"."maximum_reps" is null and "program_prescriptions"."target_distance_m" is null and "program_prescriptions"."target_weight_kg" is null) or ("program_prescriptions"."measurement_kind" = 'distance_duration' and "program_prescriptions"."minimum_seconds" is not null and "program_prescriptions"."maximum_seconds" is not null and "program_prescriptions"."target_distance_m" is not null and "program_prescriptions"."target_weight_kg" is null and "program_prescriptions"."minimum_reps" is null and "program_prescriptions"."maximum_reps" is null)),
	CONSTRAINT "program_prescriptions_bodyweight_target_shape" CHECK ("program_prescriptions"."measurement_kind" <> 'bodyweight_reps' or "program_prescriptions"."target_weight_kg" is null)
);
--> statement-breakpoint
CREATE TABLE "program_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_firebase_uid" text NOT NULL,
	"program_id" uuid NOT NULL,
	"revision_number" integer NOT NULL,
	"status" "revision_status" DEFAULT 'draft' NOT NULL,
	"equipment_profile_kind" "equipment_profile_kind" NOT NULL,
	"source_template_revision_id" uuid,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "program_revisions_number_positive" CHECK ("program_revisions"."revision_number" > 0),
	CONSTRAINT "program_revisions_publication_shape" CHECK (("program_revisions"."status" = 'published') = ("program_revisions"."published_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "program_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_firebase_uid" text NOT NULL,
	"program_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"day_id" uuid NOT NULL,
	"kind" "section_kind" NOT NULL,
	"display_order" integer NOT NULL,
	"title" varchar(120) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "program_sections_order_positive" CHECK ("program_sections"."display_order" > 0)
);
--> statement-breakpoint
CREATE TABLE "program_template_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"revision_number" integer NOT NULL,
	"status" "revision_status" DEFAULT 'draft' NOT NULL,
	"equipment_profile_kind" "equipment_profile_kind",
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "program_template_revisions_number_positive" CHECK ("program_template_revisions"."revision_number" > 0),
	CONSTRAINT "program_template_revisions_publication_shape" CHECK (("program_template_revisions"."status" = 'published') = ("program_template_revisions"."published_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "program_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_key" varchar(120) NOT NULL,
	"name" varchar(180) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "progress_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_firebase_uid" text NOT NULL,
	"summary_kind" "summary_kind" NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"catalog_exercise_id" uuid,
	"custom_exercise_id" uuid,
	"workout_count" integer DEFAULT 0 NOT NULL,
	"total_volume_kg" numeric(16, 3) DEFAULT 0 NOT NULL,
	"total_duration_seconds" integer DEFAULT 0 NOT NULL,
	"calculation_version" varchar(40) NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "progress_summaries_exercise_xor" CHECK (num_nonnulls("progress_summaries"."catalog_exercise_id", "progress_summaries"."custom_exercise_id") <= 1),
	CONSTRAINT "progress_summaries_period_order" CHECK ("progress_summaries"."period_start" <= "progress_summaries"."period_end"),
	CONSTRAINT "progress_summaries_workout_count_nonnegative" CHECK ("progress_summaries"."workout_count" >= 0),
	CONSTRAINT "progress_summaries_volume_nonnegative" CHECK ("progress_summaries"."total_volume_kg" >= 0),
	CONSTRAINT "progress_summaries_duration_nonnegative" CHECK ("progress_summaries"."total_duration_seconds" >= 0)
);
--> statement-breakpoint
CREATE TABLE "progress_summary_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_firebase_uid" text NOT NULL,
	"summary_id" uuid NOT NULL,
	"source_kind" "progress_source_kind" NOT NULL,
	"set_log_id" uuid,
	"cardio_log_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "progress_summary_sources_kind_shape" CHECK (("progress_summary_sources"."source_kind" = 'set' and "progress_summary_sources"."set_log_id" is not null and "progress_summary_sources"."cardio_log_id" is null) or ("progress_summary_sources"."source_kind" = 'cardio' and "progress_summary_sources"."set_log_id" is null and "progress_summary_sources"."cardio_log_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "set_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_firebase_uid" text NOT NULL,
	"session_id" uuid NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"set_position" integer NOT NULL,
	"measurement_kind" "measurement_kind" NOT NULL,
	"set_kind" "prescription_set_kind" NOT NULL,
	"weight_kg" numeric(10, 3),
	"repetitions" integer,
	"duration_seconds" integer,
	"distance_m" numeric(12, 3),
	"form_rating" numeric(2, 1),
	"note_snapshot" text,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"client_idempotency_key" varchar(180) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "set_logs_position_positive" CHECK ("set_logs"."set_position" > 0),
	CONSTRAINT "set_logs_weight_nonnegative" CHECK ("set_logs"."weight_kg" is null or "set_logs"."weight_kg" >= 0),
	CONSTRAINT "set_logs_repetitions_nonnegative" CHECK ("set_logs"."repetitions" is null or "set_logs"."repetitions" >= 0),
	CONSTRAINT "set_logs_duration_nonnegative" CHECK ("set_logs"."duration_seconds" is null or "set_logs"."duration_seconds" >= 0),
	CONSTRAINT "set_logs_distance_nonnegative" CHECK ("set_logs"."distance_m" is null or "set_logs"."distance_m" >= 0),
	CONSTRAINT "set_logs_form_rating_range" CHECK ("set_logs"."form_rating" is null or "set_logs"."form_rating" between 1 and 5),
	CONSTRAINT "set_logs_measurement_shape" CHECK (("set_logs"."measurement_kind" = 'weight_reps' and "set_logs"."weight_kg" is not null and "set_logs"."repetitions" is not null and "set_logs"."duration_seconds" is null and "set_logs"."distance_m" is null) or ("set_logs"."measurement_kind" = 'bodyweight_reps' and "set_logs"."weight_kg" is null and "set_logs"."repetitions" is not null and "set_logs"."duration_seconds" is null and "set_logs"."distance_m" is null) or ("set_logs"."measurement_kind" = 'duration' and "set_logs"."weight_kg" is null and "set_logs"."repetitions" is null and "set_logs"."duration_seconds" is not null and "set_logs"."distance_m" is null) or ("set_logs"."measurement_kind" = 'distance_duration' and "set_logs"."weight_kg" is null and "set_logs"."repetitions" is null and "set_logs"."duration_seconds" is not null and "set_logs"."distance_m" is not null))
);
--> statement-breakpoint
CREATE TABLE "template_cardio_prescriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revision_id" uuid NOT NULL,
	"day_id" uuid NOT NULL,
	"mode" "cardio_mode" NOT NULL,
	"duration_seconds" integer NOT NULL,
	"distance_m" numeric(12, 3),
	"pace_seconds_per_km" integer,
	"incline_percent" numeric(5, 2),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "template_cardio_duration_positive" CHECK ("template_cardio_prescriptions"."duration_seconds" > 0),
	CONSTRAINT "template_cardio_distance_nonnegative" CHECK ("template_cardio_prescriptions"."distance_m" is null or "template_cardio_prescriptions"."distance_m" >= 0),
	CONSTRAINT "template_cardio_pace_positive" CHECK ("template_cardio_prescriptions"."pace_seconds_per_km" is null or "template_cardio_prescriptions"."pace_seconds_per_km" > 0),
	CONSTRAINT "template_cardio_incline_reasonable" CHECK ("template_cardio_prescriptions"."incline_percent" is null or "template_cardio_prescriptions"."incline_percent" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "template_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revision_id" uuid NOT NULL,
	"day_number" integer NOT NULL,
	"day_key" varchar(40) NOT NULL,
	"display_name" varchar(120) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "template_days_number_shape" CHECK ("template_days"."day_number" between 1 and 7)
);
--> statement-breakpoint
CREATE TABLE "template_prescriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revision_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"display_name" varchar(180),
	"display_order" integer NOT NULL,
	"set_kind" "prescription_set_kind" DEFAULT 'work' NOT NULL,
	"set_count" integer NOT NULL,
	"measurement_kind" "measurement_kind" NOT NULL,
	"minimum_reps" integer,
	"maximum_reps" integer,
	"minimum_seconds" integer,
	"maximum_seconds" integer,
	"rest_seconds" integer DEFAULT 0 NOT NULL,
	"target_weight_kg" numeric(10, 3),
	"target_distance_m" numeric(12, 3),
	"notes" text,
	"target_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "template_prescriptions_order_positive" CHECK ("template_prescriptions"."display_order" > 0),
	CONSTRAINT "template_prescriptions_set_count_positive" CHECK ("template_prescriptions"."set_count" > 0),
	CONSTRAINT "template_prescriptions_display_name_not_blank" CHECK ("template_prescriptions"."display_name" is null or length(trim("template_prescriptions"."display_name")) > 0),
	CONSTRAINT "template_prescriptions_rest_nonnegative" CHECK ("template_prescriptions"."rest_seconds" >= 0),
	CONSTRAINT "template_prescriptions_reps_range" CHECK (("template_prescriptions"."minimum_reps" is null and "template_prescriptions"."maximum_reps" is null) or ("template_prescriptions"."minimum_reps" is not null and "template_prescriptions"."maximum_reps" is not null and "template_prescriptions"."minimum_reps" > 0 and "template_prescriptions"."minimum_reps" <= "template_prescriptions"."maximum_reps")),
	CONSTRAINT "template_prescriptions_seconds_range" CHECK (("template_prescriptions"."minimum_seconds" is null and "template_prescriptions"."maximum_seconds" is null) or ("template_prescriptions"."minimum_seconds" is not null and "template_prescriptions"."maximum_seconds" is not null and "template_prescriptions"."minimum_seconds" > 0 and "template_prescriptions"."minimum_seconds" <= "template_prescriptions"."maximum_seconds")),
	CONSTRAINT "template_prescriptions_weight_nonnegative" CHECK ("template_prescriptions"."target_weight_kg" is null or "template_prescriptions"."target_weight_kg" >= 0),
	CONSTRAINT "template_prescriptions_distance_nonnegative" CHECK ("template_prescriptions"."target_distance_m" is null or "template_prescriptions"."target_distance_m" >= 0),
	CONSTRAINT "template_prescriptions_measurement_shape" CHECK (("template_prescriptions"."measurement_kind" in ('weight_reps', 'bodyweight_reps') and "template_prescriptions"."minimum_reps" is not null and "template_prescriptions"."maximum_reps" is not null and "template_prescriptions"."minimum_seconds" is null and "template_prescriptions"."maximum_seconds" is null and "template_prescriptions"."target_distance_m" is null) or ("template_prescriptions"."measurement_kind" = 'duration' and "template_prescriptions"."minimum_seconds" is not null and "template_prescriptions"."maximum_seconds" is not null and "template_prescriptions"."minimum_reps" is null and "template_prescriptions"."maximum_reps" is null and "template_prescriptions"."target_distance_m" is null and "template_prescriptions"."target_weight_kg" is null) or ("template_prescriptions"."measurement_kind" = 'distance_duration' and "template_prescriptions"."minimum_seconds" is not null and "template_prescriptions"."maximum_seconds" is not null and "template_prescriptions"."target_distance_m" is not null and "template_prescriptions"."target_weight_kg" is null and "template_prescriptions"."minimum_reps" is null and "template_prescriptions"."maximum_reps" is null)),
	CONSTRAINT "template_prescriptions_bodyweight_target_shape" CHECK ("template_prescriptions"."measurement_kind" <> 'bodyweight_reps' or "template_prescriptions"."target_weight_kg" is null)
);
--> statement-breakpoint
CREATE TABLE "template_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revision_id" uuid NOT NULL,
	"day_id" uuid NOT NULL,
	"kind" "section_kind" NOT NULL,
	"display_order" integer NOT NULL,
	"title" varchar(120) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "template_sections_order_positive" CHECK ("template_sections"."display_order" > 0)
);
--> statement-breakpoint
CREATE TABLE "user_equipment_profiles" (
	"owner_firebase_uid" text PRIMARY KEY NOT NULL,
	"profile_kind" "equipment_profile_kind" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"owner_firebase_uid" text PRIMARY KEY NOT NULL,
	"unit_system" "unit_system" DEFAULT 'metric' NOT NULL,
	"timezone" varchar(64) DEFAULT 'UTC' NOT NULL,
	"reduced_motion" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"firebase_uid" text PRIMARY KEY NOT NULL,
	"display_name" varchar(160),
	"photo_url" text,
	"account_status" varchar(24) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_firebase_uid_not_blank" CHECK (length(trim("user_profiles"."firebase_uid")) > 0),
	CONSTRAINT "user_profiles_account_status_known" CHECK ("user_profiles"."account_status" in ('active', 'deletion_pending', 'deleted'))
);
--> statement-breakpoint
CREATE TABLE "user_programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_firebase_uid" text NOT NULL,
	"program_key" varchar(120) NOT NULL,
	"name" varchar(180) NOT NULL,
	"active_revision_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_exercise_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_firebase_uid" text NOT NULL,
	"session_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"section_kind" "section_kind" DEFAULT 'strength' NOT NULL,
	"display_name" varchar(180) NOT NULL,
	"logging_kind" "measurement_kind" NOT NULL,
	"catalog_exercise_id" uuid,
	"custom_exercise_id" uuid,
	"minimum_reps" integer,
	"maximum_reps" integer,
	"minimum_seconds" integer,
	"maximum_seconds" integer,
	"set_count" integer NOT NULL,
	"rest_seconds" integer DEFAULT 0 NOT NULL,
	"target_weight_kg" numeric(10, 3),
	"target_distance_m" numeric(12, 3),
	"prescription_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workout_snapshots_position_positive" CHECK ("workout_exercise_snapshots"."position" > 0),
	CONSTRAINT "workout_snapshots_set_count_positive" CHECK ("workout_exercise_snapshots"."set_count" > 0),
	CONSTRAINT "workout_snapshots_rest_nonnegative" CHECK ("workout_exercise_snapshots"."rest_seconds" >= 0),
	CONSTRAINT "workout_snapshots_exercise_xor" CHECK (num_nonnulls("workout_exercise_snapshots"."catalog_exercise_id", "workout_exercise_snapshots"."custom_exercise_id") <= 1),
	CONSTRAINT "workout_snapshots_weight_nonnegative" CHECK ("workout_exercise_snapshots"."target_weight_kg" is null or "workout_exercise_snapshots"."target_weight_kg" >= 0),
	CONSTRAINT "workout_snapshots_distance_nonnegative" CHECK ("workout_exercise_snapshots"."target_distance_m" is null or "workout_exercise_snapshots"."target_distance_m" >= 0),
	CONSTRAINT "workout_snapshots_reps_range" CHECK (("workout_exercise_snapshots"."minimum_reps" is null and "workout_exercise_snapshots"."maximum_reps" is null) or ("workout_exercise_snapshots"."minimum_reps" is not null and "workout_exercise_snapshots"."maximum_reps" is not null and "workout_exercise_snapshots"."minimum_reps" > 0 and "workout_exercise_snapshots"."minimum_reps" <= "workout_exercise_snapshots"."maximum_reps")),
	CONSTRAINT "workout_snapshots_seconds_range" CHECK (("workout_exercise_snapshots"."minimum_seconds" is null and "workout_exercise_snapshots"."maximum_seconds" is null) or ("workout_exercise_snapshots"."minimum_seconds" is not null and "workout_exercise_snapshots"."maximum_seconds" is not null and "workout_exercise_snapshots"."minimum_seconds" > 0 and "workout_exercise_snapshots"."minimum_seconds" <= "workout_exercise_snapshots"."maximum_seconds")),
	CONSTRAINT "workout_snapshots_measurement_shape" CHECK (("workout_exercise_snapshots"."logging_kind" = 'weight_reps' and "workout_exercise_snapshots"."minimum_reps" is not null and "workout_exercise_snapshots"."maximum_reps" is not null and "workout_exercise_snapshots"."minimum_seconds" is null and "workout_exercise_snapshots"."maximum_seconds" is null and "workout_exercise_snapshots"."target_distance_m" is null) or ("workout_exercise_snapshots"."logging_kind" = 'bodyweight_reps' and "workout_exercise_snapshots"."minimum_reps" is not null and "workout_exercise_snapshots"."maximum_reps" is not null and "workout_exercise_snapshots"."minimum_seconds" is null and "workout_exercise_snapshots"."maximum_seconds" is null and "workout_exercise_snapshots"."target_weight_kg" is null and "workout_exercise_snapshots"."target_distance_m" is null) or ("workout_exercise_snapshots"."logging_kind" = 'duration' and "workout_exercise_snapshots"."minimum_seconds" is not null and "workout_exercise_snapshots"."maximum_seconds" is not null and "workout_exercise_snapshots"."minimum_reps" is null and "workout_exercise_snapshots"."maximum_reps" is null and "workout_exercise_snapshots"."target_weight_kg" is null and "workout_exercise_snapshots"."target_distance_m" is null) or ("workout_exercise_snapshots"."logging_kind" = 'distance_duration' and "workout_exercise_snapshots"."minimum_seconds" is not null and "workout_exercise_snapshots"."maximum_seconds" is not null and "workout_exercise_snapshots"."minimum_reps" is null and "workout_exercise_snapshots"."maximum_reps" is null and "workout_exercise_snapshots"."target_weight_kg" is null and "workout_exercise_snapshots"."target_distance_m" is not null))
);
--> statement-breakpoint
CREATE TABLE "workout_exercise_states" (
	"owner_firebase_uid" text NOT NULL,
	"session_id" uuid NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"status" "workout_exercise_state_status" DEFAULT 'pending' NOT NULL,
	"effective_catalog_exercise_id" uuid,
	"effective_custom_exercise_id" uuid,
	"effective_display_name" varchar(180) NOT NULL,
	"effective_logging_kind" "measurement_kind" NOT NULL,
	"note" text,
	"substitution_reason" text,
	"last_client_operation_id" varchar(180) NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workout_exercise_states_pk" PRIMARY KEY("owner_firebase_uid","session_id","snapshot_id"),
	CONSTRAINT "workout_exercise_states_effective_exercise_xor" CHECK (num_nonnulls("workout_exercise_states"."effective_catalog_exercise_id", "workout_exercise_states"."effective_custom_exercise_id") <= 1),
	CONSTRAINT "workout_exercise_states_display_name_not_blank" CHECK (length(trim("workout_exercise_states"."effective_display_name")) > 0),
	CONSTRAINT "workout_exercise_states_substitution_reason_not_blank" CHECK ("workout_exercise_states"."substitution_reason" is null or length(trim("workout_exercise_states"."substitution_reason")) > 0),
	CONSTRAINT "workout_exercise_states_operation_id_not_blank" CHECK (length(trim("workout_exercise_states"."last_client_operation_id")) > 0),
	CONSTRAINT "workout_exercise_states_version_positive" CHECK ("workout_exercise_states"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "workout_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_firebase_uid" text NOT NULL,
	"program_id" uuid NOT NULL,
	"program_revision_id" uuid NOT NULL,
	"state" "session_state" DEFAULT 'draft' NOT NULL,
	"idempotency_key" varchar(180) NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"abandoned_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workout_sessions_state_timestamps" CHECK (("workout_sessions"."state" = 'draft' and "workout_sessions"."started_at" is null and "workout_sessions"."completed_at" is null and "workout_sessions"."abandoned_at" is null) or ("workout_sessions"."state" in ('active', 'completing') and "workout_sessions"."started_at" is not null and "workout_sessions"."completed_at" is null and "workout_sessions"."abandoned_at" is null) or ("workout_sessions"."state" = 'completed' and "workout_sessions"."started_at" is not null and "workout_sessions"."completed_at" is not null and "workout_sessions"."abandoned_at" is null) or ("workout_sessions"."state" = 'abandoned' and "workout_sessions"."started_at" is not null and "workout_sessions"."completed_at" is null and "workout_sessions"."abandoned_at" is not null))
);
--> statement-breakpoint
-- The *_scope_key constraints mirror unique indexes in src/db/schema.ts.
-- They are emitted before Drizzle's post-FK indexes so PostgreSQL can validate
-- composite foreign keys without adding ownership rules that are absent from
-- the schema definition.
ALTER TABLE "user_programs" ADD CONSTRAINT "user_programs_owner_id_scope_key" UNIQUE ("owner_firebase_uid", "id");--> statement-breakpoint
ALTER TABLE "program_revisions" ADD CONSTRAINT "program_revisions_owner_id_scope_key" UNIQUE ("owner_firebase_uid", "id");--> statement-breakpoint
ALTER TABLE "program_revisions" ADD CONSTRAINT "program_revisions_program_scope_key" UNIQUE ("owner_firebase_uid", "program_id", "id");--> statement-breakpoint
ALTER TABLE "program_days" ADD CONSTRAINT "program_days_owner_revision_id_scope_key" UNIQUE ("owner_firebase_uid", "revision_id", "id");--> statement-breakpoint
ALTER TABLE "program_days" ADD CONSTRAINT "program_days_program_revision_id_scope_key" UNIQUE ("owner_firebase_uid", "program_id", "revision_id", "id");--> statement-breakpoint
ALTER TABLE "program_sections" ADD CONSTRAINT "program_sections_owner_revision_id_scope_key" UNIQUE ("owner_firebase_uid", "revision_id", "id");--> statement-breakpoint
ALTER TABLE "program_sections" ADD CONSTRAINT "program_sections_program_revision_id_scope_key" UNIQUE ("owner_firebase_uid", "program_id", "revision_id", "id");--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_owner_id_scope_key" UNIQUE ("owner_firebase_uid", "id");--> statement-breakpoint
ALTER TABLE "workout_exercise_snapshots" ADD CONSTRAINT "workout_snapshots_owner_id_scope_key" UNIQUE ("owner_firebase_uid", "id");--> statement-breakpoint
ALTER TABLE "workout_exercise_snapshots" ADD CONSTRAINT "workout_snapshots_owner_id_session_scope_key" UNIQUE ("owner_firebase_uid", "id", "session_id");--> statement-breakpoint
ALTER TABLE "workout_exercise_snapshots" ADD CONSTRAINT "workout_snapshots_owner_id_session_logging_scope_key" UNIQUE ("owner_firebase_uid", "id", "session_id", "logging_kind");--> statement-breakpoint
ALTER TABLE "custom_exercises" ADD CONSTRAINT "custom_exercises_owner_id_scope_key" UNIQUE ("owner_firebase_uid", "id");--> statement-breakpoint
ALTER TABLE "set_logs" ADD CONSTRAINT "set_logs_owner_id_scope_key" UNIQUE ("owner_firebase_uid", "id");--> statement-breakpoint
ALTER TABLE "cardio_logs" ADD CONSTRAINT "cardio_logs_owner_id_scope_key" UNIQUE ("owner_firebase_uid", "id");--> statement-breakpoint
ALTER TABLE "progress_summaries" ADD CONSTRAINT "progress_summaries_owner_id_scope_key" UNIQUE ("owner_firebase_uid", "id");--> statement-breakpoint
ALTER TABLE "template_days" ADD CONSTRAINT "template_days_revision_id_scope_key" UNIQUE ("revision_id", "id");--> statement-breakpoint
ALTER TABLE "template_sections" ADD CONSTRAINT "template_sections_revision_id_scope_key" UNIQUE ("revision_id", "id");--> statement-breakpoint
ALTER TABLE "account_deletion_jobs" ADD CONSTRAINT "account_deletion_jobs_owner_firebase_uid_user_profiles_firebase_uid_fk" FOREIGN KEY ("owner_firebase_uid") REFERENCES "public"."user_profiles"("firebase_uid") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "cardio_logs" ADD CONSTRAINT "cardio_logs_session_scope_fk" FOREIGN KEY ("owner_firebase_uid","session_id") REFERENCES "public"."workout_sessions"("owner_firebase_uid","id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "catalog_exercises" ADD CONSTRAINT "catalog_exercises_variation_parent_fk" FOREIGN KEY ("variation_parent_id") REFERENCES "public"."catalog_exercises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curated_videos" ADD CONSTRAINT "curated_videos_exercise_id_catalog_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."catalog_exercises"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "custom_exercise_aliases" ADD CONSTRAINT "custom_exercise_aliases_owner_exercise_fk" FOREIGN KEY ("owner_firebase_uid","custom_exercise_id") REFERENCES "public"."custom_exercises"("owner_firebase_uid","id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "custom_exercise_equipment" ADD CONSTRAINT "custom_exercise_equipment_owner_exercise_fk" FOREIGN KEY ("owner_firebase_uid","custom_exercise_id") REFERENCES "public"."custom_exercises"("owner_firebase_uid","id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "custom_exercise_equipment" ADD CONSTRAINT "custom_exercise_equipment_equipment_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."catalog_equipment"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "custom_exercise_videos" ADD CONSTRAINT "custom_exercise_videos_owner_exercise_fk" FOREIGN KEY ("owner_firebase_uid","custom_exercise_id") REFERENCES "public"."custom_exercises"("owner_firebase_uid","id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "custom_exercises" ADD CONSTRAINT "custom_exercises_owner_firebase_uid_user_profiles_firebase_uid_fk" FOREIGN KEY ("owner_firebase_uid") REFERENCES "public"."user_profiles"("firebase_uid") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "exercise_aliases" ADD CONSTRAINT "exercise_aliases_exercise_id_catalog_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."catalog_exercises"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "exercise_equipment" ADD CONSTRAINT "exercise_equipment_exercise_id_catalog_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."catalog_exercises"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "exercise_equipment" ADD CONSTRAINT "exercise_equipment_equipment_id_catalog_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."catalog_equipment"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_owner_firebase_uid_user_profiles_firebase_uid_fk" FOREIGN KEY ("owner_firebase_uid") REFERENCES "public"."user_profiles"("firebase_uid") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_session_scope_fk" FOREIGN KEY ("owner_firebase_uid","session_id") REFERENCES "public"."workout_sessions"("owner_firebase_uid","id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "personal_records" ADD CONSTRAINT "personal_records_owner_fk" FOREIGN KEY ("owner_firebase_uid") REFERENCES "public"."user_profiles"("firebase_uid") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "personal_records" ADD CONSTRAINT "personal_records_catalog_exercise_fk" FOREIGN KEY ("catalog_exercise_id") REFERENCES "public"."catalog_exercises"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "personal_records" ADD CONSTRAINT "personal_records_custom_exercise_scope_fk" FOREIGN KEY ("owner_firebase_uid","custom_exercise_id") REFERENCES "public"."custom_exercises"("owner_firebase_uid","id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "personal_records" ADD CONSTRAINT "personal_records_source_log_scope_fk" FOREIGN KEY ("owner_firebase_uid","source_set_log_id") REFERENCES "public"."set_logs"("owner_firebase_uid","id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "program_cardio_prescriptions" ADD CONSTRAINT "program_cardio_prescriptions_day_scope_fk" FOREIGN KEY ("owner_firebase_uid","program_id","revision_id","day_id") REFERENCES "public"."program_days"("owner_firebase_uid","program_id","revision_id","id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "program_days" ADD CONSTRAINT "program_days_revision_scope_fk" FOREIGN KEY ("owner_firebase_uid","program_id","revision_id") REFERENCES "public"."program_revisions"("owner_firebase_uid","program_id","id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "program_prescriptions" ADD CONSTRAINT "program_prescriptions_section_scope_fk" FOREIGN KEY ("owner_firebase_uid","program_id","revision_id","section_id") REFERENCES "public"."program_sections"("owner_firebase_uid","program_id","revision_id","id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "program_prescriptions" ADD CONSTRAINT "program_prescriptions_catalog_exercise_fk" FOREIGN KEY ("catalog_exercise_id") REFERENCES "public"."catalog_exercises"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "program_prescriptions" ADD CONSTRAINT "program_prescriptions_custom_exercise_scope_fk" FOREIGN KEY ("owner_firebase_uid","custom_exercise_id") REFERENCES "public"."custom_exercises"("owner_firebase_uid","id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "program_revisions" ADD CONSTRAINT "program_revisions_owner_fk" FOREIGN KEY ("owner_firebase_uid") REFERENCES "public"."user_profiles"("firebase_uid") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "program_revisions" ADD CONSTRAINT "program_revisions_program_scope_fk" FOREIGN KEY ("owner_firebase_uid","program_id") REFERENCES "public"."user_programs"("owner_firebase_uid","id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "program_revisions" ADD CONSTRAINT "program_revisions_source_template_fk" FOREIGN KEY ("source_template_revision_id") REFERENCES "public"."program_template_revisions"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "program_sections" ADD CONSTRAINT "program_sections_day_scope_fk" FOREIGN KEY ("owner_firebase_uid","program_id","revision_id","day_id") REFERENCES "public"."program_days"("owner_firebase_uid","program_id","revision_id","id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "program_template_revisions" ADD CONSTRAINT "program_template_revisions_template_id_program_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."program_templates"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "progress_summaries" ADD CONSTRAINT "progress_summaries_owner_fk" FOREIGN KEY ("owner_firebase_uid") REFERENCES "public"."user_profiles"("firebase_uid") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "progress_summaries" ADD CONSTRAINT "progress_summaries_catalog_exercise_fk" FOREIGN KEY ("catalog_exercise_id") REFERENCES "public"."catalog_exercises"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "progress_summaries" ADD CONSTRAINT "progress_summaries_custom_exercise_scope_fk" FOREIGN KEY ("owner_firebase_uid","custom_exercise_id") REFERENCES "public"."custom_exercises"("owner_firebase_uid","id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "progress_summary_sources" ADD CONSTRAINT "progress_summary_sources_summary_scope_fk" FOREIGN KEY ("owner_firebase_uid","summary_id") REFERENCES "public"."progress_summaries"("owner_firebase_uid","id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "progress_summary_sources" ADD CONSTRAINT "progress_summary_sources_set_scope_fk" FOREIGN KEY ("owner_firebase_uid","set_log_id") REFERENCES "public"."set_logs"("owner_firebase_uid","id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "progress_summary_sources" ADD CONSTRAINT "progress_summary_sources_cardio_scope_fk" FOREIGN KEY ("owner_firebase_uid","cardio_log_id") REFERENCES "public"."cardio_logs"("owner_firebase_uid","id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "set_logs" ADD CONSTRAINT "set_logs_session_scope_fk" FOREIGN KEY ("owner_firebase_uid","session_id") REFERENCES "public"."workout_sessions"("owner_firebase_uid","id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "set_logs" ADD CONSTRAINT "set_logs_snapshot_scope_fk" FOREIGN KEY ("owner_firebase_uid","snapshot_id","session_id","measurement_kind") REFERENCES "public"."workout_exercise_snapshots"("owner_firebase_uid","id","session_id","logging_kind") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "template_cardio_prescriptions" ADD CONSTRAINT "template_cardio_prescriptions_day_scope_fk" FOREIGN KEY ("revision_id","day_id") REFERENCES "public"."template_days"("revision_id","id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "template_days" ADD CONSTRAINT "template_days_revision_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."program_template_revisions"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "template_prescriptions" ADD CONSTRAINT "template_prescriptions_exercise_id_catalog_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."catalog_exercises"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "template_prescriptions" ADD CONSTRAINT "template_prescriptions_section_scope_fk" FOREIGN KEY ("revision_id","section_id") REFERENCES "public"."template_sections"("revision_id","id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "template_sections" ADD CONSTRAINT "template_sections_day_scope_fk" FOREIGN KEY ("revision_id","day_id") REFERENCES "public"."template_days"("revision_id","id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_equipment_profiles" ADD CONSTRAINT "user_equipment_profiles_owner_firebase_uid_user_profiles_firebase_uid_fk" FOREIGN KEY ("owner_firebase_uid") REFERENCES "public"."user_profiles"("firebase_uid") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_owner_firebase_uid_user_profiles_firebase_uid_fk" FOREIGN KEY ("owner_firebase_uid") REFERENCES "public"."user_profiles"("firebase_uid") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_programs" ADD CONSTRAINT "user_programs_owner_firebase_uid_user_profiles_firebase_uid_fk" FOREIGN KEY ("owner_firebase_uid") REFERENCES "public"."user_profiles"("firebase_uid") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_programs" ADD CONSTRAINT "user_programs_active_revision_scope_fk" FOREIGN KEY ("owner_firebase_uid","id","active_revision_id") REFERENCES "public"."program_revisions"("owner_firebase_uid","program_id","id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "workout_exercise_snapshots" ADD CONSTRAINT "workout_snapshots_session_scope_fk" FOREIGN KEY ("owner_firebase_uid","session_id") REFERENCES "public"."workout_sessions"("owner_firebase_uid","id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "workout_exercise_snapshots" ADD CONSTRAINT "workout_snapshots_catalog_exercise_fk" FOREIGN KEY ("catalog_exercise_id") REFERENCES "public"."catalog_exercises"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "workout_exercise_snapshots" ADD CONSTRAINT "workout_snapshots_custom_exercise_scope_fk" FOREIGN KEY ("owner_firebase_uid","custom_exercise_id") REFERENCES "public"."custom_exercises"("owner_firebase_uid","id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "workout_exercise_states" ADD CONSTRAINT "workout_exercise_states_session_scope_fk" FOREIGN KEY ("owner_firebase_uid","session_id") REFERENCES "public"."workout_sessions"("owner_firebase_uid","id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "workout_exercise_states" ADD CONSTRAINT "workout_exercise_states_snapshot_scope_fk" FOREIGN KEY ("owner_firebase_uid","snapshot_id","session_id") REFERENCES "public"."workout_exercise_snapshots"("owner_firebase_uid","id","session_id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "workout_exercise_states" ADD CONSTRAINT "workout_exercise_states_catalog_exercise_fk" FOREIGN KEY ("effective_catalog_exercise_id") REFERENCES "public"."catalog_exercises"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "workout_exercise_states" ADD CONSTRAINT "workout_exercise_states_custom_exercise_scope_fk" FOREIGN KEY ("owner_firebase_uid","effective_custom_exercise_id") REFERENCES "public"."custom_exercises"("owner_firebase_uid","id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_program_scope_fk" FOREIGN KEY ("owner_firebase_uid","program_id") REFERENCES "public"."user_programs"("owner_firebase_uid","id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_revision_scope_fk" FOREIGN KEY ("owner_firebase_uid","program_id","program_revision_id") REFERENCES "public"."program_revisions"("owner_firebase_uid","program_id","id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "cardio_logs_owner_id_unique" ON "cardio_logs" USING btree ("owner_firebase_uid","id");--> statement-breakpoint
CREATE UNIQUE INDEX "cardio_logs_one_per_session_unique" ON "cardio_logs" USING btree ("owner_firebase_uid","session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cardio_logs_idempotency_unique" ON "cardio_logs" USING btree ("owner_firebase_uid","session_id","client_idempotency_key");--> statement-breakpoint
CREATE INDEX "cardio_logs_owner_recorded_idx" ON "cardio_logs" USING btree ("owner_firebase_uid","recorded_at");--> statement-breakpoint
CREATE INDEX "catalog_equipment_sort_idx" ON "catalog_equipment" USING btree ("sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_exercises_slug_unique" ON "catalog_exercises" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "catalog_exercises_role_idx" ON "catalog_exercises" USING btree ("role");--> statement-breakpoint
CREATE INDEX "catalog_exercises_logging_kind_idx" ON "catalog_exercises" USING btree ("logging_kind");--> statement-breakpoint
CREATE UNIQUE INDEX "curated_videos_exercise_variation_video_unique" ON "curated_videos" USING btree ("exercise_id","variation_id","youtube_video_id");--> statement-breakpoint
CREATE UNIQUE INDEX "curated_videos_approved_order_unique" ON "curated_videos" USING btree ("exercise_id","variation_id","display_order") WHERE "curated_videos"."approval_status" = 'approved';--> statement-breakpoint
CREATE INDEX "curated_videos_exercise_variation_status_idx" ON "curated_videos" USING btree ("exercise_id","variation_id","approval_status");--> statement-breakpoint
CREATE UNIQUE INDEX "custom_exercise_aliases_owner_normalized_unique" ON "custom_exercise_aliases" USING btree ("owner_firebase_uid","normalized_alias");--> statement-breakpoint
CREATE UNIQUE INDEX "custom_exercise_aliases_owner_exercise_normalized_unique" ON "custom_exercise_aliases" USING btree ("owner_firebase_uid","custom_exercise_id","normalized_alias");--> statement-breakpoint
CREATE INDEX "custom_exercise_aliases_owner_exercise_idx" ON "custom_exercise_aliases" USING btree ("owner_firebase_uid","custom_exercise_id");--> statement-breakpoint
CREATE INDEX "custom_exercise_aliases_owner_normalized_idx" ON "custom_exercise_aliases" USING btree ("owner_firebase_uid","normalized_alias");--> statement-breakpoint
CREATE INDEX "custom_exercise_equipment_owner_exercise_idx" ON "custom_exercise_equipment" USING btree ("owner_firebase_uid","custom_exercise_id");--> statement-breakpoint
CREATE INDEX "custom_exercise_equipment_owner_equipment_idx" ON "custom_exercise_equipment" USING btree ("owner_firebase_uid","equipment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "custom_exercise_videos_order_unique" ON "custom_exercise_videos" USING btree ("owner_firebase_uid","custom_exercise_id","display_order");--> statement-breakpoint
CREATE UNIQUE INDEX "custom_exercise_videos_video_unique" ON "custom_exercise_videos" USING btree ("owner_firebase_uid","custom_exercise_id","youtube_video_id");--> statement-breakpoint
CREATE INDEX "custom_exercise_videos_owner_idx" ON "custom_exercise_videos" USING btree ("owner_firebase_uid","custom_exercise_id");--> statement-breakpoint
CREATE UNIQUE INDEX "custom_exercises_owner_key_unique" ON "custom_exercises" USING btree ("owner_firebase_uid","exercise_key");--> statement-breakpoint
CREATE UNIQUE INDEX "custom_exercises_owner_id_unique" ON "custom_exercises" USING btree ("owner_firebase_uid","id");--> statement-breakpoint
CREATE INDEX "custom_exercises_owner_created_idx" ON "custom_exercises" USING btree ("owner_firebase_uid","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "exercise_aliases_exercise_normalized_unique" ON "exercise_aliases" USING btree ("exercise_id","normalized_alias");--> statement-breakpoint
CREATE UNIQUE INDEX "exercise_aliases_exercise_alias_unique" ON "exercise_aliases" USING btree ("exercise_id","alias");--> statement-breakpoint
CREATE INDEX "exercise_aliases_normalized_idx" ON "exercise_aliases" USING btree ("normalized_alias");--> statement-breakpoint
CREATE INDEX "exercise_equipment_equipment_idx" ON "exercise_equipment" USING btree ("equipment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_keys_owner_key_unique" ON "idempotency_keys" USING btree ("owner_firebase_uid","idempotency_key");--> statement-breakpoint
CREATE INDEX "idempotency_keys_expiry_idx" ON "idempotency_keys" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "personal_records_owner_id_unique" ON "personal_records" USING btree ("owner_firebase_uid","id");--> statement-breakpoint
CREATE UNIQUE INDEX "personal_records_catalog_source_unique" ON "personal_records" USING btree ("owner_firebase_uid","catalog_exercise_id","type","source_set_log_id") WHERE "personal_records"."catalog_exercise_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "personal_records_custom_source_unique" ON "personal_records" USING btree ("owner_firebase_uid","custom_exercise_id","type","source_set_log_id") WHERE "personal_records"."custom_exercise_id" is not null;--> statement-breakpoint
CREATE INDEX "personal_records_owner_achieved_idx" ON "personal_records" USING btree ("owner_firebase_uid","achieved_at");--> statement-breakpoint
CREATE UNIQUE INDEX "program_cardio_prescriptions_mode_unique" ON "program_cardio_prescriptions" USING btree ("owner_firebase_uid","revision_id","day_id","mode");--> statement-breakpoint
CREATE UNIQUE INDEX "program_days_owner_revision_id_unique" ON "program_days" USING btree ("owner_firebase_uid","revision_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "program_days_program_revision_id_unique" ON "program_days" USING btree ("owner_firebase_uid","program_id","revision_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "program_days_number_unique" ON "program_days" USING btree ("owner_firebase_uid","revision_id","day_number");--> statement-breakpoint
CREATE UNIQUE INDEX "program_prescriptions_owner_revision_id_unique" ON "program_prescriptions" USING btree ("owner_firebase_uid","revision_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "program_prescriptions_order_unique" ON "program_prescriptions" USING btree ("owner_firebase_uid","revision_id","section_id","display_order");--> statement-breakpoint
CREATE UNIQUE INDEX "program_revisions_owner_id_unique" ON "program_revisions" USING btree ("owner_firebase_uid","id");--> statement-breakpoint
CREATE UNIQUE INDEX "program_revisions_program_scope_unique" ON "program_revisions" USING btree ("owner_firebase_uid","program_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "program_revisions_number_unique" ON "program_revisions" USING btree ("owner_firebase_uid","program_id","revision_number");--> statement-breakpoint
CREATE INDEX "program_revisions_owner_status_idx" ON "program_revisions" USING btree ("owner_firebase_uid","status");--> statement-breakpoint
CREATE UNIQUE INDEX "program_sections_owner_revision_id_unique" ON "program_sections" USING btree ("owner_firebase_uid","revision_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "program_sections_program_revision_id_unique" ON "program_sections" USING btree ("owner_firebase_uid","program_id","revision_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "program_sections_order_unique" ON "program_sections" USING btree ("owner_firebase_uid","revision_id","day_id","display_order");--> statement-breakpoint
CREATE UNIQUE INDEX "program_template_revisions_number_unique" ON "program_template_revisions" USING btree ("template_id","revision_number");--> statement-breakpoint
CREATE UNIQUE INDEX "program_template_revisions_template_id_unique" ON "program_template_revisions" USING btree ("template_id","id");--> statement-breakpoint
CREATE INDEX "program_template_revisions_status_idx" ON "program_template_revisions" USING btree ("template_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "program_templates_key_unique" ON "program_templates" USING btree ("template_key");--> statement-breakpoint
CREATE UNIQUE INDEX "progress_summaries_owner_id_unique" ON "progress_summaries" USING btree ("owner_firebase_uid","id");--> statement-breakpoint
CREATE UNIQUE INDEX "progress_summaries_catalog_period_unique" ON "progress_summaries" USING btree ("owner_firebase_uid","summary_kind","period_start","period_end","catalog_exercise_id") WHERE "progress_summaries"."catalog_exercise_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "progress_summaries_custom_period_unique" ON "progress_summaries" USING btree ("owner_firebase_uid","summary_kind","period_start","period_end","custom_exercise_id") WHERE "progress_summaries"."custom_exercise_id" is not null;--> statement-breakpoint
CREATE INDEX "progress_summaries_owner_period_idx" ON "progress_summaries" USING btree ("owner_firebase_uid","period_start","period_end");--> statement-breakpoint
CREATE UNIQUE INDEX "progress_summary_sources_owner_id_unique" ON "progress_summary_sources" USING btree ("owner_firebase_uid","id");--> statement-breakpoint
CREATE UNIQUE INDEX "progress_summary_sources_set_unique" ON "progress_summary_sources" USING btree ("owner_firebase_uid","summary_id","set_log_id") WHERE "progress_summary_sources"."set_log_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "progress_summary_sources_cardio_unique" ON "progress_summary_sources" USING btree ("owner_firebase_uid","summary_id","cardio_log_id") WHERE "progress_summary_sources"."cardio_log_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "set_logs_owner_id_unique" ON "set_logs" USING btree ("owner_firebase_uid","id");--> statement-breakpoint
CREATE UNIQUE INDEX "set_logs_position_unique" ON "set_logs" USING btree ("owner_firebase_uid","snapshot_id","set_position");--> statement-breakpoint
CREATE UNIQUE INDEX "set_logs_idempotency_unique" ON "set_logs" USING btree ("owner_firebase_uid","session_id","client_idempotency_key");--> statement-breakpoint
CREATE INDEX "set_logs_owner_recorded_idx" ON "set_logs" USING btree ("owner_firebase_uid","recorded_at");--> statement-breakpoint
CREATE UNIQUE INDEX "template_cardio_prescriptions_mode_unique" ON "template_cardio_prescriptions" USING btree ("revision_id","day_id","mode");--> statement-breakpoint
CREATE UNIQUE INDEX "template_days_number_unique" ON "template_days" USING btree ("revision_id","day_number");--> statement-breakpoint
CREATE UNIQUE INDEX "template_days_revision_id_unique" ON "template_days" USING btree ("revision_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "template_prescriptions_order_unique" ON "template_prescriptions" USING btree ("revision_id","section_id","display_order");--> statement-breakpoint
CREATE UNIQUE INDEX "template_prescriptions_revision_id_unique" ON "template_prescriptions" USING btree ("revision_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "template_sections_order_unique" ON "template_sections" USING btree ("revision_id","day_id","display_order");--> statement-breakpoint
CREATE UNIQUE INDEX "template_sections_revision_id_unique" ON "template_sections" USING btree ("revision_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_programs_owner_key_unique" ON "user_programs" USING btree ("owner_firebase_uid","program_key");--> statement-breakpoint
CREATE UNIQUE INDEX "user_programs_owner_id_unique" ON "user_programs" USING btree ("owner_firebase_uid","id");--> statement-breakpoint
CREATE INDEX "user_programs_owner_updated_idx" ON "user_programs" USING btree ("owner_firebase_uid","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "workout_snapshots_owner_id_unique" ON "workout_exercise_snapshots" USING btree ("owner_firebase_uid","id");--> statement-breakpoint
CREATE UNIQUE INDEX "workout_snapshots_owner_session_position_unique" ON "workout_exercise_snapshots" USING btree ("owner_firebase_uid","session_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "workout_snapshots_owner_id_session_unique" ON "workout_exercise_snapshots" USING btree ("owner_firebase_uid","id","session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workout_snapshots_owner_id_session_logging_unique" ON "workout_exercise_snapshots" USING btree ("owner_firebase_uid","id","session_id","logging_kind");--> statement-breakpoint
CREATE INDEX "workout_snapshots_owner_session_idx" ON "workout_exercise_snapshots" USING btree ("owner_firebase_uid","session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workout_exercise_states_owner_operation_unique" ON "workout_exercise_states" USING btree ("owner_firebase_uid","session_id","last_client_operation_id");--> statement-breakpoint
CREATE INDEX "workout_exercise_states_owner_session_status_idx" ON "workout_exercise_states" USING btree ("owner_firebase_uid","session_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "workout_sessions_owner_id_unique" ON "workout_sessions" USING btree ("owner_firebase_uid","id");--> statement-breakpoint
CREATE UNIQUE INDEX "workout_sessions_owner_idempotency_unique" ON "workout_sessions" USING btree ("owner_firebase_uid","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "workout_sessions_one_resumable_unique" ON "workout_sessions" USING btree ("owner_firebase_uid","program_revision_id") WHERE "workout_sessions"."state" in ('draft', 'active', 'completing');--> statement-breakpoint
CREATE INDEX "workout_sessions_owner_state_idx" ON "workout_sessions" USING btree ("owner_firebase_uid","state");--> statement-breakpoint
CREATE INDEX "workout_sessions_owner_created_idx" ON "workout_sessions" USING btree ("owner_firebase_uid","created_at");
--> statement-breakpoint
-- Published revision trees are append-only. Draft rows may be assembled and
-- then atomically published; once published, neither the root nor a child can
-- be edited, removed, or added.
CREATE OR REPLACE FUNCTION prevent_published_program_revision_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'published' OR OLD.published_at IS NOT NULL THEN
    RAISE EXCEPTION 'published program revision is immutable' USING ERRCODE = 'check_violation';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_published_program_child_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  old_published boolean := false;
  new_published boolean := false;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    SELECT (status = 'published' OR published_at IS NOT NULL)
      INTO old_published
      FROM program_revisions
     WHERE id = OLD.revision_id AND owner_firebase_uid = OLD.owner_firebase_uid;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    SELECT (status = 'published' OR published_at IS NOT NULL)
      INTO new_published
      FROM program_revisions
     WHERE id = NEW.revision_id AND owner_firebase_uid = NEW.owner_firebase_uid;
  END IF;

  IF old_published OR new_published THEN
    RAISE EXCEPTION 'published program revision descendants are immutable' USING ERRCODE = 'check_violation';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_published_template_revision_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'published' OR OLD.published_at IS NOT NULL THEN
    RAISE EXCEPTION 'published template revision is immutable' USING ERRCODE = 'check_violation';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_published_template_child_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  old_published boolean := false;
  new_published boolean := false;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    SELECT (status = 'published' OR published_at IS NOT NULL)
      INTO old_published
      FROM program_template_revisions
     WHERE id = OLD.revision_id;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    SELECT (status = 'published' OR published_at IS NOT NULL)
      INTO new_published
      FROM program_template_revisions
     WHERE id = NEW.revision_id;
  END IF;

  IF old_published OR new_published THEN
    RAISE EXCEPTION 'published template revision descendants are immutable' USING ERRCODE = 'check_violation';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_unpublished_active_revision()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  revision_status text;
  revision_published_at timestamptz;
BEGIN
  IF NEW.active_revision_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT status::text, published_at
    INTO revision_status, revision_published_at
    FROM program_revisions
   WHERE owner_firebase_uid = NEW.owner_firebase_uid
     AND program_id = NEW.id
     AND id = NEW.active_revision_id;

  IF revision_status IS NOT NULL
    AND (revision_status IS DISTINCT FROM 'published' OR revision_published_at IS NULL)
  THEN
    RAISE EXCEPTION 'active program revision must be published' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_unpublished_workout_session_creation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  revision_status text;
  revision_published_at timestamptz;
BEGIN
  SELECT status::text, published_at
    INTO revision_status, revision_published_at
    FROM program_revisions
   WHERE owner_firebase_uid = NEW.owner_firebase_uid
     AND program_id = NEW.program_id
     AND id = NEW.program_revision_id;

  IF revision_status IS NOT NULL
    AND (revision_status IS DISTINCT FROM 'published' OR revision_published_at IS NULL)
  THEN
    RAISE EXCEPTION 'workout sessions require a published program revision' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_terminal_workout_session_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.owner_firebase_uid IS DISTINCT FROM OLD.owner_firebase_uid
    OR NEW.program_id IS DISTINCT FROM OLD.program_id
    OR NEW.program_revision_id IS DISTINCT FROM OLD.program_revision_id
    OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'workout session identity is immutable' USING ERRCODE = 'check_violation';
  END IF;

  IF OLD.state::text IN ('completed', 'abandoned') AND ROW(
    NEW.id,
    NEW.owner_firebase_uid,
    NEW.program_id,
    NEW.program_revision_id,
    NEW.state,
    NEW.idempotency_key,
    NEW.started_at,
    NEW.completed_at,
    NEW.abandoned_at,
    NEW.created_at
  ) IS DISTINCT FROM ROW(
    OLD.id,
    OLD.owner_firebase_uid,
    OLD.program_id,
    OLD.program_revision_id,
    OLD.state,
    OLD.idempotency_key,
    OLD.started_at,
    OLD.completed_at,
    OLD.abandoned_at,
    OLD.created_at
  ) THEN
    RAISE EXCEPTION 'terminal workout sessions are immutable' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_workout_exercise_state_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  owning_state text;
  owner_key text;
  session_key uuid;
  snapshot_logging_kind text;
  catalog_logging_kind text;
  custom_logging_kind text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    owner_key := NEW.owner_firebase_uid;
    session_key := NEW.session_id;
    IF NEW.version IS DISTINCT FROM 1 THEN
      RAISE EXCEPTION 'workout exercise state inserts must start at version 1' USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.last_client_operation_id IS NULL OR length(trim(NEW.last_client_operation_id)) = 0 THEN
      RAISE EXCEPTION 'workout exercise state operation ID must be nonblank' USING ERRCODE = 'check_violation';
    END IF;
  ELSE
    IF TG_OP = 'UPDATE' AND (
      NEW.owner_firebase_uid IS DISTINCT FROM OLD.owner_firebase_uid
      OR NEW.session_id IS DISTINCT FROM OLD.session_id
      OR NEW.snapshot_id IS DISTINCT FROM OLD.snapshot_id
      OR NEW.created_at IS DISTINCT FROM OLD.created_at
    ) THEN
      RAISE EXCEPTION 'workout exercise state identity and correction scope are immutable' USING ERRCODE = 'check_violation';
    END IF;
    owner_key := OLD.owner_firebase_uid;
    session_key := OLD.session_id;
  END IF;

  SELECT state::text
    INTO owning_state
    FROM workout_sessions
   WHERE owner_firebase_uid = owner_key
     AND id = session_key;

  IF owning_state IS NULL THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF owning_state NOT IN ('draft', 'active', 'completing') THEN
      RAISE EXCEPTION 'completed or abandoned workout exercise state is immutable' USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND ROW(
    NEW.owner_firebase_uid,
    NEW.session_id,
    NEW.snapshot_id,
    NEW.status,
    NEW.effective_catalog_exercise_id,
    NEW.effective_custom_exercise_id,
    NEW.effective_display_name,
    NEW.effective_logging_kind,
    NEW.note,
    NEW.substitution_reason,
    NEW.last_client_operation_id,
    NEW.version,
    NEW.created_at
  ) IS NOT DISTINCT FROM ROW(
    OLD.owner_firebase_uid,
    OLD.session_id,
    OLD.snapshot_id,
    OLD.status,
    OLD.effective_catalog_exercise_id,
    OLD.effective_custom_exercise_id,
    OLD.effective_display_name,
    OLD.effective_logging_kind,
    OLD.note,
    OLD.substitution_reason,
    OLD.last_client_operation_id,
    OLD.version,
    OLD.created_at
  ) THEN
    NEW.updated_at := OLD.updated_at;
    RETURN NEW;
  END IF;

  IF owning_state NOT IN ('draft', 'active', 'completing') THEN
    RAISE EXCEPTION 'completed or abandoned workout exercise state is immutable' USING ERRCODE = 'check_violation';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.version IS DISTINCT FROM OLD.version + 1 THEN
      RAISE EXCEPTION 'workout exercise state version must increment sequentially' USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.last_client_operation_id IS NULL
      OR length(trim(NEW.last_client_operation_id)) = 0
      OR NEW.last_client_operation_id IS NOT DISTINCT FROM OLD.last_client_operation_id
    THEN
      RAISE EXCEPTION 'workout exercise state requires a new nonblank operation ID' USING ERRCODE = 'check_violation';
    END IF;
    NEW.updated_at := GREATEST(clock_timestamp(), OLD.updated_at + interval '1 microsecond');
  END IF;

  SELECT logging_kind::text
    INTO snapshot_logging_kind
    FROM workout_exercise_snapshots
   WHERE owner_firebase_uid = NEW.owner_firebase_uid
     AND id = NEW.snapshot_id
     AND session_id = NEW.session_id;

  IF snapshot_logging_kind IS NOT NULL
    AND NEW.effective_logging_kind::text IS DISTINCT FROM snapshot_logging_kind
  THEN
    RAISE EXCEPTION 'workout exercise state logging kind must match snapshot' USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.effective_catalog_exercise_id IS NOT NULL THEN
    SELECT logging_kind::text
      INTO catalog_logging_kind
      FROM catalog_exercises
     WHERE id = NEW.effective_catalog_exercise_id;
    IF catalog_logging_kind IS NOT NULL
      AND NEW.effective_logging_kind::text IS DISTINCT FROM catalog_logging_kind
    THEN
      RAISE EXCEPTION 'workout exercise state substitution logging kind is incompatible' USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF NEW.effective_custom_exercise_id IS NOT NULL THEN
    SELECT logging_kind::text
      INTO custom_logging_kind
      FROM custom_exercises
     WHERE owner_firebase_uid = NEW.owner_firebase_uid
       AND id = NEW.effective_custom_exercise_id;
    IF custom_logging_kind IS NOT NULL
      AND NEW.effective_logging_kind::text IS DISTINCT FROM custom_logging_kind
    THEN
      RAISE EXCEPTION 'workout exercise state substitution logging kind is incompatible' USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_workout_snapshot_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  owning_state text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT state::text
      INTO owning_state
      FROM workout_sessions
     WHERE owner_firebase_uid = NEW.owner_firebase_uid
       AND id = NEW.session_id;

    IF owning_state IN ('draft', 'active', 'completing') THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'completed or abandoned workout snapshots are immutable' USING ERRCODE = 'check_violation';
  END IF;

  RAISE EXCEPTION 'accepted workout snapshots are immutable' USING ERRCODE = 'check_violation';
END;
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_set_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  owning_state text;
  owner_key text;
  session_key uuid;
  snapshot_set_count integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    owner_key := NEW.owner_firebase_uid;
    session_key := NEW.session_id;
  ELSE
    IF TG_OP = 'UPDATE' AND (
      NEW.id IS DISTINCT FROM OLD.id
      OR NEW.owner_firebase_uid IS DISTINCT FROM OLD.owner_firebase_uid
      OR NEW.session_id IS DISTINCT FROM OLD.session_id
      OR NEW.snapshot_id IS DISTINCT FROM OLD.snapshot_id
      OR NEW.set_position IS DISTINCT FROM OLD.set_position
      OR NEW.measurement_kind IS DISTINCT FROM OLD.measurement_kind
      OR NEW.set_kind IS DISTINCT FROM OLD.set_kind
      OR NEW.client_idempotency_key IS DISTINCT FROM OLD.client_idempotency_key
      OR NEW.created_at IS DISTINCT FROM OLD.created_at
    ) THEN
      RAISE EXCEPTION 'set log identity and correction scope are immutable' USING ERRCODE = 'check_violation';
    END IF;
    owner_key := OLD.owner_firebase_uid;
    session_key := OLD.session_id;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    SELECT set_count
      INTO snapshot_set_count
      FROM workout_exercise_snapshots
     WHERE owner_firebase_uid = NEW.owner_firebase_uid
       AND id = NEW.snapshot_id
       AND session_id = NEW.session_id
       AND logging_kind = NEW.measurement_kind;

    IF snapshot_set_count IS NOT NULL AND NEW.set_position > snapshot_set_count THEN
      RAISE EXCEPTION 'set position exceeds snapshot set count' USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  SELECT state::text
    INTO owning_state
    FROM workout_sessions
   WHERE owner_firebase_uid = owner_key
     AND id = session_key;

  IF owning_state IN ('draft', 'active', 'completing') THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  RAISE EXCEPTION 'completed or abandoned workout history is immutable' USING ERRCODE = 'check_violation';
END;
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_cardio_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  owning_state text;
  owner_key text;
  session_key uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    owner_key := NEW.owner_firebase_uid;
    session_key := NEW.session_id;
  ELSE
    IF TG_OP = 'UPDATE' AND (
      NEW.id IS DISTINCT FROM OLD.id
      OR NEW.owner_firebase_uid IS DISTINCT FROM OLD.owner_firebase_uid
      OR NEW.session_id IS DISTINCT FROM OLD.session_id
      OR NEW.client_idempotency_key IS DISTINCT FROM OLD.client_idempotency_key
      OR NEW.created_at IS DISTINCT FROM OLD.created_at
    ) THEN
      RAISE EXCEPTION 'cardio log identity and correction scope are immutable' USING ERRCODE = 'check_violation';
    END IF;
    owner_key := OLD.owner_firebase_uid;
    session_key := OLD.session_id;
  END IF;

  SELECT state::text
    INTO owning_state
    FROM workout_sessions
   WHERE owner_firebase_uid = owner_key
     AND id = session_key;

  IF owning_state IN ('draft', 'active', 'completing') THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  RAISE EXCEPTION 'completed or abandoned workout history is immutable' USING ERRCODE = 'check_violation';
END;
$$;--> statement-breakpoint
CREATE TRIGGER user_programs_active_revision_guard
BEFORE INSERT OR UPDATE ON user_programs
FOR EACH ROW EXECUTE FUNCTION prevent_unpublished_active_revision();--> statement-breakpoint
CREATE TRIGGER workout_sessions_published_revision_guard
BEFORE INSERT ON workout_sessions
FOR EACH ROW EXECUTE FUNCTION prevent_unpublished_workout_session_creation();--> statement-breakpoint
CREATE TRIGGER workout_sessions_terminal_guard
BEFORE UPDATE ON workout_sessions
FOR EACH ROW EXECUTE FUNCTION prevent_terminal_workout_session_mutation();--> statement-breakpoint
CREATE TRIGGER program_revisions_immutable_after_publish
BEFORE UPDATE OR DELETE ON program_revisions
FOR EACH ROW EXECUTE FUNCTION prevent_published_program_revision_mutation();--> statement-breakpoint
CREATE TRIGGER program_days_immutable_after_publish
BEFORE INSERT OR UPDATE OR DELETE ON program_days
FOR EACH ROW EXECUTE FUNCTION prevent_published_program_child_mutation();--> statement-breakpoint
CREATE TRIGGER program_sections_immutable_after_publish
BEFORE INSERT OR UPDATE OR DELETE ON program_sections
FOR EACH ROW EXECUTE FUNCTION prevent_published_program_child_mutation();--> statement-breakpoint
CREATE TRIGGER program_prescriptions_immutable_after_publish
BEFORE INSERT OR UPDATE OR DELETE ON program_prescriptions
FOR EACH ROW EXECUTE FUNCTION prevent_published_program_child_mutation();--> statement-breakpoint
CREATE TRIGGER program_cardio_prescriptions_immutable_after_publish
BEFORE INSERT OR UPDATE OR DELETE ON program_cardio_prescriptions
FOR EACH ROW EXECUTE FUNCTION prevent_published_program_child_mutation();--> statement-breakpoint
CREATE TRIGGER program_template_revisions_immutable_after_publish
BEFORE UPDATE OR DELETE ON program_template_revisions
FOR EACH ROW EXECUTE FUNCTION prevent_published_template_revision_mutation();--> statement-breakpoint
CREATE TRIGGER template_days_immutable_after_publish
BEFORE INSERT OR UPDATE OR DELETE ON template_days
FOR EACH ROW EXECUTE FUNCTION prevent_published_template_child_mutation();--> statement-breakpoint
CREATE TRIGGER template_sections_immutable_after_publish
BEFORE INSERT OR UPDATE OR DELETE ON template_sections
FOR EACH ROW EXECUTE FUNCTION prevent_published_template_child_mutation();--> statement-breakpoint
CREATE TRIGGER template_prescriptions_immutable_after_publish
BEFORE INSERT OR UPDATE OR DELETE ON template_prescriptions
FOR EACH ROW EXECUTE FUNCTION prevent_published_template_child_mutation();--> statement-breakpoint
CREATE TRIGGER template_cardio_prescriptions_immutable_after_publish
BEFORE INSERT OR UPDATE OR DELETE ON template_cardio_prescriptions
FOR EACH ROW EXECUTE FUNCTION prevent_published_template_child_mutation();--> statement-breakpoint
CREATE TRIGGER workout_exercise_snapshots_mutation_guard
BEFORE INSERT OR UPDATE OR DELETE ON workout_exercise_snapshots
FOR EACH ROW EXECUTE FUNCTION prevent_workout_snapshot_mutation();--> statement-breakpoint
CREATE TRIGGER workout_exercise_states_mutation_guard
BEFORE INSERT OR UPDATE OR DELETE ON workout_exercise_states
FOR EACH ROW EXECUTE FUNCTION prevent_workout_exercise_state_mutation();--> statement-breakpoint
CREATE TRIGGER set_logs_mutation_guard
BEFORE INSERT OR UPDATE OR DELETE ON set_logs
FOR EACH ROW EXECUTE FUNCTION prevent_set_log_mutation();--> statement-breakpoint
CREATE TRIGGER cardio_logs_mutation_guard
BEFORE INSERT OR UPDATE OR DELETE ON cardio_logs
FOR EACH ROW EXECUTE FUNCTION prevent_cardio_log_mutation();
