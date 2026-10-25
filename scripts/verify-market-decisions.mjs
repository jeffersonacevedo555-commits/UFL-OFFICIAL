import { readFileSync } from 'node:fs';
const fail = (m) => { console.error(`✗ ${m}`); process.exitCode = 1; };
const pass = (m) => console.log(`✓ ${m}`);
const api = readFileSync('netlify/functions/tournament.mts', 'utf8');
const schema = readFileSync('db/schema.ts', 'utf8');
const ui = readFileSync('src/routes/index.tsx', 'utf8');
const migration = readFileSync('netlify/database/migrations/20261023030000_market_decisions/migration.sql', 'utf8');
const checks = [
  [/body\.action === 'decideMarketProposal'/.test(api), 'la API incorpora la decisión de propuestas'],
  [/decision: z\.enum\(\['accept', 'reject'\]\)/.test(api), 'la API limita la decisión a aceptar o rechazar'],
  [/\.transaction\(async \(tx\)/.test(api) && /playerSeasonRosters\)\.set\(\{ teamId: proposal\.toTeamId \}/.test(api), 'el traspaso y la decisión se ejecutan en una transacción'],
  [/\.for\('update'\)/.test(api), 'bloquea filas para evitar aceptar propuestas incompatibles simultáneamente'],
  [/roster\.teamId !== proposal\.fromTeamId/.test(api), 'rechaza propuestas cuyo equipo de origen quedó obsoleto'],
  [/status: 'accepted'/.test(api) && /status: 'rejected'/.test(api), 'guarda estados aceptado y rechazado'],
  [schema.includes("'pending', 'withdrawn', 'accepted', 'rejected'"), 'el esquema permite los cuatro estados'],
  [/decision: 'accept'/.test(ui) && /decision: 'reject'/.test(ui), 'la interfaz ofrece aceptar y rechazar'],
  [/otras propuestas pendientes/i.test(api) || /Otras propuestas pendientes/.test(api), 'cierra propuestas incompatibles tras aceptar un traspaso'],
  [/DROP CONSTRAINT/.test(migration) && /'accepted', 'rejected'/.test(migration), 'la migración amplía estados sin borrar datos'],
];
for (const [ok, message] of checks) { if (ok) pass(message); else fail(message) }
console.log(`\nAuditoría estática de decisiones de mercado: ${checks.filter(([ok]) => ok).length}/${checks.length}. No sustituye pruebas en PostgreSQL ni navegador.`);
