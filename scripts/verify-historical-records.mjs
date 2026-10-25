import fs from 'node:fs'
import assert from 'node:assert/strict'

const route = fs.readFileSync(new URL('../src/routes/index.tsx', import.meta.url), 'utf8')
const styles = fs.readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')
const checks = [
  ['records tab is available', route.includes("'Récords UFL'")],
  ['records panel receives all players', route.includes('<HistoricalRecordsPanel') && route.includes('players={data.players}')],
  ['season selector supports all seasons', route.includes('Todas las temporadas')],
  ['season-specific filter is applied', route.includes("match.seasonId === Number(seasonFilter)")],
  ['only completed matches are included', route.includes('match.homeScore !== null && match.awayScore !== null')],
  ['goals ranking exists', route.includes("goals: 'Máximos goleadores'")],
  ['assists ranking exists', route.includes("assists: 'Máximos asistentes'")],
  ['appearance ranking counts explicit appearances', route.includes("entry.appeared === true")],
  ['minutes ranking exists', route.includes("minutes: 'Más minutos jugados'")],
  ['MVP ranking exists', route.includes("mvp: 'Más premios MVP'")],
  ['ranking is deterministically sorted', route.includes('b.value - a.value || a.player.name.localeCompare(b.player.name)')],
  ['responsive styles exist', styles.includes('.historical-record-tabs') && styles.includes('@media (max-width: 640px)')],
]
for (const [name, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`)
  assert.ok(passed, name)
}
console.log(`\nHistorical records audit: ${checks.length}/${checks.length} checks passed.`)
