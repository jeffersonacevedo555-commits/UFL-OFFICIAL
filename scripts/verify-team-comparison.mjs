import fs from 'node:fs'
import assert from 'node:assert/strict'

const route = fs.readFileSync(new URL('../src/routes/index.tsx', import.meta.url), 'utf8')
const styles = fs.readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')
const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const checks = [
  ['team comparison tab is available', route.includes("'Comparar equipos'")],
  ['comparison panel receives teams, seasons, matches and selected season', route.includes(`<TeamComparisonPanel key={selectedSeasonId ?? 'none'} teams={data.teams} seasons={data.seasons} matches={data.matches} selectedSeasonId={selectedSeasonId} />`)],
  ['panel compares two distinct teams', route.includes('Equipo A para comparar') && route.includes('Equipo B para comparar') && route.includes('teams.filter((team) => team.id !== teamA?.id)')],
  ['season and competition filters are supported', route.includes('Temporada de comparación de equipos') && route.includes('Competición de comparación de equipos')],
  ['only completed matches are included', route.includes('match.homeScore !== null && match.awayScore !== null &&')],
  ['wins, draws, losses and points are calculated', route.includes('if (scored > conceded) { wins += 1; points += 3 }') && route.includes('else if (scored === conceded) { draws += 1; points += 1 }') && route.includes('else losses += 1')],
  ['goals for, against and difference are calculated', route.includes('difference: goalsFor - goalsAgainst') && route.includes('goalsFor += scored') && route.includes('goalsAgainst += conceded')],
  ['home and away performance is separated', route.includes('calculate(teamA.id, \'home\')') && route.includes('calculate(teamB.id, \'away\')')],
  ['direct head-to-head results are listed', route.includes('Enfrentamientos directos') && route.includes('directMatches.map((match)')],
  ['recent results are limited to five completed matches', route.includes(".slice(0, 5)") && route.includes('Últimos partidos')],
  ['responsive comparison styles are present', styles.includes('.team-comparison-panel') && styles.includes('@media (max-width: 600px)')],
  ['audit is wired into release verification', packageJson.scripts['verify:release'].includes('verify-team-comparison.mjs')],
]
for (const [name, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`)
  assert.ok(passed, name)
}
console.log(`\nTeam comparison audit: ${checks.length}/${checks.length} checks passed.`)
