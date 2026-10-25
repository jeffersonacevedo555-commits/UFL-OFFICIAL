-- Conserva un registro consultable de cada traspaso aceptado sin alterar datos anteriores.
CREATE TABLE "market_transfer_history" (
  "id" serial PRIMARY KEY NOT NULL,
  "proposal_id" integer NOT NULL UNIQUE REFERENCES "market_proposals"("id"),
  "season_id" integer NOT NULL REFERENCES "seasons"("id"),
  "player_id" integer NOT NULL REFERENCES "players"("id"),
  "from_team_id" integer NOT NULL REFERENCES "teams"("id"),
  "to_team_id" integer NOT NULL REFERENCES "teams"("id"),
  "note" text NOT NULL DEFAULT '',
  "transferred_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "market_transfer_history_different_teams" CHECK ("from_team_id" <> "to_team_id")
);
CREATE INDEX "market_transfer_history_season_date_idx" ON "market_transfer_history" USING btree ("season_id", "transferred_at" DESC);
CREATE INDEX "market_transfer_history_player_idx" ON "market_transfer_history" USING btree ("player_id", "transferred_at" DESC);

-- Reconstruye el registro para traspasos ya aceptados en la fase anterior.
INSERT INTO "market_transfer_history" ("proposal_id", "season_id", "player_id", "from_team_id", "to_team_id", "note", "transferred_at")
SELECT "id", "season_id", "player_id", "from_team_id", "to_team_id", "note", "updated_at"
FROM "market_proposals"
WHERE "status" = 'accepted'
ON CONFLICT ("proposal_id") DO NOTHING;
