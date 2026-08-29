CREATE TYPE "public"."personal_guidance_kind" AS ENUM('youtube', 'external');--> statement-breakpoint
CREATE TABLE "personal_guidance_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_firebase_uid" text NOT NULL,
	"catalog_exercise_id" uuid,
	"custom_exercise_id" uuid,
	"kind" "personal_guidance_kind" NOT NULL,
	"normalized_url" text NOT NULL,
	"youtube_video_id" varchar(11),
	"display_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "personal_guidance_source_xor" CHECK (num_nonnulls("personal_guidance_links"."catalog_exercise_id", "personal_guidance_links"."custom_exercise_id") = 1),
	CONSTRAINT "personal_guidance_order_shape" CHECK ("personal_guidance_links"."display_order" between 1 and 2),
	CONSTRAINT "personal_guidance_url_shape" CHECK (length("personal_guidance_links"."normalized_url") between 1 and 2048 and "personal_guidance_links"."normalized_url" like 'https://%'),
	CONSTRAINT "personal_guidance_kind_shape" CHECK (("personal_guidance_links"."kind" = 'youtube' and "personal_guidance_links"."youtube_video_id" is not null and "personal_guidance_links"."youtube_video_id" ~ '^[A-Za-z0-9_-]{11}$') or ("personal_guidance_links"."kind" = 'external' and "personal_guidance_links"."youtube_video_id" is null))
);
--> statement-breakpoint
INSERT INTO "personal_guidance_links" (
	"owner_firebase_uid",
	"custom_exercise_id",
	"kind",
	"normalized_url",
	"youtube_video_id",
	"display_order",
	"created_at",
	"updated_at"
)
SELECT
	"owner_firebase_uid",
	"custom_exercise_id",
	'youtube'::"personal_guidance_kind",
	'https://www.youtube.com/watch?v=' || "youtube_video_id",
	"youtube_video_id",
	"display_order",
	"created_at",
	"created_at"
FROM "custom_exercise_videos";--> statement-breakpoint
ALTER TABLE "workout_exercise_snapshots" ADD COLUMN "guidance_snapshot" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "personal_guidance_links" ADD CONSTRAINT "personal_guidance_links_owner_firebase_uid_user_profiles_firebase_uid_fk" FOREIGN KEY ("owner_firebase_uid") REFERENCES "public"."user_profiles"("firebase_uid") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "personal_guidance_links" ADD CONSTRAINT "personal_guidance_links_catalog_exercise_id_catalog_exercises_id_fk" FOREIGN KEY ("catalog_exercise_id") REFERENCES "public"."catalog_exercises"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "personal_guidance_links" ADD CONSTRAINT "personal_guidance_custom_exercise_scope_fk" FOREIGN KEY ("owner_firebase_uid","custom_exercise_id") REFERENCES "public"."custom_exercises"("owner_firebase_uid","id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "personal_guidance_catalog_order_unique" ON "personal_guidance_links" USING btree ("owner_firebase_uid","catalog_exercise_id","display_order") WHERE "personal_guidance_links"."catalog_exercise_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "personal_guidance_custom_order_unique" ON "personal_guidance_links" USING btree ("owner_firebase_uid","custom_exercise_id","display_order") WHERE "personal_guidance_links"."custom_exercise_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "personal_guidance_catalog_url_unique" ON "personal_guidance_links" USING btree ("owner_firebase_uid","catalog_exercise_id","normalized_url") WHERE "personal_guidance_links"."catalog_exercise_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "personal_guidance_custom_url_unique" ON "personal_guidance_links" USING btree ("owner_firebase_uid","custom_exercise_id","normalized_url") WHERE "personal_guidance_links"."custom_exercise_id" is not null;--> statement-breakpoint
CREATE INDEX "personal_guidance_owner_catalog_idx" ON "personal_guidance_links" USING btree ("owner_firebase_uid","catalog_exercise_id");--> statement-breakpoint
CREATE INDEX "personal_guidance_owner_custom_idx" ON "personal_guidance_links" USING btree ("owner_firebase_uid","custom_exercise_id");--> statement-breakpoint
ALTER TABLE "workout_exercise_snapshots" ADD CONSTRAINT "workout_snapshots_guidance_shape" CHECK (jsonb_typeof("workout_exercise_snapshots"."guidance_snapshot") = 'array' and jsonb_array_length("workout_exercise_snapshots"."guidance_snapshot") <= 2);
