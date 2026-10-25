-- Fase 63: imágenes de escudos de equipo y fotos de jugador.
-- Los binarios viven en Netlify Blobs; la base de datos solo guarda la clave del objeto.
ALTER TABLE teams ADD COLUMN crest_image text;
ALTER TABLE players ADD COLUMN photo_image text;
