import { readFileSync } from 'node:fs';
const fail = (message) => { console.error(`✗ ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`✓ ${message}`);
const schema = readFileSync('db/schema.ts', 'utf8');
const api = readFileSync('netlify/functions/tournament.mts', 'utf8');
const ui = readFileSync('src/routes/index.tsx', 'utf8');
const migration = readFileSync('netlify/database/migrations/20261023020000_player_season_rosters/migration.sql', 'utf8');
const checks = [
  [/export const playerSeasonRosters = pgTable\(/.test(schema), 'el esquema define plantillas por temporada'],
  [/playerSeasonRosters: allSeasonRosters/.test(api), 'la API entrega asignaciones históricas'],
  [/previousRoster/.test(api) && /playerSeasonRosters\)\.values/.test(api), 'las nuevas temporadas heredan la última plantilla conocida'],
  [/createdPlayer\.id/.test(api) && /playerSeasonRosters\)\.values/.test(api), 'los nuevos jugadores se registran en la temporada activa'],
  [/teamForPlayer\(stat\.playerId\)/.test(api), 'la validación de estadísticas usa el equipo de esa temporada'],
  [/El jugador no tiene plantilla registrada en esa temporada/.test(api), 'el mercado rechaza jugadores sin asignación en la temporada seleccionada'],
  [/seasonRoster=\{data\.playerSeasonRosters\.filter/.test(ui), 'el mercado recibe la plantilla de la temporada elegida'],
  [/CROSS JOIN "players"/.test(migration), 'la migración prepara asignaciones iniciales'],
  [/ON CONFLICT \("season_id", "player_id"\) DO NOTHING/.test(migration), 'la migración evita duplicados de inicialización'],
  [/REFERENCES "seasons"/.test(migration) && /REFERENCES "teams"/.test(migration) && /REFERENCES "players"/.test(migration), 'las asignaciones mantienen claves foráneas'],
];
for (const [ok, message] of checks) { if (ok) pass(message); else fail(message) }
console.log(`\nAuditoría estática de plantillas por temporada: ${checks.filter(([ok]) => ok).length}/${checks.length}. No sustituye pruebas reales en PostgreSQL o navegador.`);
