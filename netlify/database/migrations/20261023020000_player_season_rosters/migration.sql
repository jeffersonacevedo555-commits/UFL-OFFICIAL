CREATE TABLE "player_season_rosters" (
  "id" serial PRIMARY KEY NOT NULL,
  "season_id" integer NOT NULL REFERENCES "seasons"("id"),
  "player_id" integer NOT NULL REFERENCES "players"("id"),
  "team_id" integer NOT NULL REFERENCES "teams"("id"),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "player_season_roster_unique" UNIQUE ("season_id", "player_id")
);
CREATE INDEX "player_season_rosters_team_idx" ON "player_season_rosters" USING btree ("season_id", "team_id");

-- Congela la asignación conocida al desplegar la migración para todas las temporadas existentes.
-- Las temporadas históricas reciben la asignación previa actual; no se reescriben jugadores,
-- partidos ni estadísticas.
INSERT INTO "player_season_rosters" ("season_id", "player_id", "team_id")
SELECT s."id", p."id", p."team_id"
FROM "seasons" s CROSS JOIN "players" p
ON CONFLICT ("season_id", "player_id") DO NOTHING;
