DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "account_deletion_jobs") THEN
    RAISE EXCEPTION 'account deletion saga migration requires account_deletion_jobs to be empty; review and resolve legacy jobs first';
  END IF;
END $$;--> statement-breakpoint
CREATE TYPE "public"."deletion_job_phase" AS ENUM('database', 'firebase', 'complete');--> statement-breakpoint
ALTER TABLE "account_deletion_jobs" DROP CONSTRAINT "account_deletion_jobs_completion_shape";--> statement-breakpoint
ALTER TABLE "account_deletion_jobs" DROP CONSTRAINT "account_deletion_jobs_owner_firebase_uid_user_profiles_firebase_uid_fk";
--> statement-breakpoint
ALTER TABLE "account_deletion_jobs" ADD COLUMN "phase" "deletion_job_phase" DEFAULT 'database' NOT NULL;--> statement-breakpoint
ALTER TABLE "account_deletion_jobs" ADD COLUMN "idempotency_key" varchar(180) NOT NULL;--> statement-breakpoint
ALTER TABLE "account_deletion_jobs" ADD COLUMN "request_hash" varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE "account_deletion_jobs" ADD CONSTRAINT "account_deletion_jobs_idempotency_key_not_blank" CHECK (length(trim("account_deletion_jobs"."idempotency_key")) > 0);--> statement-breakpoint
ALTER TABLE "account_deletion_jobs" ADD CONSTRAINT "account_deletion_jobs_request_hash_shape" CHECK ("account_deletion_jobs"."request_hash" ~ '^[0-9a-f]{64}$');--> statement-breakpoint
ALTER TABLE "account_deletion_jobs" ADD CONSTRAINT "account_deletion_jobs_completion_shape" CHECK (("account_deletion_jobs"."status" = 'completed' and "account_deletion_jobs"."phase" = 'complete' and "account_deletion_jobs"."completed_at" is not null) or ("account_deletion_jobs"."status" <> 'completed' and "account_deletion_jobs"."phase" <> 'complete' and "account_deletion_jobs"."completed_at" is null));
