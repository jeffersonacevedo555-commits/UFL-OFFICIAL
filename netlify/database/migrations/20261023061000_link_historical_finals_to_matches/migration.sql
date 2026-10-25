-- Fase 43: vincula el registro histórico a partidos oficiales ya guardados.
ALTER TABLE "historical_finals"
  ADD COLUMN "match_id" integer REFERENCES "matches"("id"),
  ADD COLUMN "leg1_match_id" integer REFERENCES "matches"("id"),
  ADD COLUMN "leg2_match_id" integer REFERENCES "matches"("id");

ALTER TABLE "historical_finals"
  ADD CONSTRAINT "historical_finals_match_links_format" CHECK (
    ("final_format" = 'league' AND "match_id" IS NULL AND "leg1_match_id" IS NULL AND "leg2_match_id" IS NULL) OR
    ("final_format" = 'single' AND "leg1_match_id" IS NULL AND "leg2_match_id" IS NULL) OR
    ("final_format" = 'two_leg' AND "match_id" IS NULL)
  );

CREATE INDEX "historical_finals_match_id_idx" ON "historical_finals" USING btree ("match_id");
CREATE INDEX "historical_finals_leg1_match_id_idx" ON "historical_finals" USING btree ("leg1_match_id");
CREATE INDEX "historical_finals_leg2_match_id_idx" ON "historical_finals" USING btree ("leg2_match_id");
