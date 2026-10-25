CREATE TABLE "hall_of_fame" (
  "id" serial PRIMARY KEY NOT NULL,
  "season_id" integer NOT NULL REFERENCES "seasons"("id"),
  "awards" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "ballon_dor_player_id" integer REFERENCES "players"("id"),
  "starting_xi" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "substitutes" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "hall_of_fame_season_unique" ON "hall_of_fame" USING btree ("season_id");
