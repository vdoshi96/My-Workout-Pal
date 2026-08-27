DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "program_days"
    GROUP BY "owner_firebase_uid", "revision_id", "day_key"
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'flexible topology migration found duplicate program day keys'
      USING ERRCODE = 'unique_violation';
  END IF;
END;
$$;--> statement-breakpoint
ALTER TABLE "program_days" DROP CONSTRAINT "program_days_number_shape";--> statement-breakpoint
ALTER TABLE "program_cardio_prescriptions" ADD COLUMN "cardio_key" varchar(40);--> statement-breakpoint
ALTER TABLE "program_prescriptions" ADD COLUMN "prescription_key" varchar(40);--> statement-breakpoint
ALTER TABLE "program_sections" ADD COLUMN "section_key" varchar(40);--> statement-breakpoint
-- The existing rows can belong to immutable published revisions. Disable only
-- the three descendant guards while adding identity metadata; no exercise,
-- ordering, naming, or workout-history value is changed.
ALTER TABLE "program_cardio_prescriptions" DISABLE TRIGGER "program_cardio_prescriptions_immutable_after_publish";--> statement-breakpoint
ALTER TABLE "program_prescriptions" DISABLE TRIGGER "program_prescriptions_immutable_after_publish";--> statement-breakpoint
ALTER TABLE "program_sections" DISABLE TRIGGER "program_sections_immutable_after_publish";--> statement-breakpoint
UPDATE "program_cardio_prescriptions" SET "cardio_key" = "id"::text;--> statement-breakpoint
UPDATE "program_prescriptions" SET "prescription_key" = "id"::text;--> statement-breakpoint
UPDATE "program_sections" SET "section_key" = "id"::text;--> statement-breakpoint
ALTER TABLE "program_cardio_prescriptions" ENABLE TRIGGER "program_cardio_prescriptions_immutable_after_publish";--> statement-breakpoint
ALTER TABLE "program_prescriptions" ENABLE TRIGGER "program_prescriptions_immutable_after_publish";--> statement-breakpoint
ALTER TABLE "program_sections" ENABLE TRIGGER "program_sections_immutable_after_publish";--> statement-breakpoint
ALTER TABLE "program_cardio_prescriptions" ALTER COLUMN "cardio_key" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "program_prescriptions" ALTER COLUMN "prescription_key" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "program_sections" ALTER COLUMN "section_key" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "program_cardio_prescriptions_key_unique" ON "program_cardio_prescriptions" USING btree ("owner_firebase_uid","revision_id","cardio_key");--> statement-breakpoint
CREATE UNIQUE INDEX "program_days_key_unique" ON "program_days" USING btree ("owner_firebase_uid","revision_id","day_key");--> statement-breakpoint
CREATE UNIQUE INDEX "program_prescriptions_key_unique" ON "program_prescriptions" USING btree ("owner_firebase_uid","revision_id","prescription_key");--> statement-breakpoint
CREATE UNIQUE INDEX "program_sections_key_unique" ON "program_sections" USING btree ("owner_firebase_uid","revision_id","section_key");--> statement-breakpoint
ALTER TABLE "program_days" ADD CONSTRAINT "program_days_number_shape" CHECK ("program_days"."day_number" between 1 and 14);
