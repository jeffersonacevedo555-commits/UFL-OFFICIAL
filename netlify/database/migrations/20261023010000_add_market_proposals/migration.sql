CREATE TABLE "market_proposals" (
  "id" serial PRIMARY KEY NOT NULL,
  "season_id" integer NOT NULL REFERENCES "seasons"("id"),
  "player_id" integer NOT NULL REFERENCES "players"("id"),
  "from_team_id" integer NOT NULL REFERENCES "teams"("id"),
  "to_team_id" integer NOT NULL REFERENCES "teams"("id"),
  "note" text DEFAULT '' NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "market_proposal_different_teams" CHECK ("from_team_id" <> "to_team_id"),
  CONSTRAINT "market_proposal_status" CHECK ("status" IN ('pending', 'withdrawn'))
);
CREATE INDEX "market_proposals_season_created_idx" ON "market_proposals" USING btree ("season_id", "created_at");
CREATE UNIQUE INDEX "market_proposal_pending_unique" ON "market_proposals" USING btree ("season_id", "player_id", "to_team_id") WHERE "status" = 'pending';
