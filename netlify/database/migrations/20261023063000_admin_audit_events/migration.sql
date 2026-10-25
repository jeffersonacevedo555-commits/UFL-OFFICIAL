-- Fase 47: auditoría transversal de cambios administrativos.
-- Los snapshots conservan la trazabilidad aunque la entidad cambie o se elimine.
CREATE TABLE "admin_audit_events" (
  "id" serial PRIMARY KEY,
  "entity_type" text NOT NULL,
  "entity_id" integer NOT NULL,
  "season_id" integer,
  "action" text NOT NULL,
  "actor_id" text,
  "actor_email" text,
  "before_snapshot" jsonb,
  "after_snapshot" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "admin_audit_events_entity_type_valid" CHECK ("entity_type" IN ('match', 'roster', 'transfer', 'market_proposal', 'team', 'player')),
  CONSTRAINT "admin_audit_events_action_valid" CHECK ("action" IN ('created', 'updated', 'deleted', 'accepted', 'rejected', 'withdrawn'))
);
CREATE INDEX "admin_audit_events_created_at_idx" ON "admin_audit_events" USING btree ("created_at" DESC);
CREATE INDEX "admin_audit_events_entity_idx" ON "admin_audit_events" USING btree ("entity_type", "entity_id");
CREATE INDEX "admin_audit_events_season_idx" ON "admin_audit_events" USING btree ("season_id", "created_at" DESC);
