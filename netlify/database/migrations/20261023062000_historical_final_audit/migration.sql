-- Fase 46: registra cambios administrativos de finales históricas en la misma transacción.
-- final_id no tiene FK intencionalmente para conservar el evento tras eliminar una final.
CREATE TABLE "historical_final_audits" (
  "id" serial PRIMARY KEY,
  "final_id" integer NOT NULL,
  "action" text NOT NULL,
  "actor_id" text,
  "actor_email" text,
  "before_snapshot" jsonb,
  "after_snapshot" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "historical_final_audits_action_valid"
    CHECK ("action" IN ('created', 'updated', 'deleted')),
  CONSTRAINT "historical_final_audits_snapshot_pair"
    CHECK (
      ("action" = 'created' AND "before_snapshot" IS NULL AND "after_snapshot" IS NOT NULL) OR
      ("action" = 'updated' AND "before_snapshot" IS NOT NULL AND "after_snapshot" IS NOT NULL) OR
      ("action" = 'deleted' AND "before_snapshot" IS NOT NULL AND "after_snapshot" IS NULL)
    )
);
CREATE INDEX "historical_final_audits_created_at_idx"
  ON "historical_final_audits" USING btree ("created_at" DESC);
CREATE INDEX "historical_final_audits_final_id_idx"
  ON "historical_final_audits" USING btree ("final_id");
