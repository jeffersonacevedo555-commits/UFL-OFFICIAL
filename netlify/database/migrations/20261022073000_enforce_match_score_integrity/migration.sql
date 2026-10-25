-- Refuerza la integridad de resultados en la base de datos, incluso si una escritura
-- futura omite por error las validaciones del servidor.

-- Revisión previa: si hay registros heredados incompatibles, detenerse con sus IDs
-- antes de añadir restricciones. No modifica datos existentes.
DO $preflight$
DECLARE
  invalid_score_ids text;
  invalid_penalty_ids text;
BEGIN
  SELECT string_agg("id"::text, ', ' ORDER BY "id")
    INTO invalid_score_ids
    FROM "matches"
   WHERE NOT (
     ("home_score" IS NULL AND "away_score" IS NULL) OR
     ("home_score" IS NOT NULL AND "away_score" IS NOT NULL AND
      "home_score" >= 0 AND "away_score" >= 0 AND
      "home_score" <= 99 AND "away_score" <= 99)
   );

  IF invalid_score_ids IS NOT NULL THEN
    RAISE EXCEPTION 'No se puede aplicar la integridad de marcadores: hay resultados heredados inválidos.'
      USING DETAIL = format('IDs de partidos que requieren revisión: %s', invalid_score_ids),
            HINT = 'Corrige esos resultados en una base de datos de prueba y vuelve a ejecutar la migración; no borres registros para forzarla.';
  END IF;

  SELECT string_agg("id"::text, ', ' ORDER BY "id")
    INTO invalid_penalty_ids
    FROM "matches"
   WHERE ("home_penalty_score" IS NOT NULL OR "away_penalty_score" IS NOT NULL)
     AND NOT (
       "home_penalty_score" IS NOT NULL AND "away_penalty_score" IS NOT NULL AND
       "home_penalty_score" >= 0 AND "away_penalty_score" >= 0 AND
       "home_penalty_score" <= 99 AND "away_penalty_score" <= 99 AND
       "home_penalty_score" <> "away_penalty_score" AND
       "home_score" IS NOT NULL AND "away_score" IS NOT NULL AND
       "competition" IN ('champions', 'europa', 'copa', 'supercopa_liga', 'supercopa_europa') AND
       "round" LIKE '% · Vuelta'
     );

  IF invalid_penalty_ids IS NOT NULL THEN
    RAISE EXCEPTION 'No se puede aplicar la integridad de penaltis: hay tandas guardadas en partidos no válidos.'
      USING DETAIL = format('IDs de partidos que requieren revisión: %s', invalid_penalty_ids),
            HINT = 'Revisa esos penaltis y sus marcadores en una base de datos de prueba antes de volver a ejecutar la migración.';
  END IF;
END;
$preflight$;

ALTER TABLE "matches"
  ADD CONSTRAINT "valid_match_scores" CHECK (
    ("home_score" IS NULL AND "away_score" IS NULL) OR
    ("home_score" IS NOT NULL AND "away_score" IS NOT NULL AND
     "home_score" >= 0 AND "away_score" >= 0 AND
     "home_score" <= 99 AND "away_score" <= 99)
  );

ALTER TABLE "matches" DROP CONSTRAINT "valid_penalty_scores";
ALTER TABLE "matches"
  ADD CONSTRAINT "valid_penalty_scores" CHECK (
    ("home_penalty_score" IS NULL AND "away_penalty_score" IS NULL) OR
    ("home_penalty_score" IS NOT NULL AND "away_penalty_score" IS NOT NULL AND
     "home_penalty_score" >= 0 AND "away_penalty_score" >= 0 AND
     "home_penalty_score" <= 99 AND "away_penalty_score" <= 99 AND
     "home_penalty_score" <> "away_penalty_score" AND
     "home_score" IS NOT NULL AND "away_score" IS NOT NULL AND
     "competition" IN ('champions', 'europa', 'copa', 'supercopa_liga', 'supercopa_europa') AND
     "round" LIKE '% · Vuelta')
  );
