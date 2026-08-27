CREATE TABLE "personal_record_projection_checkpoints" (
	"calculation_version" varchar(40) PRIMARY KEY NOT NULL,
	"status" varchar(16) DEFAULT 'running' NOT NULL,
	"last_session_id" uuid,
	"sessions_scanned" integer DEFAULT 0 NOT NULL,
	"candidate_count" integer DEFAULT 0 NOT NULL,
	"changed_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "personal_record_projection_checkpoints_status_known" CHECK ("personal_record_projection_checkpoints"."status" in ('running', 'completed')),
	CONSTRAINT "personal_record_projection_checkpoints_sessions_nonnegative" CHECK ("personal_record_projection_checkpoints"."sessions_scanned" >= 0),
	CONSTRAINT "personal_record_projection_checkpoints_candidates_nonnegative" CHECK ("personal_record_projection_checkpoints"."candidate_count" >= 0),
	CONSTRAINT "personal_record_projection_checkpoints_changed_nonnegative" CHECK ("personal_record_projection_checkpoints"."changed_count" >= 0)
);
