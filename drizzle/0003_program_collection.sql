ALTER TABLE "user_programs" ADD COLUMN "is_active" boolean DEFAULT false NOT NULL;--> statement-breakpoint
WITH "ranked_programs" AS (
	SELECT
		"id",
		row_number() OVER (
			PARTITION BY "owner_firebase_uid"
			ORDER BY
				("program_key" <> 'five-day-starter-route'),
				"created_at",
				"id"
		) AS "owner_position"
	FROM "user_programs"
)
UPDATE "user_programs" AS "program"
SET "is_active" = true
FROM "ranked_programs" AS "ranked"
WHERE "program"."id" = "ranked"."id"
	AND "ranked"."owner_position" = 1;--> statement-breakpoint
CREATE UNIQUE INDEX "user_programs_owner_active_unique" ON "user_programs" USING btree ("owner_firebase_uid") WHERE "user_programs"."is_active";
