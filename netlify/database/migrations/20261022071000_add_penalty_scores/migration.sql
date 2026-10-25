ALTER TABLE "matches" ADD COLUMN "home_penalty_score" integer;
ALTER TABLE "matches" ADD COLUMN "away_penalty_score" integer;

ALTER TABLE "matches" ADD CONSTRAINT "valid_penalty_scores" CHECK (
  ("home_penalty_score" IS NULL AND "away_penalty_score" IS NULL) OR
  ("home_penalty_score" IS NOT NULL AND "away_penalty_score" IS NOT NULL AND
   "home_penalty_score" >= 0 AND "away_penalty_score" >= 0 AND
   "home_penalty_score" <> "away_penalty_score")
);
