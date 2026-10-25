-- Registro administrativo de campeones, subcampeones y marcadores de finales históricas.
CREATE TABLE "historical_finals" (
  "id" serial PRIMARY KEY NOT NULL,
  "season_id" integer NOT NULL REFERENCES "seasons"("id"),
  "competition" text NOT NULL,
  "final_format" text NOT NULL,
  "champion_name" text NOT NULL,
  "runner_up_name" text NOT NULL,
  "leg1_champion_score" integer,
  "leg1_runner_up_score" integer,
  "leg2_champion_score" integer,
  "leg2_runner_up_score" integer,
  "penalty_champion_score" integer,
  "penalty_runner_up_score" integer,
  "note" text NOT NULL DEFAULT '',
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "historical_finals_competition_valid" CHECK ("competition" IN ('liga', 'champions', 'europa', 'copa', 'supercopa_liga', 'supercopa_europa')),
  CONSTRAINT "historical_finals_format_valid" CHECK ("final_format" IN ('league', 'single', 'two_leg')),
  CONSTRAINT "historical_finals_distinct_clubs" CHECK (lower(trim("champion_name")) <> lower(trim("runner_up_name"))),
  CONSTRAINT "historical_finals_score_range" CHECK (("leg1_champion_score" IS NULL OR "leg1_champion_score" BETWEEN 0 AND 99) AND ("leg1_runner_up_score" IS NULL OR "leg1_runner_up_score" BETWEEN 0 AND 99) AND ("leg2_champion_score" IS NULL OR "leg2_champion_score" BETWEEN 0 AND 99) AND ("leg2_runner_up_score" IS NULL OR "leg2_runner_up_score" BETWEEN 0 AND 99) AND ("penalty_champion_score" IS NULL OR "penalty_champion_score" BETWEEN 0 AND 99) AND ("penalty_runner_up_score" IS NULL OR "penalty_runner_up_score" BETWEEN 0 AND 99)),
  CONSTRAINT "historical_finals_penalties_pair" CHECK (("penalty_champion_score" IS NULL AND "penalty_runner_up_score" IS NULL) OR ("penalty_champion_score" IS NOT NULL AND "penalty_runner_up_score" IS NOT NULL AND "penalty_champion_score" <> "penalty_runner_up_score")),
  CONSTRAINT "historical_finals_score_format" CHECK (("final_format" = 'league' AND "leg1_champion_score" IS NULL AND "leg1_runner_up_score" IS NULL AND "leg2_champion_score" IS NULL AND "leg2_runner_up_score" IS NULL AND "penalty_champion_score" IS NULL AND "penalty_runner_up_score" IS NULL) OR ("final_format" = 'single' AND "leg1_champion_score" IS NOT NULL AND "leg1_runner_up_score" IS NOT NULL AND "leg2_champion_score" IS NULL AND "leg2_runner_up_score" IS NULL) OR ("final_format" = 'two_leg' AND "leg1_champion_score" IS NOT NULL AND "leg1_runner_up_score" IS NOT NULL AND "leg2_champion_score" IS NOT NULL AND "leg2_runner_up_score" IS NOT NULL))
);
CREATE UNIQUE INDEX "historical_finals_season_competition_unique" ON "historical_finals" USING btree ("season_id", "competition");
CREATE INDEX "historical_finals_competition_season_idx" ON "historical_finals" USING btree ("competition", "season_id" DESC);
