import fs from 'node:fs'
import assert from 'node:assert/strict'

const route = fs.readFileSync(new URL('../src/routes/index.tsx', import.meta.url), 'utf8')
const styles = fs.readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')
const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const checks = [
  ['team statistics tab is available', route.includes("'Estadísticas de equipos'")],
  ['team statistics panel receives teams, seasons and matches', route.includes(`<TeamStatisticsPanel key={selectedSeasonId ?? 'none'} teams={data.teams} seasons={data.seasons} matches={data.matches} selectedSeasonId={selectedSeasonId} />`)],
  ['only completed matches are included', route.includes('match.homeScore !== null && match.awayScore !== null')],
  ['season filter is supported', route.includes('Temporada de estadísticas de equipos') && route.includes("seasonFilter === 'all' || match.seasonId === Number(seasonFilter)")],
  ['competition filter is supported', route.includes('Competición de estadísticas de equipos') && route.includes("competitionFilter === 'all' || match.competition === competitionFilter")],
  ['wins draws and losses are calculated', route.includes('wins += 1; points += 3') && route.includes('draws += 1; points += 1') && route.includes('else losses += 1')],
  ['goals for and against are calculated', route.includes('goalsFor += scored') && route.includes('goalsAgainst += conceded')],
  ['win percentage is calculated', route.includes('Math.round(wins / played.length * 1000) / 10')],
  ['direct head-to-head results are shown', route.includes('Historial de enfrentamientos') && route.includes('headToHead.map((match)')],
  ['competition labels are displayed in head-to-head results', route.includes('competitions.find((item) => item.id === match.competition)?.name')],
  ['responsive styles are present', styles.includes('.team-statistics-panel') && styles.includes('@media (max-width: 640px)')],
  ['audit is wired into release verification', packageJson.scripts['verify:release'].includes('verify-team-statistics.mjs')],
]
for (const [name, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`)
  assert.ok(passed, name)
}
console.log(`\nTeam statistics audit: ${checks.length}/${checks.length} checks passed.`)
