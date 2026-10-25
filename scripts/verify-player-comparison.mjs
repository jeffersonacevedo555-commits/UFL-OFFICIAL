import fs from 'node:fs'
import assert from 'node:assert/strict'

const ui = fs.readFileSync('src/routes/index.tsx', 'utf8')
const css = fs.readFileSync('src/styles.css', 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
const checks = [
  ['añade la pestaña de comparación', ui.includes("'Comparar jugadores'")],
  ['monta el panel con jugadores y equipos', ui.includes('<PlayerComparisonPanel') && ui.includes('players={data.players}') && ui.includes('teams={data.teams}')],
  ['compara dos jugadores elegidos', ui.includes('Jugador A') && ui.includes('Jugador B') && ui.includes('playerA.id === playerB.id')],
  ['permite filtrar todas las temporadas o una temporada', ui.includes('Todas las temporadas') && ui.includes('seasonFilter === \'all\'')],
  ['permite filtrar por competición', ui.includes('competitionFilter === \'all\'') && ui.includes('Todas las competiciones')],
  ['usa solo partidos finalizados', ui.includes('match.homeScore !== null && match.awayScore !== null')],
  ['compara goles y asistencias', ui.includes("{ label: 'Goles', key: 'goals' }") && ui.includes("{ label: 'Asistencias', key: 'assists' }")],
  ['compara apariciones solo si están registradas', ui.includes('entry.appeared === true ? 1 : 0')],
  ['compara minutos y premios MVP', ui.includes("{ label: 'Minutos jugados', key: 'minutes' }") && ui.includes("{ label: 'Premios MVP', key: 'mvp' }")],
  ['desglosa resultados por competición', ui.includes('Comparación por competición') && ui.includes('summaryA.competitions[id]')],
  ['incluye trayectoria de clubes y traspasos', ui.includes('const clubJourney =') && ui.includes('traspasos registrados')],
  ['incluye diseño responsive', css.includes('.player-comparison-filters') && css.includes('@media (max-width: 600px)')],
  ['incluye auditoría en verify:release', pkg.scripts['verify:release'].includes('verify-player-comparison.mjs')],
]
for (const [name, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`)
  assert.ok(passed, name)
}
console.log(`Auditoría de comparación de jugadores: ${checks.length}/${checks.length}`)
