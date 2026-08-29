ALTER TABLE "program_cardio_prescriptions" ADD COLUMN "display_order" integer;--> statement-breakpoint
-- Published descendant rows are immutable. Temporarily suspend only this
-- table's guard while deriving the pre-editor walker/runner presentation order;
-- no authored cardio meaning or workout history is rewritten.
ALTER TABLE "program_cardio_prescriptions" DISABLE TRIGGER "program_cardio_prescriptions_immutable_after_publish";--> statement-breakpoint
WITH ranked AS (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "owner_firebase_uid", "revision_id", "day_id"
      ORDER BY CASE "mode" WHEN 'walker' THEN 1 ELSE 2 END, "id"
    ) AS "display_order"
  FROM "program_cardio_prescriptions"
)
UPDATE "program_cardio_prescriptions" AS cardio
SET "display_order" = ranked."display_order"
FROM ranked
WHERE cardio."id" = ranked."id";--> statement-breakpoint
ALTER TABLE "program_cardio_prescriptions" ENABLE TRIGGER "program_cardio_prescriptions_immutable_after_publish";--> statement-breakpoint
ALTER TABLE "program_cardio_prescriptions" ALTER COLUMN "display_order" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "program_cardio_prescriptions_order_unique" ON "program_cardio_prescriptions" USING btree ("owner_firebase_uid","revision_id","day_id","display_order");--> statement-breakpoint
ALTER TABLE "program_cardio_prescriptions" ADD CONSTRAINT "program_cardio_display_order_shape" CHECK ("program_cardio_prescriptions"."display_order" between 1 and 2);
