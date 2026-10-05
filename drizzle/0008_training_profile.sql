CREATE TYPE "public"."experience_level" AS ENUM('new', 'some', 'lots');--> statement-breakpoint
CREATE TYPE "public"."training_goal" AS ENUM('strength', 'muscle', 'general', 'fat_loss', 'sport');--> statement-breakpoint
CREATE TABLE "user_training_profiles" (
	"owner_firebase_uid" text PRIMARY KEY NOT NULL,
	"training_goal" "training_goal" NOT NULL,
	"experience_level" "experience_level" NOT NULL,
	"days_per_week" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_training_profiles_days_per_week_range" CHECK ("user_training_profiles"."days_per_week" between 2 and 5)
);
--> statement-breakpoint
ALTER TABLE "user_training_profiles" ADD CONSTRAINT "user_training_profiles_owner_firebase_uid_user_profiles_firebase_uid_fk" FOREIGN KEY ("owner_firebase_uid") REFERENCES "public"."user_profiles"("firebase_uid") ON DELETE restrict ON UPDATE cascade;