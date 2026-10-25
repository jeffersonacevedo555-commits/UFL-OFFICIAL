import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const migrationsDir = join(process.cwd(), 'netlify/database/migrations');
const fail = (message) => {
  console.error(`✗ ${message}`);
  process.exitCode = 1;
};
const pass = (message) => console.log(`✓ ${message}`);
const readMigration = (name) => {
  const path = join(migrationsDir, name, 'migration.sql');
  try {
    return readFileSync(path, 'utf8');
  } catch {
    fail(`Falta la migración ${name}/migration.sql`);
    return '';
  }
};
const orderedDirs = readdirSync(migrationsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const seasonName = '20261022065000_add_seasons';
const penaltyName = '20261022071000_add_penalty_scores';
const integrityName = '20261022073000_enforce_match_score_integrity';
const hallOfFameName = '20261022080000_add_hall_of_fame';
const marketName = '20261023010000_add_market_proposals';
const rosterName = '20261023020000_player_season_rosters';
const marketDecisionsName = '20261023030000_market_decisions';
const transferHistoryName = '20261023040000_market_transfer_history';
const historicalFinalsName = '20261023060000_historical_finals';
const linkedFinalsName = '20261023061000_link_historical_finals_to_matches';
const historicalAuditName = '20261023062000_historical_final_audit';
const expected = [seasonName, penaltyName, integrityName, hallOfFameName, marketName, rosterName, marketDecisionsName, transferHistoryName, historicalFinalsName, linkedFinalsName, historicalAuditName];
const positions = expected.map((name) => orderedDirs.indexOf(name));
if (positions.every((position, index) => position >= 0 && (index === 0 || positions[index - 1] < position))) {
  pass('Las migraciones de temporadas, penaltis, integridad y Salón de la Fama están presentes y ordenadas');
} else {
  fail('El orden de las migraciones críticas no es el esperado');
}

const seasons = readMigration(seasonName);
const penalties = readMigration(penaltyName);
const integrity = readMigration(integrityName);
const hall = readMigration(hallOfFameName);
const market = readMigration(marketName);
const rosterMigration = readMigration(rosterName);
const marketDecisionsMigration = readMigration(marketDecisionsName);
const transferHistoryMigration = readMigration(transferHistoryName);
const historicalFinalsMigration = readMigration(historicalFinalsName);
const linkedFinalsMigration = readMigration(linkedFinalsName);
const historicalAuditMigration = readMigration(historicalAuditName);

const seasonChecks = [
  [/CREATE TABLE\s+"seasons"/i, 'crea la tabla de temporadas'],
  [/INSERT INTO\s+"seasons"[\s\S]*?VALUES\s*\(1,\s*'Temporada 1',\s*true/i, 'crea la temporada inicial activa'],
  [/UPDATE\s+"matches"\s+SET\s+"season_id"\s*=\s*1/i, 'asigna los partidos existentes a la temporada inicial'],
  [/ALTER TABLE\s+"matches"\s+ALTER COLUMN\s+"season_id"\s+SET NOT NULL/i, 'solo exige temporada después de asignarla'],
  [/CREATE UNIQUE INDEX\s+"one_current_season"[\s\S]*?WHERE\s+"is_current"\s*=\s*true/i, 'limita a una temporada activa'],
  [/CREATE UNIQUE INDEX\s+"match_pair_round"\s+ON\s+"matches"\s*\(\s*"season_id"/i, 'permite repetir cruces en temporadas distintas'],
];
for (const [pattern, description] of seasonChecks) {
  if (pattern.test(seasons)) pass(`Temporadas: ${description}`);
  else fail(`Temporadas: no se pudo verificar que ${description}`);
}

if (/ADD COLUMN\s+"home_penalty_score"\s+integer/i.test(penalties) && /ADD COLUMN\s+"away_penalty_score"\s+integer/i.test(penalties)) {
  pass('La migración de penaltis añade los dos campos de marcador');
} else {
  fail('La migración de penaltis no añade ambos campos');
}

const preflightIndex = integrity.indexOf('DO $preflight$');
const scoreConstraintIndex = integrity.indexOf('ADD CONSTRAINT "valid_match_scores"');
const penaltyConstraintIndex = integrity.lastIndexOf('ADD CONSTRAINT "valid_penalty_scores"');
if (preflightIndex >= 0 && scoreConstraintIndex > preflightIndex && penaltyConstraintIndex > preflightIndex) {
  pass('El diagnóstico previo aparece antes de añadir las restricciones');
} else {
  fail('El diagnóstico previo falta o aparece después de las restricciones');
}
for (const [pattern, description] of [
  [/invalid_score_ids/i, 'identifica partidos con marcadores incompatibles'],
  [/invalid_penalty_ids/i, 'identifica partidos con penaltis incompatibles'],
  [/RAISE EXCEPTION/i, 'detiene la migración cuando encuentra datos incompatibles'],
  [/"home_score"\s*<=\s*99[\s\S]*?"away_score"\s*<=\s*99/i, 'limita los goles a 0–99'],
  [/"home_penalty_score"\s*<=\s*99[\s\S]*?"away_penalty_score"\s*<=\s*99/i, 'limita los penaltis a 0–99'],
]) {
  if (pattern.test(integrity)) pass(`Integridad: ${description}`);
  else fail(`Integridad: no se pudo verificar que ${description}`);
}

for (const [pattern, description] of [
  [/CREATE TABLE\s+"hall_of_fame"/i, 'crea la tabla persistente del Salón de la Fama'],
  [/"season_id" integer NOT NULL REFERENCES "seasons"/i, 'vincula cada registro a una temporada existente'],
  [/"awards" jsonb/i, 'conserva una instantánea histórica de premios'],
  [/"starting_xi" jsonb/i, 'guarda los once titulares elegidos'],
  [/"substitutes" jsonb/i, 'guarda los siete suplentes elegidos'],
  [/CREATE UNIQUE INDEX "hall_of_fame_season_unique"/i, 'impide duplicar el registro de una temporada'],
]) {
  if (pattern.test(hall)) pass(`Salón de la Fama: ${description}`);
  else fail(`Salón de la Fama: no se pudo verificar que ${description}`);
}
if (!/\bDROP TABLE\b|\bTRUNCATE\b/i.test(hall)) pass('Salón de la Fama: la migración no elimina tablas ni vacía datos');
else fail('Salón de la Fama: se detectó una operación destructiva');


for (const [pattern, description] of [
  [/CREATE TABLE\s+"market_proposals"/i, 'crea la tabla de propuestas de mercado'],
  [/"season_id" integer NOT NULL REFERENCES "seasons"/i, 'vincula cada propuesta a una temporada'],
  [/"player_id" integer NOT NULL REFERENCES "players"/i, 'vincula cada propuesta a un jugador existente'],
  [/"from_team_id" integer NOT NULL REFERENCES "teams"/i, 'conserva el equipo de origen'],
  [/"to_team_id" integer NOT NULL REFERENCES "teams"/i, 'conserva el equipo de destino'],
  [/"status" IN \('pending', 'withdrawn'\)/i, 'limita los estados a valores admitidos'],
  [/CREATE INDEX "market_proposals_season_created_idx"/i, 'indexa propuestas por temporada y fecha'],
  [/CREATE UNIQUE INDEX "market_proposal_pending_unique"[\s\S]*?WHERE "status" = 'pending'/i, 'evita duplicados pendientes incluso con peticiones simultáneas'],
]) {
  if (pattern.test(market)) pass(`Mercado: ${description}`);
  else fail(`Mercado: no se pudo verificar que ${description}`);
}
if (!/\bDROP TABLE\b|\bTRUNCATE\b/i.test(market)) pass('Mercado: la migración no elimina tablas ni vacía datos');
else fail('Mercado: se detectó una operación destructiva');

for (const [pattern, description] of [
  [/DROP CONSTRAINT "market_proposal_status"/i, 'amplía la restricción de estados sin recrear la tabla'],
  [/IN \('pending', 'withdrawn', 'accepted', 'rejected'\)/i, 'admite propuestas pendientes, retiradas, aceptadas y rechazadas'],
]) {
  if (pattern.test(marketDecisionsMigration)) pass(`Decisiones de mercado: ${description}`);
  else fail(`Decisiones de mercado: no se pudo verificar que ${description}`);
}
if (!/\bDROP TABLE\b|\bTRUNCATE\b/i.test(marketDecisionsMigration)) pass('Decisiones de mercado: la migración conserva las propuestas existentes');
else fail('Decisiones de mercado: se detectó una operación destructiva');

if (process.exitCode) {
  console.error('\nLa revisión estática encontró puntos que requieren atención. Esto no sustituye una prueba real en PostgreSQL.');
} else {
  console.log('\nRevisión estática de migraciones completada. No equivale a ejecutar SQL contra PostgreSQL.');
}

for (const [pattern, description] of [
  [/CREATE TABLE\s+"player_season_rosters"/i, 'crea una plantilla independiente por temporada'],
  [/UNIQUE \(\s*"season_id",\s*"player_id"\s*\)/i, 'impide asignar dos equipos al mismo jugador en una temporada'],
  [/REFERENCES "players"/i, 'vincula la plantilla a jugadores existentes'],
  [/REFERENCES "teams"/i, 'vincula la plantilla a equipos existentes'],
  [/CROSS JOIN "players"/i, 'inicializa asignaciones para temporadas y jugadores existentes'],
  [/ON CONFLICT \("season_id", "player_id"\) DO NOTHING/i, 'evita duplicados durante la inicialización'],
]) {
  if (pattern.test(rosterMigration)) pass(`Plantillas por temporada: ${description}`);
  else fail(`Plantillas por temporada: no se pudo verificar que ${description}`);
}
if (!/\bDROP TABLE\b|\bTRUNCATE\b/i.test(rosterMigration)) pass('Plantillas por temporada: la migración no elimina tablas ni vacía datos');
else fail('Plantillas por temporada: se detectó una operación destructiva');

for (const [pattern, description] of [
  [/CREATE TABLE\s+"market_transfer_history"/i, 'crea el historial de traspasos'],
  [/"proposal_id" integer NOT NULL UNIQUE REFERENCES "market_proposals"/i, 'vincula cada registro a una propuesta única'],
  [/INSERT INTO "market_transfer_history"[\s\S]*?WHERE "status" = 'accepted'/i, 'recupera traspasos aceptados antes de la migración'],
  [/ON CONFLICT \("proposal_id"\) DO NOTHING/i, 'evita duplicados durante la reconstrucción histórica'],
]) {
  if (pattern.test(transferHistoryMigration)) pass(`Historial de traspasos: ${description}`);
  else fail(`Historial de traspasos: no se pudo verificar que ${description}`);
}
if (!/\bDROP TABLE\b|\bTRUNCATE\b/i.test(transferHistoryMigration)) pass('Historial de traspasos: la migración conserva los datos existentes');
else fail('Historial de traspasos: se detectó una operación destructiva');


for (const [pattern, description] of [
  [/CREATE TABLE\s+"historical_finals"/i, 'crea el registro oficial de finales'],
  [/"season_id" integer NOT NULL REFERENCES "seasons"/i, 'vincula cada registro a una temporada existente'],
  [/"champion_name" text NOT NULL/i, 'conserva el nombre histórico del campeón'],
  [/"runner_up_name" text NOT NULL/i, 'conserva el nombre histórico del subcampeón'],
  [/"leg1_champion_score" integer[\s\S]*?"leg2_runner_up_score" integer/i, 'almacena marcadores de ida y vuelta'],
  [/"penalty_champion_score" integer[\s\S]*?"penalty_runner_up_score" integer/i, 'permite registrar una tanda de penaltis'],
  [/historical_finals_season_competition_unique/i, 'impide duplicar una competición en una temporada'],
  [/"final_format" = 'league'[\s\S]*?"final_format" = 'single'[\s\S]*?"final_format" = 'two_leg'/i, 'valida los formatos Liga, partido único e ida y vuelta'],
]) {
  if (pattern.test(historicalFinalsMigration)) pass(`Finales históricas: ${description}`);
  else fail(`Finales históricas: no se pudo verificar que ${description}`);
}
if (!/\bDROP TABLE\b|\bTRUNCATE\b/i.test(historicalFinalsMigration)) pass('Finales históricas: la migración no elimina tablas ni vacía datos');
else fail('Finales históricas: se detectó una operación destructiva');

for (const [pattern, description] of [[/ADD COLUMN "match_id" integer REFERENCES "matches"/i, 'vincula finales a un partido de ida única'], [/ADD COLUMN "leg1_match_id" integer REFERENCES "matches"/i, 'vincula el partido de ida'], [/ADD COLUMN "leg2_match_id" integer REFERENCES "matches"/i, 'vincula el partido de vuelta'], [/historical_finals_match_links_format/i, 'restringe los enlaces según el formato de final']]) { if (pattern.test(linkedFinalsMigration)) pass(`Finales vinculadas: ${description}`); else fail(`Finales vinculadas: no se pudo verificar que ${description}`) }
if (!/\bDROP TABLE\b|\bTRUNCATE\b/i.test(linkedFinalsMigration)) pass('Finales vinculadas: la migración conserva los registros existentes'); else fail('Finales vinculadas: se detectó una operación destructiva');

for (const [pattern, description] of [
  [/CREATE TABLE\s+"historical_final_audits"/i, 'crea la tabla de auditoría de finales'],
  [/"before_snapshot" jsonb/i, 'conserva el estado anterior en JSON'],
  [/"after_snapshot" jsonb/i, 'conserva el estado posterior en JSON'],
  [/"actor_email" text/i, 'registra el correo del administrador cuando está disponible'],
  [/"action" IN \('created', 'updated', 'deleted'\)/i, 'limita los tipos de evento permitidos'],
]) { if (pattern.test(historicalAuditMigration)) pass(`Auditoría histórica: ${description}`); else fail(`Auditoría histórica: no se pudo verificar que ${description}`) }
if (!/\bDROP TABLE\b|\bTRUNCATE\b/i.test(historicalAuditMigration)) pass('Auditoría histórica: la migración no elimina ni vacía datos'); else fail('Auditoría histórica: se detectó una operación destructiva');
