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
--> statement-breakpoint
CREATE OR REPLACE FUNCTION account_deletion_allows(owner_uid text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT current_setting('my_workout_pal.account_deletion_uid', true) = owner_uid;
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_published_program_revision_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' AND account_deletion_allows(OLD.owner_firebase_uid) THEN
    RETURN OLD;
  END IF;
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
  IF TG_OP = 'DELETE' AND account_deletion_allows(OLD.owner_firebase_uid) THEN
    RETURN OLD;
  END IF;
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
CREATE OR REPLACE FUNCTION prevent_workout_snapshot_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  owning_state text;
BEGIN
  IF TG_OP = 'DELETE' AND account_deletion_allows(OLD.owner_firebase_uid) THEN
    RETURN OLD;
  END IF;
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
  IF TG_OP = 'DELETE' AND account_deletion_allows(OLD.owner_firebase_uid) THEN
    RETURN OLD;
  END IF;
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
  IF TG_OP = 'DELETE' AND account_deletion_allows(OLD.owner_firebase_uid) THEN
    RETURN OLD;
  END IF;
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
  IF TG_OP = 'DELETE' AND account_deletion_allows(OLD.owner_firebase_uid) THEN
    RETURN OLD;
  END IF;
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
$$;
