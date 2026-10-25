CREATE TABLE "matches" (
	"id" serial PRIMARY KEY,
	"competition" text NOT NULL,
	"round" text NOT NULL,
	"home_id" integer NOT NULL,
	"away_id" integer NOT NULL,
	"home_score" integer,
	"away_score" integer,
	"scheduled_at" timestamp with time zone,
	CONSTRAINT "different_teams" CHECK ("home_id" <> "away_id")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL UNIQUE,
	"manager" text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "match_pair_round" ON "matches" ("competition","round","home_id","away_id");--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_home_id_teams_id_fkey" FOREIGN KEY ("home_id") REFERENCES "teams"("id");--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_away_id_teams_id_fkey" FOREIGN KEY ("away_id") REFERENCES "teams"("id");