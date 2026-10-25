CREATE TABLE "match_stats" (
	"id" serial PRIMARY KEY,
	"match_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	"goals" integer DEFAULT 0 NOT NULL,
	"assists" integer DEFAULT 0 NOT NULL,
	"mvp" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "valid_player_stats" CHECK ("goals" >= 0 AND "assists" >= 0 AND "mvp" IN (0, 1))
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" serial PRIMARY KEY,
	"team_id" integer NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "match_player" ON "match_stats" ("match_id","player_id");--> statement-breakpoint
CREATE UNIQUE INDEX "one_mvp_per_match" ON "match_stats" ("match_id") WHERE "mvp" = 1;--> statement-breakpoint
CREATE UNIQUE INDEX "player_team_name" ON "players" ("team_id",lower("name"));--> statement-breakpoint
ALTER TABLE "match_stats" ADD CONSTRAINT "match_stats_match_id_matches_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "match_stats" ADD CONSTRAINT "match_stats_player_id_players_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id");--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_team_id_teams_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id");