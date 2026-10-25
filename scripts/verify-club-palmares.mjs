import fs from 'node:fs'
import assert from 'node:assert/strict'
const route = fs.readFileSync(new URL('../src/routes/index.tsx', import.meta.url), 'utf8')
const styles = fs.readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const checks = [
  ['club palmares tab is available', route.includes("'Palmarés de clubes'")],
  ['panel receives saved hall of fame records', route.includes('<ClubPalmaresPanel teams={data.teams} seasons={data.seasons} records={data.hallOfFame} finals={data.historicalFinals} />')],
  ['titles are read from saved awards', route.includes('const value = record.awards?.[type.key]') && route.includes("typeof value !== 'string' || !value.trim()")],
  ['six champion categories are mapped', ['leagueChampion', 'cupChampion', 'championsChampion', 'europaChampion', 'leagueSuperCupChampion', 'europeSuperCupChampion'].every((key) => route.includes(`key: '${key}'`))],
  ['league runner-up is separately tracked', route.includes("key: 'leagueRunnerUp'") && route.includes("kind: 'runnerUp'")],
  ['season filter exists', route.includes('Temporada del palmarés') && route.includes("seasonFilter !== 'all' && record.seasonId !== Number(seasonFilter)")],
  ['competition filter exists', route.includes('Competición del palmarés') && route.includes("competitionFilter !== 'all' && type.competition !== competitionFilter")],
  ['club filter and club history exist', route.includes('Club del palmarés') && route.includes('Finales oficiales de {selectedClub}')],
  ['empty historical data has a user-facing state', route.includes('Todavía no hay palmarés guardado')],
  ['limits of stored runner-up data are disclosed', route.includes('no todos los subcampeones de las competiciones eliminatorias')],
  ['responsive styles exist', styles.includes('.club-palmares-panel') && styles.includes('@media (max-width: 640px)')],
  ['audit is wired into release verification', pkg.scripts['verify:release'].includes('verify-club-palmares.mjs')],
]
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); assert.ok(ok, name) }
console.log(`\nClub palmares audit: ${checks.length}/${checks.length} checks passed.`)
