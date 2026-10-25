-- Fase 65: sección de noticias.
-- Titular y desarrollo en estilo periodístico; la imagen opcional vive en Netlify Blobs.
CREATE TABLE "news" (
  "id" serial PRIMARY KEY,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "image_key" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "news_created_at_idx" ON "news" USING btree ("created_at");
-- La auditoría administrativa pasa a admitir la entidad «news».
ALTER TABLE "admin_audit_events" DROP CONSTRAINT "admin_audit_events_entity_type_valid";
ALTER TABLE "admin_audit_events" ADD CONSTRAINT "admin_audit_events_entity_type_valid" CHECK ("entity_type" IN ('match', 'roster', 'transfer', 'market_proposal', 'team', 'player', 'news'));
