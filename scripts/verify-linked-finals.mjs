import fs from 'node:fs'
import assert from 'node:assert/strict'
const route = fs.readFileSync(new URL('../src/routes/index.tsx', import.meta.url), 'utf8')
const api = fs.readFileSync(new URL('../netlify/functions/tournament.mts', import.meta.url), 'utf8')
const schema = fs.readFileSync(new URL('../db/schema.ts', import.meta.url), 'utf8')
const migration = fs.readFileSync(new URL('../netlify/database/migrations/20261023061000_link_historical_finals_to_matches/migration.sql', import.meta.url), 'utf8')
const checks = [
  ['historical records store optional match references', schema.includes("matchId: integer('match_id').references(() => matches.id)") && schema.includes("leg1MatchId: integer('leg1_match_id').references(() => matches.id)") && schema.includes("leg2MatchId: integer('leg2_match_id').references(() => matches.id)")],
  ['admin can choose completed matches from the same season and competition', route.includes('matchOptions = matches.filter((match) => match.seasonId === Number(form.seasonId) && match.competition === form.competition && /^final(?:\\s|$|[·-])/i.test(match.round) && match.homeScore !== null && match.awayScore !== null)')],
  ['API resolves linked scores from official matches', api.includes('await resolveLinkedMatch(data.matchId') && api.includes('dataWithScores.leg1ChampionScore = championScore')],
  ['linked match is validated against season and competition', api.includes('El partido vinculado debe pertenecer a la misma temporada y competición.') && api.includes('Solo puedes vincular partidos cuya ronda esté registrada como Final.')],
  ['linked match clubs must match recorded finalists', api.includes('Los clubes del partido vinculado deben coincidir')],
  ['official final history appears on club palmares', route.includes('Finales oficiales de {selectedClub}')],
  ['migration adds nullable foreign keys without replacing old records', migration.includes('ADD COLUMN "match_id" integer REFERENCES "matches"') && !/DROP TABLE|TRUNCATE/i.test(migration)],
]
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); assert.ok(ok, name) }
console.log(`\nLinked finals audit: ${checks.length}/${checks.length} checks passed.`)
