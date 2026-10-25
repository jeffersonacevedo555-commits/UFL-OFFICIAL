CREATE TABLE "seasons" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL UNIQUE,
  "is_current" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Existing records are preserved and assigned to the first historical season.
INSERT INTO "seasons" ("id", "name", "is_current", "created_at")
VALUES (1, 'Temporada 1', true, now());
SELECT setval(pg_get_serial_sequence('seasons', 'id'), (SELECT MAX("id") FROM "seasons"));

ALTER TABLE "matches" ADD COLUMN "season_id" integer;
UPDATE "matches" SET "season_id" = 1;
ALTER TABLE "matches" ALTER COLUMN "season_id" SET NOT NULL;
ALTER TABLE "matches" ADD CONSTRAINT "matches_season_id_seasons_id_fkey"
  FOREIGN KEY ("season_id") REFERENCES "seasons"("id");

-- A fixture can repeat in a different season, but not in the same season.
DROP INDEX "match_pair_round";
CREATE UNIQUE INDEX "match_pair_round"
  ON "matches" ("season_id", "competition", "round", "home_id", "away_id");

-- Only one season can be active at a time.
CREATE UNIQUE INDEX "one_current_season"
  ON "seasons" ("is_current") WHERE "is_current" = true;
