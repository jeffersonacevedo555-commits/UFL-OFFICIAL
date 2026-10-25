import fs from 'node:fs'
import assert from 'node:assert/strict'
const route = fs.readFileSync(new URL('../src/routes/index.tsx', import.meta.url), 'utf8')
const api = fs.readFileSync(new URL('../netlify/functions/tournament.mts', import.meta.url), 'utf8')
const schema = fs.readFileSync(new URL('../db/schema.ts', import.meta.url), 'utf8')
const migration = fs.readFileSync(new URL('../netlify/database/migrations/20261023060000_historical_finals/migration.sql', import.meta.url), 'utf8')
const linkMigration = fs.readFileSync(new URL('../netlify/database/migrations/20261023061000_link_historical_finals_to_matches/migration.sql', import.meta.url), 'utf8')
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const checks = [
  ['historical finals tab is available', route.includes("'Finales históricas'")],
  ['finals panel receives saved records', route.includes('<HistoricalFinalsPanel finals={data.historicalFinals}')],
  ['admin can save and delete records', route.includes("action: 'saveHistoricalFinal'") && route.includes("action: 'deleteHistoricalFinal'")],
  ['form includes league and knockout final formats', route.includes("finalFormat: 'league'") && route.includes("value=\"two_leg\"" )],
  ['two-legged score display calculates aggregate', route.includes('Global ${championTotal}–${runnerUpTotal}')],
  ['penalties are required when aggregate is tied', api.includes('El global está empatado: registra una tanda de penaltis ganada por el campeón.')],
  ['champion cannot lose on aggregate', api.includes('Los marcadores no corresponden al club indicado como campeón.')],
  ['API returns historical finals', api.includes('historicalFinals: allHistoricalFinals')],
  ['schema declares historical finals table', schema.includes("pgTable(\n  'historical_finals'")],
  ['database enforces one record per season and competition', migration.includes('historical_finals_season_competition_unique')],
  ['historical club names are stored as text snapshots', migration.includes('"champion_name" text NOT NULL') && migration.includes('"runner_up_name" text NOT NULL')],
  ['finals can link existing official matches', route.includes('Partido oficial vinculado') && api.includes('resolveLinkedMatch') && linkMigration.includes('REFERENCES "matches"')],
  ['linked match must be final and same season/competition', api.includes('Solo puedes vincular partidos con marcador final guardado.') && api.includes('El partido vinculado debe pertenecer a la misma temporada y competición.')],
  ['club palmares shows official final history', route.includes('Finales oficiales de {selectedClub}')],
  ['responsive styles are included', fs.readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8').includes('.historical-finals-panel')],
  ['audit is included in release verification', pkg.scripts['verify:release'].includes('verify-historical-finals.mjs')],
]
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); assert.ok(ok, name) }
console.log(`\nHistorical finals audit: ${checks.length}/${checks.length} checks passed.`)
