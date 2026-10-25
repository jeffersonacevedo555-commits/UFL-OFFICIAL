import { readFileSync } from 'node:fs';

const fail = (message) => { console.error(`✗ ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`✓ ${message}`);
const read = (path) => readFileSync(path, 'utf8');
const api = read('netlify/functions/tournament.mts');
const schema = read('db/schema.ts');
const ui = read('src/routes/index.tsx');
const migration = read('netlify/database/migrations/20261023010000_add_market_proposals/migration.sql');
const checks = [
  [schema.includes("export const marketProposals = pgTable("), 'el esquema define propuestas de mercado'],
  [/if \(body\.action === 'createMarketProposal'\)/.test(api), 'el endpoint admite crear propuestas'],
  [/if \(body\.action === 'withdrawMarketProposal'\)/.test(api), 'el endpoint permite retirar propuestas pendientes'],
  [/fromTeamId === data\.toTeamId/.test(api), 'se impiden propuestas al equipo de origen según la plantilla de temporada'],
  [/existingPending/.test(api), 'se comprueban duplicados pendientes'],
  [/market_proposal_pending_unique/.test(schema) && /market_proposal_pending_unique/.test(migration), 'la base de datos evita duplicados pendientes concurrentes'],
  [/marketProposals: allMarketProposals/.test(api), 'el endpoint expone las propuestas al cliente'],
  [/function MarketPanel/.test(ui) && /createMarketProposal/.test(ui), 'la interfaz incluye el panel de mercado'],
  [/status.*IN \('pending', \x27withdrawn'\)/.test(migration), 'la migración limita los estados permitidos'],
  [/REFERENCES "players"/.test(migration) && /REFERENCES "teams"/.test(migration), 'la migración protege las referencias a jugadores y equipos'],
  [/El jugador no tiene plantilla registrada en esa temporada/.test(api) && /cambia únicamente la plantilla de esta temporada/.test(ui), 'se exige una asignación de plantilla y las propuestas no alteran automáticamente las estadísticas históricas'],
];
for (const [ok, message] of checks) { if (ok) pass(message); else fail(message) }
console.log(`\nAuditoría estática del mercado: ${checks.filter(([ok]) => ok).length}/${checks.length}. No sustituye pruebas de base de datos o navegador.`);
