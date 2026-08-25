CREATE TYPE "public"."cardio_pace_source" AS ENUM('entered', 'derived');--> statement-breakpoint
ALTER TABLE "set_logs" DROP CONSTRAINT "set_logs_measurement_shape";--> statement-breakpoint
ALTER TABLE "cardio_logs" ADD COLUMN "pace_source" "cardio_pace_source";--> statement-breakpoint
ALTER TABLE "set_logs" ADD COLUMN "added_weight_kg" numeric(10, 3);--> statement-breakpoint
UPDATE "cardio_logs"
SET "pace_source" = 'entered'
WHERE "pace_seconds_per_km" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "cardio_logs" ADD CONSTRAINT "cardio_logs_pace_source_shape" CHECK (("cardio_logs"."pace_source" is null and "cardio_logs"."pace_seconds_per_km" is null) or ("cardio_logs"."pace_source" is not null and "cardio_logs"."pace_seconds_per_km" is not null));--> statement-breakpoint
ALTER TABLE "set_logs" ADD CONSTRAINT "set_logs_added_weight_nonnegative" CHECK ("set_logs"."added_weight_kg" is null or "set_logs"."added_weight_kg" >= 0);--> statement-breakpoint
ALTER TABLE "set_logs" ADD CONSTRAINT "set_logs_measurement_shape" CHECK (("set_logs"."measurement_kind" = 'weight_reps' and "set_logs"."weight_kg" is not null and "set_logs"."repetitions" is not null and "set_logs"."added_weight_kg" is null and "set_logs"."duration_seconds" is null and "set_logs"."distance_m" is null) or ("set_logs"."measurement_kind" = 'bodyweight_reps' and "set_logs"."weight_kg" is null and "set_logs"."repetitions" is not null and "set_logs"."duration_seconds" is null and "set_logs"."distance_m" is null) or ("set_logs"."measurement_kind" = 'duration' and "set_logs"."weight_kg" is null and "set_logs"."repetitions" is null and "set_logs"."added_weight_kg" is null and "set_logs"."duration_seconds" is not null and "set_logs"."distance_m" is null) or ("set_logs"."measurement_kind" = 'distance_duration' and "set_logs"."weight_kg" is null and "set_logs"."repetitions" is null and "set_logs"."added_weight_kg" is null and "set_logs"."duration_seconds" is not null and "set_logs"."distance_m" is not null));
