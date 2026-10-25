ALTER TABLE match_stats ADD COLUMN appeared boolean NOT NULL DEFAULT false;
ALTER TABLE match_stats ADD COLUMN minutes integer NOT NULL DEFAULT 0;
ALTER TABLE match_stats ADD CONSTRAINT valid_player_minutes CHECK (minutes BETWEEN 0 AND 120);
