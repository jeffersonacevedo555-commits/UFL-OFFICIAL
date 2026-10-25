import { readFileSync } from 'node:fs';
const fail = (m) => { console.error(`✗ ${m}`); process.exitCode = 1; };
const pass = (m) => console.log(`✓ ${m}`);
const api = readFileSync('netlify/functions/tournament.mts', 'utf8');
const schema = readFileSync('db/schema.ts', 'utf8');
const ui = readFileSync('src/routes/index.tsx', 'utf8');
const migration = readFileSync('netlify/database/migrations/20261023040000_market_transfer_history/migration.sql', 'utf8');
const checks = [
  [schema.includes('export const marketTransferHistory = pgTable('), 'el esquema define el historial de traspasos'],
  [/CREATE TABLE "market_transfer_history"/.test(migration), 'la migración crea la tabla de historial'],
  [/"proposal_id" integer NOT NULL UNIQUE REFERENCES "market_proposals"/.test(migration), 'cada traspaso se vincula a una propuesta aceptada sin duplicados'],
  [/"season_id" integer NOT NULL REFERENCES "seasons"/.test(migration), 'el historial está vinculado a una temporada'],
  [/"player_id" integer NOT NULL REFERENCES "players"/.test(migration), 'el historial está vinculado a un jugador'],
  [/"from_team_id" integer NOT NULL REFERENCES "teams"/.test(migration) && /"to_team_id" integer NOT NULL REFERENCES "teams"/.test(migration), 'guarda equipos de origen y destino'],
  [/tx\.insert\(marketTransferHistory\)\.values/.test(api), 'el traspaso aceptado registra historial dentro de la transacción'],
  [/marketTransferHistory: allTransfers/.test(api), 'la API devuelve el historial al cliente'],
  [/transferHistory=\{data\.marketTransferHistory\.filter/.test(ui), 'la interfaz filtra el historial por temporada'],
  [/Traspasos completados/.test(ui) && /transfer\.transferredAt/.test(ui), 'la interfaz muestra operaciones y fecha'],
  [/CHECK \("from_team_id" <> "to_team_id"\)/.test(migration), 'la base de datos prohíbe traspasos al mismo equipo'],
  [!/DROP TABLE|TRUNCATE/i.test(migration), 'la migración no elimina ni vacía datos existentes'],
];
for (const [ok, message] of checks) { if (ok) pass(message); else fail(message) }
console.log(`\nAuditoría estática del historial: ${checks.filter(([ok]) => ok).length}/${checks.length}. No sustituye pruebas reales de PostgreSQL o navegador.`);
